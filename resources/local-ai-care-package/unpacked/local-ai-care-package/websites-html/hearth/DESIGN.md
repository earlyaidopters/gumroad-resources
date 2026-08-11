# HEARTH — Design Variation Axis Picks

## Mood: warm editorial brand
Chosen for HEARTH's grounded, expensive-catalog voice. The warm cream canvas (#f7f4ed) and deep forest green accents (#2d4a3f) evoke premium outdoor hospitality—tactile, natural, and confident.

## Display serif voice: elegant condensed (Cormorant)
Cormorant brings refined elegance with its slightly condensed proportions and graceful curves. It feels editorial and sophisticated without being ornate—perfect for a brand that speaks to wild places with quiet authority.

## Hero alignment: left-set with media peeking right
The asymmetrical layout creates visual interest and allows the arch-topped hero video to breathe on the right side. This feels more editorial than centered—like a magazine spread where type and image coexist dynamically.

## Plate shape: arch-topped (radius 50% top)
Arch-topped frames evoke architectural windows and doorways—fitting for a cabin brand. The rounded tops (50% radius) with squared bottoms create a distinctive silhouette that differentiates from generic rounded cards.

## Accent delivery: deep display color + pill buttons
The forest green (#2d4a3f) anchors the brand across headlines, buttons, and nav CTA. Color arrives purposefully—not decoratively—creating cohesion while maintaining the warm, natural palette.

## Rail treatment: drag rail with snap
Horizontal card rail with drag-to-scroll provides an app-like browsing experience for locations. It feels modern and engaging while maintaining editorial restraint (no flashy animations or auto-rotation).

## Chapter break: full-bleed image with serif overlay
Instead of a solid color panel, the banner section uses cabin-lake.jpg as a full-bleed background with cream serif overlay and subtle vignette. This creates a more immersive, photographic chapter break that showcases the product in context.

## Texture layer: subtle vignette on plates
A radial vignette overlay on media plates (inset shadow + gradient) adds depth and focuses attention inward—like viewing through a window. This subtle texture elevates the photography without feeling noisy or dated.

---

## Font Choices
- **Display:** Cormorant (Google Fonts) — elegant condensed serif with graceful proportions
- **Body:** Sora (Google Fonts) — clean, modern sans-serif with warm geometric feel

## Palette Summary
- `--bg`: #f7f4ed (warm cream paper canvas)
- `--ink`: #1a231e (deep forest green-black)
- `--muted`: #7a756d (warm taupe-gray secondary)
- `--accent`: #2d4a3f (rich forest green display)
- `--panel`: #1e3328 (deep moss evergreen panel)
- `--panel-ink`: #f4f1e5 (cream text on panel)
- `--card`: #faf7f0 (warm card surface)

## Motion Philosophy
Calm, confident reveals. No bounces or springs—everything settles with power3/power4 eases. Split-line headline reveals, 20-30px rises with fade, gentle parallax on hero media. Arch-topped plates with subtle vignette depth.

## Special Effects Applied (after base site verification)
- **Film grain overlay (effect 3)**: Animated SVG noise layer at 5% opacity adds premium texture across the warm canvas
- **Clip-path image reveals (effect 4)**: Feature media plates use `inset(...) round 50% 50% 20px 20px` for arch-topped iris reveals on scroll, removed from generic fade to avoid stacked animations
- **3D tilt cards (effect 5)**: Location rail cards respond to cursor with subtle perspective tilt (~10deg max), editorial restraint maintained
- **Number count-up stats (effect 9)**: Stat numbers animate from 0 when scrolled into view, preserving suffixes (+, %)
