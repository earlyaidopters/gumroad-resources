# Sync tooling

This repo is a self-updating mirror of the Early AI-dopters Gumroad store.
`.github/workflows/sync.yml` runs every 6 hours and:

1. writes the `GUMROAD_COOKIE` secret to a session cookie file,
2. lists published products and pulls any new ones into `resources/`,
3. re-indexes the repo (root `README.md` + `manifest.json`),
4. commits and pushes only if something changed.

Unpublished and archived products are held back. Files over 100 MB are dropped
(their unpacked contents stay). Anything that looks like an API key is redacted
before it is ever committed.

## Files

- `gumroad-pull` — pulls product files + content pages using a seller session
  cookie (the public Gumroad API exposes metadata only). Commands:
  `check`, `products`, `pull <permalink>... | --all [--published-only]`.
- `build_repo.py` — turns a pulled export into the repo layout, newest-first.
- `sync.sh` — the end-to-end job the workflow runs.

## The `GUMROAD_COOKIE` secret

The pull needs a logged-in gumroad.com session cookie string (it must include
the `_gumroad_app_session` cookie). Cookies expire; when they do, the workflow
opens an issue and stops publishing until the secret is refreshed.

To refresh: on a machine logged into Gumroad in Chrome, export the gumroad.com
cookies as a single "Header String" (e.g. with the Cookie-Editor extension),
then update the repo secret:

```sh
gh secret set GUMROAD_COOKIE --repo <owner>/<repo> < cookies.txt
```

Run `gh workflow run sync-gumroad.yml` to sync immediately, or wait for the
next scheduled run. Change the cron in `sync.yml` to `0 */3 * * *` for every
3 hours.
