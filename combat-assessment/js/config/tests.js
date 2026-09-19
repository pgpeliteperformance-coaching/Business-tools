/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/config/tests.js — TEST BATTERY DEFINITION  (protocol PGP v1.0)
   --------------------------------------------------------------------------
   This file is the single source of truth for:
     * which tests exist, and in which category
     * which metric of each test is benchmarked (the "primary" metric)
     * units, decimal places and whether higher or lower is better
     * plausibility ranges used by the validator
     * reliability estimates used for meaningful-change decisions
     * the evidence appraisal shown on the Benchmarks and Protocol pages
     * the full written protocol for every test

   EDITING THIS FILE IS SAFE AND EXPECTED. If you change a protocol in a way
   that makes results non-comparable (bike model, sprint distance, recovery
   period, rep scheme, jump measurement device), bump the protocol version in
   js/config/settings.js so that old and new data are not silently pooled.

   RELIABILITY VALUES
   ------------------
   Where `verified: false` the CV% is a PGP PLACEHOLDER chosen to be
   conservative for the movement class. It is NOT a published value and must
   not be cited as one. Replace it with PGP's own test-retest data (two trials
   on separate days, >=10 athletes, same tester, same equipment) as soon as
   that data exists. The app labels every conclusion drawn from a placeholder.
   ========================================================================== */
