# What stays on your machine

This repository starts with fresh public history. It includes reusable source, documentation and synthetic fixtures. It excludes original browser captures, real trip configurations, histories, benchmarks, account details, local paths and credentials.

During use, generated requests and results contain your route, dates and adult count. Generated browser instructions also contain local filesystem paths so Codex can import the runner. Browser evidence can contain page details beyond the final CSV. The runner strips the account banner as a precaution, not a guarantee that arbitrary future page markup contains no personal information.

Keep all runtime data local. The `.gitignore` excludes common output folders, but custom output paths remain your responsibility. Before sharing an issue, remove names, email addresses, trip details, account identifiers, session URLs, tokens, cookies and machine paths. Prefer a synthetic reproduction.

The local planner, parser and demo do not send telemetry or make network requests. The browser stage visits Google Flights through the supported Codex browser. Those products' own account and data practices still apply.
