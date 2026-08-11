# COVE — Design Variation Axis Picks

## Mood: soft-light product
Chosen for COVE's calm, precise brand voice. The warm porcelain canvas (#faf9f7) and soft taupe-brown accents create a serene, professional feel that matches the "client work without chaos" positioning.

## Display serif voice: romantic high-contrast (Fraunces)
Fraunces brings elegant, humanist warmth with its soft curves and high contrast. It feels editorial and refined without being stuffy—perfect for a workspace that values clarity and calm.

## Hero alignment: centered statement
The centered "Client work, without the chaos" headline creates a meditative focal point. It lets the type breathe and establishes immediate visual hierarchy without competing with media.

## Plate shape: rounded 20px
Consistent rounded corners (20px) across hero media, features, and cards create a cohesive, friendly aesthetic. The radius is substantial enough to feel soft but not so large as to become arch-like.

## Accent delivery: deep display color + pill buttons
The warm taupe-brown accent (#5c4a3d) appears in the hero type, buttons, and nav CTA. This creates visual cohesion while keeping the overall palette neutral and calm—color arrives purposefully, not decoratively.

## Rail treatment: drag rail with snap
The horizontal card rail with drag-to-scroll interaction provides an engaging way to browse workflows. It feels modern and app-like while maintaining editorial restraint (no flashy animations).

## Chapter break: deep color panel
The full-bleed dark panel (#2d2620) with cream serif type creates a visual "chapter break" at the banner section. This deep anchor point grounds the page and provides contrast to the light canvas above.

## Texture layer: none (pure flat)
COVE's aesthetic is clean and precise—no paper grain or particle overlays. The luxury comes from whitespace, type, and careful spacing rather than surface texture.

---

## Font Choices
- **Display:** Fraunces (Google Fonts) — romantic high-contrast serif with soft curves
- **Body:** Inter (Google Fonts) — quiet, neutral sans-serif for readability

## Palette Summary
- `--bg`: #faf9f7 (warm porcelain)
- `--ink`: #1a1816 (near-black)
- `--muted`: #7a746d (secondary text)
- `--accent`: #5c4a3d (warm taupe-brown)
- `--panel`: #2d2620 (deep anchor for banner)

## Motion Philosophy
Calm, confident reveals. No bounces or springs—everything settles with power3/power4 eases. Split-line headline reveals, 20-30px rises with fade, gentle parallax on hero media.

## Special Effects Applied (4 total)
1. **Magnetic buttons** — Buttons lean toward cursor within a radius, spring back on leave; adds tactile polish to CTAs.
2. **Custom cursor dot** — Small accent dot lerps behind native cursor, scales over links/cards; subtle interactive feedback.
3. **Anime.js character cascade** — Hero headline letters rise and settle individually with spring physics; replaces split-line reveal for signature anime.js entrance.
4. **Scroll progress hairline** — 2px accent line grows along viewport top; elegant visual indicator of page position.
