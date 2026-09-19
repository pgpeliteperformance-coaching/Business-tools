/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/core/stats.js — statistical primitives
   --------------------------------------------------------------------------
   Pure functions only. No DOM, no storage, no side effects.
   Every formula used anywhere in the app is defined and documented HERE or in
   calc.js so that the methodology can be audited by a third party.
   ========================================================================== */
(function (root) {
  'use strict';

  var S = {};

  /* ---------------------------------------------------------------------
     erf(x) — Abramowitz & Stegun (1964) 7.1.26 rational approximation.
     Maximum absolute error ~1.5e-7. Adequate for percentile reporting,
     which we round to whole numbers (or to the nearest 5 for band-derived
     estimates) anyway.
     --------------------------------------------------------------------- */
  S.erf = function (x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * x);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  };

  /* Standard normal cumulative distribution function.  Phi(z) = P(Z <= z) */
  S.normalCdf = function (z) {
    if (!isFinite(z)) return z > 0 ? 1 : 0;
    return 0.5 * (1 + S.erf(z / Math.SQRT2));
  };

  /* ---------------------------------------------------------------------
     probit(p) — inverse standard normal CDF.
     Peter Acklam's rational approximation; relative error < 1.15e-9.
     Used to convert a percentile back into a z-score so that percentiles
     coming from DIFFERENT derivation methods (normal model, empirical
     ECDF, provisional bands) can be averaged on a common scale.
     --------------------------------------------------------------------- */
  S.probit = function (p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
    var pLow = 0.02425, pHigh = 1 - pLow, q, r, x;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
          (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    return x;
  };

  /* Percentile (0-100) <-> z-score, with clamping so that extreme results
     never produce infinite z values that would poison a category mean. */
  S.PCT_CLAMP = [0.5, 99.5];
  S.pctToZ = function (pct) {
    var p = Math.min(Math.max(pct, S.PCT_CLAMP[0]), S.PCT_CLAMP[1]);
    return S.probit(p / 100);
  };
  S.zToPct = function (z) {
    return S.normalCdf(z) * 100;
  };

  /* ------------------------------ descriptives ------------------------- */
  S.mean = function (a) {
    var v = S.numeric(a);
    if (!v.length) return null;
    return v.reduce(function (s, x) { return s + x; }, 0) / v.length;
  };
  S.sd = function (a, sample) {
    var v = S.numeric(a);
    if (v.length < 2) return null;
    var m = S.mean(v);
    var ss = v.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0);
    return Math.sqrt(ss / (sample === false ? v.length : v.length - 1));
  };
  S.min = function (a) { var v = S.numeric(a); return v.length ? Math.min.apply(null, v) : null; };
  S.max = function (a) { var v = S.numeric(a); return v.length ? Math.max.apply(null, v) : null; };
  S.sum = function (a) {
    var v = S.numeric(a);
    return v.length ? v.reduce(function (s, x) { return s + x; }, 0) : null;
  };

  /* numeric() strips null / undefined / '' / NaN.
     CRITICAL: missing data is REMOVED, never coerced to zero. */
  S.numeric = function (a) {
    if (!Array.isArray(a)) return [];
    var out = [];
    for (var i = 0; i < a.length; i++) {
      var x = a[i];
      if (x === null || x === undefined || x === '') continue;
      var n = typeof x === 'number' ? x : parseFloat(x);
      if (typeof n === 'number' && isFinite(n)) out.push(n);
    }
    return out;
  };

  /* ---------------------------------------------------------------------
     empiricalPercentile(value, sample, higherIsBetter)
     Hazen / mid-rank plotting position:
         pct = 100 * (rankBelow + 0.5 * rankEqual) / n
     This is the standard "percentile of a score within a reference sample"
     definition and is what the PGP internal-norm engine uses once enough
     athletes have been tested.
     --------------------------------------------------------------------- */
  S.empiricalPercentile = function (value, sample, higherIsBetter) {
    var v = S.numeric(sample);
    if (!v.length || value === null || value === undefined || !isFinite(value)) return null;
    var below = 0, equal = 0;
    for (var i = 0; i < v.length; i++) {
      var better = higherIsBetter === false ? v[i] > value : v[i] < value;
      if (v[i] === value) equal++;
      else if (better) below++;
    }
    return 100 * (below + 0.5 * equal) / v.length;
  };

  /* Linear interpolation between two (x,y) anchor points. */
  S.lerp = function (x, x0, y0, x1, y1) {
    if (x1 === x0) return (y0 + y1) / 2;
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
  };

  /* Rounding helpers used for display only — never for stored values. */
  S.round = function (x, dp) {
    if (x === null || x === undefined || !isFinite(x)) return null;
    var f = Math.pow(10, dp || 0);
    return Math.round(x * f) / f;
  };
  S.roundTo = function (x, step) {
    if (x === null || x === undefined || !isFinite(x)) return null;
    return Math.round(x / step) * step;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = S;
  root.PGP = root.PGP || {};
  root.PGP.Stats = S;
})(typeof globalThis !== 'undefined' ? globalThis : this);
