// ============================================================
// UI RENDERER — updated for 3-column game layout
// Left: resource gauges  |  Center: briefing  |  Right: decisions
// ============================================================

const UI = (() => {

  let historicalDatasetCache = null;

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

  function openStageOneGame(onComplete) {
    const overlay = document.getElementById('stage-one-overlay');
    const message = document.getElementById('stage-one-message');
    const result = document.getElementById('stage-one-result');
    const continueButton = document.getElementById('stage-one-continue');
    const sources = [...document.querySelectorAll('.stage-one-source')];
    if (!overlay || !message || !result || !continueButton || !sources.length) return;

    const identified = new Set();
    const correctMessages = {
      solar: 'Correct! Solar particle events can send dangerous radiation toward the outpost.',
      cosmic: 'Correct! Galactic cosmic rays travel through space at very high energy.',
      magnetic: 'Correct! Without Earth-like protection, the exposed environment increases radiation risk.'
    };

    message.textContent = 'Mission briefing: identify the radiation sources shown in the space scene.';
    result.textContent = '';
    continueButton.hidden = true;
    sources.forEach(source => {
      source.classList.remove('source-correct', 'source-wrong');
      source.disabled = false;
      source.onclick = () => {
        if (identified.has(source.dataset.source)) return;

        if (source.dataset.correct === 'true') {
          identified.add(source.dataset.source);
          source.classList.add('source-correct');
          source.disabled = true;
          message.textContent = correctMessages[source.dataset.source];
          result.textContent = `${identified.size} of 3 radiation sources identified.`;
          if (identified.size === 3) {
            result.textContent = 'Congratulations, Radiation Scout! Stage 1 complete.';
            continueButton.hidden = false;
            sources.forEach(item => {
              if (!identified.has(item.dataset.source)) item.disabled = true;
            });
          }
          return;
        }

        source.classList.add('source-wrong');
        message.textContent = 'Not quite. That object is not a radiation source. Try another target.';
        window.setTimeout(() => source.classList.remove('source-wrong'), 700);
      };
    });

    continueButton.onclick = () => {
      closeModal('stage-one-overlay');
      if (onComplete) onComplete();
    };
    openModal('stage-one-overlay');
  }

  function openStageTwoGame(location, onComplete) {
    const overlay = document.getElementById('stage-two-overlay');
    const message = document.getElementById('stage-two-message');
    const result = document.getElementById('stage-two-result');
    const continueButton = document.getElementById('stage-two-continue');
    const materials = [...document.querySelectorAll('.stage-two-material')];
    if (!overlay || !message || !result || !continueButton || !materials.length) return;

    const selected = new Set();
    const habitatName = location === 'moon' ? 'lunar' : 'Martian';
    const regolithLabel = location === 'moon' ? 'Lunar regolith' : 'Mars regolith';
    const regolithMaterial = materials.find(material => material.dataset.material === 'regolith');
    if (regolithMaterial) {
      const regolithName = regolithMaterial.querySelector('strong');
      if (regolithName) regolithName.textContent = regolithLabel;
    }

    message.textContent = `Mission briefing: choose three materials to build a protective shield for the ${habitatName} habitat.`;
    result.textContent = '';
    continueButton.hidden = true;
    materials.forEach(material => {
      material.classList.remove('material-selected', 'material-wrong');
      material.disabled = false;
      material.onclick = () => {
        const key = material.dataset.material;
        if (selected.has(key)) {
          selected.delete(key);
          material.classList.remove('material-selected');
          result.textContent = `${selected.size} of 3 materials selected.`;
          return;
        }

        if (selected.size === 3) {
          message.textContent = 'Choose only three materials. Tap a selected material to remove it first.';
          material.classList.add('material-wrong');
          window.setTimeout(() => material.classList.remove('material-wrong'), 700);
          return;
        }

        selected.add(key);
        material.classList.add('material-selected');
        result.textContent = `${selected.size} of 3 materials selected.`;
        if (selected.size !== 3) return;

        const mass = [...selected].reduce((total, item) => {
          const option = materials.find(materialOption => materialOption.dataset.material === item);
          return total + Number(option.dataset.mass);
        }, 0);
        const protection = [...selected].reduce((total, item) => {
          const option = materials.find(materialOption => materialOption.dataset.material === item);
          return total + Number(option.dataset.protection);
        }, 0);

        if (mass <= 95 && protection >= 10) {
          message.textContent = `Excellent design! Your shield uses ${mass} mass units and provides ${protection} protection points.`;
          result.textContent = 'Congratulations, Shield Engineer! Stage 2 complete.';
          continueButton.hidden = false;
          materials.forEach(item => { item.disabled = true; });
        } else {
          message.textContent = `That design uses ${mass} mass units and provides ${protection} protection points. Adjust your materials to stay under 95 mass units and reach 10 protection points.`;
        }
      };
    });

    continueButton.onclick = () => {
      closeModal('stage-two-overlay');
      if (onComplete) onComplete();
    };
    openModal('stage-two-overlay');
  }

  function openStageThreeGame(location, onComplete) {
    const overlay = document.getElementById('stage-three-overlay');
    const message = document.getElementById('stage-three-message');
    const result = document.getElementById('stage-three-result');
    const continueButton = document.getElementById('stage-three-continue');
    const actions = [...document.querySelectorAll('.stage-three-action')];
    if (!overlay || !message || !result || !continueButton || !actions.length) return;

    const selected = new Set();
    const baseName = location === 'moon' ? 'Moon Base' : 'Mars Base';
    const correctMessages = {
      shelter: 'Correct! Move the crew into a shielded habitat before the storm peaks.',
      pause: 'Correct! Stop outdoor activity while the radiation warning is active.',
      power: 'Correct! Save power for life support and emergency communications.'
    };

    overlay.dataset.location = location;
    message.textContent = `Solar storm alert at ${baseName}: choose the three safest responses.`;
    result.textContent = '';
    continueButton.hidden = true;
    actions.forEach(action => {
      action.classList.remove('action-correct', 'action-wrong');
      action.disabled = false;
      action.onclick = () => {
        const key = action.dataset.action;
        if (selected.has(key)) return;

        if (action.dataset.correct === 'true') {
          selected.add(key);
          action.classList.add('action-correct');
          action.disabled = true;
          message.textContent = correctMessages[key];
          result.textContent = `${selected.size} of 3 emergency responses selected.`;
          if (selected.size === 3) {
            result.textContent = 'Congratulations, Storm Commander! Stage 3 complete.';
            continueButton.hidden = false;
            actions.forEach(item => {
              if (!selected.has(item.dataset.action)) item.disabled = true;
            });
          }
          return;
        }

        action.classList.add('action-wrong');
        message.textContent = 'Warning! Continuing outdoor activity exposes the crew to dangerous radiation. Choose a protective response.';
        window.setTimeout(() => action.classList.remove('action-wrong'), 700);
      };
    });

    continueButton.onclick = () => {
      closeModal('stage-three-overlay');
      if (onComplete) onComplete();
    };
    openModal('stage-three-overlay');
  }

  function renderChapterGameplay(state, event) {
    const container = document.getElementById('chapter-gameplay-container');
    if (!container) return;
    container.innerHTML = '';

    if (state.chapter === 2) {
      renderChapterTwoGameplay(state, event, container);
      return;
    }

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
          ['Stage 1 — Discover the Invisible Threat', 'Identify the radiation sources in the space environment.'],
          ['Stage 2 — Build Your Shield', 'Choose materials that balance protection and mass.'],
          ['Stage 3 — Survive the Solar Storm', 'Choose the safest response to an approaching radiation event.']
        ]
      : [
          ['Stage 1 — Discover the Invisible Threat', 'Identify the radiation sources in the space environment.'],
          ['Stage 2 — Build Your Shield', 'Choose materials that balance protection and mass.'],
          ['Stage 3 — Survive the Solar Storm', 'Choose the safest response to an approaching radiation event.']
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
      if (index < 3) {
        const taskImage = document.createElement('img');
        taskImage.className = 'chapter-gameplay-task-image';
        taskImage.src = index === 0
          ? 'src/assets/stage1.png'
          : index === 1 ? 'src/assets/Stage 2.png' : 'src/assets/Stage 3.png';
        taskImage.alt = index === 0
          ? 'Stage 1 radiation source identification'
          : index === 1 ? 'Stage 2 radiation shield construction' : 'Stage 3 solar storm response';
        taskCard.appendChild(taskImage);
      }
      const copy = el('span', 'chapter-gameplay-task-copy');
      copy.appendChild(el('strong', '', task[0]));
      copy.appendChild(el('small', '', task[1]));
      taskCard.appendChild(copy);
      taskCard.appendChild(el('span', 'chapter-gameplay-task-action',
        index === 0 ? 'OPEN STAGE 1' : index === 1 ? 'OPEN STAGE 2' : 'OPEN STAGE 3'));

      taskCard.addEventListener('click', () => {
        if (taskCard.classList.contains('complete')) return;
        if (index === 0) {
          openStageOneGame(() => {
            taskCard.classList.add('complete');
            taskCard.querySelector('.chapter-gameplay-task-action').textContent = 'COMPLETED';
            completed += 1;
            progressFill.style.width = `${(completed / tasks.length) * 100}%`;
          });
          return;
        }
        if (index === 1) {
          openStageTwoGame(state.location, () => {
            taskCard.classList.add('complete');
            taskCard.querySelector('.chapter-gameplay-task-action').textContent = 'COMPLETED';
            completed += 1;
            progressFill.style.width = `${(completed / tasks.length) * 100}%`;
          });
          return;
        }
        openStageThreeGame(state.location, () => {
          taskCard.classList.add('complete');
          taskCard.querySelector('.chapter-gameplay-task-action').textContent = 'COMPLETED';
          completed += 1;
          progressFill.style.width = `${(completed / tasks.length) * 100}%`;
          if (completed === tasks.length) {
            localStorage.setItem(`astro_chapter_1_complete_${state.location}`, 'true');
            if (state.location === 'moon') {
              localStorage.setItem('astro_moon_level_2_unlocked', 'true');
            }
            if (typeof updateChapterUnlocks === 'function') updateChapterUnlocks();
            const completion = el('div', 'chapter-completion-banner');
            completion.appendChild(el('strong', '', 'Congratulations! All Chapter 1 stages cleared.'));
            completion.appendChild(el('span', '', 'Chapter 2 is now unlocked. Continue to the historical solar storm case study.'));
            module.appendChild(completion);
          }
        });
      });
      taskList.appendChild(taskCard);
    });

    module.appendChild(taskList);
    container.appendChild(module);
  }

  function renderChapterTwoGameplay(state, event, container) {
    const module = el('section', 'chapter-gameplay-panel chapter-two-panel');
    module.setAttribute('data-location', state.location);

    const header = el('div', 'chapter-gameplay-header');
    header.appendChild(el('div', 'chapter-gameplay-kicker',
      state.location === 'moon' ? 'Moon Base // Chapter 2' : 'Mars Base // Chapter 2'));
    header.appendChild(el('div', 'chapter-gameplay-title', 'Historical Solar Storm Lab'));
    header.appendChild(el('div', 'chapter-gameplay-instruction',
      'Study the May 2024 solar storm using recorded flare and proton observations.'));
    module.appendChild(header);

    const readout = el('div', 'chapter-gameplay-readout');
    readout.appendChild(el('span', 'chapter-gameplay-readout-label', 'Case study'));
    readout.appendChild(el('span', 'chapter-gameplay-readout-value', 'MAY 2024 // GANNON STORM'));
    module.appendChild(readout);

    const loading = el('div', 'historical-loading', 'Loading the verified historical event dataset...');
    module.appendChild(loading);
    container.appendChild(module);

    function renderDataset(dataset) {
      if (!dataset || !Array.isArray(dataset.records)) {
        loading.textContent = 'Historical dataset is unavailable. No event values were invented.';
        return;
      }

      loading.remove();
      const flares = dataset.records.filter(record => record.record_type === 'solar_flare');
      const sepEvents = dataset.records.filter(record => record.record_type === 'solar_energetic_particle_event');
      const measuredPeaks = sepEvents.filter(record => record.proton_flux_peak_pfu !== null);

      const stats = el('div', 'historical-stats');
      stats.appendChild(el('div', 'historical-stat', `${flares.length} recorded flares`));
      stats.appendChild(el('div', 'historical-stat', `${sepEvents.length} SEP records`));
      stats.appendChild(el('div', 'historical-stat', `${measuredPeaks.length} reported proton peaks`));
      module.appendChild(stats);

      const lesson = el('div', 'historical-lesson');
      lesson.appendChild(el('strong', '', 'Commander challenge'));
      lesson.appendChild(el('span', '', 'Tap a SEP record to inspect its measured proton flux. Missing values stay missing.'));
      module.appendChild(lesson);

      const eventList = el('div', 'historical-event-list');
      const detail = el('div', 'historical-event-detail', 'Select a historical SEP event to inspect its evidence.');
      module.appendChild(eventList);
      module.appendChild(detail);

      sepEvents.forEach(record => {
        const card = el('button', 'historical-event-card');
        card.type = 'button';
        card.appendChild(el('span', 'historical-event-id', record.record_id));
        card.appendChild(el('strong', '', new Date(record.start_utc).toISOString().slice(0, 10)));
        card.appendChild(el('small', '', record.proton_flux_peak_pfu === null
          ? 'Peak proton flux: Not reported'
          : `Peak proton flux: ${record.proton_flux_peak_pfu} pfu`));
        card.addEventListener('click', () => {
          document.querySelectorAll('.historical-event-card').forEach(item => item.classList.remove('selected'));
          card.classList.add('selected');
          const fluxText = record.proton_flux_peak_pfu === null
            ? 'Peak proton flux: Not reported in the cited event summary.'
            : `Measured peak: ${record.proton_flux_peak_pfu} pfu at ${record.flux_peak_time_utc}.`;
          detail.innerHTML = '';
          detail.appendChild(el('strong', '', `${record.record_id} // ${fluxText}`));
          detail.appendChild(el('span', '', record.description));
          const source = el('a', '', 'Open original source reference');
          source.href = record.source_reference;
          source.target = '_blank';
          source.rel = 'noopener noreferrer';
          detail.appendChild(source);
        });
        eventList.appendChild(card);
      });

      const sourceNote = el('div', 'historical-source-note',
        'Source: NASA CCMC DONKI event records and cited GOES proton-flux reports. This is an event-level starter dataset, not a five-minute time series.');
      module.appendChild(sourceNote);
    }

    if (historicalDatasetCache) {
      renderDataset(historicalDatasetCache);
      return;
    }

    fetch('./src/data/may_2024_solar_events_starter_dataset.json')
      .then(response => {
        if (!response.ok) throw new Error(`Historical dataset returned ${response.status}`);
        return response.json();
      })
      .then(dataset => {
        historicalDatasetCache = dataset;
        renderDataset(dataset);
      })
      .catch(error => {
        console.error('Chapter 2: Could not load historical solar dataset.', error);
        loading.textContent = 'Could not load the historical dataset. Please refresh and try again.';
      });
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
