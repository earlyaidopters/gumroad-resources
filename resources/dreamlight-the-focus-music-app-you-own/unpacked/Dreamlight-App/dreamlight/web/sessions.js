const MODES = [
  { key: "focus", name: "Focus", feel: "Lock in", hue: "#38E8C6", secondary: "#38BDF8", tint: "rgba(56, 232, 198, .16)", focal: "82% 52%" },
  { key: "relax", name: "Relax", feel: "Exhale", hue: "#F472B6", secondary: "#A78BFA", tint: "rgba(244, 114, 182, .16)", focal: "74% 38%" },
  { key: "sleep", name: "Sleep", feel: "Drift off", hue: "#9DB4FF", secondary: "#CBD5E1", tint: "rgba(157, 180, 255, .14)", focal: "88% 28%" },
  { key: "meditate", name: "Meditate", feel: "Be here", hue: "#FBBF24", secondary: "#FB923C", tint: "rgba(251, 191, 36, .16)", focal: "78% 58%" },
];

const ACTIVITIES = [
  { mode: "focus", key: "deep_work", name: "Deep work", minutes: 50,
    feel: "16 Hz Beta · Steady pulse", queue: ["dreamlight", "helix_signature", "obsidian_pulse", "quartz_engine", "neon_synapse", "cobalt_lattice"] },
  { mode: "focus", key: "morning_coffee", name: "Morning coffee", minutes: 25,
    feel: "13 Hz SMR · Warm Rhodes", queue: ["golden_atelier", "amber_horizon", "emerald_canopy"] },
  { mode: "focus", key: "creative_flow", name: "Creative flow", minutes: 45,
    feel: "36 Hz Gamma · Glass synth", queue: ["prism_spark", "velvet_drift", "moss_courtyard"] },
  { mode: "focus", key: "study", name: "Study", minutes: 25, intervals: true,
    feel: "14 Hz Beta · Lo-fi Rhodes", queue: ["rainlit_loft", "cedar_study"] },
  { mode: "focus", key: "light_work", name: "Light work", minutes: 25,
    feel: "11 Hz Alpha · Kalimba", queue: ["moss_courtyard", "emerald_canopy", "amber_horizon"] },
  { mode: "focus", key: "motivation", name: "Get moving", minutes: 15,
    feel: "20 Hz Beta · Driving synths", queue: ["aurora_ascent", "solar_flare", "kinetic_forge"] },
  { mode: "relax", key: "unwind", name: "Unwind", minutes: 20,
    feel: "8 Hz Alpha · Harp and embers", queue: ["hearth_ember", "dusk_lagoon"] },
  { mode: "relax", key: "recharge", name: "Recharge", minutes: 15,
    feel: "9 Hz Alpha · Downtempo pads", queue: ["velvet_drift", "dusk_lagoon"] },
  { mode: "relax", key: "chill", name: "Chill", minutes: 0,
    feel: "14 Hz Beta · Window rain", queue: ["rainlit_loft", "hearth_ember"] },
  { mode: "sleep", key: "wind_down", name: "Wind down", minutes: 30,
    feel: "2.5 Hz Delta · Night tones", queue: ["lunar_cradle", "midnight_tide"] },
  { mode: "sleep", key: "power_nap", name: "Power nap", minutes: 20, gentleEnd: true,
    feel: "4.5 Hz Theta · Gentle wake", queue: ["cloud_drift"] },
  { mode: "sleep", key: "deep_sleep", name: "Deep sleep", minutes: 0,
    feel: "3 Hz Delta · Bowed drones", queue: ["abyssal_drift", "deep_trench"] },
  { mode: "meditate", key: "meditate", name: "Meditate", minutes: 10,
    feel: "5.5 Hz Theta · Singing bowls", queue: ["saffron_sanctuary", "midnight_tide"] },
  { mode: "meditate", key: "breathwork", name: "Breathwork", minutes: 10, breath: true,
    feel: "6 Hz Theta · Ocean and chimes", queue: ["midnight_tide"] },
];

const TIMER_PRESETS = Object.freeze([10, 15, 20, 25, 30, 45, 50, 60, 90]);
const ACTIVITY_BY_KEY = new Map(ACTIVITIES.map((activity) => [activity.key, activity]));
const MODE_BY_KEY = new Map(MODES.map((mode) => [mode.key, mode]));

const BLUEPRINTS = [
  { key: "all",      name: "All Sessions",     meta: "25h · Full Library",  cover: "covers/dreamlight.png",        slugs: null },
  { key: "deepwork", name: "Deep Work Sprint", meta: "6h · Gamma & Beta",   cover: "covers/cobalt_lattice.png",
    slugs: ["dreamlight", "cobalt_lattice", "neon_synapse", "quartz_engine", "obsidian_pulse", "helix_signature"] },
  { key: "energize", name: "Morning Ignition", meta: "3h · High-Beta",      cover: "covers/aurora_ascent.png",
    slugs: ["aurora_ascent", "solar_flare", "kinetic_forge"] },
  { key: "study",    name: "Study & Reading",  meta: "4h · Lo-Fi & SMR",    cover: "covers/cedar_study.png",
    slugs: ["rainlit_loft", "cedar_study", "golden_atelier", "amber_horizon"] },
  { key: "creative", name: "Creative Flow",    meta: "4h · Gamma & Alpha",  cover: "covers/prism_spark.png",
    slugs: ["prism_spark", "moss_courtyard", "emerald_canopy", "velvet_drift"] },
  { key: "unwind",   name: "Evening Reset",    meta: "4h · Alpha & Theta",  cover: "covers/hearth_ember.png",
    slugs: ["hearth_ember", "dusk_lagoon", "midnight_tide", "saffron_sanctuary"] },
  { key: "sleep",    name: "Nap & Deep Sleep", meta: "4h · Theta & Delta",  cover: "covers/lunar_cradle.png",
    slugs: ["cloud_drift", "abyssal_drift", "lunar_cradle", "deep_trench"] },
  { key: "ramp",     name: "Full Descent",     meta: "25h · 42 → 1.5 Hz",   cover: "covers/velvet_drift.png",
    slugs: ["cobalt_lattice", "neon_synapse", "prism_spark", "kinetic_forge", "aurora_ascent", "solar_flare", "quartz_engine", "dreamlight", "obsidian_pulse", "helix_signature", "rainlit_loft", "cedar_study", "golden_atelier", "amber_horizon", "moss_courtyard", "emerald_canopy", "velvet_drift", "hearth_ember", "dusk_lagoon", "midnight_tide", "saffron_sanctuary", "cloud_drift", "abyssal_drift", "lunar_cradle", "deep_trench"] },
];
