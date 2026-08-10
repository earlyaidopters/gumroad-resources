#!/usr/bin/env python3
"""Assemble / re-index the gumroad-resources repo.

Two modes, one code path:

  # Initial backfill: copy a full gumroad-export into the repo
  build_repo.py --repo REPO --export gumroad-export --index products_index.json

  # In-place re-index (cloud sync): resources/ already holds the pulled folders
  build_repo.py --repo REPO --index products_index.json

For every published product it: (optionally copies the export folder in),
unzips each .zip in files/ into unpacked/, writes a per-resource README, then
writes the root README (newest-first storefront) and manifest.json.

Unpublished products are held back entirely — never copied in, and any that
already exist under resources/ are removed. Newest-first = descending numeric
Gumroad product id (monotonic with creation order).
"""
import argparse, hashlib, json, os, re, shutil, zipfile

GENERATED = {"README.md", "content.md", "unpacked"}  # not part of file hash
MAX_FILE_MB = 95  # stay under GitHub's 100MB hard limit

# credential shapes we must never mirror to a public repo (products sometimes
# ship a hardcoded key by mistake). Match -> replace with a placeholder.
SECRET_RE = re.compile(
    r"AIza[0-9A-Za-z_\-]{35}"
    r"|sk-[a-zA-Z0-9]{20,}"
    r"|sk-ant-[a-zA-Z0-9\-]{20,}"
    r"|AKIA[0-9A-Z]{16}"
    r"|ghp_[a-zA-Z0-9]{36}"
    r"|xoxb-[0-9A-Za-z\-]{10,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----")
REDACT_EXT = {".json", ".txt", ".md", ".yaml", ".yml", ".env", ".js", ".ts",
              ".py", ".sh", ".ini", ".cfg", ".toml", ".xml", ".csv", ".html"}


def redact_file(path):
    """Replace secret-shaped strings in a text file. Returns count redacted."""
    try:
        if os.path.getsize(path) > 5 * 1024 * 1024:
            return 0
        data = open(path, encoding="utf-8").read()
    except (UnicodeDecodeError, OSError):
        return 0
    n = len(SECRET_RE.findall(data))
    if n:
        open(path, "w", encoding="utf-8").write(
            SECRET_RE.sub("REDACTED_SECRET_replace_with_your_own_key", data))
    return n


def load_index(path):
    idx = {}
    if path and os.path.exists(path):
        for row in json.load(open(path)):
            idx[row.get("permalink")] = row
    return idx


def dir_hash(folder):
    h = hashlib.sha256()
    if os.path.isdir(folder):
        for root, _, files in sorted(os.walk(folder)):
            for fn in sorted(files):
                h.update(fn.encode())
                h.update(str(os.path.getsize(os.path.join(root, fn))).encode())
    return h.hexdigest()[:16]


def esc(s):
    return (s or "").replace("|", "\\|").replace("\n", " ").strip()


