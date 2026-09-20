/* ==========================================================================
   js/ui/athletes.js — ATHLETES LIST, ATHLETE PROFILE, ATHLETE FORM
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;

  var q = { text: '', gymId: '', sport: '', sex: '', level: '' };

  /* ====================== LIST + PROFILE SWITCH ====================== */
  function render(mount) {
    if (P.App.ctx.athleteId && P.Store.athlete(P.App.ctx.athleteId)) renderProfile(mount);
    else renderList(mount);
  }

  /* ====================== LIST ====================== */
  function renderList(mount) {
    var S = P.Store, db = S.db;
    var list = (db.athletes || []).filter(function (a) {
      if (a.archived) return false;
      if (q.text && (a.name || '').toLowerCase().indexOf(q.text.toLowerCase()) === -1) return false;
      if (q.gymId && a.gymId !== q.gymId) return false;
      if (q.sport && a.sport !== q.sport) return false;
      if (q.sex && a.sex !== q.sex) return false;
      if (q.level && a.competitiveLevel !== q.level) return false;
      return true;
    }).sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });

    var html = '<div class="pg-head"><h1 class="pg-title">Athletes</h1>' +
      '<p class="pg-sub">' + (db.athletes || []).length + ' athlete record' +
      ((db.athletes || []).length === 1 ? '' : 's') + ' in this database. ' +
      'Tap an athlete to see their history, profile and reports.</p></div>';

    html += '<div class="btn-row" style="margin-bottom:14px">' +
      '<button class="btn btn-primary" id="athNew">+ New athlete</button>' +
      '<button class="btn" id="athImport">Import roster from CSV</button>' +
      '<button class="btn btn-ghost" id="athExport">Export roster</button></div>';

    html += '<div class="searchbar" id="athFilters">' +
      '<input type="text" data-q="text" placeholder="Search by name…" value="' + U.esc(q.text) + '">' +
      '<select data-q="gymId">' + U.selectOpts(db.gyms.map(function (g) { return { id: g.id, label: g.name }; }), q.gymId, 'All gyms') + '</select>' +
      '<select data-q="sport">' + U.selectOpts(P.Model.SPORTS, q.sport, 'All sports') + '</select>' +
      '<select data-q="sex">' + U.selectOpts(P.Model.SEXES, q.sex, 'All') + '</select>' +
      '<select data-q="level">' + U.selectOpts(P.Model.LEVELS, q.level, 'All levels') + '</select></div>';

    if (!list.length) {
      html += '<div class="card">' + U.empty('No athletes match',
        (db.athletes || []).length ? 'Try clearing the filters.' : 'Add your first athlete to get started.') + '</div>';
      mount.innerHTML = html;
      wireList(mount);
      return;
    }

    html += '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th>#</th><th>Athlete</th><th>Sport</th><th>Level</th><th>Sex</th><th class="num">Age</th>' +
      '<th class="num">Mass</th><th class="num">Tests</th><th>Last test</th><th>Trend (CMJ)</th>' +
      '</tr></thead><tbody>';
    list.forEach(function (a) {
      var ss = S.sessionsFor(a.id);
      var last = ss.length ? ss[ss.length - 1] : null;
      var age = last ? P.Model.athleteAgeForSession(a, last) : P.Model.ageAt(a.dob);
      var cmjs = ss.map(function (s) {
        var v = s.results.cmj && s.results.cmj.status === 'tested' ? s.results.cmj.values.height_cm : null;
        return v === undefined ? null : v;
      });
      html += '<tr class="row-link" data-id="' + U.esc(a.id) + '">' +
        '<td class="dim num">' + (a.athleteNumber === null ? '—' : U.esc(String(a.athleteNumber))) + '</td>' +
        '<td><b>' + U.esc(a.name) + '</b>' + (a.isDemo ? ' <span class="badge badge-none">sample</span>' : '') +
        (a.dataConsent === false ? ' <span class="badge badge-warning">no consent</span>' : '') + '</td>' +
        '<td>' + U.esc(U.sportLabel(a.sport)) + '</td>' +
        '<td class="dim">' + U.esc(U.levelLabel(a.competitiveLevel)) + '</td>' +
        '<td class="dim">' + (a.sex ? U.esc(U.sexLabel(a.sex)) : '<span class="badge badge-warning">not set</span>') + '</td>' +
        '<td class="num dim">' + (age === null ? '—' : age) + '</td>' +
        '<td class="num dim">' + (last && last.bodyMassKg !== null ? U.fmt(last.bodyMassKg, 1) + ' kg' : '—') + '</td>' +
        '<td class="num">' + ss.length + '</td>' +
        '<td class="dim">' + (last ? U.date(last.date) : '—') + '</td>' +
        '<td>' + P.Charts.spark(cmjs) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    mount.innerHTML = html;
    wireList(mount);
  }

  function wireList(mount) {
    U.$$('#athFilters [data-q]', mount).forEach(function (n) {
      var ev = n.tagName === 'SELECT' ? 'change' : 'input';
      n.addEventListener(ev, function () { q[n.dataset.q] = n.value; renderList(mount); });
    });
    U.$$('tr.row-link', mount).forEach(function (r) {
      r.addEventListener('click', function () { P.App.go('athletes', { athleteId: r.dataset.id }); });
    });
    var nw = U.$('#athNew', mount);
    if (nw) nw.addEventListener('click', function () { athleteForm(null); });
    var im = U.$('#athImport', mount);
    if (im) im.addEventListener('click', importRoster);
    var ex = U.$('#athExport', mount);
    if (ex) ex.addEventListener('click', function () { U.exportFile('athletes'); });
  }

  /* ====================== PROFILE ====================== */
  function renderProfile(mount) {
    var S = P.Store, set = S.settings();
    var a = S.athlete(P.App.ctx.athleteId);
    var ss = S.sessionsFor(a.id);
    var gym = S.gym(a.gymId);

    var html = '<div class="btn-row" style="margin-bottom:14px">' +
      '<button class="btn btn-sm btn-ghost" id="athBack">← All athletes</button></div>';

    html += '<div class="pg-head"><div class="eyebrow">' + U.esc(U.sportLabel(a.sport)) + ' · ' +
      U.esc(U.levelLabel(a.competitiveLevel)) + (gym ? ' · ' + U.esc(gym.name) : '') + '</div>' +
      '<h1 class="pg-title">' + U.esc(a.name) + '</h1></div>';

    /* identity card */
    var age = P.Model.ageAt(a.dob) || a.ageStated;
    html += '<div class="grid g21"><div class="card"><div class="card-hd">' +
      '<span class="card-ttl">Athlete record</span>' +
      '<button class="btn btn-sm btn-ghost" id="athEdit">Edit</button></div><div class="card-bd">' +
      '<dl class="kv">' +
      kv('Athlete number', a.athleteNumber) +
      kv('Date of birth', a.dob ? U.date(a.dob) : null) +
      kv('Age', age) +
      kv('Sex', a.sex ? U.sexLabel(a.sex) : null) +
      kv('Sport', U.sportLabel(a.sport)) +
      kv('Competitive level', U.levelLabel(a.competitiveLevel)) +
      kv('Weight class', a.weightClass) +
      kv('Stance', a.stance ? U.titleCase(a.stance) : null) +
      kv('Training age', a.trainingAgeYears === null ? null : a.trainingAgeYears + ' years in the sport') +
      kv('S&C training age', a.sncTrainingAgeYears === null ? null : a.sncTrainingAgeYears + ' years') +
      kv('Gym', gym ? gym.name : null) +
      kv('Coach', a.coach) +
      kv('Data consent', a.dataConsent ? 'Given — included in aggregate reporting and internal norms' : 'NOT given — excluded from aggregates and internal norms') +
      '</dl>';
    if (!a.sex) {
      html += U.notice('warning', '<b>Sex is not recorded.</b> Reference sets are sex-specific and are never ' +
        'substituted for one another, so no percentiles can be produced for this athlete until it is set.');
    }
    if (a.notes) html += '<div class="fineprint" style="margin-top:12px"><b>Notes:</b> ' + U.esc(a.notes) + '</div>';
    if (a.availabilityNotes) html += '<div class="fineprint" style="margin-top:6px"><b>Availability:</b> ' +
      U.esc(a.availabilityNotes) + '</div>';
    html += '</div></div>';

    /* actions */
    html += '<div class="stack"><div class="card"><div class="card-hd"><span class="card-ttl">Actions</span></div>' +
      '<div class="card-bd"><div class="btn-row">' +
      '<button class="btn btn-primary" id="athTest">' + (ss.length ? 'New retest' : 'Start first test') + '</button>' +
      (ss.length ? '<button class="btn" id="athReport">Open latest report</button>' : '') +
      (ss.length > 1 ? '<button class="btn" id="athCompare">Compare last two tests</button>' : '') +
      '<button class="btn btn-danger btn-sm" id="athDelete">Delete athlete</button>' +
      '</div></div></div>';

    /* headline profile from the latest session */
    if (ss.length) {
      var latest = ss[ss.length - 1];
      var as = P.Engine.assessSession(latest, a, S.db, set);
      html += '<div class="card"><div class="card-hd"><span class="card-ttl">Latest profile</span>' +
        '<span class="card-note">' + U.date(latest.date) + '</span></div><div class="card-bd">';
      as.categoryScores.forEach(function (c) {
        html += U.percentileBar({
          label: c.categoryName,
          sub: c.status === 'scored' ? c.n + ' test' + (c.n === 1 ? '' : 's') : null,
          percentile: c.status === 'scored' ? c.percentile : null,
          displayPercentile: c.displayPercentile, level: c.level, scoreType: c.scoreType,
          emptyText: 'Insufficient data',
          tip: c.status === 'scored' ? c.method : c.reason
        });
      });
      html += U.levelLegend(set);
      html += '</div></div>';
    }
    html += '</div></div>';

    /* session history */
    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Testing history</span><span class="card-note">' + ss.length +
      ' session' + (ss.length === 1 ? '' : 's') + '</span></div>';
    if (!ss.length) {
      html += U.empty('No tests yet', 'Run this athlete through the battery to create their first profile.');
    } else {
      html += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Protocol</th>' +
        '<th class="num">Mass</th><th class="num">Tests done</th><th>Flags</th><th>Confirmed</th><th></th>' +
        '</tr></thead><tbody>';
      ss.slice().reverse().forEach(function (s) {
        var done = P.Tests.TESTS.filter(function (t) { return s.results[t.id].status === 'tested'; }).length;
        var iss = P.Validate.validateAll(s, a, set);
        var sum = P.Validate.summary(iss);
        html += '<tr><td>' + U.date(s.date) + '</td>' +
          '<td class="dim">' + U.esc(s.protocolVersion) + '</td>' +
          '<td class="num">' + U.fmt(s.bodyMassKg, 1) + ' kg</td>' +
          '<td class="num">' + done + ' / ' + P.Tests.TESTS.length + '</td>' +
          '<td>' + (sum.error ? '<span class="badge badge-critical">' + sum.error + ' to fix</span> ' : '') +
          (sum.verify ? '<span class="badge badge-warning">' + sum.verify + ' to verify</span>' : '') +
          (!sum.error && !sum.verify ? '<span class="badge badge-good">clean</span>' : '') + '</td>' +
          '<td>' + (s.protocolConfirmed ? '<span class="badge badge-good">yes</span>'
                                        : '<span class="badge badge-warning">no</span>') + '</td>' +
          '<td><div class="btn-row"><button class="btn btn-sm" data-report="' + U.esc(s.id) + '">Report</button>' +
          '<button class="btn btn-sm btn-ghost" data-edit="' + U.esc(s.id) + '">Edit</button></div></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    /* trends */
    if (ss.length > 1) {
      html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
        '<span class="card-ttl">Trend over time</span>' +
        '<select id="trendMetric" style="max-width:280px">' +
        P.Tests.benchmarkedMetrics().map(function (m) {
          return '<option value="' + m.testId + '|' + m.metric.key + '">' +
            U.esc(m.test.shortName + ' — ' + m.metric.label) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="card-bd"><div id="trendChart"></div>' +
        '<div class="fineprint" style="margin-top:10px">Only sessions where this metric was actually measured ' +
        'appear on the trend. A session where the test was not performed is left out — it is not plotted as zero.</div>' +
        '</div></div>';
    }

    mount.innerHTML = html;

    U.$('#athBack', mount).addEventListener('click', function () {
      P.App.go('athletes', { athleteId: null });
    });
    U.$('#athEdit', mount).addEventListener('click', function () { athleteForm(a); });
    U.$('#athTest', mount).addEventListener('click', function () {
      /* Go straight into entry for this athlete rather than sending the
         coach to a picker to choose the person they are already looking at. */
      var T = P.App.views.test, S2 = P.Store;
      var prev = S2.latestSession(a.id);
      var sess = P.Model.newSession({
        athleteId: a.id, gymId: a.gymId || T.gymIdFor(T.day.gym), date: T.day.date || P.Model.today(),
        tester: T.day.tester, coach: a.coach,
        bodyMassKg: prev ? prev.bodyMassKg : null,
        heightCm: prev ? prev.heightCm : null,
        ageAtTest: P.Model.athleteAgeForSession(a, { date: T.day.date || P.Model.today() }),
        equipment: prev ? JSON.parse(JSON.stringify(prev.equipment)) : undefined
      });
      S2.upsertSession(sess);
      P.App.saveState();
      P.App.go('test', { sessionId: sess.id, athleteId: a.id });
    });
    var rb = U.$('#athReport', mount);
    if (rb) rb.addEventListener('click', function () {
      P.App.go('reports', { athleteId: a.id, sessionId: ss[ss.length - 1].id, compare: false });
    });
    var cb = U.$('#athCompare', mount);
    if (cb) cb.addEventListener('click', function () {
      P.App.go('reports', { athleteId: a.id, sessionId: ss[ss.length - 1].id, compare: true });
    });
    U.$('#athDelete', mount).addEventListener('click', function () {
      U.confirm('Delete this athlete?',
        'This permanently removes <b>' + U.esc(a.name) + '</b> and all ' + ss.length +
        ' of their testing sessions from this device. It cannot be undone. Export a JSON backup first if you are not certain.',
        function () {
          P.Store.deleteAthlete(a.id);
          U.toast('Athlete deleted');
          P.App.go('athletes', { athleteId: null });
        }, 'Delete permanently');
    });
    U.$$('[data-report]', mount).forEach(function (b) {
      b.addEventListener('click', function () {
        P.App.go('reports', { athleteId: a.id, sessionId: b.dataset.report, compare: false });
      });
    });
    U.$$('[data-edit]', mount).forEach(function (b) {
      b.addEventListener('click', function () {
        P.App.go('test', { athleteId: a.id, sessionId: b.dataset.edit });
      });
    });

    var tm = U.$('#trendMetric', mount);
    if (tm) {
      var draw = function () {
        var parts = tm.value.split('|');
        var def = P.Tests.get(parts[0]), metric = P.Tests.metric(parts[0], parts[1]);
        var pts = ss.map(function (s) {
          var r = s.results[parts[0]];
          var v = (r && r.status === 'tested') ? r.values[parts[1]] : null;
          var lvl = null;
          if (v !== null && v !== undefined) {
            var msc = P.Engine.scoreMetric(parts[0], parts[1], s, a, S.db, set, {});
            lvl = msc.level ? msc.level.name : null;
          }
          return { date: s.date, value: (v === undefined ? null : v), level: lvl };
        });
        P.Charts.trend(U.$('#trendChart', mount), {
          points: pts, title: def.shortName + ' — ' + metric.label,
          unit: metric.unit, dp: metric.dp, direction: metric.direction
        });
      };
      tm.addEventListener('change', draw);
      draw();
    }
  }

  function kv(k, v) {
    return '<dt>' + U.esc(k) + '</dt><dd>' +
      (v === null || v === undefined || v === '' ? '<span style="color:var(--text-muted)">—</span>' : U.esc(String(v))) +
      '</dd>';
  }

  /* ====================== FORM ====================== */
  function athleteForm(existing) {
    var S = P.Store;
    var a = existing || P.Model.newAthlete({
      athleteNumber: (S.db.athletes || []).length + 1
    });
    var body =
      '<div class="grid g2">' +
      fld('Full name', '<input type="text" id="fName" value="' + U.esc(a.name) + '" placeholder="Athlete name">') +
      fld('Athlete number', '<input type="number" id="fNum" value="' + (a.athleteNumber === null ? '' : U.esc(String(a.athleteNumber))) + '">') +
      fld('Date of birth', '<input type="date" id="fDob" value="' + U.esc(a.dob || '') + '">',
          'Preferred over a stated age: it keeps the age correct at every future retest.') +
      fld('Age (only if no date of birth)', '<input type="number" id="fAge" value="' + (a.ageStated === null ? '' : a.ageStated) + '">') +
      fld('Sex', '<select id="fSex">' + U.selectOpts(P.Model.SEXES, a.sex, 'Select…') + '</select>',
          'Required for benchmarking. Male and female reference sets are never substituted for one another.') +
      fld('Sport', '<select id="fSport">' + U.selectOpts(P.Model.SPORTS, a.sport) + '</select>') +
      fld('Competitive level', '<select id="fLevel">' + U.selectOpts(P.Model.LEVELS, a.competitiveLevel) + '</select>') +
      fld('Weight class', '<input type="text" id="fWc" value="' + U.esc(a.weightClass) + '" placeholder="e.g. Welterweight (77 kg)">') +
      fld('Stance', '<select id="fStance">' + U.selectOpts([
          { id: 'orthodox', label: 'Orthodox' }, { id: 'southpaw', label: 'Southpaw' },
          { id: 'switch', label: 'Switch' }], a.stance, 'Not recorded') + '</select>') +
      fld('Years in the sport', '<input type="number" id="fTa" value="' + (a.trainingAgeYears === null ? '' : a.trainingAgeYears) + '">') +
      fld('Years of structured S&C', '<input type="number" id="fSnc" value="' + (a.sncTrainingAgeYears === null ? '' : a.sncTrainingAgeYears) + '">',
          'Context for interpreting a strength result: an athlete with no lifting history has more room to gain.') +
      fld('Gym', '<input type="text" id="fGym" list="fGymList" value="' +
          U.esc(S.gymName(a.gymId)) + '" placeholder="Type their gym" autocomplete="off">' +
          '<datalist id="fGymList">' + (S.db.gyms || []).map(function (g) {
            return '<option value="' + U.esc(g.name) + '">';
          }).join('') + '</datalist>',
          'Type any gym. If it is not one you have used before it is created for you — nothing to set up first.') +
      fld('Coach', '<input type="text" id="fCoach" value="' + U.esc(a.coach) + '">') +
      '</div>' +
      fld('Notes', '<textarea id="fNotes">' + U.esc(a.notes) + '</textarea>') +
      fld('Injury / availability notes', '<textarea id="fAvail">' + U.esc(a.availabilityNotes) + '</textarea>',
          'Record what the athlete reported. This is a record for training decisions, not a diagnosis.') +
      '<label class="check" style="margin-top:6px"><input type="checkbox" id="fConsent"' +
      (a.dataConsent ? ' checked' : '') + '><span>The athlete agrees to their de-identified results being included ' +
      'in gym-level aggregates and in PGP\'s internal reference norms. Unchecked, they are excluded from both and ' +
      'only ever see their own report.</span></label>';

    U.modal({
      title: existing ? 'Edit athlete' : 'New athlete',
      bodyHtml: body,
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: existing ? 'Save changes' : 'Create athlete', class: 'btn-primary', onClick: function () {
          var name = U.$('#fName').value.trim();
          if (!name) { U.toast('An athlete needs a name'); return true; }
          a.name = name;
          a.athleteNumber = U.numVal(U.$('#fNum'));
          a.dob = U.$('#fDob').value || null;
          a.ageStated = U.numVal(U.$('#fAge'));
          a.sex = U.$('#fSex').value || null;
          a.sport = U.$('#fSport').value;
          a.competitiveLevel = U.$('#fLevel').value;
          a.weightClass = U.$('#fWc').value.trim();
          a.stance = U.$('#fStance').value || null;
          a.trainingAgeYears = U.numVal(U.$('#fTa'));
          a.sncTrainingAgeYears = U.numVal(U.$('#fSnc'));
          a.gymId = S.gymIdForName(U.$('#fGym').value);
          a.coach = U.$('#fCoach').value.trim();
          a.notes = U.$('#fNotes').value.trim();
          a.availabilityNotes = U.$('#fAvail').value.trim();
          a.dataConsent = U.$('#fConsent').checked;
          S.upsertAthlete(a);
          P.App.saveState(true);
          U.toast(existing ? 'Athlete updated' : 'Athlete created');
          P.App.render();
        } }
      ]
    });
  }

  function fld(label, control, hint) {
    return '<div class="field"><label>' + U.esc(label) + '</label>' + control +
      (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + '</div>';
  }

  /* ====================== ROSTER IMPORT ====================== */
  function importRoster() {
    var S = P.Store;
    U.modal({
      title: 'Import a roster from CSV',
      bodyHtml: '<p style="line-height:1.65">Register a whole squad before a testing day. ' +
        'The file needs a header row. Recognised columns:</p>' +
        '<p class="mono fineprint" style="margin:10px 0;padding:10px;background:var(--surface-2);border-radius:8px">' +
        'name, sex, dob, age, sport, competitive_level, weight_class, stance, training_age_years, coach, notes, athlete_number</p>' +
        '<p class="fineprint"><b>name</b> is the only required column. Anything missing can be filled in later — ' +
        'but an athlete with no <b>sex</b> recorded cannot be given a percentile, because reference sets are sex-specific.</p>' +
        fld('Assign all of them to', '<select id="impGym">' + U.selectOpts((S.db.gyms || []).map(function (g) {
          return { id: g.id, label: g.name }; }), '', 'No gym') + '</select>'),
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: 'Choose CSV file…', class: 'btn-primary', onClick: function () {
          var gymId = U.$('#impGym').value || null;
          U.closeModal();
          U.pickFile('.csv,text/csv', function (text) {
            var r = P.Csv.importAthletesCSV(text, S.db, gymId);
            if (!r.athletes.length) { U.toast('No athletes found in that file'); return; }
            r.athletes.forEach(function (a) { S.db.athletes.push(a); });
            S.saveNow();
            P.App.saveState(true);
            U.modal({
              title: 'Roster imported',
              bodyHtml: '<p><b>' + r.athletes.length + '</b> athlete' +
                (r.athletes.length === 1 ? '' : 's') + ' added.</p>' +
                (r.skipped.length ? '<div style="margin-top:12px">' + U.notice('warning',
                  '<b>' + r.skipped.length + ' row' + (r.skipped.length === 1 ? '' : 's') +
                  ' need attention:</b><br>' + r.skipped.map(U.esc).join('<br>')) + '</div>' : ''),
              buttons: [{ label: 'Done', class: 'btn-primary', onClick: function () { P.App.render(); } }]
            });
          });
          return true;
        } }
      ]
    });
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.athletes = { render: render, form: athleteForm };
})(typeof globalThis !== 'undefined' ? globalThis : this);
