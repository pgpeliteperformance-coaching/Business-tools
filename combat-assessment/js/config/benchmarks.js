/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/config/benchmarks.js — REFERENCE / BENCHMARK DATABASE
   ==========================================================================

   READ THIS BEFORE CHANGING ANYTHING
   ----------------------------------
   Every numeric standard shipped in this file is a  PGP PROVISIONAL STANDARD.
   That means:

       It is a coaching-judgement starting point, chosen to be plausible for
       trained combat athletes. It is NOT extracted from a published study,
       it is NOT validated, and it must NOT be described to an athlete, a gym
       or a customer as a scientific norm.

   This is a deliberate design decision. Populating this file with invented
   numbers dressed up as literature values would make the whole product
   indefensible. Instead the app is built so that:

       1. every standard is labelled with where it came from,
       2. provisional standards are visibly marked everywhere they are used,
       3. published data can be dropped in without touching any other file,
       4. PGP's own athlete database can take over as the reference source
          once the sample is large enough.

   THREE REFERENCE TYPES
   ---------------------
   PUBLISHED       Mean and SD (or published percentiles) taken from a named,
                   peer-reviewed source, with the protocol matched. Requires
                   source.verified === true. NONE ARE SHIPPED — see
                   LITERATURE_QUEUE at the bottom of this file for the
                   reading list to work through.
   PGP_PROVISIONAL Coaching-judgement standards. Everything shipped here.
                   Always displayed with a provisional marker.
   PGP_INTERNAL    Generated at runtime from the PGP athlete database once a
                   matched stratum reaches the minimum sample size set in
                   settings.js. Built by engine.js — never stored in this file.

   HOW A BAND BENCHMARK WORKS
   --------------------------
   method: 'bands' supplies the value that sits at three percentile anchors:

       p25  the DEVELOPING / TRAINED boundary
       p65  the TRAINED / ADVANCED boundary
       p90  the ADVANCED / HIGH PERFORMANCE boundary

   The engine interpolates between anchors to produce a percentile, and
   extrapolates beyond the end anchors using the slope of the nearest
   segment, clamped to 1-99. Because the anchors themselves are provisional,
   every percentile produced this way is marked  precision: 'band'  and is
   displayed ROUNDED TO THE NEAREST 5 so that the app does not imply it can
   tell 79th from 80th percentile. It cannot.

   method: 'normal' supplies { mean, sd } and the engine uses a z-score and
   the normal CDF — the method to use for published descriptive statistics.

   method: 'percentiles' supplies an explicit percentile table, e.g.
   { p10: .., p25: .., p50: .., p75: .., p90: .. } — the method to use when
   a source publishes percentiles directly.

   MATCHING
   --------
   A benchmark is only used for an athlete if the test, metric, protocol
   conditions, sex, age range and (where specified) body-mass band all match.
   Sex-specific sets are NEVER substituted for one another. If nothing
   matches, the app reports "Insufficient reference data" and the metric is
   excluded from the category score. That is the correct behaviour.
   ========================================================================== */
