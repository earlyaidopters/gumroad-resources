#!/usr/bin/env python3
"""Regenerate tools/youtube_map.json — pairs each Gumroad resource with a
YouTube video, from two sources (highest-trust first):

  1. YouTube: the video whose description links the product (gumroad.com/l/<x>).
     Authoritative — the creator's own link, not fuzzy title matching.
  2. Skool: the "YouTube Resources" classroom, whose lesson titles are the
     resource names, each embedding the video. Fills in resources no video
     description linked. Needs SKOOL_COOKIE_FILE (default ~/.config/skool/cookies)
     and SKOOL_GROUP (default earlyaidopters); skipped if unavailable.

Run locally when new videos/lessons go up, then commit the updated map (the
Gumroad sync cannot do this — it has no YouTube/Skool auth).

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
import glob, json, os, re, subprocess, sys, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")
YT_ID = re.compile(r'(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/)|"videoId":")'
                   r'([A-Za-z0-9_-]{11})')


def slugify(name):
    s = re.sub(r"[^\w\s-]", "", name or "", flags=re.UNICODE).strip().lower()
    return re.sub(r"[\s_-]+", "-", s)[:80]


def skool_cookie():
    """Filtered Skool cookie string (only these survive Skool's WAF)."""
    path = os.path.expanduser(os.environ.get("SKOOL_COOKIE_FILE",
                                             "~/.config/skool/cookies"))
    if not os.path.exists(path):
        return None
    keep = []
    for p in (c.strip() for c in open(path).read().strip().split(";")):
        name = p.split("=", 1)[0].strip()
        if name in ("auth_token", "aws-waf-token", "client_id") or name.startswith("AWSALB"):
            keep.append(p)
    return "; ".join(keep) or None


def _next_data(html):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
                  html, re.S)
    return json.loads(m.group(1)) if m else None


def skool_lessons():
    """Return [(title, video_id)] from the YouTube Resources classroom, or []."""
    ck = skool_cookie()
    if not ck:
        return []
    group = os.environ.get("SKOOL_GROUP", "earlyaidopters")

    def get(url):
        req = urllib.request.Request(url, headers={"Cookie": ck, "User-Agent": UA})
        return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")

    try:
        root = _next_data(get(f"https://www.skool.com/{group}/classroom"))
        cid = None
        for c in root["props"]["pageProps"].get("allCourses", []):
            node = c.get("course", c)
            if node.get("metadata", {}).get("title") == "YouTube Resources":
                cid = node["id"]
        if not cid:
            return []
        html = get(f"https://www.skool.com/{group}/classroom/{cid}")  # follows redirect
        d = _next_data(html)
        out, seen = [], set()

        def walk(o):
            if isinstance(o, dict):
                md = o.get("metadata", {}) if isinstance(o.get("metadata"), dict) else {}
                if o.get("id") and "title" in md:
                    ids = YT_ID.findall(json.dumps(md))
                    if ids and md["title"] not in seen:
                        seen.add(md["title"])
                        out.append((md["title"], ids[0]))
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(d["props"]["pageProps"].get("course", {}))
        return out
    except Exception as e:
        print(f"  (skool source skipped: {e})", file=sys.stderr)
        return []


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
                               "published": d["published"],
                               "resource_slug": folder[perm], "source": "youtube-desc"}
    authoritative = len(ytmap)

    # source 2: Skool "YouTube Resources" classroom — lesson title == resource name
    name_slug = {slugify(json.load(open(mp))["name"]): folder[json.load(open(mp))["permalink"]]
                 for mp in glob.glob(os.path.join(REPO, "resources", "*", "meta.json"))}
    perm_by_folder = {v: k for k, v in folder.items()}
    added = 0
    for title, vid in skool_lessons():
        st = slugify(title)
        fslug = name_slug.get(st) or (st if st in perm_by_folder else None)
        perm = perm_by_folder.get(fslug)
        if perm and perm not in ytmap:
            d = info.get(vid, {})
            ytmap[perm] = {"video_id": vid, "url": f"https://youtu.be/{vid}",
                           "title": d.get("title") or title,
                           "thumbnail": d.get("thumb") or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                           "published": d.get("published"),
                           "resource_slug": fslug, "source": "skool-classroom"}
            added += 1

    out = os.path.join(REPO, "tools", "youtube_map.json")
    json.dump(ytmap, open(out, "w"), indent=1, ensure_ascii=False)
    print(f"paired {len(ytmap)} resources to videos "
          f"({authoritative} via YouTube links, {added} via Skool) -> {out}")


if __name__ == "__main__":
    main()
