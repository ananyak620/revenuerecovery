"""
ReviveAI — Feature Engineering & Robustness Tests

Verifies feature calculations, transformations, skew corrections, and edge-case handling.
"""

import pandas as pd
from src.ml.features import engineer_features, get_feature_columns


def test_engineer_features_derived_columns():
    """Verify all engineered features are properly generated."""
    data = [{
        "amount": 5000.0,
        "retry_count": 2,
        "time_since_failure_hours": 3.0,
        "customer_tenure_days": 180,
        "previous_success_rate": 0.85,
        "historical_recovery_rate": 0.75,
        "customer_ltv": 25000.0,
        "support_tickets_last_30d": 1,
        "days_since_last_login": 2,
        "nps_score": 8.0,
        "hour_of_day": 14,
        "day_of_week": 2,
        "is_weekend": 0,
        "failure_reason": "authentication_failure",
        "payment_method": "upi",
        "subscription_type": "professional",
        "device_type": "mobile",
        "region": "metro",
        "industry": "saas",
    }]
    df = pd.DataFrame(data)
    featured = engineer_features(df)

    # Check key engineered columns exist
    assert "log_amount" in featured.columns
    assert "retry_exhaustion" in featured.columns
    assert "is_fresh_failure" in featured.columns
    assert "recency_score" in featured.columns
    assert "engagement_score" in featured.columns
    assert "customer_reliability" in featured.columns
    assert "is_high_value" in featured.columns
    assert "failure_severity" in featured.columns
    assert "is_business_hours" in featured.columns

    # Check math validity
    assert featured["retry_exhaustion"].iloc[0] == 2 / 5
    assert featured["is_fresh_failure"].iloc[0] == 1  # 3.0 < 6.0
    assert featured["is_business_hours"].iloc[0] == 1  # 14 is between 9 and 18
    assert featured["failure_severity"].iloc[0] == 1  # authentication_failure severity


def test_features_handle_missing_columns_gracefully():
    """Verify engineer_features supplies default values when raw data is sparse."""
    sparse_data = [{"amount": 2500.0}]  # only amount provided
    df = pd.DataFrame(sparse_data)
    featured = engineer_features(df)

    assert featured["retry_count"].iloc[0] == 0
    assert featured["time_since_failure_hours"].iloc[0] == 1.0
    assert featured["previous_success_rate"].iloc[0] == 0.5
    assert featured["failure_reason"].iloc[0] == "technical_error"


def test_feature_columns_list_completeness():
    """Verify expected columns list has no duplicates and contains critical features."""
    cols = get_feature_columns()
    assert len(cols) == len(set(cols))  # no duplicates
    assert "amount" in cols
    assert "log_amount" in cols
    assert "retry_exhaustion" in cols
    assert "customer_reliability" in cols
