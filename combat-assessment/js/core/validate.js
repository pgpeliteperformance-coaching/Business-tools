/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/core/validate.js — DATA VALIDATION
   --------------------------------------------------------------------------
   The validator NEVER changes a value. It returns issues for the coach to
   resolve. Three severities:

     'error'  Physically impossible or structurally broken (a negative jump
              height, reps without a load). The value is not benchmarked
              until it is resolved.
     'verify' Possible but outside the expected range, or internally
              inconsistent. Benchmarked, but the metric is marked flagged
              and is excluded from the strengths / priorities lists.
     'info'   Worth knowing (youth athlete, hand timing, provisional
              reference, incomplete test) but not a data problem.

   The message is always a request, never a correction:
       "Please verify this value."
   ========================================================================== */
(function (root) {
  'use strict';

  var isNode = (typeof require === 'function' && typeof module !== 'undefined');
  var Calc     = isNode ? require('./calc.js')             : root.PGP.Calc;
  var Tests    = isNode ? require('../config/tests.js')    : root.PGP.Tests;
  var Settings = isNode ? require('../config/settings.js') : root.PGP.Settings;

  var V = {};

  function issue(severity, scope, key, message, extra) {
    return Object.assign({
      severity: severity, scope: scope, key: key, message: message
    }, extra || {});
  }

  /* ---- session-level: athlete measurements ----------------------------- */
  V.validateSession = function (session, athlete, settings) {
    var st = (settings || Settings.DEFAULTS).validation;
    var out = [];
    var bw = Calc.num(session.bodyMassKg);
    var ht = Calc.num(session.heightCm);
    var age = Calc.num(session.ageAtTest);

    if (bw === null) {
      out.push(issue('error', 'session', 'bodyMassKg',
        'Body mass is required: most metrics in this battery are expressed relative to body mass and cannot be calculated without it.'));
    } else if (bw <= 0) {
      out.push(issue('error', 'session', 'bodyMassKg', 'Body mass must be greater than zero. Please verify this value.'));
    } else if (bw < st.bodyMassKg[0] || bw > st.bodyMassKg[1]) {
      out.push(issue('verify', 'session', 'bodyMassKg',
        'Body mass of ' + bw + ' kg is outside the expected range for an adult athlete (' +
        st.bodyMassKg[0] + '-' + st.bodyMassKg[1] + ' kg). Please verify this value.'));
    }

    if (ht !== null && (ht < st.heightCm[0] || ht > st.heightCm[1])) {
      out.push(issue('verify', 'session', 'heightCm',
        'Height of ' + ht + ' cm is outside the expected range (' + st.heightCm[0] + '-' +
        st.heightCm[1] + ' cm). Please verify this value.'));
    }

    if (age === null) {
      out.push(issue('verify', 'session', 'ageAtTest',
        'No age available. Age is used to match the athlete to a reference set — without it, benchmarking falls back to the widest available set.'));
    } else {
      if (age < st.ageYears[0] || age > st.ageYears[1]) {
        out.push(issue('verify', 'session', 'ageAtTest',
          'Age of ' + age + ' is outside the expected range. Please verify the date of birth.'));
      }
      if (age < st.youthAgeCutoff) {
        out.push(issue('info', 'session', 'ageAtTest',
          'YOUTH ATHLETE (' + age + '). The adult reference sets in this app do not apply to a still-maturing athlete, and no youth reference sets are available. Results are recorded and can be tracked against the athlete\'s own previous tests, but no percentile is reported.'));
      }
    }

    if (!athlete || !athlete.sex) {
      out.push(issue('verify', 'session', 'sex',
        'Athlete sex is not recorded. Reference sets are sex-specific and are never substituted for one another, so no percentiles can be produced without it.'));
    }

    if (!session.protocolConfirmed) {
      out.push(issue('info', 'session', 'protocolConfirmed',
        'The PGP testing protocol has not been confirmed as followed for this session. Results are saved but should be treated as non-standardised.'));
    }

    if (session.readiness && session.readiness.flagged) {
      out.push(issue('info', 'session', 'readiness', Settings.READINESS.flagMessage));
    }

    /* equipment recorded? */
    var eq = session.equipment || {};
    if (eq.timingMethod === 'hand' || eq.timingDevice === 'handheld') {
      out.push(issue('info', 'session', 'timingMethod',
        'Sprint was hand timed. Hand-timing error exceeds the difference between performance levels, so the 10 m sprint result is recorded but NOT benchmarked.'));
    }
    if (eq.airBike === 'unknown' && ['bike_12min', 'bike_30s', 'bike_repeated'].some(function (t) {
      return session.results[t] && session.results[t].status === 'tested';
    })) {
      out.push(issue('verify', 'session', 'airBike',
        'A bike test was performed but the air-bike model was not recorded. Power readings differ between machines, so an unrecorded machine cannot be benchmarked or compared at retest.'));
    }
    if (eq.jumpDevice === 'unknown' && session.results.cmj && session.results.cmj.status === 'tested') {
      out.push(issue('verify', 'session', 'jumpDevice',
        'A countermovement jump was recorded but the measuring device was not. Devices produce systematically different jump heights.'));
    }
    if (session.results.trapbar && session.results.trapbar.status === 'tested' &&
        Calc.num(eq.trapBarMassKg) === null) {
      out.push(issue('verify', 'session', 'trapBarMassKg',
        'Trap-bar mass was not recorded. Trap bars vary between roughly 25 kg and 32 kg, which changes the total load and therefore the estimated 1RM.'));
    }
    return out;
  };

  /* ---- result-level ---------------------------------------------------- */
  V.validateResult = function (testId, result, session) {
    var def = Tests.get(testId);
    var out = [];
    if (!def || !result) return out;
    if (result.status !== 'tested' && result.status !== 'incomplete') return out;

    var v = result.values || {};

    /* range checks against the test definition */
    (def.metrics || []).forEach(function (m) {
      var x = Calc.num(v[m.key]);
      if (x === null) return;
      if (m.hardRange && (x < m.hardRange[0] || x > m.hardRange[1])) {
        out.push(issue('error', testId, m.key,
          m.label + ' of ' + x + ' ' + (m.unit || '') +
          ' is outside the physically possible range for this test. Please verify this value — it will not be benchmarked until it is resolved.'));
        return;
      }
      if (m.range && (x < m.range[0] || x > m.range[1])) {
        out.push(issue('verify', testId, m.key,
          m.label + ' of ' + x + ' ' + (m.unit || '') + ' is outside the expected range (' +
          m.range[0] + '-' + m.range[1] + ' ' + (m.unit || '') + '). Please verify this value.'));
      }
    });

    /* attempts must be internally plausible */
    Object.keys(result.attempts || {}).forEach(function (k) {
      var m = Tests.metric(testId, k);
      if (!m) return;
      var arr = (result.attempts[k] || []).map(Calc.num).filter(function (x) { return x !== null; });
      if (arr.length < 2) return;
      var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr);
      if (mn <= 0) return;
      var spread = (mx - mn) / mn * 100;
      var limit = m.direction === 'low' ? 8 : 15;
      if (spread > limit) {
        out.push(issue('verify', testId, k,
          'Attempts for ' + m.label + ' vary by ' + spread.toFixed(1) +
          '% (' + arr.join(', ') + '). That is more variation than expected for this test — please verify the values, and consider whether an extra attempt is needed.'));
      }
    });

    /* ---- test-specific cross-checks ---------------------------------- */
    switch (testId) {

      case 'cmj':
        if (v._heightFromFlightTime) {
          out.push(issue('info', testId, 'height_cm',
            'Jump height was derived from flight time (h = g t^2 / 8). This assumes identical take-off and landing positions; tucking the knees in flight inflates the result.'));
        }
        if (Calc.num(v.height_cm) !== null && Calc.num(v.flight_time_s) !== null && !v._heightFromFlightTime) {
          var implied = Calc.jumpHeightFromFlightTime(v.flight_time_s);
          if (implied !== null && Math.abs(implied - v.height_cm) > 5) {
            out.push(issue('verify', testId, 'flight_time_s',
              'Recorded jump height (' + v.height_cm.toFixed(1) + ' cm) and flight time (' +
              v.flight_time_s + ' s, which implies ' + implied.toFixed(1) +
              ' cm) disagree by more than 5 cm. Please verify both values.'));
          }
        }
        break;

      case 'sl_broad_jump':
        if (Calc.num(v.asymmetry_pct) !== null && v.asymmetry_pct > 25) {
          out.push(issue('verify', testId, 'asymmetry_pct',
            'A difference of ' + v.asymmetry_pct.toFixed(1) +
            '% between legs is large enough to suggest a recording error or a technique problem on one side. Please verify both values before interpreting the difference.'));
        }
        break;

      case 'sprint_10m':
        if (Calc.num(v.time_20m_s) !== null && Calc.num(v.time_10m_s) !== null &&
            v.time_20m_s <= v.time_10m_s) {
          out.push(issue('error', testId, 'time_20m_s',
            'The 20 m time must be greater than the 10 m time. Please verify these values.'));
        }
        if (Calc.num(v.time_30m_s) !== null && Calc.num(v.time_20m_s) !== null &&
            v.time_30m_s <= v.time_20m_s) {
          out.push(issue('error', testId, 'time_30m_s',
            'The 30 m time must be greater than the 20 m time. Please verify these values.'));
        }
        if (Calc.num(v.time_10m_s) !== null && v.time_10m_s < 1.4) {
          out.push(issue('verify', testId, 'time_10m_s',
            'A 10 m time of ' + v.time_10m_s +
            ' s is faster than elite track sprinters achieve from this start. The usual cause is the athlete rocking backwards before starting, or a gate triggering early. Please verify this value.'));
        }
        break;

      case 'trapbar':
      case 'bench': {
        var load = Calc.num(v.load_kg), reps = Calc.num(v.reps);
        if (load !== null && reps === null) {
          out.push(issue('error', testId, 'reps',
            'A load was entered without a repetition count. The estimated 1RM cannot be calculated. Please enter the repetitions completed.'));
        }
        if (reps !== null && load === null) {
          out.push(issue('error', testId, 'load_kg',
            'Repetitions were entered without a load. Please enter the load lifted.'));
        }
        if (reps !== null && reps > 12) {
          out.push(issue('verify', testId, 'reps',
            reps + ' repetitions is too many for a reliable 1RM estimate — prediction error grows sharply beyond about 10 reps, so no estimate is produced. Retest with a heavier load and a target of 3 to 5 repetitions.'));
        }
        if (v._estimated) {
          out.push(issue('info', testId, 'est_1rm_kg',
            'ESTIMATED 1RM — not an actual tested 1RM. Calculated from ' + reps +
            ' repetitions at ' + load + ' kg using the Epley equation.'));
        }
        break;
      }

      case 'chinup':
        if (Calc.num(v.reps) !== null && v.reps > 30) {
          out.push(issue('verify', testId, 'reps',
            v.reps + ' strict chin-ups is an exceptional result. Please verify that every repetition met the full standard: dead hang to full elbow extension, chin clearly above the bar, no kipping.'));
        }
        break;

      case 'weighted_chinup':
        if (Calc.num(v.added_kg) !== null && Calc.num(v.added_kg) === 0) {
          out.push(issue('verify', testId, 'added_kg',
            'Added load is zero. If the athlete performed this unloaded, record it under the bodyweight chin-up test instead — the two are benchmarked separately.'));
        }
        break;

      case 'bike_12min':
        if (v._minutesRecorded !== undefined && v._minutesRecorded < v._minutesExpected) {
          out.push(issue('verify', testId, 'mean_watts',
            'Only ' + v._minutesRecorded + ' of the ' + v._minutesExpected +
            ' minute readings were recorded. The average is taken from the readings you have — a missed minute is left out, not counted as zero — but the fewer readings there are, the less the average means.'));
        }
        if (result.status === 'incomplete') {
          out.push(issue('info', testId, 'status',
            'Test recorded as INCOMPLETE. A partial 12-minute test is not benchmarked, because average power over a shorter duration is not comparable.'));
        }
        if (Calc.num(v.mean_hr) !== null && Calc.num(v.peak_hr) !== null && v.mean_hr > v.peak_hr) {
          out.push(issue('error', testId, 'mean_hr',
            'Average heart rate cannot exceed peak heart rate. Please verify these values.'));
        }
        break;

        /* falls through to the shared 12-minute checks below */

      case 'bike_30s': {
        /* Peak, mean and minimum are derived from the three readings, so they
           cannot contradict one another. What can go wrong is a missing or
           mistyped reading. */
        var got = (def.splitSamples || []).filter(function (k) { return Calc.num(v[k]) !== null; });
        if (got.length && got.length < (def.splitSamples || []).length) {
          out.push(issue('verify', testId, 'w_0_10',
            'Only ' + got.length + ' of the three ten-second readings were recorded. Peak, mean and the fatigue index are all taken from those readings, so the result is weaker than it looks.'));
        }
        if (Calc.num(v.w_0_10) !== null && Calc.num(v.w_20_30) !== null && v.w_20_30 > v.w_0_10) {
          out.push(issue('verify', testId, 'w_20_30',
            'Power was higher in the last ten seconds than the first. In an all-out 30-second effort that almost always means the athlete paced the start. Please verify the readings, and consider retesting.'));
        }
        break;
      }

      case 'bike_repeated': {
        var cfg = result.config || def.defaultConfig;
        if (cfg && JSON.stringify(cfg) !== JSON.stringify(def.defaultConfig)) {
          out.push(issue('info', testId, 'config',
            'NON-DEFAULT PROTOCOL: ' + cfg.sprints + ' x ' + cfg.workS + ' s with ' +
            cfg.recoveryS + ' s recovery. The PGP default is ' + def.defaultConfig.sprints +
            ' x ' + def.defaultConfig.workS + ' s with ' + def.defaultConfig.recoveryS +
            ' s. This is a DIFFERENT TEST: results are stored with the configuration and are not benchmarked against, or compared with, the default protocol.'));
        }
        if (v._setComplete === false && v._sprintsRecorded > 0) {
          out.push(issue('info', testId, 'status', v._partialNote));
        }

        /* A rising power profile means the first sprint was paced, which
           corrupts the decrement score. */
        if (Calc.num(v.slope_w_per_sprint) !== null && v.slope_w_per_sprint > 2) {
          out.push(issue('verify', testId, 'decrement_pct',
            'Power INCREASED across the set (' + v.slope_w_per_sprint.toFixed(1) +
            ' W per sprint). This almost always means the first sprint was paced rather than maximal, which makes the loss-of-watts figure look better than it is. Read it alongside the average sprint, and consider retesting.'));
        }
        break;
      }

    }
    return out;
  };

  /* ---- whole session -------------------------------------------------- */
  V.validateAll = function (session, athlete, settings) {
    var out = V.validateSession(session, athlete, settings);
    Tests.TESTS.forEach(function (t) {
      out = out.concat(V.validateResult(t.id, session.results[t.id], session));
    });
    return out;
  };

  /* Metrics that must not be benchmarked / used in profiling because of an
     unresolved issue. Returns { 'testId.metric': severity }. */
  V.flaggedMetrics = function (issues) {
    var out = {};
    (issues || []).forEach(function (i) {
      if (i.severity !== 'error' && i.severity !== 'verify') return;
      if (i.scope === 'session') return;
      out[i.scope + '.' + i.key] = (out[i.scope + '.' + i.key] === 'error') ? 'error' : i.severity;
      if (i.severity === 'error') out[i.scope + '.' + i.key] = 'error';
    });
    return out;
  };

  V.summary = function (issues) {
    var s = { error: 0, verify: 0, info: 0 };
    (issues || []).forEach(function (i) { s[i.severity] = (s[i.severity] || 0) + 1; });
    return s;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = V;
  root.PGP = root.PGP || {};
  root.PGP.Validate = V;
})(typeof globalThis !== 'undefined' ? globalThis : this);
