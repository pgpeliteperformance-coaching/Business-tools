/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/config/settings.js — DEFAULT SETTINGS, WEIGHTS, THRESHOLDS, COPY
   --------------------------------------------------------------------------
   Everything in DEFAULTS is editable from the Settings page at runtime and
   is persisted with the athlete database. This file supplies the defaults
   and documents WHY each default was chosen.
   ========================================================================== */
(function (root) {
  'use strict';

  /* ----------------------------------------------------------------------
     PROTOCOL VERSION
     Bump this whenever a change makes results non-comparable with earlier
     data: bike model or protocol, sprint distance/recovery, CMJ device or
     arm position, strength rep scheme, or the scoring methodology itself.
     Every saved session stamps the version in use. The retest engine refuses
     to compare results across different protocol versions for the same test
     unless the coach explicitly overrides it.
     ---------------------------------------------------------------------- */
  var PROTOCOL_VERSION = 'PGP v1.0';
  var PROTOCOL_VERSION_NOTES = {
    'PGP v1.0': {
      released: '2026-09-19',
      summary: 'First release. Battery: CMJ, broad jump, single-leg broad jump, 4/3 kg rotational throw, 10 m sprint (electronic), trap-bar 3RM, strict chin-up, optional weighted chin-up, optional bench 3RM, 12-min air-bike, 30-s air-bike, 6 x 15 s / 45 s repeated sprint, 12-item movement observation screen. Scoring: percentile via z-score averaging, four performance levels, no overall score by default.',
      changes: []
    }
  };

  var DEFAULTS = {

    /* ---------------- PERFORMANCE LEVELS -------------------------------
       Four levels, defined by percentile boundaries. These describe
       PHYSICAL PERFORMANCE RELATIVE TO THE REFERENCE POPULATION ONLY.
       They say nothing about fighting ability, technical skill, fight IQ,
       likelihood of winning, or professional status.
       ------------------------------------------------------------------ */
    levels: [
      { id: 'developing',       name: 'DEVELOPING',       min: 0,  max: 25,
        desc: 'Lower relative performance in this quality. A clear opportunity for physical development.' },
      { id: 'trained',          name: 'TRAINED',          min: 25, max: 65,
        desc: 'Established physical preparation in this quality.' },
      { id: 'advanced',         name: 'ADVANCED',         min: 65, max: 90,
        desc: 'High level of physical performance in this quality.' },
      { id: 'high_performance', name: 'HIGH PERFORMANCE', min: 90, max: 100,
        desc: 'Exceptional relative performance in this quality.' }
    ],

    /* ---------------- SCORING METHODOLOGY ------------------------------
       CATEGORY SCORES are computed by:
         1. converting every available test percentile in the category to a
            z-score (probit), so that percentiles derived by different
            methods sit on a common linear scale,
         2. taking the WEIGHTED MEAN of those z-scores,
         3. converting the mean z back to a percentile.

       Averaging z-scores rather than percentiles matters: percentiles are
       not linear, so a plain mean of percentiles distorts the result at the
       extremes. The method, the weights and the contributing tests are all
       printed on the report so the number can be reproduced by hand.

       WEIGHTS default to equal within a category. The two exceptions are
       documented inline below and both are editable.
       ------------------------------------------------------------------ */
    scoring: {
      method: 'mean_z',
      weights: {
        /* POWER — equal weighting across the three power expressions. */
        'cmj.height_cm': 1,
        'broad_jump.distance_m': 1,
        'sl_broad_jump.best_m': 1,

        /* SPEED — single test. */
        'sprint_10m.time_10m_s': 1,

        /* STRENGTH — lower-body and relative upper-body pulling carry full
           weight. Bench press is weighted 0.5 because it has the weakest
           combat-sport rationale in the battery; weighted chin-up is 0.5
           because it overlaps with the bodyweight chin-up and would
           otherwise double-count upper-body pulling. */
        'trapbar.rel_1rm': 1,
        'chinup.reps': 1,
        'weighted_chinup.rel_system_mass': 0.5,
        'bench.rel_1rm': 0.5,

        /* AEROBIC — single test. */
        'bike_12min.w_per_kg': 1,

        /* ANAEROBIC — peak and mean power weighted equally: peak indexes
           maximum power, mean indexes power sustained across the effort. */
        'bike_30s.peak_w_per_kg': 1,
        'bike_30s.mean_w_per_kg': 1,

        /* REPEATED EFFORT — 70/30 in favour of HOW MUCH power is produced
           over HOW FLAT the curve is. An athlete who paces sprint 1 gets a
           flattering loss-of-watts figure with a poor average; weighting the
           amount of power higher stops that from reading as a good result. */
        'bike_repeated.mean_peak_w_per_kg': 0.7,
        'bike_repeated.decrement_pct': 0.3
      },

      /* A category score is reported only if at least this many benchmarked
         metrics in it produced a result. Below that, the category shows
         "Insufficient data" rather than a score built on one test. */
      minMetricsPerCategory: { power: 2, speed: 1, strength: 1, aerobic: 1,
                               anaerobic: 1, repeated: 1 },

      /* Band-derived percentiles are displayed rounded to this step, to
         avoid implying the system can distinguish 79th from 80th
         percentile. It cannot. */
      bandDisplayRounding: 5,
      /* Percentiles from a normal or empirical model are rounded to this. */
      modelDisplayRounding: 1,

      /* ---- OVERALL / COMPOSITE SCORE ---------------------------------
         OFF BY DEFAULT, AND THAT IS THE RECOMMENDATION.
         Averaging power, strength, aerobic and repeated-effort percentiles
         into a single number implies the qualities are interchangeable and
         equally important, which is not defensible and is not how any of
         these results should be acted on. Two athletes with the same
         composite can need opposite training. The PROFILE is the product.
         If it is switched on, the report labels it explicitly as a
         convenience index with no validation behind it.
         ---------------------------------------------------------------- */
      compositeEnabled: false,
      compositeExcludes: [],
      compositeLabel: 'Composite Physical Preparation Index (unvalidated)'
    },

    /* ---------------- REFERENCE SOURCE PRIORITY ------------------------
       Matching order is fixed in engine.js: same test > same protocol
       conditions > same sex > age range > body-mass band where relevant >
       population > competitive level. This controls which TYPE of reference
       wins when more than one matches.
       ------------------------------------------------------------------ */
    reference: {
      priority: ['PGP_INTERNAL', 'PUBLISHED', 'PGP_PROVISIONAL'],

      /* PGP internal norms.
         n >= internalMinN      -> computed and shown as a SUPPLEMENTARY
                                   comparison alongside the primary set
         n >= internalPrimaryN  -> used as the PRIMARY reference
         n >= internalMatureN   -> the "preliminary" caveat is dropped
         Rationale: below about 20 matched athletes a percentile is mostly
         noise; 50 is the point at which a decile is meaningful to within a
         few percentiles; 100+ is where the tails start to behave. These are
         judgement calls and are editable. */
      internalMinN: 20,
      internalPrimaryN: 50,
      internalMatureN: 100,

      /* Age window (years either side) for matching an athlete to a
         reference set whose age range does not cover them exactly. */
      ageTolerance: 3,

      /* If true, an athlete outside every reference age range gets
         "Insufficient reference data" rather than the nearest set. */
      strictAgeMatching: false
    },

    /* ---------------- STRENGTHS & PRIORITIES ---------------------------
       Selection is NOT simply "highest and lowest numbers". A metric must
       clear a distance from the 50th percentile before it is called a
       strength or a priority at all, and low-reliability or
       criterion-scored tests are held back unless nothing better exists.
       ------------------------------------------------------------------ */
    profiling: {
      strengthMinPercentile: 60,
      priorityMaxPercentile: 45,
      maxItems: 3,
      /* Tests whose evidence.testReliability is in this list are only used
         to fill a strengths/priorities slot if no higher-reliability item
         is available. */
      deprioritiseReliability: ['low'],
      /* A metric flagged by the validator as needing verification is never
         used in strengths or priorities. */
      excludeFlagged: true
    },

    /* ---------------- ASYMMETRY ---------------------------------------
       A PERFORMANCE DIFFERENCE, not an injury risk score. The threshold
       below is a commonly used rule of thumb, not a validated cut-off, and
       is editable. Evidence linking a specific asymmetry threshold to
       injury is inconsistent and task-dependent, and some asymmetry is
       expected in combat athletes because of stance.
       ------------------------------------------------------------------ */
    asymmetry: {
      noteThresholdPct: 10,
      label: 'Noted difference between sides',
      disclaimer: 'Reported as a difference in performance between sides. This is not an injury-risk score and is not a medical finding. Some difference between sides is normal, particularly in combat athletes, where stance produces a habitual lead and rear side.'
    },


    /* ---------------- RETEST ------------------------------------------ */
    retest: {
      /* Default retest interval used to pre-fill retest targets. */
      defaultWeeks: 12,
      /* Default target improvement expressed as a multiple of the metric's
         MDC95, so that a target is always at least a detectable change.
         1.0 = "improve by more than measurement error". */
      targetMdcMultiple: 1.0,
      requireSameProtocolVersion: true,
      requireSameEquipment: true
    },

    /* ---------------- VALIDATION -------------------------------------- */
    validation: {
      /* Body mass and height sanity limits for an adult athlete. Values
         outside these are FLAGGED for verification, never auto-corrected
         and never rejected outright — a 45 kg athlete is unusual but
         possible. */
      bodyMassKg: [35, 180],
      heightCm: [130, 220],
      ageYears: [12, 70],
      /* Under this age the app shows a youth-athlete caution: adult
         reference sets do not apply. */
      youthAgeCutoff: 18
    },

    /* ---------------- TESTING DAY ------------------------------------- */
    testingDay: {
      /* Minutes per athlete, for the schedule estimator. Includes the rest
         periods written into each protocol. */
      durations: {
        registration: 4, readiness: 2, anthropometry: 3, warmup: 12,
        cmj: 4, broad_jump: 4, sl_broad_jump: 6,
        sprint_10m: 8, trapbar: 14, chinup: 4, weighted_chinup: 8,
        bench: 12, bike_12min: 20, bike_30s: 12, bike_repeated: 16,
        recovery_gap: 30, debrief: 5
      },
      /* How many athletes can be processed in parallel per station. */
      defaultStations: 1
    },

    units: { mass: 'kg', length: 'cm', distance: 'cm', power: 'W' },

    branding: {
      product: 'PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT',
      company: 'PGP Elite Performance',
      tagline: 'TEST. BENCHMARK. IDENTIFY. TRAIN. RETEST.'
    }
  };

  /* ======================================================================
     EQUIPMENT OPTIONS
     Recorded on every session so that equipment differences can be analysed
     later, and so the engine can refuse to benchmark against a reference
     set built on different equipment.
     ====================================================================== */
  var EQUIPMENT = {
    jumpDevice: [
      { id: 'unknown', label: 'Not recorded' },
      { id: 'force_plate', label: 'Force plate' },
      { id: 'jump_mat', label: 'Jump / contact mat' },
      { id: 'optical', label: 'Optical (e.g. gate-based jump system)' },
      { id: 'phone_app', label: 'Phone app (flight time)' },
      { id: 'vertec', label: 'Vertec / reach-based' },
      { id: 'tape', label: 'Wall mark and tape' }
    ],
    timingDevice: [
      { id: 'unknown', label: 'Not recorded' },
      { id: 'gates_dual_beam', label: 'Dual-beam timing gates' },
      { id: 'gates_single_beam', label: 'Single-beam timing gates' },
      { id: 'laser', label: 'Laser / radar' },
      { id: 'app', label: 'Phone / tablet app' },
      { id: 'handheld', label: 'Handheld stopwatch (NOT benchmarked)' }
    ],
    timingMethod: [
      { id: 'electronic', label: 'Electronic' },
      { id: 'hand', label: 'Hand timed (not benchmarked)' }
    ],
    airBike: [
      { id: 'unknown', label: 'Not recorded' },
      { id: 'assault_classic', label: 'Assault AirBike Classic', family: 'assault' },
      { id: 'assault_elite', label: 'Assault AirBike Elite', family: 'assault' },
      { id: 'assault_pro', label: 'Assault AirBike Pro', family: 'assault' },
      { id: 'rogue_echo', label: 'Rogue Echo Bike', family: 'echo' },
      { id: 'concept2_bikeerg', label: 'Concept2 BikeErg', family: 'bikeerg' },
      { id: 'schwinn_airdyne', label: 'Schwinn Airdyne', family: 'airdyne' },
      { id: 'other', label: 'Other / unlisted', family: 'other' }
    ],
      trapBar: [
      { id: 'unknown', label: 'Not recorded' },
      { id: 'standard_25', label: 'Standard hex bar (~25 kg)' },
      { id: 'open_25', label: 'Open trap bar (~25 kg)' },
      { id: 'competition_32', label: 'Heavy / competition trap bar (~32 kg)' },
      { id: 'other', label: 'Other — record mass in notes' }
    ],
    bench: [
      { id: 'unknown', label: 'Not recorded' },
      { id: 'flat_standard', label: 'Flat bench, standard 20 kg bar' },
      { id: 'flat_other_bar', label: 'Flat bench, other bar — record mass' },
      { id: 'smith', label: 'Smith machine (NOT comparable — do not benchmark)' }
    ],
    pullUpBar: [
      { id: 'unknown', label: 'Not recorded' },
      { id: 'straight_fixed', label: 'Straight fixed bar' },
      { id: 'rig', label: 'Rig / squat-rack bar' },
      { id: 'rings_or_handles', label: 'Rings or rotating handles (NOT comparable)' }
    ]
  };

  /* Map an air-bike model id to its family, for benchmark matching. */
  function bikeFamily(modelId) {
    for (var i = 0; i < EQUIPMENT.airBike.length; i++) {
      if (EQUIPMENT.airBike[i].id === modelId) return EQUIPMENT.airBike[i].family || null;
    }
    return null;
  }

  /* ======================================================================
     PRE-TEST READINESS CHECKLIST
     A screening tool for deciding whether a test should go ahead, be
     modified, or be skipped. It does NOT diagnose anything and does NOT
     constitute medical clearance.
     ====================================================================== */
  var READINESS = {
    disclaimer: 'This checklist is used to decide whether a physical test should proceed, be modified, or be recorded as NOT TESTED. It is not a medical assessment, it does not diagnose anything, and it does not provide medical clearance. If an athlete reports pain, a current injury, illness or a medical restriction, the appropriate action is referral to a qualified medical professional — not interpretation by the testing coach.',
    items: [
      { key: 'injury',      label: 'Any current injury or area of pain?',                     flagIfYes: true },
      { key: 'illness',     label: 'Any current illness, infection or fever?',                flagIfYes: true },
      { key: 'fatigue',     label: 'Unusual fatigue, poor sleep or heavy soreness?',          flagIfYes: true },
      { key: 'sparring',    label: 'Hard sparring within the last 48 hours?',                 flagIfYes: true },
      { key: 'competition', label: 'Competition or weight cut within the last 7 days?',       flagIfYes: true },
      { key: 'medical',     label: 'Any medical restriction on maximal exercise?',            flagIfYes: true },
      { key: 'warmup_pain', label: 'Any pain during the warm-up?',                            flagIfYes: true },
      { key: 'caffeine',    label: 'Caffeine consumed today? (record amount and timing)',     flagIfYes: false, documentOnly: true },
      { key: 'food',        label: 'Last main meal more than 2 hours ago?',                    flagIfYes: false, documentOnly: true },
      { key: 'familiarised',label: 'Has the athlete performed this battery before?',           flagIfYes: false, documentOnly: true }
    ],
    flagMessage: 'TEST MODIFICATION / RESTRICTION REQUIRED — review with the athlete before proceeding. Record any test not performed as NOT TESTED with the reason. Do not interpret this as a diagnosis and do not provide medical clearance.'
  };

  /* Reasons a test may be recorded as NOT TESTED. Missing data is never
     treated as a score of zero and never counts against the athlete. */
  var NOT_TESTED_REASONS = [
    { id: 'facility',   label: 'Facility / space unavailable' },
    { id: 'equipment',  label: 'Equipment unavailable' },
    { id: 'technique',  label: 'Insufficient technical competency to test safely' },
    { id: 'injury',     label: 'Injury or pain' },
    { id: 'illness',    label: 'Illness' },
    { id: 'readiness',  label: 'Readiness flag — test restricted' },
    { id: 'time',       label: 'Ran out of time on the testing day' },
    { id: 'declined',   label: 'Athlete declined' },
    { id: 'incomplete', label: 'Started but not completed — partial result not benchmarked' },
    { id: 'other',      label: 'Other — see notes' }
  ];

  /* ======================================================================
     TRAINING RECOMMENDATION LIBRARY
     Rule-triggered, general strength & conditioning guidance. Editable.
     These are coaching prompts for a qualified S&C coach, not prescriptions,
     not medical advice, and they make no claim that improving a test result
     will improve competitive performance.
     ====================================================================== */
  var RECOMMENDATIONS = {
    disclaimer: 'General strength and conditioning guidance generated from the measured profile. It is not medical advice and not a prescription. It assumes a qualified coach will integrate it with the athlete\'s combat-sport training load, competition calendar and individual history. Improving a physical test result does not automatically improve competitive performance.',
    byCategory: {
      power: {
        low:  ['Prioritise explosive-strength development: low-volume, high-intent jumping and throwing at the start of sessions while fresh.',
               'Add loaded jumps or weightlifting derivatives (mid-thigh pull, jump shrug) if technique allows, keeping sets short and quality high.',
               'Protect intent: place power work before conditioning, never after.'],
        mid:  ['Maintain power work at 1-2 exposures per week with high intent and low volume.',
               'Vary the direction of force: include horizontal and rotational expressions, not vertical jumping alone.'],
        high: ['Maintain rather than chase. Keep 1-2 short, high-intent exposures per week and spend the development time elsewhere.']
      },
      speed: {
        low:  ['Include short maximal accelerations (10-20 m) at the start of sessions, fully recovered, 4-8 efforts.',
               'Address acceleration mechanics before adding volume; quality over quantity.',
               'Ensure sprint work is genuinely maximal and fully rested — sub-maximal running trains something else.'],
        mid:  ['Maintain 1 weekly exposure of short maximal accelerations, fully recovered.'],
        high: ['Maintain with a small weekly dose. Re-check that the timing method has not changed before reading anything into future changes.']
      },
      strength: {
        low:  ['Prioritise progressive resistance training: 2-3 sessions per week built on a small number of compound patterns.',
               'Build technical competency under load first — this athlete will gain more from consistent exposure than from any specific loading scheme.',
               'Track load lifted over weeks; expect the fastest gains here of any quality in the profile.'],
        mid:  ['Continue progressive overload on the main patterns, 2 sessions per week.',
               'Aim to raise relative strength — strength per kilogram of body mass — rather than absolute load alone, given weight-class considerations.'],
        high: ['Maintain strength with reduced volume and reallocate training time to the lower-scoring qualities in this profile.']
      },
      aerobic: {
        low:  ['Increase aerobic development through low-to-moderate intensity conditioning, accounting for the volume already coming from combat-sport training.',
               'Prefer non-impact modalities (bike, row, ski) to add aerobic work without adding joint or CNS load on top of sparring.',
               'Build frequency before intensity: consistent easy work will move this number more than more hard sessions.'],
        mid:  ['Maintain aerobic work with 1-2 low-to-moderate intensity sessions per week alongside sport training.'],
        high: ['Maintain. Further aerobic development is unlikely to be the best use of this athlete\'s available training time.']
      },
      anaerobic: {
        low:  ['Include short maximal efforts (10-30 s) with full recovery to develop maximal power output.',
               'Keep the work maximal: if the athlete can pace it, the effort or the recovery is wrong.',
               'Place this work early in the session and away from hard sparring days.'],
        mid:  ['Maintain with 1 weekly exposure of short maximal efforts with full recovery.'],
        high: ['Maintain. Watch that high anaerobic power alongside a low aerobic or repeated-effort score is not being relied on to carry later rounds.']
      },
      repeated: {
        low:  ['Target repeated-effort conditioning with incomplete recovery, structured around the athlete\'s combat-sport training load rather than added on top of it.',
               'Progress by shortening recovery or adding efforts — not by making each effort longer.',
               'Check the aerobic score: repeated-effort capacity is underpinned by aerobic fitness, and a low aerobic score usually needs addressing first.'],
        mid:  ['Maintain 1 weekly repeated-effort exposure, monitoring how it interacts with sparring load.'],
        high: ['Maintain. This is a competitive strength of the profile.']
      }
    },
    /* Cross-category rules: patterns that only show up when two scores are
       read together. */
    crossRules: [
      { id: 'ana_high_aer_low',
        when: { high: 'anaerobic', low: 'aerobic' },
        text: 'High anaerobic power alongside lower aerobic capacity: this athlete can produce power but may be relying on it. Developing aerobic capacity is likely to improve the ability to repeat that power across a full contest without needing to raise peak power further.' },
      { id: 'rep_low_aer_low',
        when: { low: 'repeated', alsoLow: 'aerobic' },
        text: 'Repeated-effort capacity and aerobic capacity are both low. Address aerobic development first — repeated-effort work layered on a limited aerobic base tends to produce fatigue rather than adaptation.' },
      { id: 'str_low_pow_low',
        when: { low: 'strength', alsoLow: 'power' },
        text: 'Strength and power are both low. Prioritise strength: for an athlete at this level of preparation, raising force capacity is usually the faster route to improved power expression than power work alone.' },
      { id: 'str_high_pow_low',
        when: { high: 'strength', low: 'power' },
        text: 'Strength is developed but power expression is lower. The training emphasis can shift towards rate of force development — high-intent, low-volume ballistic work — rather than further maximal-strength accumulation.' }
    ]
  };

  /* ======================================================================
     REPORT LANGUAGE
     Controlled phrasing for the athlete report. Written to describe measured
     physical performance and nothing else.
     ====================================================================== */
  var REPORT_COPY = {
    intro: 'Your current physical performance profile indicates the following, relative to the selected reference population and the protocol recorded for each test.',
    strengthsIntro: 'Your strongest measured qualities were:',
    prioritiesIntro: 'Your current development priorities are:',
    noStrengths: 'No measured quality stood clearly above the reference population in this assessment. This is a baseline profile to develop from, not a negative finding.',
    noPriorities: 'No measured quality stood clearly below the reference population in this assessment.',
    levelCaveat: 'Performance levels describe measured physical performance relative to a reference population. They do not describe fighting ability, technical ability, fight IQ, likelihood of winning, or professional status.',
    disclaimer: 'This assessment measures and benchmarks physical performance qualities. It does not diagnose injury, does not assess injury risk, does not predict fighting ability, and does not rank athletes against one another as competitors. It is not a medical assessment and provides no medical clearance. Reference standards are population-specific and protocol-specific: results are only comparable when the test, the protocol and the equipment match.',
    provisionalNotice: 'Some benchmarks used in this report are PGP PROVISIONAL STANDARDS. They are coaching-judgement reference points, not published scientific norms, and they will be revised as the PGP athlete database grows. Percentiles derived from provisional standards are shown rounded to the nearest 5 to avoid implying more precision than the data supports.',
    insufficient: 'Insufficient reference data — no matched reference set exists for this test, protocol, sex and age combination. No percentile is reported. This is deliberate: a fabricated percentile is worse than no percentile.'
  };

  var API = {
    PROTOCOL_VERSION: PROTOCOL_VERSION,
    PROTOCOL_VERSION_NOTES: PROTOCOL_VERSION_NOTES,
    DEFAULTS: DEFAULTS,
    EQUIPMENT: EQUIPMENT,
    READINESS: READINESS,
    NOT_TESTED_REASONS: NOT_TESTED_REASONS,
    RECOMMENDATIONS: RECOMMENDATIONS,
    REPORT_COPY: REPORT_COPY,
    bikeFamily: bikeFamily,
    /* Deep clone, so the runtime settings object never mutates the defaults. */
    cloneDefaults: function () { return JSON.parse(JSON.stringify(DEFAULTS)); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.PGP = root.PGP || {};
  root.PGP.Settings = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
