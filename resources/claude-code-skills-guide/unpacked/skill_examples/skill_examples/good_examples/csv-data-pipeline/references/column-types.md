# Column Type Detection Reference

## Supported Types

| Type | Detection Pattern | Examples |
|------|------------------|----------|
| number | Parseable as float | "42", "3.14", "1,000.50" |
| date | Matches common date formats | "2025-01-15", "01/15/2025" |
| boolean | true/false/yes/no/1/0 | "true", "Yes", "0" |
| email | Contains @ with domain | "user@example.com" |
| url | Starts with http/https | "https://example.com" |
| text | Everything else | "Hello world" |

## Date Format Priority

When normalizing dates, detect the input format and convert to ISO 8601 (YYYY-MM-DD):

1. `YYYY-MM-DD` (already correct)
2. `MM/DD/YYYY` (US format)
3. `DD/MM/YYYY` (EU format — ambiguous with US, flag if unclear)
4. `Month DD, YYYY` (e.g., "January 15, 2025")
5. `Mon DD, YYYY` (e.g., "Jan 15, 2025")

## Ambiguous Dates

If a date column contains values like "03/04/2025", it's ambiguous (March 4 vs April 3).
Ask the user: "Is this column in MM/DD/YYYY or DD/MM/YYYY format?"
