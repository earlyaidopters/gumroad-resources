#!/usr/bin/env python3
"""Flag recent resources that have no YouTube video paired.

The Gumroad sync refreshes the pairing map from public YouTube descriptions.
This check reports recent long-form resources still missing a video link.
Instagram-origin resources are excluded from this main-channel check.

Only the newest RECENT_WINDOW resources are considered; older ones legitimately
predate the videos.

Usage: check_pairings.py --repo REPO [--window 5]
Prints one slug per line (empty output means everything recent is paired).
"""
import argparse, json, os, sys

RECENT_WINDOW = 5


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--window", type=int, default=RECENT_WINDOW)
    a = ap.parse_args()

    manifest_path = os.path.join(a.repo, "manifest.json")
    map_path = os.path.join(a.repo, "tools", "youtube_map.json")
    if not os.path.exists(manifest_path):
        print("manifest.json missing", file=sys.stderr)
        return 1

    products = json.load(open(manifest_path)).get("products", [])
    ytmap = json.load(open(map_path)) if os.path.exists(map_path) else {}

    live = [
        p for p in products
        if p.get("status") == "published" and not p.get("archived")
    ]
    youtube_resources = []
    for product in live:
        meta_path = os.path.join(a.repo, "resources", product["slug"], "meta.json")
        meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
        is_instagram = any(str(value or "").startswith("sf-ig-") for value in (
            product.get("permalink"), meta.get("custom_permalink"),
            (meta.get("url") or "").split("/l/")[-1]))
        if not is_instagram:
            youtube_resources.append(product)
    for product in youtube_resources[: a.window]:
        if product.get("permalink") not in ytmap:
            print(product.get("slug", product.get("permalink", "?")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
