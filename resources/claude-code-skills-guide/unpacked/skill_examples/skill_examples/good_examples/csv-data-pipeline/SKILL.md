---
name: csv-data-pipeline
description: Cleans, validates, and transforms CSV files for analysis. Use when user says "clean this CSV", "fix my data", "prepare this spreadsheet for analysis", "validate this dataset", or uploads a .csv file that needs processing.
---

# CSV Data Pipeline

## Instructions

### Step 1: Inspect the Data

When the user provides a CSV file:

1. Read the first 10 rows to understand structure
2. Count total rows and columns
3. Identify column types (text, number, date, boolean, email, URL)
4. Report findings to the user:

```
"Your file has {rows} rows and {cols} columns.
Here's what I found:
- {col_name}: {type} ({null_count} missing values)
- ...
{issues_count} potential issues detected."
```

### Step 2: Identify Issues

Check for these common problems:

| Issue | Detection | Auto-fix? |
|-------|-----------|-----------|
| Missing values | Null/empty cells | Ask user |
| Duplicate rows | Exact row matches | Yes |
| Inconsistent dates | Multiple formats in same column | Yes — standardize to YYYY-MM-DD |
| Leading/trailing whitespace | Strip and compare | Yes |
| Mixed case in categories | "Active" vs "active" vs "ACTIVE" | Yes — normalize to lowercase |
| Outliers | Values > 3 standard deviations from mean | Flag, don't auto-fix |

Present issues to the user and ask which to fix.

### Step 3: Apply Fixes

For each approved fix:
```bash
python scripts/validate_csv.py --input {filename} --checks all
```

If the script finds issues:
- Apply automatic fixes (whitespace, duplicates, date normalization)
- For ambiguous fixes (missing values, outliers), ask the user:
  "Column 'revenue' has 12 missing values. Should I: (a) drop those rows, (b) fill with column median, (c) fill with 0, or (d) leave as-is?"

### Step 4: Export Clean Data

Save the cleaned file with a descriptive name:
- `{original_name}_cleaned.csv` — processed data
- `{original_name}_report.txt` — summary of changes made

Tell the user what changed:
```
"Done! Here's what I fixed:
- Removed 23 duplicate rows
- Standardized 4 date formats to YYYY-MM-DD
- Trimmed whitespace in 'name' and 'email' columns
- Flagged 3 outliers in 'revenue' (not changed)
Clean file: data_cleaned.csv"
```

## Examples

### Example 1: Messy Customer List

User: "Clean this customer spreadsheet"

Found: 500 rows, columns [name, email, signup_date, plan, revenue]
Issues:
- 12 duplicate emails
- signup_date has "01/15/2025", "2025-01-15", "Jan 15, 2025" formats
- 3 rows with missing email
- "Pro", "pro", "PRO" in plan column

Actions: Remove dupes, normalize dates, flag missing emails, lowercase plans.

### Example 2: Large Dataset Validation

User: "Validate this CSV before I import to our database"

Run full validation suite. Report schema compatibility issues.
Flag any values that would violate database constraints (nulls in required fields, strings in numeric columns, dates out of range).

## Troubleshooting

**"File too large to process"**
Cause: CSV exceeds available memory.
Solution: Process in chunks of 10,000 rows. Ask user if sampling is acceptable for initial analysis.

**"Encoding error on read"**
Cause: File isn't UTF-8.
Solution: Try latin-1 encoding. If that fails, ask user what encoding the file uses.

**"Column count mismatch between rows"**
Cause: Unescaped commas or newlines in data.
Solution: Try reading with different quoting settings. Show the problematic rows to the user.
