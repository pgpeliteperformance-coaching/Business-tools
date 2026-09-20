/* ==========================================================================
   js/ui/database.js — RAW DATABASE VIEW + EXPORT / IMPORT
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;
  var q = { text: '', testId: '', gymId: '', sport: '', sex: '', from: '', to: '' };

  function render(mount) {
    var S = P.Store, db = S.db;
    var rows = buildRows();
    var html = '<div class="pg-head"><h1 class="pg-title">Database</h1>' +
      '<p class="pg-sub">Every stored testing session, with the raw results, the calculated metrics and the ' +
      'protocol and equipment that produced them. Export to CSV for your own analysis, or to JSON as a backup.</p></div>';

    html += '<div class="grid g4" style="margin-bottom:16px">' +
      tile('Athletes', (db.athletes || []).length) +
      tile('Sessions', (db.sessions || []).length) +
      tile('Gyms', (db.gyms || []).length) +
      tile('Stored size', Math.round(S.stats().bytes / 1024) + ' KB', 'in this browser') +
      '</div>';

    html += '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Export and import</span></div><div class="card-bd">' +
      '<div class="btn-row">' +
      '<button class="btn btn-primary" id="dbJson">Export JSON backup</button>' +
      '<button class="btn" id="dbRaw">Export raw results (CSV)</button>' +
      '<button class="btn" id="dbScores">Export scores &amp; percentiles (CSV)</button>' +
      '<button class="btn" id="dbAth">Export athlete roster (CSV)</button>' +
      '<button class="btn btn-ghost" id="dbImport">Import JSON backup</button>' +
      '</div>' +
      U.notice('gold', '<b>The JSON export is the only backup that exists.</b> This database lives in one browser ' +
        'on one device with no server behind it. Clearing site data deletes it. Export after every testing day, and ' +
        'keep the file somewhere that is itself backed up.') +
      '<div class="fineprint" style="margin-top:10px">' +
      '<b>Raw results CSV</b> — one row per session, every attempt and every calculated metric. A test that was not ' +
      'performed exports as an empty cell with its reason in a neighbouring column: never as a zero.<br>' +
      '<b>Scores CSV</b> — percentiles, performance levels, category scores, strengths and priorities, for analysis ' +
      'in Excel or Sheets.</div>' +
      '</div></div>';

    /* filters */
    html += '<div class="searchbar" id="dbFilters">' +
      '<input type="text" data-q="text" placeholder="Search athlete or note…" value="' + U.esc(q.text) + '">' +
      '<select data-q="testId">' + U.selectOpts(P.Tests.orderedTests().map(function (t) {
        return { id: t.id, label: 'Has ' + t.shortName }; }), q.testId, 'Any test') + '</select>' +
      '<select data-q="gymId">' + U.selectOpts((db.gyms || []).map(function (g) {
        return { id: g.id, label: g.name }; }), q.gymId, 'All gyms') + '</select>' +
      '<select data-q="sport">' + U.selectOpts(P.Model.SPORTS, q.sport, 'All sports') + '</select>' +
      '<select data-q="sex">' + U.selectOpts(P.Model.SEXES, q.sex, 'All') + '</select>' +
      '<input type="date" data-q="from" value="' + U.esc(q.from) + '" style="flex:0 1 150px">' +
      '<input type="date" data-q="to" value="' + U.esc(q.to) + '" style="flex:0 1 150px">' +
      '<button class="btn btn-sm btn-ghost" id="dbClear">Clear</button></div>';

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Testing sessions</span>' +
      '<span class="card-note">' + rows.length + ' of ' + (db.sessions || []).length + '</span></div>';
    if (!rows.length) {
      html += U.empty('No sessions match', 'Try clearing the filters.');
    } else {
      html += '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>Date</th><th>Athlete</th><th>Sex</th><th class="num">Mass</th><th>Protocol</th>' +
        '<th>Equipment</th><th class="num">Tested</th><th>Data quality</th><th></th>' +
        '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr><td>' + U.date(r.session.date) + '</td>' +
          '<td><b>' + U.esc(r.athlete ? r.athlete.name : '—') + '</b>' +
          '<br><span class="fineprint">' + U.esc(r.athlete ? U.sportLabel(r.athlete.sport) : '') +
          (r.gym ? ' · ' + U.esc(r.gym.name) : '') + '</span></td>' +
          '<td class="dim">' + U.esc(r.athlete && r.athlete.sex ? U.sexLabel(r.athlete.sex) : '—') + '</td>' +
          '<td class="num">' + U.fmt(r.session.bodyMassKg, 1) + '</td>' +
          '<td class="dim">' + U.esc(r.session.protocolVersion) +
          (r.session.protocolConfirmed ? '' : '<br><span class="badge badge-warning">not confirmed</span>') + '</td>' +
          '<td class="fineprint">' + U.esc(U.label(P.Settings.EQUIPMENT.airBike, r.session.equipment.airBike)) +
          '<br>' + U.esc(U.label(P.Settings.EQUIPMENT.jumpDevice, r.session.equipment.jumpDevice)) + '</td>' +
          '<td class="num">' + r.tested + ' / ' + P.Tests.TESTS.length + '</td>' +
          '<td>' + (r.sum.error ? '<span class="badge badge-critical">' + r.sum.error + ' to fix</span> ' : '') +
          (r.sum.verify ? '<span class="badge badge-warning">' + r.sum.verify + ' to verify</span>' : '') +
          (!r.sum.error && !r.sum.verify ? '<span class="badge badge-good">clean</span>' : '') + '</td>' +
          '<td><div class="btn-row"><button class="btn btn-sm" data-r="' + U.esc(r.session.id) + '">Report</button>' +
          '<button class="btn btn-sm btn-ghost" data-e="' + U.esc(r.session.id) + '">Edit</button>' +
          '<button class="btn btn-sm btn-danger" data-d="' + U.esc(r.session.id) + '">Delete</button></div></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    /* stored data-model reference */
    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">What is stored</span></div><div class="card-bd">' +
      '<details class="disc"><summary>Data model</summary><div class="disc-bd">' +
      '<h4>Athlete</h4><p>Athlete ID, name, athlete number, date of birth or stated age, sex, height and body mass ' +
      '(recorded per session), sport, secondary sport, competitive level, years in the sport, years of structured ' +
      'S&amp;C, weight class, stance, gym, coach, notes, injury and availability notes, data consent, archived flag.</p>' +
      '<h4>TestingSession</h4><p>Session ID, athlete, date, gym, event, coach, tester, protocol version, body mass, ' +
      'height, age at test, BMI, equipment (jump device, timing device and method, air bike, trap bar and its mass, ' +
      'bench and bar mass, chin-up bar, bike seat position), readiness answers and flag, protocol confirmation, ' +
      'session notes, injury notes, completion flag, created and updated timestamps.</p>' +
      '<h4>TestResult (one per test, per session)</h4><p>Status (tested / incomplete / not tested), reason, every ' +
      'attempt, raw entries, all calculated metrics, per-sprint values for the repeated-sprint test, per-item scores ' +
      'for the movement screen, the protocol configuration actually used, assessor, notes.</p>' +
      '<h4>Benchmark</h4><p>Test, metric, reference type, sex, age range, body-mass band, population, sport, level, ' +
      'direction, unit, protocol conditions, method, band anchors or distribution or percentile table, sample size, ' +
      'protocol string, source with a verified flag, confidence, date added, notes.</p>' +
      '<h4>Also stored</h4><p>Gym, testing-day event with its athlete queue and statuses, retest targets per session, ' +
      'settings (levels, weights, thresholds, reference-source rules), and any custom benchmarks added on the ' +
      'Benchmarks page.</p>' +
      '</div></details></div></div>';

    mount.innerHTML = html;
    wire(mount);
  }

  function buildRows() {
    var S = P.Store, set = S.settings();
    return (S.db.sessions || []).map(function (s) {
      var a = S.athlete(s.athleteId);
      return { session: s, athlete: a, gym: S.gym(s.gymId),
               tested: P.Tests.TESTS.filter(function (t) { return s.results[t.id].status === 'tested'; }).length,
               sum: P.Validate.summary(P.Validate.validateAll(s, a, set)) };
    }).filter(function (r) {
      if (q.text) {
        var hay = ((r.athlete ? r.athlete.name : '') + ' ' + (r.session.notes || '')).toLowerCase();
        if (hay.indexOf(q.text.toLowerCase()) === -1) return false;
      }
      if (q.testId && r.session.results[q.testId].status !== 'tested') return false;
      if (q.gymId && r.session.gymId !== q.gymId) return false;
      if (q.sport && (!r.athlete || r.athlete.sport !== q.sport)) return false;
      if (q.sex && (!r.athlete || r.athlete.sex !== q.sex)) return false;
      if (q.from && r.session.date < q.from) return false;
      if (q.to && r.session.date > q.to) return false;
      return true;
    }).sort(function (a, b) { return b.session.date.localeCompare(a.session.date); });
  }

  function wire(mount) {
    U.$$('#dbFilters [data-q]', mount).forEach(function (n) {
      var ev = (n.tagName === 'SELECT' || n.type === 'date') ? 'change' : 'input';
      n.addEventListener(ev, function () { q[n.dataset.q] = n.value; P.App.render(); });
    });
    U.$('#dbClear', mount).addEventListener('click', function () {
      Object.keys(q).forEach(function (k) { q[k] = ''; });
      P.App.render();
    });
    U.$('#dbJson', mount).addEventListener('click', function () { U.exportFile('json'); });
    U.$('#dbRaw', mount).addEventListener('click', function () { U.exportFile('sessions'); });
    U.$('#dbScores', mount).addEventListener('click', function () { U.exportFile('scores'); });
    U.$('#dbAth', mount).addEventListener('click', function () { U.exportFile('athletes'); });
    U.$('#dbImport', mount).addEventListener('click', importJson);

    U.$$('[data-r]', mount).forEach(function (b) {
      b.addEventListener('click', function () {
        var s = P.Store.session(b.dataset.r);
        P.App.go('reports', { sessionId: s.id, athleteId: s.athleteId, compare: false });
      });
    });
    U.$$('[data-e]', mount).forEach(function (b) {
      b.addEventListener('click', function () {
        var s = P.Store.session(b.dataset.e);
        P.App.go('test', { sessionId: s.id, athleteId: s.athleteId });
      });
    });
    U.$$('[data-d]', mount).forEach(function (b) {
      b.addEventListener('click', function () {
        var s = P.Store.session(b.dataset.d), a = P.Store.athlete(s.athleteId);
        U.confirm('Delete this session?',
          'This permanently removes the session of <b>' + U.date(s.date) + '</b> for <b>' +
          U.esc(a ? a.name : 'this athlete') + '</b>. It cannot be undone.',
          function () {
            P.Store.deleteSession(s.id);
            P.App.saveState(true);
            U.toast('Session deleted');
            P.App.render();
          }, 'Delete permanently');
      });
    });
  }

  function importJson() {
    U.modal({
      title: 'Import a JSON backup',
      bodyHtml: '<p style="line-height:1.65">Importing <b>replaces everything currently in this browser</b> with the ' +
        'contents of the file. Export a backup of what is here first if you might need it.</p>' +
        '<p class="fineprint" style="margin-top:10px">Sessions keep their own recorded protocol version, so data ' +
        'from an older protocol is never silently pooled with newer data. Every session is recalculated on import so ' +
        'that any change to the calculation engine in this build is applied.</p>',
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: 'Choose file…', class: 'btn-primary', onClick: function () {
          U.closeModal();
          U.pickFile('.json,application/json', function (text) {
            var r = P.Csv.importJSON(text);
            if (!r.ok) {
              U.modal({ title: 'Import failed',
                bodyHtml: U.notice('critical', U.esc(r.error)) });
              return;
            }
            P.Store.replace(r.db);
            P.App.saveState(true);
            U.modal({
              title: 'Import complete',
              bodyHtml: '<p><b>' + r.counts.athletes + '</b> athletes, <b>' + r.counts.sessions +
                '</b> sessions and <b>' + r.counts.gyms + '</b> gyms loaded.</p>' +
                (r.warnings.length ? '<div style="margin-top:12px">' +
                  U.notice('warning', r.warnings.map(U.esc).join('<br>')) + '</div>' : ''),
              buttons: [{ label: 'Done', class: 'btn-primary', onClick: function () {
                P.App.go('dashboard');
              } }]
            });
          });
          return true;
        } }
      ]
    });
  }

  function tile(l, v, s) {
    return '<div class="stat"><div class="stat-lbl">' + U.esc(l) + '</div><div class="stat-val num">' +
      U.esc(String(v)) + '</div>' + (s ? '<div class="stat-sub">' + U.esc(s) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.database = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
