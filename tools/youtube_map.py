#!/usr/bin/env python3
"""Regenerate tools/youtube_map.json — pairs each Gumroad resource with the
YouTube video whose description links it (gumroad.com/l/<permalink>).

This is authoritative: it uses the creator's own link in the video description,
not fuzzy title matching. Run it locally when new videos go up, then commit the
updated map (the Gumroad sync cannot do this — it has no YouTube auth).

Auth: reuses a YouTube OAuth token (youtube.force-ssl scope). Point these at an
existing token or run the youtube helper's auth flow first:
  GOOGLE_CREDS_PATH   default ~/.config/gmail/credentials.json
  YOUTUBE_TOKEN_PATH  default ~/.config/youtube/token.json

Usage (deps via uv):
  uv run --with google-api-python-client --with google-auth-oauthlib \
         --with google-auth tools/youtube_map.py

Needs the live Gumroad product index for url->permalink mapping:
  GUMROAD_INDEX=/path/to/products_index.json   (else runs `tools/gumroad-pull products`)
"""
import glob, json, os, re, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]


def yt_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    token = os.path.expanduser(os.environ.get("YOUTUBE_TOKEN_PATH",
                                              "~/.config/youtube/token.json"))
    creds = None
    if os.path.exists(token):
        creds = Credentials.from_authorized_user_file(token, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            cf = os.path.expanduser(os.environ.get("GOOGLE_CREDS_PATH",
                                                   "~/.config/gmail/credentials.json"))
            creds = InstalledAppFlow.from_client_secrets_file(cf, SCOPES).run_local_server(port=0)
        open(token, "w").write(creds.to_json())
    return build("youtube", "v3", credentials=creds)


def load_index():
    p = os.environ.get("GUMROAD_INDEX")
    if p and os.path.exists(p):
        return json.load(open(p))
    out = subprocess.check_output(["python3", os.path.join(REPO, "tools", "gumroad-pull"),
                                   "products", "--delay=0.3"])
    return json.loads(out)


def main():
    svc = yt_service()
    ch = svc.channels().list(part="contentDetails", mine=True).execute()["items"][0]
    up = ch["contentDetails"]["relatedPlaylists"]["uploads"]

    vids, tok = [], None
    while True:
        r = svc.playlistItems().list(part="contentDetails", playlistId=up,
                                     maxResults=50, pageToken=tok).execute()
        vids += [i["contentDetails"]["videoId"] for i in r["items"]]
        tok = r.get("nextPageToken")
        if not tok:
            break

    info = {}
    for i in range(0, len(vids), 50):
        r = svc.videos().list(part="snippet", id=",".join(vids[i:i + 50])).execute()
        for it in r["items"]:
            s = it["snippet"]
            th = s.get("thumbnails", {})
            info[it["id"]] = {
                "desc": s.get("description", ""),
                "title": s["title"],
                "published": s.get("publishedAt"),
                "thumb": (th.get("maxres") or th.get("high") or th.get("default") or {}).get("url"),
            }

    url_slug = {}
    for p in load_index():
        m = re.search(r"/l/([A-Za-z0-9\-_]+)", p.get("url") or "")
        if m:
            url_slug[m.group(1)] = p["permalink"]

    folder = {}
    for mp in glob.glob(os.path.join(REPO, "resources", "*", "meta.json")):
        folder[json.load(open(mp))["permalink"]] = os.path.basename(os.path.dirname(mp))

    rx = re.compile(r"gumroad\.com/l/([A-Za-z0-9\-_]+)")
    ytmap = {}
    for vid in vids:  # newest-first; first link to a product wins
        d = info.get(vid, {})
        for slug in dict.fromkeys(rx.findall(d.get("desc", ""))):
            perm = url_slug.get(slug)
            if perm and perm in folder and perm not in ytmap:
                ytmap[perm] = {"video_id": vid, "url": f"https://youtu.be/{vid}",
                               "title": d["title"], "thumbnail": d["thumb"],
                               "published": d["published"], "resource_slug": folder[perm]}
    out = os.path.join(REPO, "tools", "youtube_map.json")
    json.dump(ytmap, open(out, "w"), indent=1, ensure_ascii=False)
    print(f"paired {len(ytmap)} resources to videos -> {out}")


if __name__ == "__main__":
    main()
