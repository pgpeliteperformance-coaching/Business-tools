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
  var gymFilter = '';

  function renderPicker(mount) {
    var S = P.Store;
    var sessions = (S.db.sessions || []).slice().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });
    var html = '<div class="pg-head"><h1 class="pg-title">Reports</h1>' +
      '<p class="pg-sub">Pick a testing session to open its athlete report. Reports print to a clean A4 PDF ' +
      'from the browser\'s print dialog. Filter by gym to work through one gym\'s athletes in a run.</p></div>';
    if (!sessions.length) {
      html += '<div class="card">' + U.empty('No sessions yet', 'Run an athlete through the battery first.') + '</div>';
      mount.innerHTML = html; return;
    }
    /* Filter on the athlete's OWN gym, not where they happened to be tested:
       sending a gym its results means sending it the results of its athletes. */
    var filtered = sessions.filter(function (s) {
      if (!gymFilter) return true;
      var a = S.athlete(s.athleteId);
      return a && a.gymId === gymFilter;
    });
    html += '<div class="searchbar"><select id="rpGym" style="flex:0 1 260px">' +
      U.selectOpts((S.db.gyms || []).map(function (g) { return { id: g.id, label: g.name }; }),
        gymFilter, 'All gyms') + '</select>' +
      (gymFilter ? '<span class="fineprint">' + filtered.length + ' report' +
        (filtered.length === 1 ? '' : 's') + ' for ' + U.esc((S.gym(gymFilter) || {}).name || '') +
        ' — open each one and print it to PDF.</span>' : '') + '</div>';

    html += '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th>Date</th><th>Athlete</th><th>Sport</th><th>Their gym</th><th class="num">Mass</th>' +
      '<th>Protocol</th><th></th></tr></thead><tbody>';
    filtered.forEach(function (s) {
      var a = S.athlete(s.athleteId), g = a ? S.gym(a.gymId) : null;
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
    var gf = U.$('#rpGym', mount);
    if (gf) gf.addEventListener('change', function () { gymFilter = gf.value; P.App.render(); });
    U.$$('tr.row-link', mount).forEach(function (r) {
      r.addEventListener('click', function () {
        var s = S.session(r.dataset.s);
        P.App.go('reports', { sessionId: s.id, athleteId: s.athleteId, compare: false });
      });
    });
  }

  /* ====================== REPORT ====================== */
  /* Laid out as a document, not a web page that happens to print. Page 1 is
     the athlete's page — who they are, the profile, and the two or three
     things to do about it. The numbers, the workings and the caveats follow.
     Nothing is dropped; things that used to repeat on every row are now said
     once, in the place they belong. */
  function renderReport(mount, session) {
    var S = P.Store, set = S.settings(), C = P.Settings.REPORT_COPY;
    var a = S.athlete(session.athleteId);
    var gym = a ? S.gym(a.gymId) : null;
    var venue = S.gym(session.gymId);
    var as = P.Engine.assessSession(session, a, S.db, set);
    var prevSession = S.previousSession(session);
    var cmp = prevSession
      ? P.Engine.compareSessions(as, P.Engine.assessSession(prevSession, a, S.db, set), set) : null;
    var targets = P.Engine.suggestRetestTargets(as, set);
    var saved = (S.db.retestTargets || {})[session.id] || {};

    var html = '<div class="no-print btn-row" style="margin-bottom:16px">' +
      '<button class="btn btn-sm btn-ghost" id="rpBack">← All reports</button>' +
      '<button class="btn btn-sm btn-primary" id="rpPrint">Print / save as PDF</button>' +
      '<button class="btn btn-sm" id="rpEdit">Edit this session</button>' +
      (cmp ? '<button class="btn btn-sm" id="rpToggle">' +
        (P.App.ctx.compare ? 'Hide the change section' : 'Show what changed') + '</button>' : '') +
      '</div>';

    html += '<div class="rpt">';

    /* ---------------- masthead and identity ---------------- */
    var meta = [
      U.date(session.date),
      session.ageAtTest !== null ? session.ageAtTest + ' yrs' : null,
      a && a.sex ? U.sexLabel(a.sex) : null,
      session.bodyMassKg !== null ? U.fmt(session.bodyMassKg, 1) + ' kg' : null,
      session.heightCm !== null ? U.fmt(session.heightCm, 0) + ' cm' : null,
      a ? U.sportLabel(a.sport) : null,
      a && a.weightClass ? a.weightClass : null,
      gym ? gym.name : null
    ].filter(Boolean);

    html += '<header class="rpt-head">' +
      '<div class="rpt-mast">' +
      '<span class="rpt-mark">PGP</span>' +
      '<span class="rpt-brandline">Combat Athlete Performance Assessment</span>' +
      '<span class="rpt-proto">' + U.esc(session.protocolVersion) + '</span>' +
      '</div>' +
      '<h1 class="rpt-name">' + U.esc(a ? a.name : 'Athlete') + '</h1>' +
      '<div class="rpt-meta">' + meta.map(U.esc).join('<span class="rpt-sep">·</span>') + '</div>' +
      '</header>';

    /* one line that says what the report found */
    var top = as.profile.strongestCategories[0];
    var low = as.profile.weakestCategories[0];
    if (top && low && top.categoryId !== low.categoryId) {
      html += '<div class="rpt-headline">' +
        '<div><span class="rpt-hl-k">Strongest</span><span class="rpt-hl-v">' +
        U.esc(top.categoryName) + '</span><span class="rpt-hl-n">' +
        U.ordSup(top.displayPercentile) + '</span></div>' +
        '<div><span class="rpt-hl-k">Develop first</span><span class="rpt-hl-v">' +
        U.esc(low.categoryName) + '</span><span class="rpt-hl-n">' +
        U.ordSup(low.displayPercentile) + '</span></div>' +
        '</div>';
    }

    /* ---------------- profile ---------------- */
    html += '<section class="rpt-sec"><h2 class="rpt-h">Performance profile</h2>' +
      '<div class="rpt-profile"><div class="rpt-radar"><div id="rpRadar"></div></div>' +
      '<div class="rpt-cats">';
    as.categoryScores.forEach(function (c) {
      var lv = c.level ? U.levelIndex(c.level.name) : 0;
      html += '<div class="rpt-cat">' +
        '<div class="rpt-cat-name">' + U.esc(c.categoryName) +
        '<small>' + (c.status === 'scored'
          ? 'from ' + c.n + ' test' + (c.n === 1 ? '' : 's')
          : 'no benchmarked result') + '</small></div>' +
        '<div class="rpt-cat-track">' + (c.status === 'scored'
          ? '<span class="rpt-cat-fill lv' + (lv || 1) + '" style="width:' +
            Math.max(2, Math.min(100, c.percentile)) + '%"></span>' +
            [25, 65, 90].map(function (t) {
              return '<span class="rpt-cat-tick" style="left:' + t + '%"></span>';
            }).join('')
          : '') + '</div>' +
        '<div class="rpt-cat-num">' + (c.status === 'scored'
          ? U.ordSup(c.displayPercentile) : '<span class="rpt-na">—</span>') + '</div>' +
        '<div class="rpt-cat-lv">' + (c.status === 'scored'
          ? '<span class="rpt-lv lv' + lv + '">' + U.esc(c.level.name) + '</span>'
          : '<span class="rpt-na">Insufficient reference data</span>') + '</div>' +
        '</div>';
    });
    html += '</div></div>';
    html += '<div class="rpt-scale">' + set.levels.map(function (l, i) {
      return '<span><i class="lv' + (i + 1) + '"></i>' + U.esc(l.name) +
        ' <b>' + l.min + '–' + l.max + '</b></span>';
    }).join('') + '</div>';
    html += '<p class="rpt-note">' + U.esc(C.levelCaveat) + '</p>';
    html += '</section>';

    /* ---------------- strengths and priorities ---------------- */
    html += '<section class="rpt-sec rpt-two">';
    html += '<div><h2 class="rpt-h">Strengths</h2>' +
      (as.profile.strengths.length
        ? '<ol class="rpt-list">' + as.profile.strengths.map(function (x) {
            return '<li><span class="rpt-li-n">' + U.ordSup(x.percentile) + '</span>' +
              '<span class="rpt-li-b"><b>' + U.esc(x.label) + '</b>' +
              '<small>' + U.esc(x.category) + ' · ' + U.esc(x.level || '') + '</small></span></li>';
          }).join('') + '</ol>'
        : '<p class="rpt-note">' + U.esc(C.noStrengths) + '</p>') + '</div>';
    html += '<div><h2 class="rpt-h">Develop next</h2>' +
      (as.profile.priorities.length
        ? '<ol class="rpt-list">' + as.profile.priorities.map(function (x) {
            return '<li><span class="rpt-li-n">' + U.ordSup(x.percentile) + '</span>' +
              '<span class="rpt-li-b"><b>' + U.esc(x.label) + '</b>' +
              '<small>' + U.esc(x.category) + ' · ' + U.esc(x.level || '') + '</small></span></li>';
          }).join('') + '</ol>'
        : '<p class="rpt-note">' + U.esc(C.noPriorities) + '</p>') + '</div>';
    html += '</section>';

    /* ---------------- results ---------------- */
    html += '<section class="rpt-sec rpt-break"><h2 class="rpt-h">Results</h2>' +
      '<div class="rpt-scroll"><table class="rpt-tbl"><thead><tr>' +
      '<th>Test</th><th class="n">Recorded</th><th class="n">Benchmarked</th>' +
      '<th class="n">Percentile</th><th>Level</th></tr></thead><tbody>';

    var refsUsed = {};
    P.Tests.orderedTests().forEach(function (t) {
      var r = session.results[t.id];
      var scores = as.metricScores.filter(function (x) { return x.testId === t.id; });
      var obs = observationLine(as, t.id);

      if (r.status === 'not_tested' || r.status === 'pending') {
        html += '<tr class="rpt-skip"><td><b>' + U.esc(t.name) + '</b></td>' +
          '<td colspan="4">Not tested — ' +
          U.esc(r.status === 'pending' ? 'no result recorded' :
                P.Engine.reasonLabel(r.reason).toLowerCase()) +
          (r.notes ? '. ' + U.esc(r.notes) : '') + '</td></tr>';
        return;
      }

      scores.forEach(function (sc, i) {
        if (sc.status === 'scored') refsUsed[sc.referenceType] = true;
        var raw = (i === 0) ? absoluteFor(t, r) : '';
        var benched = sc.value === null ? '—' : U.fmt(sc.value, sc.dp, sc.unit);
        if (raw === benched) raw = '';
        html += '<tr>' +
          '<td>' + (i === 0 ? '<b>' + U.esc(t.name) + '</b>' : '') +
          (scores.length > 1 ? '<small>' + U.esc(sc.metricLabel) + '</small>' : '') +
          (i === 0 && obs ? '<small class="rpt-obs">' + obs + '</small>' : '') + '</td>' +
          '<td class="n dim">' + raw + '</td>' +
          '<td class="n strong">' + benched + '</td>' +
          '<td class="n">' + (sc.status === 'scored'
            ? U.ordSup(sc.displayPercentile) +
              (sc.referenceType !== 'PGP_PROVISIONAL'
                ? '<sup class="rpt-refmark">' + (sc.referenceType === 'PUBLISHED' ? 'p' : 'i') + '</sup>'
                : '')
            : '<span class="rpt-na">—</span>') + '</td>' +
          '<td>' + (sc.status === 'scored'
            ? '<span class="rpt-lv lv' + U.levelIndex(sc.level.name) + '">' + U.esc(sc.level.name) + '</span>'
            : '<span class="rpt-na">' + U.esc(statusText(sc)) + '</span>') + '</td></tr>';
      });
    });
    html += '</tbody></table></div>';

    html += '<p class="rpt-note"><b>Benchmarked</b> is the figure actually compared against the reference ' +
      'population — the one that is physiologically appropriate for the test. Strength and bike power are ' +
      'expressed per kilogram of body mass; chin-ups are counted in repetitions and compared within a body-mass ' +
      'band rather than divided by body mass; jumps are absolute distances. Nothing is divided by body mass ' +
      'simply because it can be.' +
      (refsUsed.PGP_PROVISIONAL
        ? ' Every percentile above comes from a <b>PGP provisional standard</b> unless marked ' +
          '<sup class="rpt-refmark">p</sup> (published) or <sup class="rpt-refmark">i</sup> (PGP internal database).'
        : '') + '</p>';
    html += '</section>';

    /* ---------------- what changed ---------------- */
    if (cmp && P.App.ctx.compare) html += retestSection(cmp, as);
    else if (cmp) {
      html += '<div class="no-print" style="margin-bottom:22px">' + U.notice('info',
        '<b>This athlete was tested before, on ' + U.date(cmp.previousDate) + '.</b> ' +
        'Use <b>Show what changed</b> at the top to put the comparison in this report.') + '</div>';
    }

    /* ---------------- what to train ---------------- */
    html += '<section class="rpt-sec"><h2 class="rpt-h">What to train</h2>';
    as.recommendations.cross.forEach(function (c) {
      html += '<p class="rpt-flag">' + U.esc(c.text) + '</p>';
    });
    var ordered = as.recommendations.byCategory.filter(function (r) { return r.tier !== 'high'; })
      .concat(as.recommendations.byCategory.filter(function (r) { return r.tier === 'high'; }));
    ordered.forEach(function (r) {
      html += '<div class="rpt-rec"><div class="rpt-rec-h">' + U.esc(r.categoryName) +
        '<span>' + U.ord(r.percentile) + ' · ' + U.esc(r.level || '') + '</span></div>' +
        '<ul>' + r.items.map(function (i) { return '<li>' + U.esc(i) + '</li>'; }).join('') + '</ul></div>';
    });
    html += '<p class="rpt-note">' + U.esc(as.recommendations.disclaimer) + '</p></section>';

    /* ---------------- retest targets ---------------- */
    html += '<section class="rpt-sec"><h2 class="rpt-h">Targets for the next test</h2>' +
      '<div class="rpt-scroll"><table class="rpt-tbl"><thead><tr><th>Test</th><th class="n">Now</th>' +
      '<th class="n">Target</th><th class="n">Change</th></tr></thead><tbody>';
    targets.targets.forEach(function (t) {
      var key = t.testId + '.' + t.metricKey;
      var val = saved[key] !== undefined ? saved[key] : t.target;
      var change = (val === null || val === undefined) ? null : val - t.current;
      html += '<tr><td>' + U.esc(t.label) + '</td>' +
        '<td class="n">' + U.fmt(t.current, t.dp, t.unit) + '</td>' +
        '<td class="n strong"><input type="number" step="any" class="no-print rpt-target" data-target="' +
        U.esc(key) + '" value="' + (val === null || val === undefined ? '' : U.fmt(val, t.dp)) + '">' +
        '<span class="print-only">' + U.fmt(val, t.dp, t.unit) + '</span></td>' +
        '<td class="n dim">' + (change === null ? '—' : U.fmtSigned(change, t.dp) + ' ' + (t.unit || '')) +
        '</td></tr>';
    });
    html += '</tbody></table></div><p class="rpt-note">' + U.esc(targets.note) +
      ' Suggested interval: ' + targets.weeks + ' weeks.</p></section>';

    /* ---------------- the small print, all in one place ---------------- */
    html += '<section class="rpt-sec rpt-break rpt-back"><h2 class="rpt-h">How this report was produced</h2>';

    html += '<div class="rpt-two">';
    html += '<div><h3 class="rpt-h3">Session</h3><dl class="rpt-dl">' +
      dd('Tested at', venue ? venue.name : '—') + dd('Their gym', gym ? gym.name : '—') +
      dd('Coach', session.coach) + dd('Tester', session.tester) +
      dd('Protocol', session.protocolVersion) +
      dd('Protocol confirmed', session.protocolConfirmed ? 'Yes' : 'NO — treat as non-standardised') +
      '</dl></div>';
    html += '<div><h3 class="rpt-h3">Equipment</h3><dl class="rpt-dl">' +
      dd('Jump device', U.label(P.Settings.EQUIPMENT.jumpDevice, session.equipment.jumpDevice)) +
      dd('Sprint timing', U.label(P.Settings.EQUIPMENT.timingDevice, session.equipment.timingDevice) +
         ' (' + session.equipment.timingMethod + ')') +
      dd('Air bike', U.label(P.Settings.EQUIPMENT.airBike, session.equipment.airBike)) +
      dd('Bike seat', session.equipment.seatPosition) +
      dd('Trap bar', U.label(P.Settings.EQUIPMENT.trapBar, session.equipment.trapBar) +
         (session.equipment.trapBarMassKg ? ' (' + session.equipment.trapBarMassKg + ' kg)' : '')) +
      '</dl></div>';
    html += '</div>';

    html += '<h3 class="rpt-h3">How the numbers were worked out</h3>' +
      '<p class="rpt-note">Each test result is compared against a reference set matched on the test, the protocol ' +
      'conditions, sex, age and — where the metric needs it — body-mass band, and turned into a percentile. ' +
      'A category score is the weighted mean of its contributing test z-scores converted back to a percentile: ' +
      'percentiles are not a linear scale, so averaging them directly distorts the result at the extremes. ' +
      'A test that was not performed is absent from the calculation entirely; it is never entered as a zero and ' +
      'never lowers a score.</p>' +
      '<p class="rpt-note">' + U.esc(as.composite.note) + '</p>';

    if (as.usesProvisional) {
      html += '<h3 class="rpt-h3">About the standards used</h3>' +
        '<p class="rpt-note rpt-caution">' + U.esc(C.provisionalNotice) + '</p>';
    }
    var internalNote = as.metricScores.filter(function (m) {
      return m.internal && m.internal.available;
    })[0];
    if (internalNote) {
      html += '<p class="rpt-note">' + U.esc(internalNote.internal.benchmark.notes) +
        (internalNote.internal.isPrimary ? ''
          : ' That sample is not yet large enough to become the primary reference, so PGP provisional standards ' +
            'were used for this report.') + '</p>';
    }

    var flags = as.issues.filter(function (i) { return i.severity !== 'info'; });
    if (flags.length) {
      html += '<h3 class="rpt-h3">Data quality</h3><ul class="rpt-flags">' +
        flags.map(function (i) {
          var t = P.Tests.get(i.scope);
          return '<li><b>' + U.esc(t ? t.shortName : 'Session') + ':</b> ' + U.esc(i.message) + '</li>';
        }).join('') + '</ul>';
    }
    if (session.notes || session.injuryNotes) {
      html += '<h3 class="rpt-h3">Notes</h3>' +
        (session.notes ? '<p class="rpt-note">' + U.esc(session.notes) + '</p>' : '') +
        (session.injuryNotes ? '<p class="rpt-note"><b>Injury / availability:</b> ' +
          U.esc(session.injuryNotes) + '</p>' : '');
    }
    if (as.observations.some(function (o) { return o.metricKey === 'asymmetry_pct'; })) {
      html += '<p class="rpt-note">' + U.esc(set.asymmetry.disclaimer) + '</p>';
    }
    html += '</section>';

    html += '<footer class="rpt-foot"><b>' + U.esc(set.branding.product) + '</b> · ' +
      U.esc(set.branding.company) + ' · Protocol ' + U.esc(session.protocolVersion) +
      ' · Generated ' + U.date(P.Model.today()) + '<br><br>' + U.esc(C.disclaimer) + '</footer>';

    html += '</div>';
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
        P.App.saveState();
        U.toast('Target saved');
        P.App.render();
      });
    });
  }

  /* Secondary measurements for a test, folded into one muted line under its
     name instead of a row each. */
  function observationLine(as, testId) {
    var obs = as.observations.filter(function (o) {
      return o.testId === testId && o.role !== 'condition' && o.role !== 'sample';
    });
    if (!obs.length) return '';
    return obs.map(function (o) {
      return U.esc(o.metricLabel) + ' ' + U.fmt(o.value, o.dp, o.unit);
    }).join(' · ');
  }

  function dd(k, v) {
    return '<dt>' + U.esc(k) + '</dt><dd>' +
      (v === null || v === undefined || v === '' ? '—' : U.esc(String(v))) + '</dd>';
  }

  /* ====================== RETEST SECTION ====================== */
  function retestSection(cmp, as) {
    var html = '<section class="rpt-sec rpt-break"><h2 class="rpt-h">What changed since ' +
      U.date(cmp.previousDate) + '</h2>';

    if (!cmp.comparable) {
      html += '<p class="rpt-flag">' + cmp.warnings.map(U.esc).join(' ') + '</p>';
    }

    html += '<div class="rpt-tally">' +
      '<div><span class="rpt-tally-n">' + cmp.improved + '</span><span>improved</span>' +
      '<small>beyond measurement error</small></div>' +
      '<div><span class="rpt-tally-n">' + cmp.withinNoise + '</span><span>unchanged</span>' +
      '<small>within measurement variation</small></div>' +
      '<div><span class="rpt-tally-n">' + cmp.declined + '</span><span>declined</span>' +
      '<small>beyond measurement error</small></div>' +
      '<div><span class="rpt-tally-n">' + cmp.weeksBetween + '</span><span>weeks</span>' +
      '<small>between tests</small></div>' +
      '</div>';

    var moved = cmp.categories.filter(function (c) { return c.levelChanged; });
    if (moved.length) {
      html += '<div class="rpt-moves">' + moved.map(function (c) {
        return '<div><b>' + U.esc(c.categoryName) + '</b>' +
          '<span class="rpt-lv lv' + U.levelIndex(c.previousLevel) + ' ghost">' +
          U.esc(c.previousLevel || '—') + '</span>' +
          '<span class="rpt-arrow">→</span>' +
          '<span class="rpt-lv lv' + U.levelIndex(c.currentLevel) + '">' +
          U.esc(c.currentLevel) + '</span></div>';
      }).join('') + '</div>';
    }

    html += '<div id="rpChange" class="no-print"></div>';

    html += '<div class="rpt-scroll"><table class="rpt-tbl"><thead><tr><th>Test</th><th class="n">Before</th>' +
      '<th class="n">Now</th><th class="n">Change</th><th>Verdict</th></tr></thead><tbody>';
    cmp.metrics.forEach(function (r) {
      if (r.previous === null && r.current === null) return;
      var glyph = r.verdict === 'improved' ? '▲' : r.verdict === 'declined' ? '▼' :
                  r.verdict === 'within-noise' ? '=' : '?';
      var cls = r.verdict === 'improved' ? 'up' : r.verdict === 'declined' ? 'down' : 'flat';
      var word = r.verdict === 'within-noise' ? 'within measurement variation'
               : r.verdict === 'unknown' ? 'cannot be judged' : r.verdict;
      html += '<tr><td><b>' + U.esc(r.testName) + '</b>' +
        '<small>' + U.esc(r.metricLabel) + (r.unit ? ' (' + U.esc(r.unit) + ')' : '') + '</small>' +
        (r.equipmentChanged ? '<small class="rpt-caution">equipment changed — not interpretable as adaptation</small>' : '') +
        '</td>' +
        '<td class="n dim">' + U.fmt(r.previous, r.dp) + '</td>' +
        '<td class="n strong">' + U.fmt(r.current, r.dp) + '</td>' +
        '<td class="n">' + (r.change === null ? '—'
          : U.fmtSigned(r.change, r.dp) + '<small>' + U.fmtSigned(r.changePct, 1) + '%</small>') + '</td>' +
        '<td><span class="rpt-verdict ' + cls + '">' + glyph + ' ' + U.esc(word) + '</span>' +
        (r.levelChanged ? '<small>' + U.esc(r.previousLevel || '—') + ' → ' +
          U.esc(r.currentLevel) + '</small>' : '') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<p class="rpt-note">' + U.esc(cmp.caveat) + '</p></section>';
    return html;
  }

  /* ====================== helpers ====================== */
  function absoluteFor(t, r) {
    var map = {
      trapbar: ['load_kg', 'reps'], bench: ['load_kg', 'reps'],
      weighted_chinup: ['added_kg'], bike_12min: ['distance_km'],
      /* bike_30s and bike_repeated are left out on purpose: their numbers are
         already on the observation line under the test name, and repeating
         them in the Recorded column read as an equation. */
      cmj: ['height_cm'], broad_jump: ['distance_m'], sl_broad_jump: ['best_m'],
      sprint_10m: ['time_10m_s'], chinup: ['reps']
    };
    var keys = map[t.id] || [];
    var out = keys.map(function (k) {
      var m = P.Tests.metric(t.id, k);
      var v = r.values ? r.values[k] : null;
      if (v === null || v === undefined || !m) return null;
      return U.fmt(v, m.dp, m.unit);
    }).filter(Boolean);
    /* "150 kg x 3 reps" is one quantity; "1252 W x 999 W" is not. */
    var isLift = (t.id === 'trapbar' || t.id === 'bench');
    return out.join(isLift ? ' × ' : ' · ');
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
