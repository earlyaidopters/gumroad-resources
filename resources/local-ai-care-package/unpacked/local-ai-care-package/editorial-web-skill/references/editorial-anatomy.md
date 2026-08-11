# Anatomy of the premium editorial site

Distilled from shipped sites of this class (a soft-light product/SaaS archetype and a warm outdoor-brand archetype — never name reference sites in output). What separates these from a generic landing page is EDITORIAL RESTRAINT: one expressive serif, one soft canvas color, generous whitespace, and media presented like plates in a printed book.

## The two proven moods

**Soft-light product (SaaS, tools, apps)**
- Canvas: warm porcelain/off-white with a barely-there texture or sparse particle sprinkle. Never pure #fff.
- Display type: romantic high-contrast serif, large but not shouting (5-6vw), often sentence case. Body: quiet neutral sans.
- Media: floating UI cards and stickers, slightly rotated (2-6deg), soft deep shadows (`0 30px 80px rgba(0,0,0,.15)`), large corner radii. The product screenshots ARE the art.
- Color: accents arrive through small colorful icon chips and buttons, never through large painted areas.
- Feel: weightless, friendly, precise.

**Warm editorial brand (outdoors, hospitality, physical products)**
- Canvas: bone/cream paper (#f5f2e8 family). Display serif in a deep saturated brand color (forest green, oxblood, ink blue). Body text in a warm brown/gray.
- Media: photography in rounded-corner plates (16-24px radius), often 3:4 portrait cards in horizontal rails.
- One full-bleed panel section in the deep brand color with cream serif type — the "chapter break."
- Buttons: pill-shaped, sometimes paired with a circled arrow icon.
- Feel: grounded, tactile, expensive-catalog.

## Layout grammar (shared)

1. **Nav**: fixed, transparent at top, gains blur + hairline on scroll. Brand wordmark left, quiet links right, one pill CTA.
2. **Hero**: a single big serif statement, centered or left-set, sub-line under 50ch, one CTA. No hero carousel, no gradient text, no three-column feature grid. SCALE: the display type must feel almost too big — 9-11vw, line-height 0.95-1.0, negative tracking. A hero that could be mistaken for a section heading is a FAIL; the headline IS the hero.
3. **Hero media**: ONE large rounded frame (video loop or key image) directly under the hero, gently parallaxing.
4. **Manifesto**: a serif pull-quote paragraph at 1.5-2.3rem — the brand speaking in full sentences. This section is what makes it feel editorial; do not skip it.
5. **Feature rows**: media plate + text column, alternating sides, ONE label + ONE title + ONE short paragraph each. Never bullet lists.
6. **Card rail**: horizontally scrollable cards (drag + snap), titles in the serif. Works for products, locations, use cases.
7. **Chapter-break panel**: full-bleed deep color, big cream serif line.
8. **Stats or quotes strip**: 3 items, hairline separators.
9. **Closing CTA**: repeat the serif voice, one big pill button.
10. **Footer**: minimal, big wordmark, one line.

## Motion grammar (calm, never springy)

- Smooth scroll (lerp ~0.1). Reveals: 20-30px rise + fade, power3/power4 ease, 0.8-1.1s, small staggers (0.1s).
- Display headlines reveal by LINE from an overflow-hidden mask (yPercent 110 -> 0, power4.out) — the single highest-value move in this genre.
- Media plates parallax +-40px over their scroll journey; images inside cards scale 1.0 -> 1.04 on hover.
- Cards lift 6px with a deepening shadow on hover. Nothing bounces; everything settles.

## Instant-fail tells (the difference between fire and template-slop)

- Pure white background, default blue links, or a gradient hero = FAIL.
- More than two typefaces, or a serif used for body copy at small sizes = FAIL.
- Three-column icon feature grids, testimonial carousels with avatars = generic SaaS slop.
- Square-cornered raw `<img>` tags with no plate treatment = unfinished.
- Every section centered = monotone; alternate alignment for rhythm.
- Empty space is the luxury signal: if a section feels sparse, it is probably right.
