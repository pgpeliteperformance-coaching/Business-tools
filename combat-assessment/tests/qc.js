/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   tests/qc.js — QUALITY CONTROL SUITE
   --------------------------------------------------------------------------
   Runs in Node (`node tests/qc.js`) and in the browser (tests/qc.html).
   Covers the checklist in section 52 of the build specification plus the
   calculation, matching and missing-data rules the app depends on.
   ========================================================================== */
(function (root) {
  'use strict';

  var isNode = (typeof require === 'function' && typeof module !== 'undefined');
  var Stats, Calc, Tests, Benchmarks, Settings, Validate, Model, Engine, Sample, Csv;
  if (isNode) {
    Stats = require('../js/core/stats.js'); Calc = require('../js/core/calc.js');
    Tests = require('../js/config/tests.js'); Benchmarks = require('../js/config/benchmarks.js');
    Settings = require('../js/config/settings.js'); Validate = require('../js/core/validate.js');
    Model = require('../js/core/model.js'); Engine = require('../js/core/engine.js');
    Sample = require('../js/data/sample.js');
    try { Csv = require('../js/core/csv.js'); } catch (e) { Csv = null; }
  } else {
    var P = root.PGP;
    Stats = P.Stats; Calc = P.Calc; Tests = P.Tests; Benchmarks = P.Benchmarks;
    Settings = P.Settings; Validate = P.Validate; Model = P.Model; Engine = P.Engine;
    Sample = P.Sample; Csv = P.Csv;
  }

  var results = [];
  function t(name, fn) {
    try {
      var msg = fn();
      results.push({ name: name, pass: true, msg: msg || '' });
    } catch (e) {
      results.push({ name: name, pass: false, msg: e.message });
    }
  }
  function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
  function eq(a, b, msg) {
    if (a !== b) throw new Error((msg || 'expected equality') + ' — got ' + a + ', expected ' + b);
  }
  function near(a, b, tol, msg) {
    if (a === null || a === undefined || Math.abs(a - b) > (tol || 0.001)) {
      throw new Error((msg || 'expected ~' + b) + ' — got ' + a);
    }
  }
  function cat(assessment, id) {
    return assessment.categoryScores.filter(function (c) { return c.categoryId === id; })[0];
  }
  function met(assessment, testId, key) {
    return assessment.metricScores.filter(function (m) {
      return m.testId === testId && m.metricKey === key;
    })[0];
  }

  function run() {
    results = [];
    var db = Sample.qcDatabase();
    var demo = Sample.demoDatabase();
    function A(id) {
      var a = db.athletes.filter(function (x) { return x.id === id; })[0];
      var ss = db.sessions.filter(function (x) { return x.athleteId === id; })
                          .sort(function (x, y) { return x.date < y.date ? -1 : 1; });
      return { athlete: a, sessions: ss };
    }

    /* ================= CALCULATION ENGINE ============================== */
    t('stats: normal CDF and probit round-trip', function () {
      near(Stats.normalCdf(0), 0.5, 1e-6);
      near(Stats.zToPct(Stats.pctToZ(82)), 82, 0.01);
      near(Stats.zToPct(Stats.pctToZ(3)), 3, 0.01);
      return 'phi/probit inverse to <0.01 percentile';
    });

    t('calc: asymmetry against the better limb', function () {
      near(Calc.calculateAsymmetry(150, 170), 11.7647, 0.001);
      eq(Calc.asymmetrySide(150, 170), 'left');
      eq(Calc.calculateAsymmetry(150, null), null, 'missing limb must return null');
      return '11.76% for 150/170, null when a side is missing';
    });

    t('calc: 1RM estimation and refusal above 12 reps', function () {
      near(Calc.estimateOneRepMax(180, 3), 198, 0.01);
      near(Calc.estimateOneRepMax(180, 3, 'brzycki'), 190.588, 0.01);
      eq(Calc.estimateOneRepMax(180, 1), 180, '1 rep is the 1RM itself');
      eq(Calc.estimateOneRepMax(100, 15), null, 'must refuse above 12 reps');
      return 'Epley 198 kg / Brzycki 190.6 kg from 180x3; refuses 15 reps';
    });

    t('calc: Fitzsimons decrement is 0 for a flat set', function () {
      near(Calc.calculatePerformanceDecrement([800, 800, 800, 800]), 0, 1e-9);
      near(Calc.calculatePerformanceDecrement([1000, 900, 800, 700]), 15, 1e-9);
      return 'flat set = 0%, 1000/900/800/700 = 15%';
    });

    t('calc: fatigue index not computable without a minimum power', function () {
      eq(Calc.calculateFatigueIndex(1200, null), null);
      near(Calc.calculateFatigueIndex(1200, 800), 33.333, 0.01);
      return 'null without min power; 33.3% for 1200/800';
    });

    t('calc: meaningful change uses MDC95 = 2.77 x TE', function () {
      var r = Calc.calculateMeaningfulChange(49, 44, { cvPct: 3, verified: false }, true);
      near(r.mdc95, 2.77 * 1.32, 0.001);
      eq(r.verdict, 'improved');
      eq(r.provisional, true, 'placeholder reliability must be marked provisional');
      eq(Calc.calculateMeaningfulChange(44.5, 44, { cvPct: 3, verified: false }, true).verdict,
         'within-noise');
      eq(Calc.calculateMeaningfulChange(49, 44, null, true).verdict, 'unknown',
         'no reliability estimate must give unknown, not a guess');
      return 'improved / within-noise / unknown all behave correctly';
    });

    t('calc: missing values are stripped, never zeroed', function () {
      var v = Stats.numeric([1, null, '', 2, '3', NaN, undefined, 'x']);
      eq(v.length, 3);
      eq(Stats.mean([10, null, 20]), 15, 'mean must ignore null, not treat it as 0');
      eq(Stats.mean([null, null]), null);
      return 'null/blank/NaN removed; mean of [10,null,20] = 15';
    });

    /* ================= BAND INTERPOLATION ============================== */
    t('engine: band anchors map exactly to 25th/65th/90th', function () {
      var b = Benchmarks.byId('cmj_m');
      near(Engine.percentileFromBands(32, b).percentile, 25, 0.001);
      near(Engine.percentileFromBands(40, b).percentile, 65, 0.001);
      near(Engine.percentileFromBands(48, b).percentile, 90, 0.001);
      return 'CMJ male 32/40/48 cm -> 25/65/90';
    });

    t('engine: lower-is-better metrics invert correctly', function () {
      var b = Benchmarks.byId('sp10_m');
      near(Engine.percentileFromBands(1.85, b).percentile, 25, 0.001);
      near(Engine.percentileFromBands(1.70, b).percentile, 90, 0.001);
      ok(Engine.percentileFromBands(1.60, b).percentile > 90, 'faster must score higher');
      ok(Engine.percentileFromBands(2.10, b).percentile < 25, 'slower must score lower');
      return 'faster 10 m time gives a higher percentile';
    });

    t('engine: percentiles are clamped to 1-99, never 0 or 100', function () {
      var b = Benchmarks.byId('cmj_m');
      eq(Engine.percentileFromBands(2, b).percentile, 1);
      eq(Engine.percentileFromBands(200, b).percentile, 99);
      return 'extreme values clamp to 1 and 99';
    });

    t('engine: performance levels use the documented boundaries', function () {
      eq(Engine.calculatePerformanceLevel(10).name, 'DEVELOPING');
      eq(Engine.calculatePerformanceLevel(25).name, 'TRAINED');
      eq(Engine.calculatePerformanceLevel(64.9).name, 'TRAINED');
      eq(Engine.calculatePerformanceLevel(65).name, 'ADVANCED');
      eq(Engine.calculatePerformanceLevel(90).name, 'HIGH PERFORMANCE');
      eq(Engine.calculatePerformanceLevel(100).name, 'HIGH PERFORMANCE');
      eq(Engine.calculatePerformanceLevel(null), null);
      return 'boundaries 25 / 65 / 90 behave as specified';
    });

    /* ================= ATHLETE A — NORMAL ============================== */
    var a = A('qc_a'), asA = Engine.assessSession(a.sessions[0], a.athlete, db);
    t('Athlete A: every category produces a score', function () {
      Tests.CATEGORIES.forEach(function (c) {
        var cs = cat(asA, c.id);
        eq(cs.status, 'scored', c.id + ' should be scored');
        ok(cs.displayPercentile >= 1 && cs.displayPercentile <= 99, c.id + ' percentile in range');
      });
      return Tests.CATEGORIES.map(function (c) {
        return cat(asA, c.id).short + ' ' + cat(asA, c.id).displayPercentile;
      }).join('  ');
    });

    t('Athlete A: band-derived percentiles display rounded to the nearest 5', function () {
      asA.metricScores.forEach(function (m) {
        if (m.status !== 'scored' || m.precision !== 'band') return;
        /* 1 and 99 are the deliberate floor and ceiling — no athlete is ever
           shown as 0th or 100th percentile — so they sit outside the rule. */
        if (m.displayPercentile === 1 || m.displayPercentile === 99) return;
        eq(m.displayPercentile % 5, 0, m.testId + '.' + m.metricKey + ' should be a multiple of 5');
      });
      return 'no false precision on provisional benchmarks';
    });

    t('Athlete A: category score reproduces by hand from the workings', function () {
      var p = cat(asA, 'power');
      var sumWZ = 0, sumW = 0;
      p.workings.forEach(function (w) { sumWZ += w.weight * w.z; sumW += w.weight; });
      var handZ = sumWZ / sumW;
      near(handZ, p.meanZ, 0.002, 'printed workings must reproduce the mean z');
      near(Stats.zToPct(p.meanZ), p.percentile, 0.01);
      return 'power mean z ' + Stats.round(p.meanZ, 3) + ' reproduces ' +
             Stats.round(p.percentile, 1) + 'th percentile';
    });

    t('Athlete A: strengths and priorities respect their thresholds', function () {
      asA.profile.strengths.forEach(function (s) {
        ok(s.percentile >= Settings.DEFAULTS.profiling.strengthMinPercentile,
           s.label + ' below the strength threshold');
      });
      asA.profile.priorities.forEach(function (s) {
        ok(s.percentile <= Settings.DEFAULTS.profiling.priorityMaxPercentile,
           s.label + ' above the priority threshold');
      });
      ok(asA.profile.strengths.length <= 3 && asA.profile.priorities.length <= 3);
      return asA.profile.strengths.length + ' strengths, ' +
             asA.profile.priorities.length + ' priorities';
    });

    t('Athlete A: no overall score is produced by default', function () {
      eq(asA.composite.enabled, false);
      ok(asA.composite.note.length > 50, 'must explain why there is no overall score');
      return 'profile only, with the reason stated';
    });

    /* ================= ATHLETE B — VERY HIGH =========================== */
    var b = A('qc_b'), asB = Engine.assessSession(b.sessions[0], b.athlete, db);
    t('Athlete B: very high results do not break or exceed the scale', function () {
      Tests.CATEGORIES.forEach(function (c) {
        var cs = cat(asB, c.id);
        if (cs.status !== 'scored') return;
        ok(cs.displayPercentile <= 99, c.id + ' must not exceed 99');
        ok(isFinite(cs.percentile), c.id + ' must be finite');
      });
      ok(cat(asB, 'power').percentile > 90, 'power should be very high');
      ok(asB.profile.priorities.length >= 0);
      return 'all categories finite and <=99; power ' + cat(asB, 'power').displayPercentile;
    });

    t('Athlete B: weighted chin-up scored separately from bodyweight chin-up', function () {
      var w = met(asB, 'weighted_chinup', 'rel_system_mass');
      var c = met(asB, 'chinup', 'reps');
      eq(w.status, 'scored'); eq(c.status, 'scored');
      ok(w.benchmark.id !== c.benchmark.id, 'must use different reference sets');
      return 'wtd chin ' + w.value.toFixed(3) + ' x BW and ' + c.value + ' strict reps scored separately';
    });

    /* ================= ATHLETE C — VERY LOW ============================ */
    var c3 = A('qc_c'), asC = Engine.assessSession(c3.sessions[0], c3.athlete, db);
    t('Athlete C: very low results stay within scale and produce priorities', function () {
      Tests.CATEGORIES.forEach(function (x) {
        var cs = cat(asC, x.id);
        if (cs.status !== 'scored') return;
        ok(cs.displayPercentile >= 1, x.id + ' must not drop below 1');
      });
      ok(asC.profile.priorities.length > 0, 'a low profile must generate priorities');
      ok(asC.recommendations.byCategory.some(function (r) { return r.tier === 'low'; }),
         'low scores must trigger low-tier recommendations');
      return asC.profile.priorities.length + ' priorities, ' +
             asC.recommendations.byCategory.filter(function (r) { return r.tier === 'low'; }).length +
             ' low-tier recommendation sets';
    });

    t('Athlete C: report language contains no prohibited claims', function () {
      /* Report-facing generated text: recommendations, profile reasoning and
         the scoring methodology notes. Benchmark disclaimers are checked
         separately below, because a disclaimer must be allowed to NAME the
         thing it is denying ("this is not a VO2max test"). */
      var text = JSON.stringify(asC.recommendations) +
                 JSON.stringify(asC.profile.strengths) +
                 JSON.stringify(asC.profile.priorities) +
                 JSON.stringify(asC.profile.selectionRule) +
                 JSON.stringify(asC.categoryScores.map(function (x) { return x.method; })) +
                 JSON.stringify(Settings.REPORT_COPY);
      /* A prohibited idea may only appear as something the app DENIES. Every
         occurrence must sit inside a negation, so "does not assess injury
         risk" passes and "your injury risk is low" does not. */
      var lower = text.toLowerCase();
      ['injury risk', 'injury-risk', 'injury-proof', 'likely to win', 'elite fighter',
       'better fighter', 'risk of injury', 'predicts fighting', 'fight outcome',
       'reduce your risk', 'diagnos'].forEach(function (bad) {
        var at = -1;
        while ((at = lower.indexOf(bad, at + 1)) !== -1) {
          var before = lower.slice(Math.max(0, at - 60), at);
          ok(/\b(not|never|no|neither|nor|without|denies)\b[^.]{0,55}$/.test(before),
             'prohibited claim made without a negation: "...' +
             text.slice(Math.max(0, at - 60), at + bad.length + 10) + '..."');
        }
      });
      /* The aerobic test must never be LABELLED as a VO2max test. */
      var aer = Tests.get('bike_12min');
      ok(aer.name.toLowerCase().indexOf('vo2') === -1, 'test name must not say VO2max');
      ok(/not.{0,12}vo2max/i.test(aer.evidence.limitations),
         'the aerobic test must explicitly deny being a VO2max test');
      ok(/not a medical|not a diagnos/i.test(Settings.REPORT_COPY.disclaimer +
         Settings.RECOMMENDATIONS.disclaimer), 'medical disclaimer required');
      return 'no injury-risk or fight-outcome claims; aerobic test explicitly not labelled VO2max';
    });

    /* ================= ATHLETE D — MISSING TESTS ======================= */
    var d = A('qc_d'), asD = Engine.assessSession(d.sessions[0], d.athlete, db);
    t('Athlete D: missing tests are not_tested, never zero', function () {
      ['sprint_10m', 'chinup', 'bench', 'bike_12min', 'bike_30s', 'bike_repeated']
        .forEach(function (id) {
          var ms = asD.metricScores.filter(function (m) { return m.testId === id; });
          ms.forEach(function (m) {
            eq(m.status, 'not_tested', id + ' should be not_tested');
            eq(m.value, null, id + ' value must be null, not 0');
            eq(m.percentile, null, id + ' must have no percentile');
            ok(m.reasonLabel && m.reasonLabel.length > 0, id + ' must carry a reason');
          });
        });
      return '6 tests absent, every one null with a stated reason';
    });

    t('Athlete D: categories with no data report insufficient, not a low score', function () {
      ['speed', 'aerobic', 'anaerobic', 'repeated'].forEach(function (id) {
        var cs = cat(asD, id);
        eq(cs.status, 'insufficient', id + ' must be insufficient');
        eq(cs.percentile, null, id + ' must have no percentile');
        ok(cs.reason && cs.reason.length > 0, id + ' must state why');
      });
      eq(cat(asD, 'power').status, 'scored', 'power was tested and must still score');
      return 'speed/aerobic/anaerobic/repeated all insufficient; power still scores';
    });

    t('Athlete D: strength category scores from the one test available', function () {
      var cs = cat(asD, 'strength');
      eq(cs.status, 'scored');
      eq(cs.n, 1, 'only the trap bar was tested');
      return 'strength ' + cs.displayPercentile + 'th from 1 of 4 tests, coverage ' +
             cs.coveragePct + '%';
    });

    t('Athlete D: readiness flag raises a test-restriction notice', function () {
      eq(d.sessions[0].readiness.flagged, true);
      ok(asD.issues.some(function (i) {
        return i.key === 'readiness' && i.message.indexOf('MODIFICATION') !== -1;
      }), 'expected a modification/restriction notice');
      return 'restriction notice raised without any diagnosis';
    });

    /* ================= ATHLETE E — DIFFERENT BODYWEIGHT / SEX ========== */
    var e = A('qc_e'), asE = Engine.assessSession(e.sessions[0], e.athlete, db);
    t('Athlete E: female athlete matched only to female reference sets', function () {
      asE.metricScores.forEach(function (m) {
        if (m.status !== 'scored') return;
        ok(m.benchmark.sex === 'female' || m.benchmark.sex === 'any',
           m.testId + ' matched a ' + m.benchmark.sex + ' reference set');
      });
      return 'no male reference set used for a female athlete';
    });

    t('Athlete E: chin-ups matched to the correct body-mass band', function () {
      var m = met(asE, 'chinup', 'reps');
      eq(m.status, 'scored');
      eq(m.benchmark.id, 'chin_f_heavy', '68.5 kg female belongs in the heavier band');
      return 'matched ' + m.benchmark.bwBand.label;
    });

    t('An unrecorded air bike gets no percentile', function () {
      var s = JSON.parse(JSON.stringify(a.sessions[0]));
      s.equipment.airBike = 'unknown';
      var as = Engine.assessSession(s, a.athlete, db);
      ['bike_12min', 'bike_30s', 'bike_repeated'].forEach(function (id) {
        as.metricScores.filter(function (m) { return m.testId === id; }).forEach(function (m) {
          eq(m.status, 'insufficient', id + ' must not be benchmarked on an unknown machine');
        });
      });
      return 'unknown machine -> insufficient across all three bike tests';
    });

    t('A different air-bike family gets no percentile', function () {
      var s = JSON.parse(JSON.stringify(a.sessions[0]));
      s.equipment.airBike = 'rogue_echo';
      var as = Engine.assessSession(s, a.athlete, db);
      eq(met(as, 'bike_12min', 'w_per_kg').status, 'insufficient');
      return 'Echo bike not scored against Assault reference set';
    });

    t('A hand-timed sprint is recorded but not benchmarked', function () {
      var s = JSON.parse(JSON.stringify(a.sessions[0]));
      s.equipment.timingMethod = 'hand'; s.equipment.timingDevice = 'handheld';
      var as = Engine.assessSession(s, a.athlete, db);
      var m = met(as, 'sprint_10m', 'time_10m_s');
      eq(m.status, 'insufficient');
      ok(m.value !== null, 'the value must still be recorded');
      return 'value kept, percentile withheld';
    });

    t('A youth athlete gets no adult percentile', function () {
      var s = JSON.parse(JSON.stringify(a.sessions[0]));
      s.ageAtTest = 15;
      var as = Engine.assessSession(s, a.athlete, db);
      eq(met(as, 'cmj', 'height_cm').status, 'insufficient');
      ok(as.issues.some(function (i) { return i.message.indexOf('YOUTH') !== -1; }));
      return 'age 15 -> no percentile, youth notice raised';
    });

    t('An athlete with no recorded sex gets no percentile', function () {
      var ath = JSON.parse(JSON.stringify(a.athlete)); ath.sex = null;
      var as = Engine.assessSession(a.sessions[0], ath, db);
      eq(met(as, 'cmj', 'height_cm').status, 'insufficient');
      ok(met(as, 'cmj', 'height_cm').reason.indexOf('sex') !== -1);
      return 'sex-specific sets are never substituted';
    });

    /* ================= ATHLETE F — RETEST ============================== */
    var f = A('qc_f');
    var asF1 = Engine.assessSession(f.sessions[0], f.athlete, db);
    var asF2 = Engine.assessSession(f.sessions[1], f.athlete, db);
    var cmp = Engine.compareSessions(asF2, asF1);
    t('Athlete F: retest computes absolute and percentage change', function () {
      var row = cmp.metrics.filter(function (r) { return r.testId === 'cmj'; })[0];
      near(row.previous, 37.2, 0.001); near(row.current, 40.8, 0.001);
      near(row.change, 3.6, 0.001);
      near(row.changePct, 3.6 / 37.2 * 100, 0.01);
      eq(cmp.weeksBetween, 26.3, '2026-03-06 to 2026-09-06 is 184 days');
      return 'CMJ 37.2 -> 40.8 cm, +3.6 cm (+' + row.changePct.toFixed(1) + '%) over ' +
             cmp.weeksBetween + ' weeks (' + cmp.daysBetween + ' days)';
    });

    t('Athlete F: level transitions are detected', function () {
      var changed = cmp.metrics.filter(function (r) { return r.levelChanged; });
      ok(changed.length > 0, 'expected at least one level change');
      var cc = cmp.categories.filter(function (r) { return r.levelChanged; });
      return changed.length + ' metric level changes, ' + cc.length + ' category level changes (' +
        changed.slice(0, 2).map(function (r) {
          return r.shortName + ' ' + r.previousLevel + ' -> ' + r.currentLevel;
        }).join('; ') + ')';
    });

    t('Athlete F: small changes are not called improvements', function () {
      var noise = cmp.metrics.filter(function (r) { return r.verdict === 'within-noise'; });
      cmp.metrics.forEach(function (r) {
        if (r.verdict !== 'improved' && r.verdict !== 'declined') return;
        ok(Math.abs(r.change) > r.meaningful.mdc95,
           r.shortName + ' called ' + r.verdict + ' without exceeding MDC95');
      });
      ok(cmp.caveat.indexOf('minimal detectable change') !== -1);
      return noise.length + ' changes reported as within measurement variation';
    });

    t('Athlete F: a changed repeated-sprint protocol is not compared', function () {
      var m2 = met(asF2, 'bike_repeated', 'decrement_pct');
      eq(m2.status, 'insufficient', '5x20s/60s must not score against the 6x15s/45s set');
      ok(asF2.issues.some(function (i) {
        return i.key === 'config' && i.message.indexOf('DIFFERENT TEST') !== -1;
      }), 'expected a non-default protocol notice');
      return 'non-default configuration detected and withheld from benchmarking';
    });

    t('Retest across protocol versions is marked not comparable', function () {
      var s2 = JSON.parse(JSON.stringify(f.sessions[1]));
      s2.protocolVersion = 'PGP v2.0';
      var as = Engine.assessSession(s2, f.athlete, db);
      var c2 = Engine.compareSessions(as, asF1);
      eq(c2.comparable, false);
      ok(c2.warnings[0].indexOf('PROTOCOL VERSION CHANGED') !== -1);
      return 'v1.0 vs v2.0 flagged as not directly comparable';
    });

    t('Retest targets default to one minimal detectable change', function () {
      var tg = Engine.suggestRetestTargets(asF2);
      var cmjT = tg.targets.filter(function (x) { return x.testId === 'cmj'; })[0];
      ok(cmjT.target > cmjT.current, 'higher-is-better target must be above current');
      var spT = tg.targets.filter(function (x) { return x.testId === 'sprint_10m'; })[0];
      ok(spT.target < spT.current, 'lower-is-better target must be below current');
      ok(cmjT.provisional === true, 'placeholder reliability must be disclosed');
      return 'CMJ ' + cmjT.current + ' -> ' + cmjT.target + ' cm; 10 m ' +
             spT.current + ' -> ' + spT.target + ' s';
    });

    /* ================= ATHLETE G — INVALID INPUT ======================= */
    var g = A('qc_g'), asG = Engine.assessSession(g.sessions[0], g.athlete, db);
    t('Athlete G: implausible values are flagged, not corrected', function () {
      var iss = asG.issues;
      var errs = iss.filter(function (i) { return i.severity === 'error'; });
      ok(errs.length >= 5, 'expected several errors, got ' + errs.length);
      /* the raw values must be untouched */
      eq(g.sessions[0].results.trapbar.raw.load_kg, 5000, 'raw data must not be altered');
      eq(g.sessions[0].results.cmj.attempts.height_cm[0], -5, 'raw attempt must not be altered');
      ok(iss.some(function (i) { return /verify/i.test(i.message); }),
         'messages should ask the coach to verify');
      return errs.length + ' errors and ' +
        iss.filter(function (i) { return i.severity === 'verify'; }).length +
        ' verify notices; no value changed';
    });

    t('Athlete G: flagged metrics are excluded from benchmarking and profiling', function () {
      var m = met(asG, 'trapbar', 'rel_1rm');
      eq(m.status, 'flagged');
      eq(m.percentile, null);
      asG.profile.strengths.concat(asG.profile.priorities).forEach(function (x) {
        ok(x.label.indexOf('Trap-Bar') === -1, 'a flagged metric must not appear in the profile');
      });
      return 'trap bar at 5000 kg withheld from the percentile and the profile';
    });

    t('Athlete G: 20 m faster than 10 m is caught', function () {
      ok(asG.issues.some(function (i) {
        return i.testId !== undefined || (i.scope === 'sprint_10m' &&
          i.message.indexOf('must be greater than the 10 m') !== -1);
      }) || asG.issues.some(function (i) {
        return i.scope === 'sprint_10m' && i.message.indexOf('greater than') !== -1;
      }), 'expected a split-order error');
      return 'impossible split ordering rejected';
    });

    t('Athlete G: a paced 30-second sprint is caught', function () {
      ok(asG.issues.some(function (i) {
        return i.scope === 'bike_30s' && i.message.indexOf('higher in the last ten seconds') !== -1;
      }), 'expected the paced-start notice');
      /* peak, mean and minimum are derived from the three readings, so they
         can no longer contradict one another — the failure mode moved */
      var v = g.sessions[0].results.bike_30s.values;
      ok(v.peak_watts >= v.mean_watts && v.mean_watts >= v.min_watts,
         'derived peak/mean/min must be ordered by construction');
      return 'rising power across the effort flagged; derived values cannot contradict';
    });

    t('Athlete G: a paced first sprint is called out', function () {
      ok(asG.issues.some(function (i) {
        return i.scope === 'bike_repeated' && i.message.indexOf('INCREASED') !== -1;
      }));
      return 'rising power profile flagged as a probable paced opening sprint';
    });

    t('Athlete G: the assessment still completes without throwing', function () {
      ok(asG.categoryScores.length === Tests.CATEGORIES.length);
      ok(asG.coverage.total > 0);
      return 'bad data degrades gracefully; ' + asG.coverage.scored + ' metrics still scored';
    });

    /* ================= THE RESHAPED TESTS ============================== */
    t('Jump distances are recorded and benchmarked in metres', function () {
      var m = met(asA, 'broad_jump', 'distance_m');
      eq(m.unit, 'm');
      ok(m.value > 1 && m.value < 4, 'a broad jump should be a metre value, got ' + m.value);
      eq(m.benchmark.unit, 'm');
      var sl = met(asA, 'sl_broad_jump', 'best_m');
      eq(sl.unit, 'm');
      ok(sl.value > 0.6 && sl.value < 3);
      return 'broad jump ' + m.value + ' m, single-leg ' + sl.value + ' m';
    });

    t('Weighted chin-up is a tested single with no prediction equation', function () {
      var b = A('qc_b');
      var as = Engine.assessSession(b.sessions[0], b.athlete, db);
      var m = met(as, 'weighted_chinup', 'rel_system_mass');
      eq(m.status, 'scored');
      eq(Tests.metric('weighted_chinup', 'reps'), null, 'there should be no reps field any more');
      var v = b.sessions[0].results.weighted_chinup.values;
      near(v.system_mass_kg, b.sessions[0].bodyMassKg + v.added_kg, 0.001);
      near(m.value, v.system_mass_kg / b.sessions[0].bodyMassKg, 0.0001,
           'relative system mass must be the raw ratio, not an estimate');
      return '(' + b.sessions[0].bodyMassKg + ' + ' + v.added_kg + ') / ' +
             b.sessions[0].bodyMassKg + ' = ' + m.value.toFixed(3) + ' x BW';
    });

    t('12-minute test averages the minute readings and shows the fade', function () {
      var v = a.sessions[0].results.bike_12min.values;
      eq(v._minutesRecorded, 12);
      var mins = [];
      for (var i = 1; i <= 12; i++) mins.push(v['min_' + i]);
      near(v.mean_watts, Stats.mean(mins), 0.001, 'average must be the mean of the minutes');
      ok(v.fade_pct !== undefined, 'second-half fade should be reported');
      ok(v.distance_km > 0, 'total distance should be recorded');
      /* a missed minute is dropped, never counted as zero */
      var s2 = JSON.parse(JSON.stringify(a.sessions[0]));
      delete s2.results.bike_12min.raw.min_7;
      Model.deriveSession(s2);
      eq(s2.results.bike_12min.values._minutesRecorded, 11);
      ok(s2.results.bike_12min.values.mean_watts > 100,
         'a missing minute must not drag the average toward zero');
      return '12 readings -> ' + v.mean_watts.toFixed(1) + ' W, fade ' +
             v.fade_pct.toFixed(1) + '%, ' + v.distance_km + ' km';
    });

    t('30-second sprint derives peak, mean and minimum from the 10 s readings', function () {
      var v = a.sessions[0].results.bike_30s.values;
      eq(v.peak_watts, Math.max(v.w_0_10, v.w_10_20, v.w_20_30));
      eq(v.min_watts, Math.min(v.w_0_10, v.w_10_20, v.w_20_30));
      near(v.mean_watts, (v.w_0_10 + v.w_10_20 + v.w_20_30) / 3, 0.001);
      ok(v.fatigue_index_pct > 0, 'the fatigue index is now always computable');
      near(v.fatigue_index_pct, (v.peak_watts - v.min_watts) / v.peak_watts * 100, 0.001);
      return v.w_0_10 + '/' + v.w_10_20 + '/' + v.w_20_30 + ' W -> peak ' + v.peak_watts +
             ', mean ' + v.mean_watts.toFixed(0) + ', fatigue ' + v.fatigue_index_pct.toFixed(1) + '%';
    });

    t('Repeated sprint works from one max-watts number per sprint', function () {
      var v = a.sessions[0].results.bike_repeated.values;
      var peaks = a.sessions[0].results.bike_repeated.sprints.map(function (x) { return x.peak_watts; });
      ok(peaks.every(function (x) { return typeof x === 'number'; }), 'peaks only');
      eq(a.sessions[0].results.bike_repeated.sprints[0].mean_watts, undefined,
         'there should be no per-sprint average to enter any more');
      eq(v.best_peak_watts, Math.max.apply(null, peaks));
      eq(v.worst_peak_watts, Math.min.apply(null, peaks));
      near(v.mean_peak_watts, Stats.mean(peaks), 0.001);
      near(v.decrement_pct, Calc.calculatePerformanceDecrement(peaks), 0.001);
      var m = met(asA, 'bike_repeated', 'mean_peak_w_per_kg');
      eq(m.status, 'scored');
      return 'best ' + v.best_peak_watts + ' W, average ' + v.mean_peak_watts.toFixed(0) +
             ' W, loss ' + v.decrement_pct.toFixed(1) + '%';
    });

    t('The removed tests are gone from every layer', function () {
      eq(Tests.get('mb_throw'), null);
      eq(Tests.get('movement_screen'), null);
      eq(Tests.category('movement'), null);
      eq(Tests.CATEGORIES.length, 6);
      eq(Tests.TESTS.length, 11);
      ok(!Benchmarks.BENCHMARKS.some(function (b) {
        return b.testId === 'mb_throw' || b.testId === 'movement_screen';
      }), 'no orphan reference sets');
      ok(!Object.keys(Settings.DEFAULTS.scoring.weights).some(function (k) {
        return k.indexOf('mb_throw') === 0 || k.indexOf('movement') === 0;
      }), 'no orphan weights');
      ok(!asA.categoryScores.some(function (c) { return c.categoryId === 'movement'; }));
      return '11 tests across 6 categories';
    });

    /* ================= PGP INTERNAL NORMS ============================== */
    t('Internal norms stay hidden below the minimum sample size', function () {
      var small = Sample.qcDatabase();
      var r = Engine.buildInternalNorm(small, 'cmj', 'height_cm',
        { sex: 'male', ageRange: [18, 35], conditions: { device: 'mat_or_plate' },
          protocolVersion: Settings.PROTOCOL_VERSION }, Settings.DEFAULTS);
      eq(r.available, false);
      ok(r.needed === Settings.DEFAULTS.reference.internalMinN);
      return 'n=' + r.n + ' of ' + r.needed + ' required — withheld';
    });

    t('Internal norms build once the demo cohort is large enough', function () {
      var r = Engine.buildInternalNorm(demo, 'cmj', 'height_cm',
        { sex: 'male', ageRange: [18, 35], conditions: {},
          protocolVersion: Settings.PROTOCOL_VERSION }, Settings.DEFAULTS);
      ok(r.available, 'expected internal norms to be available, n=' + r.n);
      ok(r.n >= Settings.DEFAULTS.reference.internalMinN);
      var p = Engine.percentileFor(45, r.benchmark);
      ok(p && p.percentile > 0 && p.percentile < 100);
      eq(r.benchmark.referenceType, 'PGP_INTERNAL');
      return 'n=' + r.n + ' male athletes; 45 cm sits at the ' + p.percentile.toFixed(0) + 'th';
    });

    t('Internal norms never pool sexes and exclude the athlete themselves', function () {
      var r = Engine.buildInternalNorm(demo, 'cmj', 'height_cm',
        { sex: 'female', ageRange: [18, 35], conditions: {},
          protocolVersion: Settings.PROTOCOL_VERSION }, Settings.DEFAULTS);
      var rm = Engine.buildInternalNorm(demo, 'cmj', 'height_cm',
        { sex: 'male', ageRange: [18, 35], conditions: {},
          protocolVersion: Settings.PROTOCOL_VERSION }, Settings.DEFAULTS);
      ok(r.n !== rm.n, 'male and female samples must differ');
      var excl = Engine.buildInternalNorm(demo, 'cmj', 'height_cm',
        { sex: 'male', ageRange: [18, 35], conditions: {},
          protocolVersion: Settings.PROTOCOL_VERSION, excludeAthleteId: 'ath_demo_1' },
        Settings.DEFAULTS);
      ok(excl.n === rm.n - 1 || excl.n === rm.n, 'excluded athlete should not inflate their own norm');
      return 'female n=' + r.n + ', male n=' + rm.n + ', self-excluded n=' + excl.n;
    });

    /* ================= GYM AGGREGATE =================================== */
    t('Gym dashboard aggregates and de-identifies', function () {
      var ag = Engine.gymAggregate(demo, { gymId: 'gym_demo_a' });
      ok(ag.athleteCount > 0);
      ok(ag.anonymised === true);
      var txt = JSON.stringify(ag);
      ok(txt.indexOf('Sample Athlete') === -1, 'no athlete names in the aggregate');
      ok(ag.privacyNote.length > 20);
      return ag.athleteCount + ' athletes, no names present';
    });

    t('Gym dashboard filters by sport and sex', function () {
      var all = Engine.gymAggregate(demo, {});
      var mt = Engine.gymAggregate(demo, { sport: 'muay_thai' });
      var fem = Engine.gymAggregate(demo, { sex: 'female' });
      ok(mt.athleteCount < all.athleteCount && mt.athleteCount > 0);
      ok(fem.athleteCount < all.athleteCount && fem.athleteCount > 0);
      return 'all ' + all.athleteCount + ', muay thai ' + mt.athleteCount +
             ', female ' + fem.athleteCount;
    });

    t('Gym dashboard warns on small samples', function () {
      var ag = Engine.gymAggregate(db, {});
      ok(ag.smallSampleWarning, 'QC gym has <10 athletes and must warn');
      return 'small-sample warning shown for n=' + ag.athleteCount;
    });

    t('Gym dashboard reports the most common development priority', function () {
      var ag = Engine.gymAggregate(demo, { gymId: 'gym_demo_a' });
      ok(Array.isArray(ag.commonPriorities));
      return ag.commonPriorities.length
        ? 'most common: ' + ag.commonPriorities[0].categoryName +
          ' (' + ag.commonPriorities[0].count + ' athletes)'
        : 'no shared priorities in this cohort';
    });

    /* ================= DEMO ATHLETE / REPORT PATH ======================= */
    t('Demo sample athlete assesses and retests end to end', function () {
      var ath = demo.athletes.filter(function (x) { return x.id === 'ath_sample'; })[0];
      var ss = demo.sessions.filter(function (x) { return x.athleteId === 'ath_sample'; });
      eq(ss.length, 2);
      var a1 = Engine.assessSession(ss[0], ath, demo);
      var a2 = Engine.assessSession(ss[1], ath, demo);
      var c = Engine.compareSessions(a2, a1);
      ok(a2.profile.strengths.length > 0 || a2.profile.priorities.length > 0);
      ok(c.improved > 0, 'the demo retest should show improvements');
      return c.improved + ' improved, ' + c.withinNoise + ' within noise, ' +
             c.declined + ' declined';
    });

    t('Every benchmarked metric has a weight and a reference set for both sexes', function () {
      Tests.benchmarkedMetrics().forEach(function (m) {
        var k = m.testId + '.' + m.metric.key;
        ok(Settings.DEFAULTS.scoring.weights[k] !== undefined, k + ' has no weight');
        var sets = Benchmarks.forTest(m.testId).filter(function (b) {
          return b.metric === m.metric.key;
        });
        ok(sets.length > 0, k + ' has no reference set');
      });
      return Tests.benchmarkedMetrics().length + ' benchmarked metrics all configured';
    });

    t('All shipped benchmarks are labelled provisional, none claim to be published', function () {
      var counts = Benchmarks.counts();
      eq(counts.PUBLISHED, 0, 'no benchmark may claim PUBLISHED without verified source data');
      Benchmarks.BENCHMARKS.forEach(function (b) {
        eq(b.source.verified, false, b.id + ' must not claim a verified source');
        ok(b.protocol && b.protocol.length > 10, b.id + ' must state its protocol');
      });
      return counts.PGP_PROVISIONAL + ' provisional sets, 0 falsely labelled as published';
    });

    /* ================= EXPORT / IMPORT ================================= */
    if (Csv) {
      t('JSON export and import round-trips without loss', function () {
        var json = Csv.exportJSON(demo);
        var back = Csv.importJSON(json);
        eq(back.db.athletes.length, demo.athletes.length);
        eq(back.db.sessions.length, demo.sessions.length);
        var a1 = Engine.assessSession(demo.sessions[0],
          demo.athletes.filter(function (x) { return x.id === demo.sessions[0].athleteId; })[0], demo);
        var b1 = Engine.assessSession(back.db.sessions[0],
          back.db.athletes.filter(function (x) { return x.id === back.db.sessions[0].athleteId; })[0], back.db);
        eq(cat(b1, 'power').displayPercentile, cat(a1, 'power').displayPercentile);
        return demo.athletes.length + ' athletes and ' + demo.sessions.length +
               ' sessions survived the round trip with identical scores';
      });

      t('CSV export escapes correctly and covers every athlete', function () {
        var csv = Csv.exportSessionsCSV(demo);
        var lines = csv.split('\n').filter(function (l) { return l.trim(); });
        eq(lines.length, demo.sessions.length + 1, 'header plus one row per session');
        ok(lines[0].indexOf('athlete_name') !== -1);
        ok(lines[0].indexOf('protocol_version') !== -1);
        var tricky = Csv.csvCell('He said "go", then left');
        eq(tricky, '"He said ""go"", then left"');
        return lines.length - 1 + ' rows, ' + lines[0].split(',').length + ' columns';
      });

      t('CSV never writes 0 for a test that was not performed', function () {
        /* parsed properly — a naive comma split would break on quoted notes */
        var parsed = Csv.parseCSV(Csv.exportSessionsCSV(db));
        var d = parsed.filter(function (r) { return r.athlete_name.indexOf('QC-D') !== -1; })[0];
        ok(d, 'QC-D row should be present');
        eq(d.sprint_10m__status, 'not_tested');
        eq(d.sprint_10m__time_10m_s, '', 'a not-tested value must export as empty, not 0');
        eq(d.bike_12min__w_per_kg, '', 'a not-tested bike value must export as empty');
        eq(d.chinup__reps, '', 'a not-tested rep count must export as empty, not 0');
        eq(d.sprint_10m__not_tested_reason, 'facility', 'the reason must be exported');
        eq(d.bike_12min__min_1, '', 'an untested minute reading must export empty');
        /* and a tested value must still be present */
        ok(d.cmj__height_cm !== '', 'a tested value must still export');
        return 'not-tested cells export empty, with the reason preserved';
      });
    }

    return results;
  }

  var API = { run: run, get results() { return results; } };
  if (isNode) {
    module.exports = API;
    if (require.main === module) {
      var r = run();
      var pass = r.filter(function (x) { return x.pass; }).length;
      r.forEach(function (x) {
        console.log((x.pass ? '  PASS  ' : '  FAIL  ') + x.name + (x.msg ? '\n          ' + x.msg : ''));
      });
      console.log('\n' + pass + ' / ' + r.length + ' checks passed');
      process.exit(pass === r.length ? 0 : 1);
    }
  } else {
    root.PGP = root.PGP || {};
    root.PGP.QC = API;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
