/* ==========================================================================
   js/ui/protocolview.js — PROTOCOL PAGE (SOP, per-test protocols, order,
                           rationale, assumptions & limitations)
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;
  var tab = 'order';

  var TABS = [
    { id: 'order', label: 'Testing order' },
    { id: 'sop', label: 'Standard operating procedure' },
    { id: 'tests', label: 'Test protocols' },
    { id: 'rationale', label: 'Design decisions' },
    { id: 'limits', label: 'Assumptions & limitations' },
    { id: 'safety', label: 'Safety & readiness' }
  ];

  function render(mount) {
    var set = P.Store.settings();
    var html = '<div class="pg-head"><div class="eyebrow">Protocol ' + U.esc(P.Settings.PROTOCOL_VERSION) + '</div>' +
      '<h1 class="pg-title">PGP Testing Standard Operating Procedure</h1>' +
      '<p class="pg-sub">Everything a second qualified PGP coach needs to run this battery and produce data that ' +
      'pools with everybody else\'s. Print this page and take it to the gym.</p></div>';

    html += '<div class="no-print btn-row" style="margin-bottom:16px">';
    TABS.forEach(function (t) {
      html += '<button class="btn btn-sm' + (tab === t.id ? ' btn-primary' : '') +
        '" data-tab="' + t.id + '">' + U.esc(t.label) + '</button>';
    });
    html += '<button class="btn btn-sm btn-ghost" id="prPrint">Print</button></div>';

    html += '<div id="prBody">' + body(set) + '</div>';
    mount.innerHTML = html;

    U.$$('[data-tab]', mount).forEach(function (b) {
      b.addEventListener('click', function () { tab = b.dataset.tab; P.App.render(); });
    });
    U.$('#prPrint', mount).addEventListener('click', function () { window.print(); });
  }

  function body(set) {
    if (tab === 'order') return orderHtml(set);
    if (tab === 'sop') return sopHtml();
    if (tab === 'tests') return testsHtml();
    if (tab === 'rationale') return rationaleHtml();
    if (tab === 'limits') return limitsHtml();
    return safetyHtml();
  }

  /* ---------------- testing order ---------------- */
  function orderHtml(set) {
    var O = P.Protocol, d = set.testingDay.durations;
    var total = O.TESTING_ORDER.reduce(function (n, o) { return n + (d[o.key] || o.mins || 0); }, 0);
    var h = Math.floor(total / 60), m = total % 60;

    var html = U.notice('gold', '<b>This order was reviewed and changed from the original specification.</b> ' +
      'See <b>Design decisions</b> for what changed and why. The order is part of protocol version ' +
      U.esc(P.Settings.PROTOCOL_VERSION) + ' — changing it changes the protocol.');

    html += '<div class="grid g3" style="margin:16px 0">' +
      tile('Stages', O.TESTING_ORDER.length, 'registration through debrief') +
      tile('Time per athlete', (h ? h + ' h ' : '') + m + ' min', 'including all protocol rest periods') +
      tile('Tests in the battery', P.Tests.TESTS.length, '4 optional, 9 core') +
      '</div>';

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Order of testing</span>' +
      '<span class="card-note">follow exactly · record any deviation</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="min-width:230px">Stage</th>' +
      '<th class="num">Min</th><th>Equipment</th><th>Why here</th></tr></thead><tbody>';
    O.TESTING_ORDER.forEach(function (o) {
      html += '<tr><td><b>' + U.esc(o.label) + '</b></td>' +
        '<td class="num">' + ((d[o.key] || o.mins) || '—') + '</td>' +
        '<td class="fineprint">' + U.esc(o.equipment) + '</td>' +
        '<td class="fineprint">' + U.esc(o.why) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">' + U.esc(O.ORDER_RATIONALE.throughput.title) + '</span></div>' +
      '<div class="card-bd"><p style="line-height:1.7">' + U.esc(O.ORDER_RATIONALE.throughput.body) + '</p></div></div>';

    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">' + U.esc(O.ORDER_RATIONALE.twoSession.title) + '</span></div>' +
      '<div class="card-bd"><p style="line-height:1.7">' + U.esc(O.ORDER_RATIONALE.twoSession.body) + '</p></div></div>';

    return html;
  }

  /* ---------------- SOP ---------------- */
  function sopHtml() {
    var html = '<div class="card" style="margin-bottom:16px"><div class="card-bd">' +
      '<label class="check"><input type="checkbox" disabled><span><b>"I confirm the PGP testing protocol was ' +
      'followed."</b> This confirmation appears on Step 3 of every testing session and is stored with the data. ' +
      'A session where it is unchecked is reported as non-standardised.</span></label></div></div>';

    P.Protocol.SOP.forEach(function (sec) {
      html += '<details class="disc" open><summary>' + U.esc(sec.title) + '</summary><div class="disc-bd"><ul>' +
        sec.items.map(function (i) { return '<li>' + U.esc(i) + '</li>'; }).join('') +
        '</ul></div></details>';
    });
    return html;
  }

  /* ---------------- per-test protocols ---------------- */
  function testsHtml() {
    var FIELDS = [
      ['purpose', 'Purpose'], ['equipment', 'Equipment'], ['setup', 'Set-up'],
      ['warmup', 'Warm-up'], ['instructions', 'What to say to the athlete'],
      ['testProtocol', 'Test protocol'], ['attempts', 'Number of attempts'], ['rest', 'Rest period'],
      ['record', 'What to record'], ['calculation', 'Calculation'], ['scoring', 'Scoring method'],
      ['commonErrors', 'Common errors'], ['stopCriteria', 'Stop criteria'],
      ['standardisation', 'Standardisation requirements']
    ];
    var html = '<p class="pg-sub" style="margin-bottom:14px">Every test in the battery, in testing order.</p>';
    P.Tests.orderedTests().forEach(function (t) {
      var cat = P.Tests.category(t.category);
      if (!cat) return;
      html += '<details class="disc"><summary><span>' + U.esc(t.name) +
        '</span><span class="badge badge-none">' + U.esc(cat.name) +
        (t.optional ? ' · optional' : '') + '</span></summary><div class="disc-bd">';
      html += '<h4>What it measures</h4><p>' + U.esc(t.evidence.whatItMeasures) + '</p>';
      html += '<h4>Why it is relevant to physical preparation</h4><p>' + U.esc(t.evidence.whyRelevant) + '</p>';
      html += '<h4>Limitations</h4><p>' + U.esc(t.evidence.limitations) + '</p>';
      html += '<h4>Strength of the evidence</h4><p>' + U.esc(t.evidence.evidenceStrength) +
        '<br><span style="color:var(--text-muted)">Measurement reliability of this test: <b>' +
        U.esc(t.evidence.testReliability) + '</b></span></p>';
      FIELDS.forEach(function (f) {
        if (!t.protocol[f[0]]) return;
        html += '<h4>' + U.esc(f[1]) + '</h4><p>' + U.esc(t.protocol[f[0]]) + '</p>';
      });
      /* reliability / meaningful change */
      var rel = t.reliability || {};
      var relKeys = Object.keys(rel);
      if (relKeys.length) {
        html += '<h4>Test-retest reliability used for meaningful change</h4>';
        relKeys.forEach(function (k) {
          var r = rel[k], m = P.Tests.metric(t.id, k);
          html += '<p><b>' + U.esc(m ? m.label : k) + ':</b> ' +
            (r.cvPct !== undefined && r.cvPct !== null ? 'CV ' + r.cvPct + '%' : '') +
            (r.typicalError ? 'typical error ' + r.typicalError + ' ' + (m ? m.unit : '') : '') +
            (r.cvPct === undefined && !r.typicalError ? 'not established' : '') +
            ' — <span style="color:var(--text-muted)">' + U.esc(r.source) + '</span>' +
            (r.note ? '<br><span style="color:var(--text-muted)">' + U.esc(r.note) + '</span>' : '') + '</p>';
        });
      }
      html += '</div></details>';
    });
    return html;
  }

  /* ---------------- design decisions ---------------- */
  function rationaleHtml() {
    var R = P.Protocol.ORDER_RATIONALE;
    var html = '<div class="card" style="margin-bottom:16px"><div class="card-bd">' +
      '<p style="line-height:1.7">' + U.esc(R.summary) + '</p></div></div>';

    R.changes.forEach(function (c) {
      html += '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
        '<span class="card-ttl">' + U.esc(c.title) + '</span></div><div class="card-bd">' +
        '<dl class="kv" style="grid-template-columns:auto 1fr;gap:8px 14px">' +
        '<dt>Was</dt><dd style="font-variant-numeric:normal">' + U.esc(c.was) + '</dd>' +
        '<dt>Now</dt><dd style="font-variant-numeric:normal"><b>' + U.esc(c.now) + '</b></dd>' +
        '</dl><h4 style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:14px 0 5px">Why</h4>' +
        '<p style="line-height:1.7">' + U.esc(c.why) + '</p></div></div>';
    });

    html += Q();
    return html;
  }

  /* The twenty questions from the specification, answered. */
  function Q() {
    var qs = [
      ['Are all tests appropriate for combat athletes?',
       'Yes, after trimming. The battery originally carried a rotational medicine-ball throw and a movement observation screen; both were removed, the throw because its distance is so technique-dependent that the number was carrying more noise than signal, and the screen because it is coach observation rather than measurement and did not belong alongside benchmarked results. The bench press is the remaining weak link — no established relationship with any combat-specific quality — and stays only because gyms expect it, optional and weighted at half.'],
      ['Is the testing battery too long?',
       'It was. Two tests have since been cut and the standalone 30-second bike sprint was removed from the default single-session battery, which leaves eleven. Three maximal bike efforts still cannot all be valid in one visit, so the two-session split remains the recommended version and the single-session battery is described as the commercial compromise it is.'],
      ['Which tests have the strongest evidence?',
       'The countermovement jump, the standing broad jump and the electronically timed 10 m sprint: reliable, well-documented, and sensitive to training change.'],
      ['Which have the weakest?',
       'The air-bike tests, by a distance: no published reliability data for fan bikes could be located at all, which is why a PGP reliability study on the specific machines used is the first internal research worth doing. Estimated 1RMs come next, since they carry the error of the test plus the error of the prediction equation.'],
      ['Are the AirBike protocols standardised enough?',
       'Within one machine, yes — provided the seat position is recorded and the warm-up is identical. Across machines, no, and nothing can make them so. The app therefore ties every bike benchmark to a machine family and refuses to score a result from a different one. A PGP reliability study on the specific bikes used is the highest-priority piece of internal research.'],
      ['Should the repeated-sprint test use 30, 45 or 60 seconds recovery?',
       '45 seconds is the PGP default. 30 seconds compresses the set so much that power collapses for everybody, which stops the decrement score discriminating; 60 seconds allows enough recovery that many athletes barely decline, which does the same thing at the other end. 45 seconds with 15-second efforts gives a 1:3 work-to-rest ratio that produces a measurable decline in most trained athletes while keeping the total set under six minutes. It is configurable, and changing it creates a different test, which the app records and refuses to compare.'],
      ['Is a 12-minute AirBike test appropriate for a commercial testing day?',
       'It is defensible but it is the bottleneck: 12 minutes of test plus warm-up and recovery is 20 minutes of machine time per athlete, so one bike serves three athletes an hour. With a 15-athlete squad that is the constraint the whole day is built around. It is kept because a shorter test measures something different and would need its own reference set. If throughput forces a change, make it a named protocol variant with its own version rather than quietly shortening it.'],
      ['Should the 30-second sprint be before or after the 12-minute test?',
       'Before, if both are run — but the real answer is that they should not both be run in one session. A 12-minute maximal effort leaves an athlete unable to produce peak power for the rest of the day, so putting it first guarantees a corrupted sprint. The default battery therefore runs the repeated-sprint set, then a 20-30 minute recovery block, then the 12-minute test last.'],
      ['What is the most defensible method for creating percentiles?',
       'From published descriptive statistics, a z-score against the reported mean and SD, converted through the normal CDF. From a sample of your own, the empirical mid-rank percentile. Both are implemented. What is shipped is neither: provisional band anchors at the 25th, 65th and 90th percentiles with linear interpolation between them, which is honest about being an approximation and is why band-derived percentiles are displayed rounded to the nearest 5.'],
      ['How should male and female athletes be benchmarked?',
       'Against entirely separate reference sets, always, with no substitution in either direction. Where no female reference set exists, the app reports "insufficient reference data" rather than applying a male set with an adjustment. Female combat-athlete field data is scarcer than male data and building the female side of the internal database deserves deliberate priority.'],
      ['How should weight classes be handled?',
       'By choosing the right metric first, and only banding when the metric cannot be fixed. Strength and bike power are expressed per kilogram, which removes most of the body-mass effect. Jumps and throws stay absolute. Chin-up repetitions cannot be normalised sensibly — dividing reps by body mass is meaningless — so they are compared within body-mass bands instead.'],
      ['How much data before PGP internal norms are useful?',
       'The app computes them at 20 matched athletes and shows them as a supplementary comparison, promotes them to the primary reference at 50, and drops the "preliminary" caveat at 100. Below about 20 a percentile is mostly noise. These thresholds are judgement calls and are editable in Settings. Note "matched": 50 athletes in total is not 50 in one sex, age band and protocol.'],
      ['Which variables should be normalised by body mass?',
       'Estimated 1RMs (trap bar, bench), weighted chin-up system mass, and all bike power measures. Those are the cases where absolute output scales strongly with body mass and the relative figure is the more useful number for a weight-class athlete.'],
      ['Which results should be absolute rather than relative?',
       'Jump height, jump distance, throw distance, sprint time and chin-up repetitions. In a vertical or horizontal jump the athlete is already moving their own body mass, so dividing by it double-counts. Sprint time is already a rate. Chin-up reps scale inversely with body mass, so banding is the answer rather than division.'],
      ['How should test-retest error be handled?',
       'Explicitly, on every comparison. A change is only called an improvement or a decline if it exceeds the minimal detectable change (2.77 × typical error); otherwise it is reported as within measurement variation. The typical-error values shipped are conservative placeholders and every verdict drawn from them is labelled provisional until PGP\'s own reliability study replaces them.'],
      ['Which metrics should contribute to category scores?',
       'Only the primary, benchmarked metric of each test — the one that is physiologically appropriate and has a matched reference set. Power takes all four power tests; strength takes the trap bar and chin-up at full weight and the bench and weighted chin-up at half; anaerobic takes peak and mean W/kg equally; repeated effort takes mean sprint power and decrement at 70/30.'],
      ['Which should stay separate?',
       'Inter-limb differences (a difference, not a capacity), the fatigue index, second-half fade on the 12-minute test, total work, distance, heart rate, BMI, estimated peak power from the jump and RSI-modified. These are reported as observations, with context, and none of them moves a category score.'],
      ['Is an overall score scientifically justified?',
       'No. Averaging power, strength, aerobic capacity and repeated-effort percentiles into one number implies those qualities are interchangeable and equally important. Two athletes with an identical composite can need opposite training, which makes the number worse than useless for the decision it looks like it is helping with.'],
      ['So should the system use a profile instead?',
       'Yes, and it does. The profile is the product. A composite index can be enabled in Settings for a customer who insists on one, and it is then labelled explicitly as an unvalidated convenience index.'],
      ['How can this be presented commercially without overstating it?',
       'By selling the thing it actually does. "We measure seven physical qualities against a defined reference population, tell you where the athlete sits on each, identify the two or three worth training next, and re-measure in twelve weeks to show whether it worked." That is a genuinely valuable service and it needs no inflation. Say "PGP provisional standards, being replaced by our own data as the database grows" out loud — coaches trust the person who tells them what the numbers cannot do.']
    ];
    var html = '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Questions asked before building, and the answers</span>' +
      '<span class="card-note">' + qs.length + ' decisions</span></div><div class="card-bd">';
    qs.forEach(function (q, i) {
      html += '<details class="disc"><summary>' + (i + 1) + '. ' + U.esc(q[0]) + '</summary>' +
        '<div class="disc-bd">' + U.esc(q[1]) + '</div></details>';
    });
    html += '</div></div>';
    return html;
  }

  /* ---------------- limitations ---------------- */
  function limitsHtml() {
    var html = U.notice('gold', '<b>This page is deliberately prominent.</b> A testing product that hides its ' +
      'assumptions is a liability. Everything here can be said to a customer without weakening the offer — it is ' +
      'what makes the rest of the numbers trustworthy.') + '<div style="margin-top:16px"></div>';
    P.Protocol.LIMITATIONS.forEach(function (l) {
      html += '<div class="card" style="margin-bottom:12px"><div class="card-bd">' +
        '<div class="stat-lbl">' + U.esc(l.title) + '</div>' +
        '<p style="line-height:1.7;margin-top:6px">' + U.esc(l.body) + '</p></div></div>';
    });
    html += '<div class="card"><div class="card-bd"><div class="stat-lbl">Report disclaimer, printed on every report</div>' +
      '<p class="fineprint" style="margin-top:8px;line-height:1.7">' +
      U.esc(P.Settings.REPORT_COPY.disclaimer) + '</p></div></div>';
    return html;
  }

  /* ---------------- safety ---------------- */
  function safetyHtml() {
    var R = P.Settings.READINESS;
    var html = U.notice('critical', '<b>' + U.esc(R.disclaimer) + '</b>');
    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Pre-test readiness checklist</span>' +
      '<span class="card-note">completed on Step 3 of every session</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Question</th><th>If yes</th></tr></thead><tbody>';
    R.items.forEach(function (i) {
      html += '<tr><td>' + U.esc(i.label) + '</td><td>' +
        (i.flagIfYes ? '<span class="badge badge-warning">Test modification / restriction required</span>'
                     : '<span class="badge badge-none">Recorded for the session record</span>') + '</td></tr>';
    });
    html += '</tbody></table></div><div class="card-bd">' +
      U.notice('warning', '<b>' + U.esc(R.flagMessage) + '</b>') + '</div></div>';

    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Reasons a test may be recorded as NOT TESTED</span></div><div class="card-bd">' +
      '<p class="fineprint" style="margin-bottom:10px">Missing data is never scored as zero and never counts ' +
      'against the athlete. The reason is stored and printed on the report.</p><ul style="margin-left:18px">' +
      P.Settings.NOT_TESTED_REASONS.map(function (r) {
        return '<li style="margin-bottom:4px">' + U.esc(r.label) + '</li>';
      }).join('') + '</ul></div></div>';

    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Stop criteria across the battery</span></div><div class="card-bd"><ul style="margin-left:18px">' +
      P.Tests.orderedTests().map(function (t) {
        return '<li style="margin-bottom:6px"><b>' + U.esc(t.shortName) + ':</b> ' +
          U.esc(t.protocol.stopCriteria) + '</li>';
      }).join('') + '</ul></div></div>';
    return html;
  }

  function tile(l, v, s) {
    return '<div class="stat"><div class="stat-lbl">' + U.esc(l) + '</div><div class="stat-val num">' +
      U.esc(String(v)) + '</div>' + (s ? '<div class="stat-sub">' + U.esc(s) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.protocol = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
