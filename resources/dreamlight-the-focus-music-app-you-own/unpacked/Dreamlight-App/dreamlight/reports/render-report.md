# Dreamlight Render & Acoustic Verification Report

## Loudness Baseline (Existing 11 Tracks)
- Count verified: **11**
- Integrated LUFS range: **-16.30 to -13.60 LUFS**
- Mean / Median: **-15.42 LUFS** / **-15.90 LUFS**
- Target for 14 new tracks: **-15.5 LUFS (±1.0 LU)**, True Peak **< -1.0 dBTP**, Duration **3600 ± 1 s**, 44.1 kHz discrete stereo, zero silence gaps > 2 s, FFT L/R binaural carrier diff matching stated beat.

## 14 New Tracks: Verification Measurements

| Slug | Title | Duration (s) | Format | Integrated LUFS | True Peak (dBTP) | Stated L / R (Δ Hz) | FFT Measured L / R (Δ Hz) | Silence Gaps >2s | Status |
|---|---|---:|---|---:|---:|---|---|---:|---|
| `cobalt_lattice` | Cobalt Lattice | 3600.00 | 44100 Hz 2ch | -15.70 | -4.90 | 212.0 / 254.0 (Δ42.0) | 212.0 / 254.0 (Δ42.0) | 0 | **PASS** |
| `prism_spark` | Prism Spark | 3600.00 | 44100 Hz 2ch | -15.50 | -4.10 | 202.0 / 238.0 (Δ36.0) | 202.0 / 238.0 (Δ36.0) | 0 | **PASS** |
| `kinetic_forge` | Kinetic Forge | 3600.00 | 44100 Hz 2ch | -15.60 | -3.90 | 208.0 / 232.0 (Δ24.0) | 208.0 / 232.0 (Δ24.0) | 0 | **PASS** |
| `aurora_ascent` | Aurora Ascent | 3600.00 | 44100 Hz 2ch | -15.70 | -4.70 | 186.0 / 206.0 (Δ20.0) | 186.0 / 206.0 (Δ20.0) | 0 | **PASS** |
| `quartz_engine` | Quartz Engine | 3600.00 | 44100 Hz 2ch | -15.90 | -4.00 | 166.11 / 183.11 (Δ17.0) | 166.11 / 183.11 (Δ17.0) | 0 | **PASS** |
| `cedar_study` | Cedar Study | 3600.00 | 44100 Hz 2ch | -16.00 | -4.30 | 158.05 / 171.55 (Δ13.5) | 158.05 / 171.55 (Δ13.5) | 0 | **PASS** |
| `golden_atelier` | Golden Atelier | 3600.00 | 44100 Hz 2ch | -16.30 | -4.40 | 140.33 / 153.33 (Δ13.0) | 140.33 / 153.33 (Δ13.0) | 0 | **PASS** |
| `moss_courtyard` | Moss Courtyard | 3600.00 | 44100 Hz 2ch | -15.60 | -4.20 | 179.5 / 190.5 (Δ11.0) | 179.5 / 190.5 (Δ11.0) | 0 | **PASS** |
| `hearth_ember` | Hearth Ember | 3600.00 | 44100 Hz 2ch | -15.70 | -4.40 | 160.8 / 168.8 (Δ8.0) | 160.8 / 168.8 (Δ8.0) | 0 | **PASS** |
| `dusk_lagoon` | Dusk Lagoon | 3600.00 | 44100 Hz 2ch | -15.40 | -4.30 | 151.8 / 159.3 (Δ7.5) | 151.8 / 159.3 (Δ7.5) | 0 | **PASS** |
| `saffron_sanctuary` | Saffron Sanctuary | 3600.00 | 44100 Hz 2ch | -15.30 | -3.70 | 133.33 / 138.83 (Δ5.5) | 133.33 / 138.79 (Δ5.46) | 0 | **PASS** |
| `cloud_drift` | Cloud Drift | 3600.00 | 44100 Hz 2ch | -15.70 | -3.80 | 128.56 / 133.06 (Δ4.5) | 128.56 / 133.06 (Δ4.5) | 0 | **PASS** |
| `lunar_cradle` | Lunar Cradle | 3600.00 | 44100 Hz 2ch | -15.60 | -3.90 | 122.22 / 124.72 (Δ2.5) | 122.22 / 124.72 (Δ2.5) | 0 | **PASS** |
| `deep_trench` | Deep Trench | 3600.00 | 44100 Hz 2ch | -16.10 | -5.40 | 109.25 / 110.75 (Δ1.5) | 109.25 / 110.75 (Δ1.5) | 0 | **PASS** |