(function (root) {
  'use strict';

  var TODAY = '2026-09-19';

  /* Body-mass bands used only where a metric is genuinely body-mass
     dependent in a way that cannot be removed by normalisation
     (currently: chin-up repetitions). */
  var BW_BANDS = {
    male:   [ { id: 'm_light',  label: 'up to 70.3 kg', min: 0,    max: 70.3 },
              { id: 'm_middle', label: '70.4 - 83.9 kg', min: 70.3, max: 83.9 },
              { id: 'm_heavy',  label: 'over 83.9 kg',  min: 83.9, max: 999 } ],
    female: [ { id: 'f_light',  label: 'up to 61.2 kg', min: 0,    max: 61.2 },
              { id: 'f_heavy',  label: 'over 61.2 kg',  min: 61.2, max: 999 } ]
  };

  /* Shared provisional-source stamp. */
  function prov(note) {
    return {
      citation: 'PGP PROVISIONAL STANDARD — coaching judgement, not a published value',
      verified: false,
      note: note || 'Replace with published data or with PGP internal norms once the sample is large enough.'
    };
  }

  function bm(o) {
    return {
      id: o.id,
      testId: o.testId,
      metric: o.metric,
      referenceType: o.referenceType || 'PGP_PROVISIONAL',
      sex: o.sex,                       /* 'male' | 'female' */
      ageRange: o.ageRange || [18, 35],
      bwBand: o.bwBand || null,
      population: o.population || 'Trained combat-sport athletes',
      sport: o.sport || 'any',          /* 'any' | 'mma' | 'muay_thai' | 'boxing' */
      level: o.level || 'any',          /* 'any' | 'amateur' | 'professional' */
      direction: o.direction,           /* 'high' | 'low' */
      unit: o.unit,
      conditions: o.conditions || {},
      method: o.method,
      bands: o.bands || null,
      distribution: o.distribution || null,
      percentiles: o.percentiles || null,
      n: o.n === undefined ? null : o.n,
      protocol: o.protocol,
      source: o.source || prov(),
      confidence: o.confidence || 'low',
      dateAdded: o.dateAdded || TODAY,
      notes: o.notes || ''
    };
  }

  var BENCHMARKS = [

  /* ================= POWER ============================================== */
  bm({ id: 'cmj_m', testId: 'cmj', metric: 'height_cm', sex: 'male',
       direction: 'high', unit: 'cm', method: 'bands',
       bands: { p25: 32, p65: 40, p90: 48 },
       conditions: { armPosition: 'hands_on_hips', device: 'mat_or_plate' },
       protocol: 'PGP v1.0 CMJ: hands on hips, self-selected depth, best of 3, jump mat or force plate.',
       confidence: 'low',
       notes: 'Device matters. Flight-time mats and force-plate displacement are not interchangeable; if PGP standardises on one device, split this benchmark by device.' }),
  bm({ id: 'cmj_f', testId: 'cmj', metric: 'height_cm', sex: 'female',
       direction: 'high', unit: 'cm', method: 'bands',
       bands: { p25: 24, p65: 31, p90: 38 },
       conditions: { armPosition: 'hands_on_hips', device: 'mat_or_plate' },
       protocol: 'PGP v1.0 CMJ: hands on hips, self-selected depth, best of 3, jump mat or force plate.',
       confidence: 'low',
       notes: 'Female combat-athlete field data is scarcer than male data. Treat this set as the weakest in the file and prioritise building PGP internal norms for it.' }),

  bm({ id: 'bj_m', testId: 'broad_jump', metric: 'distance_cm', sex: 'male',
       direction: 'high', unit: 'cm', method: 'bands',
       bands: { p25: 200, p65: 225, p90: 250 },
       protocol: 'PGP v1.0 standing broad jump: two-foot take-off and landing, arm swing permitted, measured to rearmost heel, best of 3.',
       confidence: 'low' }),
  bm({ id: 'bj_f', testId: 'broad_jump', metric: 'distance_cm', sex: 'female',
       direction: 'high', unit: 'cm', method: 'bands',
       bands: { p25: 160, p65: 185, p90: 210 },
       protocol: 'PGP v1.0 standing broad jump: two-foot take-off and landing, arm swing permitted, measured to rearmost heel, best of 3.',
       confidence: 'low' }),

  bm({ id: 'slbj_m', testId: 'sl_broad_jump', metric: 'best_cm', sex: 'male',
       direction: 'high', unit: 'cm', method: 'bands',
       bands: { p25: 145, p65: 165, p90: 185 },
       protocol: 'PGP v1.0 single-leg broad jump: same-leg controlled landing, arm swing permitted, best of 2 per leg, better leg reported.',
       confidence: 'low' }),
  bm({ id: 'slbj_f', testId: 'sl_broad_jump', metric: 'best_cm', sex: 'female',
       direction: 'high', unit: 'cm', method: 'bands',
       bands: { p25: 115, p65: 135, p90: 155 },
       protocol: 'PGP v1.0 single-leg broad jump: same-leg controlled landing, arm swing permitted, best of 2 per leg, better leg reported.',
       confidence: 'low' }),

  /* Mass-specific. A throw with a different ball mass gets NO percentile. */
  bm({ id: 'mb_m_4kg', testId: 'mb_throw', metric: 'best_cm', sex: 'male',
       direction: 'high', unit: 'cm', method: 'bands',
       bands: { p25: 550, p65: 680, p90: 800 },
       conditions: { ballMassKg: 4, footRule: 'feet_fixed_no_step' },
       protocol: 'PGP v1.0 rotational throw: 4 kg ball, side-on, feet fixed on the line, no step, measured to first contact, best of 3 per side.',
       confidence: 'low',
       notes: 'THE WEAKEST BENCHMARK IN THE FILE. Rotational-throw distance is extremely protocol-sensitive and these anchors are a first guess. Recalibrate against PGP internal data after roughly 20 athletes before relying on the percentile.' }),
  bm({ id: 'mb_f_3kg', testId: 'mb_throw', metric: 'best_cm', sex: 'female',
       direction: 'high', unit: 'cm', method: 'bands',
       bands: { p25: 420, p65: 530, p90: 630 },
       conditions: { ballMassKg: 3, footRule: 'feet_fixed_no_step' },
       protocol: 'PGP v1.0 rotational throw: 3 kg ball, side-on, feet fixed on the line, no step, measured to first contact, best of 3 per side.',
       confidence: 'low',
       notes: 'As above — recalibrate early.' }),

  /* ================= SPEED ============================================== */
  bm({ id: 'sp10_m', testId: 'sprint_10m', metric: 'time_10m_s', sex: 'male',
       direction: 'low', unit: 's', method: 'bands',
       bands: { p25: 1.85, p65: 1.78, p90: 1.70 },
       conditions: { timingMethod: 'electronic', startOffsetM: 0.5, startType: 'two_point' },
       protocol: 'PGP v1.0 10 m sprint: electronic gates, standing two-point start 0.5 m behind the first gate, athlete-initiated, best of 3.',
       confidence: 'low',
       notes: 'Electronic timing only. Hand-timed results are recorded but never benchmarked — stopwatch error exceeds the gap between performance levels.' }),
  bm({ id: 'sp10_f', testId: 'sprint_10m', metric: 'time_10m_s', sex: 'female',
       direction: 'low', unit: 's', method: 'bands',
       bands: { p25: 2.05, p65: 1.95, p90: 1.86 },
       conditions: { timingMethod: 'electronic', startOffsetM: 0.5, startType: 'two_point' },
       protocol: 'PGP v1.0 10 m sprint: electronic gates, standing two-point start 0.5 m behind the first gate, athlete-initiated, best of 3.',
       confidence: 'low' }),

  /* ================= STRENGTH =========================================== */
  bm({ id: 'tb_m', testId: 'trapbar', metric: 'rel_1rm', sex: 'male',
       direction: 'high', unit: 'x BW', method: 'bands',
       bands: { p25: 1.60, p65: 2.00, p90: 2.40 },
       conditions: { handleHeight: 'high', estimated: true },
       protocol: 'PGP v1.0 trap-bar deadlift: high handles, 3RM, Epley-estimated 1RM divided by body mass.',
       confidence: 'low',
       notes: 'Includes prediction-equation error as well as test error. Bar mass and handle height differ between bars — record them or the numbers drift.' }),
  bm({ id: 'tb_f', testId: 'trapbar', metric: 'rel_1rm', sex: 'female',
       direction: 'high', unit: 'x BW', method: 'bands',
       bands: { p25: 1.30, p65: 1.60, p90: 1.95 },
       conditions: { handleHeight: 'high', estimated: true },
       protocol: 'PGP v1.0 trap-bar deadlift: high handles, 3RM, Epley-estimated 1RM divided by body mass.',
       confidence: 'low' }),

  /* Chin-ups: body-mass banded, NOT divided by body mass. */
  bm({ id: 'chin_m_light', testId: 'chinup', metric: 'reps', sex: 'male',
       bwBand: BW_BANDS.male[0], direction: 'high', unit: 'reps', method: 'bands',
       bands: { p25: 9, p65: 15, p90: 21 },
       protocol: 'PGP v1.0 strict chin-up: supinated grip, dead hang to full extension, chin clearly above bar, no kipping, first invalid rep ends the test.',
       confidence: 'low' }),
  bm({ id: 'chin_m_middle', testId: 'chinup', metric: 'reps', sex: 'male',
       bwBand: BW_BANDS.male[1], direction: 'high', unit: 'reps', method: 'bands',
       bands: { p25: 8, p65: 14, p90: 19 },
       protocol: 'PGP v1.0 strict chin-up (see protocol page).', confidence: 'low' }),
  bm({ id: 'chin_m_heavy', testId: 'chinup', metric: 'reps', sex: 'male',
       bwBand: BW_BANDS.male[2], direction: 'high', unit: 'reps', method: 'bands',
       bands: { p25: 6, p65: 11, p90: 16 },
       protocol: 'PGP v1.0 strict chin-up (see protocol page).', confidence: 'low',
       notes: 'Banding by body mass exists precisely so that a heavier athlete is not scored as weaker for doing fewer repetitions.' }),
  bm({ id: 'chin_f_light', testId: 'chinup', metric: 'reps', sex: 'female',
       bwBand: BW_BANDS.female[0], direction: 'high', unit: 'reps', method: 'bands',
       bands: { p25: 2, p65: 6, p90: 10 },
       protocol: 'PGP v1.0 strict chin-up (see protocol page).', confidence: 'low' }),
  bm({ id: 'chin_f_heavy', testId: 'chinup', metric: 'reps', sex: 'female',
       bwBand: BW_BANDS.female[1], direction: 'high', unit: 'reps', method: 'bands',
       bands: { p25: 1, p65: 4, p90: 8 },
       protocol: 'PGP v1.0 strict chin-up (see protocol page).', confidence: 'low' }),

  bm({ id: 'wchin_m', testId: 'weighted_chinup', metric: 'rel_system_mass', sex: 'male',
       direction: 'high', unit: 'x BW', method: 'bands',
       bands: { p25: 1.15, p65: 1.30, p90: 1.45 },
       conditions: { loadingMethod: 'belt', estimated: true },
       protocol: 'PGP v1.0 weighted chin-up: dipping belt, 3RM, Epley-estimated 1RM system mass divided by body mass.',
       confidence: 'low',
       notes: '1.30 x body mass means lifting body mass plus 30% of body mass for a single.' }),
  bm({ id: 'wchin_f', testId: 'weighted_chinup', metric: 'rel_system_mass', sex: 'female',
       direction: 'high', unit: 'x BW', method: 'bands',
       bands: { p25: 1.08, p65: 1.20, p90: 1.33 },
       conditions: { loadingMethod: 'belt', estimated: true },
       protocol: 'PGP v1.0 weighted chin-up: dipping belt, 3RM, Epley-estimated 1RM system mass divided by body mass.',
       confidence: 'low' }),

  bm({ id: 'bench_m', testId: 'bench', metric: 'rel_1rm', sex: 'male',
       direction: 'high', unit: 'x BW', method: 'bands',
       bands: { p25: 1.05, p65: 1.30, p90: 1.55 },
       conditions: { estimated: true },
       protocol: 'PGP v1.0 bench press: 3RM, full range, Epley-estimated 1RM divided by body mass.',
       confidence: 'low',
       notes: 'Optional test with the weakest combat-sport rationale in the battery. Down-weighted in the strength category score by default.' }),
  bm({ id: 'bench_f', testId: 'bench', metric: 'rel_1rm', sex: 'female',
       direction: 'high', unit: 'x BW', method: 'bands',
       bands: { p25: 0.65, p65: 0.85, p90: 1.05 },
       conditions: { estimated: true },
       protocol: 'PGP v1.0 bench press: 3RM, full range, Epley-estimated 1RM divided by body mass.',
       confidence: 'low' }),

  /* ================= AEROBIC ============================================ */
  bm({ id: 'aer_m_assault', testId: 'bike_12min', metric: 'w_per_kg', sex: 'male',
       direction: 'high', unit: 'W/kg', method: 'bands',
       bands: { p25: 2.30, p65: 2.90, p90: 3.40 },
       conditions: { machineFamily: 'assault', durationS: 720 },
       protocol: 'PGP v1.0 12-minute air-bike test: continuous 12 min maximal average power, Assault-family air bike, average watts divided by body mass.',
       confidence: 'low',
       notes: 'Machine-family specific. An athlete tested on a Rogue Echo or a Concept2 BikeErg gets NO percentile from this set — different machines produce different power readings for the same effort. This is not a VO2max measure.' }),
  bm({ id: 'aer_f_assault', testId: 'bike_12min', metric: 'w_per_kg', sex: 'female',
       direction: 'high', unit: 'W/kg', method: 'bands',
       bands: { p25: 1.80, p65: 2.25, p90: 2.70 },
       conditions: { machineFamily: 'assault', durationS: 720 },
       protocol: 'PGP v1.0 12-minute air-bike test, Assault-family air bike.',
       confidence: 'low' }),

  /* ================= ANAEROBIC ========================================== */
  bm({ id: 'ana_peak_m_assault', testId: 'bike_30s', metric: 'peak_w_per_kg', sex: 'male',
       direction: 'high', unit: 'W/kg', method: 'bands',
       bands: { p25: 11.0, p65: 13.5, p90: 16.0 },
       conditions: { machineFamily: 'assault', durationS: 30 },
       protocol: 'PGP v1.0 30-second air-bike sprint: rolling start, seated, maximal from the first stroke, Assault-family air bike.',
       confidence: 'low' }),
  bm({ id: 'ana_mean_m_assault', testId: 'bike_30s', metric: 'mean_w_per_kg', sex: 'male',
       direction: 'high', unit: 'W/kg', method: 'bands',
       bands: { p25: 8.0, p65: 9.5, p90: 11.0 },
       conditions: { machineFamily: 'assault', durationS: 30 },
       protocol: 'PGP v1.0 30-second air-bike sprint, Assault-family air bike.',
       confidence: 'low' }),
  bm({ id: 'ana_peak_f_assault', testId: 'bike_30s', metric: 'peak_w_per_kg', sex: 'female',
       direction: 'high', unit: 'W/kg', method: 'bands',
       bands: { p25: 8.5, p65: 10.5, p90: 12.5 },
       conditions: { machineFamily: 'assault', durationS: 30 },
       protocol: 'PGP v1.0 30-second air-bike sprint, Assault-family air bike.',
       confidence: 'low' }),
  bm({ id: 'ana_mean_f_assault', testId: 'bike_30s', metric: 'mean_w_per_kg', sex: 'female',
       direction: 'high', unit: 'W/kg', method: 'bands',
       bands: { p25: 6.0, p65: 7.3, p90: 8.6 },
       conditions: { machineFamily: 'assault', durationS: 30 },
       protocol: 'PGP v1.0 30-second air-bike sprint, Assault-family air bike.',
       confidence: 'low' }),

  /* ================= REPEATED EFFORT ==================================== */
  bm({ id: 'rep_pw_m_assault', testId: 'bike_repeated', metric: 'mean_mean_w_per_kg', sex: 'male',
       direction: 'high', unit: 'W/kg', method: 'bands',
       bands: { p25: 8.5, p65: 10.5, p90: 12.3 },
       conditions: { machineFamily: 'assault', sprints: 6, workS: 15, recoveryS: 45 },
       protocol: 'PGP v1.0 repeated sprint: 6 x 15 s maximal, 45 s active recovery, Assault-family air bike. Mean of the individual sprint average powers, divided by body mass.',
       confidence: 'low',
       notes: 'Configuration-specific. A 5 x 20 s / 60 s variant is a DIFFERENT TEST and gets no percentile from this set.' }),
  bm({ id: 'rep_dec_m_assault', testId: 'bike_repeated', metric: 'decrement_pct', sex: 'male',
       direction: 'low', unit: '%', method: 'bands',
       bands: { p25: 14.0, p65: 10.0, p90: 7.0 },
       conditions: { machineFamily: 'assault', sprints: 6, workS: 15, recoveryS: 45 },
       protocol: 'PGP v1.0 repeated sprint 6 x 15 s / 45 s. Decrement per Fitzsimons et al. (1993).',
       confidence: 'low',
       notes: 'Must always be read next to mean sprint power. A conservatively paced first sprint flatters this score. The app never reports decrement on its own.' }),
  bm({ id: 'rep_pw_f_assault', testId: 'bike_repeated', metric: 'mean_mean_w_per_kg', sex: 'female',
       direction: 'high', unit: 'W/kg', method: 'bands',
       bands: { p25: 6.3, p65: 7.8, p90: 9.2 },
       conditions: { machineFamily: 'assault', sprints: 6, workS: 15, recoveryS: 45 },
       protocol: 'PGP v1.0 repeated sprint: 6 x 15 s maximal, 45 s active recovery, Assault-family air bike.',
       confidence: 'low' }),
  bm({ id: 'rep_dec_f_assault', testId: 'bike_repeated', metric: 'decrement_pct', sex: 'female',
       direction: 'low', unit: '%', method: 'bands',
       bands: { p25: 14.0, p65: 10.0, p90: 7.0 },
       conditions: { machineFamily: 'assault', sprints: 6, workS: 15, recoveryS: 45 },
       protocol: 'PGP v1.0 repeated sprint 6 x 15 s / 45 s. Decrement per Fitzsimons et al. (1993).',
       confidence: 'low',
       notes: 'Currently uses the same anchors as the male set — there is no basis for differentiating them yet. Split them as soon as PGP data allows.' }),

  /* ================= MOVEMENT =========================================== */
  /* Deliberately NOT a percentile benchmark. The engine treats method
     'criterion' as: score against a fixed criterion, report a band, and do
     NOT claim a population percentile. */
  bm({ id: 'mov_criterion', testId: 'movement_screen', metric: 'score_pct', sex: 'any',
       direction: 'high', unit: '% of max', method: 'criterion',
       bands: { p25: 60, p65: 80, p90: 92 },
       protocol: 'PGP v1.0 movement observation screen: 12 items, 0-2 anchored scale, scored before the warm-up, items not assessed excluded from the denominator.',
       confidence: 'low',
       source: {
         citation: 'PGP CRITERION SCORE — not a population percentile',
         verified: false,
         note: 'This is the proportion of the achievable score the athlete was observed to reach, expressed in the same four bands for readability. It is NOT a percentile against other athletes, because no defensible reference population exists for a subjective screen. Inter-rater reliability of movement screens is poor to moderate, and their value as injury-prediction tools is weak in the published literature.'
       },
       notes: 'Excluded from the composite index by default. Excluded from the top-3 strengths and priorities lists unless nothing better is available.' })
  ];

  /* ======================================================================
     LITERATURE_QUEUE
     ----------------------------------------------------------------------
     The reading list for replacing PGP_PROVISIONAL sets with PUBLISHED ones.

     THESE ARE CITATION HANDLES, NOT EXTRACTED DATA. Each entry names a
     source that is likely to contain usable descriptive statistics for
     combat athletes. No mean, SD or percentile from any of them has been
     entered into this app, because entering numbers from memory rather than
     from the paper is exactly how a testing product becomes indefensible.

     WORKFLOW for each entry:
       1. Obtain the full text and confirm the citation is correct.
       2. Check the protocol actually matches the PGP protocol (device, arm
          position, start distance, rep scheme, machine). If it does not,
          do not use it — or add it as a separate benchmark with its own
          protocol string and matching conditions.
       3. Record sample size, sex, age, competitive level, sport.
       4. Add a benchmark with method 'normal' and { mean, sd }, or method
          'percentiles' if the source publishes them.
       5. Set referenceType 'PUBLISHED', source.verified true, and set
          confidence from sample size, protocol match and population match.
     ====================================================================== */
  var LITERATURE_QUEUE = [
    { topic: 'MMA physical qualities — systematic review',
      handle: 'James LP, Haff GG, Kelly VG, Beckman EM. Towards a determination of the physiological characteristics distinguishing successful mixed martial arts athletes. Sports Medicine (2016).',
      lookFor: 'Pooled descriptive statistics for jump, strength and aerobic measures; and which qualities did and did not separate competitive levels.',
      status: 'to verify' },
    { topic: 'MMA — higher vs lower competitive level',
      handle: 'James LP, et al. Physical qualities of higher- versus lower-level mixed martial arts competitors.',
      lookFor: 'CMJ height, relative lower-body strength, and whether differences between levels exceeded measurement error.',
      status: 'to verify' },
    { topic: 'Amateur boxing physiological profile',
      handle: 'Chaabene H, et al. Amateur boxing: physical and physiological attributes. Sports Medicine (2015).',
      lookFor: 'Anthropometry, upper-body power, aerobic measures, and by weight category where reported.',
      status: 'to verify' },
    { topic: 'Muay Thai / kickboxing S&C',
      handle: 'Turner AN. Strength and conditioning for Muay Thai athletes. Strength and Conditioning Journal (2009/2011).',
      lookFor: 'Reported test values and testing recommendations for Muay Thai specifically.',
      status: 'to verify' },
    { topic: 'MMA S&C considerations',
      handle: 'La Bounty P, Campbell BI, Galvan E, Cooke M, Antonio J. Strength and conditioning considerations for mixed martial arts. Strength and Conditioning Journal (2011).',
      lookFor: 'Testing battery recommendations for MMA.',
      status: 'to verify' },
    { topic: 'Repeated-sprint decrement methodology',
      handle: 'Fitzsimons M, Dawson B, Ward D, Wilkinson A. Cycling and running tests of repeated sprint ability. Australian Journal of Science and Medicine in Sport (1993).',
      lookFor: 'The decrement formula itself — ALREADY IMPLEMENTED in calc.calculatePerformanceDecrement(). Confirm the citation before printing it on a report.',
      status: 'formula implemented, citation to confirm' },
    { topic: 'Reliability, typical error and smallest worthwhile change',
      handle: 'Hopkins WG. Measures of reliability in sports medicine and science. Sports Medicine (2000).',
      lookFor: 'The typical-error and SWC framework — ALREADY IMPLEMENTED in calc.calculateMeaningfulChange(). The CV values in tests.js are PGP placeholders, not from this source.',
      status: 'method implemented, values still placeholders' },
    { topic: 'CMJ peak power regression',
      handle: 'Sayers SP, Harackiewicz DV, Harman EA, Frykman PN, Rosenstein MT. Cross-validation of three jump power equations. Medicine and Science in Sports and Exercise (1999).',
      lookFor: 'The peak-power equation — IMPLEMENTED in calc.estimateCMJPeakPower(), shown as an optional estimate only, derived in college athletes rather than combat athletes.',
      status: 'formula implemented, population mismatch noted' },
    { topic: '1RM prediction equations',
      handle: 'Epley B. Poundage chart (1985). / Brzycki M. Strength testing: predicting a 1RM from a reps-to-fatigue. JOPERD (1993).',
      lookFor: 'Both implemented in calc.estimateOneRepMax(). Prediction error rises with repetitions — the app refuses to estimate above 12 reps.',
      status: 'formulas implemented' },
    { topic: 'Inter-limb asymmetry',
      handle: 'Bishop C, Turner A, Read P. Effects of inter-limb asymmetries on physical and sports performance: a systematic review. Journal of Sports Sciences (2018).',
      lookFor: 'Whether any asymmetry threshold is defensible, and how task-dependent asymmetry is. The app currently reports asymmetry as an observation with an editable flag and makes no injury claim — check whether that remains the right call.',
      status: 'to verify' },
    { topic: 'Movement screens and injury prediction',
      handle: 'Bahr R. Why screening tests to predict injury do not work. British Journal of Sports Medicine (2016).',
      lookFor: 'The argument for why the movement screen in this app is presented as coach observation and never as injury risk.',
      status: 'position adopted, citation to confirm' },
    { topic: 'Air-bike power output reliability and cross-machine comparability',
      handle: 'No suitable source located. This is a genuine gap.',
      lookFor: 'Any peer-reviewed reliability data for Assault/Echo-type fan bikes. Until it exists, all bike benchmarks stay provisional and machine-family specific, and PGP should run its own reliability study: 2 trials, separate days, same machine, >=10 athletes.',
      status: 'GAP — PGP reliability study required' }
  ];

  /* Convenience index. */
  var byTest = {};
  BENCHMARKS.forEach(function (b) {
    (byTest[b.testId] = byTest[b.testId] || []).push(b);
  });

  var API = {
    BENCHMARKS: BENCHMARKS,
    LITERATURE_QUEUE: LITERATURE_QUEUE,
    BW_BANDS: BW_BANDS,
    forTest: function (testId) { return byTest[testId] || []; },
    byId: function (id) {
      for (var i = 0; i < BENCHMARKS.length; i++) if (BENCHMARKS[i].id === id) return BENCHMARKS[i];
      return null;
    },
    bwBandFor: function (sex, massKg) {
      var bands = BW_BANDS[sex] || [];
      for (var i = 0; i < bands.length; i++) {
        if (massKg > bands[i].min && massKg <= bands[i].max) return bands[i];
      }
      return null;
    },
    counts: function () {
      var c = { PUBLISHED: 0, PGP_PROVISIONAL: 0, PGP_INTERNAL: 0 };
      BENCHMARKS.forEach(function (b) { c[b.referenceType] = (c[b.referenceType] || 0) + 1; });
      return c;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.PGP = root.PGP || {};
  root.PGP.Benchmarks = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
