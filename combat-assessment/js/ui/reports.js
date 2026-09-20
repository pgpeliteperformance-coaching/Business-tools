/* ==========================================================================
   js/ui/reports.js — ATHLETE REPORT, RETEST COMPARISON, RETEST TARGETS
   --------------------------------------------------------------------------
   The same markup serves the screen and the printed PDF: css/print.css
   re-skins it for a white page. Use the browser's Print dialog and choose
   "Save as PDF", A4 portrait, with background graphics on.
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;

  function render(mount) {
    var S = P.Store, ctx = P.App.ctx;
    if (!ctx.sessionId || !S.session(ctx.sessionId)) { renderPicker(mount); return; }
    renderReport(mount, S.session(ctx.sessionId));
  }

  /* ====================== PICKER ====================== */
  function renderPicker(mount) {
    var S = P.Store;
    var sessions = (S.db.sessions || []).slice().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });
    var html = '<div class="pg-head"><h1 class="pg-title">Reports</h1>' +
      '<p class="pg-sub">Pick a testing session to open its athlete report. Reports print to a clean A4 PDF ' +
      'from the browser\'s print dialog.</p></div>';
    if (!sessions.length) {
      html += '<div class="card">' + U.empty('No sessions yet', 'Run an athlete through the battery first.') + '</div>';
      mount.innerHTML = html; return;
    }
    html += '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th>Date</th><th>Athlete</th><th>Sport</th><th>Gym</th><th class="num">Mass</th>' +
      '<th>Protocol</th><th></th></tr></thead><tbody>';
    sessions.forEach(function (s) {
      var a = S.athlete(s.athleteId), g = S.gym(s.gymId);
      html += '<tr class="row-link" data-s="' + U.esc(s.id) + '"><td>' + U.date(s.date) + '</td>' +
        '<td><b>' + U.esc(a ? a.name : 'Unknown') + '</b></td>' +
        '<td class="dim">' + U.esc(a ? U.sportLabel(a.sport) : '—') + '</td>' +
        '<td class="dim">' + U.esc(g ? g.name : '—') + '</td>' +
        '<td class="num">' + U.fmt(s.bodyMassKg, 1) + ' kg</td>' +
        '<td class="dim">' + U.esc(s.protocolVersion) + '</td>' +
        '<td><button class="btn btn-sm">Open</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
    mount.innerHTML = html;
    U.$$('tr.row-link', mount).forEach(function (r) {
      r.addEventListener('click', function () {
        var s = S.session(r.dataset.s);
        P.App.go('reports', { sessionId: s.id, athleteId: s.athleteId, compare: false });
      });
    });
  }

  /* ====================== REPORT ====================== */
  function renderReport(mount, session) {
    var S = P.Store, set = S.settings(), C = P.Settings.REPORT_COPY;
    var a = S.athlete(session.athleteId);
    var gym = S.gym(session.gymId);
    var as = P.Engine.assessSession(session, a, S.db, set);
    var prevSession = S.previousSession(session);
    var cmp = null;
    if (prevSession) {
      cmp = P.Engine.compareSessions(as, P.Engine.assessSession(prevSession, a, S.db, set), set);
    }
    var targets = P.Engine.suggestRetestTargets(as, set);
    var saved = (S.db.retestTargets || {})[session.id] || {};

    var html = '<div class="no-print btn-row" style="margin-bottom:14px">' +
      '<button class="btn btn-sm btn-ghost" id="rpBack">← All reports</button>' +
      '<button class="btn btn-sm btn-primary" id="rpPrint">Print / save as PDF</button>' +
      '<button class="btn btn-sm" id="rpEdit">Edit this session</button>' +
      (cmp ? '<button class="btn btn-sm" id="rpToggle">' +
        (P.App.ctx.compare ? 'Hide retest comparison' : 'Show retest comparison') + '</button>' : '') +
      '</div>';

    html += '<div class="rpt">';

    /* ---------------- cover ---------------- */
    html += '<div class="rpt-cover">' +
      '<div class="rpt-brand">' + U.esc(set.branding.product) + '</div>' +
      '<div class="rpt-title">Athlete Performance Report</div>' +
      '<div class="rpt-athlete">' + U.esc(a ? a.name : 'Unknown athlete') + '</div>' +
      '<div class="fineprint" style="margin-top:4px">' + U.esc(set.branding.tagline) + '</div>' +
      '</div>';

    html += '<div class="grid g2 rpt-sec">' +
      '<div class="card"><div class="card-bd"><dl class="kv">' +
      kv('Athlete', a ? a.name : '—') +
      kv('Testing date', U.date(session.date)) +
      kv('Age at test', session.ageAtTest) +
      kv('Sex', a && a.sex ? U.sexLabel(a.sex) : 'Not recorded') +
      kv('Body mass', session.bodyMassKg === null ? null : U.fmt(session.bodyMassKg, 1) + ' kg') +
      kv('Height', session.heightCm === null ? null : U.fmt(session.heightCm, 0) + ' cm') +
      '</dl></div></div>' +
      '<div class="card"><div class="card-bd"><dl class="kv">' +
      kv('Sport', a ? U.sportLabel(a.sport) : '—') +
      kv('Competitive level', a ? U.levelLabel(a.competitiveLevel) : '—') +
      kv('Weight class', a ? a.weightClass : '') +
      kv('Gym', gym ? gym.name : '') +
      kv('Coach', session.coach) +
      kv('Tester', session.tester) +
      kv('Protocol version', session.protocolVersion) +
      kv('Protocol confirmed', session.protocolConfirmed ? 'Yes' : 'NO — treat as non-standardised') +
      '</dl></div></div></div>';

    /* ---------------- how to read this ---------------- */
    html += '<div class="rpt-sec"><div class="rpt-sec-h">How to read this report</div>' +
      '<div class="card"><div class="card-bd">' +
      '<p style="line-height:1.65">' + U.esc(C.intro) + '</p>' +
      '<p class="fineprint" style="margin-top:10px">' + U.esc(C.levelCaveat) + '</p>' +
      (as.usesProvisional ? '<div style="margin-top:12px">' + U.notice('warning',
        U.esc(C.provisionalNotice)) + '</div>' : '') +
      '</div></div></div>';

    /* ---------------- performance summary ---------------- */
    html += '<div class="rpt-sec"><div class="rpt-sec-h">Performance summary</div>' +
      '<div class="grid g2"><div class="card"><div class="card-hd"><span class="card-ttl">Profile</span>' +
      '<span class="card-note">percentile by category</span></div>' +
      '<div class="card-bd"><div id="rpRadar"></div></div></div>' +
      '<div class="card"><div class="card-hd"><span class="card-ttl">Category scores</span></div>' +
      '<div class="card-bd"><div id="rpBars"></div>' + U.levelLegend(set) + '</div></div></div>';

    /* category detail rows with interpretation */
    html += '<div class="card" style="margin-top:16px"><div class="card-bd">';
    as.categoryScores.forEach(function (c) {
      html += '<div style="padding:10px 0;border-bottom:1px solid var(--border)">' +
        U.percentileBar({
          label: c.categoryName,
          sub: c.status === 'scored'
            ? 'from ' + c.n + ' test' + (c.n === 1 ? '' : 's') +
              (c.coveragePct !== undefined ? ' · ' + c.coveragePct + '% of this category tested' : '')
            : null,
          percentile: c.status === 'scored' ? c.percentile : null,
          displayPercentile: c.displayPercentile, level: c.level, scoreType: c.scoreType,
          emptyText: 'Insufficient reference data', tip: c.status === 'scored' ? c.method : c.reason
        }) +
        '<div class="fineprint" style="margin-top:2px">' +
        (c.status === 'scored'
          ? U.esc(c.level ? c.level.desc : '') + ' <span style="color:var(--text-muted)">' + U.esc(c.blurb) + '</span>'
          : '<b>Insufficient data.</b> ' + U.esc(c.reason || '')) +
        '</div></div>';
    });
    html += '</div></div>';

    /* composite */
    html += '<div class="card" style="margin-top:16px"><div class="card-bd">';
    if (as.composite.enabled && as.composite.status === 'scored') {
      html += '<div class="stat-lbl">' + U.esc(as.composite.label) + '</div>' +
        '<div class="hero-num">' + U.ordSup(as.composite.displayPercentile) + '</div>' +
        '<div style="margin-top:8px">' + U.levelBadge(as.composite.level) + '</div>' +
        '<div class="fineprint" style="margin-top:10px">' + U.esc(as.composite.note) + '</div>';
    } else {
      html += '<div class="stat-lbl">Overall score</div>' +
        '<div class="fineprint" style="margin-top:6px">' + U.esc(as.composite.note) + '</div>';
    }
    html += '</div></div></div>';

    /* ---------------- test results table ---------------- */
    html += '<div class="rpt-sec rpt-break"><div class="rpt-sec-h">Test results</div>' +
      '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th>Test</th><th class="num">Result</th><th class="num">Relative result</th>' +
      '<th class="num">Percentile</th><th>Performance level</th><th>Reference</th>' +
      '</tr></thead><tbody>';

    P.Tests.orderedTests().forEach(function (t) {
      var r = session.results[t.id];
      var scores = as.metricScores.filter(function (x) { return x.testId === t.id; });
      if (r.status === 'not_tested' || r.status === 'pending') {
        html += '<tr><td><b>' + U.esc(t.name) + '</b></td>' +
          '<td colspan="5" class="dim"><span class="badge badge-none">Not tested</span> ' +
          U.esc(r.status === 'pending' ? 'No result recorded.' : P.Engine.reasonLabel(r.reason)) +
          (r.notes ? ' — ' + U.esc(r.notes) : '') + '</td></tr>';
        return;
      }
      scores.forEach(function (sc, i) {
        var absMetric = absoluteFor(t, r);
        html += '<tr><td>' + (i === 0 ? '<b>' + U.esc(t.name) + '</b>' : '') +
          '<br><span class="fineprint">' + U.esc(sc.metricLabel) + '</span></td>' +
          '<td class="num">' + (i === 0 && absMetric ? U.esc(absMetric) : '') + '</td>' +
          '<td class="num"><b>' + (sc.value === null ? '—' : U.fmt(sc.value, sc.dp, sc.unit)) + '</b></td>' +
          '<td class="num">' + (sc.status === 'scored'
            ? (sc.scoreType === 'criterion'
                ? Math.round(sc.value) + '% of max'
                : U.ordSup(sc.displayPercentile))
            : '<span class="fineprint">—</span>') + '</td>' +
          '<td>' + (sc.status === 'scored' ? U.levelBadge(sc.level)
            : '<span class="fineprint">' + U.esc(statusText(sc)) + '</span>') + '</td>' +
          '<td>' + (sc.status === 'scored' ? U.refTag(sc.referenceType) : '') + '</td></tr>';
      });
      /* observations that are recorded but not benchmarked */
      as.observations.filter(function (o) { return o.testId === t.id; }).forEach(function (o) {
        if (o.role === 'condition') return;
        html += '<tr><td class="dim" style="padding-left:22px">' + U.esc(o.metricLabel) +
          ' <span class="badge badge-none">observation</span></td>' +
          '<td class="num dim">' + U.fmt(o.value, o.dp, o.unit) + '</td>' +
          '<td colspan="3" class="fineprint">' + U.esc(o.note || 'Recorded for context. Not benchmarked.') + '</td>' +
          '<td></td></tr>';
      });
    });
    html += '</tbody></table></div>';
    html += '<div class="card-bd"><div class="fineprint">' +
      '<b>Relative result</b> is the metric that is actually benchmarked — the one that is physiologically ' +
      'appropriate for the test. Strength is expressed per kilogram of body mass; bike power is expressed per ' +
      'kilogram; chin-ups are counted in repetitions and compared within a body-mass band rather than divided by ' +
      'body mass; jumps and throws are absolute distances. Nothing is divided by body mass simply because it can be.' +
      '</div></div></div></div>';

    /* ---------------- strengths ---------------- */
    html += '<div class="rpt-sec"><div class="rpt-sec-h">Top physical strengths</div><div class="card"><div class="card-bd">';
    if (as.profile.strengths.length) {
      html += '<p class="fineprint" style="margin-bottom:12px">' + U.esc(C.strengthsIntro) + '</p><ol style="margin-left:18px">';
      as.profile.strengths.forEach(function (s) {
        html += '<li style="margin-bottom:10px"><b>' + U.esc(s.label) + '</b> — ' + U.ord(s.percentile) +
          ' percentile <span style="margin-left:6px">' + U.levelBadge({ name: s.level }) + '</span>' +
          '<div class="fineprint">' + U.esc(s.category) + ' · ' + U.esc(s.why) + '</div></li>';
      });
      html += '</ol>';
    } else {
      html += '<p class="fineprint">' + U.esc(C.noStrengths) + '</p>';
    }
    html += '</div></div></div>';

    /* ---------------- priorities ---------------- */
    html += '<div class="rpt-sec"><div class="rpt-sec-h">Development priorities</div><div class="card"><div class="card-bd">';
    if (as.profile.priorities.length) {
      html += '<p class="fineprint" style="margin-bottom:12px">' + U.esc(C.prioritiesIntro) + '</p><ol style="margin-left:18px">';
      as.profile.priorities.forEach(function (s) {
        html += '<li style="margin-bottom:10px"><b>' + U.esc(s.label) + '</b> — ' + U.ord(s.percentile) +
          ' percentile <span style="margin-left:6px">' + U.levelBadge({ name: s.level }) + '</span>' +
          '<div class="fineprint">' + U.esc(s.category) + ' · ' + U.esc(s.why) + '</div></li>';
      });
      html += '</ol>';
    } else {
      html += '<p class="fineprint">' + U.esc(C.noPriorities) + '</p>';
    }
    html += '<details class="disc" style="margin-top:14px"><summary>How these were selected</summary>' +
      '<div class="disc-bd">' + U.esc(as.profile.selectionRule) + '</div></details>';
    html += '</div></div></div>';

    /* ---------------- recommendations ---------------- */
    html += '<div class="rpt-sec"><div class="rpt-sec-h">Training recommendations</div><div class="card"><div class="card-bd">';
    as.recommendations.cross.forEach(function (c) {
      html += U.notice('gold', U.esc(c.text));
    });
    var byTier = as.recommendations.byCategory.filter(function (r) { return r.tier !== 'high'; })
      .concat(as.recommendations.byCategory.filter(function (r) { return r.tier === 'high'; }));
    byTier.forEach(function (r) {
      html += '<div style="margin-top:14px"><div class="stat-lbl">' + U.esc(r.categoryName) + ' — ' +
        U.ord(r.percentile) + ' percentile · ' + U.esc(r.level || '') + '</div><ul style="margin:6px 0 0 18px">' +
        r.items.map(function (i) { return '<li style="margin-bottom:4px">' + U.esc(i) + '</li>'; }).join('') +
        '</ul></div>';
    });
    html += '<div class="fineprint" style="margin-top:16px">' + U.esc(as.recommendations.disclaimer) + '</div>';
    html += '</div></div></div>';

    /* ---------------- retest targets ---------------- */
    html += '<div class="rpt-sec"><div class="rpt-sec-h">Retest targets</div><div class="card">' +
      '<div class="card-hd"><span class="card-ttl">Suggested targets for the next assessment</span>' +
      '<span class="card-note no-print">editable</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Test</th><th class="num">Current</th>' +
      '<th class="num">Target</th><th class="num">Change</th><th>Basis</th></tr></thead><tbody>';
    targets.targets.forEach(function (t) {
      var key = t.testId + '.' + t.metricKey;
      var val = saved[key] !== undefined ? saved[key] : t.target;
      var change = (val === null || val === undefined) ? null : val - t.current;
      html += '<tr><td>' + U.esc(t.label) + '</td>' +
        '<td class="num">' + U.fmt(t.current, t.dp, t.unit) + '</td>' +
        '<td class="num"><input type="number" step="any" class="no-print" data-target="' + U.esc(key) +
        '" value="' + (val === null || val === undefined ? '' : U.fmt(val, t.dp)) +
        '" style="width:94px;text-align:right;padding:5px 8px">' +
        '<span class="print-only">' + U.fmt(val, t.dp, t.unit) + '</span></td>' +
        '<td class="num">' + (change === null ? '—' : U.fmtSigned(change, t.dp) + ' ' + (t.unit || '')) + '</td>' +
        '<td class="fineprint">' + U.esc(t.basis) + '</td></tr>';
    });
    html += '</tbody></table></div><div class="card-bd"><div class="fineprint">' + U.esc(targets.note) +
      ' Suggested retest interval: ' + targets.weeks + ' weeks.</div></div></div></div>';

    /* ---------------- retest comparison ---------------- */
    if (cmp && P.App.ctx.compare) {
      html += retestSection(cmp, as);
    } else if (cmp) {
      html += '<div class="rpt-sec no-print">' + U.notice('info',
        '<b>This athlete has an earlier session (' + U.date(cmp.previousDate) + ').</b> ' +
        'Use the <b>Show retest comparison</b> button at the top to include the change analysis in this report.') +
      '</div>';
    }

    /* ---------------- data quality ---------------- */
    html += '<div class="rpt-sec"><div class="rpt-sec-h">Data quality and protocol notes</div>' +
      '<div class="card"><div class="card-bd">';
    var byTierIss = { error: [], verify: [], info: [] };
    as.issues.forEach(function (i) { byTierIss[i.severity].push(i); });
    if (!as.issues.length) {
      html += '<p class="fineprint">No data-quality issues were raised on this session.</p>';
    } else {
      ['error', 'verify', 'info'].forEach(function (sev) {
        if (!byTierIss[sev].length) return;
        var title = sev === 'error' ? 'Requires correction' :
                    sev === 'verify' ? 'Please verify' : 'For the record';
        html += '<div class="stat-lbl" style="margin-top:12px">' + title + ' (' + byTierIss[sev].length + ')</div>' +
          '<ul style="margin:6px 0 0 18px" class="fineprint">' +
          byTierIss[sev].map(function (i) {
            var t = P.Tests.get(i.scope);
            return '<li style="margin-bottom:5px"><b>' + U.esc(t ? t.shortName : 'Session') + ':</b> ' +
              U.esc(i.message) + '</li>';
          }).join('') + '</ul>';
      });
    }
    /* references used */
    html += '<div class="stat-lbl" style="margin-top:16px">Reference sets used</div><dl class="kv">';
    Object.keys(as.referenceTypesUsed).forEach(function (k) {
      html += '<dt>' + U.refTag(k) + '</dt><dd>' + as.referenceTypesUsed[k] + ' metric' +
        (as.referenceTypesUsed[k] === 1 ? '' : 's') + '</dd>';
    });
    html += '</dl>';
    var internalNote = as.metricScores.filter(function (m) {
      return m.internal && m.internal.available;
    })[0];
    if (internalNote) {
      html += '<div class="fineprint" style="margin-top:10px">' +
        U.esc(internalNote.internal.benchmark.notes) +
        (internalNote.internal.isPrimary ? '' : ' This sample is not yet large enough to become the primary ' +
        'reference, so PGP provisional standards were used instead.') + '</div>';
    }
    html += '<div class="stat-lbl" style="margin-top:16px">Equipment used</div><dl class="kv">' +
      kv('Jump device', U.label(P.Settings.EQUIPMENT.jumpDevice, session.equipment.jumpDevice)) +
      kv('Timing', U.label(P.Settings.EQUIPMENT.timingDevice, session.equipment.timingDevice) + ' (' +
        U.esc(session.equipment.timingMethod) + ')') +
      kv('Air bike', U.label(P.Settings.EQUIPMENT.airBike, session.equipment.airBike)) +
      kv('Trap bar', U.label(P.Settings.EQUIPMENT.trapBar, session.equipment.trapBar) +
        (session.equipment.trapBarMassKg ? ' (' + session.equipment.trapBarMassKg + ' kg)' : '')) +
      kv('Bench', U.label(P.Settings.EQUIPMENT.bench, session.equipment.bench)) +
      kv('Chin-up bar', U.label(P.Settings.EQUIPMENT.pullUpBar, session.equipment.pullUpBar)) +
      kv('Bike seat position', session.equipment.seatPosition) +
      '</dl>';
    if (session.notes) html += '<div class="fineprint" style="margin-top:12px"><b>Session notes:</b> ' +
      U.esc(session.notes) + '</div>';
    if (session.injuryNotes) html += '<div class="fineprint" style="margin-top:6px"><b>Injury / availability:</b> ' +
      U.esc(session.injuryNotes) + '</div>';
    html += '</div></div></div>';

    /* ---------------- footer ---------------- */
    html += '<div class="rpt-foot"><b>' + U.esc(set.branding.product) + '</b> · Protocol ' +
      U.esc(session.protocolVersion) + ' · Report generated ' + U.date(P.Model.today()) + '<br><br>' +
      U.esc(C.disclaimer) + '</div>';

    html += '</div>';   /* .rpt */

    mount.innerHTML = html;

    /* charts */
    var catPts = as.categoryScores.map(function (c) {
      return { label: c.short, value: c.status === 'scored' ? c.percentile : null,
               display: c.displayPercentile, level: c.level, scoreType: c.scoreType,
               sub: c.status === 'scored' ? c.categoryName : c.reason };
    });
    var series = [{ name: U.date(session.date), points: catPts, color: 'var(--gold)' }];
    if (cmp && P.App.ctx.compare) {
      var prevAs = P.Engine.assessSession(prevSession, a, S.db, set);
      series.push({
        name: U.date(prevSession.date) + ' (previous)', dashed: true, color: 'var(--series-1)',
        points: prevAs.categoryScores.map(function (c) {
          return { label: c.short, value: c.status === 'scored' ? c.percentile : null,
                   display: c.displayPercentile, level: c.level, scoreType: c.scoreType };
        })
      });
    }
    P.Charts.radar(U.$('#rpRadar', mount), { series: series, ariaLabel: 'Category percentile profile' });
    P.Charts.categoryBars(U.$('#rpBars', mount), as.categoryScores);
    if (U.$('#rpChange', mount)) P.Charts.changeBars(U.$('#rpChange', mount), cmp.metrics);

    /* wiring */
    U.$('#rpBack', mount).addEventListener('click', function () {
      P.App.go('reports', { sessionId: null });
    });
    U.$('#rpPrint', mount).addEventListener('click', function () { window.print(); });
    U.$('#rpEdit', mount).addEventListener('click', function () {
      P.App.go('test', { athleteId: session.athleteId, sessionId: session.id });
    });
    var tg = U.$('#rpToggle', mount);
    if (tg) tg.addEventListener('click', function () {
      P.App.go('reports', { compare: !P.App.ctx.compare });
    });
    U.$$('[data-target]', mount).forEach(function (n) {
      n.addEventListener('change', function () {
        if (!S.db.retestTargets) S.db.retestTargets = {};
        if (!S.db.retestTargets[session.id]) S.db.retestTargets[session.id] = {};
        var v = U.numVal(n);
        if (v === null) delete S.db.retestTargets[session.id][n.dataset.target];
        else S.db.retestTargets[session.id][n.dataset.target] = v;
        S.saveNow();
        P.App.saveState(true);
        U.toast('Target saved');
        P.App.render();
      });
    });
  }

  /* ====================== RETEST SECTION ====================== */
  function retestSection(cmp, as) {
    var html = '<div class="rpt-sec rpt-break"><div class="rpt-sec-h">Did the athlete improve?</div>';

    if (!cmp.comparable) {
      html += U.notice('critical', cmp.warnings.map(U.esc).join('<br>'));
    }
    html += '<div class="grid g4" style="margin-bottom:14px">' +
      tile('Previous test', U.date(cmp.previousDate), cmp.weeksBetween + ' weeks before') +
      tile('Improved', cmp.improved, 'beyond measurement error') +
      tile('Within variation', cmp.withinNoise, 'change not distinguishable from noise') +
      tile('Declined', cmp.declined, 'beyond measurement error') +
      '</div>';

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Change by metric</span>' +
      '<span class="card-note">signed so that improvement always points right</span></div>' +
      '<div class="card-bd"><div id="rpChange"></div></div></div>';

    html += '<div class="card" style="margin-top:16px"><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th>Test</th><th class="num">Previous</th><th class="num">Current</th><th class="num">Change</th>' +
      '<th class="num">%</th><th>Verdict</th><th>Level</th></tr></thead><tbody>';
    cmp.metrics.forEach(function (r) {
      if (r.previous === null && r.current === null) return;
      var glyph = r.verdict === 'improved' ? '▲' : r.verdict === 'declined' ? '▼' :
                  r.verdict === 'within-noise' ? '=' : '?';
      var badge = r.verdict === 'improved' ? 'badge-good' : r.verdict === 'declined' ? 'badge-critical' : 'badge-none';
      var verdictTxt = r.verdict === 'within-noise' ? 'within measurement variation'
                     : r.verdict === 'unknown' ? 'cannot be judged' : r.verdict;
      html += '<tr><td>' + U.esc(r.testName) + '<br><span class="fineprint">' + U.esc(r.metricLabel) + '</span></td>' +
        '<td class="num">' + U.fmt(r.previous, r.dp) + '</td>' +
        '<td class="num"><b>' + U.fmt(r.current, r.dp) + '</b></td>' +
        '<td class="num">' + (r.change === null ? '—' : U.fmtSigned(r.change, r.dp)) + '</td>' +
        '<td class="num">' + (r.changePct === null ? '—' : U.fmtSigned(r.changePct, 1) + '%') + '</td>' +
        '<td><span class="badge ' + badge + '">' + glyph + ' ' + U.esc(verdictTxt) + '</span>' +
        (r.meaningful && r.meaningful.provisional
          ? '<br><span class="fineprint">provisional threshold</span>' : '') +
        (r.equipmentChanged ? '<br><span class="fineprint" style="color:#f5c353">equipment changed</span>' : '') +
        '</td>' +
        '<td>' + (r.levelChanged
          ? '<span class="fineprint">' + U.esc(r.previousLevel || '—') + ' →</span><br>' +
            U.levelBadge({ name: r.currentLevel })
          : (r.currentLevel ? '<span class="fineprint">' + U.esc(r.currentLevel) + '</span>' : '—')) +
        '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    /* category level transitions */
    var moved = cmp.categories.filter(function (c) { return c.levelChanged; });
    if (moved.length) {
      html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
        '<span class="card-ttl">Categories that moved performance level</span></div><div class="card-bd">';
      moved.forEach(function (c) {
        html += '<div style="padding:7px 0"><b>' + U.esc(c.categoryName) + '</b> — ' +
          U.esc(c.previousLevel || '—') + ' → ' + U.levelBadge({ name: c.currentLevel }) +
          ' <span class="fineprint">(' + U.ord(c.previous) + ' → ' + U.ord(c.current) + ' percentile)</span></div>';
      });
      html += '</div></div>';
    }

    html += '<div class="card" style="margin-top:16px"><div class="card-bd"><div class="fineprint">' +
      U.esc(cmp.caveat) + '</div></div></div>';
    html += '</div>';
    return html;
  }

  /* ====================== helpers ====================== */
  function absoluteFor(t, r) {
    var map = {
      trapbar: ['load_kg', 'reps'], bench: ['load_kg', 'reps'],
      weighted_chinup: ['added_kg', 'reps'], bike_12min: ['mean_watts'],
      bike_30s: ['peak_watts', 'mean_watts'], bike_repeated: ['mean_mean_watts'],
      cmj: ['height_cm'], broad_jump: ['distance_cm'], sl_broad_jump: ['best_cm'],
      mb_throw: ['ball_mass_kg', 'best_cm'], sprint_10m: ['time_10m_s'], chinup: ['reps'],
      movement_screen: []
    };
    var keys = map[t.id] || [];
    var out = keys.map(function (k) {
      var m = P.Tests.metric(t.id, k);
      var v = r.values ? r.values[k] : null;
      if (v === null || v === undefined || !m) return null;
      return U.fmt(v, m.dp, m.unit);
    }).filter(Boolean);
    return out.join(' × ');
  }

  function statusText(sc) {
    if (sc.status === 'insufficient') return 'Insufficient reference data';
    if (sc.status === 'flagged') return 'Value requires verification';
    if (sc.status === 'incomplete') return 'Test not completed';
    if (sc.status === 'no_value') return 'No value recorded';
    return 'Not tested';
  }

  function kv(k, v) {
    return '<dt>' + U.esc(k) + '</dt><dd>' +
      (v === null || v === undefined || v === '' ? '<span style="color:var(--text-muted)">—</span>' : U.esc(String(v))) +
      '</dd>';
  }
  function tile(l, v, s) {
    return '<div class="stat"><div class="stat-lbl">' + U.esc(l) + '</div><div class="stat-val num">' +
      U.esc(String(v)) + '</div>' + (s ? '<div class="stat-sub">' + U.esc(s) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.reports = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
