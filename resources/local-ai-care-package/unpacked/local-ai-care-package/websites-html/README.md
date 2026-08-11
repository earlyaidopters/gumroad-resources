# The four websites, source only

This is the real source of the four sites from the video. Nothing here was cleaned up or rewritten for the download, it is what the local model actually produced.

| Folder | Site | Type |
|---|---|---|
| `durable/` | DURABLE | Scroll-scrubbed video, the $0 pipeline build |
| `meridian/` | MERIDIAN | Scroll-scrubbed video, the vault build |
| `cove/` | COVE | Editorial, "Client work, without the chaos" |
| `hearth/` | HEARTH | Editorial, "Modern cabins for wild places" |

## The media is stripped, on purpose

Each site originally carried between 36MB and 102MB of `node_modules`, extracted frame sequences and brand media. What is left is the part worth reading, `index.html`, `src/`, `package.json` and the `DESIGN.md` where the model recorded its own variation picks.

That means these will not run as-is. Two things are missing.

**The scrubbed sites** (`durable`, `meridian`) read a numbered frame sequence from `public/frames/frame_0001.jpg` upward. Point the pipeline at your own footage instead:

```bash
~/.pi/agent/skills/immersive-web/scripts/setup-scrub.sh yourvideo.mp4 ./site \
  "YOURBRAND" "YOUR TAGLINE"
```

That scaffolds a fresh site with the frames extracted and the frame count injected. Then copy the beat copy and any styling you liked out of `durable/` or `meridian/` into it.

**The editorial sites** (`cove`, `hearth`) reference images and one video under `/media/`, things like `cabin-forest.jpg` and `hero-768p.mp4`. Drop your own into `public/media/` using the same filenames, or edit the `src` attributes in `index.html`. The plates are fixed-ratio with object-fit cover, so any reasonable resolution crops gracefully.

To run either kind after supplying media:

```bash
npm install && npm run dev
```

## The actual reason these are in here

Feed them to a language model and ask it to explain what it sees. The scroll choreography, the token-driven theming in `:root`, the reveal timing, the way each `DESIGN.md` records which variation axes were chosen and why. That is a faster way to learn this genre than reading a tutorial, and it works with whatever model you already use.

Worth reading closely in each one:

- `durable/src/video-scroll.js`, how scroll position maps to a frame index, and why frames beat seeking a video element
- `cove/src/style.css` and `hearth/src/style.css`, the `:root` token block that carries the entire palette and type scale
- `hearth/index.html`, the 10-section editorial grammar in full
- every `DESIGN.md`, the model explaining its own choices

## One honest note about HEARTH

HEARTH shipped with a real bug during the build. The model wrote CSS for a banner using class names it never added to the HTML, so the section rendered as cream text on a cream background with no image behind it. That failure is why the editorial skill now carries a mandatory CSS-markup contract check. The fix is in the source you have, the lesson is in `harness-tips.md`.
