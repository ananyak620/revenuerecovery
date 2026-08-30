"""
ReviveAI — Feature Engineering Pipeline

Transforms raw transaction data into ML-ready features.
This module is the bridge between raw data and the model.
"""

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Feature definitions
# ---------------------------------------------------------------------------

CATEGORICAL_FEATURES = [
    "payment_method",
    "failure_reason",
    "subscription_type",
    "device_type",
    "region",
    "industry",
]

NUMERICAL_FEATURES = [
    "amount",
    "retry_count",
    "time_since_failure_hours",
    "customer_tenure_days",
    "previous_success_rate",
    "historical_recovery_rate",
    "customer_ltv",
    "support_tickets_last_30d",
    "days_since_last_login",
    "nps_score",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
]

TARGET = "recovered"


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create derived features from raw transaction data.

    Feature engineering decisions:
    - log_amount: Amount is right-skewed → log transform
    - retry_exhaustion: retry_count / max_retries → how close to giving up
    - recency_score: inverse of time_since_failure → freshness matters
    - engagement_score: combines login recency + NPS
    - customer_reliability: combines success_rate + recovery_rate
    - is_high_value: binary flag for enterprise-level transactions
    - failure_severity: ordinal encoding of failure reason severity
    """
    result = df.copy()

    # Ensure expected columns exist with sensible defaults
    defaults = {
        "amount": 0.0,
        "retry_count": 0,
        "time_since_failure_hours": 1.0,
        "customer_tenure_days": 0,
        "previous_success_rate": 0.5,
        "historical_recovery_rate": 0.5,
        "customer_ltv": 5000.0,
        "support_tickets_last_30d": 0,
        "days_since_last_login": 0,
        "nps_score": 5.0,
        "hour_of_day": 12,
        "day_of_week": 0,
        "is_weekend": 0,
        "failure_reason": "technical_error",
        "payment_method": "upi",
        "subscription_type": "starter",
        "device_type": "mobile",
        "region": "metro",
        "industry": "saas",
    }
    for col, default_val in defaults.items():
        if col not in result.columns:
            result[col] = default_val

    # --- Log amount (right-skew correction) ---
    result["log_amount"] = np.log1p(result["amount"])

    # --- Retry exhaustion ratio ---
    max_retries = 5
    result["retry_exhaustion"] = result["retry_count"] / max_retries

    # --- Is fresh failure (< 6 hours) ---
    result["is_fresh_failure"] = (result["time_since_failure_hours"] < 6).astype(int)

    # --- Recency score (inverse of time) ---
    result["recency_score"] = 1 / (1 + result["time_since_failure_hours"])

    # --- Engagement score ---
    result["engagement_score"] = (
        (10 - result["days_since_last_login"].clip(0, 90) / 9)  # 0-10 scale
        + result["nps_score"]  # 0-10
    ) / 2

    # --- Customer reliability ---
    result["customer_reliability"] = (
        result["previous_success_rate"] * 0.6
        + result["historical_recovery_rate"] * 0.4
    )

    # --- High value flag ---
    result["is_high_value"] = (result["amount"] > 10000).astype(int)

    # --- Failure severity (ordinal) ---
    severity_map = {
        "authentication_failure": 1,   # most likely temporary
        "network_error": 1,
        "technical_error": 2,
        "insufficient_funds": 3,
        "limit_exceeded": 3,
        "card_expired": 4,
        "bank_declined": 5,
        "fraud_flag": 6,               # most severe
    }
    result["failure_severity"] = result["failure_reason"].map(lambda x: severity_map.get(x, 3)).fillna(3)

    # --- Business hours flag ---
    result["is_business_hours"] = (
        (result["hour_of_day"] >= 9) & (result["hour_of_day"] <= 18)
    ).astype(int)

    # --- Amount tier ---
    amount_cut = pd.cut(
        result["amount"],
        bins=[0, 500, 2000, 10000, 50000, float("inf")],
        labels=[0, 1, 2, 3, 4],
    )
    result["amount_tier"] = pd.to_numeric(amount_cut, errors="coerce").fillna(0).astype(int)

    # --- Tenure bucket ---
    tenure_cut = pd.cut(
        result["customer_tenure_days"],
        bins=[0, 30, 90, 365, 730, float("inf")],
        labels=[0, 1, 2, 3, 4],
    )
    result["tenure_bucket"] = pd.to_numeric(tenure_cut, errors="coerce").fillna(0).astype(int)

    return result


def get_feature_columns() -> list[str]:
    """Return the final feature columns for model training."""
    return (
        NUMERICAL_FEATURES
        + [
            "log_amount",
            "retry_exhaustion",
            "is_fresh_failure",
            "recency_score",
            "engagement_score",
            "customer_reliability",
            "is_high_value",
            "failure_severity",
            "is_business_hours",
            "amount_tier",
            "tenure_bucket",
        ]
    )


def prepare_for_training(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Full pipeline: engineer features → encode categoricals → return X, y.
    """
    featured = engineer_features(df)

    # One-hot encode categoricals
    featured = pd.get_dummies(featured, columns=CATEGORICAL_FEATURES, drop_first=True)

    # Get all numeric feature columns
    feature_cols = [c for c in featured.columns if c not in [
        TARGET, "transaction_id", "customer_id", "recovery_probability_true"
    ]]

    X = featured[feature_cols].fillna(0)
    y = featured[TARGET]

    return X, y  # type: ignore[return-value]


def prepare_for_inference(df: pd.DataFrame, training_columns: list[str]) -> pd.DataFrame:
    """
    Prepare a single transaction or batch for inference.
    Ensures columns match the training set.
    """
    featured = engineer_features(df)
    featured = pd.get_dummies(featured, columns=CATEGORICAL_FEATURES, drop_first=True)

    # Align columns with training
    for col in training_columns:
        if col not in featured.columns:
            featured[col] = 0

    return featured[training_columns].fillna(0)  # type: ignore[return-value]
