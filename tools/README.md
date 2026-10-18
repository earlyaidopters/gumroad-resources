# Gumroad mirror operations

The public vault mirrors published Gumroad resources. The sync workflow is
scheduled every 12 hours at 00:17 and 12:17 UTC, and can also be run immediately:

```sh
gh workflow run sync.yml --repo earlyaidopters/gumroad-resources --ref main
```

GitHub schedules are best-effort and may be delayed. The root README shows the
**last verified sync**, with product and attachment counts and a link to that
run. `sync-status.json` records the source observation time, verification time,
manifest SHA-256 and explicit oversized-file exceptions. A green job alone is
not the evidence: the catalogue and files must pass the checks below.

## What a successful run means

1. The seller API token authenticates. No browser cookie is needed in CI.
   Local runs can read the existing private `~/.config/gumroad/token` file.
2. A nonempty, structurally valid product index is captured. Drafts are excluded.
3. Every published product in that snapshot is pulled. Failed transfers and
   incorrect byte counts cause a nonzero exit. Partial files cannot overwrite
   a complete prior download.
4. Reusing a file requires matching its source identity (file ID, storage URL
   and size, stored only as a hash) and the SHA-256 of the local file. A replaced
   file with the same name and size is downloaded again. The first hardened run
   downloads existing files once to establish these records.
5. Duplicate attachment names receive stable file-ID-based suffixes, preserving
   both files and fixing their rich-content links. Removed attachments and
   removed content are removed locally after a successful product pull.
6. Download coverage, statuses, file existence and hashes are verified. The
   builder refreshes changed ZIP extractions, deletes obsolete extracted files,
   rejects corrupt/unsafe ZIPs, and applies the existing text-secret redaction.
7. The finished manifest, README links, attachments and extracted archives are
   checked against the source snapshot before the verified timestamp is written.
8. Only a successful run can commit and push the verified catalogue. The workflow
   stages an explicit list of mirror paths; transient authentication files,
   downloaded private product indexes and pull reports are excluded.

Attachments over 95 MiB are deliberately excluded to stay below GitHub's file
limit. They are counted separately, with Gumroad download guidance in each
resource README. Existing browsable extractions may remain available. These are
explicit exceptions, never represented as verified mirrored downloads.

Source SHA-256 and local SHA-256 are separate because existing secret redaction
can legitimately change a text file before publication. The local hash verifies
the committed form; source identity detects upstream attachment replacement.
Gumroad does not supply a content checksum: this does not detect a provider
silently changing bytes at the same storage URL with the same ID and size.
Use `--force` on `tools/gumroad-pull` to bypass its cache when auditing that case.

## Failure and recovery

Authentication failure opens an API authentication incident. Download, verification,
build and push failures open one general sync incident. Repeated failures do not
create duplicate issues or repeated comments. A fully verified successful push
closes the corresponding incident automatically. Native GitHub notification
settings determine who receives issue and failed-run notifications; this tooling
does not send email or Slack messages.

The job has a 40-minute timeout and retries failed resource syncs up to three
times before reporting failure. If GitHub never starts a scheduled run, that run
cannot raise its own failure alert. The timestamp remains old and visible. For freshness monitoring, an hourly GitHub watchdog checks the storefront
without Gumroad credentials, total product count, newest public product IDs,
committed file hashes and the age of the last verified sync. It requests a new
sync if unhealthy and avoids duplicate active runs. It cancels a stuck run after
50 minutes. A separate hourly macOS LaunchAgent runs the same check even if a
GitHub scheduled event never starts. A Codex heartbeat also checks the live source and
GitHub every 12 hours, retries stale/failed runs, and reports unrecovered failures
in the owning conversation. That secondary check depends on its Codex host; the
primary scheduled sync runs on GitHub independently of the local computer.

## API authentication

The seller API now returns rich content and signed file URLs. The sync uses
`GUMROAD_ACCESS_TOKEN`, not an expiring dashboard cookie. Every API page is
fetched; drafts are excluded and existing resource folder links are preserved.
The download request receives no API token. Signed URL query strings are excluded
from file identity hashes so signature rotation does not force re-downloads.
Keep tokens outside this public repository.

