"""
ReviveAI — Model Evaluation

Comprehensive evaluation of trained models with visual metrics.

Usage:
    python -m src.ml.evaluate
"""

import sys
import joblib
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
)
from sklearn.calibration import calibration_curve
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from src.config import DATA_DIR, MODELS_DIR
from src.ml.features import prepare_for_training


def main():
    print("=" * 60)
    print("  ReviveAI — Model Evaluation Report")
    print("=" * 60)

    # Load data
    df = pd.read_csv(DATA_DIR / "raw" / "transactions.csv")
    X, y = prepare_for_training(df)
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Load models
    models = {}
    for name, filename in [
        ("Logistic Regression", "baseline_lr.joblib"),
        ("XGBoost", "xgboost_primary.joblib"),
        ("XGBoost (Calibrated)", "xgboost_calibrated.joblib"),
    ]:
        path = MODELS_DIR / filename
        if path.exists():
            models[name] = joblib.load(path)

    if not models:
        print("✗ No trained models found. Run: python -m src.ml.train")
        sys.exit(1)

    # Evaluate each model
    for name, model in models.items():
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        print(f"\n{'━' * 60}")
        print(f"  {name}")
        print(f"{'━' * 60}")

        metrics = {
            "Accuracy": accuracy_score(y_test, y_pred),
            "Precision": precision_score(y_test, y_pred),
            "Recall": recall_score(y_test, y_pred),
            "F1 Score": f1_score(y_test, y_pred),
            "ROC-AUC": roc_auc_score(y_test, y_prob),
            "PR-AUC": average_precision_score(y_test, y_prob),
        }

        for metric_name, value in metrics.items():
            bar = "█" * int(value * 40)
            print(f"  {metric_name:<15} {value:.4f}  {bar}")

        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()
        print(f"\n  Confusion Matrix:")
        print(f"    TP={tp:>5}  FP={fp:>5}")
        print(f"    FN={fn:>5}  TN={tn:>5}")

        # Expected Recovery Value analysis
        print(f"\n  Expected Recovery Value Analysis:")
        amounts = df.loc[X_test.index, "amount"].values  # type: ignore[arg-type]
        erv = amounts * y_prob
        actual_recovery = amounts * y_test  # type: ignore[arg-type]

        print(f"    Total failed amount:        ₹{amounts.sum():>12,.0f}")
        print(f"    Predicted total recovery:    ₹{erv.sum():>12,.0f}")
        print(f"    Actual total recovery:       ₹{actual_recovery.sum():>12,.0f}")
        print(f"    Prediction error:            ₹{abs(erv.sum() - actual_recovery.sum()):>12,.0f}")
        print(f"    Error %:                     {abs(erv.sum() - actual_recovery.sum()) / actual_recovery.sum() * 100:>11.1f}%")

    # Calibration analysis (for the calibrated model)
    if "XGBoost (Calibrated)" in models:
        print(f"\n{'━' * 60}")
        print(f"  Calibration Analysis — XGBoost (Calibrated)")
        print(f"{'━' * 60}")
        model = models["XGBoost (Calibrated)"]
        y_prob = model.predict_proba(X_test)[:, 1]

        prob_true, prob_pred = calibration_curve(y_test, y_prob, n_bins=10, strategy="uniform")
        print(f"\n  {'Predicted':>12}  {'Actual':>12}  {'Gap':>8}  {'Visual'}")
        print(f"  {'─' * 50}")
        for pt, pp in zip(prob_true, prob_pred):
            gap = abs(pt - pp)
            indicator = "✓" if gap < 0.05 else "△" if gap < 0.10 else "✗"
            print(f"  {pp:>12.3f}  {pt:>12.3f}  {gap:>8.3f}  {indicator}")

    print(f"\n{'=' * 60}")
    print("  ✅ Evaluation complete!")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