def snippet(desc, n=130):
    import re as _re
    s = desc or ""
    s = _re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", s)   # links/images -> text
    s = _re.sub(r"[#*`>_~-]", " ", s)                   # strip md marks
    s = _re.sub(r"\s+", " ", s).strip()
    s = s.replace("|", "\\|")
    # drop a leading boilerplate heading like "What You Get"
    s = _re.sub(r"^(what you get|what's inside|what you'll get)\b[:\s]*", "",
                s, flags=_re.I)
    return (s[:n] + "…") if len(s) > n else s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--export", default=None,
                    help="if given, copy product folders from here into resources/")
    ap.add_argument("--index", default=None)
    a = ap.parse_args()
    idx = load_index(a.index)
    res_dir = os.path.join(a.repo, "resources")
    os.makedirs(res_dir, exist_ok=True)

    source = a.export or res_dir
    entries = []
    REDACTIONS = []
    for slug in sorted(os.listdir(source)):
        src = os.path.join(source, slug)
        meta_p = os.path.join(src, "meta.json")
        if not os.path.isdir(src) or not os.path.exists(meta_p):
            continue
        meta = json.load(open(meta_p))
        permalink = meta.get("permalink")
        row = idx.get(permalink, {})
        status = row.get("status") or meta.get("status")
        # archived-ness is authoritative from the live index, not the stale
        # meta flag (Gumroad's /products/archived listing also returns live
        # products, so meta['archived'] can be wrongly true for current ones)
        archived = (permalink not in idx) if idx else meta.get("archived", False)
        dest = os.path.join(res_dir, slug)

        # hold back unpublished: never publish, and scrub if present (either mode)
        if status == "unpublished":
            if os.path.exists(dest):
                shutil.rmtree(dest)
            continue

        if a.export:
            if os.path.exists(dest):
                shutil.rmtree(dest)
            shutil.copytree(src, dest)

        # unpack zips (skip if already unpacked)
        fdir = os.path.join(dest, "files")
        unpacked = []
        if os.path.isdir(fdir):
            for fn in os.listdir(fdir):
                if not fn.lower().endswith(".zip"):
                    continue
                target = os.path.join(dest, "unpacked", fn[:-4])
                if not os.path.isdir(target) or not os.listdir(target):
                    os.makedirs(target, exist_ok=True)
                    try:
                        with zipfile.ZipFile(os.path.join(fdir, fn)) as z:
                            z.extractall(target)
                    except zipfile.BadZipFile:
                        pass
                unpacked.append(fn)

        # GitHub rejects files >100MB. Drop oversized raw archives that we've
        # already unpacked (contents stay browsable); note anything else.
        cap = MAX_FILE_MB * 1024 * 1024
        oversized = {}
        if os.path.isdir(fdir):
            for fn in os.listdir(fdir):
                p = os.path.join(fdir, fn)
                if os.path.isfile(p) and os.path.getsize(p) > cap:
                    mb = round(os.path.getsize(p) / 1024 / 1024)
                    if fn in unpacked:  # zip already extracted -> safe to drop raw
                        os.remove(p)
                        oversized[fn] = f"{mb} MB — too large for GitHub; browse `unpacked/{fn[:-4]}/` or get the full archive on Gumroad"
                    else:
                        oversized[fn] = f"{mb} MB — exceeds GitHub's 100MB limit; get it on Gumroad"

        # scrub any leaked credentials from text files + content page
        redacted = 0
        for scan_root in (fdir, os.path.join(dest, "unpacked")):
            for r, _, fs in os.walk(scan_root) if os.path.isdir(scan_root) else []:
                for fn in fs:
                    if os.path.splitext(fn)[1].lower() in REDACT_EXT:
                        redacted += redact_file(os.path.join(r, fn))
        cmd_p = os.path.join(dest, "content.md")
        if os.path.exists(cmd_p):
            redacted += redact_file(cmd_p)
        if redacted:
            REDACTIONS.append((slug, redacted))

        files = [f["file"] for f in meta.get("files", [])
                 if f.get("status") in ("downloaded", "cached")]
        e = {
            "slug": slug, "name": meta.get("name"),
            "permalink": meta.get("permalink"),
            "numeric_id": row.get("id", 0),
            "url": meta.get("url") or row.get("url"),
            "status": status, "archived": archived,
            "price": meta.get("price_formatted"),
            "sales": meta.get("sales_count") or row.get("successful_sales_count") or 0,
            "description_md": meta.get("description_md", ""),
            "files": files, "unpacked": unpacked,
            "has_content": meta.get("has_rich_content", False),
            "thumbnail": (row.get("thumbnail") or {}).get("url")
                         if isinstance(row.get("thumbnail"), dict) else None,
            "content_hash": dir_hash(fdir),
        }
        entries.append(e)

        # per-resource README
        lines = [f"# {e['name']}\n"]
        if e["thumbnail"]:
            lines.append(f"![cover]({e['thumbnail']})\n")
        if e["url"]:
            lines.append(f"**Get it on Gumroad → {e['url']}**\n")
        badge = "archived" if e["archived"] else e["status"]
        lines.append(f"`{badge}` · {e['price']}\n")
        if e["description_md"]:
            lines.append("## About\n\n" + e["description_md"] + "\n")
        if e["has_content"] and os.path.exists(os.path.join(dest, "content.md")):
            lines.append("## Resource content\n\nSee [`content.md`](content.md).\n")
        listable = [f for f in files if f not in oversized]
        if listable:
            lines.append("## Files\n")
            for f in listable:
                lines.append(f"- [`{f}`](files/{f})")
            lines.append("")
        if oversized:
            lines.append("## Large files (not stored in this repo)\n")
            for fn, why in oversized.items():
                lines.append(f"- `{fn}` — {why}")
            lines.append("")
        open(os.path.join(dest, "README.md"), "w").write("\n".join(lines) + "\n")

    entries.sort(key=lambda e: (not e["archived"], e["numeric_id"]), reverse=True)
    live = [e for e in entries if not e["archived"]]
    arch = [e for e in entries if e["archived"]]

    def table(rows):
        out = ["| Resource | What it is | Files | Get it |", "|---|---|---|---|"]
        for e in rows:
            snip = snippet(e["description_md"])
            nfiles = len(e["files"]) or ("content" if e["has_content"] else "-")
            link = f"[Gumroad]({e['url']})" if e["url"] else "-"
            out.append(f"| [{esc(e['name'])}](resources/{e['slug']}/) | {snip} | {nfiles} | {link} |")
        return "\n".join(out)

    readme = [
        "# Early AI-dopters · Gumroad Resource Vault\n",
        "Every free resource from the Early AI-dopters Gumroad, "
        "mirrored here and kept in sync. Newest first. Each folder holds the actual "
        "files (zips unpacked so you can browse them on GitHub), the resource content "
        "page, and a README. Watch or star this repo to catch every new drop.\n",
        f"**{len(live)} published resources.** Auto-synced from Gumroad every few hours.\n",
        "## Latest resources\n",
        table(live),
    ]
    if arch:
        readme += ["\n<details>\n<summary>Archived resources</summary>\n",
                   table(arch), "\n</details>\n"]
    readme.append("\n---\n_Sorted newest-first by Gumroad product id. "
                  "Managed by `.github/workflows/sync.yml`._\n")
    open(os.path.join(a.repo, "README.md"), "w").write("\n".join(readme) + "\n")

    manifest = {"count": len(entries),
                "products": [{k: e[k] for k in
                              ("slug", "permalink", "numeric_id", "name", "status",
                               "archived", "content_hash", "files", "has_content")}
                             for e in entries]}
    json.dump(manifest, open(os.path.join(a.repo, "manifest.json"), "w"),
              indent=2, ensure_ascii=False)
    print(json.dumps({"resources": len(entries), "live": len(live),
                      "archived": len(arch),
                      "redacted_secrets_in": [s for s, _ in REDACTIONS],
                      "redaction_count": sum(n for _, n in REDACTIONS)}))


if __name__ == "__main__":
    main()
