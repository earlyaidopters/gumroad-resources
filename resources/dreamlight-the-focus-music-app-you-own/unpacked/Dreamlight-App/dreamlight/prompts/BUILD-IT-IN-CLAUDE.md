# Build your own Dreamlight inside Claude

Paste everything in the box below into a new chat in Claude (claude.ai or Claude Desktop). Claude builds a single self-contained player as an artifact. Open the artifact's menu and choose **Install as app** to get it in its own window on your desktop.

This version makes its music live in the browser and draws its art in code, so it needs no files at all. It is a lighter cousin of the full app in this repo, which plays the 25 Python-rendered tracks and the Higgsfield motion art. To put the full app inside Claude instead, see [`claude-artifact/`](../claude-artifact/README.md).

A Claude app opens only while you're online and signed in to Claude. To own a copy that plays offline, use [`OWN-YOUR-CLAUDE-APP.md`](OWN-YOUR-CLAUDE-APP.md) or the main [setup prompt](../README.md#set-it-up-with-one-prompt).

```text
Build "Dreamlight · Focus Music Studio" as ONE self-contained HTML artifact: inline CSS and JS, no libraries, no network requests, no images, no audio files. All music is synthesized live with the Web Audio API and all artwork is drawn on <canvas>. It must look like a premium, shipping app in the spirit of Brain.fm (original design, no Brain.fm names or assets). It will be installed as a desktop app, so it must feel native and polished in a ~1320×860 window and also work at phone width (390px).

═══ DESIGN SYSTEM ═══
Colors: base #0a0e17, surface #101724, raised #182232, hairline rgba(255,255,255,.14), text #f4f6fc, secondary text #aab7ca, focus ring 2px #b5e9ff with 3px offset.
Type: display serif for big headings ("Iowan Old Style", Palatino, Georgia, serif), body = ui-sans-serif, -apple-system, "SF Pro Display", Inter, system-ui; numbers in ui-monospace with tabular-nums. Sentence case everywhere ("Deep work", not "DEEP WORK"). Only the small mode eyebrow (11px, letter-spacing .14em) is uppercase.
Motion: easing cubic-bezier(.22,1,.36,1). Respect prefers-reduced-motion (swap animations for instant/90ms fades, freeze canvases on a still frame).
Each mode has its own palette that crossfades through the whole UI (accent, glows, focus ring tint, active pills) over 420ms:
  Focus  #38E8C6 / #38BDF8  "Lock in"
  Relax  #F472B6 / #A78BFA  "Exhale"
  Sleep  #9DB4FF / #CBD5E1  "Drift off"
  Meditate #FBBF24 / #FB923C "Be here"

═══ LAYOUT ═══
Top bar (56px): left = glowing orb logo + "Dreamlight"; center = pill switcher Start · Now playing · Library; right = small "🎧 Stereo headphones for binaural" hint + (i) About button. The bar is transparent over the scene with a soft top-edge gradient so it stays readable on bright art.
Bottom mini player (76px desktop / 68px phone) appears only after a session has started, and hides while the Now playing view is open: art, activity + track name, prev / big play / next, session chip, time left.

═══ STEP 1 · START: "What are you doing?" ═══
Big serif H1 "What are you doing?" (clamp 34–52px, subtle white→#C6D3EA gradient text) and subline "Pick a moment. Music starts instantly."
Four mode panels in a horizontal accordion (height clamp(320px,44vh,420px), 12px gap, 20px radius). Each panel is a live animated canvas scene for that mode (see SCENES) with the mode name in large serif and its feel line. Hover/focus a panel → it grows (flex 1.58 vs siblings 0.8, 380ms) and its scene animates while the others hold a still frame. On phones: a 2×2 grid of 173×146 cards.
If the user has played before, show a "▶ Resume Deep work" pill above the heading (hidden while something is already playing).

═══ STEP 2 · ACTIVITIES ═══
Choosing a mode crossfades the full-viewport background to that mode's scene (280ms) under a left-to-right scrim, collapses the four panels into a 48px pill switcher (Focus · Relax · Sleep · Meditate) so switching modes never needs Back, and reveals the activity cards (opacity + 8px rise, 220ms, 35ms stagger). Desktop grid: repeat(3, minmax(0,240px)), 16px gap; phone: 2 columns of square cards.
Each activity card is square (18px radius) with its own animated canvas artwork (see ACTIVITY ART), a bottom dark gradient dock, the name (18px, weight 650), a one-line sound description in secondary text, a frosted duration badge top-right ("50m", "25m", "∞"), and on hover: lift 4px, art scale 1.055, play glyph fades in.
Activities (mode · name · default session · sound description · track queue):
Focus · Deep work · 50 min · "16 Hz Beta · Steady pulse" · Dreamlight Focus, Helix Signature, Obsidian Pulse, Quartz Engine, Neon Synapse, Cobalt Lattice
Focus · Morning coffee · 25 min · "13 Hz SMR · Warm Rhodes" · Golden Atelier, Amber Horizon, Emerald Canopy
Focus · Creative flow · 45 min · "36 Hz Gamma · Glass synth" · Prism Spark, Velvet Drift, Moss Courtyard
Focus · Study · 25/5 intervals · "14 Hz Beta · Lo-fi Rhodes" · Rainlit Loft, Cedar Study
Focus · Light work · 25 min · "11 Hz Alpha · Kalimba" · Moss Courtyard, Emerald Canopy, Amber Horizon
Focus · Get moving · 15 min · "20 Hz Beta · Driving synths" · Aurora Ascent, Solar Flare, Kinetic Forge
Relax · Unwind · 20 min · "8 Hz Alpha · Harp and embers" · Hearth Ember, Dusk Lagoon
Relax · Recharge · 15 min · "9 Hz Alpha · Downtempo pads" · Velvet Drift, Dusk Lagoon
Relax · Chill · Continuous · "14 Hz Beta · Window rain" · Rainlit Loft, Hearth Ember
Sleep · Wind down · 30 min · "2.5 Hz Delta · Night tones" · Lunar Cradle, Midnight Tide
Sleep · Power nap · 20 min + gentle wake · "4.5 Hz Theta · Gentle wake" · Cloud Drift
Sleep · Deep sleep · Continuous · "3 Hz Delta · Bowed drones" · Abyssal Drift, Deep Trench
Meditate · Meditate · 10 min · "5.5 Hz Theta · Singing bowls" · Saffron Sanctuary, Midnight Tide
Meditate · Breathwork · 10 min, breath pacer on · "6 Hz Theta · Ocean and chimes" · Midnight Tide
(Meditate has 2 cards: fill the third slot with a small "Quick session · 5 min reset" card.)

═══ STEP 3 · PLAY + NOW PLAYING ═══
One tap on an activity starts audio INSIDE the click handler (no extra click), sets the session timer to its default, and opens Now playing with a shared-element zoom: the tapped card's art flies into the Now playing portal (340ms) while sibling cards fade out.
Now playing (desktop grid 360px | 1fr): left column = mode eyebrow, activity title (40px), current track name, big session clock ("50:00 remaining", tabular), prev / play (big round) / next, session chip, seek bar (44px hit area), [Ambience] [Breath] buttons, Intensity segmented control (Gentle · Balanced · Deep), and a collapsible "Details" (beat Hz, left/right carrier Hz, BPM, key).
Right side = the mode scene full-bleed behind everything, with the activity art in a centered square glass "portal" (min(54vh,460px), 28px radius, 1px hairline, deep shadow, accent glow) whose outer bloom gently pulses with the music's loudness (RMS from an AnalyserNode). Toggle top-right: Scene · Signal. Signal swaps the portal for a big live audio visualizer with styles Signature · Silk · Halo · Horizon (layered glowing sine ribbons / breathing concentric rings / mirrored soft spectrum / horizon line), tinted with the mode palette and driven by the AnalyserNode plus the track's beat frequency.
Cinema Zen (button or Z): fullscreen, chrome fades after 4s idle, radial vignette, visible "Exit Zen" pill for touch.
Phone: art portal 232px (164px when height < 700px), with title, clock, play and timer above the fold.
Library tab: searchable list of all tracks (title, band pill, BPM · key, mood) and a few multi-hour "Blueprint" sequences; tapping plays it and the Now playing title becomes the track name.

═══ SOUND ENGINE (Web Audio, generative, never loops audibly) ═══
Define 25 tracks in one JS catalog: title, beat Hz, carrier pair (left/right differ by the beat Hz), BPM, key + chord tones, mood, palette, instrument style. Use these (title · beat Hz · BPM · key · style):
Dreamlight Focus 16 · 120 · C minor 9 · detuned analog pads + soft pulse
Helix Signature 14.5 · 108.75 · E♭ Lydian · plucked motif + pads
Obsidian Pulse 15 · 112.5 · F♯ minor 9 · dark pulse + sub
Quartz Engine 17 · 127.5 · C♯ minor 9 · minimal off-beat bass + kalimba synth
Neon Synapse 40 · 120 · D minor 9 · bright glassy arps
Cobalt Lattice 42 · 126 · E♭ minor 9 · FM bell lattice
Golden Atelier 13 · 97.5 · D major 9 · warm vinyl Rhodes
Amber Horizon 12 · 120 · E major 9 · calm sustained pads
Emerald Canopy 10 · 100 · C Lydian · handpan + breeze
Prism Spark 36 · 108 · A Lydian · celesta + choir pads
Velvet Drift 9 · 90 · A minor 9 · soft downtempo pads
Moss Courtyard 11 · 110 · A major 9 · kalimba + garden air
Rainlit Loft 14 · 84 · F major 9 · lo-fi Rhodes + rain
Cedar Study 13.5 · 101.25 · B minor 9 · felt piano + soft bass
Aurora Ascent 20 · 120 · G major 9 · bright rising pads + plucks
Solar Flare 18 · 135 · B♭ Lydian · driving synths
Kinetic Forge 24 · 120 · E minor 9 · rolling analog bass + 4/4 pulse
Hearth Ember 8 · 80 · C major 9 · nylon harp + ember crackle
Dusk Lagoon 7.5 · 75 · A♭ major 9 · vibraphone + surf swells
Lunar Cradle 2.5 · 60 · B major 9 · beatless string-organ + celesta
Midnight Tide 6 · 72 · G minor 11 · slow pads + ocean
Cloud Drift 4.5 · 67.5 · F Lydian · beatless cloud pads + harp drops
Abyssal Drift 3 · 60 · D♭ major 9 · bowed drones
Deep Trench 1.5 · 60 · A minor 11 · sub-octave organ, cavern reverb
Saffron Sanctuary 5.5 · 66 · C♯ minor 11 · singing bowls + drone
Graph per playing track: (1) true binaural layer, two sine oscillators hard-panned L/R at the carrier pair, quiet (~-24 dB under music), tiny slow drift; (2) generative music bed from the chord tones in the track's style, detuned pad voices through a moving lowpass, soft sub on the root following a slow progression, sparse pluck/bell/piano motif at the BPM, noise-based rain/surf/crackle/breeze where the style says so; (3) amplitude modulation on the music bus at the beat Hz (depth 30%); (4) generated convolution reverb + master compressor; (5) AnalyserNode for visuals. 4s crossfade between tracks in a queue, 280ms equal-power fade on explicit switches, the last tap always wins, Pause stops both decks and cancels ramps, never any clicks.
Intensity: Gentle = high-shelf −4 dB at 4.5 kHz and no extra shimmer; Balanced = flat; Deep = +2 dB at 180 Hz, +1.5 dB at 2.4 kHz, ±4% rhythmic shimmer. 180ms ramps. Label it honestly: "Shapes tone and rhythmic presence."
Ambience mixer: rain, ocean, vinyl crackle sliders (all synthesized noise). Remember volume, mixer, intensity and last activity in localStorage.

═══ SESSIONS ═══
Session chip offers Continuous, Countdown (10/15/20/25/30/45/50/60/90 + custom) and Intervals (25/5 or 50/10, four rounds). Deadline-based timing. At the end: fade music AND ambience together over 6s, stop, toast "Session complete" once. Intervals: soft two-note chime (A4+E5) at each phase change, music dips to 25% during breaks with a "Break · 5:00" badge and "Skip break". Power nap: fade out, then a warm ascending 3-note wake chime (C5→E5→G5) repeating once after 6s, with a big "I'm awake" button. Deep sleep: visible "Stop session" and "Dim screen" (35% overlay, wakes on click/tap/key, not on mouse drift). Breathwork: breath pacer on (circle expands 4s inhale, holds 4s, exhales 6s, shows phase + seconds).

═══ SCENES & ACTIVITY ART (all procedural canvas, slow, beautiful, 60fps, pause when off-screen) ═══
Mode scenes (subject on the right, dark negative space on the left for text):
Focus: a calm neural network of fine glowing cyan/emerald threads with nodes that brighten as pulses travel along them.
Relax: aurora curtains of magenta, violet and teal rippling over a dark lake that mirrors them.
Sleep: deep indigo night sky with soft twinkling stars, a full moon top-right, silver mist drifting over dark rolling hills.
Meditate: warm golden light rays through drifting mist over still water, a faint mandala glow on the horizon.
Activity art (square, one clear subject, one thing moving): Deep work = rotating glowing crystalline lattice over a dark desk; Morning coffee = steam ribbon curling from a cup against a sunrise; Creative flow = silk ribbons of violet/gold light flowing; Study = dust motes drifting in a warm lamp beam over an open book; Light work = paper planes gliding through airy teal light; Get moving = sunrise rays pulsing over mountain ridges; Unwind = slow ripples on a pink dusk lagoon; Recharge = sunbeams through mist around a fern; Chill = rain streaks on a window with neon bokeh; Wind down = a candle flame and curtains in moonlight; Power nap = pastel clouds drifting; Deep sleep = moonlight path shimmering on a dark ocean; Meditate = a slowly rotating golden mandala reflected in still water; Breathwork = a single ring of light expanding across still water on the breath rhythm.

═══ QUALITY BAR ═══
Keyboard: Space play/pause (only when not focused on a control or text field), N next, P previous, ←/→ seek 15s, Z zen, B breath, 1–4 visualizer styles, ? shortcuts. Native <button>s, aria labels on icon buttons, Escape closes dialogs and returns focus. Media Session API so OS media keys work. No console errors, no placeholder text, no lorem ipsum, every control works. Make it beautiful first.
```
