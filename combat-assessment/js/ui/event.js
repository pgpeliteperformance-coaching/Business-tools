/* ==========================================================================
   js/ui/event.js — TESTING DAY MODE
   --------------------------------------------------------------------------
   Built for testing 10-30 athletes in one visit: a queue with numbers, a
   status per athlete, a running completion count, a time estimate, and one
   tap from the queue straight into that athlete's data entry.
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;

  function render(mount) {
    var S = P.Store, ctx = P.App.ctx;
    var evt = ctx.eventId ? S.event(ctx.eventId) : null;
    if (!evt) { renderList(mount); return; }
    renderEvent(mount, evt);
  }

  /* ====================== EVENT LIST ====================== */
  function renderList(mount) {
    var S = P.Store;
    var events = (S.db.events || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var html = '<div class="pg-head"><h1 class="pg-title">Testing Day</h1>' +
      '<p class="pg-sub">Set up a gym visit, register or import the squad, give everyone a number, then work down ' +
      'the queue. Everything autosaves as you go, so you can close the lid between athletes.</p></div>';

    html += '<div class="btn-row" style="margin-bottom:16px">' +
      '<button class="btn btn-primary" id="evNew">+ New testing day</button>' +
      '<button class="btn" id="evGym">Manage gyms</button></div>';

    if (!events.length) {
      html += '<div class="card">' + U.empty('No testing days yet',
        'Create one to get a queue, athlete numbers and a completion count.') + '</div>';
    } else {
      html += '<div>';
      events.forEach(function (e) {
        var g = S.gym(e.gymId);
        var done = (e.queue || []).filter(function (q) { return q.status === 'complete'; }).length;
        html += '<div class="q-item" data-ev="' + U.esc(e.id) + '">' +
          '<div class="q-num">' + (e.queue || []).length + '</div>' +
          '<div><div class="q-name">' + U.esc(e.name || 'Untitled testing day') + '</div>' +
          '<div class="q-meta">' + U.date(e.date) + (g ? ' · ' + U.esc(g.name) : '') +
          ' · tester ' + U.esc(e.tester || 'not set') + ' · ' + U.esc(e.protocolVersion) + '</div></div>' +
          '<div class="q-meta">' + done + ' / ' + (e.queue || []).length + ' complete</div>' +
          '<div class="badge ' + (done === (e.queue || []).length && done ? 'badge-good' : 'badge-gold') + '">' +
          (done === (e.queue || []).length && done ? 'Finished' : 'Open') + '</div></div>';
      });
      html += '</div>';
    }
    mount.innerHTML = html;

    /* Wrapped: passing the handler directly hands the MouseEvent in as the
       "existing event" argument, which produces a record with no id. */
    U.$('#evNew', mount).addEventListener('click', function () { newEventForm(null); });
    U.$('#evGym', mount).addEventListener('click', function () { gymForm(); });
    U.$$('[data-ev]', mount).forEach(function (n) {
      n.addEventListener('click', function () { P.App.go('event', { eventId: n.dataset.ev }); });
    });
  }

  /* ====================== EVENT DETAIL ====================== */
  function renderEvent(mount, evt) {
    var S = P.Store, set = S.settings();
    var gym = S.gym(evt.gymId);
    var queue = evt.queue || [];
    var done = queue.filter(function (q) { return q.status === 'complete'; }).length;
    var skipped = queue.filter(function (q) { return q.status === 'skipped'; }).length;
    var pct = queue.length ? Math.round(done / queue.length * 100) : 0;

    var html = '<div class="btn-row" style="margin-bottom:12px">' +
      '<button class="btn btn-sm btn-ghost" id="evBack">← All testing days</button>' +
      '<span class="badge badge-none">' + U.esc(evt.protocolVersion) + '</span></div>';

    html += '<div class="pg-head"><div class="eyebrow">' + U.date(evt.date) +
      (gym ? ' · ' + U.esc(gym.name) : '') + '</div>' +
      '<h1 class="pg-title">' + U.esc(evt.name || 'Testing day') + '</h1></div>';

    /* progress */
    html += '<div class="card" style="margin-bottom:16px"><div class="card-bd">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px">' +
      '<div><div class="stat-lbl">Progress</div><div class="hero-num">' + done + ' <small style="font-size:18px;color:var(--text-secondary)">/ ' +
      queue.length + '</small></div><div class="stat-sub">athletes complete' +
      (skipped ? ' · ' + skipped + ' skipped' : '') + '</div></div>' +
      '<div style="text-align:right"><div class="stat-lbl">Estimated time remaining</div>' +
      '<div class="stat-val num">' + estimate(queue.length - done - skipped, set) + '</div>' +
      '<div class="stat-sub">at one athlete at a time</div></div></div>' +
      '<div class="progress"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '</div></div>';

    /* actions */
    html += '<div class="btn-row" style="margin-bottom:16px">' +
      '<button class="btn btn-primary" id="evNext">Test the next athlete →</button>' +
      '<button class="btn" id="evAdd">Add athletes to the queue</button>' +
      '<button class="btn" id="evImport">Import roster from CSV</button>' +
      '<button class="btn btn-ghost" id="evSchedule">Testing-day schedule</button>' +
      '<button class="btn btn-ghost" id="evEdit">Edit this day</button></div>';

    /* queue */
    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Athlete queue</span>' +
      '<span class="card-note">tap to test · tap the status to change it</span></div><div class="card-bd">';
    if (!queue.length) {
      html += U.empty('Nobody in the queue', 'Add athletes to get started.');
    } else {
      queue.forEach(function (q, i) {
        var a = S.athlete(q.athleteId);
        if (!a) return;
        var ss = S.sessionsFor(a.id);
        var todays = ss.filter(function (s) { return s.date === evt.date; });
        html += '<div class="q-item ' + U.esc(q.status) + '" data-idx="' + i + '">' +
          '<div class="q-num">' + (q.number === undefined ? i + 1 : q.number) + '</div>' +
          '<div><div class="q-name">' + U.esc(a.name) + '</div>' +
          '<div class="q-meta">' + U.esc(U.sportLabel(a.sport)) + ' · ' +
          (a.sex ? U.esc(U.sexLabel(a.sex)) : '<b style="color:#f5c353">sex not set</b>') +
          ' · ' + (ss.length ? ss.length + ' previous session' + (ss.length === 1 ? '' : 's') : 'baseline') +
          (todays.length ? ' · tested today' : '') + '</div></div>' +
          '<div><select data-status="' + i + '" class="no-print" style="width:135px;padding:5px 8px;font-size:11.5px">' +
          U.selectOpts([
            { id: 'not_started', label: 'Not started' }, { id: 'in_progress', label: 'In progress' },
            { id: 'complete', label: 'Complete' }, { id: 'skipped', label: 'Skipped' }
          ], q.status) + '</select></div>' +
          '<div><button class="btn btn-sm" data-test="' + i + '">' +
          (todays.length ? 'Continue' : 'Test') + '</button></div></div>';
      });
    }
    html += '</div></div>';

    if (done) {
      html += '<div class="btn-row" style="margin-top:16px">' +
        '<button class="btn" id="evReports">Open reports for this day</button>' +
        '<button class="btn btn-ghost" id="evExport">Export this day\'s data</button></div>';
    }

    html += '<div style="margin-top:16px">' + U.notice('gold',
      '<b>Before you leave the gym:</b> export a JSON backup from <b>Settings → Data</b>. ' +
      'The database lives in this browser on this device only — an export is the only backup there is.') + '</div>';

    mount.innerHTML = html;

    U.$('#evBack', mount).addEventListener('click', function () { P.App.go('event', { eventId: null }); });
    U.$('#evEdit', mount).addEventListener('click', function () { newEventForm(evt); });
    U.$('#evAdd', mount).addEventListener('click', function () { addToQueue(evt); });
    U.$('#evImport', mount).addEventListener('click', function () { importToEvent(evt); });
    U.$('#evSchedule', mount).addEventListener('click', function () { scheduleModal(set); });
    U.$('#evNext', mount).addEventListener('click', function () {
      var nx = queue.filter(function (q) { return q.status !== 'complete' && q.status !== 'skipped'; })[0];
      if (!nx) { U.toast('Everybody in the queue is done'); return; }
      startAthlete(evt, nx);
    });
    U.$$('[data-test]', mount).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        startAthlete(evt, queue[parseInt(b.dataset.test, 10)]);
      });
    });
    U.$$('[data-status]', mount).forEach(function (sel) {
      sel.addEventListener('click', function (e) { e.stopPropagation(); });
      sel.addEventListener('change', function () {
        queue[parseInt(sel.dataset.status, 10)].status = sel.value;
        S.upsertEvent(evt);
        P.App.saveState(true);
        P.App.render();
      });
    });
    var rp = U.$('#evReports', mount);
    if (rp) rp.addEventListener('click', function () { P.App.go('reports', { sessionId: null }); });
    var ex = U.$('#evExport', mount);
    if (ex) ex.addEventListener('click', function () { U.exportFile('sessions'); });
  }

  function startAthlete(evt, q) {
    var S = P.Store;
    q.status = 'in_progress';
    S.upsertEvent(evt);
    var existing = S.sessionsFor(q.athleteId).filter(function (s) {
      return s.date === evt.date && s.eventId === evt.id;
    })[0];
    if (!existing) {
      /* pre-fill from the event so the coach does not re-enter the kit for
         every athlete */
      var a = S.athlete(q.athleteId);
      var prev = S.latestSession(q.athleteId);
      existing = P.Model.newSession({
        athleteId: q.athleteId, gymId: evt.gymId, eventId: evt.id, date: evt.date,
        coach: a ? a.coach : '', tester: evt.tester,
        protocolVersion: evt.protocolVersion,
        bodyMassKg: prev ? prev.bodyMassKg : null,
        heightCm: prev ? prev.heightCm : null,
        ageAtTest: P.Model.athleteAgeForSession(a, { date: evt.date }),
        equipment: Object.assign({}, prev ? prev.equipment : {}, evt.equipment || {})
      });
      S.upsertSession(existing);
    }
    P.App.go('newtest', { athleteId: q.athleteId, sessionId: existing.id, step: 0 });
  }

  function estimate(remaining, set) {
    if (remaining <= 0) return '—';
    var d = set.testingDay.durations;
    var per = Object.keys(d).reduce(function (n, k) { return n + d[k]; }, 0);
    var mins = remaining * per;
    var h = Math.floor(mins / 60), mm = mins % 60;
    return (h ? h + ' h ' : '') + mm + ' min';
  }

  /* ====================== FORMS ====================== */
  function newEventForm(existing) {
    var S = P.Store;
    /* Guard against being handed a DOM event by a stray listener. */
    if (existing && !existing.id) existing = null;
    var e = existing || P.Model.newEvent({ tester: '' });
    U.modal({
      title: existing ? 'Edit testing day' : 'New testing day',
      bodyHtml: '<div class="grid g2">' +
        f('Name', '<input type="text" id="eName" value="' + U.esc(e.name) + '" placeholder="e.g. Iron Crown MMA — Squad Testing">') +
        f('Date', '<input type="date" id="eDate" value="' + U.esc(e.date) + '">') +
        f('Gym', '<select id="eGym">' + U.selectOpts((S.db.gyms || []).map(function (g) {
          return { id: g.id, label: g.name }; }), e.gymId, 'No gym') + '</select>') +
        f('Tester', '<input type="text" id="eTester" value="' + U.esc(e.tester) + '">') +
        '</div>' +
        f('Notes', '<textarea id="eNotes">' + U.esc(e.notes) + '</textarea>') +
        U.notice('info', 'The protocol version for this day is <b>' + U.esc(e.protocolVersion) +
          '</b>. It is stamped on every session created from this queue.'),
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: existing ? 'Save' : 'Create', class: 'btn-primary', onClick: function () {
          e.name = U.$('#eName').value.trim();
          e.date = U.$('#eDate').value || P.Model.today();
          e.gymId = U.$('#eGym').value || null;
          e.tester = U.$('#eTester').value.trim();
          e.notes = U.$('#eNotes').value.trim();
          S.upsertEvent(e);
          P.App.saveState(true);
          P.App.go('event', { eventId: e.id });
        } }
      ]
    });
  }

  function addToQueue(evt) {
    var S = P.Store;
    var inQueue = {};
    (evt.queue || []).forEach(function (q) { inQueue[q.athleteId] = true; });
    var avail = (S.db.athletes || []).filter(function (a) { return !a.archived && !inQueue[a.id]; })
      .sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    if (!avail.length) {
      U.modal({ title: 'Nobody to add',
        bodyHtml: '<p>Every athlete in the database is already in this queue. Register a new athlete, or import a roster.</p>' });
      return;
    }
    U.modal({
      title: 'Add athletes to the queue',
      bodyHtml: '<p class="fineprint" style="margin-bottom:12px">Athlete numbers are assigned automatically in the ' +
        'order you add them, continuing from the current queue.</p>' +
        avail.map(function (a) {
          return '<label class="check" style="padding:7px 0;border-bottom:1px solid var(--border)">' +
            '<input type="checkbox" data-add="' + U.esc(a.id) + '"><span><b>' + U.esc(a.name) + '</b> ' +
            '<span class="fineprint">' + U.esc(U.sportLabel(a.sport)) + ' · ' +
            (a.sex ? U.esc(U.sexLabel(a.sex)) : 'sex not set') + '</span></span></label>';
        }).join(''),
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: 'Add selected', class: 'btn-primary', onClick: function () {
          var n = (evt.queue || []).length;
          var added = 0;
          U.$$('[data-add]').forEach(function (cb) {
            if (!cb.checked) return;
            evt.queue.push({ athleteId: cb.dataset.add, number: ++n, status: 'not_started' });
            added++;
          });
          if (!added) { U.toast('Nobody selected'); return true; }
          S.upsertEvent(evt);
          P.App.saveState(true);
          U.toast(added + ' added to the queue');
          P.App.render();
        } }
      ]
    });
  }

  function importToEvent(evt) {
    U.pickFile('.csv,text/csv', function (text) {
      var S = P.Store;
      var r = P.Csv.importAthletesCSV(text, S.db, evt.gymId);
      if (!r.athletes.length) { U.toast('No athletes found in that file'); return; }
      var n = (evt.queue || []).length;
      r.athletes.forEach(function (a) {
        S.db.athletes.push(a);
        evt.queue.push({ athleteId: a.id, number: ++n, status: 'not_started' });
      });
      S.upsertEvent(evt);
      S.saveNow();
      P.App.saveState(true);
      U.modal({
        title: 'Roster imported into the queue',
        bodyHtml: '<p><b>' + r.athletes.length + '</b> athlete' + (r.athletes.length === 1 ? '' : 's') +
          ' added and queued.</p>' +
          (r.skipped.length ? '<div style="margin-top:12px">' + U.notice('warning',
            r.skipped.map(U.esc).join('<br>')) + '</div>' : ''),
        buttons: [{ label: 'Start testing', class: 'btn-primary', onClick: function () { P.App.render(); } }]
      });
    });
  }

  function gymForm() {
    var S = P.Store;
    U.modal({
      title: 'Gyms',
      bodyHtml: '<div id="gymList">' + gymRows() + '</div>' +
        '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">' +
        '<div class="stat-lbl" style="margin-bottom:10px">Add a gym</div>' +
        '<div class="grid g2">' +
        f('Name', '<input type="text" id="gName" placeholder="Gym name">') +
        f('City', '<input type="text" id="gCity">') +
        f('Primary sport', '<select id="gSport">' + U.selectOpts(P.Model.SPORTS, 'mma') + '</select>') +
        f('Contact', '<input type="text" id="gContact">') +
        '</div>' +
        '<label class="check"><input type="checkbox" id="gConsent" checked><span>The gym has authorised ' +
        'de-identified, aggregate reporting of its squad\'s results.</span></label>' +
        '<div class="btn-row" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="gAdd">Add gym</button></div>' +
        '</div>',
      buttons: [{ label: 'Done', class: 'btn-primary', onClick: function () { P.App.render(); } }],
      onOpen: function (body) {
        U.$('#gAdd', body).addEventListener('click', function () {
          var name = U.$('#gName', body).value.trim();
          if (!name) { U.toast('A gym needs a name'); return; }
          S.upsertGym(P.Model.newGym({
            name: name, city: U.$('#gCity', body).value.trim(),
            primarySport: U.$('#gSport', body).value,
            contact: U.$('#gContact', body).value.trim(),
            aggregateConsent: U.$('#gConsent', body).checked
          }));
          S.saveNow();
          U.$('#gName', body).value = '';
          U.$('#gCity', body).value = '';
          U.$('#gList', body);
          U.$('#gymList', body).innerHTML = gymRows();
          U.toast('Gym added');
        });
      }
    });
  }

  function gymRows() {
    var S = P.Store;
    if (!(S.db.gyms || []).length) return '<p class="fineprint">No gyms yet.</p>';
    return S.db.gyms.map(function (g) {
      var n = (S.db.athletes || []).filter(function (a) { return a.gymId === g.id; }).length;
      return '<div style="padding:9px 0;border-bottom:1px solid var(--border)"><b>' + U.esc(g.name) + '</b> ' +
        '<span class="fineprint">' + U.esc(g.city || '') + ' · ' + U.esc(U.sportLabel(g.primarySport)) +
        ' · ' + n + ' athlete' + (n === 1 ? '' : 's') + '</span>' +
        (g.aggregateConsent ? '' : ' <span class="badge badge-warning">no aggregate consent</span>') + '</div>';
    }).join('');
  }

  /* ====================== SCHEDULE ====================== */
  function scheduleModal(set) {
    var d = set.testingDay.durations;
    var order = P.Protocol.TESTING_ORDER;
    var total = 0;
    var rows = order.map(function (o) {
      var mins = d[o.key] || 0;
      total += mins;
      return '<tr><td><b>' + U.esc(o.label) + '</b><br><span class="fineprint">' + U.esc(o.why) + '</span></td>' +
        '<td class="num">' + (mins || '—') + '</td>' +
        '<td class="fineprint">' + U.esc(o.equipment || '—') + '</td></tr>';
    }).join('');
    var h = Math.floor(total / 60), m = total % 60;
    U.modal({
      title: 'Testing-day schedule and order',
      bodyHtml: '<p class="fineprint" style="margin-bottom:12px">Estimated durations include the rest periods ' +
        'written into each protocol. Total per athlete: <b>' + (h ? h + ' h ' : '') + m + ' min</b>. ' +
        'Running two or three stations in parallel is how a squad of 15+ fits into a day — see the Protocol page ' +
        'for how to do that without contaminating the results.</p>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Stage</th><th class="num">Min</th>' +
        '<th>Equipment</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
      buttons: [{ label: 'Close' }]
    });
  }

  function f(label, control, hint) {
    return '<div class="field"><label>' + U.esc(label) + '</label>' + control +
      (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.event = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
