/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/core/calc.js — calculation engine
   --------------------------------------------------------------------------
   Pure, documented, unit-tested functions. Separated entirely from the UI.
   Every formula carries its source in a comment. Where no published formula
   exists, the function is marked  [PGP DEFINITION]  and the choice explained.

   Universal rules enforced here:
     * A missing input returns null. It NEVER returns 0.
     * No function silently corrects or clamps athlete data.
     * Nothing in this file makes a claim about fighting ability, injury risk
       or medical status.
   ========================================================================== */
(function (root) {
  'use strict';

  var S = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./stats.js') : root.PGP.Stats;

  var C = {};

  /* ===== helpers ========================================================= */
  function num(x) {
    if (x === null || x === undefined || x === '') return null;
    var n = typeof x === 'number' ? x : parseFloat(x);
    return (typeof n === 'number' && isFinite(n)) ? n : null;
  }
  C.num = num;

  /* ===== 1. BODY / GENERAL =============================================== */

  /* Body Mass Index. Reported for record only.
     NOT interpreted: BMI is uninformative in muscular combat athletes. */
  C.calculateBMI = function (massKg, heightCm) {
    var m = num(massKg), h = num(heightCm);
    if (m === null || h === null || h <= 0) return null;
    return m / Math.pow(h / 100, 2);
  };

  /* Best of a set of attempts. direction 'high' (default) or 'low'. */
  C.best = function (attempts, direction) {
    var v = S.numeric(attempts);
    if (!v.length) return null;
    return direction === 'low' ? Math.min.apply(null, v) : Math.max.apply(null, v);
  };

  /* ===== 2. POWER ======================================================== */

  /* Asymmetry between limbs, expressed against the BETTER limb.
         asym% = |L - R| / max(L,R) * 100
     Reported as a PERFORMANCE DIFFERENCE. The app does not describe this as
     an injury risk: evidence linking inter-limb asymmetry thresholds to
     injury is inconsistent and highly task-dependent. */
  C.calculateAsymmetry = function (left, right) {
    var l = num(left), r = num(right);
    if (l === null || r === null) return null;
    var mx = Math.max(l, r);
    if (mx <= 0) return null;
    return Math.abs(l - r) / mx * 100;
  };

  /* Which side produced the lower score ('left' | 'right' | 'equal'). */
  C.asymmetrySide = function (left, right) {
    var l = num(left), r = num(right);
    if (l === null || r === null) return null;
    if (l === r) return 'equal';
    return l < r ? 'left' : 'right';
  };

  /* Jump height from flight time (free-fall):  h = g * t^2 / 8
     Valid ONLY for flight-time systems (jump mat / switch mat) and assumes
     identical take-off and landing body position. Displayed as a derived
     cross-check, never mixed with force-plate displacement data in the same
     benchmark. */
  C.jumpHeightFromFlightTime = function (flightTimeS) {
    var t = num(flightTimeS);
    if (t === null || t <= 0) return null;
    return (9.81 * t * t / 8) * 100; /* cm */
  };

  /* Reactive Strength Index (modified) = jump height (m) / contact time (s).
     Only computed when the athlete performed a test with a measured
     contact/ground time. Units: m/s. */
  C.calculateRSImod = function (jumpHeightCm, contactTimeS) {
    var h = num(jumpHeightCm), t = num(contactTimeS);
    if (h === null || t === null || t <= 0) return null;
    return (h / 100) / t;
  };

  /* Peak power estimate from CMJ — Sayers et al. (1999) peak power equation:
         PP (W) = 60.7 * jump height(cm) + 45.3 * body mass(kg) - 2055
     Population-specific regression, derived in college athletes. Provided as
     an optional estimate and labelled as such; NOT used for benchmarking. */
  C.estimateCMJPeakPower = function (jumpHeightCm, massKg) {
    var h = num(jumpHeightCm), m = num(massKg);
    if (h === null || m === null) return null;
    return 60.7 * h + 45.3 * m - 2055;
  };

  /* ===== 3. STRENGTH ===================================================== */

  /* Estimated 1RM. Two published equations, both reported so the coach can
     see the spread. Default = Epley.
       Epley (1985):    1RM = load * (1 + reps/30)
       Brzycki (1993):  1RM = load * 36 / (37 - reps)
     Accuracy degrades markedly above ~10 repetitions and in athletes with
     limited lifting experience. Always surfaced as ESTIMATED 1RM. */
  C.estimateOneRepMax = function (loadKg, reps, equation) {
    var l = num(loadKg), r = num(reps);
    if (l === null || r === null || r < 1) return null;
    if (r === 1) return l;
    if (r > 12) return null; /* refuse rather than report a misleading number */
    if (equation === 'brzycki') {
      if (r >= 37) return null;
      return l * 36 / (37 - r);
    }
    return l * (1 + r / 30); /* epley */
  };

  C.oneRepMaxBoth = function (loadKg, reps) {
    return {
      epley: C.estimateOneRepMax(loadKg, reps, 'epley'),
      brzycki: C.estimateOneRepMax(loadKg, reps, 'brzycki')
    };
  };

  /* Relative strength = load / body mass (multiples of body mass). */
  C.calculateRelativeStrength = function (loadKg, bodyMassKg) {
    var l = num(loadKg), m = num(bodyMassKg);
    if (l === null || m === null || m <= 0) return null;
    return l / m;
  };

  /* Weighted chin-up relative system mass = (body mass + added load) / body mass.
     Reported as a multiple of body mass so that a 60 kg and a 100 kg athlete
     can be compared on the same scale. */
  C.calculateRelativeSystemMass = function (addedLoadKg, bodyMassKg) {
    var a = num(addedLoadKg), m = num(bodyMassKg);
    if (a === null || m === null || m <= 0) return null;
    return (m + a) / m;
  };

  /* Absolute system mass moved in a weighted chin-up. */
  C.calculateSystemMass = function (addedLoadKg, bodyMassKg) {
    var a = num(addedLoadKg), m = num(bodyMassKg);
    if (a === null || m === null) return null;
    return m + a;
  };

  /* ===== 4. BIKE / POWER OUTPUT ========================================== */

  /* Power relative to body mass. The primary metric for both the aerobic and
     the anaerobic bike tests, because absolute watts on an air bike scale
     strongly with body mass and limb length. */
  C.calculateWPerKg = function (watts, bodyMassKg) {
    var w = num(watts), m = num(bodyMassKg);
    if (w === null || m === null || m <= 0) return null;
    return w / m;
  };

  /* Total work (kJ) from mean power and duration.  W = P * t  */
  C.calculateWorkKJ = function (meanWatts, durationS) {
    var w = num(meanWatts), t = num(durationS);
    if (w === null || t === null || t <= 0) return null;
    return w * t / 1000;
  };

  /* Mean power back-calculated from total work. */
  C.meanPowerFromWork = function (workKJ, durationS) {
    var k = num(workKJ), t = num(durationS);
    if (k === null || t === null || t <= 0) return null;
    return k * 1000 / t;
  };

  /* ---------------------------------------------------------------------
     Fatigue index for a single 30 s all-out effort.
         FI% = (peak power - minimum power) / peak power * 100
     REQUIRES a console/software that reports windowed minimum power. Most
     air-bike consoles do NOT. When minimum power is unavailable the function
     returns null and the app displays "not computable with this equipment"
     rather than substituting a different formula.
     --------------------------------------------------------------------- */
  C.calculateFatigueIndex = function (peakWatts, minWatts) {
    var p = num(peakWatts), m = num(minWatts);
    if (p === null || m === null || p <= 0) return null;
    return (p - m) / p * 100;
  };

  /* Rate of power decline (W/s) across a single sprint. Requires the time at
     which peak power occurred; otherwise null. */
  C.calculateFatigueRate = function (peakWatts, minWatts, timeBetweenS) {
    var p = num(peakWatts), m = num(minWatts), t = num(timeBetweenS);
    if (p === null || m === null || t === null || t <= 0) return null;
    return (p - m) / t;
  };

  /* ===== 5. REPEATED EFFORT ============================================== */

  /* ---------------------------------------------------------------------
     Percentage decrement score — Fitzsimons et al. (1993), the most widely
     used repeated-sprint decrement calculation:

         Sdec% = (1 - (sum of all sprints) / (best sprint * number of sprints)) * 100

     0% = no decline. Higher = greater decline across the set.
     Preferred over (best-worst)/best because it uses every sprint and is
     less sensitive to a single anomalous effort.
     --------------------------------------------------------------------- */
  C.calculatePerformanceDecrement = function (sprintValues) {
    var v = S.numeric(sprintValues);
    if (v.length < 2) return null;
    var best = Math.max.apply(null, v);
    if (best <= 0) return null;
    var total = v.reduce(function (s, x) { return s + x; }, 0);
    return (1 - (total / (best * v.length))) * 100;
  };

  /* Simple best-to-worst decline, reported alongside Sdec for transparency. */
  C.calculateBestWorstDecline = function (sprintValues) {
    var v = S.numeric(sprintValues);
    if (v.length < 2) return null;
    var best = Math.max.apply(null, v), worst = Math.min.apply(null, v);
    if (best <= 0) return null;
    return (best - worst) / best * 100;
  };

  /* Sprint-to-sprint profile: each sprint as a % of the best sprint.
     Used for the repeated-effort trace chart. Missing sprints stay null. */
  C.sprintProfile = function (sprintValues) {
    if (!Array.isArray(sprintValues)) return [];
    var v = S.numeric(sprintValues);
    if (!v.length) return [];
    var best = Math.max.apply(null, v);
    return sprintValues.map(function (x) {
      var n = num(x);
      if (n === null || best <= 0) return null;
      return n / best * 100;
    });
  };

  /* [PGP DEFINITION] Linear slope of power across sprints (W per sprint),
     by ordinary least squares on sprint index. Describes the SHAPE of the
     decline, which Sdec alone does not. */
  C.sprintSlope = function (sprintValues) {
    var pts = [];
    for (var i = 0; i < (sprintValues || []).length; i++) {
      var y = num(sprintValues[i]);
      if (y !== null) pts.push([i + 1, y]);
    }
    if (pts.length < 3) return null;
    var n = pts.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (var j = 0; j < n; j++) {
      sx += pts[j][0]; sy += pts[j][1];
      sxy += pts[j][0] * pts[j][1]; sxx += pts[j][0] * pts[j][0];
    }
    var den = n * sxx - sx * sx;
    if (den === 0) return null;
    return (n * sxy - sx * sy) / den;
  };

  /* Summary of a repeated-sprint set. Works on whichever metric is passed
     (peak watts or mean watts) — the caller states which. */
  C.summariseRepeatedSprints = function (sprintValues) {
    var v = S.numeric(sprintValues);
    return {
      n: v.length,
      best: v.length ? Math.max.apply(null, v) : null,
      worst: v.length ? Math.min.apply(null, v) : null,
      mean: S.mean(v),
      sd: S.sd(v),
      decrementPct: C.calculatePerformanceDecrement(v),
      bestWorstPct: C.calculateBestWorstDecline(v),
      slopePerSprint: C.sprintSlope(sprintValues),
      profilePct: C.sprintProfile(sprintValues)
    };
  };

  /* ===== 6. CHANGE / RETEST ============================================== */

  C.calculateChange = function (current, previous) {
    var c = num(current), p = num(previous);
    if (c === null || p === null) return null;
    return c - p;
  };

  C.calculatePercentChange = function (current, previous) {
    var c = num(current), p = num(previous);
    if (c === null || p === null || p === 0) return null;
    return (c - p) / Math.abs(p) * 100;
  };

  /* ---------------------------------------------------------------------
     calculateMeaningfulChange()
     Decides whether an observed change is larger than measurement noise.

     Inputs:
       current, previous  — the two results
       reliability        — { cvPct | typicalError, unit, source, verified }
       higherIsBetter     — direction of improvement

     Method (Hopkins, 2000, Sports Medicine 30:1-15):
       typical error (TE) = CV% * previous / 100      (when CV% supplied)
       smallest worthwhile change (SWC) = 0.2 * between-athlete SD  [if supplied]
       minimal detectable change (MDC95) = 1.96 * sqrt(2) * TE = 2.77 * TE

     VERDICTS
       'improved' / 'declined'  — |change| exceeds MDC95
       'within-noise'           — |change| does not exceed MDC95
       'unknown'                — no reliability estimate available

     If the reliability estimate is a PGP PLACEHOLDER (verified === false),
     the result is returned with  provisional:true  and the UI shows a caution
     badge. We do NOT invent reliability statistics and present them as
     literature values.
     --------------------------------------------------------------------- */
  C.calculateMeaningfulChange = function (current, previous, reliability, higherIsBetter) {
    var c = num(current), p = num(previous);
    var out = {
      change: C.calculateChange(c, p),
      changePct: C.calculatePercentChange(c, p),
      te: null, mdc95: null, swc: null,
      verdict: 'unknown', provisional: false,
      basis: 'No reliability estimate available for this metric.'
    };
    if (c === null || p === null) { out.verdict = 'unknown'; return out; }
    if (!reliability) return out;

    var te = null;
    if (num(reliability.typicalError) !== null) te = num(reliability.typicalError);
    else if (num(reliability.cvPct) !== null) te = num(reliability.cvPct) * Math.abs(p) / 100;
    if (te === null || te <= 0) return out;

    out.te = te;
    out.mdc95 = 2.77 * te;               /* 1.96 * sqrt(2) */
    if (num(reliability.betweenAthleteSD) !== null) {
      out.swc = 0.2 * num(reliability.betweenAthleteSD);
    }
    out.provisional = reliability.verified === false;
    out.basis = (reliability.source || 'unspecified source') +
      (out.provisional ? ' (PGP PLACEHOLDER — replace with PGP reliability data)' : '');

    var improved = higherIsBetter === false ? (c < p) : (c > p);
    if (Math.abs(out.change) > out.mdc95) out.verdict = improved ? 'improved' : 'declined';
    else out.verdict = 'within-noise';
    return out;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C;
  root.PGP = root.PGP || {};
  root.PGP.Calc = C;
})(typeof globalThis !== 'undefined' ? globalThis : this);
