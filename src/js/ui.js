// ============================================================
// UI RENDERER — updated for 3-column game layout
// Left: resource gauges  |  Center: briefing  |  Right: decisions
// ============================================================

const UI = (() => {

  // ---- Screen switch ----
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const t = document.getElementById(id);
    if (t) { t.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  // ---- Top HUD icon rows (5 icons each resource) ----
  function updateHudIcons() {
    const state = GameState.get();
    if (!state) return;
    const r = state.resources;

    // Power: 5 bolt icons, filled = active power
    buildIconRow('hud-power-icons', 5, Math.round(r.power), 100, 'power-icon');

    // Radiation: 5 circle icons, filled = radiation absorbed (inverse logic)
    const radPct = Math.min(100, (r.radiation / CONSTANTS.RADIATION_CRITICAL) * 100);
    buildRadIconRow('hud-rad-icons', 5, radPct);

    // Crew: 5 person icons, filled = healthy crew
    buildIconRow('hud-crew-icons', 5, Math.round(r.crew), 100, 'crew-icon');
  }

  function buildIconRow(containerId, count, value, max, type) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    const filled = Math.round((value / max) * count);
    for (let i = 0; i < count; i++) {
      const icon = document.createElement('div');
      icon.className = 'res-icon ' + type + (i < filled ? '' : ' empty');
      el.appendChild(icon);
    }
  }

  function buildRadIconRow(containerId, count, pct) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    const filled = Math.round((pct / 100) * count);
    for (let i = 0; i < count; i++) {
      const icon = document.createElement('div');
      icon.className = 'res-icon rad-icon' + (i < filled ? ' filled' : ' empty');
      el.appendChild(icon);
    }
  }

  // ---- Top HUD text values ----
  function updateHudValues() {
    const state = GameState.get();
    if (!state) return;
    const r = state.resources;

    const vp = document.getElementById('val-power');
    const vr = document.getElementById('val-radiation');
    const vc = document.getElementById('val-crew');
    if (vp) vp.textContent = Math.round(r.power) + '%';
    if (vr) vr.textContent = r.radiation.toFixed(1) + ' mSv';
    if (vc) vc.textContent = Math.round(r.crew) + '%';
  }

  // ---- Left column: ring gauges + segmented bars ----
  function updateLeftGauges() {
    const state = GameState.get();
    if (!state) return;
    const r = state.resources;

    // Power ring
    updateRing('ring-power', 'ring-val-power', Math.round(r.power), 100,
      '#ffd166', '#cc8800', r.power <= CONSTANTS.POWER_CRITICAL);
    buildSegBar('seg-power', 10, Math.round(r.power), 100, 'power-seg');
    setBlockWarn('gauge-power', r.power <= CONSTANTS.POWER_CRITICAL);

    // Radiation ring (inverted — fills toward limit)
    const radPct = Math.min(100, (r.radiation / CONSTANTS.RADIATION_CRITICAL) * 100);
    updateRing('ring-rad', 'ring-val-rad', r.radiation.toFixed(1), null,
      '#ff6b35', '#cc3300', radPct >= 70);
    buildSegBar('seg-rad', 10, radPct, 100, 'rad-seg');
    setBlockWarn('gauge-rad', radPct >= 70);

    // Crew ring
    updateRing('ring-crew', 'ring-val-crew', Math.round(r.crew), 100,
      '#39ff88', '#009940', r.crew <= CONSTANTS.CREW_CRITICAL + 10);
    buildSegBar('seg-crew', 10, Math.round(r.crew), 100, 'crew-seg');
    setBlockWarn('gauge-crew', r.crew <= CONSTANTS.CREW_CRITICAL + 10);
  }

  function updateRing(ringId, valId, value, max, colorHigh, colorLow, warn) {
    const ring = document.getElementById(ringId);
    const valEl = document.getElementById(valId);
    if (!ring || !valEl) return;

    // conic-gradient ring: fraction of circle in accent colour, rest in dark
    const pct = max !== null ? Math.min(100, Math.max(0, (parseFloat(value) / max) * 100)) : 0;
    const deg = Math.round((pct / 100) * 360);
    const col = warn ? '#ff3f3f' : colorHigh;
    const dark = 'rgba(0,10,30,0.9)';
    ring.style.background =
      `conic-gradient(${col} 0deg ${deg}deg, ${dark} ${deg}deg 360deg)`;
    ring.style.boxShadow =
      warn
        ? '0 0 18px rgba(255,60,60,0.4), 0 0 36px rgba(255,0,0,0.2)'
        : `0 0 14px ${col}55, 0 0 28px ${col}22`;

    valEl.textContent = value;
    valEl.style.color = warn ? 'var(--red-lt)' : col;
    valEl.style.textShadow = warn
      ? '0 0 12px rgba(255,60,60,0.7)'
      : `0 0 10px ${col}99`;
  }

  function buildSegBar(containerId, segments, value, max, type) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    const filled = Math.round((value / max) * segments);
    for (let i = 0; i < segments; i++) {
      const seg = document.createElement('div');
      seg.className = 'seg ' + type + (i < filled ? ' on' : ' off');
      el.appendChild(seg);
    }
  }

  function setBlockWarn(id, warn) {
    const el = document.getElementById(id);
    if (!el) return;
    if (warn) el.classList.add('warn');
    else el.classList.remove('warn');
  }

  // ---- Master update (call after any state change) ----
  function updateResourceBars() {
    updateHudIcons();
    updateHudValues();
    updateLeftGauges();
  }

  // ---- Sol indicator ----
  function updateSolIndicator() {
    const state = GameState.get();
    if (!state) return;
    const sn = document.getElementById('sol-number');
    const sf = document.getElementById('sol-progress-fill');
    if (sn) sn.textContent = state.currentSol;
    if (sf) sf.style.width = (((state.currentSol - 1) / state.totalSols) * 100) + '%';
    updateGameplayModule(state);
  }

  function updateGameplayModule(state) {
    const module = document.getElementById('gameplay-module');
    const kicker = document.getElementById('gameplay-module-kicker');
    const title = document.getElementById('gameplay-module-title');
    const objective = document.getElementById('gameplay-module-objective');
    const icon = document.getElementById('gameplay-module-icon');
    if (!module || !kicker || !title || !objective || !icon) return;

    module.setAttribute('data-location', state.location);
    if (state.location === 'moon') {
      icon.textContent = '◈';
      kicker.textContent = 'Lunar Surface Operations';
      title.textContent = 'South Pole Radiation Lab';
      objective.textContent = 'Track solar conditions and keep the lunar crew safe.';
    } else {
      icon.textContent = '✦';
      kicker.textContent = 'Martian Surface Operations';
      title.textContent = 'Jezero Habitat Command';
      objective.textContent = 'Balance power, radiation, and crew readiness on Mars.';
    }
  }

  // ---- Render briefing (center column) + decisions (right column) ----
  function renderBriefing(eventPackage) {
    const { event, decisions, usedLive } = eventPackage;
    const state = GameState.get();

    // --- CENTER: briefing panel ---
    const bc = document.getElementById('briefing-container');
    if (bc) {
      bc.innerHTML = '';
      const panel = el('div', 'briefing-panel');

      // Header row
      const header = el('div', 'briefing-header');
      const solTag = el('div', 'briefing-sol-tag',
        `Sol ${state.currentSol} of ${state.totalSols} — Daily Briefing`);
      const severityMeta = CONSTANTS.SEVERITY_MULTIPLIERS[event.game_severity];
      const badge = el('span', `severity-badge severity-${event.game_severity}`, severityMeta.label);
      header.appendChild(solTag);
      header.appendChild(badge);
      panel.appendChild(header);

      // Event name
      const nameMap = {
        none:     'Quiet Solar Conditions',
        low:      'Minor Solar Activity',
        moderate: 'Elevated Solar Activity',
        high:     'Solar Radiation Warning',
        critical: 'Solar Radiation Emergency'
      };
      panel.appendChild(el('div', 'briefing-event-name', nameMap[event.game_severity]));
      panel.appendChild(el('div', 'briefing-event-desc', event.description));

      // Stats chips
      if (event.game_severity !== 'none') {
        const stats = el('div', 'briefing-stats');
        if (event.class && event.magnitude) {
          stats.appendChild(el('span', 'data-chip blue', `Flare: ${event.class}${event.magnitude}`));
        }
        if (event.cme_speed_km_s) {
          stats.appendChild(el('span', 'data-chip orange', `CME: ${event.cme_speed_km_s.toLocaleString()} km/s`));
        }
        if (event.sep_mSv_spike) {
          stats.appendChild(el('span', 'data-chip red', `Spike: +${event.sep_mSv_spike} mSv`));
        }
        panel.appendChild(stats);
      }

      // Data source tag
      const sourceText = usedLive
        ? 'LIVE: NASA DONKI Space Weather API'
        : (event.source ? `NASA DONKI: ${event.source}` : 'NASA DONKI Archive');
      panel.appendChild(el('div', `data-chip ${usedLive ? 'live' : 'blue'} mt-12`, sourceText));
      if (event.date) panel.appendChild(el('div', 'text-sm text-muted mt-4', `Recorded: ${event.date}`));

      bc.appendChild(panel);
    }

    renderChapterGameplay(state, event);

    // --- RIGHT: decisions container ---
    const dc = document.getElementById('decisions-container');
    const btnC = document.getElementById('confirm-btn-container');
    if (!dc || !btnC) return;
    dc.innerHTML = '';
    btnC.innerHTML = '';

    decisions.forEach(decision => {
      dc.appendChild(buildDecisionCard(decision));
    });

    // Confirm button
    const confirmBtn = el('button', 'btn btn-confirm btn-full', 'Confirm Decision');
    confirmBtn.id = 'confirm-decision-btn';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.35';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.addEventListener('click', () => window.GameController.confirmDecision());
    btnC.appendChild(confirmBtn);
  }

  function renderChapterGameplay(state, event) {
    const container = document.getElementById('chapter-gameplay-container');
    if (!container) return;
    container.innerHTML = '';

    const module = el('section', 'chapter-gameplay-panel');
    module.setAttribute('data-location', state.location);

    const header = el('div', 'chapter-gameplay-header');
    const kicker = el('div', 'chapter-gameplay-kicker',
      state.location === 'moon' ? 'Moon Base // Chapter 1' : 'Mars Base // Chapter 1');
    header.appendChild(kicker);
    header.appendChild(el('div', 'chapter-gameplay-title',
      state.location === 'moon' ? 'Radiation Check Console' : 'Habitat Survival Console'));
    header.appendChild(el('div', 'chapter-gameplay-instruction',
      state.location === 'moon'
      ? 'Complete the checks before choosing today\'s mission response.'
        : 'Run the habitat checks before choosing today\'s mission response.'));
    module.appendChild(header);

    const readout = el('div', 'chapter-gameplay-readout');
    readout.appendChild(el('span', 'chapter-gameplay-readout-label', 'Live scan'));
    readout.appendChild(el('span', 'chapter-gameplay-readout-value',
      `${event.game_severity.toUpperCase()} // +${(event.sep_mSv_spike || 0).toFixed(2)} mSv event spike`));
    module.appendChild(readout);

    const tasks = state.location === 'moon'
      ? [
          ['Lunar radiation sweep', 'Scan the south-pole sensor array.'],
          ['Shield integrity check', 'Confirm the regolith shelter is sealed.'],
          ['Crew dosimeter sync', 'Verify every crew member is below the limit.']
        ]
      : [
          ['Solar weather scan', 'Read the Martian sky and dust conditions.'],
          ['Habitat pressure check', 'Confirm the airlock and habitat seals.'],
          ['Crew life-support sync', 'Verify oxygen and power reserves.']
        ];

    const taskList = el('div', 'chapter-gameplay-tasks');
    const progress = el('div', 'chapter-gameplay-progress');
    const progressFill = el('div', 'chapter-gameplay-progress-fill');
    progress.appendChild(progressFill);
    module.appendChild(progress);

    let completed = 0;
    tasks.forEach((task, index) => {
      const taskCard = el('button', 'chapter-gameplay-task');
      taskCard.type = 'button';
      taskCard.appendChild(el('span', 'chapter-gameplay-task-number', `0${index + 1}`));
      const copy = el('span', 'chapter-gameplay-task-copy');
      copy.appendChild(el('strong', '', task[0]));
      copy.appendChild(el('small', '', task[1]));
      taskCard.appendChild(copy);
      taskCard.appendChild(el('span', 'chapter-gameplay-task-action', 'RUN CHECK'));

      taskCard.addEventListener('click', () => {
        if (taskCard.classList.contains('complete')) return;
        taskCard.classList.add('complete');
        taskCard.querySelector('.chapter-gameplay-task-action').textContent = 'CHECKED';
        completed += 1;
        progressFill.style.width = `${(completed / tasks.length) * 100}%`;
      });
      taskList.appendChild(taskCard);
    });

    module.appendChild(taskList);
    container.appendChild(module);
  }

  function buildDecisionCard(decision) {
    const card = el('div', 'decision-card');
    card.dataset.decisionKey = decision.key;

    card.appendChild(el('div', 'dc-title', decision.label));
    card.appendChild(el('div', 'dc-desc', decision.description));

    const costs = el('div', 'dc-costs');

    const pv = decision.projected.power;
    costs.appendChild(el('span', 'cost-chip ' + (pv > 0 ? 'pos' : pv < 0 ? 'neg' : 'neu'),
      `Power: ${pv > 0 ? '+' : ''}${pv}%`));

    const rv = decision.projected.radiation;
    const rClass = rv < 0.65 ? 'pos' : rv < 1.5 ? 'neu' : 'neg';
    costs.appendChild(el('span', 'cost-chip ' + rClass, `Dose: +${rv} mSv`));

    const cv = decision.projected.crew;
    if (cv !== 0) {
      costs.appendChild(el('span', 'cost-chip ' + (cv > 0 ? 'pos' : 'neg'),
        `Crew: ${cv > 0 ? '+' : ''}${cv}%`));
    }

    card.appendChild(costs);

    card.addEventListener('click', () => {
      document.querySelectorAll('.decision-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const btn = document.getElementById('confirm-decision-btn');
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
      window.GameController.selectDecision(decision.key, decision);
    });

    return card;
  }

  // ---- Sol result screen ----
  function renderSolResult(decisionMade, radiationGained, powerDelta, crewDelta, scienceFact) {
    const state = GameState.get();
    const container = document.getElementById('result-container');
    if (!container) return;
    container.innerHTML = '';

    const panel = el('div', 'result-panel');

    panel.appendChild(el('div', 'result-title', `Sol ${state.currentSol - 1} Complete`));

    const decLine = document.createElement('div');
    decLine.style.cssText = 'color:var(--text-mid);margin-bottom:14px;font-size:0.9rem;';
    decLine.textContent = 'You chose: ';
    const strong = el('strong', '', decisionMade);
    strong.style.color = 'var(--text-bright)';
    decLine.appendChild(strong);
    panel.appendChild(decLine);

    // Resource changes
    const changes = el('div', 'result-changes');
    changes.appendChild(buildResultChange('Power', powerDelta, '%', 'power'));
    changes.appendChild(buildResultChange('Radiation', radiationGained, ' mSv', 'radiation'));
    changes.appendChild(buildResultChange('Crew', crewDelta, '%', 'crew'));
    panel.appendChild(changes);

    // Divider
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(0,180,255,0.3),transparent);margin:16px 0;';
    panel.appendChild(div);

    // Current status chips
    const statusLabel = el('div', 'section-label mb-8', 'Current Status');
    statusLabel.style.marginBottom = '8px';
    panel.appendChild(statusLabel);

    const r = state.resources;
    const statusRow = el('div', 'result-status-row');
    statusRow.appendChild(el('span', 'data-chip blue',   `Power: ${Math.round(r.power)}%`));
    statusRow.appendChild(el('span', 'data-chip orange', `Dose: ${r.radiation.toFixed(1)} mSv`));
    statusRow.appendChild(el('span', 'data-chip', `Crew: ${Math.round(r.crew)}%`));
    panel.appendChild(statusRow);

    container.appendChild(panel);

    // Science fact
    if (scienceFact) {
      const sc = el('div', 'science-card mt-16');
      sc.style.marginTop = '16px';
      sc.appendChild(el('div', 'science-label', 'The Real Science'));
      sc.appendChild(el('div', 'science-text', scienceFact));
      container.appendChild(sc);
    }

    // Next button
    const isLast = state.currentSol > state.totalSols;
    const nextBtn = el('button', 'btn btn-primary btn-full mt-20',
      isLast ? 'View Mission Debrief' : `Begin Sol ${state.currentSol}`);
    nextBtn.style.marginTop = '20px';
    nextBtn.addEventListener('click', () => window.GameController.nextSol());
    container.appendChild(nextBtn);
  }

  function buildResultChange(label, delta, unit, type) {
    const item = el('div', 'result-change-item');
    item.appendChild(el('div', 'result-change-label', label));
    let cls = 'neutral';
    if (type === 'radiation') {
      cls = delta > 2 ? 'negative' : delta > 0.7 ? 'neutral' : 'positive';
    } else {
      cls = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
    }
    const sign = (delta > 0 && type !== 'radiation') ? '+' : (delta > 0 ? '+' : '');
    const v = el('div', 'result-change-value ' + cls,
      `${sign}${typeof delta === 'number' ? delta.toFixed(type === 'radiation' ? 2 : 0) : delta}${unit}`);
    item.appendChild(v);
    return item;
  }

  // ---- Debrief ----
  function renderDebrief() {
    const state = GameState.get();
    const container = document.getElementById('debrief-container');
    if (!container || !state) return;
    container.innerHTML = '';

    const success = !state.missionFailed;
    const earnedMoonCertification = success && state.location === 'moon';

    if (earnedMoonCertification) {
      localStorage.setItem('astro_moon_level_2_unlocked', 'true');
    }

    const titleEl = el('div', 'game-title text-center', success ? 'Mission Complete' : 'Mission Ended');
    titleEl.style.marginBottom = '10px';
    container.appendChild(titleEl);

    const failMsgs = {
      power:     'Power dropped below critical. Life support systems shut down.',
      radiation: `Cumulative radiation hit ${CONSTANTS.RADIATION_CRITICAL} mSv. Mission abort protocol activated.`,
      crew:      'Crew readiness reached critical levels. The team can no longer operate the outpost.'
    };
    const sub = el('div', 'game-subtitle text-center',
      success
        ? `Your crew survived all ${state.totalSols} sols. Here is how you did.`
        : (failMsgs[state.failureReason] || 'A critical system failed.'));
    container.appendChild(sub);

    // Stats grid
    const grid = el('div', 'debrief-grid');
    grid.appendChild(buildDebriefStat(`${state.resources.radiation.toFixed(1)} mSv`, 'Total Radiation', `NASA limit: ${CONSTANTS.RADIATION_CRITICAL} mSv. ISS astronauts average ~1 mSv/day.`));
    grid.appendChild(buildDebriefStat(`${state.scienceProgress}%`, 'Science Progress', 'EVAs and internal science advance mission objectives.'));
    grid.appendChild(buildDebriefStat(`${Math.round(state.resources.crew)}%`, 'Crew Readiness', 'Fatigue, isolation, and EVA exposure tracked over mission.'));
    grid.appendChild(buildDebriefStat(`${Math.round(state.resources.power)}%`, 'Final Power', 'Battery at mission end. Below 10% causes system failure.'));
    container.appendChild(grid);

    if (earnedMoonCertification) {
      const certification = el('div', 'certification-card');
      certification.appendChild(el('div', 'certification-kicker', 'Radiation Safety Certification'));
      certification.appendChild(el('div', 'certification-level', 'Cadet Level 01 Complete'));
      certification.appendChild(el('div', 'certification-progress-label', 'Training Progress'));
      const progressTrack = el('div', 'certification-progress-track');
      progressTrack.appendChild(el('div', 'certification-progress-fill'));
      certification.appendChild(progressTrack);
      certification.appendChild(el('div', 'certification-reward-title', 'Radiation Safety Officer'));
      certification.appendChild(el('div', 'certification-reward-note', 'Chapter 2 unlocked — continue your astronaut training.'));
      container.appendChild(certification);
    }

    // Rating
    const rating = calcRating(state);
    const ratingEl = el('div', 'science-card text-center');
    ratingEl.style.maxWidth = '700px';
    ratingEl.style.width = '100%';
    ratingEl.style.marginTop = '0';
    ratingEl.appendChild(el('div', 'science-label', 'Mission Rating'));
    const rv = el('div', 'debrief-rating', rating.label);
    rv.style.color = rating.color;
    ratingEl.appendChild(rv);
    ratingEl.appendChild(el('div', 'science-text', rating.description));
    container.appendChild(ratingEl);

    // Data attribution
    const attr = el('div', 'science-card');
    attr.style.maxWidth = '700px'; attr.style.width = '100%'; attr.style.marginTop = '16px';
    attr.appendChild(el('div', 'science-label', 'About the NASA Data'));
    attr.appendChild(el('div', 'science-text', 'Radiation figures use real measurements from Curiosity RAD (0.64 mSv/sol baseline). Solar flare events are from NASA DONKI. Temperature and comm delay data from NASA Perseverance MEDA and LRO.'));
    const attrBtn = el('button', 'btn btn-secondary btn-sm', 'View Data Sources');
    attrBtn.style.marginTop = '12px';
    attrBtn.addEventListener('click', () => openModal('data-modal'));
    attr.appendChild(attrBtn);
    container.appendChild(attr);

    // Play again
    const playBtn = el('button', 'btn btn-primary btn-full', 'Play Again');
    playBtn.style.maxWidth = '700px'; playBtn.style.width = '100%'; playBtn.style.marginTop = '20px';
    playBtn.addEventListener('click', () => showScreen('title-screen'));
    container.appendChild(playBtn);
  }

  function buildDebriefStat(value, label, note) {
    const stat = el('div', 'debrief-stat');
    stat.appendChild(el('div', 'debrief-stat-value', value));
    stat.appendChild(el('div', 'debrief-stat-label', label));
    stat.appendChild(el('div', 'debrief-stat-note', note));
    return stat;
  }

  function calcRating(state) {
    const r = state.resources;
    const score = (r.crew / 100) * 40 + ((100 - (r.radiation / CONSTANTS.RADIATION_CRITICAL) * 100) / 100) * 40 + (r.power / 100) * 20;
    if (state.missionFailed)  return { label: 'Mission Aborted',       color: 'var(--red-lt)',    description: 'The mission ended before completion. Try a different strategy on your next attempt.' };
    if (score >= 80)          return { label: 'Outstanding Commander', color: 'var(--green-neon)',  description: 'Excellent resource management. Crew stayed healthy, radiation was controlled, power held. Real mission planners would be proud.' };
    if (score >= 60)          return { label: 'Capable Commander',     color: 'var(--blue-lt)',   description: 'Solid mission execution. Some tough calls were made but the crew made it through.' };
    if (score >= 40)          return { label: 'Survived',              color: 'var(--yellow-lt)', description: 'The crew made it, but resources were stretched thin. Consider different shielding or EVA timing.' };
    return                           { label: 'Barely Made It',        color: 'var(--orange-lt)', description: 'The mission succeeded by a narrow margin. Review your radiation and power choices.' };
  }

  // ---- Modals ----
  function openModal(id)  { const o = document.getElementById(id); if (o) o.classList.add('open'); }
  function closeModal(id) { const o = document.getElementById(id); if (o) o.classList.remove('open'); }

  // ---- Failure overlay ----
  function showFailure(reason) {
    const overlay = document.getElementById('failure-overlay');
    const msgEl   = document.getElementById('failure-message');
    if (!overlay || !msgEl) return;
    const msgs = {
      power:     'Power reserves dropped below critical. Life support systems have failed.',
      radiation: `Total radiation dose exceeded ${CONSTANTS.RADIATION_CRITICAL} mSv. Mission abort protocol activated.`,
      crew:      'Crew readiness reached critical levels. The team can no longer operate the outpost safely.'
    };
    msgEl.textContent = msgs[reason] || 'A critical system has failed.';
    overlay.classList.add('open');
  }

  // ---- Comm hint ----
  function showCommHint(hintText) {
    ['comm-hint', 'comm-hint-right'].forEach(id => {
      const h = document.getElementById(id);
      if (!h) return;
      h.textContent = hintText;
      h.style.display = 'block';
      setTimeout(() => { h.style.display = 'none'; }, 6000);
    });
  }

  // ---- DOM helper ----
  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  return {
    showScreen,
    updateResourceBars,
    updateSolIndicator,
    renderBriefing,
    renderSolResult,
    renderDebrief,
    openModal,
    closeModal,
    showFailure,
    showCommHint,
    el
  };

})();
