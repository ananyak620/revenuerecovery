"""
ReviveAI — Machine Learning Inference & Predictor Tests

Verifies model loading, probability inference, risk classification,
and statistical consistency (monotonicity and sensitivity).
"""

import pytest
from src.ml.predict import RecoveryPredictor, get_predictor


@pytest.fixture
def predictor() -> RecoveryPredictor:
    return get_predictor()


def test_predictor_loaded_successfully(predictor: RecoveryPredictor):
    """Verify ML predictor loads a model (or heuristic fallback) with feature schema."""
    assert predictor is not None
    assert len(predictor.feature_columns) > 0


def test_predict_single_transaction_valid_range(predictor: RecoveryPredictor):
    """Verify prediction outputs probability in [0, 1] and valid ERV."""
    txn = {
        "amount": 4999.0,
        "payment_method": "upi",
        "failure_reason": "network_error",
        "retry_count": 0,
        "time_since_failure_hours": 1.0,
        "customer_tenure_days": 120,
        "previous_success_rate": 0.90,
        "historical_recovery_rate": 0.80,
        "nps_score": 9.0,
    }

    result = predictor.predict(txn)

    assert "recovery_probability" in result
    assert 0.0 <= result["recovery_probability"] <= 1.0
    # Check that ERV is proportional to amount * probability within floating point rounding
    expected_erv = 4999.0 * result["recovery_probability"]
    assert abs(result["expected_recovery_value"] - expected_erv) < 1.0
    assert result["risk_level"] in ("low", "medium", "high", "critical")
    assert result["recommended_action"] in ("retry", "notify_customer", "escalate", "no_action")


def test_monotonicity_retry_count_decreases_probability(predictor: RecoveryPredictor):
    """TC-ML-05: As retry count increases, recovery probability must decrease."""
    base_txn = {
        "amount": 2000.0,
        "payment_method": "upi",
        "failure_reason": "authentication_failure",
        "time_since_failure_hours": 2.0,
        "customer_tenure_days": 100,
        "previous_success_rate": 0.8,
        "historical_recovery_rate": 0.7,
        "nps_score": 7.0,
    }

    txn_fresh = {**base_txn, "retry_count": 0}
    txn_exhausted = {**base_txn, "retry_count": 4}

    prob_fresh = predictor.predict(txn_fresh)["recovery_probability"]
    prob_exhausted = predictor.predict(txn_exhausted)["recovery_probability"]

    assert prob_fresh > prob_exhausted, (
        f"Fresh failure ({prob_fresh}) should have higher probability than exhausted ({prob_exhausted})"
    )


def test_batch_prediction_consistency(predictor: RecoveryPredictor):
    """Verify batch inference returns properly structured output for all records."""
    batch = [
        {"amount": 1000.0, "failure_reason": "network_error", "retry_count": 0},
        {"amount": 50000.0, "failure_reason": "bank_declined", "retry_count": 3},
    ]

    results = predictor.predict_batch(batch)
    assert len(results) == 2
    for r in results:
        assert "recovery_probability" in r
        assert "expected_recovery_value" in r
        assert "risk_level" in r
