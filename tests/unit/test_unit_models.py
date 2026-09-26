"""
ReviveAI — Unit Tests (Models, Features, Policy Rules)
"""

import pytest
from src.ml.predict import get_predictor
from src.agent.policy_engine import get_policy_engine
from src.ml.features import engineer_features


def test_unit_ml_predictor_inference():
    predictor = get_predictor()
    features = {
        "amount": 2500.0,
        "payment_method": "upi",
        "failure_reason": "authentication_failure",
        "retry_count": 0,
        "customer_ltv": 10000.0,
        "time_since_failure_hours": 1.0,
    }
    pred = predictor.predict(features)
    assert 0.0 <= pred["recovery_probability"] <= 1.0
    assert pred["expected_recovery_value"] >= 0.0


def test_unit_policy_rules_enforcement():
    engine = get_policy_engine()
    # Test Rule 1: Max retry
    res = engine.check(
        action="retry",
        transaction={"retry_count": 5, "amount": 1000.0, "failure_reason": "authentication_failure"},
        prediction={"recovery_probability": 0.5},
        diagnosis={"diagnosis": "Technical error"},
    )
    assert res.approved is False
    assert res.modified_action == "escalate"


def test_unit_features_generation():
    import pandas as pd
    raw = pd.DataFrame([{
        "amount": 4999.0,
        "payment_method": "card",
        "failure_reason": "insufficient_funds",
        "retry_count": 1,
    }])
    feats = engineer_features(raw)
    assert "amount" in feats.columns
    assert "retry_count" in feats.columns
