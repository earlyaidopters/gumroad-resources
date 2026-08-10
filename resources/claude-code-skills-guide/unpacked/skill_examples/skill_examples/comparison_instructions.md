# Instructions: Bad vs Good

How you write the body of SKILL.md determines whether Claude follows your
workflow or improvises (badly).

---

## Bad: Vague Hand-Waving

```markdown
## Instructions

Help the user with their data. Validate it and make sure everything
looks good. Process the data appropriately and handle any issues that
come up. Make sure to check for errors and fix them if possible.

When you're done, let the user know the results.
```

### What's wrong:
- "Validate it" — how? Check what exactly?
- "Process the data appropriately" — what does "appropriately" mean?
- "Handle any issues" — which issues? What's the fix for each?
- "Check for errors" — which errors? What constitutes an error?
- No step ordering, no specific tool calls, no examples

Claude will fill in the blanks with generic behavior. Every run will
be different. Some will be okay. Some will miss critical checks.

---

## Good: Specific and Actionable

```markdown
## Instructions

### Step 1: Inspect the Data

When the user provides a CSV file:

1. Read the first 10 rows to understand structure
2. Count total rows and columns
3. Identify column types (text, number, date, boolean)
4. Report findings:

"Your file has {rows} rows and {cols} columns.
Here's what I found:
- {col_name}: {type} ({null_count} missing values)
{issues_count} potential issues detected."

### Step 2: Identify Issues

Check for these specific problems:

| Issue | How to Detect | Auto-fix? |
|-------|--------------|-----------|
| Missing values | Null/empty cells | Ask user |
| Duplicate rows | Exact row matches | Yes |
| Inconsistent dates | Multiple formats in column | Yes |
| Leading/trailing whitespace | Strip and compare | Yes |
| Mixed case in categories | "Active" vs "active" | Yes |
| Outliers | Values > 3 std devs from mean | Flag only |

### Step 3: Apply Fixes

Run validation:
python scripts/validate_csv.py --input {filename} --checks all

For ambiguous fixes, ask the user:
"Column 'revenue' has 12 missing values. Should I:
(a) drop those rows, (b) fill with median, (c) fill with 0,
or (d) leave as-is?"

### Step 4: Export Clean Data

Save as: {original_name}_cleaned.csv

Tell the user exactly what changed:
"Done! Removed 23 duplicate rows, standardized 4 date formats
to YYYY-MM-DD, trimmed whitespace in 'name' and 'email' columns."
```

### What's right:
- Explicit step numbers with clear ordering
- Specific checks listed in a table
- Exact script commands to run
- Template for what to tell the user
- Decision points where user input is needed
- Concrete examples of output

---

## Bad: Buried Critical Information

```markdown
# Data Processor Skill

This skill processes data in various formats. It supports CSV, JSON,
XML, and more. The skill was originally developed for internal use
but has been adapted for general consumption. It leverages multiple
parsing libraries and can handle files up to 100MB in size.

## History

Version 0.1 was released in January 2025. Version 0.2 added JSON
support. Version 0.3 added XML support. The current version 0.4
includes streaming support for large files.

## Technical Details

The parser uses a state machine approach with configurable delimiters.
The default delimiter is comma but can be changed to tab, pipe, or
any custom character. The parser supports quoted fields, escaped
characters, and multi-line values.

## IMPORTANT: Always validate before processing

Before doing anything, run the validation script to check the file.
If validation fails, DO NOT proceed. Show the user the errors and
ask them to fix the source data.
```

### What's wrong:
- The CRITICAL instruction ("always validate before processing") is
  buried under 3 paragraphs of history and technical details
- Claude may never reach it or may deprioritize it
- Version history belongs in a changelog, not in instructions
- Technical parser details are irrelevant to Claude's workflow

---

## Good: Critical Information First

```markdown
# Data Processor

## CRITICAL — Do This First

Before processing ANY file:
1. Run `python scripts/validate_csv.py --input {file}`
2. If validation fails, STOP. Show errors to user.
3. Do NOT proceed until validation passes.

## Instructions

### Step 1: Validate
(validation details...)

### Step 2: Process
(processing details...)
```

### What's right:
- Critical instruction is the FIRST thing Claude reads
- Uses "CRITICAL" header for emphasis
- Clear, unambiguous: "STOP", "Do NOT proceed"
- No fluff before the important stuff

---

## Bad: No Error Handling

```markdown
## Workflow

1. Connect to the API
2. Fetch the user's data
3. Process the data
4. Save the results
```

### What's wrong:
- What if the API connection fails?
- What if the user has no data?
- What if processing hits an error?
- Claude will improvise error handling — inconsistently

---

## Good: Error Handling Built In

```markdown
## Workflow

### Step 1: Connect to API
Call MCP tool: `connect_api`

If connection fails:
- "Connection refused" → Ask user to check Settings > Extensions
- "Authentication failed" → API key may be expired, ask user to refresh
- "Timeout" → Try once more, then suggest checking network

### Step 2: Fetch User Data
Call MCP tool: `fetch_data`

If no data returned:
- Tell user: "No data found. Have you created any projects yet?"
- Suggest: "Try 'create a new project' first"

### Step 3: Process
(processing with specific error cases...)

### Step 4: Save Results
If save fails:
- Check disk space
- Try alternative format
- Offer to display results instead of saving
```

### What's right:
- Every step has a failure path
- Specific error messages mapped to specific solutions
- User-facing language (not developer jargon)
- Fallback options when primary action fails

---

## The Rules

1. **Be specific** — "Run this command" not "process the data"
2. **Put critical stuff first** — Claude reads top-down, prioritize accordingly
3. **Handle errors explicitly** — Every MCP call can fail. Plan for it.
4. **Show don't tell** — Templates and examples > abstract descriptions
5. **Use tables and lists** — Easier for Claude to parse than paragraphs
6. **Include the exact output** — Show Claude what to say to the user
