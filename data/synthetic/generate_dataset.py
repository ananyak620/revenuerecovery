"""
ReviveAI — Synthetic Dataset Generator

Generates 10,000+ realistic payment failure transactions with correlated
features that model real-world recovery patterns. The target variable
`recovered` (0/1) has meaningful correlations with features.

Usage:
    python data/synthetic/generate_dataset.py
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

NUM_TRANSACTIONS = 12_000
NUM_CUSTOMERS = 2_000
RANDOM_SEED = 42
OUTPUT_DIR = ROOT / "data" / "raw"

PAYMENT_METHODS = ["upi", "credit_card", "debit_card", "netbanking", "wallet"]
PAYMENT_METHOD_WEIGHTS = [0.35, 0.25, 0.20, 0.12, 0.08]

FAILURE_REASONS = [
    "authentication_failure",
    "insufficient_funds",
    "card_expired",
    "network_error",
    "bank_declined",
    "fraud_flag",
    "technical_error",
    "limit_exceeded",
]

SUBSCRIPTION_TYPES = ["starter", "professional", "business", "enterprise"]
SUBSCRIPTION_PRICES = {
    "starter": (299, 999),
    "professional": (999, 4999),
    "business": (4999, 14999),
    "enterprise": (14999, 49999),
}

DEVICE_TYPES = ["mobile", "desktop", "tablet"]
REGIONS = ["north", "south", "east", "west", "metro"]
INDUSTRIES = ["saas", "ecommerce", "fintech", "healthtech", "edtech", "media", "gaming"]


# ---------------------------------------------------------------------------
# Customer Generator
# ---------------------------------------------------------------------------

def generate_customers(n: int, rng: np.random.Generator) -> pd.DataFrame:
    """Generate a customer base with stable attributes."""
    customers = pd.DataFrame({
        "customer_id": [f"CUS_{i:05d}" for i in range(n)],
        "customer_tenure_days": rng.exponential(scale=365, size=n).astype(int).clip(1, 2000),
        "subscription_type": rng.choice(
            SUBSCRIPTION_TYPES, size=n, p=[0.30, 0.35, 0.25, 0.10]
        ),
        "industry": rng.choice(INDUSTRIES, size=n),
        "region": rng.choice(REGIONS, size=n, p=[0.20, 0.25, 0.15, 0.15, 0.25]),
        "device_type": rng.choice(DEVICE_TYPES, size=n, p=[0.55, 0.35, 0.10]),
        "customer_ltv": rng.lognormal(mean=9.0, sigma=1.2, size=n).clip(500, 500_000),
    })

    # Derived: historical success rate (longer tenure → generally higher)
    tenure_factor = np.clip(customers["customer_tenure_days"] / 1000, 0.1, 1.0)
    noise = rng.normal(0, 0.1, size=n)
    customers["previous_success_rate"] = np.clip(
        0.5 + tenure_factor * 0.35 + noise, 0.1, 0.99
    )

    # Historical recovery rate correlated with success rate
    customers["historical_recovery_rate"] = np.clip(
        customers["previous_success_rate"] * 0.85 + rng.normal(0, 0.08, size=n),
        0.05, 0.98,
    )

    # Support tickets: inverse relationship with tenure
    customers["support_tickets_last_30d"] = rng.poisson(
        lam=np.clip(5 - tenure_factor * 3, 0.5, 5), size=n
    )

    # Login recency
    customers["days_since_last_login"] = rng.exponential(
        scale=np.clip(15 - tenure_factor * 10, 1, 15), size=n
    ).astype(int).clip(0, 90)

    # NPS score
    customers["nps_score"] = np.clip(
        rng.normal(7 + tenure_factor * 2, 2, size=n), 0, 10
    ).round(1)

    return customers


# ---------------------------------------------------------------------------
# Transaction Generator
# ---------------------------------------------------------------------------

def generate_transactions(
    n: int, customers: pd.DataFrame, rng: np.random.Generator
) -> pd.DataFrame:
    """Generate failed payment transactions with realistic correlations."""

    # Assign random customers to transactions
    cust_idx = rng.integers(0, len(customers), size=n)
    txn_customers = customers.iloc[cust_idx].reset_index(drop=True)

    # --- Base features ---
    txn = pd.DataFrame({
        "transaction_id": [f"TXN_{i:06d}" for i in range(n)],
        "customer_id": txn_customers["customer_id"].values,
    })

    # Amount based on subscription type
    amounts = []
    for _, row in txn_customers.iterrows():
        lo, hi = SUBSCRIPTION_PRICES[row["subscription_type"]]
        amounts.append(rng.uniform(lo, hi))
    txn["amount"] = np.round(amounts, 2)

    # Payment method
    txn["payment_method"] = rng.choice(
        PAYMENT_METHODS, size=n, p=PAYMENT_METHOD_WEIGHTS
    )

    # Failure reason — weighted, but some correlations
    failure_probs = np.tile([0.22, 0.20, 0.15, 0.15, 0.12, 0.06, 0.05, 0.05], (n, 1))

    # Card-based methods → more card_expired failures
    is_card = np.asarray(txn["payment_method"].isin(["credit_card", "debit_card"]))
    failure_probs[is_card, 2] *= 2.5  # card_expired
    failure_probs[~is_card, 2] *= 0.1

    # UPI → more auth failures
    is_upi = np.asarray(txn["payment_method"] == "upi")
    failure_probs[is_upi, 0] *= 1.8  # auth failure

    # High amount → more fraud flags
    high_amount = np.asarray(txn["amount"] > 20000)
    failure_probs[high_amount, 5] *= 3.0  # fraud_flag

    # Normalize
    failure_probs = failure_probs / failure_probs.sum(axis=1, keepdims=True)

    txn["failure_reason"] = [
        rng.choice(FAILURE_REASONS, p=failure_probs[i]) for i in range(n)
    ]

    # Retry count (0-5)
    txn["retry_count"] = rng.choice([0, 1, 2, 3, 4, 5], size=n, p=[0.25, 0.30, 0.20, 0.12, 0.08, 0.05])

    # Time since failure (hours)
    txn["time_since_failure_hours"] = np.round(
        rng.exponential(scale=24, size=n).clip(0.5, 336), 1
    )

    # Temporal features
    txn["hour_of_day"] = rng.integers(0, 24, size=n)
    txn["day_of_week"] = rng.integers(0, 7, size=n)
    txn["is_weekend"] = txn["day_of_week"].isin([5, 6]).astype(int)

    # Carry over customer features
    for col in [
        "customer_tenure_days", "subscription_type", "previous_success_rate",
        "historical_recovery_rate", "device_type", "region", "industry",
        "customer_ltv", "support_tickets_last_30d", "days_since_last_login",
        "nps_score",
    ]:
        txn[col] = txn_customers[col].values

    return txn


# ---------------------------------------------------------------------------
# Target Variable Generator (with realistic correlations)
# ---------------------------------------------------------------------------

def generate_target(txn: pd.DataFrame, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate the `recovered` target (0/1) with meaningful correlations.

    Recovery is MORE likely when:
    - retry_count is LOW  (fresh failures recover easier)
    - previous_success_rate is HIGH  (reliable customers)
    - failure_reason is temporary  (auth, network > fraud)
    - time_since_failure is LOW  (act fast)
    - payment_method is UPI  (easier retry)
    - customer_tenure is HIGH  (loyal customers)
    - amount is LOWER  (smaller amounts have fewer blocks)

    Recovery is LESS likely when:
    - retry_count is HIGH  (already tried multiple times)
    - fraud_flag is the reason
    - high time_since_failure
    - low NPS score
    """
    n = len(txn)

    # Start with a base log-odds
    logit = np.zeros(n)

    # --- Retry count: strong negative effect ---
    logit -= np.asarray(txn["retry_count"]) * 0.55

    # --- Previous success rate: strong positive ---
    logit += (np.asarray(txn["previous_success_rate"]) - 0.5) * 3.0

    # --- Historical recovery rate ---
    logit += (np.asarray(txn["historical_recovery_rate"]) - 0.5) * 2.0

    # --- Failure reason effects ---
    reason_effects = {
        "authentication_failure": 0.8,   # temporary → high recovery
        "network_error": 0.7,            # temporary
        "technical_error": 0.5,          # fixable
        "insufficient_funds": -0.2,      # might resolve
        "limit_exceeded": -0.3,
        "card_expired": -0.6,            # needs customer action
        "bank_declined": -0.8,           # harder
        "fraud_flag": -2.0,              # very unlikely to recover
    }
    logit += np.asarray(txn["failure_reason"].map(lambda x: reason_effects.get(x, 0.0)))

    # --- Time since failure: negative (older → harder) ---
    logit -= np.log1p(np.asarray(txn["time_since_failure_hours"])) * 0.3

    # --- Payment method effects ---
    method_effects = {
        "upi": 0.5,
        "wallet": 0.3,
        "debit_card": 0.0,
        "credit_card": -0.1,
        "netbanking": -0.3,
    }
    logit += np.asarray(txn["payment_method"].map(lambda x: method_effects.get(x, 0.0)))

    # --- Customer tenure: positive ---
    logit += np.log1p(np.asarray(txn["customer_tenure_days"])) * 0.15

    # --- Amount: higher amounts slightly harder ---
    logit -= np.log1p(np.asarray(txn["amount"])) * 0.08

    # --- NPS: positive signal ---
    logit += (np.asarray(txn["nps_score"]) - 5) * 0.12

    # --- Support tickets: negative (unhappy customers) ---
    logit -= np.asarray(txn["support_tickets_last_30d"]) * 0.08

    # --- Days since login: negative (disengaged) ---
    logit -= np.asarray(txn["days_since_last_login"]) * 0.015

    # --- Time of day: business hours slightly better ---
    is_business_hours = ((txn["hour_of_day"] >= 9) & (txn["hour_of_day"] <= 18)).astype(float)
    logit += np.asarray(is_business_hours) * 0.2

    # --- Weekend: slightly worse ---
    logit -= np.asarray(txn["is_weekend"]) * 0.15

    # --- Subscription tier: enterprise slightly better (dedicated support) ---
    tier_effects = {"starter": -0.1, "professional": 0.0, "business": 0.15, "enterprise": 0.3}
    logit += np.asarray(txn["subscription_type"].map(lambda x: tier_effects.get(x, 0.0)))

    # Add noise for realism
    logit += rng.normal(0, 0.5, size=n)

    # Convert logit → probability → binary
    probability = 1 / (1 + np.exp(-logit))
    recovered = (rng.random(n) < probability).astype(int)

    return recovered, probability


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("  ReviveAI -- Synthetic Dataset Generator")
    print("=" * 60)

    rng = np.random.default_rng(RANDOM_SEED)

    # 1. Generate customers
    print(f"\n[1/4] Generating {NUM_CUSTOMERS:,} customers...")
    customers = generate_customers(NUM_CUSTOMERS, rng)
    print(f"  [OK] Customers generated | Tenure range: {customers['customer_tenure_days'].min()}-{customers['customer_tenure_days'].max()} days")

    # 2. Generate transactions
    print(f"\n[2/4] Generating {NUM_TRANSACTIONS:,} failed payment transactions...")
    transactions = generate_transactions(NUM_TRANSACTIONS, customers, rng)
    print(f"  [OK] Transactions generated | Amount range: Rs.{transactions['amount'].min():,.0f} - Rs.{transactions['amount'].max():,.0f}")

    # 3. Generate target
    print("\n[3/4] Computing recovery target with realistic correlations...")
    recovered, recovery_prob = generate_target(transactions, rng)
    transactions["recovered"] = recovered
    transactions["recovery_probability_true"] = recovery_prob.round(4)
    print(f"  [OK] Recovery rate: {recovered.mean():.1%} ({recovered.sum():,} / {len(recovered):,})")

    # 4. Save
    print(f"\n[4/4] Saving datasets...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    transactions_path = OUTPUT_DIR / "transactions.csv"
    customers_path = OUTPUT_DIR / "customers.csv"

    transactions.to_csv(transactions_path, index=False)
    customers.to_csv(customers_path, index=False)

    print(f"  [OK] {transactions_path}  ({len(transactions):,} rows, {len(transactions.columns)} columns)")
    print(f"  [OK] {customers_path}  ({len(customers):,} rows, {len(customers.columns)} columns)")

    # Summary statistics
    print("\n" + "=" * 60)
    print("  Dataset Summary")
    print("=" * 60)
    print(f"\n  Total transactions:     {len(transactions):>8,}")
    print(f"  Unique customers:       {transactions['customer_id'].nunique():>8,}")
    print(f"  Recovery rate:          {recovered.mean():>8.1%}")
    print(f"  Avg amount:             Rs.{transactions['amount'].mean():>8,.0f}")
    print(f"  Median amount:          Rs.{transactions['amount'].median():>8,.0f}")

    print(f"\n  Recovery by failure reason:")
    recovery_by_reason = pd.DataFrame(transactions.groupby("failure_reason")["recovered"].agg(["mean", "count"]))
    recovery_by_reason.columns = ["recovery_rate", "count"]
    recovery_by_reason = recovery_by_reason.sort_values(by="recovery_rate", ascending=False)
    for reason, row in recovery_by_reason.iterrows():
        bar = "#" * int(row["recovery_rate"] * 30)
        print(f"    {reason:<25} {row['recovery_rate']:.1%}  ({row['count']:>4})  {bar}")

    print(f"\n  Recovery by payment method:")
    recovery_by_method = pd.DataFrame(transactions.groupby("payment_method")["recovered"].agg(["mean", "count"]))
    recovery_by_method.columns = ["recovery_rate", "count"]
    recovery_by_method = recovery_by_method.sort_values(by="recovery_rate", ascending=False)
    for method, row in recovery_by_method.iterrows():
        bar = "#" * int(row["recovery_rate"] * 30)
        print(f"    {method:<25} {row['recovery_rate']:.1%}  ({row['count']:>4})  {bar}")

    print(f"\n  Recovery by retry count:")
    recovery_by_retry = transactions.groupby("retry_count")["recovered"].mean()
    for retry, rate in recovery_by_retry.items():
        bar = "#" * int(rate * 30)
        print(f"    retry_count={retry}             {rate:.1%}  {bar}")

    print("\n" + "=" * 60)
    print("  [DONE] Dataset generation complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
