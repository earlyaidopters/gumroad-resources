"""
Validate and clean CSV files.
Run: python scripts/validate_csv.py --input data.csv --checks all
"""

import csv
import sys
import argparse
from collections import Counter
from datetime import datetime


def detect_column_types(rows: list[dict]) -> dict:
    """Infer column types from sample data."""
    types = {}
    for col in rows[0].keys():
        values = [r[col] for r in rows if r[col]]
        if not values:
            types[col] = "empty"
            continue

        # Check if numeric
        try:
            [float(v.replace(",", "")) for v in values[:50]]
            types[col] = "number"
            continue
        except (ValueError, AttributeError):
            pass

        # Check if date
        date_formats = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%B %d, %Y", "%b %d, %Y"]
        for fmt in date_formats:
            try:
                [datetime.strptime(v.strip(), fmt) for v in values[:20]]
                types[col] = "date"
                break
            except ValueError:
                continue
        else:
            # Check if boolean
            bool_values = {"true", "false", "yes", "no", "1", "0"}
            if all(v.lower().strip() in bool_values for v in values[:50]):
                types[col] = "boolean"
            else:
                types[col] = "text"

    return types


def find_duplicates(rows: list[dict]) -> list[int]:
    """Find duplicate row indices."""
    seen = set()
    dupes = []
    for i, row in enumerate(rows):
        key = tuple(sorted(row.items()))
        if key in seen:
            dupes.append(i)
        seen.add(key)
    return dupes


def check_missing(rows: list[dict]) -> dict:
    """Count missing values per column."""
    missing = {}
    for col in rows[0].keys():
        count = sum(1 for r in rows if not r.get(col) or r[col].strip() == "")
        if count > 0:
            missing[col] = count
    return missing


def validate(input_path: str, checks: str = "all"):
    """Run validation checks on a CSV file."""
    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"File: {input_path}")
    print(f"Rows: {len(rows)}, Columns: {len(rows[0]) if rows else 0}")
    print()

    issues = []

    # Column types
    types = detect_column_types(rows)
    print("Column types:")
    for col, t in types.items():
        print(f"  {col}: {t}")
    print()

    # Missing values
    missing = check_missing(rows)
    if missing:
        print("Missing values:")
        for col, count in missing.items():
            pct = count / len(rows) * 100
            print(f"  {col}: {count} ({pct:.1f}%)")
            issues.append(f"Missing values in '{col}': {count}")
    print()

    # Duplicates
    dupes = find_duplicates(rows)
    if dupes:
        print(f"Duplicate rows: {len(dupes)}")
        issues.append(f"Duplicate rows: {len(dupes)}")
    print()

    # Summary
    if issues:
        print(f"ISSUES FOUND: {len(issues)}")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("ALL CHECKS PASSED")
        return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate CSV file")
    parser.add_argument("--input", required=True, help="Path to CSV file")
    parser.add_argument("--checks", default="all", help="Which checks to run")
    args = parser.parse_args()

    success = validate(args.input, args.checks)
    sys.exit(0 if success else 1)
