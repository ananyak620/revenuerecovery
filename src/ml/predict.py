"""
ReviveAI — ML Inference Service

Loads the trained model and predicts recovery probability
for individual transactions or batches.
"""

import json
import warnings
import joblib
from typing import Optional

import pandas as pd

from src.config import MODELS_DIR
from src.ml.features import engineer_features


class RecoveryPredictor:
    """
    ML inference service for recovery probability prediction.

    Loads the calibrated XGBoost model (or falls back to baseline)
    and provides predict / predict_batch methods.
    """

    def __init__(self):
        self.model = None
        self.feature_columns: list[str] = []
        self.model_name: str = "none"
        self._load_model()

    def _load_model(self):
        """Load the best available model."""
        calibrated_path = MODELS_DIR / "xgboost_calibrated.joblib"
        primary_path = MODELS_DIR / "xgboost_primary.joblib"
        baseline_path = MODELS_DIR / "baseline_lr.joblib"
        columns_path = MODELS_DIR / "feature_columns.json"

        # Load feature columns
        if columns_path.exists():
            with open(columns_path) as f:
                self.feature_columns = json.load(f)
        else:
            print("  ⚠ feature_columns.json not found — model not trained yet")
            return

        # Try models in order of preference
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=UserWarning)
            warnings.filterwarnings("ignore", category=DeprecationWarning)
            if calibrated_path.exists():
                self.model = joblib.load(calibrated_path)
                self.model_name = "XGBoost (Calibrated)"
            elif primary_path.exists():
                self.model = joblib.load(primary_path)
                self.model_name = "XGBoost"
            elif baseline_path.exists():
                self.model = joblib.load(baseline_path)
                self.model_name = "Logistic Regression (Baseline)"

        if self.model:
            print(f"  ✓ Loaded model: {self.model_name}")
        else:
            print("  ⚠ No trained model found — run `python -m src.ml.train` first")

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features and align columns with training set."""
        featured = engineer_features(df)

        # One-hot encode categoricals
        cat_cols = ["payment_method", "failure_reason", "subscription_type",
                    "device_type", "region", "industry"]
        existing_cats = [c for c in cat_cols if c in featured.columns]
        featured = pd.get_dummies(featured, columns=existing_cats, drop_first=True)

        # Align columns
        for col in self.feature_columns:
            if col not in featured.columns:
                featured[col] = 0

        return featured[self.feature_columns].fillna(0)  # type: ignore[return-value]

    def predict(self, transaction_data: dict) -> dict:
        """
        Predict recovery probability for a single transaction.

        Args:
            transaction_data: Dict with transaction features

        Returns:
            Dict with probability, expected_recovery_value, risk_level, action
        """
        if not self.is_loaded:
            return self._heuristic_predict(transaction_data)

        assert self.model is not None
        df = pd.DataFrame([transaction_data])
        X = self._prepare_features(df)

        probability = float(self.model.predict_proba(X)[0, 1])
        amount = float(transaction_data.get("amount", 0))
        erv = round(amount * probability, 2)

        risk_level, action = self._classify_risk(probability, transaction_data)

        return {
            "recovery_probability": round(probability, 4),
            "expected_recovery_value": erv,
            "risk_level": risk_level,
            "recommended_action": action,
            "confidence": 0.85,  # model confidence (can calibrate further)
            "model_used": self.model_name,
        }

    def predict_batch(self, transactions: list[dict]) -> list[dict]:
        """Predict recovery for a batch of transactions."""
        if not self.is_loaded:
            return [self._heuristic_predict(t) for t in transactions]

        assert self.model is not None
        df = pd.DataFrame(transactions)
        X = self._prepare_features(df)

        probabilities = self.model.predict_proba(X)[:, 1]

        results = []
        for i, txn in enumerate(transactions):
            prob = float(probabilities[i])
            amount = float(txn.get("amount", 0))
            risk_level, action = self._classify_risk(prob, txn)

            results.append({
                "transaction_id": txn.get("transaction_id", f"TXN_{i}"),
                "recovery_probability": round(prob, 4),
                "expected_recovery_value": round(amount * prob, 2),
                "risk_level": risk_level,
                "recommended_action": action,
                "confidence": 0.85,
                "model_used": self.model_name,
            })

        return results

    def _classify_risk(self, probability: float, txn: dict) -> tuple[str, str]:
        """Map probability to risk level and recommended action."""
        retry_count = txn.get("retry_count", 0)

        if retry_count >= 5:
            return "critical", "no_action"

        if probability >= 0.7:
            return "low", "retry"
        elif probability >= 0.4:
            return "medium", "notify_customer"
        elif probability >= 0.2:
            return "high", "escalate"
        else:
            return "critical", "no_action"

    def _heuristic_predict(self, txn: dict) -> dict:
        """Fallback heuristic when no ML model is available."""
        prob = 0.5

        retry_count = txn.get("retry_count", 0)
        prob -= retry_count * 0.1

        reason_effects = {
            "authentication_failure": 0.15,
            "network_error": 0.12,
            "technical_error": 0.08,
            "insufficient_funds": -0.05,
            "card_expired": -0.15,
            "bank_declined": -0.20,
            "fraud_flag": -0.35,
        }
        prob += reason_effects.get(txn.get("failure_reason", ""), 0)
        prob = max(0.05, min(0.95, prob))

        amount = txn.get("amount", 0)
        risk_level, action = self._classify_risk(prob, txn)

        return {
            "recovery_probability": round(prob, 4),
            "expected_recovery_value": round(amount * prob, 2),
            "risk_level": risk_level,
            "recommended_action": action,
            "confidence": 0.3,
            "model_used": "heuristic (no trained model)",
        }


# Singleton — loaded once, reused across requests
_predictor: Optional[RecoveryPredictor] = None


def get_predictor() -> RecoveryPredictor:
    """Get or create the singleton predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = RecoveryPredictor()
    return _predictor
