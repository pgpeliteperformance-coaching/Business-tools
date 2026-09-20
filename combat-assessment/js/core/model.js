/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/core/model.js — DATA MODEL
   --------------------------------------------------------------------------
   Structured objects. Nothing is stored as unstructured text except explicit
   `notes` fields.

     Gym            a training facility
     Athlete        a person, independent of any test
     TestingSession one athlete on one date, with equipment + readiness
     TestResult     one test within a session: status, attempts, values
     CategoryScore  produced by engine.js, not stored raw
     Benchmark      see js/config/benchmarks.js
     ProtocolVersion see js/config/settings.js
     Report         produced by engine.js from a session

   deriveSession() computes every derived metric from the raw inputs. Raw
   entries are never overwritten: derived values live in result.values
   alongside the raw ones, and re-deriving is always safe and idempotent.
   ========================================================================== */
(function (root) {
  'use strict';

  var isNode = (typeof require === 'function' && typeof module !== 'undefined');
  var Calc     = isNode ? require('./calc.js')             : root.PGP.Calc;
  var Stats    = isNode ? require('./stats.js')            : root.PGP.Stats;
  var Tests    = isNode ? require('../config/tests.js')    : root.PGP.Tests;
  var Settings = isNode ? require('../config/settings.js') : root.PGP.Settings;

  var M = {};

  /* ---- ids ------------------------------------------------------------- */
  var idCounter = 0;
  M.uid = function (prefix) {
    idCounter++;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' +
           idCounter.toString(36) + Math.random().toString(36).slice(2, 6);
  };

  /* ---- dates ----------------------------------------------------------- */
  M.today = function () { return new Date().toISOString().slice(0, 10); };

  M.formatDate = function (iso) {
    if (!iso) return '—';
    var p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  };

  /* Age in whole years at a given date. */
  M.ageAt = function (dob, atISO) {
    if (!dob) return null;
    var d = new Date(dob), a = new Date(atISO || M.today());
    if (isNaN(d.getTime()) || isNaN(a.getTime())) return null;
    var age = a.getFullYear() - d.getFullYear();
    var m = a.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && a.getDate() < d.getDate())) age--;
    return age >= 0 ? age : null;
  };

  /* ===== GYM ============================================================ */
  M.newGym = function (o) {
    o = o || {};
    return {
      id: o.id || M.uid('gym'),
      name: o.name || '',
      city: o.city || '',
      country: o.country || '',
      primarySport: o.primarySport || 'mma',
      contact: o.contact || '',
      /* Consent to include this gym's data in aggregate reporting. Gym
         dashboards are only shared externally when this is true. */
      aggregateConsent: o.aggregateConsent === true,
      notes: o.notes || '',
      createdAt: o.createdAt || M.today()
    };
  };

  /* ===== ATHLETE ======================================================== */
  M.SPORTS = [
    { id: 'mma', label: 'MMA' },
    { id: 'muay_thai', label: 'Muay Thai' },
    { id: 'boxing', label: 'Boxing' },
    { id: 'kickboxing', label: 'Kickboxing' },
    { id: 'bjj', label: 'BJJ / Grappling' },
    { id: 'wrestling', label: 'Wrestling' },
    { id: 'other', label: 'Other' }
  ];
  M.LEVELS = [
    { id: 'recreational', label: 'Recreational' },
    { id: 'amateur', label: 'Amateur competitor' },
    { id: 'semi_pro', label: 'Semi-professional' },
    { id: 'professional', label: 'Professional' }
  ];
  M.SEXES = [ { id: 'male', label: 'Male' }, { id: 'female', label: 'Female' } ];

  M.newAthlete = function (o) {
    o = o || {};
    return {
      id: o.id || M.uid('ath'),
      /* identity */
      name: o.name || '',
      athleteNumber: o.athleteNumber || null,   /* bib number for event mode */
      dob: o.dob || null,                        /* preferred over a fixed age */
      ageStated: o.ageStated === undefined ? null : o.ageStated, /* if no DOB */
      sex: o.sex || null,
      /* sport context */
      sport: o.sport || 'mma',
      secondarySport: o.secondarySport || null,
      competitiveLevel: o.competitiveLevel || 'amateur',
      trainingAgeYears: o.trainingAgeYears === undefined ? null : o.trainingAgeYears,
      sncTrainingAgeYears: o.sncTrainingAgeYears === undefined ? null : o.sncTrainingAgeYears,
      weightClass: o.weightClass || '',
      stance: o.stance || null,                  /* orthodox | southpaw | switch */
      /* affiliation */
      gymId: o.gymId || null,
      coach: o.coach || '',
      /* record */
      notes: o.notes || '',
      availabilityNotes: o.availabilityNotes || '',
      /* consent to be included in aggregate / internal-norm calculations */
      dataConsent: o.dataConsent === undefined ? true : !!o.dataConsent,
      createdAt: o.createdAt || M.today(),
      archived: !!o.archived
    };
  };

  /* Age used for benchmarking: from DOB at the test date if available,
     otherwise the stated age. */
  M.athleteAgeForSession = function (athlete, session) {
    if (!athlete) return null;
    var a = M.ageAt(athlete.dob, session && session.date);
    if (a !== null) return a;
    return Calc.num(athlete.ageStated);
  };

  /* ===== TEST RESULT ==================================================== */
  /* status:
       'pending'     created but not yet decided — data entry is open, and it
                     becomes 'tested' the moment a value is entered
       'tested'      performed, benchmarked
       'incomplete'  started but not finished — recorded, not benchmarked
       'not_tested'  deliberately not performed, with a reason
     'pending' and 'not_tested' are both treated as absent by the engine.
     Neither is ever scored as zero. */
  M.newResult = function (testId, o) {
    o = o || {};
    var def = Tests.get(testId);
    var r = {
      testId: testId,
      status: o.status || 'pending',
      reason: o.reason || null,           /* from Settings.NOT_TESTED_REASONS */
      attempts: o.attempts || {},         /* { metricKey: [a1, a2, a3] } */
      raw: o.raw || {},                   /* directly entered values */
      values: o.values || {},             /* raw + derived, filled by derive() */
      sprints: o.sprints || null,         /* repeated-sprint test only */
      items: o.items || null,             /* reserved for item-scored tests */
      config: o.config || null,           /* protocol config actually used */
      equipmentNote: o.equipmentNote || '',
      notes: o.notes || '',
      assessor: o.assessor || ''          /* who scored it, where that matters */
    };
    if (def && def.isScreen && !r.items) r.items = {};
    if (def && def.defaultConfig && !r.config) {
      r.config = JSON.parse(JSON.stringify(def.defaultConfig));
    }
    if (def && def.id === 'bike_repeated' && !r.sprints) {
      r.sprints = [];
      for (var i = 0; i < (r.config ? r.config.sprints : 6); i++) {
        r.sprints.push({ peak_watts: null });
      }
    }
    return r;
  };

  /* ===== TESTING SESSION ================================================ */
  M.newSession = function (o) {
    o = o || {};
    var s = {
      id: o.id || M.uid('ses'),
      athleteId: o.athleteId || null,
      date: o.date || M.today(),
      gymId: o.gymId || null,
      eventId: o.eventId || null,            /* testing-day event, if any */
      coach: o.coach || '',
      tester: o.tester || '',
      protocolVersion: o.protocolVersion || Settings.PROTOCOL_VERSION,
      /* body measurements taken on the day */
      bodyMassKg: o.bodyMassKg === undefined ? null : o.bodyMassKg,
      heightCm: o.heightCm === undefined ? null : o.heightCm,
      ageAtTest: o.ageAtTest === undefined ? null : o.ageAtTest,
      bmi: null,
      /* equipment actually used */
      equipment: Object.assign({
        jumpDevice: 'unknown', timingDevice: 'unknown', timingMethod: 'electronic',
        airBike: 'unknown', trapBar: 'unknown', bench: 'unknown',
        pullUpBar: 'unknown', trapBarMassKg: null, benchBarMassKg: null,
        seatPosition: '', notes: ''
      }, o.equipment || {}),
      /* readiness screen */
      readiness: Object.assign({ answers: {}, notes: '', flagged: false }, o.readiness || {}),
      protocolConfirmed: o.protocolConfirmed === true,
      results: o.results || {},
      notes: o.notes || '',
      injuryNotes: o.injuryNotes || '',
      /* workflow */
      complete: o.complete === true,
      createdAt: o.createdAt || new Date().toISOString(),
      updatedAt: o.updatedAt || new Date().toISOString()
    };
    /* ensure a result object exists for every test */
    Tests.TESTS.forEach(function (t) {
      if (!s.results[t.id]) s.results[t.id] = M.newResult(t.id);
    });
    return s;
  };

  /* Has the readiness screen raised anything requiring test modification? */
  M.readinessFlagged = function (session) {
    if (!session || !session.readiness) return false;
    var a = session.readiness.answers || {};
    var flagged = false;
    Settings.READINESS.items.forEach(function (it) {
      if (it.flagIfYes && a[it.key] === 'yes') flagged = true;
    });
    return flagged;
  };

  /* ===== DERIVATION ===================================================== */
  /* Copy a value into result.values only if it is a real number. */
  function put(values, key, v) {
    var n = Calc.num(v);
    if (n !== null) values[key] = n;
    else delete values[key];
  }

  /* Best of the recorded attempts for a metric. */
  M.bestAttempt = function (result, metricKey, direction) {
    var arr = (result.attempts || {})[metricKey];
    return Calc.best(arr, direction === 'low' ? 'low' : 'high');
  };

  /* --------------------------------------------------------------------- */
  M.deriveResult = function (testId, result, session) {
    var def = Tests.get(testId);
    if (!def || !result) return result;
    var bw = Calc.num(session && session.bodyMassKg);
    var v = {};

    /* start from directly entered raw values */
    Object.keys(result.raw || {}).forEach(function (k) { put(v, k, result.raw[k]); });

    /* best-of-attempts overrides the raw field where attempts exist */
    (def.metrics || []).forEach(function (m) {
      if (!result.attempts || !result.attempts[m.key]) return;
      var b = M.bestAttempt(result, m.key, m.direction);
      if (b !== null) put(v, m.key, b);
    });

    switch (testId) {

      case 'cmj':
        /* If only flight time was captured, derive height from it. */
        if (v.height_cm === undefined && v.flight_time_s !== undefined) {
          put(v, 'height_cm', Calc.jumpHeightFromFlightTime(v.flight_time_s));
          v._heightFromFlightTime = true;
        }
        put(v, 'rsi_mod', Calc.calculateRSImod(v.height_cm, v.contact_time_s));
        put(v, 'peak_power_w', Calc.estimateCMJPeakPower(v.height_cm, bw));
        break;

      case 'sl_broad_jump':
        put(v, 'best_m', Calc.best([v.left_m, v.right_m], 'high'));
        put(v, 'asymmetry_pct', Calc.calculateAsymmetry(v.left_m, v.right_m));
        v._weakerSide = Calc.asymmetrySide(v.left_m, v.right_m);
        break;

      case 'sprint_10m':
        if (v.time_20m_s !== undefined && v.time_10m_s !== undefined) {
          put(v, 'split_10_20_s', v.time_20m_s - v.time_10m_s);
        }
        break;

      case 'trapbar':
      case 'bench': {
        var both = Calc.oneRepMaxBoth(v.load_kg, v.reps);
        put(v, 'est_1rm_kg', both.epley);
        put(v, 'est_1rm_kg_brzycki', both.brzycki);
        put(v, 'rel_1rm', Calc.calculateRelativeStrength(v.est_1rm_kg, bw));
        v._estimated = (Calc.num(v.reps) !== null && Calc.num(v.reps) > 1);
        break;
      }

      case 'chinup':
        if (bw !== null && Calc.num(v.reps) !== null) {
          put(v, 'work_kg_reps', bw * v.reps);
        }
        break;

      case 'weighted_chinup': {
        /* A tested single: body mass plus the load, straight over body mass.
           No prediction equation — there is nothing to predict. */
        var sys = Calc.calculateSystemMass(v.added_kg, bw);
        put(v, 'system_mass_kg', sys);
        put(v, 'rel_system_mass', Calc.calculateRelativeStrength(sys, bw));
        break;
      }

      case 'bike_12min': {
        /* Average the minute readings that were actually taken. A missed
           minute is left out of the average, not counted as zero. */
        var mins = [];
        for (var q = 1; q <= (def.minuteSamples || 12); q++) mins.push(v['min_' + q]);
        var got = Stats.numeric(mins);
        if (got.length) {
          put(v, 'mean_watts', Stats.mean(got));
          v._minutesRecorded = got.length;
          v._minutesExpected = def.minuteSamples || 12;
          /* Pacing, made visible rather than hidden inside the average. */
          var half = Math.floor((def.minuteSamples || 12) / 2);
          var first = Stats.numeric(mins.slice(0, half));
          var second = Stats.numeric(mins.slice(half));
          if (first.length && second.length) {
            var f = Stats.mean(first);
            if (f > 0) put(v, 'fade_pct', (f - Stats.mean(second)) / f * 100);
          }
        }
        put(v, 'total_work_kj', Calc.calculateWorkKJ(v.mean_watts, def.durationS));
        put(v, 'w_per_kg', Calc.calculateWPerKg(v.mean_watts, bw));
        break;
      }

      case 'bike_30s': {
        /* Peak, mean and minimum all come out of the three ten-second
           readings, which is why the fatigue index is computable at all. */
        var splits = Stats.numeric((def.splitSamples || []).map(function (k) { return v[k]; }));
        if (splits.length) {
          put(v, 'peak_watts', Math.max.apply(null, splits));
          put(v, 'mean_watts', Stats.mean(splits));
          put(v, 'min_watts', Math.min.apply(null, splits));
          v._splitsRecorded = splits.length;
        }
        put(v, 'total_work_kj', Calc.calculateWorkKJ(v.mean_watts, def.durationS));
        put(v, 'peak_w_per_kg', Calc.calculateWPerKg(v.peak_watts, bw));
        put(v, 'mean_w_per_kg', Calc.calculateWPerKg(v.mean_watts, bw));
        put(v, 'fatigue_index_pct', Calc.calculateFatigueIndex(v.peak_watts, v.min_watts));
        break;
      }

      case 'bike_repeated': {
        /* One number per sprint: its maximum watts. Everything else is
           calculated from those. */
        var cfg = result.config || def.defaultConfig;
        var sprints = result.sprints || [];
        var peaks = sprints.map(function (s) { return s ? s.peak_watts : null; });
        var nPeak = Stats.numeric(peaks).length;
        var pSum = Calc.summariseRepeatedSprints(peaks);

        put(v, 'best_peak_watts', pSum.best);
        put(v, 'worst_peak_watts', pSum.worst);
        put(v, 'mean_peak_watts', pSum.mean);
        put(v, 'mean_peak_w_per_kg', Calc.calculateWPerKg(pSum.mean, bw));

        /* Loss of watts needs the whole set: it is measured against the best
           sprint, so a partial set is not comparable with anything. */
        var full = (nPeak === cfg.sprints);
        if (full) {
          put(v, 'decrement_pct', pSum.decrementPct);
          put(v, 'best_worst_pct', pSum.bestWorstPct);
          put(v, 'slope_w_per_sprint', pSum.slopePerSprint);
        }
        v._sprintsRecorded = nPeak;
        v._sprintsExpected = cfg.sprints;
        v._setComplete = full;
        v._profilePct = pSum.profilePct;
        if (!full && nPeak > 0) {
          v._partialNote = 'Loss of watts not computed: ' + nPeak + ' of ' + cfg.sprints +
            ' sprints recorded. It is measured against the best sprint, so a partial set is not comparable.';
        }
        if (Calc.num(peaks[0]) !== null) v._sprint1PeakWatts = Calc.num(peaks[0]);
        break;
      }

    }

    result.values = v;
    return result;
  };

  /* Derive an entire session. Idempotent, and deliberately does NOT touch
     updatedAt: derivation runs on every load and every render, so stamping
     it here would make a session look freshly edited whenever it was merely
     displayed — and would make an imported file always appear newer than
     the local copy it is being merged into. */
  M.deriveSession = function (session) {
    if (!session) return session;
    session.bmi = Calc.calculateBMI(session.bodyMassKg, session.heightCm);
    session.readiness.flagged = M.readinessFlagged(session);
    Tests.TESTS.forEach(function (t) {
      if (!session.results[t.id]) session.results[t.id] = M.newResult(t.id);
      M.deriveResult(t.id, session.results[t.id], session);
    });
    return session;
  };

  /* Record that a person just changed this session. Call it from the places
     that accept an edit, not from derivation. */
  M.touchSession = function (session) {
    if (session) session.updatedAt = new Date().toISOString();
    return session;
  };

  /* ===== TESTING-DAY EVENT ============================================== */
  M.newEvent = function (o) {
    o = o || {};
    return {
      id: o.id || M.uid('evt'),
      name: o.name || '',
      gymId: o.gymId || null,
      date: o.date || M.today(),
      tester: o.tester || '',
      protocolVersion: o.protocolVersion || Settings.PROTOCOL_VERSION,
      /* athleteId -> { number, status } where status is
         'not_started' | 'in_progress' | 'complete' | 'skipped' */
      queue: o.queue || [],
      equipment: o.equipment || {},
      batteryVariant: o.batteryVariant || 'full_single_session',
      notes: o.notes || '',
      createdAt: o.createdAt || new Date().toISOString()
    };
  };

  /* ===== DATABASE SHAPE ================================================= */
  M.newDatabase = function () {
    return {
      schema: 2,
      product: 'PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT',
      protocolVersion: Settings.PROTOCOL_VERSION,
      exportedAt: null,
      settings: Settings.cloneDefaults(),
      gyms: [],
      athletes: [],
      sessions: [],
      events: [],
      customBenchmarks: [],       /* coach-added reference sets */
      retestTargets: {},          /* sessionId -> { 'testId.metric': target } */
      recommendationOverrides: {} /* sessionId -> [ text ] */
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  root.PGP = root.PGP || {};
  root.PGP.Model = M;
})(typeof globalThis !== 'undefined' ? globalThis : this);
