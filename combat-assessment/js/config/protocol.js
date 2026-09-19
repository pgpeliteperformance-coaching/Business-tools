/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/config/protocol.js — STANDARD OPERATING PROCEDURE, TESTING ORDER,
                           DESIGN RATIONALE AND LIMITATIONS
   --------------------------------------------------------------------------
   The written half of the product. A second qualified PGP coach should be
   able to read this, run the battery, and produce data that pools with
   everybody else's.
   ========================================================================== */
(function (root) {
  'use strict';

  /* ======================================================================
     TESTING ORDER
     ----------------------------------------------------------------------
     The order proposed in the original brief was reviewed and CHANGED. The
     reasons are in ORDER_RATIONALE below and are surfaced on the Protocol
     page — the change is not made silently.
     ====================================================================== */
  var TESTING_ORDER = [
    { key: 'registration', label: '1. Athlete registration and consent', mins: 4,
      equipment: 'Tablet or laptop',
      why: 'Identity, sport, level, training age, consent for aggregate reporting. Do this before the athlete warms up so nobody is standing around cooling down.' },
    { key: 'readiness', label: '2. Pre-test readiness checklist', mins: 0,
      equipment: 'None',
      why: 'Injury, illness, fatigue, recent sparring, recent competition, medical restriction, caffeine. Decides what is tested, modified or skipped. Not a medical assessment.' },
    { key: 'anthropometry', label: '3. Height and body mass', mins: 3,
      equipment: 'Scales, stadiometer',
      why: 'Needed before anything else because most metrics are expressed relative to body mass. Same scales, minimal clothing, same point in the day.' },
    { key: 'movement_screen', label: '4. Movement observation screen', mins: 8,
      equipment: 'Wall, box, tape measure',
      why: 'BEFORE the warm-up, deliberately. Screening an athlete who has just done 15 minutes of mobility work measures the warm-up, not the athlete. Keep warm-or-cold consistent between tests or the retest is meaningless.' },
    { key: 'warmup', label: '5. Standardised warm-up', mins: 12,
      equipment: 'Space, mini-bands',
      why: 'Identical every time: 3 min easy bike, dynamic lower-limb series, 2 min of pogos and low hops, 3 progressive runs. A different warm-up is a different test.' },
    { key: 'cmj', label: '6. Countermovement jump', mins: 4,
      equipment: 'Jump mat or force plate',
      why: 'Least fatiguing maximal test, so it goes first. Also the most sensitive to fatigue, which is the same reason.' },
    { key: 'broad_jump', label: '7. Standing broad jump', mins: 4,
      equipment: 'Tape measure, non-slip surface',
      why: 'Horizontal power while still fresh. After the CMJ because the landing is more demanding.' },
    { key: 'sl_broad_jump', label: '8. Single-leg broad jump', mins: 6,
      equipment: 'Tape measure',
      why: 'Unilateral work after bilateral, so the athlete has already had two maximal exposures to the task.' },
    { key: 'mb_throw', label: '9. Rotational medicine-ball throw', mins: 7,
      equipment: 'Medicine ball of a recorded mass, 15 m of space',
      why: 'Upper-body and trunk power before any sprinting or lifting. Record the ball mass every time.' },
    { key: 'sprint_10m', label: '10. 10 m sprint', mins: 8,
      equipment: 'Electronic timing gates, 20 m of clear space',
      why: 'Maximal neuromuscular test needing full recovery between efforts. Placed after the jumps because the jumps double as a final potentiation, and before strength work because heavy lifting blunts sprint times for the rest of the session.' },
    { key: 'trapbar', label: '11. Trap-bar deadlift', mins: 14,
      equipment: 'Trap bar of a recorded mass, plates, platform',
      why: 'Heaviest neuromuscular demand, so it follows everything that needs freshness. Ramp properly — the warm-up sets are part of the test.' },
    { key: 'chinup', label: '12. Strict chin-ups (then optional weighted chin-up)', mins: 4,
      equipment: 'Fixed bar, dipping belt if loading',
      why: 'Upper body after lower body. If the weighted chin-up is being tested, do it BEFORE the max-rep set, not after — a set to failure destroys the loaded single.' },
    { key: 'bench', label: '13. Bench press (optional)', mins: 12,
      equipment: 'Bench, bar of a recorded mass, spotter',
      why: 'Last of the strength tests. Optional, and the least combat-specific test in the battery.' },
    { key: 'bike_repeated', label: '14. Repeated sprint test — 6 × 15 s / 45 s', mins: 16,
      equipment: 'Air bike of a recorded model, interval timer, second recorder',
      why: 'CHANGED FROM THE ORIGINAL ORDER. The glycolytic tests come before the long aerobic test, and the repeated-sprint test comes first of those — it is the most sport-relevant conditioning measure in the battery and it deserves the freshest legs of the three bike tests.' },
    { key: 'recovery_gap', label: '15. Recovery block', mins: 30,
      equipment: 'Water, somewhere to sit',
      why: 'Minimum 20-30 minutes of genuine recovery, not 5 minutes of standing about. Use it for the athlete debrief and to test somebody else.' },
    { key: 'bike_12min', label: '16. 12-minute aerobic capacity test', mins: 20,
      equipment: 'Air bike of a recorded model, heart-rate monitor, fan',
      why: 'LAST. A 12-minute maximal effort ends the athlete\'s day, so nothing that requires freshness can follow it.' },
    { key: 'debrief', label: '17. Athlete debrief', mins: 5,
      equipment: 'Tablet or printed report',
      why: 'Walk through the profile while it is fresh: where they are, what they are good at, what to develop. This is the part the athlete remembers.' }
  ];

  /* ======================================================================
     ORDER RATIONALE — what changed from the brief, and why
     ====================================================================== */
  var ORDER_RATIONALE = {
    summary: 'The order proposed in the original specification was sound for the first ten stages and has been kept almost unchanged. Three things were changed, and one recommendation is made that the app cannot enforce on its own.',
    changes: [
      { title: 'The movement screen moved BEFORE the warm-up',
        was: 'Movement screen was listed before the warm-up already, and that placement is correct — it is kept and the reason is now documented.',
        now: 'Screen cold, every time, and record that you did.',
        why: 'A screen performed after 15 minutes of mobility work measures the warm-up rather than the athlete, and an athlete screened warm on one occasion and cold on the next produces a change that means nothing. Consistency matters more here than which state you choose.' },
      { title: 'The 30-second sprint was REMOVED from the default single-session battery',
        was: '12-minute aerobic test, then recovery, then 30-second sprint, then the repeated-sprint test.',
        now: 'Repeated-sprint test (6 × 15 s / 45 s), then a recovery block, then the 12-minute aerobic test. The standalone 30-second sprint is a SEPARATE SESSION or a substitute for the repeated-sprint test — not an addition to it.',
        why: 'Three maximal bike tests in one session cannot all be valid. A 30-second all-out effort and a 6 × 15 s set measure heavily overlapping qualities, and performing both means at least one of them is contaminated. Worse, the brief\'s order put the 12-minute test FIRST, which guarantees that both subsequent maximal efforts are performed on an athlete who has just finished the hardest 12 minutes of their week. Peak power from sprint 1 of the repeated-sprint test already indexes maximal power output, so the standalone 30-second test adds little in a single-session battery. Both tests remain fully implemented: run the 30-second test when anaerobic power is the specific question, or on a second visit.' },
      { title: 'The glycolytic work moved BEFORE the aerobic test',
        was: '12-minute test, then recovery, then the sprints.',
        now: 'Sprints first, then a 20-30 minute recovery block, then the 12-minute test last.',
        why: 'Neither order is free of contamination, but they are not equally bad. A 12-minute maximal effort leaves an athlete unable to produce peak power for the rest of the day, whereas a 15-second sprint set followed by a genuine recovery block still allows a credible 12-minute effort. The sustained aerobic test is the more robust of the two to prior fatigue, so it absorbs the contamination. Whichever way round it is done, it MUST be done the same way every time and the order is part of the protocol version.' }
    ],
    twoSession: {
      title: 'The recommendation the app cannot enforce: split the battery',
      body: 'The single-session battery above is a commercial compromise and it should be described to the customer as one. The defensible version is two sessions separated by at least 24 hours: SESSION A is registration, anthropometry, movement screen, warm-up, all four power tests, the sprint and all the strength testing; SESSION B is the conditioning work — repeated-sprint test, recovery, then the 12-minute test, or the 30-second test in place of the repeated-sprint set. Session A takes about 70 minutes per athlete and Session B about 60. If the gym will only pay for one day, run the single-session battery, keep the order identical every time, and say plainly in the report that the conditioning results were obtained after a full battery of neuromuscular testing. Do not quietly compare a two-session result with a single-session one: that is a different protocol and needs a different protocol version.'
    },
    throughput: {
      title: 'Making it fit a real testing day',
      body: 'One athlete through the full single-session battery is roughly two and a half hours, most of it rest. That is 3 athletes a day in series, which is not a business. The battery is built to be run as PARALLEL STATIONS with a queue: Station 1 (registration, anthropometry, screen), Station 2 (warm-up and all four power tests plus the sprint), Station 3 (strength), Station 4 (the bikes). With three coaches and a 15-athlete squad, athletes rotate through stations while the bike station — which is the bottleneck, because it needs a machine per athlete — runs continuously. Two things must not be traded away for throughput: the REST PERIODS inside each test, and the ORDER in which an individual athlete meets the tests. If an athlete has to do the bike station before the strength station because that is where the space is, record it in the session notes — it is a protocol deviation, and it affects their strength numbers.'
    }
  };

  /* ======================================================================
     STANDARD OPERATING PROCEDURE
     ====================================================================== */
  var SOP = [
    { id: 'equipment', title: 'Equipment requirements',
      items: [
        'Jump mat or force plate. The SAME device for every athlete on a testing day, and the same device at retest. Record the model on every session.',
        'Electronic timing gates. If the gym has none, the sprint is recorded as NOT TESTED — reason: equipment. A hand-timed sprint may be recorded for coaching feedback but it is never benchmarked.',
        'Air bike. Record the brand and model. Results are only ever benchmarked against a reference set for the same machine family, because a Rogue Echo and an Assault bike do not report the same power for the same effort.',
        'Trap bar — record its mass, which is between roughly 25 kg and 32 kg depending on the bar, and include it in the load entered.',
        'Medicine balls: 4 kg and 3 kg as the PGP defaults. Record the mass used. A throw with a mass that has no reference set gets no percentile.',
        'Calibrated plates. Check a gym\'s plates against a known mass before the first testing day there — commercial rubber plates are frequently several percent out.',
        'Tape measure fixed to the floor, clear take-off line, non-slip landing surface.',
        'Chin-up bar high enough for a full dead hang, plus a dipping belt if the weighted test is being run.',
        'Bench and a competent spotter, or the bench press is NOT TESTED — reason: equipment.',
        'Heart-rate monitor where available. Optional, and never used to benchmark anything.',
        'Scales and a stadiometer. The same scales for the whole day.'
      ] },
    { id: 'calibration', title: 'Calibration and set-up checks',
      items: [
        'Before the first athlete: zero the scales, check the timing gates trigger at the expected height, confirm the jump device reads zero with nobody on it, and reset every bike console.',
        'Measure and mark the sprint start line 0.5 m behind the first gate, and the 10 m gate position, with tape. Do not eyeball it.',
        'Mark the throw and jump take-off lines with tape. They must not move during the day.',
        'Set each bike\'s seat position for each athlete and WRITE IT DOWN in the session. A different seat height changes the power output at retest.',
        'Photograph the set-up on the first testing day at a new gym. It is the fastest way to reproduce it next time.'
      ] },
    { id: 'order', title: 'Testing order',
      items: [
        'Follow the order on this page exactly. The order is part of the protocol version.',
        'If an athlete has to take the tests out of order because of space or equipment, record it in the session notes as a protocol deviation.',
        'Never run a strength test before a sprint or jump test for the same athlete.',
        'Never run the 12-minute aerobic test before any other maximal test for the same athlete.'
      ] },
    { id: 'warmup', title: 'Standardised warm-up',
      items: [
        '3 minutes easy cycling or skipping.',
        'Dynamic series: leg swings, walking lunge with rotation, lateral lunge, hip airplanes — 6 each side.',
        '2 minutes of pogos, ankle hops and low bilateral then single-leg hops.',
        '3 progressive runs over 15-20 m at roughly 70%, 85% and 95%, with 60 s between.',
        'Test-specific build-up sets as written in each test protocol.',
        'The warm-up is identical for every athlete and identical at retest. It is not adjusted to how an individual feels.'
      ] },
    { id: 'rest', title: 'Rest periods',
      items: [
        'Jumps and throws: 45-60 s between attempts.',
        'Sprints: 90-120 s between attempts. This is the rest period most commonly cut, and cutting it invalidates the test.',
        'Strength top-end attempts: 3 minutes.',
        'Between the repeated-sprint test and the 12-minute test: minimum 20-30 minutes of genuine recovery.',
        'Between the 30-second test and the repeated-sprint test, if both are being run: this combination is not recommended in one session. If it happens anyway, minimum 10 minutes, and say so in the notes.'
      ] },
    { id: 'conditions', title: 'Footwear, surface and conditions',
      items: [
        'Same footwear for every test within a session, and the same footwear at retest. Record it if it changes.',
        'Jumps and sprints on the same surface every time. Record the surface. A sprung floor and a concrete floor do not produce the same jump height.',
        'Lifting: no belt, or the same belt use recorded. No lifting straps — grip is part of the trap-bar test.',
        'Bike tests: same fan setting and same room conditions. A hot, still room lowers 12-minute power.',
        'Test at a consistent time of day within a testing block where the schedule allows it, and record the time.'
      ] },
    { id: 'preparation', title: 'Athlete preparation',
      items: [
        'No hard training in the 24 hours before testing. No hard sparring in the 48 hours before.',
        'No competition or weight cut in the 7 days before. An athlete who has just cut weight is not being measured, they are being measured dehydrated.',
        'Normal hydration and a normal meal 2-3 hours before. Do not test fasted.',
        'Caffeine: either the athlete\'s normal dose or none, but the amount and the timing are RECORDED either way, and kept the same at retest. Caffeine meaningfully changes power and endurance results.',
        'At least one familiarisation exposure to the battery before the first benchmarked test, particularly for the 12-minute bike test, which is as much a pacing skill as a fitness measure.'
      ] },
    { id: 'exclusion', title: 'Injury, illness and restriction',
      items: [
        'Any current injury, pain, illness or medical restriction: the affected tests are recorded as NOT TESTED with the reason. The rest of the battery proceeds if it is appropriate.',
        'Any pain during the warm-up or during a test: stop that test. Record it. Refer to a qualified medical professional.',
        'This system does not diagnose anything and does not provide medical clearance. If you find yourself about to write an opinion about what is wrong with an athlete, stop and refer.',
        'An athlete who does not have the technical competence to be loaded safely is recorded as NOT TESTED — reason: technique. This is not a failure and it does not count against them; it is information about what to coach next.'
      ] },
    { id: 'recording', title: 'Recording procedure',
      items: [
        'Enter data directly into the app as each attempt happens. Do not write it on paper to type up later — that is where the transcription errors come from.',
        'Enter every attempt, not just the best one. The app takes the best and uses the spread between attempts to flag suspect data.',
        'Record equipment on every session, even when it has not changed.',
        'Record WHY a test was not performed. Every time.',
        'Confirm the protocol checkbox only if the protocol was actually followed.',
        'One person counts chin-ups for the whole day. One person scores the movement screen for the whole day.',
        'Export a JSON backup before leaving the gym. The database is on one device in one browser, and an export is the only backup that exists.'
      ] },
    { id: 'retest', title: 'Retest procedure',
      items: [
        'Same protocol version, same equipment, same warm-up, same order, same footwear, same time of day, same tester where possible.',
        '8-16 weeks is the usual interval. Shorter than about 6 weeks and most changes will sit inside measurement error.',
        'If the equipment changed, the app flags it and the change is not interpretable as adaptation. Say so rather than explaining it away.',
        'If the protocol changed materially, bump the protocol version. The app will then refuse to compare across versions, which is the correct behaviour.',
        'Review the previous report before the retest so you know what you were trying to change.'
      ] }
  ];

  /* ======================================================================
     ASSUMPTIONS AND LIMITATIONS
     ====================================================================== */
  var LIMITATIONS = [
    { title: 'Every shipped standard is provisional',
      body: 'Not one numeric standard in this app is taken from a published study. All of them are PGP provisional standards: coaching-judgement reference points chosen to be plausible for trained combat athletes. They are labelled as such everywhere they appear, and percentiles derived from them are rounded to the nearest 5 because they do not support finer resolution. Replacing them with published data, or with PGP\'s own accumulated data, is the single highest-value improvement available to this system. The Benchmarks page carries the reading list.' },
    { title: 'Norms are population-specific',
      body: 'A percentile only means something relative to the population the reference set was built from. A 70th percentile against trained combat athletes is a different statement from a 70th percentile against the general population or against professional athletes, and the app names the population on every benchmark for that reason.' },
    { title: 'Different equipment produces different results',
      body: 'Air bikes, jump mats, force plates, timing gates and trap bars all differ between manufacturers and models. The app records the equipment, refuses to benchmark a result against a reference set built on a different machine family, and flags an equipment change between a test and a retest. This is the most common way field testing produces meaningless "improvements".' },
    { title: 'Protocols must remain consistent',
      body: 'Change the ball mass, the recovery period, the number of sprints, the rep scheme, the arm position on the jump, or the start distance behind the timing gate, and you have a different test. The app stores the protocol version and the configuration with every result and will not compare across them.' },
    { title: 'Percentiles are not fighting ability',
      body: 'This system measures physical performance qualities. It does not measure technical skill, tactical ability, decision-making under pressure, durability, fight experience, or anything about how an athlete competes. The published evidence that physical test scores separate higher-level from lower-level combat athletes is mixed at best. A high profile means the athlete is physically well prepared, and nothing more than that.' },
    { title: 'Performance testing does not diagnose injury',
      body: 'Nothing in this system assesses injury risk, and the movement screen is presented as structured coach observation for exactly that reason. The published evidence for movement screens as injury-prediction tools is weak. Inter-limb differences are reported as performance differences, not risk. If something hurts, refer — do not interpret.' },
    { title: 'Some tests have much stronger evidence than others',
      body: 'The countermovement jump, the broad jump and the electronically timed 10 m sprint are reliable, well-understood measures. Estimated 1RMs carry the error of the test plus the error of the prediction equation. The rotational throw is highly technique-dependent. The air-bike tests have no published reliability data that could be located at all, which is why the app treats them cautiously and why a PGP reliability study on the bikes is the first piece of internal research worth doing. The movement screen has low inter-rater reliability and is not comparable between assessors.' },
    { title: 'The reliability estimates are placeholders',
      body: 'The typical-error values used to decide whether a change at retest is meaningful are conservative PGP placeholders, not measured values. Every verdict drawn from them is labelled provisional. Replacing them requires PGP\'s own test-retest study: two trials on separate days, the same tester, the same equipment, at least ten athletes, for each test in the battery.' },
    { title: 'There is no validated overall score',
      body: 'No single number summarises this profile, by design. Averaging power, strength, aerobic capacity and repeated-effort percentiles implies those qualities are interchangeable and equally important, which is not defensible — two athletes with an identical composite can need opposite training. A composite index can be switched on in Settings if a customer insists, and it is then labelled as an unvalidated convenience index.' },
    { title: 'PGP provisional standards must be validated',
      body: 'The plan is that PGP\'s own database becomes the primary reference source. The app computes internal norms as soon as a matched group of athletes reaches the configured minimum, shows them as a supplementary comparison, and promotes them to the primary reference at a larger sample. Until then the honest description to a customer is: "benchmarked against PGP provisional standards, which are being replaced by PGP\'s own data as the database grows."' },
    { title: 'Missing data is missing, not zero',
      body: 'A test that was not performed has no value, no percentile, and no effect on any category score or on the strengths and priorities lists. It is recorded with the reason it was not performed. Nowhere in this system does an absent result count against an athlete.' },
    { title: 'This is a single-device, single-browser database',
      body: 'There is no server and no account. The data lives in one browser on one device. Clearing site data deletes it. An exported JSON file is the only backup. Export after every testing day.' }
  ];

  var API = { TESTING_ORDER: TESTING_ORDER, ORDER_RATIONALE: ORDER_RATIONALE,
              SOP: SOP, LIMITATIONS: LIMITATIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.PGP = root.PGP || {};
  root.PGP.Protocol = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