## Existing 11 Tracks: Reference Measurements

| Slug | Title | Duration (s) | Format | Integrated LUFS | True Peak (dBTP) | Stated L / R (Δ Hz) | FFT Measured L / R (Δ Hz) | Silence Gaps >2s | Status |
|---|---|---:|---|---:|---:|---|---|---:|---|
| `helix_signature` | Helix Signature | 3600.00 | 44100 Hz 2ch | -13.60 | -2.90 | 188.75 / 203.25 (Δ14.5) | 188.75 / 203.25 (Δ14.5) | 0 | **PASS** |
| `dreamlight` | Dreamlight Focus | 3600.00 | 44100 Hz 2ch | -15.90 | -4.40 | AM-only (16 Hz) | AM-only | 0 | **PASS** |
| `neon_synapse` | Neon Synapse | 3600.00 | 44100 Hz 2ch | -16.30 | -4.70 | 220.0 / 260.0 (Δ40.0) | 219.99 / 260.0 (Δ40.01) | 0 | **PASS** |
| `solar_flare` | Solar Flare | 3600.00 | 44100 Hz 2ch | -16.10 | -3.80 | 224.08 / 242.08 (Δ18.0) | 224.08 / 242.08 (Δ18.0) | 0 | **PASS** |
| `obsidian_pulse` | Obsidian Pulse | 3600.00 | 44100 Hz 2ch | -16.00 | -5.00 | 177.5 / 192.5 (Δ15.0) | 177.5 / 192.5 (Δ15.0) | 0 | **PASS** |
| `rainlit_loft` | Rainlit Loft | 3600.00 | 44100 Hz 2ch | -15.90 | -4.10 | 167.61 / 181.61 (Δ14.0) | 167.61 / 181.61 (Δ14.0) | 0 | **PASS** |
| `amber_horizon` | Amber Horizon | 3600.00 | 44100 Hz 2ch | -15.50 | -3.80 | 158.8 / 170.8 (Δ12.0) | 158.8 / 170.8 (Δ12.0) | 0 | **PASS** |
| `emerald_canopy` | Emerald Canopy | 3600.00 | 44100 Hz 2ch | -15.80 | -3.60 | 191.0 / 201.0 (Δ10.0) | 191.0 / 201.0 (Δ10.0) | 0 | **PASS** |
| `velvet_drift` | Velvet Drift | 3600.00 | 44100 Hz 2ch | -14.10 | -2.90 | 215.5 / 224.5 (Δ9.0) | 215.5 / 224.5 (Δ9.0) | 0 | **PASS** |
| `midnight_tide` | Midnight Tide | 3600.00 | 44100 Hz 2ch | -14.10 | -2.60 | 143.83 / 149.83 (Δ6.0) | 143.83 / 149.83 (Δ6.0) | 0 | **PASS** |
| `abyssal_drift` | Abyssal Drift | 3600.00 | 44100 Hz 2ch | -16.30 | -4.40 | 137.09 / 140.09 (Δ3.0) | 137.09 / 140.09 (Δ3.0) | 0 | **PASS** |

## Summary
- New tracks verified: **14 / 14**, all checks passed: **YES**
- Existing tracks verified: **11 / 11**
