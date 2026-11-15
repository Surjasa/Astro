// ============================================================
// GAME STATE MODEL
// Single source of truth for all runtime game data.
// Never mutate directly — use GameState methods.
// ============================================================

const GameState = (() => {

  let _state = null;

  // ----- Initialise a fresh game -----
  function init(location, chapter) {
    // location: "moon" | "mars"
    const isMarsMission = location === "mars";

    _state = {
      location:          location,
      chapter:           chapter || 1,
      isMarsMission:     isMarsMission,
      currentSol:        1,
      totalSols:         CONSTANTS.TOTAL_SOLS,
      missionComplete:   false,
      missionFailed:     false,
      failureReason:     null,

      // The three core resources
      resources: {
        power:     CONSTANTS.STARTING_POWER,
        radiation: CONSTANTS.STARTING_RADIATION,
        crew:      CONSTANTS.STARTING_CREW
      },

      // Current sol's space weather event (populated by EventEngine)
      currentEvent:      null,

      // Decisions the player made this sol (up to 2)
      decisionsThisSol:  [],

      // Log of all sols for the end-of-mission debrief
      solLog: [],

      // Whether live NASA data was successfully fetched
      usingLiveData:     false,
      dataTimestamp:     null,

      // Science progress (0-100) - secondary metric shown on debrief
      scienceProgress:   0,

      // Communication hint flag (Moon only)
      commHintAvailable: !isMarsMission,

      // Baseline radiation per sol for this location
      baselineRadPerSol: isMarsMission
        ? CONSTANTS.MARS_BASELINE_mSv_PER_SOL
        : CONSTANTS.MOON_BASELINE_mSv_PER_SOL
    };

    return _state;
  }

  // ----- Read current state (returns a shallow copy of resources) -----
  function get() {
    return _state;
  }

  // ----- Apply resource deltas after decisions -----
  function applyDeltas(deltas) {
    // deltas: { power, radiation, crew, science }
    if (!_state) return;

    _state.resources.power     = clamp(_state.resources.power     + (deltas.power     || 0), 0, 100);
    _state.resources.radiation =        _state.resources.radiation + (deltas.radiation || 0);
    _state.resources.crew      = clamp(_state.resources.crew      + (deltas.crew      || 0), 0, 100);
    _state.scienceProgress     = clamp(_state.scienceProgress     + (deltas.science   || 0), 0, 100);

    // Radiation never goes below 0 (you can't un-absorb dose)
    _state.resources.radiation = Math.max(0, _state.resources.radiation);
  }

  // ----- Solar recharge at the start of each new sol -----
  function applyNightCycle() {
    if (!_state) return;

    // Solar panels recharge power. Heaters always run at night (minimum cost).
    const recharge = CONSTANTS.SOLAR_RECHARGE;
    const heaterCost = CONSTANTS.HEATER_POWER_COST;
    const netPower = recharge - heaterCost;

    _state.resources.power = clamp(_state.resources.power + netPower, 0, 100);

    // Passive baseline radiation accumulates every sol (Curiosity RAD data)
    _state.resources.radiation += _state.baselineRadPerSol;
  }

  // ----- Record a decision the player made this sol -----
  function recordDecision(decisionKey, label) {
    _state.decisionsThisSol.push({ key: decisionKey, label: label });
  }

  // ----- Advance to the next sol -----
  function advanceSol(solSummary) {
    if (!_state) return;

    // Archive this sol's data
    _state.solLog.push({
      sol:        _state.currentSol,
      event:      _state.currentEvent,
      decisions:  [..._state.decisionsThisSol],
      resources:  { ..._state.resources },
      summary:    solSummary
    });

    // Reset per-sol tracking
    _state.decisionsThisSol = [];
    _state.currentEvent = null;

    _state.currentSol += 1;

    // Check win/lose conditions
    checkEndConditions();
  }

  // ----- Check if the mission is over -----
  function checkEndConditions() {
    if (!_state) return;

    if (_state.resources.power <= CONSTANTS.POWER_CRITICAL) {
      _state.missionFailed  = true;
      _state.failureReason  = "power";
    } else if (_state.resources.radiation >= CONSTANTS.RADIATION_CRITICAL) {
      _state.missionFailed  = true;
      _state.failureReason  = "radiation";
    } else if (_state.resources.crew <= CONSTANTS.CREW_CRITICAL) {
      _state.missionFailed  = true;
      _state.failureReason  = "crew";
    } else if (_state.currentSol > _state.totalSols) {
      _state.missionComplete = true;
    }
  }

  // ----- Set the current sol's weather event -----
  function setEvent(event) {
    if (_state) _state.currentEvent = event;
  }

  // ----- Mark live data status -----
  function setLiveDataStatus(isLive, timestamp) {
    if (_state) {
      _state.usingLiveData  = isLive;
      _state.dataTimestamp  = timestamp;
    }
  }

  // ----- Utility -----
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  return { init, get, applyDeltas, applyNightCycle, recordDecision, advanceSol, setEvent, setLiveDataStatus };

})();
