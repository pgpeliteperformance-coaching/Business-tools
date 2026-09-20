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
      blurb: 'Ability to produce and re-produce high power outputs with limited recovery.' }
  ];

  /* ---- shared reliability placeholder factory -------------------------- */
  function placeholderCV(cv, note) {
    return { cvPct: cv, verified: false,
             source: 'PGP PLACEHOLDER (conservative estimate for movement class)',
             note: note || '' };
  }

  /* ====================================================================== */
  var TESTS = [

  /* ------------------------ 1. COUNTERMOVEMENT JUMP --------------------- */
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

  /* ------------------------ 2. STANDING BROAD JUMP ---------------------- */
  {
    id: 'broad_jump', name: 'Standing Broad Jump', shortName: 'Broad Jump',
    category: 'power', order: 20, optional: false,
    equipmentKey: 'tapeMeasure',
    metrics: [
      { key: 'distance_m', label: 'Distance', unit: 'm', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, range: [1.0, 3.3], hardRange: [0, 4.0] }
    ],
    attempts: 3, attemptDirection: 'high', attemptMetric: 'distance_m',
    reliability: { distance_m: placeholderCV(3.0, 'Horizontal jump distance is highly reliable with a fixed take-off line and consistent measurement point.') },
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
      record: 'Distance in METRES from the take-off line to the REARMOST heel contact, for each attempt.',
      calculation: 'BEST valid attempt.',
      scoring: 'Best distance benchmarked against the matched reference set.',
      commonErrors: 'Measuring to the toe instead of the rearmost heel, stepping over the line, hands touching down behind the heels on landing (invalid), falling backwards (invalid).',
      stopCriteria: 'Pain, or inability to control the landing.',
      standardisation: 'Same surface, same footwear, always measure to the rearmost point of contact.'
    }
  },

  /* ------------------------ 3. SINGLE-LEG BROAD JUMP -------------------- */
  {
    id: 'sl_broad_jump', name: 'Single-Leg Broad Jump', shortName: 'SL Broad Jump',
    category: 'power', order: 30, optional: false,
    equipmentKey: 'tapeMeasure',
    metrics: [
      { key: 'left_m', label: 'Left leg', unit: 'm', dp: 2, direction: 'high',
        role: 'secondary', benchmarked: false, range: [0.6, 2.6], hardRange: [0, 3.5] },
      { key: 'right_m', label: 'Right leg', unit: 'm', dp: 2, direction: 'high',
        role: 'secondary', benchmarked: false, range: [0.6, 2.6], hardRange: [0, 3.5] },
      { key: 'best_m', label: 'Best leg', unit: 'm', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [0.6, 2.6], hardRange: [0, 3.5] },
      { key: 'asymmetry_pct', label: 'L/R difference', unit: '%', dp: 1, direction: 'low',
        role: 'observation', benchmarked: false, derived: true, range: [0, 25], hardRange: [0, 100] }
    ],
    attempts: 2, attemptDirection: 'high',
    reliability: { best_m: placeholderCV(4.5, 'Single-leg horizontal jumping is less reliable than bilateral jumping, particularly in athletes unfamiliar with the task.') },
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
      record: 'Best distance in METRES for left and for right.',
      calculation: 'best_m = max(left, right), in metres.  L/R difference % = |left - right| / max(left, right) x 100.',
      scoring: 'best_m is benchmarked. The L/R difference is reported as an observation with an editable flag threshold.',
      commonErrors: 'Landing on two feet (invalid), hopping after landing before it is controlled (invalid), the free leg touching down before take-off.',
      stopCriteria: 'Pain, or inability to control a single-leg landing — in which case mark NOT TESTED with the reason.',
      standardisation: 'Always test left first. Same landing surface. A controlled landing on the same leg is required for a valid attempt.'
    }
  },

  /* ------------------------ 4. 10 M SPRINT ------------------------------ */
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

  /* ------------------------ 5. TRAP-BAR DEADLIFT ------------------------ */
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

  /* ------------------------ 6. STRICT CHIN-UPS -------------------------- */
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

  /* ------------------------ 7. WEIGHTED CHIN-UP (1RM) ------------------- */
  {
    id: 'weighted_chinup', name: 'Weighted Chin-Up (1RM)', shortName: 'Wtd Chin-Up',
    category: 'strength', order: 80, optional: true,
    equipmentKey: 'pullUpBar',
    metrics: [
      { key: 'added_kg', label: 'Added load for a single', unit: 'kg', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, range: [0, 80], hardRange: [0, 200] },
      { key: 'system_mass_kg', label: 'System mass', unit: 'kg', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [50, 220], hardRange: [0, 400] },
      { key: 'rel_system_mass', label: 'Relative system mass', unit: 'x BW', dp: 3, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [1.0, 1.9], hardRange: [1, 3] }
    ],
    attempts: 1, optionalAdvanced: true,
    reliability: { rel_system_mass: placeholderCV(4.0) },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Maximal upper-body pulling strength relative to body mass, as a genuine one-repetition maximum.',
      whyRelevant: 'A clean maximal-strength measure with no strength-endurance component. Appropriate for athletes who can already perform more than roughly ten strict chin-ups, where a repetition-maximum test has become an endurance test.',
      limitations: 'A TESTED 1RM, not an estimate: it is the heaviest single the athlete completed to the full strict standard, and no prediction equation is involved. Advanced test — only for athletes with demonstrated strict chin-up competence. Reported SEPARATELY from bodyweight chin-ups; the two are never pooled.',
      evidenceStrength: 'Moderate. Provisional standards.'
    },
    protocol: {
      purpose: 'Assess maximal relative upper-body pulling strength as a tested 1RM.',
      equipment: 'Chin-up bar, dipping belt, plates, or a weight vest (RECORD which — a vest changes the load position).',
      setup: 'As the strict chin-up. Load hung from a dipping belt for the PGP default.',
      warmup: 'Strict chin-up warm-up, then ramping loaded singles: roughly 50%, 70%, 85% and 95% of the expected top single, one repetition each, with 2 min between.',
      instructions: 'Same strict standard as the bodyweight test, under load. "One rep. Dead hang, chin clearly over the bar, all the way down. If it grinds or you kick, it does not count."',
      testProtocol: 'SINGLES ONLY. Work up in small jumps to the heaviest single the athlete can complete to the full strict standard. Maximum 3 attempts at or near the top load. A failed or non-strict single does not count and the previous successful load stands.',
      attempts: 'Up to 3 top-end singles after the ramp.',
      rest: '3 min between top-end singles.',
      record: 'The heaviest added load completed for ONE strict repetition. Loading method. Body mass.',
      calculation: 'System mass = body mass + added load. Relative system mass = system mass / body mass. No estimation equation is used: this is a tested single.',
      scoring: 'Relative system mass benchmarked. 1.30 x body mass means lifting body mass plus 30% of body mass for a single.',
      commonErrors: 'Counting a grinding or kipped rep, partial range under load, mixing vest and belt loading between tests, working up in jumps too big to find the true maximum.',
      stopCriteria: 'Shoulder or elbow pain, loss of range, any rep the athlete cannot control.',
      standardisation: 'Same loading method, same grip, same strict range, same warm-up ramp.'
    }
  },

  /* ------------------------ 8. BENCH PRESS ------------------------------ */
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

  /* ------------------------ 9. 12-MIN AEROBIC --------------------------- */
  {
    id: 'bike_12min', name: '12-Minute AirBike Aerobic Capacity Test', shortName: '12-min Bike',
    category: 'aerobic', order: 100, optional: false,
    equipmentKey: 'airBike',
    equipmentDependent: true,
    metrics: (function () {
      /* One box per minute. The coach reads the console every 60 s, which is
         what they are doing anyway, and the app takes the average rather than
         asking them to work it out. It also makes the pacing visible: an
         athlete who fades badly in the second half tested differently from one
         who held the number, even at the same average. */
      var m = [];
      for (var i = 1; i <= 12; i++) {
        m.push({ key: 'min_' + i, label: 'Minute ' + i, unit: 'W', dp: 0, direction: 'high',
                 role: 'sample', benchmarked: false, range: [60, 700], hardRange: [0, 1200] });
      }
      return m.concat([
        { key: 'mean_watts', label: 'Average power', unit: 'W', dp: 0, direction: 'high',
          role: 'secondary', benchmarked: false, derived: true, range: [80, 500], hardRange: [0, 900] },
        { key: 'w_per_kg', label: 'Average power / body mass', unit: 'W/kg', dp: 2, direction: 'high',
          role: 'primary', benchmarked: true, derived: true, range: [1.2, 4.5], hardRange: [0, 8] },
        { key: 'distance_km', label: 'Total distance', unit: 'km', dp: 2, direction: 'high',
          role: 'secondary', benchmarked: false, range: [2, 12], hardRange: [0, 25] },
        { key: 'total_work_kj', label: 'Total work', unit: 'kJ', dp: 0, direction: 'high',
          role: 'secondary', benchmarked: false, derived: true, range: [60, 360], hardRange: [0, 700] },
        { key: 'fade_pct', label: 'Second-half fade', unit: '%', dp: 1, direction: 'low',
          role: 'observation', benchmarked: false, derived: true, range: [-10, 30], hardRange: [-50, 90] },
        { key: 'mean_hr', label: 'Average heart rate', unit: 'bpm', dp: 0, direction: null,
          role: 'observation', benchmarked: false, range: [120, 205], hardRange: [40, 230] },
        { key: 'peak_hr', label: 'Peak heart rate', unit: 'bpm', dp: 0, direction: null,
          role: 'observation', benchmarked: false, range: [140, 215], hardRange: [40, 240] }
      ]);
    })(),
    minuteSamples: 12,
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
      testProtocol: 'Continuous 12 minutes. Console reset to zero before starting. Athlete must not stop. Coach calls every minute and writes down the watts showing at that moment.',
      attempts: '1.',
      rest: 'This test comes LAST in a single-session battery. See the testing-order rationale on the Protocol page.',
      record: 'WATTS AT EVERY MINUTE — read the console at each of the twelve minute marks and write the number down. Plus total distance, body mass, machine model, average and peak heart rate, and whether the test was completed in full.',
      calculation: 'Average watts = the mean of the minute readings recorded. W/kg = average watts / body mass. Total work (kJ) = average watts x 720 / 1000. Second-half fade % = (mean of minutes 1-6 - mean of minutes 7-12) / mean of minutes 1-6 x 100, reported as an observation so pacing is visible rather than hidden inside the average.',
      scoring: 'Average W/kg benchmarked against a reference set for the same machine family.',
      commonErrors: 'Forgetting to reset the console, changing the seat position between tests, reading peak instead of average watts, comparing calories between different machines, pacing failure in an unfamiliarised athlete.',
      stopCriteria: 'Chest pain, dizziness, disproportionate breathlessness, or the athlete stopping. If the athlete stops, record the time reached and mark the test INCOMPLETE — do not benchmark a partial test.',
      standardisation: 'Same machine (and ideally the same physical unit), same seat position, same fan conditions, same warm-up, same verbal encouragement. At least one familiarisation exposure before the first benchmarked test.'
    }
  },

  /* ------------------------ 10. 30-S ANAEROBIC -------------------------- */
  {
    id: 'bike_30s', name: '30-Second AirBike Sprint', shortName: '30-s Bike',
    category: 'anaerobic', order: 110, optional: false,
    equipmentKey: 'airBike',
    equipmentDependent: true,
    metrics: [
      /* Three ten-second readings. Peak, mean and minimum all fall out of
         them, which also makes the fatigue index computable on a console that
         reports nothing but the current number. */
      { key: 'w_0_10', label: '0-10 s', unit: 'W', dp: 0, direction: 'high',
        role: 'sample', benchmarked: false, range: [200, 2000], hardRange: [0, 3000] },
      { key: 'w_10_20', label: '10-20 s', unit: 'W', dp: 0, direction: 'high',
        role: 'sample', benchmarked: false, range: [200, 2000], hardRange: [0, 3000] },
      { key: 'w_20_30', label: '20-30 s', unit: 'W', dp: 0, direction: 'high',
        role: 'sample', benchmarked: false, range: [150, 2000], hardRange: [0, 3000] },
      { key: 'peak_watts', label: 'Peak power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [400, 1800], hardRange: [0, 3000] },
      { key: 'peak_w_per_kg', label: 'Peak power / body mass', unit: 'W/kg', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [6, 20], hardRange: [0, 30] },
      { key: 'mean_watts', label: 'Mean power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [250, 1200], hardRange: [0, 2000] },
      { key: 'mean_w_per_kg', label: 'Mean power / body mass', unit: 'W/kg', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [4, 14], hardRange: [0, 25] },
      { key: 'min_watts', label: 'Minimum power', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [150, 900], hardRange: [0, 2000] },
      { key: 'total_work_kj', label: 'Total work', unit: 'kJ', dp: 1, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [8, 36], hardRange: [0, 60] },
      { key: 'fatigue_index_pct', label: 'Fatigue index', unit: '%', dp: 1, direction: 'low',
        role: 'observation', benchmarked: false, derived: true, range: [5, 70], hardRange: [0, 100] }
    ],
    splitSamples: ['w_0_10', 'w_10_20', 'w_20_30'],
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
      record: 'WATTS AT 10 s, 20 s AND 30 s — read the console at each mark. Plus body mass and machine model.',
      calculation: 'Peak = the highest of the three readings, mean = their average, minimum = the lowest. Peak W/kg = peak / body mass. Mean W/kg = mean / body mass. Total work (kJ) = mean x 30 / 1000. Fatigue index % = (peak - minimum) / peak x 100.',
      scoring: 'Peak W/kg and mean W/kg are both benchmarked and contribute equally to the anaerobic power category by default.',
      commonErrors: 'Pacing the effort, a slow start from a standstill, missing one of the three reading points, comparing across machine brands. Have a second person read the console — the athlete cannot and the timer needs watching.',
      stopCriteria: 'Chest pain, dizziness, syncope risk. Ensure the athlete stays seated and supervised for 2 min afterwards.',
      standardisation: 'Same machine, same seat position, same warm-up, same start type, same encouragement.'
    }
  },

  /* ------------------------ 11. REPEATED SPRINT ------------------------- */
  {
    id: 'bike_repeated', name: 'Repeated AirBike Sprint Test', shortName: 'Repeated Sprint',
    category: 'repeated', order: 120, optional: false,
    equipmentKey: 'airBike',
    equipmentDependent: true, protocolConfigurable: true,
    defaultConfig: { sprints: 6, workS: 15, recoveryS: 45 },
    metrics: [
      { key: 'best_peak_watts', label: 'Best sprint', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [400, 1800], hardRange: [0, 3000] },
      { key: 'worst_peak_watts', label: 'Worst sprint', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [250, 1700], hardRange: [0, 3000] },
      { key: 'mean_peak_watts', label: 'Average sprint', unit: 'W', dp: 0, direction: 'high',
        role: 'secondary', benchmarked: false, derived: true, range: [300, 1700], hardRange: [0, 3000] },
      { key: 'mean_peak_w_per_kg', label: 'Average sprint / body mass', unit: 'W/kg', dp: 2, direction: 'high',
        role: 'primary', benchmarked: true, derived: true, range: [4, 18], hardRange: [0, 30] },
      { key: 'decrement_pct', label: 'Loss of watts', unit: '%', dp: 1, direction: 'low',
        role: 'primary', benchmarked: true, derived: true, range: [0, 30], hardRange: [0, 80] },
      { key: 'best_worst_pct', label: 'Best-to-worst drop', unit: '%', dp: 1, direction: 'low',
        role: 'observation', benchmarked: false, derived: true, range: [0, 45], hardRange: [0, 100] },
      { key: 'slope_w_per_sprint', label: 'Drop per sprint', unit: 'W/sprint', dp: 1, direction: 'high',
        role: 'observation', benchmarked: false, derived: true, range: [-90, 10], hardRange: [-300, 100] }
    ],
    attempts: 1,
    reliability: {
      mean_peak_w_per_kg: placeholderCV(4.0),
      decrement_pct: { typicalError: 2.0, verified: false,
        source: 'PGP PLACEHOLDER (2 percentage points)',
        note: 'Loss-of-watts scores are noisier than the power values they come from, because they depend on a single best sprint. Interpret a change in this number with particular caution.' }
    },
    evidence: {
      testReliability: 'medium',
      whatItMeasures: 'Two separate things, reported separately: (1) the AMOUNT of power the athlete can produce across repeated efforts (average of the sprint peaks, per kg) and (2) how well that power is MAINTAINED across the set (loss of watts).',
      whyRelevant: 'The intermittent high-intensity, incomplete-recovery structure of this test is the closest thing in the battery to the demands of a competitive round. It is the most sport-relevant conditioning test here.',
      limitations: 'Loss of watts and average power must be read together: an athlete who paces the first sprint conservatively will post an artificially good loss-of-watts score with a poor average. The app therefore benchmarks both and never reports the loss figure alone. It is only comparable within the identical protocol — changing the number of sprints, the work duration or the recovery period creates a DIFFERENT TEST, and the app stores the configuration with the result and refuses to compare across configurations.',
      evidenceStrength: 'The decrement formula (Fitzsimons et al., 1993) is well established. The specific 6 x 15 s / 45 s air-bike protocol has no published norms; standards are provisional.'
    },
    protocol: {
      purpose: 'Assess the ability to produce and re-produce high power output with limited recovery.',
      equipment: 'Air bike (record brand/model). Stopwatch or interval timer with audible cues. A second person to record each sprint is strongly recommended.',
      setup: 'Same seat position as the other bike tests.',
      warmup: '5 min easy riding, 3 x 5 s accelerations with 55 s easy, 2 min easy, 2 min passive.',
      instructions: '"Six sprints, fifteen seconds each, forty-five seconds easy between them. Every single one is maximal — do not pace the first one to save yourself, and do not pace the last one because you are tired. I will count you in for each."',
      testProtocol: 'PGP DEFAULT: 6 sprints x 15 s maximal, 45 s active recovery (easy pedalling) between sprints. Rolling start into each sprint. Console reset, or peak and average noted, for EVERY sprint. Any change to sprint count, work duration or recovery duration must be recorded in the configuration fields and constitutes a different protocol.',
      attempts: '1 set of 6, one number recorded per sprint.',
      rest: '45 s between sprints (configurable — if changed, the configuration is stored and results are not compared with the default).',
      record: 'MAX WATTS FOR EACH SPRINT — one number per sprint, nothing else. Body mass. Machine model. The protocol configuration actually used.',
      calculation: 'Average sprint = the mean of the sprint peaks. Average sprint / kg = that value / body mass. Best sprint = the highest peak. Loss of watts (Fitzsimons et al., 1993) = (1 - (sum of peaks / (best peak x number of sprints))) x 100. Best-to-worst drop % = (best - worst) / best x 100. Drop per sprint = OLS slope of peak power against sprint number.',
      scoring: 'Average sprint per kg AND loss of watts are both benchmarked, weighted 70/30 in the repeated-effort category score by default — the amount of power matters more than the flatness of the curve. Weights are editable in Settings.',
      commonErrors: 'Pacing the first sprint (this corrupts the loss-of-watts score), drifting recovery periods, failing to record the configuration used, one person trying to time and record alone.',
      stopCriteria: 'Chest pain, dizziness, vomiting, or an inability to continue. If the set is not completed, record the number of sprints completed and mark INCOMPLETE — do not compute a decrement from a partial set.',
      standardisation: 'Identical timing cues, identical recovery duration, identical encouragement, same machine, same seat position, same recorder.'
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
