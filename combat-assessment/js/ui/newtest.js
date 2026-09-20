/* ==========================================================================
   js/ui/newtest.js — NEW TEST / EDIT TEST WIZARD (11 steps)
   --------------------------------------------------------------------------
   Built for speed on a gym floor: large numeric inputs, best-of-attempts
   calculated live, every test can be marked NOT TESTED with a reason, and
   every keystroke autosaves. Nothing is ever silently corrected — the
   validator's messages appear next to the field that caused them.
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;

  var STEPS = [
    { id: 'athlete',   label: 'Athlete' },
    { id: 'body',      label: 'Body & kit' },
    { id: 'readiness', label: 'Readiness' },
    { id: 'power',     label: 'Power',       category: 'power' },
    { id: 'speed',     label: 'Speed',       category: 'speed' },
    { id: 'strength',  label: 'Strength',    category: 'strength' },
    { id: 'aerobic',   label: 'Aerobic',     category: 'aerobic' },
    { id: 'anaerobic', label: 'Anaerobic',   category: 'anaerobic' },
    { id: 'repeated',  label: 'Repeat effort', category: 'repeated' },
    { id: 'movement',  label: 'Movement',    category: 'movement' },
    { id: 'review',    label: 'Review' }
  ];

  var W = null;   /* working session */
  var A = null;   /* athlete */

  /* ====================== ENTRY ====================== */
  function render(mount) {
    var S = P.Store, ctx = P.App.ctx;

    if (ctx.sessionId) {
      var ex = S.session(ctx.sessionId);
      if (ex) { W = ex; A = S.athlete(ex.athleteId); }
    }
    if (!W || (ctx.athleteId && W.athleteId !== ctx.athleteId) ||
        (!ctx.sessionId && W.id && S.session(W.id) && W.complete)) {
      W = null;
    }
    if (!W) {
      if (!ctx.athleteId) { renderPicker(mount); return; }
      A = S.athlete(ctx.athleteId);
      if (!A) { renderPicker(mount); return; }
      W = newSessionFor(A);
    }
    A = A || S.athlete(W.athleteId);
    if (!A) { W = null; renderPicker(mount); return; }

    renderWizard(mount);
  }

  function newSessionFor(a) {
    var S = P.Store;
    var prev = S.latestSession(a.id);
    var s = P.Model.newSession({
      athleteId: a.id, gymId: a.gymId, coach: a.coach,
      tester: (prev && prev.tester) || (S.db.events[0] && S.db.events[0].tester) || '',
      /* carry forward body mass and equipment: a retest must use the same kit */
      bodyMassKg: prev ? prev.bodyMassKg : null,
      heightCm: prev ? prev.heightCm : null,
      ageAtTest: P.Model.ageAt(a.dob) || a.ageStated,
      equipment: prev ? JSON.parse(JSON.stringify(prev.equipment)) : undefined
    });
    s.carriedForward = !!prev;
    return s;
  }

  /* ====================== ATHLETE PICKER ====================== */
  function renderPicker(mount) {
    var S = P.Store;
    var list = (S.db.athletes || []).filter(function (a) { return !a.archived; })
      .sort(function (a, b) {
        var la = S.latestSession(a.id), lb = S.latestSession(b.id);
        return (lb ? lb.date : '0').localeCompare(la ? la.date : '0');
      });

    var html = '<div class="pg-head"><h1 class="pg-title">New test</h1>' +
      '<p class="pg-sub">Pick an existing athlete, or register a new one. On a busy testing day use ' +
      '<b>Testing Day</b> instead — it keeps a queue and moves you straight from one athlete to the next.</p></div>';

    html += '<div class="btn-row" style="margin-bottom:16px">' +
      '<button class="btn btn-primary" id="ntNew">+ New athlete</button>' +
      '<button class="btn" id="ntEvent">Open Testing Day mode</button></div>';

    html += '<div class="searchbar"><input type="text" id="ntSearch" placeholder="Search athletes…"></div>';
    html += '<div id="ntList">' + pickerRows(list) + '</div>';
    mount.innerHTML = html;

    U.$('#ntNew', mount).addEventListener('click', function () {
      P.App.views.athletes.form(null);
    });
    U.$('#ntEvent', mount).addEventListener('click', function () { P.App.go('event'); });
    U.$('#ntSearch', mount).addEventListener('input', function (e) {
      var t = e.target.value.toLowerCase();
      U.$('#ntList', mount).innerHTML = pickerRows(list.filter(function (a) {
        return (a.name || '').toLowerCase().indexOf(t) > -1;
      }));
      bindPickerRows(mount);
    });
    bindPickerRows(mount);
  }

  function pickerRows(list) {
    if (!list.length) return U.empty('No athletes yet', 'Register an athlete to start testing.');
    var S = P.Store;
    return list.map(function (a) {
      var ss = S.sessionsFor(a.id);
      var last = ss.length ? ss[ss.length - 1] : null;
      return '<div class="q-item" data-pick="' + U.esc(a.id) + '">' +
        '<div class="q-num">' + (a.athleteNumber === null ? '–' : U.esc(String(a.athleteNumber))) + '</div>' +
        '<div><div class="q-name">' + U.esc(a.name) + '</div><div class="q-meta">' +
        U.esc(U.sportLabel(a.sport)) + ' · ' + (a.sex ? U.esc(U.sexLabel(a.sex)) : 'sex not set') +
        (last ? ' · last tested ' + U.date(last.date) : ' · never tested') + '</div></div>' +
        '<div class="q-meta">' + ss.length + ' session' + (ss.length === 1 ? '' : 's') + '</div>' +
        '<div class="badge badge-gold">' + (ss.length ? 'Retest' : 'Baseline') + '</div></div>';
    }).join('');
  }

  function bindPickerRows(mount) {
    U.$$('[data-pick]', mount).forEach(function (n) {
      n.addEventListener('click', function () {
        W = null;
        P.App.go('newtest', { athleteId: n.dataset.pick, sessionId: null, step: 0 });
      });
    });
  }

  /* ====================== WIZARD ====================== */
  function renderWizard(mount) {
    var S = P.Store, set = S.settings();
    var step = Math.max(0, Math.min(STEPS.length - 1, P.App.ctx.step || 0));
    P.Model.deriveSession(W);
    var issues = P.Validate.validateAll(W, A, set);

    var html = '<div class="btn-row" style="margin-bottom:12px">' +
      '<button class="btn btn-sm btn-ghost" id="wzExit">← Leave this session</button>' +
      '<span class="badge badge-gold">' + U.esc(A.name) + '</span>' +
      '<span class="badge badge-none">' + U.esc(W.protocolVersion) + '</span>' +
      (S.session(W.id) ? '<span class="badge badge-none">saved</span>' : '<span class="badge badge-warning">not yet saved</span>') +
      '</div>';

    /* step chips */
    html += '<div class="steps">';
    STEPS.forEach(function (st, i) {
      var done = i < step;
      html += '<button class="step-chip' + (i === step ? ' on' : (done ? ' done' : '')) +
        '" data-step="' + i + '" type="button"><span class="n">' + (done ? '✓' : (i + 1)) + '</span>' +
        U.esc(st.label) + '</button>';
    });
    html += '</div>';

    html += '<div id="wzBody"></div>';

    html += '<div class="wizard-nav">' +
      '<button class="btn" id="wzPrev"' + (step === 0 ? ' disabled' : '') + '>← Back</button>' +
      '<span class="save-state" id="wzSave"></span>' +
      (step === STEPS.length - 1
        ? '<button class="btn btn-primary" id="wzFinish">Save & generate report →</button>'
        : '<button class="btn btn-primary" id="wzNext">Next →</button>') +
      '</div>';

    mount.innerHTML = html;

    var body = U.$('#wzBody', mount);
    var st = STEPS[step];
    if (st.id === 'athlete') stepAthlete(body);
    else if (st.id === 'body') stepBody(body);
    else if (st.id === 'readiness') stepReadiness(body);
    else if (st.id === 'review') stepReview(body, issues);
    else stepCategory(body, st.category, issues);

    U.$('#wzExit', mount).addEventListener('click', function () {
      persist();
      W = null;
      P.App.go('athletes', { athleteId: A.id, sessionId: null });
    });
    U.$$('.step-chip', mount).forEach(function (b) {
      b.addEventListener('click', function () {
        persist();
        P.App.go('newtest', { step: parseInt(b.dataset.step, 10) });
      });
    });
    var pv = U.$('#wzPrev', mount);
    if (pv) pv.addEventListener('click', function () {
      persist(); P.App.go('newtest', { step: step - 1 });
    });
    var nx = U.$('#wzNext', mount);
    if (nx) nx.addEventListener('click', function () {
      persist(); P.App.go('newtest', { step: step + 1 });
    });
    var fn = U.$('#wzFinish', mount);
    if (fn) fn.addEventListener('click', function () {
      W.complete = true;
      persist(true);
      var id = W.id, aid = A.id;
      W = null;
      U.toast('Session saved');
      P.App.go('reports', { athleteId: aid, sessionId: id, compare: false });
    });
    U.bindTips(mount);
    showSaved();
  }

  function persist(now) {
    P.Model.deriveSession(W);
    P.Model.touchSession(W);
    var S = P.Store;
    var i = (S.db.sessions || []).findIndex(function (x) { return x.id === W.id; });
    if (i === -1) S.db.sessions.push(W); else S.db.sessions[i] = W;
    if (now) { S.saveNow(); P.App.saveState(true); showSaved(); }
    else S.autosave(function () { P.App.saveState(true); showSaved(); });
  }

  function showSaved() {
    var el = U.$('#wzSave');
    if (el) el.textContent = P.Store.lastError ? 'NOT SAVED — see Settings' : 'Auto-saved';
    if (el) el.className = 'save-state' + (P.Store.lastError ? '' : ' ok');
  }

  /* live field binding: writes straight into the working session */
  function bind(ctx) {
    U.$$('[data-bind]', ctx).forEach(function (n) {
      var path = n.dataset.bind;
      var ev = (n.tagName === 'SELECT' || n.type === 'checkbox' || n.type === 'date') ? 'change' : 'input';
      n.addEventListener(ev, function () {
        var v = n.type === 'checkbox' ? n.checked
              : (n.type === 'number' ? U.numVal(n) : n.value);
        setPath(W, path, v);
        /* Entering a value is the coach saying the test happened. The status
           chip updates visibly — nothing is changed behind their back. */
        var card = n.closest ? n.closest('.test-card') : null;
        if (card && v !== null && v !== '' && W.results[card.dataset.test] &&
            W.results[card.dataset.test].status === 'pending') {
          W.results[card.dataset.test].status = 'tested';
          var grp = card.querySelector('[data-status]');
          if (grp) {
            U.$$('.opt', grp).forEach(function (o) { o.classList.remove('on', 'on-warn'); });
            var hit = grp.querySelector('[data-v="tested"]');
            if (hit) hit.classList.add('on');
          }
          var hintEl = card.querySelector('.card-bd > .hint');
          if (hintEl) hintEl.remove();
        }
        persist();
        if (n.dataset.recalc !== undefined) refreshDerived(ctx);
      });
    });
  }

  function setPath(obj, path, value) {
    var parts = path.split('.'), o = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      var idx = k.match(/^(\w+)\[(\d+)\]$/);
      if (idx) { o = o[idx[1]][parseInt(idx[2], 10)]; }
      else { if (!o[k]) o[k] = {}; o = o[k]; }
    }
    var last = parts[parts.length - 1];
    var lidx = last.match(/^(\w+)\[(\d+)\]$/);
    if (lidx) o[lidx[1]][parseInt(lidx[2], 10)] = value;
    else o[last] = value;
  }

  /* recompute the "best" read-outs and validation messages in place */
  function refreshDerived(ctx) {
    P.Model.deriveSession(W);
    var issues = P.Validate.validateAll(W, A, P.Store.settings());
    U.$$('[data-derived]', ctx).forEach(function (n) {
      var parts = n.dataset.derived.split('|');
      var res = W.results[parts[0]];
      var m = P.Tests.metric(parts[0], parts[1]);
      var v = res && res.values ? res.values[parts[1]] : null;
      n.textContent = (v === null || v === undefined)
        ? '—' : U.fmt(v, m ? m.dp : 1, m ? m.unit : '');
    });
    U.$$('[data-issues]', ctx).forEach(function (n) {
      var testId = n.dataset.issues;
      n.innerHTML = issueHtml(issues.filter(function (i) { return i.scope === testId; }));
    });
  }

  function issueHtml(list) {
    if (!list.length) return '';
    return list.map(function (i) {
      var k = i.severity === 'error' ? 'critical' : (i.severity === 'verify' ? 'warning' : 'info');
      return U.notice(k, U.esc(i.message));
    }).join('');
  }

  /* ---------------- STEP 1: athlete ---------------- */
  function stepAthlete(m) {
    var S = P.Store, ss = S.sessionsFor(A.id).filter(function (s) { return s.id !== W.id; });
    var prev = ss.length ? ss[ss.length - 1] : null;
    var html = head('Step 1 — Athlete and session details',
      'Confirm who is being tested, who is testing them, and the date. The protocol version is stamped on the ' +
      'session automatically and cannot be changed retrospectively.');

    html += '<div class="card"><div class="card-bd"><div class="grid g2">' +
      f('Athlete', '<input type="text" value="' + U.esc(A.name) + '" disabled>') +
      f('Testing date', '<input type="date" data-bind="date" value="' + U.esc(W.date) + '">') +
      f('Gym', '<select data-bind="gymId">' + U.selectOpts((S.db.gyms || []).map(function (g) {
          return { id: g.id, label: g.name }; }), W.gymId, 'No gym') + '</select>') +
      f('Athlete\'s coach', '<input type="text" data-bind="coach" value="' + U.esc(W.coach) + '">') +
      f('Tester (who ran the battery)', '<input type="text" data-bind="tester" value="' + U.esc(W.tester) + '">',
        'Recorded because some measures — particularly the movement screen — are not comparable between assessors.') +
      f('Protocol version', '<input type="text" value="' + U.esc(W.protocolVersion) + '" disabled>',
        'Set in js/config/settings.js. Bump it whenever a protocol change makes results non-comparable.') +
      '</div>';

    if (prev) {
      html += U.notice('info', '<b>This is a retest.</b> Previous session: ' + U.date(prev.date) +
        ' under protocol ' + U.esc(prev.protocolVersion) + '. Body mass and equipment have been carried forward — ' +
        'check them, and keep the equipment identical if you want the comparison to mean anything.');
    }
    if (!A.sex) {
      html += U.notice('warning', '<b>This athlete has no sex recorded.</b> The results will be saved, but no ' +
        'percentile can be produced until it is set, because reference sets are sex-specific and are never substituted. ' +
        'Edit the athlete record from the Athletes page.');
    }
    html += '</div></div>';
    m.innerHTML = html;
    bind(m);
  }

  /* ---------------- STEP 2: body + equipment ---------------- */
  function stepBody(m) {
    var E = P.Settings.EQUIPMENT;
    var html = head('Step 2 — Body measurements and equipment',
      'Body mass is required: most metrics in this battery are expressed relative to it. Equipment is recorded so ' +
      'that results are only ever benchmarked against a reference set built on the same kind of kit, and so a retest ' +
      'can be checked for a change of machine.');

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Body measurements</span></div>' +
      '<div class="card-bd"><div class="grid g3">' +
      f('Body mass (kg)', '<input class="big" type="number" step="0.1" data-bind="bodyMassKg" data-recalc value="' +
        (W.bodyMassKg === null ? '' : W.bodyMassKg) + '">') +
      f('Height (cm)', '<input class="big" type="number" step="0.5" data-bind="heightCm" data-recalc value="' +
        (W.heightCm === null ? '' : W.heightCm) + '">') +
      f('Age at test', '<input class="big" type="number" data-bind="ageAtTest" data-recalc value="' +
        (W.ageAtTest === null ? '' : W.ageAtTest) + '">') +
      '</div>' +
      '<div class="best-out"><span class="k">BMI (recorded, not interpreted)</span>' +
      '<span class="v" id="bmiOut">' + (W.bmi === null ? '—' : U.fmt(W.bmi, 1)) + '</span></div>' +
      '<div class="fineprint" style="margin-top:8px">BMI is stored for the record only. It is not interpreted ' +
      'anywhere in this app and no conclusion is drawn from it — it is a poor descriptor of muscular combat athletes.</div>' +
      '<div data-issues="session" style="margin-top:12px"></div>' +
      '</div></div>';

    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Equipment used today</span>' +
      '<span class="card-note">recorded on every session</span></div><div class="card-bd"><div class="grid g2">' +
      f('Jump measurement device', '<select data-bind="equipment.jumpDevice">' +
        U.selectOpts(E.jumpDevice, W.equipment.jumpDevice) + '</select>',
        'Force plates, jump mats and phone apps produce systematically different heights.') +
      f('Sprint timing device', '<select data-bind="equipment.timingDevice">' +
        U.selectOpts(E.timingDevice, W.equipment.timingDevice) + '</select>') +
      f('Sprint timing method', '<select data-bind="equipment.timingMethod">' +
        U.selectOpts(E.timingMethod, W.equipment.timingMethod) + '</select>',
        'Hand-timed sprints are recorded but never benchmarked — stopwatch error is larger than the gap between performance levels.') +
      f('Air bike', '<select data-bind="equipment.airBike">' +
        U.selectOpts(E.airBike, W.equipment.airBike) + '</select>',
        'Bike results are only benchmarked against a reference set for the same machine family.') +
      f('Trap bar', '<select data-bind="equipment.trapBar">' +
        U.selectOpts(E.trapBar, W.equipment.trapBar) + '</select>') +
      f('Trap-bar mass (kg)', '<input type="number" step="0.5" data-bind="equipment.trapBarMassKg" value="' +
        (W.equipment.trapBarMassKg === null ? '' : W.equipment.trapBarMassKg) + '">',
        'Trap bars range from about 25 kg to 32 kg. Include it in the load you enter for the lift.') +
      f('Bench', '<select data-bind="equipment.bench">' + U.selectOpts(E.bench, W.equipment.bench) + '</select>') +
      f('Bar mass for bench (kg)', '<input type="number" step="0.5" data-bind="equipment.benchBarMassKg" value="' +
        (W.equipment.benchBarMassKg === null ? '' : W.equipment.benchBarMassKg) + '">') +
      f('Chin-up bar', '<select data-bind="equipment.pullUpBar">' +
        U.selectOpts(E.pullUpBar, W.equipment.pullUpBar) + '</select>') +
      f('Bike seat position', '<input type="text" data-bind="equipment.seatPosition" value="' +
        U.esc(W.equipment.seatPosition) + '" placeholder="e.g. Seat post 4, handle 2">',
        'Write it down. A different seat height changes the power output at retest.') +
      '</div>' +
      f('Equipment notes', '<textarea data-bind="equipment.notes">' + U.esc(W.equipment.notes) + '</textarea>') +
      '</div></div>';

    m.innerHTML = html;
    bind(m);
    m.addEventListener('input', function () {
      P.Model.deriveSession(W);
      var o = U.$('#bmiOut', m);
      if (o) o.textContent = W.bmi === null ? '—' : U.fmt(W.bmi, 1);
      refreshDerived(m);
    });
    refreshDerived(m);
  }

  /* ---------------- STEP 3: readiness ---------------- */
  function stepReadiness(m) {
    var R = P.Settings.READINESS;
    var html = head('Step 3 — Pre-test readiness checklist',
      'Used to decide whether a test proceeds, is modified, or is recorded as NOT TESTED. It is not a medical ' +
      'assessment and it provides no medical clearance.');

    html += '<div class="card"><div class="card-bd">';
    html += U.notice('plain', U.esc(R.disclaimer));
    html += '<div style="margin-top:16px">';
    R.items.forEach(function (it) {
      var cur = (W.readiness.answers || {})[it.key] || '';
      html += '<div class="field" style="margin-bottom:12px"><label>' + U.esc(it.label) +
        (it.documentOnly ? ' <span class="badge badge-none">record only</span>' : '') + '</label>' +
        '<div class="opts" data-rk="' + U.esc(it.key) + '">' +
        ['no', 'yes'].map(function (v) {
          var warn = it.flagIfYes && v === 'yes';
          return '<label class="opt' + (cur === v ? (warn ? ' on-warn' : ' on') : '') + '" data-v="' + v + '">' +
            '<input type="radio" name="rk_' + U.esc(it.key) + '" value="' + v + '"' +
            (cur === v ? ' checked' : '') + '>' + (v === 'yes' ? 'Yes' : 'No') + '</label>';
        }).join('') + '</div></div>';
    });
    html += '</div>';
    html += f('Readiness notes (caffeine amount and timing, what was reported, what was restricted)',
      '<textarea data-bind="readiness.notes">' + U.esc(W.readiness.notes) + '</textarea>');
    html += '<div id="readyFlag">' + readyFlagHtml() + '</div>';
    html += '</div></div>';

    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Protocol confirmation</span></div><div class="card-bd">' +
      '<label class="check"><input type="checkbox" data-bind="protocolConfirmed"' +
      (W.protocolConfirmed ? ' checked' : '') + '><span><b>I confirm the PGP testing protocol was followed.</b> ' +
      'Testing order, warm-up, rest periods, attempt counts, footwear, surface and equipment as written in the ' +
      'Protocol section. Where anything differed, it is recorded in the session notes.</span></label>' +
      f('Session notes', '<textarea data-bind="notes" style="margin-top:14px">' + U.esc(W.notes) + '</textarea>') +
      f('Injury / availability notes',
        '<textarea data-bind="injuryNotes">' + U.esc(W.injuryNotes) + '</textarea>',
        'Record what the athlete reported and what you did about it. Do not record a diagnosis — refer instead.') +
      '</div></div>';

    m.innerHTML = html;
    bind(m);
    U.$$('[data-rk] .opt', m).forEach(function (lab) {
      lab.addEventListener('click', function () {
        var key = lab.parentNode.dataset.rk;
        W.readiness.answers[key] = lab.dataset.v;
        W.readiness.flagged = P.Model.readinessFlagged(W);
        persist();
        U.$$('.opt', lab.parentNode).forEach(function (o) { o.classList.remove('on', 'on-warn'); });
        var item = P.Settings.READINESS.items.filter(function (x) { return x.key === key; })[0];
        lab.classList.add(item && item.flagIfYes && lab.dataset.v === 'yes' ? 'on-warn' : 'on');
        U.$('#readyFlag', m).innerHTML = readyFlagHtml();
      });
    });
  }

  function readyFlagHtml() {
    if (!P.Model.readinessFlagged(W)) return '';
    return '<div style="margin-top:14px">' + U.notice('warning',
      '<b>' + U.esc(P.Settings.READINESS.flagMessage) + '</b>') + '</div>';
  }

  /* ---------------- STEPS 4-10: test categories ---------------- */
  function stepCategory(m, catId, issues) {
    var cat = P.Tests.category(catId);
    var tests = P.Tests.byCategory(catId);
    var html = head('Step — ' + cat.name, cat.blurb);

    tests.forEach(function (t) { html += testCard(t, issues); });
    m.innerHTML = html;
    bind(m);
    wireTestCards(m);
    refreshDerived(m);
  }

  function testCard(t, issues) {
    var r = W.results[t.id];
    var skipped = r.status === 'not_tested';
    var html = '<div class="card test-card' + (skipped ? ' skipped' : '') + '" data-test="' + t.id +
      '" style="margin-bottom:16px"><div class="card-hd"><span class="card-ttl">' + U.esc(t.name) +
      (t.optional ? ' <span class="badge badge-none">optional</span>' : '') + '</span>' +
      '<span class="card-note"><span data-tip="' + U.esc(t.evidence.whatItMeasures + ' — ' + t.evidence.limitations) +
      '" style="cursor:help;text-decoration:underline dotted">what this measures</span></span></div>' +
      '<div class="card-bd">';

    /* status selector — nothing is preselected while the test is pending */
    html += '<div class="opts" data-status="' + t.id + '" style="margin-bottom:8px">' +
      [['tested', 'Tested'], ['incomplete', 'Started but not completed'], ['not_tested', 'Not tested']]
        .map(function (o) {
          return '<label class="opt' + (r.status === o[0] ? (o[0] === 'tested' ? ' on' : ' on-warn') : '') +
            '" data-v="' + o[0] + '"><input type="radio" name="st_' + t.id + '"' +
            (r.status === o[0] ? ' checked' : '') + '>' + o[1] + '</label>';
        }).join('') + '</div>';
    if (r.status === 'pending') {
      html += '<div class="hint" style="margin-bottom:12px">Enter a result below and this is marked as tested ' +
        'automatically. If the test was not performed, choose <b>Not tested</b> and give the reason — a missing test ' +
        'is never scored as zero and never counts against the athlete.</div>';
    }

    if (skipped) {
      html += '<div class="nt-block" style="border-top:0;padding-top:0">' +
        f('Why was this test not performed?', '<select data-bind="results.' + t.id + '.reason">' +
          U.selectOpts(P.Settings.NOT_TESTED_REASONS, r.reason, 'Select a reason…') + '</select>',
          'Missing data is never scored as zero and never counts against the athlete. The reason is printed on the report.') +
        f('Note', '<textarea data-bind="results.' + t.id + '.notes">' + U.esc(r.notes) + '</textarea>') +
        '</div></div></div>';
      return html;
    }

    html += '<div class="test-inputs">' + testInputs(t, r) + '</div>';
    html += f('Test notes', '<textarea data-bind="results.' + t.id + '.notes">' + U.esc(r.notes) + '</textarea>');
    html += '<div data-issues="' + t.id + '">' +
      issueHtml((issues || []).filter(function (i) { return i.scope === t.id; })) + '</div>';
    html += '</div></div>';
    return html;
  }

  function testInputs(t, r) {
    var html = '';

    /* attempt grid, where the test has one */
    if (t.attempts > 1 && t.attemptMetric) {
      var m = P.Tests.metric(t.id, t.attemptMetric);
      if (!r.attempts[t.attemptMetric]) r.attempts[t.attemptMetric] = [];
      while (r.attempts[t.attemptMetric].length < t.attempts) r.attempts[t.attemptMetric].push(null);
      html += '<label class="lbl">' + U.esc(m.label) + ' — ' + t.attempts + ' attempts (' +
        (m.unit || '') + ')</label><div class="attempts">';
      for (var i = 0; i < t.attempts; i++) {
        html += '<div><div class="attempt-lbl">Attempt ' + (i + 1) + '</div>' +
          '<input class="big" type="number" step="any" data-recalc data-bind="results.' + t.id +
          '.attempts.' + t.attemptMetric + '[' + i + ']" value="' +
          (r.attempts[t.attemptMetric][i] === null ? '' : r.attempts[t.attemptMetric][i]) + '"></div>';
      }
      html += '</div><div class="best-out"><span class="k">Best (' +
        (m.direction === 'low' ? 'lowest' : 'highest') + ') — used for benchmarking</span>' +
        '<span class="v" data-derived="' + t.id + '|' + t.attemptMetric + '">—</span></div>';
    }

    /* per-test bespoke inputs */
    if (t.id === 'cmj') {
      html += '<div class="grid g3" style="margin-top:14px">' +
        num(t, 'flight_time_s', r, 'Optional. If height is not recorded, it is derived from flight time.') +
        num(t, 'contact_time_s', r, 'Only if the device reports it.') +
        '</div>' + derivedRow(t, r, ['rsi_mod', 'peak_power_w']);
    } else if (t.id === 'sl_broad_jump') {
      html += '<div class="grid g2">' + num(t, 'left_cm', r, 'Test the left leg first, every time.') +
        num(t, 'right_cm', r) + '</div>' + derivedRow(t, r, ['best_cm', 'asymmetry_pct']);
    } else if (t.id === 'mb_throw') {
      html += '<div class="field"><label>Medicine-ball mass (kg)</label><div class="opts" data-ball="' + t.id + '">' +
        P.Settings.EQUIPMENT.medBall.map(function (kg) {
          return '<label class="opt' + (Number(r.raw.ball_mass_kg) === kg ? ' on' : '') + '" data-v="' + kg + '">' +
            kg + ' kg</label>';
        }).join('') + '</div>' +
        '<div class="hint">PGP default: 4 kg male, 3 kg female. Throws with different ball masses are NOT ' +
        'comparable, and a mass with no reference set produces no percentile rather than a wrong one.</div></div>' +
        '<div class="grid g2">' + num(t, 'left_cm', r) + num(t, 'right_cm', r) + '</div>' +
        derivedRow(t, r, ['best_cm', 'asymmetry_pct']);
    } else if (t.id === 'sprint_10m') {
      html += '<div class="grid g2" style="margin-top:14px">' +
        num(t, 'time_20m_s', r, 'Optional — only if the space allows.') +
        num(t, 'time_30m_s', r, 'Optional.') + '</div>';
    } else if (t.id === 'trapbar' || t.id === 'bench') {
      html += '<div class="grid g2">' +
        num(t, 'load_kg', r, 'Include the bar mass.') +
        num(t, 'reps', r, 'PGP default is a 3RM. A 1RM is not required and is not recommended for an athlete without demonstrated competence under load.') +
        '</div>' + derivedRow(t, r, ['est_1rm_kg', 'rel_1rm']) +
        (t.id === 'trapbar' ? '<div class="field" style="margin-top:12px"><label>Technique status</label>' +
          '<select data-bind="results.trapbar.raw.technique">' + U.selectOpts([
            { id: 'competent', label: 'Competent — tested under load' },
            { id: 'developing', label: 'Developing — load limited deliberately' },
            { id: 'not_competent', label: 'Not competent — do not load; mark NOT TESTED' }
          ], r.raw.technique, 'Select…') + '</select></div>' : '') +
        U.notice('info', '<b>Estimated 1RM, not a tested 1RM.</b> Calculated with the Epley equation ' +
          '(load × (1 + reps/30)). The Brzycki estimate is shown alongside it on the report so you can see the spread. ' +
          'No estimate is produced above 12 repetitions, because the prediction error becomes larger than the thing being measured.');
    } else if (t.id === 'chinup') {
      html += '<div class="grid g2">' + num(t, 'reps', r,
        'Valid repetitions only: dead hang to full elbow extension, chin clearly above the bar, no kipping. The first invalid rep ends the test.') +
        '</div>' + derivedRow(t, r, ['work_kg_reps']) +
        U.notice('info', 'Chin-ups are benchmarked against a <b>body-mass-banded</b> reference set, not divided by ' +
          'body mass. A 95 kg athlete doing 10 reps is not weaker than a 65 kg athlete doing 15 — dividing reps by ' +
          'body mass would be physiologically meaningless.');
    } else if (t.id === 'weighted_chinup') {
      html += '<div class="grid g2">' + num(t, 'added_kg', r, 'Load hung from a dipping belt for the PGP default.') +
        num(t, 'reps', r, 'PGP default is a 3RM.') + '</div>' +
        derivedRow(t, r, ['system_mass_kg', 'rel_system_mass']) +
        U.notice('info', 'Reported and benchmarked <b>separately</b> from bodyweight chin-ups — the two are never pooled.');
    } else if (t.id === 'bike_12min') {
      html += '<div class="grid g3">' +
        num(t, 'mean_watts', r, 'AVERAGE watts for the 12 minutes, not peak.') +
        num(t, 'total_work_kj', r, 'Optional. If average watts is blank, it is back-calculated from this.') +
        num(t, 'calories', r, 'Console calories. Not comparable between machines.') +
        num(t, 'mean_hr', r) + num(t, 'peak_hr', r) +
        '</div>' + derivedRow(t, r, ['w_per_kg', 'total_work_kj']) +
        U.notice('warning', '<b>This is not a VO2max test.</b> No oxygen uptake is measured and none is estimated. ' +
          'It is a measure of sustained power output on a specific machine, and it is only comparable with results ' +
          'from the same machine family.');
    } else if (t.id === 'bike_30s') {
      html += '<div class="grid g3">' +
        num(t, 'peak_watts', r) + num(t, 'mean_watts', r) +
        num(t, 'min_watts', r, 'Only if the console reports it. Without it, the fatigue index is reported as not computable rather than substituted.') +
        '</div>' + derivedRow(t, r, ['peak_w_per_kg', 'mean_w_per_kg', 'total_work_kj', 'fatigue_index_pct']);
    } else if (t.id === 'bike_repeated') {
      html += repeatedInputs(t, r);
    } else if (t.id === 'movement_screen') {
      html += movementInputs(t, r);
    }
    return html;
  }

  function num(t, key, r, hint) {
    var m = P.Tests.metric(t.id, key);
    if (!m) return '';
    var v = r.raw[key];
    return '<div class="field"><label>' + U.esc(m.label) + (m.unit ? ' (' + U.esc(m.unit) + ')' : '') + '</label>' +
      '<input class="big" type="number" step="any" data-recalc data-bind="results.' + t.id + '.raw.' + key +
      '" value="' + (v === null || v === undefined ? '' : v) + '">' +
      (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + '</div>';
  }

  function derivedRow(t, r, keys) {
    return '<div style="margin-top:12px">' + keys.map(function (k) {
      var m = P.Tests.metric(t.id, k);
      if (!m) return '';
      return '<div class="best-out" style="margin-top:8px"><span class="k">' + U.esc(m.label) +
        (m.role === 'primary' ? ' — benchmarked' : '') + '</span>' +
        '<span class="v" data-derived="' + t.id + '|' + k + '">—</span></div>';
    }).join('') + '</div>';
  }

  function repeatedInputs(t, r) {
    var cfg = r.config || t.defaultConfig;
    var isDefault = JSON.stringify(cfg) === JSON.stringify(t.defaultConfig);
    var html = '<div class="card" style="background:var(--surface-2);margin-bottom:14px"><div class="card-bd tight">' +
      '<label class="lbl">Protocol configuration</label><div class="grid g3">' +
      '<div class="field"><label>Sprints</label><input type="number" id="rsN" value="' + cfg.sprints + '"></div>' +
      '<div class="field"><label>Work (s)</label><input type="number" id="rsW" value="' + cfg.workS + '"></div>' +
      '<div class="field"><label>Recovery (s)</label><input type="number" id="rsR" value="' + cfg.recoveryS + '"></div>' +
      '</div>' +
      (isDefault
        ? '<div class="fineprint">PGP default protocol: ' + t.defaultConfig.sprints + ' × ' +
          t.defaultConfig.workS + ' s with ' + t.defaultConfig.recoveryS + ' s recovery.</div>'
        : U.notice('warning', '<b>Non-default protocol.</b> This is a DIFFERENT TEST from the PGP default of ' +
          t.defaultConfig.sprints + ' × ' + t.defaultConfig.workS + ' s / ' + t.defaultConfig.recoveryS +
          ' s. The configuration is stored with the result, and it will not be benchmarked against, or compared with, ' +
          'the default protocol.')) +
      '</div></div>';

    html += '<label class="lbl">Every sprint — peak and average watts</label>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sprint</th><th>Peak W</th><th>Average W</th></tr></thead><tbody>';
    (r.sprints || []).forEach(function (s, i) {
      html += '<tr><td><b>S' + (i + 1) + '</b></td>' +
        '<td><input type="number" step="any" data-recalc data-bind="results.bike_repeated.sprints[' + i +
        '].peak_watts" value="' + (s.peak_watts === null || s.peak_watts === undefined ? '' : s.peak_watts) + '"></td>' +
        '<td><input type="number" step="any" data-recalc data-bind="results.bike_repeated.sprints[' + i +
        '].mean_watts" value="' + (s.mean_watts === null || s.mean_watts === undefined ? '' : s.mean_watts) + '"></td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="fineprint" style="margin-top:8px">Average watts drives the benchmarked metrics. The ' +
      'decrement score is only computed when the whole configured set is recorded — a decrement from a partial set ' +
      'is not comparable with anything.</div>';
    html += derivedRow(t, r, ['mean_mean_w_per_kg', 'decrement_pct', 'total_work_kj', 'best_worst_pct', 'slope_w_per_sprint']);
    html += '<div id="rsChart" style="margin-top:14px"></div>';
    return html;
  }

  function movementInputs(t, r) {
    var scale = t.scoreScale;
    var html = U.notice('warning', '<b>' + U.esc(P.Store.settings().movement.disclaimer) + '</b>');
    html += f('Assessor', '<input type="text" data-bind="results.movement_screen.assessor" value="' +
      U.esc(r.assessor) + '">', 'Required for the retest comparison to mean anything — these scores are not comparable between assessors.');
    html += '<div class="fineprint" style="margin:10px 0 14px">' +
      scale.map(function (s) { return '<b>' + s.value + '</b> = ' + U.esc(s.label) + ' — ' + U.esc(s.desc); }).join('<br>') +
      '<br><br>Leave an item <b>blank</b> if it was not assessed. A blank item is excluded from the calculation ' +
      'entirely; it is never counted as zero.</div>';
    html += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Score</th></tr></thead><tbody>';
    (t.items || []).forEach(function (it) {
      var cur = (r.items || {})[it.key];
      html += '<tr><td>' + U.esc(it.label) + (it.note ? '<br><span class="fineprint">' + U.esc(it.note) + '</span>' : '') +
        '</td><td><div class="opts" data-mv="' + U.esc(it.key) + '">' +
        scale.map(function (s) {
          return '<label class="opt' + (cur === s.value ? ' on' : '') + '" data-v="' + s.value +
            '" title="' + U.esc(s.desc) + '">' + s.value + '</label>';
        }).join('') +
        '<label class="opt' + (cur === null || cur === undefined ? ' on-warn' : '') +
        '" data-v="">n/a</label>' +
        '</div></td></tr>';
    });
    html += '</tbody></table></div>';
    html += derivedRow(t, r, ['score_pct']);
    return html;
  }

  function wireTestCards(m) {
    /* status radios */
    U.$$('[data-status]', m).forEach(function (grp) {
      var testId = grp.dataset.status;
      U.$$('.opt', grp).forEach(function (lab) {
        lab.addEventListener('click', function () {
          W.results[testId].status = lab.dataset.v;
          if (lab.dataset.v !== 'not_tested') W.results[testId].reason = null;
          persist();
          P.App.render();
        });
      });
    });
    /* med ball mass */
    U.$$('[data-ball]', m).forEach(function (grp) {
      U.$$('.opt', grp).forEach(function (lab) {
        lab.addEventListener('click', function () {
          W.results.mb_throw.raw.ball_mass_kg = parseFloat(lab.dataset.v);
          U.$$('.opt', grp).forEach(function (o) { o.classList.remove('on'); });
          lab.classList.add('on');
          persist(); refreshDerived(m);
        });
      });
    });
    /* movement items */
    U.$$('[data-mv]', m).forEach(function (grp) {
      var key = grp.dataset.mv;
      U.$$('.opt', grp).forEach(function (lab) {
        lab.addEventListener('click', function () {
          var v = lab.dataset.v;
          if (!W.results.movement_screen.items) W.results.movement_screen.items = {};
          if (v === '') delete W.results.movement_screen.items[key];
          else W.results.movement_screen.items[key] = parseInt(v, 10);
          U.$$('.opt', grp).forEach(function (o) { o.classList.remove('on', 'on-warn'); });
          lab.classList.add(v === '' ? 'on-warn' : 'on');
          persist(); refreshDerived(m);
        });
      });
    });
    /* repeated-sprint configuration */
    var rsN = U.$('#rsN', m);
    if (rsN) {
      var apply = function () {
        var r = W.results.bike_repeated;
        var n = Math.max(2, Math.min(12, parseInt(U.$('#rsN', m).value, 10) || 6));
        r.config = { sprints: n, workS: U.numVal(U.$('#rsW', m)) || 15,
                     recoveryS: U.numVal(U.$('#rsR', m)) || 45 };
        while (r.sprints.length < n) r.sprints.push({ peak_watts: null, mean_watts: null });
        r.sprints.length = n;
        persist();
        P.App.render();
      };
      [rsN, U.$('#rsW', m), U.$('#rsR', m)].forEach(function (n) {
        if (n) n.addEventListener('change', apply);
      });
      drawSprintChart(m);
    }
    m.addEventListener('input', function () { drawSprintChart(m); });
  }

  function drawSprintChart(m) {
    var mount = U.$('#rsChart', m);
    if (!mount) return;
    var r = W.results.bike_repeated;
    P.Charts.sprintProfile(mount, r.sprints || [], r.config || P.Tests.get('bike_repeated').defaultConfig);
  }

  /* ---------------- STEP 11: review ---------------- */
  function stepReview(m, issues) {
    var set = P.Store.settings();
    var as = P.Engine.assessSession(W, A, P.Store.db, set);
    var sum = P.Validate.summary(issues);

    var html = head('Step 11 — Review and generate',
      'Check what was and was not tested, resolve anything flagged, then save and generate the report.');

    html += '<div class="grid g4" style="margin-bottom:16px">' +
      tile('Tests completed', P.Tests.TESTS.filter(function (t) {
        return W.results[t.id].status === 'tested'; }).length + ' / ' + P.Tests.TESTS.length) +
      tile('Metrics benchmarked', as.coverage.scored + ' / ' + as.coverage.total) +
      tile('To fix', sum.error || 0, sum.error ? 'blocking benchmarking' : 'nothing blocking') +
      tile('To verify', sum.verify || 0, sum.verify ? 'excluded from strengths & priorities' : 'all values plausible') +
      '</div>';

    if (sum.error) {
      html += U.notice('critical', '<b>' + sum.error + ' value' + (sum.error === 1 ? '' : 's') +
        ' need' + (sum.error === 1 ? 's' : '') + ' fixing.</b> These are outside the physically possible range or ' +
        'internally contradictory. They are saved exactly as entered — nothing has been corrected — but they are not ' +
        'benchmarked until resolved. Go back to the relevant step to check them.');
    }
    /* a test marked tested but carrying no result is a data-entry slip */
    var emptyTested = P.Tests.TESTS.filter(function (t) {
      var r = W.results[t.id];
      if (r.status !== 'tested') return false;
      return t.metrics.filter(function (m) { return m.role === 'primary'; })
        .every(function (m) {
          var v = r.values ? r.values[m.key] : null;
          return v === null || v === undefined;
        });
    });
    if (emptyTested.length) {
      html += U.notice('warning', '<b>' + emptyTested.length + ' test' +
        (emptyTested.length === 1 ? ' is' : 's are') + ' marked as tested but carry no result:</b> ' +
        emptyTested.map(function (t) { return U.esc(t.shortName); }).join(', ') +
        '. Enter the result, or mark the test as <b>Not tested</b> with a reason. Nothing has been assumed.');
    }
    var pending = P.Tests.TESTS.filter(function (t) { return W.results[t.id].status === 'pending'; });
    if (pending.length) {
      html += U.notice('info', '<b>' + pending.length + ' test' +
        (pending.length === 1 ? ' has' : 's have') + ' no result recorded:</b> ' +
        pending.map(function (t) { return U.esc(t.shortName); }).join(', ') +
        '. They are reported as not tested. Give each one a reason if you want the report to say why.');
    }
    if (!W.protocolConfirmed) {
      html += U.notice('warning', '<b>The protocol has not been confirmed as followed.</b> The session will be ' +
        'saved and marked as non-standardised. Confirm it on Step 3 if the battery was run as written.');
    }

    /* coverage table */
    html += '<div class="card"><div class="card-hd"><span class="card-ttl">What was tested</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Test</th><th>Status</th><th>Primary result</th>' +
      '<th>Benchmark</th></tr></thead><tbody>';
    P.Tests.orderedTests().forEach(function (t) {
      var r = W.results[t.id];
      var prim = t.metrics.filter(function (x) { return x.role === 'primary'; });
      var sc = as.metricScores.filter(function (x) { return x.testId === t.id; });
      var statusBadge = r.status === 'tested' ? '<span class="badge badge-good">tested</span>'
        : r.status === 'incomplete' ? '<span class="badge badge-warning">incomplete</span>'
        : r.status === 'pending' ? '<span class="badge badge-none">no result recorded</span>'
        : '<span class="badge badge-none">not tested</span>';
      var resultTxt = prim.map(function (mm) {
        var v = r.values ? r.values[mm.key] : null;
        return (v === null || v === undefined) ? null : U.fmt(v, mm.dp, mm.unit);
      }).filter(Boolean).join(' · ') || '—';
      var benchTxt = sc.map(function (x) {
        if (x.status === 'scored') return U.ord(x.displayPercentile) +
          (x.scoreType === 'criterion' ? ' (criterion)' : '');
        if (x.status === 'insufficient') return '<span class="badge badge-warning">no reference</span>';
        if (x.status === 'flagged') return '<span class="badge badge-critical">verify value</span>';
        return '—';
      }).join(' ');
      html += '<tr><td>' + U.esc(t.name) + '</td><td>' + statusBadge +
        (r.reason ? ' <span class="fineprint">' + U.esc(P.Engine.reasonLabel(r.reason)) + '</span>' : '') +
        '</td><td class="num">' + resultTxt + '</td><td>' + benchTxt + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    /* profile preview */
    html += '<div class="grid g21" style="margin-top:16px">' +
      '<div class="card"><div class="card-hd"><span class="card-ttl">Profile preview</span></div>' +
      '<div class="card-bd"><div id="wzRadar"></div></div></div>' +
      '<div class="card"><div class="card-hd"><span class="card-ttl">Category scores</span></div>' +
      '<div class="card-bd">';
    as.categoryScores.forEach(function (c) {
      html += U.percentileBar({
        label: c.categoryName, sub: c.status === 'scored' ? 'from ' + c.n + ' test' + (c.n === 1 ? '' : 's') : null,
        percentile: c.status === 'scored' ? c.percentile : null,
        displayPercentile: c.displayPercentile, level: c.level, scoreType: c.scoreType,
        emptyText: 'Insufficient data', tip: c.status === 'scored' ? c.method : c.reason
      });
    });
    html += U.levelLegend(set) + '</div></div></div>';

    /* all issues */
    if (issues.length) {
      html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
        '<span class="card-ttl">Everything flagged on this session</span>' +
        '<span class="card-note">' + issues.length + ' item' + (issues.length === 1 ? '' : 's') + '</span></div>' +
        '<div class="card-bd">' + issueHtml(issues) + '</div></div>';
    }

    m.innerHTML = html;
    var cats = as.categoryScores.map(function (c) {
      return {
        label: c.short, value: c.status === 'scored' ? c.percentile : null,
        display: c.displayPercentile, level: c.level, scoreType: c.scoreType,
        sub: c.status === 'scored' ? c.categoryName : c.reason
      };
    });
    P.Charts.radar(U.$('#wzRadar', m), {
      series: [{ name: A.name, points: cats, color: 'var(--gold)' }],
      ariaLabel: 'Category percentile profile'
    });
  }

  function tile(l, v, s) {
    return '<div class="stat"><div class="stat-lbl">' + U.esc(l) + '</div><div class="stat-val num">' +
      U.esc(String(v)) + '</div>' + (s ? '<div class="stat-sub">' + U.esc(s) + '</div>' : '') + '</div>';
  }
  function head(t, s) {
    return '<div class="pg-head"><h1 class="pg-title">' + U.esc(t) + '</h1>' +
      '<p class="pg-sub">' + U.esc(s) + '</p></div>';
  }
  function f(label, control, hint) {
    return '<div class="field"><label>' + U.esc(label) + '</label>' + control +
      (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.newtest = { render: render, STEPS: STEPS,
    startFor: function (athleteId) { W = null; P.App.go('newtest', { athleteId: athleteId, sessionId: null, step: 0 }); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
