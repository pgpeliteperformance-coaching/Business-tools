/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/core/csv.js — EXPORT / IMPORT
   --------------------------------------------------------------------------
   JSON  full fidelity, for backup and for moving the database between
         devices. Round-trips without loss.
   CSV   Excel/Sheets-compatible flat tables. A test that was not performed
         exports as an EMPTY CELL, never as 0 — a zero would be read as a
         result by every downstream tool.
   ========================================================================== */
(function (root) {
  'use strict';

  var isNode = (typeof require === 'function' && typeof module !== 'undefined');
  var Tests    = isNode ? require('../config/tests.js')    : root.PGP.Tests;
  var Settings = isNode ? require('../config/settings.js') : root.PGP.Settings;
  var Model    = isNode ? require('./model.js')            : root.PGP.Model;
  var Engine   = isNode ? require('./engine.js')           : root.PGP.Engine;

  var C = {};

  /* ---- CSV primitives -------------------------------------------------- */
  C.csvCell = function (v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    if (s === 'NaN') return '';
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  C.toCSV = function (headers, rows) {
    var out = [headers.map(C.csvCell).join(',')];
    rows.forEach(function (r) {
      out.push(headers.map(function (h) { return C.csvCell(r[h]); }).join(','));
    });
    return out.join('\n');
  };

  /* Parse a CSV string into objects. Handles quoted fields and embedded
     commas, quotes and newlines. */
  C.parseCSV = function (text) {
    var rows = [], row = [], cell = '', inQ = false;
    text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQ = false;
        } else cell += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    var head = rows.shift();
    return rows.filter(function (r) { return r.some(function (c) { return c !== ''; }); })
      .map(function (r) {
        var o = {};
        head.forEach(function (h, j) { o[h] = r[j] === undefined ? '' : r[j]; });
        return o;
      });
  };

  /* ---- JSON ------------------------------------------------------------ */
  C.exportJSON = function (db) {
    var copy = JSON.parse(JSON.stringify(db));
    copy.exportedAt = new Date().toISOString();
    copy.exportedBy = Settings.DEFAULTS.branding.product;
    copy.protocolVersion = Settings.PROTOCOL_VERSION;
    return JSON.stringify(copy, null, 2);
  };

  C.importJSON = function (text) {
    var parsed;
    try { parsed = (typeof text === 'string') ? JSON.parse(text) : text; }
    catch (e) { return { ok: false, error: 'That file is not valid JSON: ' + e.message }; }
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'That file does not contain a PGP database.' };
    }
    if (!Array.isArray(parsed.athletes) || !Array.isArray(parsed.sessions)) {
      return { ok: false, error: 'That file is missing the athletes or sessions list, so it is not a PGP database export.' };
    }
    var fresh = Model.newDatabase();
    var db = Object.assign(fresh, parsed);
    /* merge settings forward: a file saved under an older version may not
       have every setting the current build expects */
    db.settings = Object.assign(Settings.cloneDefaults(), parsed.settings || {});
    db.settings.scoring = Object.assign(Settings.cloneDefaults().scoring, (parsed.settings || {}).scoring || {});
    db.settings.scoring.weights = Object.assign(
      Settings.cloneDefaults().scoring.weights, ((parsed.settings || {}).scoring || {}).weights || {});
    /* re-derive every session so that any calculation change in this build is
       applied to imported data */
    db.sessions.forEach(function (s) {
      Tests.TESTS.forEach(function (t) {
        if (!s.results[t.id]) s.results[t.id] = Model.newResult(t.id);
      });
      Model.deriveSession(s);
    });
    var warnings = [];
    if (parsed.protocolVersion && parsed.protocolVersion !== Settings.PROTOCOL_VERSION) {
      warnings.push('This file was created under protocol ' + parsed.protocolVersion +
        ' and this build is ' + Settings.PROTOCOL_VERSION +
        '. Sessions keep their own recorded protocol version, and results from different protocol versions are not compared.');
    }
    return { ok: true, db: db, warnings: warnings,
             counts: { athletes: db.athletes.length, sessions: db.sessions.length,
                       gyms: db.gyms.length } };
  };

  /* ---- flat session CSV: one row per testing session ------------------- */
  C.sessionColumns = function () {
    var cols = ['athlete_id', 'athlete_name', 'athlete_number', 'sex', 'dob', 'age_at_test',
      'sport', 'competitive_level', 'weight_class', 'stance', 'training_age_years',
      'snc_training_age_years', 'gym', 'coach', 'tester', 'session_id', 'test_date',
      'protocol_version', 'protocol_confirmed', 'body_mass_kg', 'height_cm', 'bmi',
      'readiness_flagged', 'jump_device', 'timing_device', 'timing_method', 'air_bike',
      'trap_bar', 'trap_bar_mass_kg', 'bench', 'pull_up_bar', 'seat_position'];
    Tests.orderedTests().forEach(function (t) {
      cols.push(t.id + '__status', t.id + '__not_tested_reason');
      t.metrics.forEach(function (m) { cols.push(t.id + '__' + m.key); });
      if (t.id === 'bike_repeated') {
        for (var i = 1; i <= 8; i++) {
          cols.push('bike_repeated__s' + i + '_peak_w', 'bike_repeated__s' + i + '_mean_w');
        }
        cols.push('bike_repeated__config');
      }
      if (t.isScreen) {
        (t.items || []).forEach(function (it) { cols.push('movement__' + it.key); });
        cols.push('movement__assessor');
      }
    });
    cols.push('session_notes', 'injury_notes');
    return cols;
  };

  C.sessionRow = function (session, athlete, gym) {
    var r = {};
    r.athlete_id = athlete ? athlete.id : '';
    r.athlete_name = athlete ? athlete.name : '';
    r.athlete_number = athlete ? athlete.athleteNumber : '';
    r.sex = athlete ? athlete.sex : '';
    r.dob = athlete ? athlete.dob : '';
    r.age_at_test = session.ageAtTest;
    r.sport = athlete ? athlete.sport : '';
    r.competitive_level = athlete ? athlete.competitiveLevel : '';
    r.weight_class = athlete ? athlete.weightClass : '';
    r.stance = athlete ? athlete.stance : '';
    r.training_age_years = athlete ? athlete.trainingAgeYears : '';
    r.snc_training_age_years = athlete ? athlete.sncTrainingAgeYears : '';
    r.gym = gym ? gym.name : '';
    r.coach = session.coach; r.tester = session.tester;
    r.session_id = session.id; r.test_date = session.date;
    r.protocol_version = session.protocolVersion;
    r.protocol_confirmed = session.protocolConfirmed ? 'yes' : 'no';
    r.body_mass_kg = session.bodyMassKg; r.height_cm = session.heightCm;
    r.bmi = session.bmi === null ? '' : Math.round(session.bmi * 10) / 10;
    r.readiness_flagged = session.readiness && session.readiness.flagged ? 'yes' : 'no';
    var eq = session.equipment || {};
    r.jump_device = eq.jumpDevice; r.timing_device = eq.timingDevice;
    r.timing_method = eq.timingMethod; r.air_bike = eq.airBike;
    r.trap_bar = eq.trapBar; r.trap_bar_mass_kg = eq.trapBarMassKg;
    r.bench = eq.bench; r.pull_up_bar = eq.pullUpBar; r.seat_position = eq.seatPosition;

    Tests.orderedTests().forEach(function (t) {
      var res = session.results[t.id];
      if (!res) return;
      r[t.id + '__status'] = res.status;
      r[t.id + '__not_tested_reason'] = res.reason || '';
      t.metrics.forEach(function (m) {
        /* KEY RULE: only a test that was actually performed writes a value.
           Everything else stays an empty cell. */
        var v = (res.status === 'tested' || res.status === 'incomplete')
          ? res.values[m.key] : undefined;
        r[t.id + '__' + m.key] = (v === undefined || v === null) ? '' :
          (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);
      });
      if (t.id === 'bike_repeated') {
        (res.sprints || []).forEach(function (s, i) {
          if (i >= 8) return;
          r['bike_repeated__s' + (i + 1) + '_peak_w'] = s && s.peak_watts !== null ? s.peak_watts : '';
          r['bike_repeated__s' + (i + 1) + '_mean_w'] = s && s.mean_watts !== null ? s.mean_watts : '';
        });
        var cfg = res.config;
        r.bike_repeated__config = cfg
          ? cfg.sprints + 'x' + cfg.workS + 's/' + cfg.recoveryS + 's' : '';
      }
      if (t.isScreen) {
        (t.items || []).forEach(function (it) {
          var sc = (res.items || {})[it.key];
          r['movement__' + it.key] = (sc === null || sc === undefined) ? '' : sc;
        });
        r.movement__assessor = res.assessor || '';
      }
    });
    r.session_notes = session.notes; r.injury_notes = session.injuryNotes;
    return r;
  };

  C.exportSessionsCSV = function (db) {
    var ath = {}, gym = {};
    (db.athletes || []).forEach(function (a) { ath[a.id] = a; });
    (db.gyms || []).forEach(function (g) { gym[g.id] = g; });
    var rows = (db.sessions || []).slice()
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); })
      .map(function (s) { return C.sessionRow(s, ath[s.athleteId], gym[s.gymId]); });
    return C.toCSV(C.sessionColumns(), rows);
  };

  /* ---- scored CSV: percentiles, levels and category scores ------------- */
  C.exportScoresCSV = function (db) {
    var ath = {}, gym = {};
    (db.athletes || []).forEach(function (a) { ath[a.id] = a; });
    (db.gyms || []).forEach(function (g) { gym[g.id] = g; });
    var cols = ['athlete_name', 'sex', 'sport', 'competitive_level', 'gym', 'test_date',
                'protocol_version', 'body_mass_kg'];
    Tests.CATEGORIES.forEach(function (c) {
      cols.push('cat_' + c.id + '_percentile', 'cat_' + c.id + '_level', 'cat_' + c.id + '_n');
    });
    Tests.benchmarkedMetrics().forEach(function (m) {
      var k = m.testId + '_' + m.metric.key;
      cols.push(k + '_value', k + '_percentile', k + '_level', k + '_reference_type', k + '_status');
    });
    cols.push('top_strength_1', 'top_strength_2', 'top_strength_3',
              'priority_1', 'priority_2', 'priority_3');

    var rows = (db.sessions || []).slice()
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; })
      .map(function (s) {
        var a = ath[s.athleteId];
        var as = Engine.assessSession(s, a, db, db.settings);
        var r = { athlete_name: a ? a.name : '', sex: a ? a.sex : '',
                  sport: a ? a.sport : '', competitive_level: a ? a.competitiveLevel : '',
                  gym: gym[s.gymId] ? gym[s.gymId].name : '', test_date: s.date,
                  protocol_version: s.protocolVersion, body_mass_kg: s.bodyMassKg };
        as.categoryScores.forEach(function (c) {
          r['cat_' + c.categoryId + '_percentile'] = c.status === 'scored' ? c.displayPercentile : '';
          r['cat_' + c.categoryId + '_level'] = c.level ? c.level.name : '';
          r['cat_' + c.categoryId + '_n'] = c.n;
        });
        as.metricScores.forEach(function (m) {
          var k = m.testId + '_' + m.metricKey;
          r[k + '_value'] = m.value === null ? '' : Math.round(m.value * 1000) / 1000;
          r[k + '_percentile'] = m.status === 'scored' ? m.displayPercentile : '';
          r[k + '_level'] = m.level ? m.level.name : '';
          r[k + '_reference_type'] = m.referenceType || '';
          r[k + '_status'] = m.status;
        });
        for (var i = 0; i < 3; i++) {
          var st2 = as.profile.strengths[i], pr = as.profile.priorities[i];
          r['top_strength_' + (i + 1)] = st2 ? st2.label + ' (' + st2.percentile + 'th)' : '';
          r['priority_' + (i + 1)] = pr ? pr.label + ' (' + pr.percentile + 'th)' : '';
        }
        return r;
      });
    return C.toCSV(cols, rows);
  };

  /* ---- athlete roster CSV --------------------------------------------- */
  C.exportAthletesCSV = function (db) {
    var gym = {};
    (db.gyms || []).forEach(function (g) { gym[g.id] = g; });
    var cols = ['athlete_id', 'name', 'athlete_number', 'dob', 'sex', 'sport',
      'competitive_level', 'weight_class', 'stance', 'training_age_years',
      'snc_training_age_years', 'gym', 'coach', 'data_consent', 'sessions',
      'first_test', 'last_test', 'notes', 'availability_notes'];
    var rows = (db.athletes || []).map(function (a) {
      var ss = (db.sessions || []).filter(function (s) { return s.athleteId === a.id; })
        .sort(function (x, y) { return x.date < y.date ? -1 : 1; });
      return {
        athlete_id: a.id, name: a.name, athlete_number: a.athleteNumber, dob: a.dob,
        sex: a.sex, sport: a.sport, competitive_level: a.competitiveLevel,
        weight_class: a.weightClass, stance: a.stance,
        training_age_years: a.trainingAgeYears, snc_training_age_years: a.sncTrainingAgeYears,
        gym: gym[a.gymId] ? gym[a.gymId].name : '', coach: a.coach,
        data_consent: a.dataConsent ? 'yes' : 'no', sessions: ss.length,
        first_test: ss.length ? ss[0].date : '', last_test: ss.length ? ss[ss.length - 1].date : '',
        notes: a.notes, availability_notes: a.availabilityNotes
      };
    });
    return C.toCSV(cols, rows);
  };

  /* ---- roster import: register a squad from a CSV before a testing day -- */
  C.importAthletesCSV = function (text, db, gymId) {
    var rows = C.parseCSV(text);
    var added = [], skipped = [];
    rows.forEach(function (r, i) {
      var name = (r.name || r.Name || r.athlete_name || '').trim();
      if (!name) { skipped.push('Row ' + (i + 2) + ': no name.'); return; }
      var sexRaw = (r.sex || r.Sex || '').trim().toLowerCase();
      var sex = sexRaw.indexOf('f') === 0 ? 'female' : (sexRaw.indexOf('m') === 0 ? 'male' : null);
      var a = Model.newAthlete({
        name: name,
        athleteNumber: r.athlete_number || r.number || (db.athletes.length + added.length + 1),
        dob: (r.dob || r.DOB || '').trim() || null,
        ageStated: r.age ? parseFloat(r.age) : null,
        sex: sex,
        sport: (r.sport || 'mma').trim().toLowerCase().replace(/\s+/g, '_'),
        competitiveLevel: (r.competitive_level || r.level || 'amateur').trim().toLowerCase().replace(/[\s-]+/g, '_'),
        weightClass: r.weight_class || '',
        stance: r.stance || null,
        trainingAgeYears: r.training_age_years ? parseFloat(r.training_age_years) : null,
        gymId: gymId || null,
        coach: r.coach || '',
        notes: r.notes || ''
      });
      if (!sex) skipped.push('Row ' + (i + 2) + ' (' + name + '): sex not recognised — added, but no percentiles can be produced until it is set.');
      added.push(a);
    });
    return { athletes: added, skipped: skipped };
  };

  /* ---- browser download helper ---------------------------------------- */
  C.download = function (filename, text, mime) {
    if (typeof document === 'undefined') return false;
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    return true;
  };

  C.stamp = function () {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C;
  root.PGP = root.PGP || {};
  root.PGP.Csv = C;
})(typeof globalThis !== 'undefined' ? globalThis : this);
