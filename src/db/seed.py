"""
ReviveAI — Database Seeder

Loads the synthetic CSV dataset into the database.

Usage:
    python -m src.db.seed
"""

import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from src.config import DATA_DIR
from src.db.models import Customer, Transaction
from src.db.session import SessionLocal, init_db


def seed_customers(session, customers_df: pd.DataFrame):
    """Insert customer records from DataFrame."""
    count = 0
    for _, row in customers_df.iterrows():
        customer = Customer(
            id=row["customer_id"],
            tenure_days=int(row["customer_tenure_days"]),  # type: ignore[arg-type]
            subscription_type=row["subscription_type"],
            industry=row.get("industry", "saas"),
            region=row.get("region", "metro"),
            device_type=row.get("device_type", "mobile"),
            customer_ltv=float(row["customer_ltv"]),  # type: ignore[arg-type]
            previous_success_rate=float(row["previous_success_rate"]),  # type: ignore[arg-type]
            historical_recovery_rate=float(row["historical_recovery_rate"]),  # type: ignore[arg-type]
            support_tickets_last_30d=int(row["support_tickets_last_30d"]),  # type: ignore[arg-type]
            days_since_last_login=int(row["days_since_last_login"]),  # type: ignore[arg-type]
            nps_score=float(row["nps_score"]),  # type: ignore[arg-type]
        )
        session.merge(customer)  # merge = insert or update
        count += 1
    session.commit()
    return count


def seed_transactions(session, transactions_df: pd.DataFrame):
    """Insert transaction records from DataFrame."""
    count = 0
    for _, row in transactions_df.iterrows():
        txn = Transaction(
            id=row["transaction_id"],
            customer_id=row["customer_id"],
            amount=float(row["amount"]),  # type: ignore[arg-type]
            payment_method=row["payment_method"],
            failure_reason=row["failure_reason"],
            retry_count=int(row["retry_count"]),  # type: ignore[arg-type]
            time_since_failure_hours=float(row["time_since_failure_hours"]),  # type: ignore[arg-type]
            hour_of_day=int(row["hour_of_day"]),  # type: ignore[arg-type]
            day_of_week=int(row["day_of_week"]),  # type: ignore[arg-type]
            is_weekend=bool(row["is_weekend"]),
            recovered=bool(row["recovered"]),
        )
        session.merge(txn)
        count += 1

        # Commit in batches for performance
        if count % 2000 == 0:
            session.commit()
            print(f"    ... {count:,} transactions loaded")

    session.commit()
    return count


def main():
    print("=" * 60)
    print("  ReviveAI — Database Seeder")
    print("=" * 60)

    # Initialize database
    print("\n[1/3] Initializing database...")
    init_db()

    # Load CSVs
    print("\n[2/3] Loading CSV files...")
    customers_path = DATA_DIR / "raw" / "customers.csv"
    transactions_path = DATA_DIR / "raw" / "transactions.csv"

    if not customers_path.exists() or not transactions_path.exists():
        print("  ✗ CSV files not found. Run the data generator first:")
        print("    python data/synthetic/generate_dataset.py")
        sys.exit(1)

    customers_df = pd.read_csv(customers_path)
    transactions_df = pd.read_csv(transactions_path)
    print(f"  ✓ Loaded {len(customers_df):,} customers, {len(transactions_df):,} transactions")

    # Seed
    print("\n[3/3] Seeding database...")
    session = SessionLocal()
    try:
        cust_count = seed_customers(session, customers_df)
        print(f"  ✓ {cust_count:,} customers seeded")

        txn_count = seed_transactions(session, transactions_df)
        print(f"  ✓ {txn_count:,} transactions seeded")
    finally:
        session.close()

    print("\n" + "=" * 60)
    print("  ✅ Database seeded successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
