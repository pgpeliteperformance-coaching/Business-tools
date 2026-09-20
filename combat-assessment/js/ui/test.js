/* ==========================================================================
   js/ui/test.js — THE ONLY SCREEN YOU NEED AT A GYM
   --------------------------------------------------------------------------
   This replaces the old "New Test" wizard and the separate "Testing Day"
   mode. There was no good reason for both: a testing day IS a gym name and
   a date, so it is now just two fields at the top of one screen rather than
   an object you had to create first.

   Two views only:

     DAY     type the gym, add each athlete, see who is done
     ENTRY   one scrolling page with every test on it

   Nothing has to be registered in advance. Type a name and start entering
   numbers. If that name has been tested before, it is offered as a retest.
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;

  /* What the coach set at the top of the screen. Remembered between visits
     so arriving at the same gym next time needs no setup at all. */
  var day = { gym: '', date: null, tester: '' };
  var loaded = false;

  function boot() {
    if (loaded) return;
    loaded = true;
    var S = P.Store;
    try {
      var saved = JSON.parse(localStorage.getItem('pgp_last_day') || 'null');
      if (saved) { day.gym = saved.gym || ''; day.tester = saved.tester || ''; }
    } catch (e) { /* storage blocked; defaults are fine */ }
    if (!day.date) day.date = P.Model.today();
    if (!day.gym) {
      var last = (S.db.sessions || []).slice().sort(function (a, b) {
        return b.date.localeCompare(a.date);
      })[0];
      var g = last && S.gym(last.gymId);
      if (g) day.gym = g.name;
      if (last && last.tester) day.tester = last.tester;
    }
  }

  function remember() {
    try { localStorage.setItem('pgp_last_day', JSON.stringify({ gym: day.gym, tester: day.tester })); }
    catch (e) { /* nothing to do */ }
  }

  /* Every session recorded at this gym on this date. The "testing day" is
     derived from the data — there is no event record to keep in step. */
  function todaySessions() {
    var S = P.Store;
    return (S.db.sessions || []).filter(function (s) {
      if (s.date !== day.date) return false;
      var g = S.gym(s.gymId);
      return (g ? g.name : '') === day.gym;
    }).sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); });
  }

  /* Find, or quietly create, the gym record behind the typed name. */
  function gymIdFor(name) {
    var S = P.Store;
    name = (name || '').trim();
    if (!name) return null;
    var found = (S.db.gyms || []).filter(function (g) {
      return g.name.toLowerCase() === name.toLowerCase();
    })[0];
    if (found) return found.id;
    var g = P.Model.newGym({ name: name });
    S.upsertGym(g);
    return g.id;
  }

  /* ====================== ROUTER ====================== */
  function render(mount) {
    boot();
    var S = P.Store, ctx = P.App.ctx;
    if (ctx.sessionId && S.session(ctx.sessionId)) renderEntry(mount, S.session(ctx.sessionId));
    else renderDay(mount);
  }

  /* ====================== THE DAY ====================== */
  function renderDay(mount) {
    var S = P.Store;
    var sessions = todaySessions();
    var done = sessions.filter(function (s) { return s.complete; }).length;

    var html = '<div class="pg-head"><h1 class="pg-title">Testing</h1>' +
      '<p class="pg-sub">Type where you are, add each athlete, fill in their numbers. That is the whole thing.</p></div>';

    /* where and when */
    html += '<div class="card" style="margin-bottom:16px"><div class="card-bd">' +
      '<div class="grid g3">' +
      '<div class="field" style="margin:0"><label>Gym</label>' +
      '<input type="text" id="dyGym" list="gymList" value="' + U.esc(day.gym) +
      '" placeholder="Type the gym name" autocomplete="off">' +
      '<datalist id="gymList">' + (S.db.gyms || []).map(function (g) {
        return '<option value="' + U.esc(g.name) + '">';
      }).join('') + '</datalist></div>' +
      '<div class="field" style="margin:0"><label>Date</label>' +
      '<input type="date" id="dyDate" value="' + U.esc(day.date) + '"></div>' +
      '<div class="field" style="margin:0"><label>Tester</label>' +
      '<input type="text" id="dyTester" value="' + U.esc(day.tester) + '" placeholder="Your name"></div>' +
      '</div></div></div>';

    if (!day.gym) {
      html += U.notice('info', 'Type a gym name above to start. Nothing needs setting up first.');
      mount.innerHTML = html;
      wireDay(mount);
      return;
    }

    /* the list */
    html += '<div class="card"><div class="card-hd">' +
      '<span class="card-ttl">' + U.esc(day.gym) + ' — ' + U.date(day.date) + '</span>' +
      '<span class="card-note">' + (sessions.length
        ? done + ' of ' + sessions.length + ' finished' : 'nobody yet') + '</span></div>' +
      '<div class="card-bd">';

    html += '<button class="btn btn-primary btn-lg" id="dyAdd" style="width:100%;margin-bottom:' +
      (sessions.length ? '14px' : '0') + '">+ Add an athlete</button>';

    sessions.forEach(function (s) {
      var a = S.athlete(s.athleteId);
      var n = P.Tests.TESTS.filter(function (t) { return s.results[t.id].status === 'tested'; }).length;
      var prior = S.sessionsFor(s.athleteId).filter(function (x) { return x.date < s.date; }).length;
      html += '<div class="q-item ' + (s.complete ? 'complete' : 'in_progress') +
        '" data-open="' + U.esc(s.id) + '">' +
        '<div class="q-num">' + (s.complete ? '✓' : n) + '</div>' +
        '<div><div class="q-name">' + U.esc(a ? a.name : '—') + '</div>' +
        '<div class="q-meta">' + (a && a.sex ? U.esc(U.sexLabel(a.sex)) : '<b style="color:#f5c353">sex not set</b>') +
        ' · ' + (s.bodyMassKg === null ? '<b style="color:#f5c353">no body mass</b>' : U.fmt(s.bodyMassKg, 1) + ' kg') +
        ' · ' + n + ' of ' + P.Tests.TESTS.length + ' tests' +
        (prior ? ' · retest' : '') + '</div></div>' +
        '<div class="q-meta">' + (s.complete ? 'finished' : 'in progress') + '</div>' +
        '<div><button class="btn btn-sm" data-open2="' + U.esc(s.id) + '">' +
        (s.complete ? 'Reopen' : 'Continue') + '</button></div></div>';
    });

    html += '</div></div>';

    if (done) {
      html += '<div class="btn-row" style="margin-top:16px">' +
        '<button class="btn" id="dyReports">Open today\'s reports</button>' +
        '<button class="btn btn-ghost" id="dyExport">Export today\'s data</button></div>';
    }

    mount.innerHTML = html;
    wireDay(mount);
  }

  function wireDay(mount) {
    var g = U.$('#dyGym', mount), d = U.$('#dyDate', mount), t = U.$('#dyTester', mount);
    if (g) g.addEventListener('change', function () { day.gym = g.value.trim(); remember(); P.App.render(); });
    if (g) g.addEventListener('blur', function () { if (g.value.trim() !== day.gym) { day.gym = g.value.trim(); remember(); P.App.render(); } });
    if (d) d.addEventListener('change', function () { day.date = d.value || P.Model.today(); P.App.render(); });
    if (t) t.addEventListener('change', function () { day.tester = t.value.trim(); remember(); });

    var add = U.$('#dyAdd', mount);
    if (add) add.addEventListener('click', addAthlete);
    U.$$('[data-open],[data-open2]', mount).forEach(function (n) {
      n.addEventListener('click', function (e) {
        e.stopPropagation();
        P.App.go('test', { sessionId: n.dataset.open || n.dataset.open2 });
      });
    });
    var rp = U.$('#dyReports', mount);
    if (rp) rp.addEventListener('click', function () { P.App.go('reports', { sessionId: null }); });
    var ex = U.$('#dyExport', mount);
    if (ex) ex.addEventListener('click', function () { U.exportFile('sessions'); });
  }

  /* ====================== ADD AN ATHLETE ====================== */
  /* Four fields. Everything else can be filled in later, and none of it
     stops you entering numbers. */
  function addAthlete() {
    var S = P.Store;
    U.modal({
      title: 'Who are you testing?',
      bodyHtml:
        '<div class="field"><label>Name</label>' +
        '<input type="text" id="adName" placeholder="Their name" autocomplete="off">' +
        '<div id="adMatch"></div></div>' +
        '<div class="grid g3">' +
        '<div class="field"><label>Sex</label><select id="adSex">' +
        U.selectOpts(P.Model.SEXES, '', 'Select…') + '</select></div>' +
        '<div class="field"><label>Age</label><input class="big" type="number" id="adAge"></div>' +
        '<div class="field"><label>Body mass (kg)</label><input class="big" type="number" step="0.1" id="adMass"></div>' +
        '</div>' +
        '<div class="field"><label>Sport</label><select id="adSport">' +
        U.selectOpts(P.Model.SPORTS, 'mma') + '</select></div>' +
        '<div class="fineprint">Sex and body mass are the two that matter: reference sets are sex-specific, and most ' +
        'results are expressed per kilogram. Everything else can wait.</div>',
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: 'Start testing', class: 'btn-primary', onClick: function () {
          var name = U.$('#adName').value.trim();
          if (!name) { U.toast('Give them a name'); return true; }
          var existing = matchAthlete(name);
          var a;
          if (existing) {
            a = existing;
            if (!a.sex && U.$('#adSex').value) a.sex = U.$('#adSex').value;
            S.upsertAthlete(a);
          } else {
            a = P.Model.newAthlete({
              name: name, sex: U.$('#adSex').value || null,
              ageStated: U.numVal(U.$('#adAge')),
              sport: U.$('#adSport').value,
              gymId: gymIdFor(day.gym), coach: '',
              athleteNumber: todaySessions().length + 1
            });
            S.upsertAthlete(a);
          }
          startSession(a, U.numVal(U.$('#adMass')), U.numVal(U.$('#adAge')));
        } }
      ],
      onOpen: function (body) {
        var nm = U.$('#adName', body);
        nm.focus();
        nm.addEventListener('input', function () {
          var m = matchAthlete(nm.value.trim());
          var box = U.$('#adMatch', body);
          if (!m) { box.innerHTML = ''; return; }
          var prior = P.Store.sessionsFor(m.id).length;
          box.innerHTML = '<div class="hint" style="color:var(--gold-light)">Tested here before — this will be a ' +
            'retest (' + prior + ' previous session' + (prior === 1 ? '' : 's') + '). ' +
            'Their sex, age and sport are already on file.</div>';
          if (m.sex) U.$('#adSex', body).value = m.sex;
          if (m.sport) U.$('#adSport', body).value = m.sport;
          var age = P.Model.ageAt(m.dob) || m.ageStated;
          if (age) U.$('#adAge', body).value = age;
          var last = P.Store.latestSession(m.id);
          if (last && last.bodyMassKg !== null && !U.$('#adMass', body).value) {
            U.$('#adMass', body).value = last.bodyMassKg;
          }
        });
      }
    });
  }

  function matchAthlete(name) {
    if (!name) return null;
    var n = name.toLowerCase();
    return (P.Store.db.athletes || []).filter(function (a) {
      return !a.archived && (a.name || '').toLowerCase() === n;
    })[0] || null;
  }

  function startSession(athlete, mass, age) {
    var S = P.Store;
    var prev = S.latestSession(athlete.id);
    var s = P.Model.newSession({
      athleteId: athlete.id, gymId: gymIdFor(day.gym), date: day.date,
      tester: day.tester, coach: athlete.coach,
      bodyMassKg: mass !== null ? mass : (prev ? prev.bodyMassKg : null),
      heightCm: prev ? prev.heightCm : null,
      ageAtTest: age !== null ? age : P.Model.athleteAgeForSession(athlete, { date: day.date }),
      /* the kit almost never changes between athletes on the same day */
      equipment: prev ? JSON.parse(JSON.stringify(prev.equipment)) : undefined
    });
    S.upsertSession(s);
    P.App.saveState();
    P.App.go('test', { sessionId: s.id });
  }

  /* ====================== ENTRY — ONE PAGE ====================== */
  function renderEntry(mount, W) {
    var S = P.Store, set = S.settings();
    var A = S.athlete(W.athleteId);
    P.Model.deriveSession(W);
    var issues = P.Validate.validateAll(W, A, set);
    var byTest = {};
    issues.forEach(function (i) { (byTest[i.scope] = byTest[i.scope] || []).push(i); });

    var prev = S.sessionsFor(W.athleteId).filter(function (x) {
      return x.id !== W.id && x.date <= W.date;
    }).pop();

    var html = '<div class="btn-row" style="margin-bottom:12px">' +
      '<button class="btn btn-sm btn-ghost" id="enBack">← Back to the list</button>' +
      '<span class="save-state ok" id="enSave">Auto-saved</span></div>';

    html += '<div class="pg-head"><div class="eyebrow">' + U.esc(day.gym || 'Testing') + ' · ' +
      U.date(W.date) + (prev ? ' · retest' : '') + '</div>' +
      '<h1 class="pg-title">' + U.esc(A ? A.name : 'Athlete') + '</h1></div>';

    /* the two fields everything depends on */
    html += '<div class="card" style="margin-bottom:14px"><div class="card-bd">' +
      '<div class="grid g4">' +
      fld('Body mass (kg)', '<input class="big" type="number" step="0.1" data-bind="bodyMassKg" data-recalc value="' +
        (W.bodyMassKg === null ? '' : W.bodyMassKg) + '">') +
      fld('Height (cm)', '<input class="big" type="number" step="0.5" data-bind="heightCm" data-recalc value="' +
        (W.heightCm === null ? '' : W.heightCm) + '">') +
      fld('Age', '<input class="big" type="number" data-bind="ageAtTest" data-recalc value="' +
        (W.ageAtTest === null ? '' : W.ageAtTest) + '">') +
      fld('Sex', '<select data-athlete="sex">' + U.selectOpts(P.Model.SEXES, A ? A.sex : '', 'Not set') + '</select>') +
      '</div>';
    var sessIss = (byTest.session || []).filter(function (i) { return i.severity !== 'info'; });
    if (sessIss.length) {
      html += '<div style="margin-top:10px">' + sessIss.map(function (i) {
        return U.notice(i.severity === 'error' ? 'critical' : 'warning', U.esc(i.message));
      }).join('') + '</div>';
    }
    html += '</div></div>';

    /* everything that is the same for everyone today, out of the way */
    html += '<details class="disc" style="margin-bottom:14px"><summary>' +
      'Kit, readiness and notes <span class="badge badge-none">same for everyone today</span></summary>' +
      '<div class="disc-bd">' + P.App.views.test.kitHtml(W) + '</div></details>';

    /* the tests */
    P.Tests.CATEGORIES.forEach(function (c) {
      var tests = P.Tests.byCategory(c.id);
      html += '<div class="eyebrow" style="margin:20px 0 8px">' + U.esc(c.name) + '</div>';
      tests.forEach(function (t) { html += testRow(t, W, byTest[t.id] || [], prev); });
    });

    html += '<div class="wizard-nav">' +
      '<button class="btn" id="enBack2">← List</button>' +
      '<span class="save-state ok" id="enSave2">Auto-saved</span>' +
      '<button class="btn btn-primary" id="enDone">Finish &amp; see report →</button></div>';

    mount.innerHTML = html;
    P.App.views.test.wireEntry(mount, W, A);
  }

  /* One test, one compact block. */
  function testRow(t, W, iss, prevSession) {
    var r = W.results[t.id];
    var skipped = r.status === 'not_tested';
    var prim = t.metrics.filter(function (m) { return m.role === 'primary'; })[0];
    var prevVal = null;
    if (prevSession && prim) {
      var pr = prevSession.results[t.id];
      if (pr && pr.status === 'tested') prevVal = pr.values[prim.key];
    }

    var html = '<div class="card test-card' + (skipped ? ' skipped' : '') + '" data-test="' + t.id +
      '" style="margin-bottom:10px"><div class="card-bd tight" style="padding-top:13px;padding-bottom:13px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      '<div><div style="font-size:13.5px;font-weight:700">' + U.esc(t.name) +
      (t.optional ? ' <span class="badge badge-none">optional</span>' : '') + '</div>' +
      (prevVal !== null && prevVal !== undefined
        ? '<div class="fineprint">last time: ' + U.fmt(prevVal, prim.dp, prim.unit) + '</div>' : '') +
      '</div>' +
      '<button class="btn btn-sm ' + (skipped ? 'btn-primary' : 'btn-ghost') + '" data-skip="' + t.id + '">' +
      (skipped ? 'Not tested — undo' : 'Not tested') + '</button>' +
      '</div>';

    if (skipped) {
      html += '<div style="margin-top:10px"><select data-bind="results.' + t.id + '.reason">' +
        U.selectOpts(P.Settings.NOT_TESTED_REASONS, r.reason, 'Why not?') + '</select>' +
        '<div class="fineprint" style="margin-top:6px">Never counts against them. The reason is printed on the report.</div>' +
        '</div></div></div>';
      return html;
    }

    html += '<div style="margin-top:12px">' + P.App.views.test.inputs(t, r) + '</div>';
    var real = iss.filter(function (i) { return i.severity !== 'info'; });
    if (real.length) {
      html += '<div style="margin-top:10px">' + real.map(function (i) {
        return U.notice(i.severity === 'error' ? 'critical' : 'warning', U.esc(i.message));
      }).join('') + '</div>';
    }
    return html + '</div></div>';
  }

  function fld(label, control, hint) {
    return '<div class="field" style="margin:0"><label>' + U.esc(label) + '</label>' + control +
      (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.test = { render: render, day: day, fld: fld,
                       gymIdFor: gymIdFor, todaySessions: todaySessions };

  /* kitHtml, inputs and wireEntry live in test-entry.js — split only to keep
     each file readable. */
})(typeof globalThis !== 'undefined' ? globalThis : this);
