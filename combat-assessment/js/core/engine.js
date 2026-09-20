/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/core/engine.js — BENCHMARK, SCORING AND PROFILING ENGINE
   --------------------------------------------------------------------------
   Turns derived results into percentiles, performance levels, category
   scores, a profile, and training priorities.

   THE ONE RULE THAT MATTERS MOST
   ------------------------------
   If no reference set matches the athlete, the test, the protocol and the
   equipment, the engine returns  status:'insufficient'  with the reason.
   It NEVER falls back to a set for the other sex, a different ball mass, a
   different bike, a different protocol configuration, or a hand-timed
   sprint, and it never interpolates a percentile out of nothing.

   MATCHING PRIORITY (section 14 of the brief), applied in this order:
     1. same test and metric
     2. same protocol conditions (ball mass, bike family, timing method,
        repeated-sprint configuration)
     3. same sex                          — never substituted
     4. age within range (or tolerance)
     5. body-mass band where the metric requires one
     6. athlete population / sport
     7. competitive level
   Ties are then broken by reference type, using settings.reference.priority
   (PGP internal norms first once the sample is large enough, then published,
   then provisional).
   ========================================================================== */
(function (root) {
  'use strict';

  var isNode = (typeof require === 'function' && typeof module !== 'undefined');
  var Stats      = isNode ? require('./stats.js')                : root.PGP.Stats;
  var Calc       = isNode ? require('./calc.js')                 : root.PGP.Calc;
  var Tests      = isNode ? require('../config/tests.js')        : root.PGP.Tests;
  var Benchmarks = isNode ? require('../config/benchmarks.js')   : root.PGP.Benchmarks;
  var Settings   = isNode ? require('../config/settings.js')     : root.PGP.Settings;
  var Validate   = isNode ? require('./validate.js')             : root.PGP.Validate;
  var Model      = isNode ? require('./model.js')                : root.PGP.Model;

  var E = {};

  function st(settings) { return settings || Settings.DEFAULTS; }

  /* ======================================================================
     PERFORMANCE LEVEL
     ====================================================================== */
  E.calculatePerformanceLevel = function (pct, settings) {
    if (pct === null || pct === undefined || !isFinite(pct)) return null;
    var levels = st(settings).levels;
    return pickLevel(pct, levels);
  };

  /* Criterion scoring: a score against a fixed standard rather than against
     other athletes, carrying its own labels so nothing reads as a percentile.
     No test in the current battery uses it — the movement screen did, and was
     removed — but the mechanism is kept because any future observation-based
     measure needs exactly this treatment rather than a fabricated percentile. */
  E.calculateCriterionLevel = function (score, settings) {
    if (score === null || score === undefined || !isFinite(score)) return null;
    var s = st(settings);
    var levels = (s.movement && s.movement.criterionLevels) || s.levels;
    return pickLevel(score, levels);
  };

  function pickLevel(pct, levels) {
    for (var i = 0; i < levels.length; i++) {
      if (pct >= levels[i].min && (pct < levels[i].max || i === levels.length - 1)) {
        return levels[i];
      }
    }
    return levels[0];
  }

  /* ======================================================================
     PERCENTILE FROM A BENCHMARK
     ----------------------------------------------------------------------
     Returns { percentile, precision, method } or null.
     precision: 'band'  -> provisional anchors, display rounded to nearest 5
                'model' -> normal-model or empirical, display to 1 unit
     ====================================================================== */
  function anchorsFor(bm) {
    /* Values at the p25 / p65 / p90 boundaries, oriented so that a HIGHER
       transformed value is always better. */
    var sign = bm.direction === 'low' ? -1 : 1;
    return [
      { p: 25, v: sign * bm.bands.p25 },
      { p: 65, v: sign * bm.bands.p65 },
      { p: 90, v: sign * bm.bands.p90 }
    ];
  }

  E.percentileFromBands = function (value, bm) {
    var v = Calc.num(value);
    if (v === null || !bm.bands) return null;
    var sign = bm.direction === 'low' ? -1 : 1;
    var x = sign * v;
    var a = anchorsFor(bm);
    /* anchors must be strictly increasing for the interpolation to be valid */
    if (!(a[0].v < a[1].v && a[1].v < a[2].v)) return null;

    var pct;
    if (x <= a[0].v) {
      /* extrapolate below p25 using the slope of the p25-p65 segment */
      pct = Stats.lerp(x, a[0].v, 25, a[1].v, 65);
    } else if (x >= a[2].v) {
      /* extrapolate above p90 using the slope of the p65-p90 segment */
      pct = Stats.lerp(x, a[1].v, 65, a[2].v, 90);
    } else if (x <= a[1].v) {
      pct = Stats.lerp(x, a[0].v, 25, a[1].v, 65);
    } else {
      pct = Stats.lerp(x, a[1].v, 65, a[2].v, 90);
    }
    return { percentile: Math.min(99, Math.max(1, pct)), precision: 'band',
             method: 'provisional band interpolation' };
  };

  E.percentileFromNormal = function (value, bm) {
    var v = Calc.num(value);
    if (v === null || !bm.distribution) return null;
    var mean = Calc.num(bm.distribution.mean), sd = Calc.num(bm.distribution.sd);
    if (mean === null || sd === null || sd <= 0) return null;
    var z = (bm.direction === 'low' ? (mean - v) : (v - mean)) / sd;
    return { percentile: Math.min(99.9, Math.max(0.1, Stats.zToPct(z))),
             precision: 'model', method: 'z-score against published mean and SD', z: z };
  };

  E.percentileFromTable = function (value, bm) {
    var v = Calc.num(value);
    if (v === null || !bm.percentiles) return null;
    var pts = Object.keys(bm.percentiles).map(function (k) {
      return { p: parseFloat(k.replace(/^p/, '')), v: Calc.num(bm.percentiles[k]) };
    }).filter(function (o) { return o.v !== null && isFinite(o.p); });
    if (pts.length < 2) return null;
    var sign = bm.direction === 'low' ? -1 : 1;
    pts.forEach(function (o) { o.v = sign * o.v; });
    pts.sort(function (a, b) { return a.p - b.p; });
    var x = sign * v, pct;
    if (x <= pts[0].v) pct = Stats.lerp(x, pts[0].v, pts[0].p, pts[1].v, pts[1].p);
    else if (x >= pts[pts.length - 1].v) {
      pct = Stats.lerp(x, pts[pts.length - 2].v, pts[pts.length - 2].p,
                          pts[pts.length - 1].v, pts[pts.length - 1].p);
    } else {
      for (var i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i].v && x <= pts[i + 1].v) {
          pct = Stats.lerp(x, pts[i].v, pts[i].p, pts[i + 1].v, pts[i + 1].p);
          break;
        }
      }
    }
    return { percentile: Math.min(99.9, Math.max(0.1, pct)), precision: 'model',
             method: 'interpolation of a published percentile table' };
  };

  E.percentileFor = function (value, bm) {
    if (!bm) return null;
    if (bm.method === 'normal') return E.percentileFromNormal(value, bm);
    if (bm.method === 'percentiles') return E.percentileFromTable(value, bm);
    if (bm.method === 'empirical') {
      var r = Stats.empiricalPercentile(value, bm.sample, bm.direction !== 'low');
      if (r === null) return null;
      return { percentile: Math.min(99.9, Math.max(0.1, r)), precision: 'model',
               method: 'empirical percentile within the PGP internal sample (mid-rank)' };
    }
    /* 'bands' and 'criterion' both use the anchor interpolation */
    return E.percentileFromBands(value, bm);
  };

  /* ======================================================================
     CONDITION MATCHING
     ----------------------------------------------------------------------
     Only conditions the app can actually verify from the recorded data are
     enforced. Conditions that depend on the coach following the written
     protocol (arm position, start type, handle height, feet-fixed rule) are
     listed as ASSUMPTIONS on the report rather than silently treated as met.
     ====================================================================== */
  var VERIFIABLE = ['ballMassKg', 'machineFamily', 'timingMethod', 'sprints', 'workS',
                    'recoveryS', 'durationS', 'loadingMethod'];

  E.sessionConditions = function (testId, result, session) {
    var def = Tests.get(testId);
    var eq = (session && session.equipment) || {};
    var v = (result && result.values) || {};
    var c = {};
    if (def && def.durationS) c.durationS = def.durationS;
    if (def && def.equipmentDependent) c.machineFamily = Settings.bikeFamily(eq.airBike);
    if (testId === 'sprint_10m') {
      c.timingMethod = (eq.timingDevice === 'handheld' || eq.timingMethod === 'hand')
        ? 'hand' : (eq.timingMethod || 'electronic');
    }
    if (testId === 'bike_repeated') {
      var cfg = (result && result.config) || (def && def.defaultConfig) || {};
      c.sprints = cfg.sprints; c.workS = cfg.workS; c.recoveryS = cfg.recoveryS;
    }
    if (testId === 'weighted_chinup') c.loadingMethod = eq.chinLoadingMethod || 'belt';
    return c;
  };

  /* Returns { ok:true } or { ok:false, reason:'...' } */
  E.conditionsMatch = function (bm, actual) {
    var keys = Object.keys(bm.conditions || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (VERIFIABLE.indexOf(k) === -1) continue;         /* assumption, not checked */
      var want = bm.conditions[k], got = actual[k];
      if (got === undefined) continue;                     /* nothing recorded to contradict it */
      if (got === null) {
        return { ok: false, reason: describeCondition(k) + ' was not recorded, so it cannot be matched to a reference set.' };
      }
      if (String(want) !== String(got)) {
        return { ok: false, reason: describeCondition(k) + ' does not match this reference set (recorded: ' + got + ', reference: ' + want + ').' };
      }
    }
    return { ok: true };
  };

  function describeCondition(k) {
    return ({
      ballMassKg: 'Medicine-ball mass',
      machineFamily: 'Air-bike model family',
      timingMethod: 'Sprint timing method',
      sprints: 'Number of sprints',
      workS: 'Sprint duration',
      recoveryS: 'Recovery duration',
      durationS: 'Test duration',
      loadingMethod: 'Chin-up loading method'
    })[k] || k;
  }

  /* ======================================================================
     PGP INTERNAL NORMS
     ----------------------------------------------------------------------
     Built at runtime from the athlete database. A stratum must reach
     settings.reference.internalMinN before it is computed at all, and
     internalPrimaryN before it becomes the primary reference.
     Only athletes with dataConsent are included, and the athlete being
     assessed is excluded from their own reference sample.
     ====================================================================== */
  E.buildInternalNorm = function (db, testId, metricKey, ctx, settings) {
    var s = st(settings), rs = s.reference;
    if (!db || !db.sessions || !db.sessions.length) return null;
    var def = Tests.get(testId), metric = Tests.metric(testId, metricKey);
    if (!metric) return null;

    var athletes = {};
    (db.athletes || []).forEach(function (a) { athletes[a.id] = a; });

    var sample = [], contributors = {};
    (db.sessions || []).forEach(function (sess) {
      if (ctx.excludeAthleteId && sess.athleteId === ctx.excludeAthleteId) return;
      var a = athletes[sess.athleteId];
      if (!a || a.archived || a.dataConsent === false) return;
      if (a.sex !== ctx.sex) return;                       /* never pool sexes */
      var age = Model.athleteAgeForSession(a, sess);
      if (age === null || age < s.validation.youthAgeCutoff) return;
      if (ctx.ageRange && (age < ctx.ageRange[0] - rs.ageTolerance ||
                           age > ctx.ageRange[1] + rs.ageTolerance)) return;
      if (ctx.bwBand) {
        var bw = Calc.num(sess.bodyMassKg);
        if (bw === null || bw <= ctx.bwBand.min || bw > ctx.bwBand.max) return;
      }
      var r = sess.results && sess.results[testId];
      if (!r || r.status !== 'tested') return;
      /* protocol version and conditions must match */
      if (sess.protocolVersion !== ctx.protocolVersion) return;
      var cond = E.sessionConditions(testId, r, sess);
      var probe = { conditions: ctx.conditions || {} };
      var same = true;
      Object.keys(ctx.conditions || {}).forEach(function (k) {
        if (VERIFIABLE.indexOf(k) === -1) return;
        if (String(cond[k]) !== String(ctx.conditions[k])) same = false;
      });
      if (!same) return;
      var val = Calc.num(r.values && r.values[metricKey]);
      if (val === null) return;
      /* one entry per athlete: their most recent qualifying result */
      var prev = contributors[sess.athleteId];
      if (!prev || sess.date > prev.date) contributors[sess.athleteId] = { date: sess.date, val: val };
    });

    Object.keys(contributors).forEach(function (k) { sample.push(contributors[k].val); });
    if (sample.length < rs.internalMinN) {
      return { n: sample.length, available: false,
               needed: rs.internalMinN,
               note: 'PGP internal norms need ' + rs.internalMinN + ' matched athletes. Currently ' +
                     sample.length + '.' };
    }
    return {
      available: true,
      n: sample.length,
      isPrimary: sample.length >= rs.internalPrimaryN,
      mature: sample.length >= rs.internalMatureN,
      benchmark: {
        id: 'internal_' + testId + '_' + metricKey + '_' + ctx.sex,
        testId: testId, metric: metricKey,
        referenceType: 'PGP_INTERNAL',
        sex: ctx.sex, ageRange: ctx.ageRange, bwBand: ctx.bwBand,
        population: 'PGP internal database — combat athletes',
        direction: metric.direction, unit: metric.unit,
        conditions: ctx.conditions || {},
        method: 'empirical', sample: sample, n: sample.length,
        protocol: ctx.protocolVersion,
        source: { citation: 'PGP internal athlete database (' + sample.length + ' matched athletes)',
                  verified: true,
                  note: 'Empirical percentile within PGP\'s own tested population.' },
        confidence: sample.length >= rs.internalMatureN ? 'high'
                  : (sample.length >= rs.internalPrimaryN ? 'medium' : 'low'),
        notes: 'Compared with ' + sample.length + ' combat athletes in the PGP database.'
      }
    };
  };

  /* ======================================================================
     BENCHMARK SELECTION
     ====================================================================== */
  E.matchBenchmark = function (testId, metricKey, ctx, db, settings) {
    var s = st(settings);
    var reasons = [];
    var pool = (Benchmarks.forTest(testId) || [])
      .concat((db && db.customBenchmarks) || [])
      .filter(function (b) { return b.testId === testId && b.metric === metricKey; });

    if (!pool.length) {
      return { benchmark: null, reason: 'No reference set exists for this test and metric.' };
    }

    /* sex is non-negotiable */
    if (!ctx.sex) {
      return { benchmark: null,
               reason: 'Athlete sex is not recorded. Reference sets are sex-specific and are never substituted for one another.' };
    }
    if (ctx.age !== null && ctx.age < s.validation.youthAgeCutoff) {
      return { benchmark: null,
               reason: 'Athlete is under ' + s.validation.youthAgeCutoff +
                       '. No youth reference sets exist in this app, and adult standards do not apply to a maturing athlete. Track against this athlete\'s own previous results instead.' };
    }

    var candidates = [], rejected = [];
    pool.forEach(function (b) {
      if (b.sex !== 'any' && b.sex !== ctx.sex) { return; }
      var cm = E.conditionsMatch(b, ctx.conditions || {});
      if (!cm.ok) { rejected.push(cm.reason); return; }
      if (b.bwBand) {
        var bw = Calc.num(ctx.bodyMassKg);
        if (bw === null) {
          rejected.push('Body mass is required to select the correct body-mass band for this test.');
          return;
        }
        if (!(bw > b.bwBand.min && bw <= b.bwBand.max)) return;
      }
      if (ctx.age !== null && b.ageRange) {
        var tol = s.reference.strictAgeMatching ? 0 : s.reference.ageTolerance;
        if (ctx.age < b.ageRange[0] - tol || ctx.age > b.ageRange[1] + tol) {
          rejected.push('Athlete age (' + ctx.age + ') is outside this reference set\'s age range (' +
                        b.ageRange[0] + '-' + b.ageRange[1] + ').');
          return;
        }
      }
      var score = 0;
      if (b.sport === ctx.sport) score += 2;
      if (b.level === ctx.level) score += 1;
      if (b.bwBand) score += 1;
      if (ctx.age !== null && b.ageRange && ctx.age >= b.ageRange[0] && ctx.age <= b.ageRange[1]) score += 1;
      var typeRank = s.reference.priority.indexOf(b.referenceType);
      candidates.push({ b: b, score: score, typeRank: typeRank < 0 ? 99 : typeRank });
    });

    /* PGP internal norms, if the stratum is big enough */
    var internal = E.buildInternalNorm(db, testId, metricKey, {
      sex: ctx.sex, ageRange: [18, 35], bwBand: null,
      conditions: ctx.conditions, protocolVersion: ctx.protocolVersion,
      excludeAthleteId: ctx.athleteId
    }, s);
    var internalInfo = internal;
    if (internal && internal.available && internal.isPrimary) {
      candidates.push({ b: internal.benchmark, score: 5,
                        typeRank: s.reference.priority.indexOf('PGP_INTERNAL') });
    }

    if (!candidates.length) {
      return { benchmark: null,
               reason: rejected.length ? rejected[0]
                 : 'No reference set matches this athlete\'s sex, age and the protocol recorded.',
               internal: internalInfo };
    }

    candidates.sort(function (x, y) {
      if (x.typeRank !== y.typeRank) return x.typeRank - y.typeRank;
      return y.score - x.score;
    });
    return { benchmark: candidates[0].b, alternatives: candidates.slice(1).map(function (c) { return c.b; }),
             internal: internalInfo };
  };

  /* ======================================================================
     SCORE ONE METRIC
     ====================================================================== */
  E.scoreMetric = function (testId, metricKey, session, athlete, db, settings, flagged) {
    var s = st(settings);
    var def = Tests.get(testId), metric = Tests.metric(testId, metricKey);
    var result = session.results[testId];
    var cat = Tests.category(def.category);
    var base = {
      testId: testId, testName: def.name, shortName: def.shortName,
      category: def.category, categoryName: cat ? cat.name : def.category,
      metricKey: metricKey, metricLabel: metric.label, unit: metric.unit, dp: metric.dp,
      direction: metric.direction,
      weight: s.scoring.weights[testId + '.' + metricKey],
      testReliability: def.evidence ? def.evidence.testReliability : null,
      value: null, percentile: null, displayPercentile: null, level: null,
      benchmark: null, status: 'not_tested', reason: null,
      scoreType: 'percentile', precision: null, flagged: null,
      contributes: false
    };

    if (!result || result.status === 'not_tested' || result.status === 'pending') {
      base.status = 'not_tested';
      base.reason = result && result.reason ? result.reason : null;
      base.reasonLabel = result && result.status === 'pending'
        ? 'No result recorded.' : reasonLabel(base.reason);
      base.notes = result ? result.notes : '';
      return base;
    }

    var value = Calc.num(result.values && result.values[metricKey]);
    base.value = value;
    base.notes = result.notes || '';
    if (value === null) {
      base.status = 'no_value';
      base.reason = 'incomplete';
      base.reasonLabel = 'Test recorded but this metric has no value.';
      return base;
    }

    /* an incomplete test is recorded but not benchmarked */
    if (result.status === 'incomplete') {
      base.status = 'incomplete';
      base.reasonLabel = 'Test not completed in full. Result recorded but not benchmarked — a partial test is not comparable with a complete one.';
      return base;
    }

    /* validator flags block benchmarking / profiling */
    var fk = testId + '.' + metricKey;
    if (flagged && flagged[fk]) {
      base.flagged = flagged[fk];
      if (flagged[fk] === 'error') {
        base.status = 'flagged';
        base.reasonLabel = 'Value requires verification before it can be benchmarked.';
        return base;
      }
    }

    var ctx = {
      sex: athlete && athlete.sex, age: Calc.num(session.ageAtTest),
      bodyMassKg: Calc.num(session.bodyMassKg),
      sport: athlete && athlete.sport, level: athlete && athlete.competitiveLevel,
      athleteId: athlete && athlete.id,
      protocolVersion: session.protocolVersion,
      conditions: E.sessionConditions(testId, result, session)
    };
    base.conditions = ctx.conditions;

    var match = E.matchBenchmark(testId, metricKey, ctx, db, s);
    base.internal = match.internal || null;
    if (!match.benchmark) {
      base.status = 'insufficient';
      base.reasonLabel = Settings.REPORT_COPY.insufficient;
      base.reason = match.reason;
      return base;
    }

    var bm = match.benchmark;
    var p = E.percentileFor(value, bm);
    if (!p) {
      base.status = 'insufficient';
      base.reason = 'The matched reference set could not produce a percentile for this value.';
      base.reasonLabel = Settings.REPORT_COPY.insufficient;
      base.benchmark = bm;
      return base;
    }

    base.status = 'scored';
    base.benchmark = bm;

    if (bm.method === 'criterion') {
      /* NOT a percentile. The reported number is the athlete's score as a
         percentage of the achievable maximum, and it gets criterion labels. */
      base.scoreType = 'criterion';
      base.percentile = value;
      base.displayPercentile = Stats.round(value, 0);
      base.precision = 'criterion';
      base.method = 'Score as a percentage of the achievable maximum on the items assessed. This is NOT a percentile against a population.';
      base.level = E.calculateCriterionLevel(value, s);
      base.referenceType = bm.referenceType;
      base.confidence = bm.confidence;
      base.contributes = true;
      base.z = null;
      base.bandValues = bm.bands || null;
      return base;
    }

    base.percentile = p.percentile;
    base.precision = p.precision;
    base.method = p.method;
    base.scoreType = 'percentile';
    base.displayPercentile = (p.precision === 'band')
      ? Stats.roundTo(p.percentile, s.scoring.bandDisplayRounding)
      : Stats.round(p.percentile, 0);
    base.displayPercentile = Math.min(99, Math.max(1, base.displayPercentile));
    base.level = E.calculatePerformanceLevel(p.percentile, s);
    base.referenceType = bm.referenceType;
    base.confidence = bm.confidence;
    base.contributes = true;
    base.z = Stats.pctToZ(p.percentile);
    base.bandValues = bm.bands || null;
    return base;
  };

  function reasonLabel(id) {
    if (!id) return 'Not tested.';
    for (var i = 0; i < Settings.NOT_TESTED_REASONS.length; i++) {
      if (Settings.NOT_TESTED_REASONS[i].id === id) return Settings.NOT_TESTED_REASONS[i].label;
    }
    return id;
  }
  E.reasonLabel = reasonLabel;

  /* ======================================================================
     CATEGORY SCORES
     ----------------------------------------------------------------------
     Weighted mean of z-scores, converted back to a percentile.
     Documented on the report so the number can be reproduced by hand.
     ====================================================================== */
  E.calculateCategoryScore = function (catId, metricScores, settings) {
    var s = st(settings);
    var cat = Tests.category(catId);
    var contributing = metricScores.filter(function (m) {
      return m.category === catId && m.status === 'scored';
    });
    var out = {
      categoryId: catId, categoryName: cat ? cat.name : catId,
      short: cat ? cat.short : catId, blurb: cat ? cat.blurb : '',
      percentile: null, displayPercentile: null, level: null,
      scoreType: 'percentile', status: 'insufficient',
      contributing: contributing, n: contributing.length,
      required: s.scoring.minMetricsPerCategory[catId] || 1,
      method: null, workings: [], precision: 'model',
      confidence: null, reason: null,
      available: Tests.byCategory(catId).length
    };

    if (contributing.length < out.required) {
      out.reason = contributing.length === 0
        ? 'No benchmarked result available in this category.'
        : 'Only ' + contributing.length + ' of the ' + out.required +
          ' benchmarked results this category requires are available. A category score is not reported from fewer.';
      return out;
    }

    /* A criterion-scored category is not a percentile and is not
       averaged on the z scale. */
    var allCriterion = contributing.every(function (m) { return m.scoreType === 'criterion'; });
    if (allCriterion) {
      var vals = contributing.map(function (m) { return m.value; });
      out.percentile = Stats.mean(vals);
      out.displayPercentile = Stats.round(out.percentile, 0);
      out.scoreType = 'criterion';
      out.status = 'scored';
      out.method = 'Mean of the criterion scores in this category. This is a percentage of the achievable score, NOT a percentile against a population.';
      out.precision = 'criterion';
      out.level = E.calculateCriterionLevel(out.percentile, s);
      out.confidence = 'low';
      out.workings = contributing.map(function (m) {
        return { label: m.testName + ' — ' + m.metricLabel, value: m.value,
                 weight: 1, percentile: m.value, z: null };
      });
      return out;
    }

    var sumWZ = 0, sumW = 0, anyBand = false;
    contributing.forEach(function (m) {
      var w = (m.weight === undefined || m.weight === null) ? 1 : m.weight;
      if (w <= 0) return;
      sumWZ += w * m.z;
      sumW += w;
      if (m.precision === 'band') anyBand = true;
      out.workings.push({
        label: m.testName + ' — ' + m.metricLabel,
        value: m.value, unit: m.unit, weight: w,
        percentile: m.displayPercentile, z: Stats.round(m.z, 3),
        referenceType: m.referenceType
      });
    });
    if (sumW <= 0) { out.reason = 'All contributing metrics have zero weight.'; return out; }

    var meanZ = sumWZ / sumW;
    out.percentile = Math.min(99, Math.max(1, Stats.zToPct(meanZ)));
    out.meanZ = meanZ;
    out.precision = anyBand ? 'band' : 'model';
    out.displayPercentile = anyBand
      ? Stats.roundTo(out.percentile, s.scoring.bandDisplayRounding)
      : Stats.round(out.percentile, 0);
    out.displayPercentile = Math.min(99, Math.max(1, out.displayPercentile));
    out.level = E.calculatePerformanceLevel(out.percentile, s);
    out.status = 'scored';
    out.sumWeights = sumW;
    out.method = 'Each contributing test percentile was converted to a z-score, the weighted mean of those z-scores was taken (total weight ' +
      Stats.round(sumW, 2) + '), and the mean z of ' + Stats.round(meanZ, 3) +
      ' was converted back to a percentile. Percentiles are not linear, so z-scores are averaged rather than the percentiles themselves.';

    /* category confidence = lowest confidence among contributors */
    var order = { low: 0, medium: 1, high: 2 }, lowest = 2;
    contributing.forEach(function (m) {
      var c = order[m.confidence] === undefined ? 0 : order[m.confidence];
      if (c < lowest) lowest = c;
    });
    out.confidence = ['low', 'medium', 'high'][lowest];
    /* coverage: how much of the category was actually tested */
    out.coveragePct = Math.round(contributing.length /
      Tests.byCategory(catId).reduce(function (n, t) {
        return n + t.metrics.filter(function (m) { return m.benchmarked; }).length;
      }, 0) * 100);
    return out;
  };

  /* ======================================================================
     STRENGTHS & DEVELOPMENT PRIORITIES
     ----------------------------------------------------------------------
     NOT simply the highest and lowest numbers. A metric must:
       * have actually been tested and benchmarked
       * clear a distance from the 50th percentile
       * not be flagged by the validator
       * not be a low-reliability or criterion-only measure, unless nothing
         better is available
     Each item carries the reason it was selected, so the coach can see why.
     ====================================================================== */
  function rankWeight(m, s) {
    /* Evidence quality multiplier used only for ORDERING, never to change a
       reported percentile. */
    var rel = { high: 1.0, medium: 0.9, low: 0.6 }[m.testReliability] || 0.8;
    var conf = { high: 1.0, medium: 0.9, low: 0.8 }[m.confidence] || 0.8;
    return rel * conf;
  }

  E.identifyProfile = function (metricScores, categoryScores, settings) {
    var s = st(settings), p = s.profiling;
    var eligible = metricScores.filter(function (m) {
      if (m.status !== 'scored') return false;
      if (p.excludeFlagged && m.flagged) return false;
      if (m.scoreType === 'criterion') return false;
      return true;
    });
    var held = eligible.filter(function (m) {
      return p.deprioritiseReliability.indexOf(m.testReliability) !== -1;
    });
    var preferred = eligible.filter(function (m) {
      return p.deprioritiseReliability.indexOf(m.testReliability) === -1;
    });

    function pick(list, dir) {
      /* The threshold is applied to the percentile the report actually
         PRINTS, not the unrounded one behind it. Otherwise a result shown as
         "45th percentile" can fail a rule stated as "at or below the 45th",
         which reads as a bug to anybody holding the report. */
      var f = list.filter(function (m) {
        var shown = m.displayPercentile === null || m.displayPercentile === undefined
          ? m.percentile : m.displayPercentile;
        return dir === 'high' ? shown >= p.strengthMinPercentile
                              : shown <= p.priorityMaxPercentile;
      });
      /* Ordering still uses the unrounded percentile, so two results shown
         as the same rounded value are still ranked sensibly. */
      f.sort(function (a, b) {
        var ka = (dir === 'high' ? a.percentile : -a.percentile) * rankWeight(a, s);
        var kb = (dir === 'high' ? b.percentile : -b.percentile) * rankWeight(b, s);
        return kb - ka;
      });
      return f;
    }

    function build(dir) {
      var out = pick(preferred, dir);
      if (out.length < p.maxItems) out = out.concat(pick(held, dir));
      /* At most one metric per test. Two metrics from the same air-bike
         sprint are one finding, not two, and listing both crowds out a
         genuinely different quality. The best-ranked metric of each test
         represents it. */
      var seen = {};
      out = out.filter(function (m) {
        if (seen[m.testId]) return false;
        seen[m.testId] = true;
        return true;
      });
      return out.slice(0, p.maxItems).map(function (m) {
        return {
          label: m.testName + (m.metricLabel && m.metricLabel !== m.testName ? ' — ' + m.metricLabel : ''),
          category: m.categoryName, categoryId: m.category,
          percentile: m.displayPercentile, level: m.level ? m.level.name : null,
          value: m.value, unit: m.unit, dp: m.dp,
          testReliability: m.testReliability, confidence: m.confidence,
          referenceType: m.referenceType,
          why: dir === 'high'
            ? 'At or above the ' + m.displayPercentile + 'th percentile of the matched reference set, on a test with ' +
              (m.testReliability || 'unrated') + ' measurement reliability.'
            : 'At or below the ' + m.displayPercentile + 'th percentile of the matched reference set, on a test with ' +
              (m.testReliability || 'unrated') + ' measurement reliability.'
        };
      });
    }

    var strengths = build('high'), priorities = build('low');

    /* Category ranking, reported separately from the test-level lists. */
    var scoredCats = categoryScores.filter(function (c) {
      return c.status === 'scored' && c.scoreType === 'percentile';
    });
    var catRank = scoredCats.slice().sort(function (a, b) { return b.percentile - a.percentile; });

    return {
      strengths: strengths,
      priorities: priorities,
      strongestCategories: catRank.slice(0, 3),
      weakestCategories: catRank.slice().reverse().slice(0, 3),
      notes: {
        strengths: strengths.length ? null : Settings.REPORT_COPY.noStrengths,
        priorities: priorities.length ? null : Settings.REPORT_COPY.noPriorities
      },
      selectionRule: 'Each test contributes at most one entry to each list. A quality is reported as a strength only at or above the ' +
        p.strengthMinPercentile + 'th percentile, and as a development priority only at or below the ' +
        p.priorityMaxPercentile + 'th. Results between those points are not far enough from the middle of the reference population to be called either. Tests that were not performed and values awaiting verification are excluded from both lists. Ordering also accounts for how reliable each test is and how confident the reference set is — it is not a simple sort on the percentile.'
    };
  };

  /* ======================================================================
     TRAINING RECOMMENDATIONS
     ====================================================================== */
  E.generateRecommendations = function (categoryScores, profile, settings) {
    var lib = Settings.RECOMMENDATIONS;
    var out = [];
    var byId = {};
    categoryScores.forEach(function (c) { byId[c.categoryId] = c; });

    categoryScores.forEach(function (c) {
      if (c.status !== 'scored') return;
      var set = lib.byCategory[c.categoryId];
      if (!set) return;
      var tier = c.percentile < 45 ? 'low' : (c.percentile < 75 ? 'mid' : 'high');
      out.push({
        categoryId: c.categoryId, categoryName: c.categoryName,
        percentile: c.displayPercentile, level: c.level ? c.level.name : null,
        tier: tier, items: set[tier].slice(),
        priority: tier === 'low' ? 1 : (tier === 'mid' ? 2 : 3)
      });
    });

    /* cross-category patterns */
    var cross = [];
    function pct(id) { return byId[id] && byId[id].status === 'scored' ? byId[id].percentile : null; }
    lib.crossRules.forEach(function (r) {
      var hi = r.when.high ? pct(r.when.high) : null;
      var lo = r.when.low ? pct(r.when.low) : null;
      var lo2 = r.when.alsoLow ? pct(r.when.alsoLow) : null;
      var ok = true;
      if (r.when.high) ok = ok && hi !== null && hi >= 65;
      if (r.when.low) ok = ok && lo !== null && lo < 50;
      if (r.when.alsoLow) ok = ok && lo2 !== null && lo2 < 50;
      if (ok) cross.push({ id: r.id, text: r.text });
    });

    out.sort(function (a, b) { return a.priority - b.priority; });
    return { byCategory: out, cross: cross, disclaimer: lib.disclaimer };
  };

  /* ======================================================================
     COMPOSITE INDEX (off by default — see settings.js for why)
     ====================================================================== */
  E.calculateComposite = function (categoryScores, settings) {
    var s = st(settings);
    if (!s.scoring.compositeEnabled) {
      return { enabled: false,
        note: 'No overall score is reported. Averaging power, strength, aerobic capacity and repeated-effort percentiles into one number implies those qualities are interchangeable and equally important, which is not defensible: two athletes with the same composite can need opposite training. The PROFILE is the output. A composite can be switched on in Settings if a customer requires one, and it is then labelled as an unvalidated convenience index.' };
    }
    var inc = categoryScores.filter(function (c) {
      return c.status === 'scored' && c.scoreType === 'percentile' &&
             s.scoring.compositeExcludes.indexOf(c.categoryId) === -1;
    });
    if (inc.length < 3) {
      return { enabled: true, status: 'insufficient', n: inc.length,
               note: 'A composite index needs at least 3 scored categories.' };
    }
    var z = Stats.mean(inc.map(function (c) { return Stats.pctToZ(c.percentile); }));
    var pctv = Stats.zToPct(z);
    return {
      enabled: true, status: 'scored',
      percentile: pctv,
      displayPercentile: Stats.roundTo(pctv, s.scoring.bandDisplayRounding),
      level: E.calculatePerformanceLevel(pctv, s),
      categories: inc.map(function (c) { return c.categoryId; }),
      label: s.scoring.compositeLabel,
      note: 'UNVALIDATED CONVENIENCE INDEX. Equal-weighted mean of the z-scores of ' +
        inc.length + ' category scores (' + inc.map(function (c) { return c.categoryName; }).join(', ') +
        '), converted back to a percentile. It has no validation behind it, it is not a measure of athletic ability, and the profile above is the meaningful output.'
    };
  };

  /* ======================================================================
     FULL SESSION ASSESSMENT
     ====================================================================== */
  E.assessSession = function (session, athlete, db, settings) {
    var s = st(settings);
    Model.deriveSession(session);
    var issues = Validate.validateAll(session, athlete, s);
    var flagged = Validate.flaggedMetrics(issues);

    var metricScores = Tests.benchmarkedMetrics().map(function (bmz) {
      return E.scoreMetric(bmz.testId, bmz.metric.key, session, athlete, db, s, flagged);
    });

    /* Secondary and observation metrics — reported on the results table but
       not benchmarked. */
    var observations = [];
    Tests.orderedTests().forEach(function (t) {
      var r = session.results[t.id];
      if (!r || r.status === 'not_tested' || r.status === 'pending') return;
      t.metrics.forEach(function (m) {
        if (m.benchmarked) return;
        var v = Calc.num(r.values && r.values[m.key]);
        if (v === null) return;
        observations.push({
          testId: t.id, testName: t.name, category: t.category,
          metricKey: m.key, metricLabel: m.label, unit: m.unit, dp: m.dp,
          role: m.role, value: v,
          note: (m.key === 'asymmetry_pct')
            ? (v >= s.asymmetry.noteThresholdPct
                ? s.asymmetry.label + ' (' + v.toFixed(1) + '%, lower on the ' +
                  (r.values._weakerSide || 'unrecorded') + ' side). ' + s.asymmetry.disclaimer
                : 'Difference between sides within the noted threshold of ' +
                  s.asymmetry.noteThresholdPct + '%.')
            : null
        });
      });
    });

    var categoryScores = Tests.CATEGORIES.slice()
      .sort(function (a, b) { return a.order - b.order; })
      .map(function (c) { return E.calculateCategoryScore(c.id, metricScores, s); });

    var profile = E.identifyProfile(metricScores, categoryScores, s);
    var recommendations = E.generateRecommendations(categoryScores, profile, s);
    var composite = E.calculateComposite(categoryScores, s);

    /* which reference types were actually used */
    var refTypes = {};
    metricScores.forEach(function (m) {
      if (m.status === 'scored') refTypes[m.referenceType] = (refTypes[m.referenceType] || 0) + 1;
    });

    var tested = 0, notTested = 0, insufficient = 0;
    metricScores.forEach(function (m) {
      if (m.status === 'scored') tested++;
      else if (m.status === 'insufficient') insufficient++;
      else notTested++;
    });

    return {
      session: session, athlete: athlete,
      protocolVersion: session.protocolVersion,
      metricScores: metricScores,
      observations: observations,
      categoryScores: categoryScores,
      profile: profile,
      recommendations: recommendations,
      composite: composite,
      issues: issues,
      issueSummary: Validate.summary(issues),
      referenceTypesUsed: refTypes,
      usesProvisional: !!refTypes.PGP_PROVISIONAL,
      coverage: { scored: tested, notTested: notTested, insufficient: insufficient,
                  total: metricScores.length },
      generatedAt: new Date().toISOString()
    };
  };

  /* ======================================================================
     RETEST COMPARISON
     ====================================================================== */
  E.compareSessions = function (currentAssessment, previousAssessment, settings) {
    var s = st(settings);
    var out = { metrics: [], categories: [], comparable: true, warnings: [] };
    if (!previousAssessment) return null;

    var cur = currentAssessment, prev = previousAssessment;
    var days = Math.round((new Date(cur.session.date) - new Date(prev.session.date)) / 86400000);
    out.previousDate = prev.session.date;
    out.currentDate = cur.session.date;
    out.daysBetween = days;
    out.weeksBetween = Math.round(days / 7 * 10) / 10;

    if (s.retest.requireSameProtocolVersion &&
        cur.session.protocolVersion !== prev.session.protocolVersion) {
      out.comparable = false;
      out.warnings.push('PROTOCOL VERSION CHANGED (' + prev.session.protocolVersion + ' to ' +
        cur.session.protocolVersion + '). Results from materially different protocols are not directly comparable. Changes below are shown for reference only and should not be interpreted as adaptation.');
    }

    var prevBy = {};
    prev.metricScores.forEach(function (m) { prevBy[m.testId + '.' + m.metricKey] = m; });

    cur.metricScores.forEach(function (m) {
      var p = prevBy[m.testId + '.' + m.metricKey];
      var row = {
        testId: m.testId, testName: m.testName, shortName: m.shortName,
        category: m.category, metricKey: m.metricKey, metricLabel: m.metricLabel,
        unit: m.unit, dp: m.dp, direction: m.direction,
        previous: p ? p.value : null, current: m.value,
        previousPercentile: p ? p.displayPercentile : null,
        currentPercentile: m.displayPercentile,
        previousLevel: p && p.level ? p.level.name : null,
        currentLevel: m.level ? m.level.name : null,
        levelChanged: false, change: null, changePct: null,
        verdict: 'unknown', meaningful: null, equipmentChanged: false
      };
      if (p && p.value !== null && m.value !== null) {
        var def = Tests.get(m.testId);
        var rel = def && def.reliability ? def.reliability[m.metricKey] : null;
        var mc = Calc.calculateMeaningfulChange(m.value, p.value, rel, m.direction !== 'low');
        row.change = mc.change;
        row.changePct = mc.changePct;
        row.verdict = mc.verdict;
        row.meaningful = mc;
        row.levelChanged = !!(row.previousLevel && row.currentLevel && row.previousLevel !== row.currentLevel);
        /* equipment sanity */
        var eqKey = def && def.equipmentKey;
        if (s.retest.requireSameEquipment && eqKey && eqKey !== 'none' &&
            cur.session.equipment[eqKey] !== prev.session.equipment[eqKey]) {
          row.equipmentChanged = true;
          row.equipmentNote = 'Equipment changed between tests (' +
            prev.session.equipment[eqKey] + ' to ' + cur.session.equipment[eqKey] +
            '). This change is not interpretable as adaptation.';
        }
      }
      out.metrics.push(row);
    });

    var prevCat = {};
    prev.categoryScores.forEach(function (c) { prevCat[c.categoryId] = c; });
    cur.categoryScores.forEach(function (c) {
      var p = prevCat[c.categoryId];
      out.categories.push({
        categoryId: c.categoryId, categoryName: c.categoryName,
        previous: p ? p.displayPercentile : null, current: c.displayPercentile,
        previousLevel: p && p.level ? p.level.name : null,
        currentLevel: c.level ? c.level.name : null,
        change: (p && p.percentile !== null && c.percentile !== null)
          ? Stats.round(c.percentile - p.percentile, 0) : null,
        levelChanged: !!(p && p.level && c.level && p.level.name !== c.level.name),
        scoreType: c.scoreType
      });
    });

    out.improved = out.metrics.filter(function (r) { return r.verdict === 'improved'; }).length;
    out.declined = out.metrics.filter(function (r) { return r.verdict === 'declined'; }).length;
    out.withinNoise = out.metrics.filter(function (r) { return r.verdict === 'within-noise'; }).length;
    out.caveat = 'A change is described as an improvement or a decline only when it exceeds the minimal detectable change (2.77 x typical error) for that metric. Smaller changes are reported as within measurement variation. Where the typical error is a PGP placeholder rather than a measured value, the verdict is marked provisional — PGP\'s own test-retest study will replace these.';
    return out;
  };

  /* ======================================================================
     RETEST TARGETS
     Default target = current value plus one MDC95 in the improving
     direction, so a target is always at least a detectable change. Editable.
     ====================================================================== */
  E.suggestRetestTargets = function (assessment, settings) {
    var s = st(settings);
    var out = [];
    assessment.metricScores.forEach(function (m) {
      if (m.status !== 'scored' || m.value === null) return;
      var def = Tests.get(m.testId);
      var rel = def && def.reliability ? def.reliability[m.metricKey] : null;
      var mc = Calc.calculateMeaningfulChange(m.value, m.value, rel, m.direction !== 'low');
      var target = null, basis;
      if (mc.mdc95) {
        var delta = mc.mdc95 * s.retest.targetMdcMultiple;
        target = m.direction === 'low' ? m.value - delta : m.value + delta;
        basis = 'Current value ' + (m.direction === 'low' ? 'minus ' : 'plus ') +
          Stats.round(delta, m.dp + 1) + ' ' + (m.unit || '') +
          ' — one minimal detectable change, so that reaching the target is distinguishable from measurement variation.' +
          (mc.provisional ? ' Based on a PGP PLACEHOLDER typical error.' : '');
      } else {
        basis = 'No reliability estimate available for this metric — set a target manually.';
      }
      out.push({
        testId: m.testId, metricKey: m.metricKey,
        label: m.testName + ' — ' + m.metricLabel,
        unit: m.unit, dp: m.dp, direction: m.direction,
        current: m.value,
        target: target === null ? null : Stats.round(target, m.dp),
        change: target === null ? null : Stats.round(target - m.value, m.dp + 1),
        basis: basis, provisional: !!mc.provisional,
        category: m.category
      });
    });
    return { targets: out, weeks: s.retest.defaultWeeks,
      note: 'Targets default to one minimal detectable change from the current result, which is the smallest improvement that can be distinguished from measurement variation. They are editable, and they are training targets — not predictions and not promises.' };
  };

  /* ======================================================================
     GYM / SQUAD AGGREGATE
     Aggregates are de-identified by default: no names, no individual rows.
     ====================================================================== */
  E.gymAggregate = function (db, filters, settings) {
    var s = st(settings);
    filters = filters || {};
    var athletes = {};
    (db.athletes || []).forEach(function (a) { athletes[a.id] = a; });

    var assessments = [];
    (db.sessions || []).forEach(function (sess) {
      var a = athletes[sess.athleteId];
      if (!a || a.archived) return;
      /* The athlete's own gym, not the venue they were tested at: a gym's
         report is about its athletes, wherever the testing happened. */
      if (filters.gymId && a.gymId !== filters.gymId) return;
      if (filters.sport && a.sport !== filters.sport) return;
      if (filters.sex && a.sex !== filters.sex) return;
      if (filters.level && a.competitiveLevel !== filters.level) return;
      var age = Model.athleteAgeForSession(a, sess);
      if (filters.ageMin && (age === null || age < filters.ageMin)) return;
      if (filters.ageMax && (age === null || age > filters.ageMax)) return;
      var bw = Calc.num(sess.bodyMassKg);
      if (filters.massMin && (bw === null || bw < filters.massMin)) return;
      if (filters.massMax && (bw === null || bw > filters.massMax)) return;
      if (filters.from && sess.date < filters.from) return;
      if (filters.to && sess.date > filters.to) return;
      assessments.push({ athlete: a, session: sess });
    });

    /* latest session per athlete */
    var latest = {};
    assessments.forEach(function (x) {
      if (!latest[x.athlete.id] || x.session.date > latest[x.athlete.id].session.date) {
        latest[x.athlete.id] = x;
      }
    });
    var rows = Object.keys(latest).map(function (k) {
      var x = latest[k];
      return E.assessSession(x.session, x.athlete, db, s);
    });

    var catStats = {};
    Tests.CATEGORIES.forEach(function (c) {
      var vals = [], levelCounts = {};
      s.levels.forEach(function (l) { levelCounts[l.name] = 0; });
      rows.forEach(function (r) {
        var cs = r.categoryScores.filter(function (x) { return x.categoryId === c.id; })[0];
        if (cs && cs.status === 'scored') {
          vals.push(cs.percentile);
          if (cs.level) levelCounts[cs.level.name]++;
        }
      });
      catStats[c.id] = {
        categoryId: c.id, categoryName: c.name, short: c.short,
        n: vals.length, mean: Stats.mean(vals), sd: Stats.sd(vals),
        min: Stats.min(vals), max: Stats.max(vals),
        levelCounts: levelCounts, scoreType: 'percentile'
      };
    });

    /* most common development priority across the squad */
    var priorityCounts = {};
    rows.forEach(function (r) {
      (r.profile.priorities || []).forEach(function (p) {
        priorityCounts[p.categoryId] = (priorityCounts[p.categoryId] || 0) + 1;
      });
    });
    var commonPriority = Object.keys(priorityCounts).sort(function (a, b) {
      return priorityCounts[b] - priorityCounts[a];
    }).map(function (k) {
      var c = Tests.category(k);
      return { categoryId: k, categoryName: c ? c.name : k, count: priorityCounts[k] };
    });

    /* test completion rates */
    var completion = {};
    Tests.orderedTests().forEach(function (t) {
      var n = 0;
      rows.forEach(function (r) {
        var res = r.session.results[t.id];
        if (res && res.status === 'tested') n++;
      });
      completion[t.id] = { testId: t.id, name: t.shortName, n: n,
        pct: rows.length ? Math.round(n / rows.length * 100) : 0 };
    });

    var consentMissing = rows.filter(function (r) {
      return r.athlete.dataConsent === false;
    }).length;

    return {
      filters: filters,
      athleteCount: rows.length,
      sessionCount: assessments.length,
      retested: Object.keys(latest).filter(function (k) {
        return assessments.filter(function (x) { return x.athlete.id === k; }).length > 1;
      }).length,
      categories: catStats,
      commonPriorities: commonPriority,
      completion: completion,
      anonymised: true,
      consentMissing: consentMissing,
      privacyNote: 'Aggregate figures only — no athlete names, identifiers or individual results are included in this view. Share a gym-level report externally only with the gym\'s authorisation, and only where individual athletes cannot be identified from small group sizes.',
      smallSampleWarning: rows.length < 10
        ? 'Fewer than 10 athletes: group averages are unstable and individual athletes may be identifiable from them. Treat this as indicative only.'
        : null
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
  root.PGP = root.PGP || {};
  root.PGP.Engine = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
