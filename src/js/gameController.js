// ============================================================
// GAME CONTROLLER
// Orchestrates the game loop: start -> briefing -> decision
// -> result -> next sol -> debrief.
// Exposed on window.GameController for button click handlers.
// ============================================================

const GameController = (() => {

  let _pendingDecisionKey  = null;
  let _pendingDecision     = null;
  let _currentEventPackage = null;

  // ---- Science fact pool — one per sol result ----
  // Drawn from real NASA findings; shown after each decision resolves.
  const SCIENCE_FACTS = [
    // Radiation facts
    "Real astronauts on the International Space Station receive about 1 mSv of radiation per day — roughly the same as one chest X-ray. Mars surface astronauts would face 0.64 mSv every sol just from background cosmic rays, even with no solar storms.",
    "The Curiosity rover's RAD instrument was the first to measure radiation on the surface of another planet. It detected that a person on Mars would absorb about 232 mSv per year from background radiation alone — before any solar events.",
    "During the major solar storm in May 2024, NASA's DONKI database recorded CME speeds above 1700 km/s. A particle storm like that could add more radiation in a few hours than an entire quiet week on Mars.",
    "NASA sets a career radiation limit for astronauts. For this 10-sol game it is simplified to 50 mSv, but a real Mars mission would need to manage exposure across 500+ days. Engineers are researching water-wall shielding and underground habitats to protect crews.",
    "Burying a habitat under even 50 cm of Martian regolith (surface soil) can cut galactic cosmic ray exposure by more than half. Many Artemis and Mars mission designs include partially underground living quarters for this reason.",

    // Power facts
    "Mars is 1.5 times farther from the Sun than Earth, so solar panels on Mars receive less than half the sunlight they would on Earth's surface. That is why every power budget on a Mars outpost is tight — and why nuclear power sources like Kilopower are part of NASA's long-term planning.",
    "On the Lunar South Pole, some crater rims receive sunlight up to 90% of the year (called Peaks of Eternal Light), while nearby permanently shadowed regions never see the Sun and reach -240 degrees Celsius. Outpost location is a critical engineering trade-off.",
    "The Perseverance rover uses a Multi-Mission Radioisotope Thermoelectric Generator (MMRTG), which produces about 110 watts of electricity from the natural decay of plutonium-238. This keeps it operating through dust storms when solar panels would fail.",

    // Communication facts
    "Radio signals travel at the speed of light — 300,000 km per second. Even so, the minimum one-way delay from Earth to Mars is about 4 minutes (when closest together) and can reach 24 minutes when Mars is on the far side of the Sun. There is no real-time radio communication possible.",
    "During the Apollo missions, the round-trip communication delay to the Moon was only 2.6 seconds — just enough to notice in a conversation. For this reason, Moon missions can get real-time guidance from Earth, while Mars missions must be far more self-sufficient.",
    "NASA's Deep Space Network (DSN) is a global system of large antennas used to communicate with spacecraft. During a solar conjunction — when the Sun sits between Earth and Mars — communications are blacked out entirely for about two weeks, and crews must operate completely independently.",

    // Environmental facts
    "Mars has a day (called a sol) of 24 hours and 39 minutes — just 39 minutes longer than an Earth day. Early Mars mission planners noted that this was close enough that astronauts might adjust their schedules day by day, gradually going out of sync with Earth time.",
    "The Martian atmosphere is about 95% carbon dioxide and less than 1% of Earth's atmospheric pressure. Even if you could breathe CO2, the pressure is so low that liquid water cannot exist on the open surface — it would instantly boil away or freeze.",
    "NASA's MOXIE experiment on the Perseverance rover has successfully produced oxygen from Mars's CO2 atmosphere. It is a proof of concept for a full-scale system that could one day supply breathable air and rocket fuel oxidizer for a crewed mission.",

    // Crew / biological facts
    "NASA's OSD-1018 study examined the effects of prolonged isolation on crew behavior. It found that spending too long confined in a small space — even when physically safe — degrades coordination, mood, and decision-making. That is why long shelter lockdowns cost your crew readiness in this game.",
    "Astronauts on the ISS exercise for about 2 hours every day specifically to counteract the muscle and bone loss caused by microgravity. On Mars, the gravity is 38% of Earth's — lower than Earth but higher than the Moon or ISS — so the effects are expected to be less severe but still significant over a long mission."
  ];

  let _usedFactIndices = new Set();

  function pickScienceFact() {
    if (_usedFactIndices.size >= SCIENCE_FACTS.length) {
      _usedFactIndices.clear();
    }
    let idx;
    do {
      idx = Math.floor(Math.random() * SCIENCE_FACTS.length);
    } while (_usedFactIndices.has(idx));
    _usedFactIndices.add(idx);
    return SCIENCE_FACTS[idx];
  }

  // ---- Start game ----
  async function startGame(location, chapter) {
    GameState.init(location, chapter);
    UI.showScreen('game-screen');
    await loadNextSol();
  }

  // ---- Load a new sol ----
  async function loadNextSol() {
    const state = GameState.get();

    // Check if mission is already over
    if (state.missionFailed) {
      UI.showFailure(state.failureReason);
      setTimeout(() => {
        UI.renderDebrief();
        UI.showScreen('debrief-screen');
      }, 2200);
      return;
    }

    if (state.missionComplete) {
      UI.renderDebrief();
      UI.showScreen('debrief-screen');
      return;
    }

    // Update HUD
    UI.updateSolIndicator();
    UI.updateResourceBars();

    // Show loading state in the center column
    const container = document.getElementById('briefing-container');
    const dcontainer = document.getElementById('decisions-container');
    if (container) {
      container.innerHTML =
        '<div class="briefing-panel text-center" style="padding:40px 24px;">' +
        '<div class="section-label" style="margin-bottom:8px;">Receiving Sol ' + state.currentSol + ' Briefing</div>' +
        '<div class="text-sm" style="color:var(--text-mid);">Checking space weather conditions...</div>' +
        '</div>';
    }
    if (dcontainer) {
      dcontainer.innerHTML =
        '<div class="decisions-hint" style="color:var(--text-dim);">Loading decision options...</div>';
    }

    UI.showScreen('game-screen');

    // Generate event (tries live DONKI, falls back to curated data)
    try {
      _currentEventPackage = await EventEngine.generateSolEvent(state.currentSol, state.totalSols);
      _pendingDecisionKey  = null;
      _pendingDecision     = null;

      // Render the briefing and decision cards
      UI.renderBriefing(_currentEventPackage);
      UI.updateResourceBars();
    } catch (err) {
      console.error('Failed to generate sol event:', err);
      if (container) {
        container.innerHTML = '<div class="briefing-panel"><div class="text-sm" style="color:var(--neon-red)">Failed to load sol data. Please refresh.</div></div>';
      }
    }
  }

  // ---- Player selects a decision option ----
  function selectDecision(key, decision) {
    _pendingDecisionKey = key;
    _pendingDecision    = decision;
  }

  // ---- Player confirms their decision ----
  function confirmDecision() {
    if (!_pendingDecisionKey || !_pendingDecision) return;

    const state   = GameState.get();
    const event   = _currentEventPackage.event;
    const proj    = _pendingDecision.projected;

    // Record the decision
    GameState.recordDecision(_pendingDecisionKey, _pendingDecision.label);

    // Apply passive night cycle (solar recharge - heater cost)
    GameState.applyNightCycle();

    // Apply decision effects
    GameState.applyDeltas({
      power:     proj.power     || 0,
      radiation: proj.radiation || 0,
      crew:      proj.crew      || 0,
      science:   getScienceDelta(_pendingDecisionKey)
    });

    // Capture changes for result screen
    const afterState  = GameState.get();
    const powerDelta  = proj.power || 0;
    const radGained   = proj.radiation || 0;
    const crewDelta   = proj.crew || 0;

    // Advance sol
    GameState.advanceSol(`${_pendingDecision.label} during ${event.game_severity} conditions.`);

    // Update UI
    UI.updateResourceBars();
    UI.updateSolIndicator();

    // Show result screen
    const fact = pickScienceFact();
    UI.renderSolResult(_pendingDecision.label, radGained, powerDelta, crewDelta, fact);
    UI.showScreen('result-screen');
  }

  function getScienceDelta(key) {
    const scienceMap = {
      run_eva:              15,
      run_science_internal: 10,
      skip_science:          0,
      activate_shielding:    0,
      storm_shelter:         0,
      continue_operations:   5
    };
    return scienceMap[key] || 0;
  }

  // ---- Move to next sol after viewing result ----
  async function nextSol() {
    const state = GameState.get();

    if (state.missionFailed || state.missionComplete) {
      UI.renderDebrief();
      UI.showScreen('debrief-screen');
      return;
    }

    await loadNextSol();
  }

  // ---- Restart from scratch ----
  function restart() {
    UI.showScreen('title-screen');
  }

  return { startGame, loadNextSol, selectDecision, confirmDecision, nextSol, restart };

})();

// Expose globally for HTML button onclick handlers
window.GameController = GameController;
