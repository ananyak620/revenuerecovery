"""
ReviveAI — Model Training Script

Trains baseline (Logistic Regression) and primary (XGBoost) models
for recovery probability prediction.

Tracks experiments with MLflow.

Usage:
    python -m src.ml.train
"""

import sys
import json
import joblib
from pathlib import Path

import pandas as pd
import mlflow
import mlflow.sklearn as mlflow_sklearn  # type: ignore[reportPrivateImportUsage]
import mlflow.xgboost as mlflow_xgboost  # type: ignore[reportPrivateImportUsage]
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    classification_report,
)

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from src.config import settings, DATA_DIR, MODELS_DIR
from src.ml.features import prepare_for_training


def load_data() -> pd.DataFrame:
    """Load the raw transaction dataset."""
    path = DATA_DIR / "raw" / "transactions.csv"
    if not path.exists():
        print("✗ transactions.csv not found. Run data generator first.")
        sys.exit(1)
    df = pd.read_csv(path)
    print(f"  ✓ Loaded {len(df):,} transactions")
    return df


def evaluate_model(model, X_test, y_test, model_name: str) -> dict:
    """Compute and display comprehensive metrics."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred),
        "recall": recall_score(y_test, y_pred),
        "f1_score": f1_score(y_test, y_pred),
        "roc_auc": roc_auc_score(y_test, y_prob),
        "avg_precision": average_precision_score(y_test, y_prob),
    }

    print(f"\n{'─' * 50}")
    print(f"  {model_name} — Evaluation Results")
    print(f"{'─' * 50}")
    for name, value in metrics.items():
        bar = "█" * int(value * 30)
        print(f"  {name:<20} {value:.4f}  {bar}")

    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Not Recovered", "Recovered"]))

    return metrics


def train():
    """Main training pipeline."""
    print("=" * 60)
    print("  ReviveAI — Model Training Pipeline")
    print("=" * 60)

    # --- Configure MLflow ---
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment("reviveai-recovery-prediction")

    # --- Load & Prepare Data ---
    print("\n[1/5] Loading data...")
    df = load_data()

    print("\n[2/5] Engineering features...")
    X, y = prepare_for_training(df)
    print(f"  ✓ Feature matrix: {X.shape[0]:,} samples × {X.shape[1]} features")
    print(f"  ✓ Target distribution: {y.mean():.1%} recovered / {1-y.mean():.1%} not recovered")

    # Save feature columns for inference
    feature_columns = X.columns.tolist()
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODELS_DIR / "feature_columns.json", "w") as f:
        json.dump(feature_columns, f)

    # --- Train/Test Split ---
    print("\n[3/5] Splitting data (80/20 stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  ✓ Train: {len(X_train):,} | Test: {len(X_test):,}")

    # --- Baseline: Logistic Regression ---
    print("\n[4/5] Training Baseline — Logistic Regression...")
    with mlflow.start_run(run_name="baseline-logistic-regression"):
        lr = LogisticRegression(max_iter=1000, random_state=42, class_weight="balanced")
        lr.fit(X_train, y_train)

        lr_metrics = evaluate_model(lr, X_test, y_test, "Logistic Regression")

        mlflow.log_params({"model": "LogisticRegression", "max_iter": 1000})
        mlflow.log_metrics(lr_metrics)
        mlflow_sklearn.log_model(lr, "model")

        joblib.dump(lr, MODELS_DIR / "baseline_lr.joblib")
        print("  ✓ Baseline model saved")

    # --- Primary: XGBoost ---
    print("\n[5/5] Training Primary — XGBoost...")
    with mlflow.start_run(run_name="xgboost-primary"):
        # Calculate scale_pos_weight for imbalanced classes
        y_series = pd.Series(y_train)
        neg_count = len(y_series[y_series == 0])
        pos_count = len(y_series[y_series == 1])
        scale_pos_weight = neg_count / pos_count if pos_count > 0 else 1.0

        xgb_params = {
            "n_estimators": 300,
            "max_depth": 6,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 3,
            "scale_pos_weight": scale_pos_weight,
            "random_state": 42,
            "eval_metric": "logloss",
            "early_stopping_rounds": 20,
        }

        xgb = XGBClassifier(**xgb_params)
        xgb.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )

        xgb_metrics = evaluate_model(xgb, X_test, y_test, "XGBoost")

        # Calibrate probabilities
        print("\n  Calibrating probabilities...")
        cal_xgb_base = XGBClassifier(**{k: v for k, v in xgb_params.items() if k != "early_stopping_rounds"})
        cal_xgb = CalibratedClassifierCV(cal_xgb_base, cv=3, method="isotonic")
        cal_xgb.fit(X_train, y_train)
        cal_metrics = evaluate_model(cal_xgb, X_test, y_test, "XGBoost (Calibrated)")

        mlflow.log_params(xgb_params)
        mlflow.log_metrics(xgb_metrics)

        # Feature importance
        importance = pd.Series(
            xgb.feature_importances_, index=feature_columns[:len(xgb.feature_importances_)]
        ).sort_values(ascending=False)
        print("\n  Top 10 Feature Importances:")
        for feat, imp in importance.head(10).items():
            bar = "█" * int(imp * 100)
            print(f"    {feat:<35} {imp:.4f}  {bar}")

        # Save importance
        importance.to_csv(MODELS_DIR / "feature_importance.csv")

        # Save models
        joblib.dump(xgb, MODELS_DIR / "xgboost_primary.joblib")
        joblib.dump(cal_xgb, MODELS_DIR / "xgboost_calibrated.joblib")
        mlflow_xgboost.log_model(xgb, "model")

        print("\n  ✓ XGBoost model saved")
        print("  ✓ Calibrated XGBoost model saved")

    # --- Summary ---
    print("\n" + "=" * 60)
    print("  Training Summary")
    print("=" * 60)
    print(f"\n  {'Model':<30} {'AUC':>8} {'F1':>8} {'Precision':>10} {'Recall':>8}")
    print(f"  {'─'*66}")
    print(f"  {'Logistic Regression':<30} {lr_metrics['roc_auc']:>8.4f} {lr_metrics['f1_score']:>8.4f} {lr_metrics['precision']:>10.4f} {lr_metrics['recall']:>8.4f}")
    print(f"  {'XGBoost':<30} {xgb_metrics['roc_auc']:>8.4f} {xgb_metrics['f1_score']:>8.4f} {xgb_metrics['precision']:>10.4f} {xgb_metrics['recall']:>8.4f}")
    print(f"  {'XGBoost (Calibrated)':<30} {cal_metrics['roc_auc']:>8.4f} {cal_metrics['f1_score']:>8.4f} {cal_metrics['precision']:>10.4f} {cal_metrics['recall']:>8.4f}")

    best = "XGBoost" if xgb_metrics["roc_auc"] >= lr_metrics["roc_auc"] else "Logistic Regression"
    print(f"\n  🏆 Best model: {best}")

    print(f"\n  Models saved to: {MODELS_DIR}")
    print(f"  MLflow UI: run `mlflow ui` to view experiments")
    print("\n" + "=" * 60)
    print("  ✅ Training complete!")
    print("=" * 60)


if __name__ == "__main__":
    train()
