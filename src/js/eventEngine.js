// ============================================================
// EVENT ENGINE
// Generates each sol's space weather event and decision options.
// Attempts a live DONKI API fetch; falls back to curated JSON.
// ============================================================

const EventEngine = (() => {

  let _fallbackData = null;
  let _usedFlareIds = new Set();

  // ----- Load the fallback JSON dataset -----
  async function loadFallback() {
    if (_fallbackData) return _fallbackData;
    try {
      const response = await fetch('./src/data/nasa_fallback.json');
      _fallbackData = await response.json();
      return _fallbackData;
    } catch (err) {
      console.warn('EventEngine: Could not load fallback JSON.', err);
      return null;
    }
  }

  // ----- Attempt live DONKI fetch -----
  async function fetchLiveDONKI() {
    // Pull the last 30 days of real flare data
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const fmt = (d) => d.toISOString().slice(0, 10);
    const url = `https://api.nasa.gov/DONKI/FLR?startDate=${fmt(startDate)}&endDate=${fmt(endDate)}&api_key=DEMO_KEY`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    try {
      const res  = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`DONKI returned ${res.status}`);
      const data = await res.json();
      return { success: true, events: data, timestamp: new Date().toISOString() };
    } catch (err) {
      clearTimeout(timeout);
      return { success: false, error: err.message };
    }
  }

  // ----- Parse a live DONKI flare into our internal format -----
  function parseLiveFlare(flare) {
    const cls = (flare.classType || 'C1.0').charAt(0).toUpperCase();
    const magnitude = parseFloat((flare.classType || 'C1.0').slice(1)) || 1.0;

    let severity = 'low';
    if (cls === 'X' && magnitude >= 2.0) severity = 'critical';
    else if (cls === 'X') severity = 'high';
    else if (cls === 'M' && magnitude >= 5.0) severity = 'moderate';
    else if (cls === 'M') severity = 'moderate';
    else severity = 'low';

    // Estimate SEP spike from class (approximate — real value not always in DONKI FLR endpoint)
    const sepEstimates = { low: 0.5, moderate: 1.5, high: 5.0, critical: 11.0 };

    return {
      id:              flare.flrID || `live_${Date.now()}`,
      date:            (flare.beginTime || '').slice(0, 10),
      class:           cls,
      magnitude:       magnitude,
      cme_speed_km_s:  null,  // not in FLR endpoint directly
      sep_mSv_spike:   sepEstimates[severity],
      description:     `Live NASA DONKI event: ${flare.classType} flare. Source region: ${flare.sourceLocation || 'unknown'}.`,
      game_severity:   severity,
      is_live:         true
    };
  }

  // ----- Pick a fallback event for this sol -----
  function pickFallbackEvent(sol, totalSols) {
    if (!_fallbackData) return buildQuietSol();

    // Create a difficulty curve: early sols lean quiet, mid-game adds moderate, late game adds critical
    const progress = sol / totalSols; // 0.0 to 1.0

    let eligibleSeverities;
    if (progress < 0.3)      eligibleSeverities = ['none', 'none', 'none', 'low'];
    else if (progress < 0.6) eligibleSeverities = ['none', 'low', 'moderate', 'moderate'];
    else if (progress < 0.8) eligibleSeverities = ['low', 'moderate', 'high', 'moderate'];
    else                     eligibleSeverities = ['moderate', 'high', 'high', 'critical'];

    // Pick a severity randomly from the eligible pool
    const targetSeverity = eligibleSeverities[Math.floor(Math.random() * eligibleSeverities.length)];

    if (targetSeverity === 'none') return buildQuietSol();

    // Find matching flares not yet used
    const pool = _fallbackData.solar_flare_events.filter(
      e => e.game_severity === targetSeverity && !_usedFlareIds.has(e.id)
    );

    if (pool.length === 0) {
      // Reuse if pool exhausted
      const anyPool = _fallbackData.solar_flare_events.filter(e => e.game_severity === targetSeverity);
      if (anyPool.length === 0) return buildQuietSol();
      const pick = anyPool[Math.floor(Math.random() * anyPool.length)];
      return { ...pick };
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];
    _usedFlareIds.add(pick.id);
    return { ...pick };
  }

  function buildQuietSol() {
    if (_fallbackData && _fallbackData.quiet_sol_pool) {
      const pool = _fallbackData.quiet_sol_pool;
      return { ...pool[Math.floor(Math.random() * pool.length)], game_severity: 'none' };
    }
    return { id: 'quiet', description: 'No significant solar activity.', game_severity: 'none' };
  }

  // ----- Build the decision options for a given event + sol context -----
  function buildDecisions(event, state) {
    const severity = event.game_severity;
    const decisions = [];

    // --- Primary decision: Radiation / flare response ---
    if (severity === 'none') {
      decisions.push(buildDecision('run_eva',           state, event));
      decisions.push(buildDecision('run_science_internal', state, event));
      decisions.push(buildDecision('skip_science',      state, event));
    } else if (severity === 'low') {
      decisions.push(buildDecision('run_science_internal', state, event));
      decisions.push(buildDecision('run_eva',           state, event));
      decisions.push(buildDecision('skip_science',      state, event));
    } else {
      // Moderate, high, critical — flare response is the primary decision
      decisions.push(buildDecision('activate_shielding',   state, event));
      decisions.push(buildDecision('storm_shelter',        state, event));
      decisions.push(buildDecision('continue_operations',  state, event));
    }

    return decisions;
  }

  // ----- Build a single decision object with projected outcomes -----
  function buildDecision(key, state, event) {
    const template = CONSTANTS.DECISION_EFFECTS[key];
    const mult = CONSTANTS.SEVERITY_MULTIPLIERS[event.game_severity];
    const baseRad = state.baselineRadPerSol;
    const flareDose = event.sep_mSv_spike || 0;

    // Calculate projected radiation change
    let radiationDelta;
    if (template.radiation_block > 0) {
      // Shielding options: reduce the flare dose by block fraction
      const unblocked = flareDose * (1 - template.radiation_block);
      radiationDelta = +(baseRad + unblocked).toFixed(2);
    } else if (template.radiation_block < 0) {
      // EVA options: extra exposure on top of baseline + flare
      radiationDelta = +(baseRad + flareDose + Math.abs(template.radiation_block) * flareDose).toFixed(2);
    } else {
      // No shielding action: take full flare dose + baseline
      radiationDelta = +(baseRad + flareDose).toFixed(2);
    }

    return {
      key:            key,
      label:          template.label,
      description:    template.description,
      projected: {
        power:     template.power_delta,
        radiation: radiationDelta,
        crew:      template.crew_delta
      }
    };
  }

  // ----- Main: generate the full sol event package -----
  async function generateSolEvent(sol, totalSols) {
    await loadFallback();

    // Try live data first
    const live = await fetchLiveDONKI();
    let event = null;
    let usedLive = false;

    if (live.success && live.events && live.events.length > 0) {
      // Pick the most significant real event from recent data
      const sorted = live.events.sort((a, b) => {
        const rank = { X: 3, M: 2, C: 1 };
        const ca = (a.classType || 'C').charAt(0);
        const cb = (b.classType || 'C').charAt(0);
        return (rank[cb] || 0) - (rank[ca] || 0);
      });

      // Only inject live critical/high events at appropriate sol depth
      const progress = sol / totalSols;
      const topEvent = sorted[0];
      const topClass = (topEvent.classType || 'C').charAt(0);
      const allowLive = (topClass === 'X' && progress > 0.4) ||
                        (topClass === 'M' && progress > 0.2) ||
                        (topClass === 'C');

      if (allowLive) {
        event   = parseLiveFlare(topEvent);
        usedLive = true;
      }
    }

    if (!event) {
      event = pickFallbackEvent(sol, totalSols);
    }

    const state    = GameState.get();
    const decisions = buildDecisions(event, state);

    GameState.setEvent(event);
    if (usedLive) {
      GameState.setLiveDataStatus(true, live.timestamp);
    }

    return { event, decisions, usedLive };
  }

  // ----- Expose the fallback constants (used by UI for tooltips) -----
  function getConstants() {
    return _fallbackData;
  }

  return { generateSolEvent, loadFallback, getConstants };

})();