After verifying the private local token works:

```sh
python3 tools/gumroad-pull check
python3 -c 'from pathlib import Path; print((Path.home()/".config/gumroad/token").read_text().strip().removeprefix("GUMROAD_ACCESS_TOKEN="), end="")' | gh secret set GUMROAD_ACCESS_TOKEN --repo earlyaidopters/gumroad-resources
gh workflow run sync.yml --repo earlyaidopters/gumroad-resources --ref main
```

Only use the second command when refreshing the deployed token. It pipes the
private value directly into GitHub Secrets; never print or commit that value.
If the token is revoked, reauthenticate with `gumroad auth login`.
The old cookie path remains available for manual legacy dashboard pulls.

## YouTube pairing

`youtube_map.py` runs during sync when `YOUTUBE_API_KEY` is configured. It pairs
videos by the Gumroad links in their public descriptions; unmatched resources
retain existing pairings. A missing video does not mean the resource is missing.
The existing pairing issue covers missing links among the newest YouTube
resources; Instagram-only resources are excluded from that main-channel check.
Its body updates when the missing set changes,
without posting the same comment on every scheduled run. Pairing refresh failures
are recorded as degraded in `sync-status.json`. Verified resource files still
publish; the job then fails visibly with a separate video-pairing incident.
A missing `YOUTUBE_API_KEY` behaves the same way. The next watchdog run retries
the pairing, so a video service outage cannot freeze new resource files.

## Tests and local verification

```sh
python3 -m unittest discover -s tools/tests -v
bash -n tools/sync.sh
bash tools/sync.sh
```

The last command reads the live seller catalogue and changes local generated
mirror files. It never pushes to GitHub. Regression tests use synthetic products,
files, cookies and mocked issue commands, with no production mutations.


## Original-package publication and durable retries

`python3 tools/install_local.py` installs `gumroad-mirror`, the `gumroad-push`
source-backup hook, and `com.markkashef.gumroad-mirror-watchdog`. The installer
preserves the pre-hook publisher privately and refuses to patch an unfamiliar
publisher layout. All state lives in `~/.local/state/gumroad-mirror` with private
permissions, outside Git.

For free resources created using `gumroad-push create` or `from-package`, the
original files are copied, hashed, fsynced and queued **before publication**.
A backup failure leaves the product as a draft and identifies it for resumption.
Drafts can enter the private queue, but cannot enter GitHub. Once Gumroad verifies
a product is published and free, the publisher attempts immediate GitHub delivery.
Failure after Gumroad publication returns an explicit pending result; the hourly
local worker retries the same product rather than creating a duplicate.

The source worker uses an isolated managed checkout, preserves existing resource
folder links, verifies local hashes and uploaded file identities, rebuilds and
validates the catalog, and confirms the actual pushed bytes from GitHub. File
bytes come from the retained original package, not a Gumroad download. If upstream
attachments changed after queuing, it holds the old package rather than overwriting
the new resource. Concurrent pushes retry against fresh main up to three times.
A per-resource `source-receipt.json` records provenance. Partial source publication
does not advance the last **full** catalog verification timestamp; a reconciliation
run is requested after delivery.

Other publishing routes can explicitly retain their original files:

```sh
gumroad-mirror enqueue --product-id PRODUCT_ID --file /path/to/guide.pdf --file /path/to/kit.zip
gumroad-mirror drain --product-id PRODUCT_ID
gumroad-mirror status
```

This never publishes a Gumroad draft, changes pricing, or edits a Gumroad product.
Paid products are excluded from original-package auto-publication. Files above
95 MiB remain safely backed up locally but use the existing Gumroad-only download
exception in the public vault. The local worker needs this Mac on and GitHub/API
access; GitHub's primary sync and public watchdog run independently in the cloud.

The public storefront exposes its total and newest listings, not a guaranteed
complete unauthenticated asset API. The public watchdog detects new releases and
count mismatches; the authenticated paginated reconciler proves full coverage.
Public schema changes and fetch failures produce an unhealthy report, never a
false healthy result. Safe health reports are retained as workflow artifacts.
