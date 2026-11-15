// ============================================================
// GAME CONSTANTS
// All numerical values sourced from real NASA data.
// Sources documented in src/data/nasa_fallback.json
// ============================================================

const CONSTANTS = {

  // --- Mission settings ---
  TOTAL_SOLS: 10,
  STARTING_POWER: 100,       // percent
  STARTING_RADIATION: 0,     // mSv accumulated
  STARTING_CREW: 100,        // percent readiness
  RADIATION_LIMIT_mSv: 50,   // simplified mission limit (NASA career: 600 mSv, scaled for 10-sol game)

  // --- Mars baseline radiation (Curiosity RAD, Hassler et al. 2014) ---
  MARS_BASELINE_mSv_PER_SOL: 0.64,
  MOON_BASELINE_mSv_PER_SOL: 0.38,

  // --- Power costs per sol ---
  HEATER_POWER_COST: 20,          // % power for overnight heating (Mars night: -80 C)
  SHIELD_POWER_COST: 30,          // % power to run active magnetic shielding
  COMMS_POWER_COST: 10,           // % power for daily Earth communication window
  SCIENCE_POWER_COST: 15,         // % power for running science instruments
  GREENHOUSE_POWER_COST: 10,      // % power for grow lights in hydroponic bay

  // --- Solar panel recharge per sol ---
  SOLAR_RECHARGE: 60,             // % power recovered per sol from solar panels
  BATTERY_MAX: 100,

  // --- Crew readiness effects ---
  SHELTER_LOCKDOWN_CREW_COST: 12,  // % readiness lost per sol in shelter (OSD-1018 isolation data)
  EVA_CREW_COST: 8,                // % readiness lost per EVA sol
  NOMINAL_CREW_RECOVERY: 3,        // % readiness recovered on a calm sol

  // --- Flare severity radiation multipliers ---
  SEVERITY_MULTIPLIERS: {
    none:     { radiation_mult: 1.0,  label: "Quiet Sun",    color: "#4a9eff" },
    low:      { radiation_mult: 1.3,  label: "C-Class Flare", color: "#a8d8a8" },
    moderate: { radiation_mult: 2.2,  label: "M-Class Flare", color: "#ffd166" },
    high:     { radiation_mult: 4.8,  label: "X-Class Flare", color: "#ef8c4a" },
    critical: { radiation_mult: 8.5,  label: "X-Class Storm", color: "#e84040" }
  },

  // --- Decision option effects ---
  // These define what each choice costs/gains across the three resources
  DECISION_EFFECTS: {
    // Flare response options
    activate_shielding: {
      label: "Activate Magnetic Shielding",
      power_delta: -30,
      radiation_block: 0.80,   // blocks 80% of flare radiation
      crew_delta: 0,
      description: "Redirect battery reserves to run active shielding. Heaters will run low tonight."
    },
    storm_shelter: {
      label: "Send Crew to Storm Shelter",
      power_delta: 0,
      radiation_block: 0.95,   // crew behind regolith walls: 95% shielding
      crew_delta: -12,         // isolation cost (OSD-1018)
      description: "Crew safe inside the shelter. Greenhouse maintenance halts. Crew morale drops."
    },
    continue_operations: {
      label: "Continue Normal Operations",
      power_delta: 5,          // slight saving from not running shield
      radiation_block: 0.0,    // no extra shielding
      crew_delta: 0,
      description: "Accept the radiation exposure. Science and maintenance continue uninterrupted."
    },

    // Night power options
    full_heaters: {
      label: "Run Full Heaters All Night",
      power_delta: -20,
      radiation_block: 0,
      crew_delta: 2,
      description: "Crew sleeps comfortably. High power draw from battery overnight."
    },
    reduced_heaters: {
      label: "Reduce Heater Output by Half",
      power_delta: -10,
      radiation_block: 0,
      crew_delta: -5,
      description: "Save power, but cold quarters reduce crew rest quality."
    },

    // Science / EVA options
    run_eva: {
      label: "Conduct Surface EVA",
      power_delta: 0,
      radiation_block: -0.5,   // negative means extra exposure during EVA
      crew_delta: -8,
      description: "Collect rock samples and check antenna array. Crew exposed to open surface."
    },
    run_science_internal: {
      label: "Run Internal Science Only",
      power_delta: -15,
      radiation_block: 0,
      crew_delta: 0,
      description: "Use lab instruments inside the habitat. No extra radiation risk."
    },
    skip_science: {
      label: "Stand Down Science Today",
      power_delta: 15,
      radiation_block: 0,
      crew_delta: -4,
      description: "Rest the crew and conserve power. Mission progress slows."
    }
  },

  // --- Comms delay by location ---
  COMM_DELAY: {
    moon: { seconds: 1.3, display: "1.3 seconds", hint_available: true },
    mars: { seconds: 780, display: "4-24 minutes", hint_available: false }  // 780s = 13min avg
  },

  // --- Failure thresholds ---
  POWER_CRITICAL: 10,    // below this: systems begin failing
  RADIATION_CRITICAL: 50, // mSv: mission abort threshold
  CREW_CRITICAL: 15      // below this: crew incapacitated
};

// Lock the object so nothing accidentally mutates it at runtime
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.SEVERITY_MULTIPLIERS);
Object.freeze(CONSTANTS.DECISION_EFFECTS);
Object.freeze(CONSTANTS.COMM_DELAY);