(function (root) {
  'use strict';

  /* ---- category definitions ------------------------------------------- */
  var CATEGORIES = [
    { id: 'power',     name: 'Power',            short: 'POW', order: 1,
      blurb: 'Ability to express force rapidly in vertical, horizontal and rotational directions.' },
    { id: 'speed',     name: 'Speed',            short: 'SPD', order: 2,
      blurb: 'Short-distance acceleration ability.' },
    { id: 'strength',  name: 'Strength',         short: 'STR', order: 3,
      blurb: 'Maximal and relative force production in the lower and upper body.' },
    { id: 'aerobic',   name: 'Aerobic Capacity', short: 'AER', order: 4,
      blurb: 'Sustained power output over a prolonged continuous effort.' },
    { id: 'anaerobic', name: 'Anaerobic Power',  short: 'ANA', order: 5,
      blurb: 'Maximal power output over a single short all-out effort.' },
    { id: 'repeated',  name: 'Repeated Effort',  short: 'REP', order: 6,
      blurb: 'Ability to produce and re-produce high power outputs with limited recovery.' },
    { id: 'movement',  name: 'Movement',         short: 'MOV', order: 7,
      blurb: 'Coach-observed range of motion and movement control. Observation data, not a percentile against a population, and not a medical assessment.' }
  ];

  /* ---- shared reliability placeholder factory -------------------------- */
  function placeholderCV(cv, note) {
    return { cvPct: cv, verified: false,
             source: 'PGP PLACEHOLDER (conservative estimate for movement class)',
             note: note || '' };
  }

  /* ====================================================================== */
  var TESTS = [

  /* ------------------------- 1. COUNTERMOVEMENT JUMP ------------------- */
  {
    id: 'cmj', name: 'Countermovement Jump', shortName: 'CMJ',
    category: 'power', order: 10, optional: false,
    equipmentKey: 'jumpDevice',
    metrics: [
      { key: 'height_cm', label: 'Jump height', unit: 'cm', dp: 1, direction: 'high',
        role: 'primary', benchmarked: true, range: [10, 90], hardRange: [0, 120] },
      { key: 'flight_time_s', label: 'Flight time', unit: 's', dp: 3, direction: 'high',
        role: 'secondary', benchmarked: false, range: [0.25, 0.85], hardRange: [0, 1.2] },
      { key: 'contact_time_s', label: 'Contact / ground time', unit: 's', dp: 3, direction: 'low',
        role: 'secondary', benchmarked: false, range: [0.15, 1.2], hardRange: [0, 3] },
      { key: 'rsi_mod', label: 'RSI-modified', unit: 'm/s', dp: 2, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [0.1, 1.2], hardRange: [0, 3] },
      { key: 'peak_power_w', label: 'Estimated peak power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [1000, 8000], hardRange: [0, 15000] }
    ],
    attempts: 3, attemptDirection: 'high', attemptMetric: 'height_cm',
    reliability: { height_cm: placeholderCV(4.0, 'Jump height is among the most reliable field tests when device and technique are standardised.') },
    evidence: {
      testReliability: 'high',
      whatItMeasures: 'Lower-body concentric power expressed vertically, with a stretch-shortening cycle contribution.',
      whyRelevant: 'Vertical jump performance is a general index of lower-body explosive capability and is widely used to monitor neuromuscular readiness and training adaptation in combat athletes.',
      limitations: 'Jump height is NOT a measure of striking power, takedown ability or fighting performance. Different devices (force plate, jump mat, contact mat, phone app, Vertec, tape) produce systematically different values; results are only comparable within the same device and arm-position rule.',
      evidenceStrength: 'Strong for reliability and for detecting training-induced change. Weak/mixed for discriminating competitive level within combat sports.'
    },
    protocol: {
      purpose: 'Assess vertical lower-body explosive power.',
      equipment: 'Jump mat or force plate (record brand/model). Flat, firm, non-compliant surface.',
      setup: 'Athlete on the centre of the mat, feet approximately hip-width. Hands remain on the hips for the standard PGP protocol.',
      warmup: 'Complete the standardised PGP general warm-up, then 3 submaximal jumps at approximately 50%, 75% and 90% effort with 30 s between.',
      instructions: '"Hands on hips. Dip as fast and as deep as feels natural, then jump as high as you possibly can. Keep your legs straight in the air and land on the same spot."',
      testProtocol: 'Three maximal attempts. Athlete self-selects countermovement depth. No pause at the bottom.',
      attempts: '3 recorded attempts (plus warm-up jumps).',
      rest: '45-60 s between attempts.',
      record: 'Jump height for each attempt. Optional: flight time, contact time, body mass.',
      calculation: 'BEST of the three attempts is the reported result. If flight time only is available: height (cm) = 9.81 x t^2 / 8 x 100.',
      scoring: 'Best jump height benchmarked against the matched reference set.',
      commonErrors: 'Tucking the knees in flight (inflates flight-time height), arm swing when the protocol says hands-on-hips, landing forward of take-off, pausing at the bottom of the dip (this becomes a squat jump, not a CMJ).',
      stopCriteria: 'Any pain, any landing the athlete cannot control, or three consecutive declining attempts with obvious fatigue.',
      standardisation: 'Same device, same arm position, same footwear, same surface, same time of day within the testing block. Record the device model every time.'
    }
  },

  /* ------------------------- 2. STANDING BROAD JUMP -------------------- */
  {
    id: 'broad_jump', name: 'Standing Broad Jump', shortName: 'Broad Jump',
    category: 'power', order: 20, optional: false,
    equipmentKey: 'tapeMeasure',
    metrics: [
      { key: 'distance_cm', label: 'Distance', unit: 'cm', dp: 0, direction: 'high',
        role: 'primary', benchmarked: true, range: [100, 330], hardRange: [0, 400] }
    ],
    attempts: 3, attemptDirection: 'high', attemptMetric: 'distance_cm',
    reliability: { distance_cm: placeholderCV(3.0, 'Horizontal jump distance is highly reliable with a fixed take-off line and consistent measurement point.') },
    evidence: {
      testReliability: 'high',
      whatItMeasures: 'Horizontal lower-body explosive power and the ability to project body mass forward.',
      whyRelevant: 'Horizontal force production is relevant to level changes, entries and takedowns, and complements the vertical jump. Requires no equipment beyond a tape measure, which makes it practical in any gym.',
      limitations: 'Landing technique and confidence influence distance independently of power. Not a measure of takedown skill.',
      evidenceStrength: 'Strong for reliability. Moderate as a general power index. No combat-sport-specific published norms located for this protocol.'
    },
    protocol: {
      purpose: 'Assess horizontal lower-body explosive power.',
      equipment: 'Tape measure fixed to the floor, clear take-off line, non-slip landing surface (mats are acceptable if used every time).',
      setup: 'Toes behind the take-off line, feet hip-width.',
      warmup: 'PGP general warm-up plus 2-3 submaximal broad jumps.',
      instructions: '"Swing your arms, jump as far forward as you can, and stick the landing. If you fall backwards or step back, the attempt does not count."',
      testProtocol: 'Arm swing is permitted. Two-foot take-off, two-foot landing.',
      attempts: '3 valid attempts.',
      rest: '45-60 s between attempts.',
      record: 'Distance from the take-off line to the REARMOST heel contact, for each attempt.',
      calculation: 'BEST valid attempt.',
      scoring: 'Best distance benchmarked against the matched reference set.',
      commonErrors: 'Measuring to the toe instead of the rearmost heel, stepping over the line, hands touching down behind the heels on landing (invalid), falling backwards (invalid).',
      stopCriteria: 'Pain, or inability to control the landing.',
      standardisation: 'Same surface, same footwear, always measure to the rearmost point of contact.'
    }
  },

  /* ------------------------- 3. SINGLE-LEG BROAD JUMP ------------------ */
  {
    id: 'sl_broad_jump', name: 'Single-Leg Broad Jump', shortName: 'SL Broad Jump',
    category: 'power', order: 30, optional: false,
    equipmentKey: 'tapeMeasure',
    metrics: [
      { key: 'left_cm', label: 'Left leg', unit: 'cm', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [60, 260], hardRange: [0, 350] },
      { key: 'right_cm', label: 'Right leg', unit: 'cm', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [60, 260], hardRange: [0, 350] },
      { key: 'best_cm', label: 'Best leg', unit: 'cm', dp: 0, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [60, 260], hardRange: [0, 350] },
      { key: 'asymmetry_pct', label: 'L/R difference', unit: '%', dp: 1, direction: 'low',
        role: 'observation', benchmarked: false, derived: true, range: [0, 25], hardRange: [0, 100] }
    ],
    attempts: 2, attemptDirection: 'high',
    reliability: { best_cm: placeholderCV(4.5, 'Single-leg horizontal jumping is less reliable than bilateral jumping, particularly in athletes unfamiliar with the task.') },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Unilateral horizontal power, and the difference in output between limbs.',
      whyRelevant: 'Combat sport is asymmetrical by nature (stance, lead leg, kicking leg). Tracking each limb separately gives information a bilateral jump hides.',
      limitations: 'The L/R difference is a PERFORMANCE DIFFERENCE, not an injury risk score. Evidence linking a specific asymmetry threshold to injury is inconsistent and task-dependent, and stance-related asymmetry is normal in combat athletes. Asymmetry is reported as an observation and is excluded from the power category score.',
      evidenceStrength: 'Moderate for reliability. Weak for any injury-related inference — the app makes none.'
    },
    protocol: {
      purpose: 'Assess unilateral horizontal power and the difference between limbs.',
      equipment: 'Tape measure, clear take-off line, non-slip surface.',
      setup: 'Athlete stands on one leg, toe behind the line. Non-stance leg is free but must not touch down before take-off.',
      warmup: 'Include single-leg hops and pogos in the warm-up. 2 submaximal single-leg jumps per leg.',
      instructions: '"Jump as far forward as you can off one leg and land on the SAME leg under control. Hold the landing for one second."',
      testProtocol: 'Land on the same leg. Arm swing permitted. Alternate legs; always test the LEFT leg first for consistency.',
      attempts: '2 valid attempts per leg.',
      rest: '45 s between attempts, alternating legs.',
      record: 'Best distance for left and for right.',
      calculation: 'best_cm = max(left, right).  L/R difference % = |left - right| / max(left, right) x 100.',
      scoring: 'best_cm is benchmarked. The L/R difference is reported as an observation with an editable flag threshold.',
      commonErrors: 'Landing on two feet (invalid), hopping after landing before it is controlled (invalid), the free leg touching down before take-off.',
      stopCriteria: 'Pain, or inability to control a single-leg landing — in which case mark NOT TESTED with the reason.',
      standardisation: 'Always test left first. Same landing surface. A controlled landing on the same leg is required for a valid attempt.'
    }
  },

  /* ------------------------- 4. ROTATIONAL MED BALL THROW ------------- */
  {
    id: 'mb_throw', name: 'Rotational Medicine Ball Throw', shortName: 'Rot MB Throw',
    category: 'power', order: 40, optional: false,
    equipmentKey: 'medBall',
    massDependent: true, massField: 'ball_mass_kg',
    metrics: [
      { key: 'ball_mass_kg', label: 'Ball mass', unit: 'kg', dp: 1, direction: null,
        role: 'condition', benchmarked: false, range: [1, 10], hardRange: [0.5, 20] },
      { key: 'left_cm', label: 'Left / lead-side throw', unit: 'cm', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [200, 1400], hardRange: [0, 2500] },
      { key: 'right_cm', label: 'Right / rear-side throw', unit: 'cm', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [200, 1400], hardRange: [0, 2500] },
      { key: 'best_cm', label: 'Best throw', unit: 'cm', dp: 0, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [200, 1400], hardRange: [0, 2500] },
      { key: 'asymmetry_pct', label: 'L/R difference', unit: '%', dp: 1, direction: 'low',
        role: 'observation', benchmarked: false, derived: true, range: [0, 30], hardRange: [0, 100] }
    ],
    attempts: 3, attemptDirection: 'high',
    reliability: { best_cm: placeholderCV(5.0, 'Rotational throw distance is sensitive to technique and to how strictly foot position is enforced.') },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Rotational power output of the trunk and hips against a fixed external mass.',
      whyRelevant: 'Rotational force production underpins striking and clinch/takedown actions. This is the most sport-relevant power test in the battery, and the most technique-sensitive.',
      limitations: 'Throw distance depends heavily on release angle and technique, and is NOT a measure of punching power. Results are ONLY comparable at the same ball mass and the same foot-position rule — a 3 kg and a 4 kg throw cannot be compared, and the app refuses to benchmark a mass it has no reference set for.',
      evidenceStrength: 'Moderate for reliability with a well-standardised protocol. Reference data for the PGP protocol is provisional and low confidence; recalibrate against PGP internal data as a priority.'
    },
    protocol: {
      purpose: 'Assess rotational power output.',
      equipment: 'Medicine ball of a recorded mass (PGP default: 4 kg male / 3 kg female). Tape measure. Wall-free open space of at least 15 m.',
      setup: 'Athlete stands side-on to the throwing direction, feet parallel, hip-width, both toes on a marked line.',
      warmup: 'PGP general warm-up plus 3 submaximal rotational throws per side.',
      instructions: '"Feet stay where they are. Load back, then throw the ball as far as you can in that direction. You can rotate and rise onto your back foot, but neither foot leaves its spot."',
      testProtocol: 'Standing, feet fixed on the line — NO step, NO shuffle, NO crossover. Heels may rotate and lift; the foot must not translate. Test each side.',
      attempts: '3 valid attempts per side.',
      rest: '45 s between attempts.',
      record: 'Ball mass. Best distance for each side, measured from the line to first ball contact with the floor.',
      calculation: 'best_cm = max(left, right).  L/R difference % = |left - right| / max(left, right) x 100.',
      scoring: 'best_cm benchmarked ONLY against a reference set of the same ball mass. Different mass = no percentile.',
      commonErrors: 'Stepping or shuffling (invalid — the single most common error), throwing upward instead of outward, measuring to where the ball stops rolling instead of first contact.',
      stopCriteria: 'Pain, particularly in the lower back or ribs.',
      standardisation: 'Same ball mass, same feet-fixed rule, same measurement point (first contact). Record the mass on every test.'
    }
  },

  /* ------------------------- 5. 10 M SPRINT ---------------------------- */
  {
    id: 'sprint_10m', name: '10 m Sprint', shortName: '10 m',
    category: 'speed', order: 50, optional: false,
    equipmentKey: 'timingDevice',
    metrics: [
      { key: 'time_10m_s', label: '10 m time', unit: 's', dp: 2, direction: 'low',
        role: 'primary', benchmarked: true, range: [1.4, 2.8], hardRange: [0.8, 6] },
      { key: 'time_20m_s', label: '20 m time', unit: 's', dp: 2, direction: 'low',
        role: 'secondary', benchmarked: false, range: [2.6, 4.6], hardRange: [1.5, 10] },
      { key: 'time_30m_s', label: '30 m time', unit: 's', dp: 2, direction: 'low',
        role: 'secondary', benchmarked: false, range: [3.8, 6.5], hardRange: [2.5, 15] },
      { key: 'split_10_20_s', label: '10-20 m split', unit: 's', dp: 2, direction: 'low',
        role: 'secondary', benchmarked: false, derived: true, range: [1.0, 2.2], hardRange: [0.4, 5] }
    ],
    attempts: 3, attemptDirection: 'low', attemptMetric: 'time_10m_s',
    reliability: { time_10m_s: placeholderCV(1.8, 'Electronic timing gates are highly reliable. Hand timing is NOT and should not be used for benchmarking.') },
    evidence: {
      testReliability: 'high',
      whatItMeasures: 'Initial acceleration ability over a distance relevant to closing and exiting range.',
      whyRelevant: '10 m is the longest sprint distance that is realistically achievable in most combat gyms, and the distance most relevant to the short accelerations seen in the sport.',
      limitations: 'Extremely sensitive to the starting procedure and to the timing method. Hand-timed results carry an error larger than the differences between performance levels and are therefore NOT benchmarked by this app.',
      evidenceStrength: 'Strong for reliability with electronic gates. Low with a stopwatch — which is why the app flags the timing method.'
    },
    protocol: {
      purpose: 'Assess short-distance acceleration.',
      equipment: 'Electronic timing gates (record brand/model) OR a laser/app system. A stopwatch is acceptable for coaching feedback but results should be recorded with timingMethod = hand and are NOT benchmarked.',
      setup: 'Start line 0.5 m behind the first gate. First gate at 0 m, second at 10 m. Minimum 8 m of clear deceleration space beyond the last gate.',
      warmup: 'PGP general warm-up plus progressive runs at 70%, 85%, 95% over 15-20 m, with 60 s between.',
      instructions: '"Two-point start, whichever foot forward you like, but use the SAME one every time. No rocking backwards. Go in your own time and run right through the far gate."',
      testProtocol: 'Standing two-point start, athlete-initiated. No rocking or countermovement before starting.',
      attempts: '3 attempts (a 4th only if the best two differ by more than 3%).',
      rest: '90-120 s between attempts — this is a maximal neuromuscular test, do not rush it.',
      record: 'Each attempt. Timing method and device. Optional 20 m / 30 m splits.',
      calculation: 'BEST (lowest) 10 m time. 10-20 m split = t20 - t10.',
      scoring: 'Best 10 m time benchmarked (electronic timing only).',
      commonErrors: 'Rocking back before starting (produces impossibly fast times), starting with the front foot on the line instead of 0.5 m back, insufficient rest, decelerating before the final gate.',
      stopCriteria: 'Any pain, cramping or tightness in the posterior chain. Stop the test — do not push through a hamstring warning.',
      standardisation: 'Same start distance behind the gate, same start type, same footwear, same surface, same device. If the gym has no space, mark NOT TESTED — reason: facility.'
    }
  },

  /* ------------------------- 6. TRAP-BAR DEADLIFT --------------------- */
  {
    id: 'trapbar', name: 'Trap-Bar Deadlift', shortName: 'Trap Bar',
    category: 'strength', order: 60, optional: false,
    equipmentKey: 'trapBar',
    metrics: [
      { key: 'load_kg', label: 'Load lifted', unit: 'kg', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, range: [40, 320], hardRange: [0, 500] },
      { key: 'reps', label: 'Reps completed', unit: 'reps', dp: 0, direction: 'high',
        role: 'condition', benchmarked: false, range: [1, 8], hardRange: [1, 30] },
      { key: 'est_1rm_kg', label: 'Estimated 1RM', unit: 'kg', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [50, 380], hardRange: [0, 600] },
      { key: 'rel_1rm', label: 'Relative strength', unit: 'x BW', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [0.8, 3.6], hardRange: [0, 6] }
    ],
    attempts: 1,
    reliability: { rel_1rm: placeholderCV(5.0, 'Combines the reliability of the strength test itself with the error of the 1RM prediction equation. Treat small changes cautiously.') },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Maximal lower-body/whole-body force production in a bilateral pulling pattern, expressed relative to body mass.',
      whyRelevant: 'The trap bar is chosen over the barbell deadlift or back squat because it is learned quickly, is more forgiving of limited hip and ankle mobility, and loads the athlete heavily with a lower technical entry cost — which matters when testing fighters who are not lifters.',
      limitations: 'This is an ESTIMATED 1RM from a submaximal set, not a tested 1RM. Prediction error grows with repetitions and with lifting inexperience. Handle height, bar mass and whether the athlete used a high or low handle all change the load — record them. PGP does not require a true 1RM from technically inexperienced athletes.',
      evidenceStrength: 'Strong that relative lower-body strength underpins power expression. Moderate for the prediction equations. No combat-specific published norms located for trap-bar relative strength; standards here are provisional.'
    },
    protocol: {
      purpose: 'Assess maximal relative lower-body pulling strength with a low technical barrier.',
      equipment: 'Trap/hex bar (RECORD the bar mass and handle height used — they differ between bars), calibrated plates, platform.',
      setup: 'High handles are the PGP default. Athlete\'s mid-foot under the handle, neutral spine, arms vertical.',
      warmup: 'PGP general warm-up, then a ramping series: 5 reps at an easy load, 3 reps, 3 reps, then 1-2 singles approaching the test load. 2-3 min between the heavier sets.',
      instructions: 'Test a 3RM (PGP default) or 5RM. "You are looking for the heaviest set of three you can do with the same quality as your warm-up sets. If the third rep would break down, stop at two and we record two."',
      testProtocol: 'PGP default is a 3RM. Ramp to the heaviest technically sound set of 3. A maximum of THREE attempts at or near the top load. If technique degrades, the set does not count and testing stops. Never test a true 1RM in an athlete without demonstrated competence under load.',
      attempts: 'Up to 3 top-end attempts after the ramp.',
      rest: '3 min between top-end attempts.',
      record: 'Load, reps completed, technique status (competent / developing / not competent), handle height, bar mass, body mass.',
      calculation: 'Estimated 1RM (Epley) = load x (1 + reps/30). Brzycki shown alongside. Relative strength = estimated 1RM / body mass.',
      scoring: 'Relative strength (x body mass) is the benchmarked metric. Absolute load is recorded but not benchmarked, because it scales with body mass.',
      commonErrors: 'Not recording the bar mass, changing handle height between tests, allowing a grinding rep to count, rounding of the lower back, testing a technically incompetent athlete under load.',
      stopCriteria: 'Any loss of neutral spine, any pain, any rep the athlete cannot control. Mark NOT TESTED — reason: technique, if competence is inadequate.',
      standardisation: 'Same bar, same handle height, same rep target, same footwear, no belt or same belt use, no lifting straps (grip is part of the test) unless recorded.'
    }
  },

  /* ------------------------- 7. STRICT CHIN-UPS ----------------------- */
  {
    id: 'chinup', name: 'Strict Bodyweight Chin-Ups', shortName: 'Chin-Ups',
    category: 'strength', order: 70, optional: false,
    equipmentKey: 'pullUpBar',
    bodyweightStratified: true,
    metrics: [
      { key: 'reps', label: 'Valid repetitions', unit: 'reps', dp: 0, direction: 'high',
        role: 'primary', benchmarked: true, range: [0, 40], hardRange: [0, 100] },
      { key: 'work_kg_reps', label: 'Work index (BW x reps)', unit: 'kg.reps', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [0, 3000], hardRange: [0, 10000] }
    ],
    attempts: 1,
    reliability: { reps: { typicalError: 1.0, verified: false,
      source: 'PGP PLACEHOLDER (+/-1 repetition)',
      note: 'Repetition counts are discrete; a 1-rep change is within normal day-to-day variation.' } },
    evidence: {
      testReliability: 'high',
      whatItMeasures: 'Upper-body pulling strength-endurance relative to the athlete\'s own body mass.',
      whyRelevant: 'Pulling strength relative to body mass is directly relevant to clinch, grip fighting, grappling control and posture. It needs no equipment beyond a bar, so it works in every gym.',
      limitations: 'Repetitions scale INVERSELY with body mass: a 95 kg athlete performing 10 reps is not weaker than a 65 kg athlete performing 15. For this reason the app benchmarks chin-ups against BODY-MASS-STRATIFIED reference sets and does NOT divide reps by body mass, which would be physiologically meaningless. A maximum-repetition test also blends strength and local endurance; the weighted chin-up is the cleaner maximal-strength measure.',
      evidenceStrength: 'Strong reliability when technique is strictly enforced. Provisional, body-mass-banded standards.'
    },
    protocol: {
      purpose: 'Assess relative upper-body pulling capacity.',
      equipment: 'Fixed straight bar high enough for a full hang with no floor contact. Record the bar type.',
      setup: 'Supinated (palms toward the athlete) grip, approximately shoulder-width. Dead hang, arms fully extended, feet off the floor, legs straight or knees slightly bent but still.',
      warmup: 'PGP general warm-up plus 2 sets of 3-5 submaximal chin-ups, and band-assisted work if needed.',
      instructions: '"Start from a dead hang with straight arms. Pull until your chin is clearly above the bar, then lower all the way down until your elbows are straight. No swinging, no kicking, no kipping. I stop counting the moment the technique changes."',
      testProtocol: 'One maximal set to technical failure. A rep counts ONLY with: full elbow extension at the bottom, chin clearly above the bar at the top, no kipping, no leg drive. The FIRST invalid rep ends the test.',
      attempts: '1 set.',
      rest: 'N/A. This test comes after the trap bar and before the bike work.',
      record: 'Number of VALID repetitions. Body mass. Grip used.',
      calculation: 'Valid reps. Work index = body mass x reps (a descriptive figure only, not benchmarked).',
      scoring: 'Reps benchmarked against a reference set matched for sex AND body-mass band.',
      commonErrors: 'Counting kipped or partial reps, not returning to full extension, chin not clearing the bar, counting the rep where technique broke down.',
      stopCriteria: 'Shoulder or elbow pain. Loss of technique.',
      standardisation: 'Same grip, same bar, strict counting, one tester counting throughout the testing day.'
    }
  },

  /* ------------------------- 8. WEIGHTED CHIN-UP ---------------------- */
  {
    id: 'weighted_chinup', name: 'Weighted Chin-Up', shortName: 'Wtd Chin-Up',
    category: 'strength', order: 80, optional: true,
    equipmentKey: 'pullUpBar',
    metrics: [
      { key: 'added_kg', label: 'Added load', unit: 'kg', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, range: [0, 80], hardRange: [0, 200] },
      { key: 'reps', label: 'Reps completed', unit: 'reps', dp: 0, direction: 'high',
        role: 'condition', benchmarked: false, range: [1, 6], hardRange: [1, 20] },
      { key: 'system_mass_kg', label: 'System mass', unit: 'kg', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [50, 220], hardRange: [0, 400] },
      { key: 'rel_system_mass', label: 'Relative system mass', unit: 'x BW', dp: 3, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [1.0, 1.9], hardRange: [1, 3] }
    ],
    attempts: 1, optionalAdvanced: true,
    reliability: { rel_system_mass: placeholderCV(4.0) },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Maximal upper-body pulling strength relative to body mass, with the strength-endurance component removed.',
      whyRelevant: 'A cleaner maximal-strength measure than a max-repetition set. Appropriate for athletes who can already perform more than roughly 10 strict chin-ups, where a rep-max test becomes an endurance test.',
      limitations: 'Advanced test — only for athletes with demonstrated strict chin-up competence. Results are reported SEPARATELY from bodyweight chin-ups and the two are never pooled into one benchmark.',
      evidenceStrength: 'Moderate. Provisional standards.'
    },
    protocol: {
      purpose: 'Assess maximal relative upper-body pulling strength.',
      equipment: 'Chin-up bar, dipping belt, plates, or a weight vest (RECORD which — a vest changes the load position).',
      setup: 'As the strict chin-up. Load hung from a dipping belt for the PGP default.',
      warmup: 'Strict chin-up warm-up plus 2-3 ramping loaded singles/doubles.',
      instructions: 'Same strict standard as the bodyweight test, under load.',
      testProtocol: 'Ramp to the heaviest technically sound 3RM (PGP default). Maximum 3 top-end attempts.',
      attempts: 'Up to 3 top-end attempts.',
      rest: '3 min between top-end attempts.',
      record: 'Added load, reps, loading method, body mass.',
      calculation: 'Estimated 1RM system mass = (body mass + added load) x (1 + reps/30). Relative system mass = estimated 1RM system mass / body mass.',
      scoring: 'Relative system mass benchmarked.',
      commonErrors: 'Mixing vest and belt loading between tests, partial range under load, kipping.',
      stopCriteria: 'Shoulder or elbow pain, loss of range.',
      standardisation: 'Same loading method, same grip, same strict range.'
    }
  },

  /* ------------------------- 9. BENCH PRESS --------------------------- */
  {
    id: 'bench', name: 'Bench Press', shortName: 'Bench',
    category: 'strength', order: 90, optional: true,
    equipmentKey: 'bench',
    metrics: [
      { key: 'load_kg', label: 'Load lifted', unit: 'kg', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, range: [20, 220], hardRange: [0, 400] },
      { key: 'reps', label: 'Reps completed', unit: 'reps', dp: 0, direction: 'high',
        role: 'condition', benchmarked: false, range: [1, 8], hardRange: [1, 30] },
      { key: 'est_1rm_kg', label: 'Estimated 1RM', unit: 'kg', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [25, 250], hardRange: [0, 450] },
      { key: 'rel_1rm', label: 'Relative strength', unit: 'x BW', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [0.5, 2.2], hardRange: [0, 4] }
    ],
    attempts: 1,
    reliability: { rel_1rm: placeholderCV(4.5) },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Maximal upper-body horizontal pressing strength relative to body mass.',
      whyRelevant: 'A general index of upper-body pressing strength, and a familiar reference point for athletes and gyms.',
      limitations: 'The least combat-specific test in the battery. Bench press strength has no established relationship with striking output. It is OPTIONAL and is weighted lower than the chin-up in the strength category score by default. Requires competent technique and a spotter.',
      evidenceStrength: 'Strong reliability in trained lifters, low relevance to combat-specific qualities. Included because coaches and gyms expect it, not because the evidence demands it.'
    },
    protocol: {
      purpose: 'Assess maximal relative upper-body pressing strength.',
      equipment: 'Bench, barbell (record the bar mass), calibrated plates, safety arms or a competent spotter.',
      setup: 'Five points of contact. Grip width recorded and kept constant between tests.',
      warmup: 'PGP general warm-up plus ramping sets: 8, 5, 3, then approach singles.',
      instructions: 'Test a 3RM or 5RM. Bar touches the chest, no bounce, no heels lifting.',
      testProtocol: 'PGP default 3RM. Full range: bar to chest, full elbow extension. Maximum 3 top-end attempts. Mark NOT TESTED — reason: technique, if competence is inadequate, or NOT TESTED — reason: equipment, if there is no bench or spotter.',
      attempts: 'Up to 3 top-end attempts.',
      rest: '3 min between top-end attempts.',
      record: 'Load, reps, grip width, bar mass, body mass, spotter present.',
      calculation: 'Estimated 1RM (Epley) = load x (1 + reps/30). Relative strength = estimated 1RM / body mass.',
      scoring: 'Relative strength benchmarked.',
      commonErrors: 'Bouncing the bar, lifting the heels, changing grip width between tests, no spotter.',
      stopCriteria: 'Shoulder pain, any rep requiring a spotter to touch the bar.',
      standardisation: 'Same bar, same grip width, same rep target, full range, spotter present.'
    }
  },

  /* ------------------------- 10. 12-MIN AEROBIC ----------------------- */
  {
    id: 'bike_12min', name: '12-Minute AirBike Aerobic Capacity Test', shortName: '12-min Bike',
    category: 'aerobic', order: 100, optional: false,
    equipmentKey: 'airBike',
    equipmentDependent: true,
    metrics: [
      { key: 'mean_watts', label: 'Average power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [80, 500], hardRange: [0, 900] },
      { key: 'w_per_kg', label: 'Average power / body mass', unit: 'W/kg', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [1.2, 4.5], hardRange: [0, 8] },
      { key: 'total_work_kj', label: 'Total work', unit: 'kJ', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [60, 360], hardRange: [0, 700] },
      { key: 'calories', label: 'Calories (console)', unit: 'kcal', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [80, 400], hardRange: [0, 900] },
      { key: 'mean_hr', label: 'Average heart rate', unit: 'bpm', dp: 0, direction: null,
        role: 'observation', benchmarked: false, range: [120, 205], hardRange: [40, 230] },
      { key: 'peak_hr', label: 'Peak heart rate', unit: 'bpm', dp: 0, direction: null,
        role: 'observation', benchmarked: false, range: [140, 215], hardRange: [40, 240] }
    ],
    attempts: 1, durationS: 720,
    reliability: { w_per_kg: placeholderCV(5.0, 'Pacing strategy is the dominant source of variation. Familiarisation matters more here than on any other test in the battery.') },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Average power output sustainable over 12 minutes of continuous maximal-effort cycling. This is a PERFORMANCE measure of sustained power output.',
      whyRelevant: 'A sustained sub-maximal-to-maximal power output test that reflects the aerobic contribution to repeated-effort recovery. Practical: needs one machine, no gas analysis, no treadmill.',
      limitations: 'This is NOT a VO2max test and must never be labelled as one. No oxygen uptake is measured and none is estimated. Air-bike power readings are NOT interchangeable between brands, models or even units of differing condition — the app records the machine and refuses to benchmark a machine it has no reference set for. Results depend strongly on pacing skill, so an unfamiliarised athlete will under-perform.',
      evidenceStrength: 'Moderate as a repeatable performance test on the SAME machine. Weak for any cross-machine or cross-study comparison. No published air-bike norms for combat athletes were located; standards are provisional.'
    },
    protocol: {
      purpose: 'Assess sustained power output over a prolonged continuous effort.',
      equipment: 'Air bike — RECORD brand and model. Heart-rate monitor if available. Fan, water, towel.',
      setup: 'Seat height set so the knee is almost but not fully extended at the bottom of the stroke. RECORD the seat position and use it again at retest.',
      warmup: '5 min progressive easy riding, then 3 x 10 s builds with 50 s easy, then 3 min easy. Finish 3 min before the test starts.',
      instructions: '"Twelve minutes, as much average power as you can hold. It is a pacing test as much as a fitness test — going too hard in the first two minutes will cost you more than it gains. I will call every three minutes."',
      testProtocol: 'Continuous 12 minutes. Console reset to zero before starting. Athlete must not stop. Coach calls elapsed time at 3, 6, 9 and 11 minutes.',
      attempts: '1.',
      rest: 'This test comes LAST in a single-session battery. See the testing-order rationale on the Protocol page.',
      record: 'Average watts (or total work / calories if the console does not show average watts), body mass, machine model, average and peak heart rate, whether the test was completed in full.',
      calculation: 'W/kg = average watts / body mass. Total work (kJ) = average watts x 720 / 1000. If the console gives only total work, average watts = work(kJ) x 1000 / 720.',
      scoring: 'Average W/kg benchmarked against a reference set for the same machine family.',
      commonErrors: 'Forgetting to reset the console, changing the seat position between tests, reading peak instead of average watts, comparing calories between different machines, pacing failure in an unfamiliarised athlete.',
      stopCriteria: 'Chest pain, dizziness, disproportionate breathlessness, or the athlete stopping. If the athlete stops, record the time reached and mark the test INCOMPLETE — do not benchmark a partial test.',
      standardisation: 'Same machine (and ideally the same physical unit), same seat position, same fan conditions, same warm-up, same verbal encouragement. At least one familiarisation exposure before the first benchmarked test.'
    }
  },

  /* ------------------------- 11. 30-S ANAEROBIC ----------------------- */
  {
    id: 'bike_30s', name: '30-Second AirBike Sprint', shortName: '30-s Bike',
    category: 'anaerobic', order: 110, optional: false,
    equipmentKey: 'airBike',
    equipmentDependent: true,
    metrics: [
      { key: 'peak_watts', label: 'Peak power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [400, 1800], hardRange: [0, 3000] },
      { key: 'peak_w_per_kg', label: 'Peak power / body mass', unit: 'W/kg', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [6, 20], hardRange: [0, 30] },
      { key: 'mean_watts', label: 'Mean power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [250, 1200], hardRange: [0, 2000] },
      { key: 'mean_w_per_kg', label: 'Mean power / body mass', unit: 'W/kg', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [4, 14], hardRange: [0, 25] },
      { key: 'min_watts', label: 'Minimum power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, range: [150, 900], hardRange: [0, 2000] },
      { key: 'total_work_kj', label: 'Total work', unit: 'kJ', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [8, 36], hardRange: [0, 60] },
      { key: 'fatigue_index_pct', label: 'Fatigue index', unit: '%', dp: 1, direction: 'low',
        role: 'observation', benchmarked: false, derived: true, range: [10, 70], hardRange: [0, 100] }
    ],
    attempts: 1, durationS: 30,
    reliability: { peak_w_per_kg: placeholderCV(5.0), mean_w_per_kg: placeholderCV(4.0) },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Maximal power output produced over a single 30-second all-out effort, and the fall-off within that effort.',
      whyRelevant: 'A single maximal short effort indexes the athlete\'s ability to produce very high power — relevant to scrambles, explosive exchanges and finishing sequences.',
      limitations: 'ANAEROBIC POWER (how much power) and ANAEROBIC CAPACITY (how much total work) are different qualities and are reported separately: peak and mean W/kg are power measures; total work is the closest thing here to a capacity measure. The app makes no claim about specific energy-system contributions, lactate, or buffering — none of those are measured. An air bike is not a calibrated cycle ergometer and this is not a Wingate test. Fatigue index requires a console that reports minimum/windowed power; where it does not, the value is reported as not computable rather than substituted.',
      evidenceStrength: 'Moderate on a fixed machine. Provisional standards. Cross-machine comparison is not supported.'
    },
    protocol: {
      purpose: 'Assess maximal short-duration power output.',
      equipment: 'Air bike (record brand/model). Toe cages or straps if available.',
      setup: 'Same seat position as the aerobic test — record it.',
      warmup: '5 min easy riding, then 3 x 5 s accelerations with 55 s easy, then 2 min easy, then 2 min passive rest before the effort.',
      instructions: '"Thirty seconds, absolutely everything from the first pedal stroke. Do not pace it. Do not save anything. Hold on to the end."',
      testProtocol: 'Rolling start from a slow cadence, console reset. 30 seconds maximal. Verbal encouragement throughout. Athlete stays seated.',
      attempts: '1.',
      rest: 'Minimum 3 min easy spinning afterwards, then at least 10 min before the repeated-effort test if both are performed. See the testing-order rationale — running BOTH bike sprint tests plus the 12-minute test on the same day is not recommended.',
      record: 'Peak watts, mean watts, minimum watts if the console reports it, total work or calories, body mass, machine model.',
      calculation: 'Peak W/kg = peak watts / body mass. Mean W/kg = mean watts / body mass. Total work (kJ) = mean watts x 30 / 1000. Fatigue index % = (peak - minimum) / peak x 100, computed ONLY when minimum power is recorded.',
      scoring: 'Peak W/kg and mean W/kg are both benchmarked and contribute equally to the anaerobic power category by default.',
      commonErrors: 'Pacing the effort, a slow start from a standstill, failing to reset the console, reading average instead of peak, comparing across machine brands.',
      stopCriteria: 'Chest pain, dizziness, syncope risk. Ensure the athlete stays seated and supervised for 2 min afterwards.',
      standardisation: 'Same machine, same seat position, same warm-up, same start type, same encouragement.'
    }
  },

  /* ------------------------- 12. REPEATED SPRINT ---------------------- */
  {
    id: 'bike_repeated', name: 'Repeated AirBike Sprint Test', shortName: 'Repeated Sprint',
    category: 'repeated', order: 120, optional: false,
    equipmentKey: 'airBike',
    equipmentDependent: true, protocolConfigurable: true,
    defaultConfig: { sprints: 6, workS: 15, recoveryS: 45 },
    metrics: [
      { key: 'best_peak_watts', label: 'Best sprint (peak W)', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [400, 1800], hardRange: [0, 3000] },
      { key: 'mean_peak_watts', label: 'Mean of sprint peaks', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [300, 1600], hardRange: [0, 3000] },
      { key: 'mean_mean_watts', label: 'Mean sprint power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [200, 1200], hardRange: [0, 2000] },
      { key: 'mean_mean_w_per_kg', label: 'Mean sprint power / body mass', unit: 'W/kg', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [3.5, 14], hardRange: [0, 25] },
      { key: 'decrement_pct', label: 'Performance decrement', unit: '%', dp: 1, direction: 'low',
        role: 'primary', benchmarked: true, derived: true, range: [0, 30], hardRange: [0, 80] },
      { key: 'total_work_kj', label: 'Total work', unit: 'kJ', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [20, 120], hardRange: [0, 250] },
      { key: 'best_worst_pct', label: 'Best-to-worst decline', unit: '%', dp: 1, direction: 'low',
        role: 'observation', benchmarked: false, derived: true, range: [0, 45], hardRange: [0, 100] },
      { key: 'slope_w_per_sprint', label: 'Decline per sprint', unit: 'W/sprint', dp: 1, direction: 'high',
        role: 'observation', benchmarked: false, derived: true, range: [-80, 10], hardRange: [-300, 100] }
    ],
    attempts: 1,
    reliability: {
      mean_mean_w_per_kg: placeholderCV(4.0),
      decrement_pct: { typicalError: 2.0, verified: false,
        source: 'PGP PLACEHOLDER (2 percentage points)',
        note: 'Decrement scores are inherently noisier than the power values they are derived from, because they depend on a single best sprint. Interpret changes in decrement with particular caution.' }
    },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Two separate things, reported separately: (1) the AMOUNT of power the athlete can produce across repeated efforts (mean sprint power per kg) and (2) how well that power is MAINTAINED across the set (performance decrement).',
      whyRelevant: 'The intermittent high-intensity, incomplete-recovery structure of this test is the closest thing in the battery to the demands of a competitive round. It is the most sport-relevant conditioning test here.',
      limitations: 'Decrement and mean power must be read together: an athlete who paces the first sprint conservatively will post an artificially good decrement score with a poor mean power. The app therefore benchmarks both and never reports decrement alone. A decrement score is only comparable within the identical protocol — changing the number of sprints, the work duration or the recovery period creates a DIFFERENT TEST, and the app stores the configuration with the result and refuses to compare across configurations.',
      evidenceStrength: 'The decrement formula (Fitzsimons et al., 1993) is well established. The specific 6 x 15 s / 45 s air-bike protocol has no published norms; standards are provisional.'
    },
    protocol: {
      purpose: 'Assess the ability to produce and re-produce high power output with limited recovery.',
      equipment: 'Air bike (record brand/model). Stopwatch or interval timer with audible cues. A second person to record each sprint is strongly recommended.',
      setup: 'Same seat position as the other bike tests.',
      warmup: '5 min easy riding, 3 x 5 s accelerations with 55 s easy, 2 min easy, 2 min passive.',
      instructions: '"Six sprints, fifteen seconds each, forty-five seconds easy between them. Every single one is maximal — do not pace the first one to save yourself, and do not pace the last one because you are tired. I will count you in for each."',
      testProtocol: 'PGP DEFAULT: 6 sprints x 15 s maximal, 45 s active recovery (easy pedalling) between sprints. Rolling start into each sprint. Console reset, or peak and average noted, for EVERY sprint. Any change to sprint count, work duration or recovery duration must be recorded in the configuration fields and constitutes a different protocol.',
      attempts: '1 set of 6.',
      rest: '45 s between sprints (configurable — if changed, the configuration is stored and results are not compared with the default).',
      record: 'Peak watts AND average watts for every individual sprint. Body mass. Machine model. The protocol configuration actually used.',
      calculation: 'Mean sprint power = mean of the individual sprint average watts. Mean sprint power / kg = that value / body mass. Performance decrement (Fitzsimons et al., 1993) = (1 - (sum of sprint averages / (best sprint average x number of sprints))) x 100. Total work (kJ) = sum of (sprint average watts x work duration) / 1000. Best-to-worst decline % = (best - worst) / best x 100. Decline per sprint = OLS slope of sprint average power against sprint number.',
      scoring: 'Mean sprint power per kg AND performance decrement are both benchmarked, and are weighted 70/30 in the repeated-effort category score by default — the amount of power matters more than the flatness of the curve. Weights are editable in Settings.',
      commonErrors: 'Pacing the first sprint (this corrupts the decrement score), drifting recovery periods, recording only peak power, failing to record the configuration used, one person trying to time and record alone.',
      stopCriteria: 'Chest pain, dizziness, vomiting, or an inability to continue. If the set is not completed, record the number of sprints completed and mark INCOMPLETE — do not compute a decrement from a partial set.',
      standardisation: 'Identical timing cues, identical recovery duration, identical encouragement, same machine, same seat position, same recorder.'
    }
  },

  /* ------------------------- 13. MOVEMENT SCREEN ---------------------- */
  {
    id: 'movement_screen', name: 'Movement Observation Screen', shortName: 'Movement',
    category: 'movement', order: 130, optional: true,
    equipmentKey: 'none',
    isScreen: true,
    items: [
      { key: 'ankle_df_l',  label: 'Ankle dorsiflexion — left',      note: 'Knee-to-wall. Record distance (cm) in the notes if measured.' },
      { key: 'ankle_df_r',  label: 'Ankle dorsiflexion — right',     note: '' },
      { key: 'hip_ir_l',    label: 'Hip internal rotation — left',   note: 'Seated or prone, consistent position.' },
      { key: 'hip_ir_r',    label: 'Hip internal rotation — right',  note: '' },
      { key: 'hip_er_l',    label: 'Hip external rotation — left',   note: '' },
      { key: 'hip_er_r',    label: 'Hip external rotation — right',  note: '' },
      { key: 'shoulder_flex_l', label: 'Shoulder flexion — left',    note: 'Supine, lumbar spine flat.' },
      { key: 'shoulder_flex_r', label: 'Shoulder flexion — right',   note: '' },
      { key: 'thoracic_rot_l',  label: 'Thoracic rotation — left',   note: 'Seated or quadruped, pelvis locked.' },
      { key: 'thoracic_rot_r',  label: 'Thoracic rotation — right',  note: '' },
      { key: 'sl_squat_l',  label: 'Single-leg squat / step-down — left',  note: 'Observe control, not depth alone.' },
      { key: 'sl_squat_r',  label: 'Single-leg squat / step-down — right', note: '' }
    ],
    scoreScale: [
      { value: 0, label: 'Significant limitation', desc: 'Range or control is clearly restricted and would meaningfully limit training exposure in this pattern.' },
      { value: 1, label: 'Moderate limitation',    desc: 'Range or control is reduced but does not prevent loaded training in this pattern.' },
      { value: 2, label: 'Acceptable',             desc: 'Range and control are adequate for the training the athlete needs to do.' }
    ],
    metrics: [
      { key: 'score_pct', label: 'Screen score', unit: '% of max', dp: 0, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [0, 100], hardRange: [0, 100] }
    ],
    reliability: { score_pct: { typicalError: null, verified: false,
      source: 'Not established. Inter-rater reliability of subjective movement screens is generally poor to moderate.',
      note: 'Do NOT interpret small changes in this score. It exists to flag patterns worth a closer look, not to be tracked to the percentage point.' } },
    evidence: {
      testReliability: 'low',
      whatItMeasures: 'The assessing coach\'s judgement of available range of motion and movement control in selected patterns, on the day, in that athlete.',
      whyRelevant: 'Identifies patterns where a training exposure may need modifying, and gives context to a power or strength result (for example, restricted ankle dorsiflexion alongside a low jump score).',
      limitations: 'THIS IS COACH-OBSERVATION DATA, NOT A MEDICAL ASSESSMENT AND NOT A DIAGNOSIS. It does not predict injury — the published evidence for movement screens as injury-prediction tools is weak and largely negative. It has low inter-rater reliability, so scores from different assessors are not comparable. It is scored as a percentage of the achievable maximum, NOT as a percentile against a population, because no defensible reference population exists. It is excluded from any composite index by default.',
      evidenceStrength: 'Weak as a predictive tool. Useful as structured, documented coach observation — which is all this app claims it is.'
    },
    protocol: {
      purpose: 'Document coach-observed range of motion and movement control to inform training decisions.',
      equipment: 'Wall, box or step of a recorded height, tape measure, goniometer or inclinometer if available.',
      setup: 'Standardised start position for each item. Bare feet or the same footwear every time.',
      warmup: 'Performed BEFORE the physical warm-up and before any testing, so that the observation reflects the athlete\'s habitual state rather than a post-warm-up state. Keep this consistent — screening warm or cold changes the result.',
      instructions: 'Demonstrate each item once. Two observation trials per side. Score what you see, not what you hope to see.',
      testProtocol: 'Score each item 0, 1 or 2 using the anchored scale. Any item not assessed is left blank, NOT scored zero. Record the reason for anything not assessed.',
      attempts: '2 observation trials per item per side.',
      rest: 'N/A.',
      record: 'A score for each item assessed, plus a free-text note for anything the score does not capture. Record the assessor\'s name — scores are not comparable between assessors.',
      calculation: 'Screen score % = sum of scores assessed / (2 x number of items assessed) x 100. Items not assessed are excluded from both the numerator and the denominator.',
      scoring: 'Reported as a percentage of the achievable maximum with a performance band. NOT a percentile.',
      commonErrors: 'Scoring an item that was not actually assessed, scoring zero for a missing item, screening warm on one occasion and cold on another, a different assessor at retest, treating a low score as a diagnosis.',
      stopCriteria: 'Any pain. Pain during the screen is a reason to refer, not a reason to score. Record it and flag the athlete for test modification.',
      standardisation: 'Same assessor, same order, same warm/cold state, same footwear, same equipment heights. Record the assessor every time.'
    }
  }
  ];

  /* ---- lookup helpers -------------------------------------------------- */
  var byId = {};
  TESTS.forEach(function (t) { byId[t.id] = t; });

  var API = {
    CATEGORIES: CATEGORIES,
    TESTS: TESTS,
    get: function (id) { return byId[id] || null; },
    category: function (id) {
      for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
      return null;
    },
    byCategory: function (catId) {
      return TESTS.filter(function (t) { return t.category === catId; })
                  .sort(function (a, b) { return a.order - b.order; });
    },
    metric: function (testId, metricKey) {
      var t = byId[testId];
      if (!t) return null;
      for (var i = 0; i < t.metrics.length; i++) if (t.metrics[i].key === metricKey) return t.metrics[i];
      return null;
    },
    /* every (testId, metricKey) pair that is benchmarked */
    benchmarkedMetrics: function () {
      var out = [];
      TESTS.forEach(function (t) {
        t.metrics.forEach(function (m) {
          if (m.benchmarked) out.push({ testId: t.id, test: t, metric: m });
        });
      });
      return out;
    },
    orderedTests: function () {
      return TESTS.slice().sort(function (a, b) { return a.order - b.order; });
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.PGP = root.PGP || {};
  root.PGP.Tests = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
