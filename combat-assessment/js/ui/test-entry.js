/* ==========================================================================
   js/ui/test-entry.js — DATA-ENTRY CONTROLS FOR THE TESTING SCREEN
   --------------------------------------------------------------------------
   The input fields for each test, the kit/readiness block, and the wiring
   that saves every keystroke. Split out of test.js only so neither file is
   a thousand lines.

   Entry rules that matter on a gym floor:
     * a value typed anywhere marks that test as tested — no extra tap
     * "best of" updates as you type
     * nothing is hidden behind a step you have to click through
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;
  var V = P.App.views.test;

  /* ---------------- kit, readiness, notes ---------------- */
  V.kitHtml = function (W) {
    var E = P.Settings.EQUIPMENT, R = P.Settings.READINESS;
    var html = '<div class="grid g2">' +
      V.fld('Jump device', '<select data-bind="equipment.jumpDevice">' +
        U.selectOpts(E.jumpDevice, W.equipment.jumpDevice) + '</select>') +
      V.fld('Sprint timing', '<select data-bind="equipment.timingMethod">' +
        U.selectOpts(E.timingMethod, W.equipment.timingMethod) + '</select>',
        'Hand-timed sprints are recorded but never benchmarked.') +
      V.fld('Air bike', '<select data-bind="equipment.airBike">' +
        U.selectOpts(E.airBike, W.equipment.airBike) + '</select>',
        'Bike results only score against a reference set for the same machine.') +
      V.fld('Trap-bar mass (kg)', '<input type="number" step="0.5" data-bind="equipment.trapBarMassKg" value="' +
        (W.equipment.trapBarMassKg === null ? '' : W.equipment.trapBarMassKg) + '">',
        'Include it in the load you enter for the lift.') +
      V.fld('Bike seat position', '<input type="text" data-bind="equipment.seatPosition" value="' +
        U.esc(W.equipment.seatPosition) + '" placeholder="e.g. post 4, handle 2">',
        'Write it down or the retest is not comparable.') +
      V.fld('Chin-up bar', '<select data-bind="equipment.pullUpBar">' +
        U.selectOpts(E.pullUpBar, W.equipment.pullUpBar) + '</select>') +
      '</div>';

    html += '<div class="eyebrow" style="margin:18px 0 8px">Readiness</div>' +
      '<div class="fineprint" style="margin-bottom:10px">Anything ticked means a test may need modifying or ' +
      'skipping. It is not a medical assessment and gives no clearance.</div>';
    R.items.filter(function (i) { return i.flagIfYes; }).forEach(function (it) {
      var on = (W.readiness.answers || {})[it.key] === 'yes';
      html += '<label class="check" style="padding:5px 0"><input type="checkbox" data-ready="' + U.esc(it.key) +
        '"' + (on ? ' checked' : '') + '><span>' + U.esc(it.label) + '</span></label>';
    });

    html += '<div style="margin-top:14px">' +
      V.fld('Notes for this athlete', '<textarea data-bind="notes">' + U.esc(W.notes) + '</textarea>') +
      V.fld('Injury / availability', '<textarea data-bind="injuryNotes">' + U.esc(W.injuryNotes) + '</textarea>',
        'What they reported and what you did. Not a diagnosis — refer instead.') +
      '<label class="check" style="margin-top:6px"><input type="checkbox" data-bind="protocolConfirmed"' +
      (W.protocolConfirmed ? ' checked' : '') + '><span>The PGP protocol was followed for this athlete.</span></label>' +
      '</div>';
    return html;
  };

  /* ---------------- per-test inputs ---------------- */
  V.inputs = function (t, r) {
    var html = '';

    /* attempts, inline */
    if (t.attempts > 1 && t.attemptMetric) {
      var m = P.Tests.metric(t.id, t.attemptMetric);
      if (!r.attempts[t.attemptMetric]) r.attempts[t.attemptMetric] = [];
      while (r.attempts[t.attemptMetric].length < t.attempts) r.attempts[t.attemptMetric].push(null);
      html += '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">';
      for (var i = 0; i < t.attempts; i++) {
        html += '<div style="flex:1 1 84px;min-width:78px;max-width:150px">' +
          '<div class="attempt-lbl">' + (i === 0 ? U.esc(m.label) + ' 1' : String(i + 1)) + '</div>' +
          '<input class="big" type="number" step="any" data-recalc data-bind="results.' + t.id +
          '.attempts.' + t.attemptMetric + '[' + i + ']" value="' +
          (r.attempts[t.attemptMetric][i] === null ? '' : r.attempts[t.attemptMetric][i]) + '"></div>';
      }
      html += '<div style="flex:1 1 120px;min-width:110px;max-width:180px">' +
        '<div class="attempt-lbl">Best (' + U.esc(m.unit || '') + ')</div>' +
        '<div class="best-out" style="margin:0;justify-content:center">' +
        '<span class="v" data-derived="' + t.id + '|' + t.attemptMetric + '">—</span></div></div>';
      html += '</div>';
    }

    function n(key, hint) {
      var mm = P.Tests.metric(t.id, key);
      if (!mm) return '';
      var v = r.raw[key];
      return '<div class="field" style="margin:0"><label>' + U.esc(mm.label) +
        (mm.unit ? ' (' + U.esc(mm.unit) + ')' : '') + '</label>' +
        '<input class="big" type="number" step="any" data-recalc data-bind="results.' + t.id + '.raw.' + key +
        '" value="' + (v === null || v === undefined ? '' : v) + '">' +
        (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + '</div>';
    }
    function out(keys) {
      return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' + keys.map(function (k) {
        var mm = P.Tests.metric(t.id, k);
        if (!mm) return '';
        return '<div class="best-out" style="margin:0;flex:1 1 180px">' +
          '<span class="k">' + U.esc(mm.label) + '</span>' +
          '<span class="v" data-derived="' + t.id + '|' + k + '">—</span></div>';
      }).join('') + '</div>';
    }
    /* Number fields sit in a grid that caps its own column width, so a wide
       screen gives you more columns rather than absurdly wide boxes. */
    function grid(inner) {
      return '<div style="margin-top:10px;display:grid;gap:10px;' +
        'grid-template-columns:repeat(auto-fit,minmax(150px,190px))">' + inner + '</div>';
    }

    switch (t.id) {
      case 'cmj':
        html += grid(n('flight_time_s', 'Optional') + n('contact_time_s', 'Optional'));
        break;
      case 'sl_broad_jump':
        html += grid(n('left_cm', 'Left leg first, every time') + n('right_cm'));
        html += out(['best_cm', 'asymmetry_pct']);
        break;
      case 'mb_throw':
        html += '<div class="field" style="margin:10px 0 0"><label>Ball mass</label><div class="opts" data-ball>' +
          [3, 4, 5, 6].map(function (kg) {
            return '<label class="opt' + (Number(r.raw.ball_mass_kg) === kg ? ' on' : '') +
              '" data-v="' + kg + '">' + kg + ' kg</label>';
          }).join('') + '</div><div class="hint">4 kg male, 3 kg female. Different masses are not comparable.</div></div>';
        html += grid(n('left_cm') + n('right_cm'));
        html += out(['best_cm', 'asymmetry_pct']);
        break;
      case 'sprint_10m':
        html += grid(n('time_20m_s', 'Optional') + n('time_30m_s', 'Optional'));
        break;
      case 'trapbar':
      case 'bench':
        html += grid(n('load_kg', 'Include the bar') + n('reps', '3RM is the default'));
        html += out(['est_1rm_kg', 'rel_1rm']);
        break;
      case 'chinup':
        html += grid(n('reps', 'Strict only. First invalid rep ends it.'));
        break;
      case 'weighted_chinup':
        html += grid(n('added_kg') + n('reps'));
        html += out(['rel_system_mass']);
        break;
      case 'bike_12min':
        html += grid(n('mean_watts', 'AVERAGE watts, not peak') + n('mean_hr', 'Optional') +
                     n('peak_hr', 'Optional'));
        html += out(['w_per_kg', 'total_work_kj']);
        break;
      case 'bike_30s':
        html += grid(n('peak_watts') + n('mean_watts') + n('min_watts', 'Only if the console shows it'));
        html += out(['peak_w_per_kg', 'mean_w_per_kg']);
        break;
      case 'bike_repeated':
        html += repeated(t, r);
        break;
      case 'movement_screen':
        html += movement(t, r);
        break;
    }
    return html;
  };

  function repeated(t, r) {
    var cfg = r.config || t.defaultConfig;
    var isDefault = JSON.stringify(cfg) === JSON.stringify(t.defaultConfig);
    var html = '<div class="fineprint" style="margin-bottom:10px">' +
      cfg.sprints + ' × ' + cfg.workS + ' s with ' + cfg.recoveryS + ' s recovery' +
      (isDefault ? ' (PGP default)' : ' — NOT the default, so this will not be benchmarked') +
      ' · <a href="#" id="rsCfg">change</a></div>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
    (r.sprints || []).forEach(function (s, i) {
      html += '<div style="flex:1 1 130px;min-width:120px">' +
        '<div class="attempt-lbl">Sprint ' + (i + 1) + ' — avg W</div>' +
        '<input class="big" type="number" step="any" data-recalc data-bind="results.bike_repeated.sprints[' + i +
        '].mean_watts" value="' + (s.mean_watts === null || s.mean_watts === undefined ? '' : s.mean_watts) + '">' +
        '<div class="attempt-lbl" style="margin-top:6px">peak W</div>' +
        '<input type="number" step="any" data-recalc data-bind="results.bike_repeated.sprints[' + i +
        '].peak_watts" value="' + (s.peak_watts === null || s.peak_watts === undefined ? '' : s.peak_watts) + '">' +
        '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
      ['mean_mean_w_per_kg', 'decrement_pct'].map(function (k) {
        var mm = P.Tests.metric(t.id, k);
        return '<div class="best-out" style="margin:0;flex:1 1 180px"><span class="k">' + U.esc(mm.label) +
          '</span><span class="v" data-derived="' + t.id + '|' + k + '">—</span></div>';
      }).join('') + '</div>';
    return html;
  }

  function movement(t, r) {
    var html = '<div class="fineprint" style="margin-bottom:10px">' +
      '0 significant limitation · 1 moderate · 2 acceptable · blank if not assessed (never counted as zero). ' +
      'Coach observation, not a diagnosis and not an injury-risk score.</div>';
    (t.items || []).forEach(function (it) {
      var cur = (r.items || {})[it.key];
      html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;' +
        'padding:5px 0;border-bottom:1px solid var(--border)">' +
        '<span style="font-size:12.5px">' + U.esc(it.label) + '</span>' +
        '<div class="opts" data-mv="' + U.esc(it.key) + '" style="flex-wrap:nowrap">' +
        [0, 1, 2].map(function (v) {
          return '<label class="opt' + (cur === v ? ' on' : '') + '" data-v="' + v +
            '" style="padding:6px 12px">' + v + '</label>';
        }).join('') +
        '<label class="opt' + (cur === null || cur === undefined ? ' on-warn' : '') +
        '" data-v="" style="padding:6px 10px">n/a</label></div></div>';
    });
    html += '<div class="best-out" style="margin-top:10px"><span class="k">Screen score</span>' +
      '<span class="v" data-derived="movement_screen|score_pct">—</span></div>';
    return html;
  }

  /* ---------------- wiring ---------------- */
  V.wireEntry = function (mount, W, A) {
    var S = P.Store;

    function save(now) {
      P.Model.deriveSession(W);
      P.Model.touchSession(W);
      var i = (S.db.sessions || []).findIndex(function (x) { return x.id === W.id; });
      if (i === -1) S.db.sessions.push(W); else S.db.sessions[i] = W;
      if (now) { S.saveNow(); P.App.saveState(); }
      else S.autosave(function () { P.App.saveState(); });
    }

    function refresh() {
      P.Model.deriveSession(W);
      U.$$('[data-derived]', mount).forEach(function (n) {
        var parts = n.dataset.derived.split('|');
        var res = W.results[parts[0]];
        var m = P.Tests.metric(parts[0], parts[1]);
        var v = res && res.values ? res.values[parts[1]] : null;
        n.textContent = (v === null || v === undefined) ? '—' : U.fmt(v, m ? m.dp : 1, m ? m.unit : '');
      });
    }

    /* a value typed anywhere means that test happened */
    function markTested(node) {
      var card = node.closest ? node.closest('.test-card') : null;
      if (!card) return;
      var id = card.dataset.test;
      if (W.results[id] && W.results[id].status === 'pending') W.results[id].status = 'tested';
    }

    U.$$('[data-bind]', mount).forEach(function (n) {
      var ev = (n.tagName === 'SELECT' || n.type === 'checkbox' || n.type === 'date') ? 'change' : 'input';
      n.addEventListener(ev, function () {
        var v = n.type === 'checkbox' ? n.checked : (n.type === 'number' ? U.numVal(n) : n.value);
        setPath(W, n.dataset.bind, v);
        if (v !== null && v !== '') markTested(n);
        save();
        if (n.dataset.recalc !== undefined) refresh();
      });
    });

    U.$$('[data-athlete]', mount).forEach(function (n) {
      n.addEventListener('change', function () {
        A[n.dataset.athlete] = n.value || null;
        S.upsertAthlete(A);
        save(true);
        P.App.render();
      });
    });

    U.$$('[data-ready]', mount).forEach(function (n) {
      n.addEventListener('change', function () {
        W.readiness.answers[n.dataset.ready] = n.checked ? 'yes' : 'no';
        W.readiness.flagged = P.Model.readinessFlagged(W);
        save();
      });
    });

    U.$$('[data-skip]', mount).forEach(function (b) {
      b.addEventListener('click', function () {
        var r = W.results[b.dataset.skip];
        r.status = (r.status === 'not_tested') ? 'pending' : 'not_tested';
        if (r.status !== 'not_tested') r.reason = null;
        save(true);
        P.App.render();
      });
    });

    var ball = U.$('[data-ball]', mount);
    if (ball) U.$$('.opt', ball).forEach(function (lab) {
      lab.addEventListener('click', function () {
        W.results.mb_throw.raw.ball_mass_kg = parseFloat(lab.dataset.v);
        if (W.results.mb_throw.status === 'pending') W.results.mb_throw.status = 'tested';
        U.$$('.opt', ball).forEach(function (o) { o.classList.remove('on'); });
        lab.classList.add('on');
        save(); refresh();
      });
    });

    U.$$('[data-mv]', mount).forEach(function (grp) {
      var key = grp.dataset.mv;
      U.$$('.opt', grp).forEach(function (lab) {
        lab.addEventListener('click', function () {
          if (!W.results.movement_screen.items) W.results.movement_screen.items = {};
          if (lab.dataset.v === '') delete W.results.movement_screen.items[key];
          else W.results.movement_screen.items[key] = parseInt(lab.dataset.v, 10);
          if (W.results.movement_screen.status === 'pending') W.results.movement_screen.status = 'tested';
          if (!W.results.movement_screen.assessor) W.results.movement_screen.assessor = W.tester || '';
          U.$$('.opt', grp).forEach(function (o) { o.classList.remove('on', 'on-warn'); });
          lab.classList.add(lab.dataset.v === '' ? 'on-warn' : 'on');
          save(); refresh();
        });
      });
    });

    var cfg = U.$('#rsCfg', mount);
    if (cfg) cfg.addEventListener('click', function (e) {
      e.preventDefault();
      var c = W.results.bike_repeated.config || P.Tests.get('bike_repeated').defaultConfig;
      U.modal({
        title: 'Repeated sprint protocol',
        bodyHtml: '<div class="grid g3">' +
          V.fld('Sprints', '<input class="big" type="number" id="rcN" value="' + c.sprints + '">') +
          V.fld('Work (s)', '<input class="big" type="number" id="rcW" value="' + c.workS + '">') +
          V.fld('Recovery (s)', '<input class="big" type="number" id="rcR" value="' + c.recoveryS + '">') +
          '</div><div class="fineprint">Changing any of these makes it a different test. It is stored with the ' +
          'result and will not be benchmarked against, or compared with, the 6 × 15 s / 45 s default.</div>',
        buttons: [
          { label: 'Cancel', class: 'btn-ghost' },
          { label: 'Apply', class: 'btn-primary', onClick: function () {
            var r = W.results.bike_repeated;
            var n = Math.max(2, Math.min(12, U.numVal(U.$('#rcN')) || 6));
            r.config = { sprints: n, workS: U.numVal(U.$('#rcW')) || 15, recoveryS: U.numVal(U.$('#rcR')) || 45 };
            while (r.sprints.length < n) r.sprints.push({ peak_watts: null, mean_watts: null });
            r.sprints.length = n;
            save(true); P.App.render();
          } }
        ]
      });
    });

    function back() { save(true); P.App.go('test', { sessionId: null }); }
    var b1 = U.$('#enBack', mount), b2 = U.$('#enBack2', mount);
    if (b1) b1.addEventListener('click', back);
    if (b2) b2.addEventListener('click', back);

    U.$('#enDone', mount).addEventListener('click', function () {
      W.complete = true;
      save(true);
      P.App.go('reports', { athleteId: W.athleteId, sessionId: W.id, compare: false });
    });

    refresh();
  };

  function setPath(obj, path, value) {
    var parts = path.split('.'), o = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i], idx = k.match(/^(\w+)\[(\d+)\]$/);
      if (idx) o = o[idx[1]][parseInt(idx[2], 10)];
      else { if (!o[k]) o[k] = {}; o = o[k]; }
    }
    var last = parts[parts.length - 1], lidx = last.match(/^(\w+)\[(\d+)\]$/);
    if (lidx) o[lidx[1]][parseInt(lidx[2], 10)] = value;
    else o[last] = value;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
