/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/data/sample.js — FICTIONAL SAMPLE AND QUALITY-CONTROL DATA
   --------------------------------------------------------------------------
   EVERY ATHLETE IN THIS FILE IS FICTIONAL. The values are realistic but
   invented, and exist only to demonstrate the app and to exercise the
   calculation engine. None of it is real athlete data, and none of it should
   ever be used as a reference standard — it is excluded from PGP internal
   norm calculations by the demo flag on each athlete.

   demoDatabase()  a gym with a headline sample athlete (tested twice) plus a
                   fictional squad, large enough to demonstrate how PGP
                   internal norms switch on.
   qcDatabase()    the seven quality-control athletes A-G from the build
                   specification: normal, very high, very low, missing tests,
                   different body weight, retest, and invalid input.
   ========================================================================== */
(function (root) {
  'use strict';

  var isNode = (typeof require === 'function' && typeof module !== 'undefined');
  var Model    = isNode ? require('../core/model.js')       : root.PGP.Model;
  var Settings = isNode ? require('../config/settings.js')  : root.PGP.Settings;

  /* Deterministic pseudo-random generator, so the demo data is identical on
     every machine and every reload. */
  function rng(seed) {
    var s = seed;
    return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  }
  function jitter(rand, base, spread, dp) {
    var v = base + (rand() - 0.5) * 2 * spread;
    var f = Math.pow(10, dp === undefined ? 1 : dp);
    return Math.round(v * f) / f;
  }

  var STD_EQUIPMENT = {
    jumpDevice: 'jump_mat', timingDevice: 'gates_dual_beam', timingMethod: 'electronic',
    airBike: 'assault_elite', trapBar: 'standard_25', trapBarMassKg: 25,
    bench: 'flat_standard', benchBarMassKg: 20, pullUpBar: 'straight_fixed',
    seatPosition: 'Seat post 4, handle 2', notes: ''
  };

  var CLEAN_READINESS = {
    answers: { injury: 'no', illness: 'no', fatigue: 'no', sparring: 'no',
               competition: 'no', medical: 'no', warmup_pain: 'no',
               caffeine: 'no', food: 'yes', familiarised: 'yes' },
    notes: '', flagged: false
  };

  /* Build a session from a compact spec. */
  function mk(spec) {
    var s = Model.newSession({
      athleteId: spec.athleteId, date: spec.date, gymId: spec.gymId,
      coach: spec.coach || 'Paolo Prato', tester: spec.tester || 'Paolo Prato',
      bodyMassKg: spec.bw, heightCm: spec.ht, ageAtTest: spec.age,
      equipment: Object.assign({}, STD_EQUIPMENT, spec.equipment || {}),
      readiness: spec.readiness || JSON.parse(JSON.stringify(CLEAN_READINESS)),
      protocolConfirmed: spec.protocolConfirmed !== false,
      notes: spec.notes || '', injuryNotes: spec.injuryNotes || '',
      complete: true
    });
    var r = s.results;

    function set(id, raw, extra) {
      r[id].status = 'tested';
      r[id].raw = raw || {};
      Object.assign(r[id], extra || {});
    }
    function skip(id, reason, note) {
      r[id].status = 'not_tested';
      r[id].reason = reason;
      r[id].notes = note || '';
    }

    var d = spec.data || {};
    if (d.cmj) set('cmj', {}, { attempts: { height_cm: d.cmj } });
    else if (d.cmjSkip) skip('cmj', d.cmjSkip[0], d.cmjSkip[1]);

    if (d.bj) set('broad_jump', {}, { attempts: { distance_cm: d.bj } });
    else if (d.bjSkip) skip('broad_jump', d.bjSkip[0], d.bjSkip[1]);

    if (d.slbj) set('sl_broad_jump', { left_cm: d.slbj[0], right_cm: d.slbj[1] });
    else if (d.slbjSkip) skip('sl_broad_jump', d.slbjSkip[0], d.slbjSkip[1]);

    if (d.mb) set('mb_throw', { ball_mass_kg: d.mb[0], left_cm: d.mb[1], right_cm: d.mb[2] });
    else if (d.mbSkip) skip('mb_throw', d.mbSkip[0], d.mbSkip[1]);

    if (d.sprint) set('sprint_10m', d.sprint.extra || {}, { attempts: { time_10m_s: d.sprint.attempts } });
    else if (d.sprintSkip) skip('sprint_10m', d.sprintSkip[0], d.sprintSkip[1]);

    if (d.trapbar) set('trapbar', { load_kg: d.trapbar[0], reps: d.trapbar[1] },
                       { notes: d.trapbarNote || '' });
    else if (d.trapbarSkip) skip('trapbar', d.trapbarSkip[0], d.trapbarSkip[1]);

    if (d.chin !== undefined) set('chinup', { reps: d.chin });
    else if (d.chinSkip) skip('chinup', d.chinSkip[0], d.chinSkip[1]);

    if (d.wchin) set('weighted_chinup', { added_kg: d.wchin[0], reps: d.wchin[1] });
    else if (d.wchinSkip) skip('weighted_chinup', d.wchinSkip[0], d.wchinSkip[1]);

    if (d.bench) set('bench', { load_kg: d.bench[0], reps: d.bench[1] });
    else if (d.benchSkip) skip('bench', d.benchSkip[0], d.benchSkip[1]);

    if (d.aer) set('bike_12min', d.aer);
    else if (d.aerSkip) skip('bike_12min', d.aerSkip[0], d.aerSkip[1]);
    if (d.aerIncomplete) { r.bike_12min.status = 'incomplete'; r.bike_12min.raw = d.aerIncomplete; }

    if (d.ana) set('bike_30s', d.ana);
    else if (d.anaSkip) skip('bike_30s', d.anaSkip[0], d.anaSkip[1]);

    if (d.rep) {
      r.bike_repeated.status = 'tested';
      r.bike_repeated.config = d.repConfig || { sprints: 6, workS: 15, recoveryS: 45 };
      r.bike_repeated.sprints = d.rep.map(function (p) {
        return { peak_watts: p[0], mean_watts: p[1] };
      });
    } else if (d.repSkip) skip('bike_repeated', d.repSkip[0], d.repSkip[1]);

    if (d.movement) {
      r.movement_screen.status = 'tested';
      r.movement_screen.items = d.movement;
      r.movement_screen.assessor = spec.tester || 'Paolo Prato';
      r.movement_screen.notes = d.movementNote || '';
    } else if (d.movementSkip) skip('movement_screen', d.movementSkip[0], d.movementSkip[1]);

    return Model.deriveSession(s);
  }

  /* ======================================================================
     DEMO DATABASE
     ====================================================================== */
  function demoDatabase() {
    var db = Model.newDatabase();

    var gymA = Model.newGym({ id: 'gym_demo_a', name: 'Iron Crown MMA (sample)',
      city: 'Manchester', country: 'UK', primarySport: 'mma', aggregateConsent: true,
      notes: 'FICTIONAL sample gym used to demonstrate the gym dashboard.' });
    var gymB = Model.newGym({ id: 'gym_demo_b', name: 'Northside Muay Thai (sample)',
      city: 'Leeds', country: 'UK', primarySport: 'muay_thai', aggregateConsent: true,
      notes: 'FICTIONAL sample gym.' });
    db.gyms.push(gymA, gymB);

    /* ---- headline sample athlete, tested twice --------------------- */
    var sample = Model.newAthlete({
      id: 'ath_sample', name: 'Sample Athlete', athleteNumber: 1,
      dob: '2001-04-12', sex: 'male', sport: 'mma', competitiveLevel: 'amateur',
      trainingAgeYears: 7, sncTrainingAgeYears: 2, weightClass: 'Welterweight (77 kg)',
      stance: 'orthodox', gymId: gymA.id, coach: 'Paolo Prato',
      notes: 'FICTIONAL DEMONSTRATION ATHLETE. Not real data.',
      dataConsent: true
    });
    sample.isDemo = true;
    db.athletes.push(sample);

    /* Test 1 — baseline */
    db.sessions.push(mk({
      athleteId: sample.id, gymId: gymA.id, date: '2026-03-14',
      bw: 75.4, ht: 178, age: 24,
      notes: 'Baseline assessment. First exposure to the 12-minute bike test — pacing was conservative in the first half, so the aerobic result is likely an underestimate. Strength testing was the athlete\'s first time under meaningful load.',
      data: {
        cmj: [37.2, 38.5, 37.9],
        bj: [212, 216, 214],
        slbj: [150, 156],
        mb: [4, 598, 626],
        sprint: { attempts: [1.88, 1.86, 1.87], extra: { time_20m_s: 3.19 } },
        trapbar: [120, 3], trapbarNote: 'Technique competent but tentative under load. High handles.',
        chin: 11,
        wchin: [7.5, 3],
        bench: [80, 3],
        aer: { mean_watts: 165, calories: 149, mean_hr: 174, peak_hr: 188 },
        ana: { peak_watts: 1150, mean_watts: 770, min_watts: 570 },
        rep: [[831, 710], [784, 670], [749, 640], [713, 610], [684, 585], [655, 560]],
        movement: { ankle_df_l: 1, ankle_df_r: 1, hip_ir_l: 1, hip_ir_r: 2,
                    hip_er_l: 2, hip_er_r: 2, shoulder_flex_l: 2, shoulder_flex_r: 1,
                    thoracic_rot_l: 1, thoracic_rot_r: 2, sl_squat_l: 2, sl_squat_r: 2 },
        movementNote: 'Both ankles restricted in knee-to-wall. Left thoracic rotation the more limited side.'
      }
    }));

    /* Test 2 — retest 12 weeks later */
    db.sessions.push(mk({
      athleteId: sample.id, gymId: gymA.id, date: '2026-06-13',
      bw: 76.8, ht: 178, age: 25,
      notes: 'Retest after a 13-week block emphasising maximal strength and aerobic development. Second exposure to the 12-minute test, so pacing was better than at baseline — some of the aerobic change reflects that rather than adaptation.',
      data: {
        cmj: [42.9, 44.2, 43.6],
        bj: [228, 232, 230],
        slbj: [162, 169],
        mb: [4, 695, 728],
        sprint: { attempts: [1.79, 1.76, 1.78], extra: { time_20m_s: 3.06 } },
        trapbar: [147.5, 3], trapbarNote: 'Technique competent and noticeably more confident under load.',
        chin: 15,
        wchin: [15, 3],
        bench: [90, 3],
        aer: { mean_watts: 200, calories: 181, mean_hr: 177, peak_hr: 190 },
        ana: { peak_watts: 1252, mean_watts: 836, min_watts: 620 },
        rep: [[936, 800], [878, 750], [837, 715], [796, 680], [761, 650], [731, 625]],
        movement: { ankle_df_l: 2, ankle_df_r: 1, hip_ir_l: 1, hip_ir_r: 2,
                    hip_er_l: 2, hip_er_r: 2, shoulder_flex_l: 2, shoulder_flex_r: 2,
                    thoracic_rot_l: 2, thoracic_rot_r: 2, sl_squat_l: 2, sl_squat_r: 2 },
        movementNote: 'Left ankle improved with daily dorsiflexion work. Right ankle unchanged.'
      }
    }));

    /* ---- fictional squad, so internal norms can switch on ---------- */
    /* 24 male then 12 female fictional athletes. The male group is sized so
       that the demo crosses the internal-norm minimum sample size and the
       "compared with N athletes in the PGP database" mechanism can be seen
       working; the female group deliberately stays below it, which is the
       realistic situation and shows the app withholding rather than guessing. */
    var firstNames = ['Dev', 'Marco', 'Kai', 'Tomasz', 'Ade', 'Rhys', 'Jonah', 'Luca',
      'Samir', 'Ben', 'Eoin', 'Yusuf', 'Callum', 'Nate', 'Osman', 'Finn', 'Dario', 'Hakim',
      'Emre', 'Joss', 'Ravi', 'Tyler', 'Kofi', 'Milos',
      'Leah', 'Nadia', 'Mia', 'Erin', 'Zoya', 'Freya', 'Tess', 'Ada', 'Simone', 'Noor',
      'Ines', 'Bea'];
    var rand = rng(20260919);

    firstNames.forEach(function (fn, i) {
      var female = i >= 24;
      var sport = (i % 3 === 0) ? 'mma' : (i % 3 === 1 ? 'muay_thai' : 'boxing');
      var gym = (i % 4 === 0) ? gymB : gymA;
      var level = (i % 5 === 0) ? 'professional' : (i % 5 === 1 ? 'semi_pro' : 'amateur');
      var bw = female ? jitter(rand, 62, 9, 1) : jitter(rand, 79, 13, 1);
      var ability = rand();                         /* 0 = weaker, 1 = stronger */
      var a = Model.newAthlete({
        id: 'ath_demo_' + i, name: fn + ' (sample ' + (i + 1) + ')',
        athleteNumber: i + 2,
        dob: (1994 + (i % 10)) + '-0' + (1 + (i % 9)) + '-1' + (i % 9),
        sex: female ? 'female' : 'male', sport: sport, competitiveLevel: level,
        trainingAgeYears: 3 + (i % 9), sncTrainingAgeYears: (i % 5),
        gymId: gym.id, coach: 'Paolo Prato',
        notes: 'FICTIONAL sample athlete.', dataConsent: true
      });
      a.isDemo = true;
      db.athletes.push(a);

      var f = female ? 0.76 : 1.0;                  /* crude scaling for the demo */
      var k = 0.85 + ability * 0.3;                 /* ability multiplier */
      db.sessions.push(mk({
        athleteId: a.id, gymId: gym.id,
        date: (i % 2 === 0) ? '2026-05-' + String(4 + (i % 20)).padStart(2, '0')
                            : '2026-07-' + String(3 + (i % 20)).padStart(2, '0'),
        bw: bw, ht: female ? jitter(rand, 167, 8, 0) : jitter(rand, 179, 9, 0),
        age: 22 + (i % 12),
        data: {
          cmj: [jitter(rand, 38 * f * k, 2, 1), jitter(rand, 39.5 * f * k, 2, 1), jitter(rand, 39 * f * k, 2, 1)],
          bj: [jitter(rand, 218 * f * k, 8, 0), jitter(rand, 224 * f * k, 8, 0), jitter(rand, 221 * f * k, 8, 0)],
          slbj: [jitter(rand, 158 * f * k, 9, 0), jitter(rand, 163 * f * k, 9, 0)],
          mb: [female ? 3 : 4, jitter(rand, (female ? 495 : 645) * k, 45, 0), jitter(rand, (female ? 515 : 672) * k, 45, 0)],
          sprint: { attempts: [jitter(rand, (female ? 2.00 : 1.83) / k, 0.05, 2),
                               jitter(rand, (female ? 1.98 : 1.81) / k, 0.05, 2),
                               jitter(rand, (female ? 1.99 : 1.82) / k, 0.05, 2)] },
          trapbar: [Math.round(bw * (female ? 1.55 : 1.85) * k / 2.5) * 2.5, 3],
          chin: Math.max(0, Math.round((female ? 5 : 13) * k - (bw - (female ? 62 : 79)) * 0.12)),
          bench: (i % 3 === 0) ? [Math.round(bw * (female ? 0.72 : 1.12) * k / 2.5) * 2.5, 3] : null,
          benchSkip: (i % 3 === 0) ? null : ['equipment', 'No bench available at this facility.'],
          wchinSkip: ['time', 'Optional test — not run on this testing day.'],
          aer: { mean_watts: Math.round(bw * (female ? 2.2 : 2.6) * k), mean_hr: Math.round(jitter(rand, 174, 8, 0)) },
          ana: { peak_watts: Math.round(bw * (female ? 10.2 : 12.8) * k),
                 mean_watts: Math.round(bw * (female ? 7.0 : 9.1) * k) },
          rep: (function () {
            var base = bw * (female ? 7.6 : 10.0) * k, out = [], dec = 0.965 + (ability * 0.02);
            for (var q = 0; q < 6; q++) {
              var mw = Math.round(base * Math.pow(dec, q));
              out.push([Math.round(mw * 1.16), mw]);
            }
            return out;
          })(),
          movement: { ankle_df_l: (i % 3 === 0) ? 1 : 2, ankle_df_r: (i % 4 === 0) ? 1 : 2,
                      hip_ir_l: (i % 5 === 0) ? 1 : 2, hip_ir_r: 2,
                      hip_er_l: 2, hip_er_r: 2,
                      shoulder_flex_l: (i % 6 === 0) ? 1 : 2, shoulder_flex_r: 2,
                      thoracic_rot_l: (i % 3 === 1) ? 1 : 2, thoracic_rot_r: 2,
                      sl_squat_l: (i % 7 === 0) ? 1 : 2, sl_squat_r: 2 }
        }
      }));
    });

    /* a testing-day event record for the demo */
    var evt = Model.newEvent({
      id: 'evt_demo', name: 'Iron Crown MMA — Squad Testing Day (sample)',
      gymId: gymA.id, date: '2026-05-16', tester: 'Paolo Prato',
      queue: db.athletes.slice(0, 8).map(function (a, i) {
        return { athleteId: a.id, number: i + 1,
                 status: i < 6 ? 'complete' : (i === 6 ? 'in_progress' : 'not_started') };
      }),
      equipment: STD_EQUIPMENT,
      notes: 'FICTIONAL sample event.'
    });
    db.events.push(evt);

    db.isDemo = true;
    return db;
  }

  /* ======================================================================
     QUALITY-CONTROL DATABASE — athletes A to G
     ====================================================================== */
  function qcDatabase() {
    var db = Model.newDatabase();
    var gym = Model.newGym({ id: 'gym_qc', name: 'QC Test Gym', primarySport: 'mma',
      aggregateConsent: true, notes: 'Quality-control fixtures.' });
    db.gyms.push(gym);

    function athlete(id, name, o) {
      var a = Model.newAthlete(Object.assign({ id: id, name: name, gymId: gym.id,
        sport: 'mma', competitiveLevel: 'amateur', coach: 'QC' }, o));
      a.isDemo = true;
      db.athletes.push(a);
      return a;
    }

    /* A — normal results across the board */
    var A = athlete('qc_a', 'QC-A Normal', { sex: 'male', dob: '1998-05-05' });
    db.sessions.push(mk({ athleteId: A.id, gymId: gym.id, date: '2026-09-01',
      bw: 77.0, ht: 178, age: 28, notes: 'QC fixture A — mid-range results.',
      data: {
        cmj: [38.0, 39.5, 38.8], bj: [220, 224, 222], slbj: [158, 164],
        mb: [4, 630, 665], sprint: { attempts: [1.83, 1.81, 1.82] },
        trapbar: [145, 3], chin: 12, bench: [88, 3],
        aer: { mean_watts: 200 }, ana: { peak_watts: 985, mean_watts: 700, min_watts: 540 },
        rep: [[950, 820], [925, 795], [900, 772], [880, 752], [860, 735], [845, 722]],
        movement: { ankle_df_l: 2, ankle_df_r: 2, hip_ir_l: 2, hip_ir_r: 2, hip_er_l: 2,
                    hip_er_r: 2, shoulder_flex_l: 2, shoulder_flex_r: 2, thoracic_rot_l: 1,
                    thoracic_rot_r: 2, sl_squat_l: 2, sl_squat_r: 2 }
      } }));

    /* B — very high results */
    var B = athlete('qc_b', 'QC-B Very High', { sex: 'male', dob: '1997-02-02',
      competitiveLevel: 'professional' });
    db.sessions.push(mk({ athleteId: B.id, gymId: gym.id, date: '2026-09-02',
      bw: 79.5, ht: 181, age: 29, notes: 'QC fixture B — top-end results, tests the upper extrapolation.',
      data: {
        cmj: [54.0, 56.2, 55.1], bj: [268, 275, 271], slbj: [198, 204],
        mb: [4, 880, 915], sprint: { attempts: [1.64, 1.62, 1.63] },
        trapbar: [235, 3], chin: 26, wchin: [50, 3], bench: [145, 3],
        aer: { mean_watts: 310 }, ana: { peak_watts: 1450, mean_watts: 980, min_watts: 780 },
        rep: [[1380, 1180], [1362, 1160], [1340, 1145], [1325, 1130], [1310, 1118], [1298, 1108]],
        movement: { ankle_df_l: 2, ankle_df_r: 2, hip_ir_l: 2, hip_ir_r: 2, hip_er_l: 2,
                    hip_er_r: 2, shoulder_flex_l: 2, shoulder_flex_r: 2, thoracic_rot_l: 2,
                    thoracic_rot_r: 2, sl_squat_l: 2, sl_squat_r: 2 }
      } }));

    /* C — very low results */
    var C = athlete('qc_c', 'QC-C Very Low', { sex: 'male', dob: '1999-09-09',
      competitiveLevel: 'recreational', trainingAgeYears: 1 });
    db.sessions.push(mk({ athleteId: C.id, gymId: gym.id, date: '2026-09-03',
      bw: 74.0, ht: 175, age: 27, notes: 'QC fixture C — low-end results, tests the lower extrapolation and the clamp.',
      data: {
        cmj: [24.0, 25.5, 24.8], bj: [172, 178, 175], slbj: [112, 121],
        mb: [4, 395, 430], sprint: { attempts: [2.08, 2.05, 2.06] },
        trapbar: [82.5, 5], chin: 3, bench: [52.5, 5],
        aer: { mean_watts: 128 }, ana: { peak_watts: 560, mean_watts: 420, min_watts: 280 },
        rep: [[540, 455], [498, 418], [462, 388], [430, 362], [408, 342], [392, 328]],
        movement: { ankle_df_l: 0, ankle_df_r: 1, hip_ir_l: 1, hip_ir_r: 1, hip_er_l: 1,
                    hip_er_r: 2, shoulder_flex_l: 0, shoulder_flex_r: 1, thoracic_rot_l: 1,
                    thoracic_rot_r: 1, sl_squat_l: 1, sl_squat_r: 1 }
      } }));

    /* D — missing tests for a range of legitimate reasons */
    var D = athlete('qc_d', 'QC-D Missing Tests', { sex: 'male', dob: '2000-01-20' });
    db.sessions.push(mk({ athleteId: D.id, gymId: gym.id, date: '2026-09-04',
      bw: 70.5, ht: 174, age: 26,
      notes: 'QC fixture D — small gym, no sprint space, no bike, no bench, sore shoulder. Confirms missing data is never treated as zero.',
      equipment: { airBike: 'unknown', timingDevice: 'unknown' },
      data: {
        cmj: [40.0, 41.5, 40.9], bj: [226, 230, 228], slbj: [160, 166],
        mb: [4, 650, 690],
        sprintSkip: ['facility', 'No straight run of 18 m available at this gym.'],
        trapbar: [155, 3],
        chinSkip: ['injury', 'Athlete reported right shoulder discomfort during the warm-up. Test not performed; referred on.'],
        benchSkip: ['equipment', 'No bench or spotter available.'],
        aerSkip: ['equipment', 'No air bike at this facility.'],
        anaSkip: ['equipment', 'No air bike at this facility.'],
        repSkip: ['equipment', 'No air bike at this facility.'],
        movement: { ankle_df_l: 2, ankle_df_r: 2, hip_ir_l: 2, hip_ir_r: 2, hip_er_l: 2,
                    hip_er_r: 2, shoulder_flex_l: 1, shoulder_flex_r: null,
                    thoracic_rot_l: 2, thoracic_rot_r: 2, sl_squat_l: 2, sl_squat_r: 2 },
        movementNote: 'Right shoulder flexion not assessed because of reported discomfort. Left the item blank rather than scoring it.'
      },
      injuryNotes: 'Right shoulder discomfort reported on the day. Referred to a qualified medical professional. No diagnosis made or implied here.',
      readiness: { answers: { injury: 'yes', illness: 'no', fatigue: 'no', sparring: 'no',
        competition: 'no', medical: 'no', warmup_pain: 'yes', caffeine: 'yes', food: 'yes',
        familiarised: 'no' }, notes: 'Right shoulder. Pulling tests restricted.', flagged: true } }));

    /* E — heavier female athlete, different body-mass band, different ball mass */
    var E2 = athlete('qc_e', 'QC-E Different Bodyweight', { sex: 'female', dob: '1996-11-11',
      sport: 'muay_thai', competitiveLevel: 'professional' });
    db.sessions.push(mk({ athleteId: E2.id, gymId: gym.id, date: '2026-09-05',
      bw: 68.5, ht: 170, age: 29,
      notes: 'QC fixture E — female, above the light body-mass band, 3 kg ball. Confirms sex-specific and band-specific matching.',
      data: {
        cmj: [31.0, 32.4, 31.8], bj: [192, 197, 195], slbj: [136, 142],
        mb: [3, 520, 556], sprint: { attempts: [1.96, 1.94, 1.95] },
        trapbar: [110, 3], chin: 6, bench: [57.5, 3],
        aer: { mean_watts: 158 }, ana: { peak_watts: 760, mean_watts: 540, min_watts: 430 },
        rep: [[735, 620], [716, 602], [698, 586], [682, 572], [668, 560], [656, 550] ],
        movement: { ankle_df_l: 2, ankle_df_r: 2, hip_ir_l: 2, hip_ir_r: 2, hip_er_l: 2,
                    hip_er_r: 2, shoulder_flex_l: 2, shoulder_flex_r: 2, thoracic_rot_l: 2,
                    thoracic_rot_r: 2, sl_squat_l: 2, sl_squat_r: 2 }
      } }));

    /* F — retest, including a protocol change on the repeated-sprint test */
    var F = athlete('qc_f', 'QC-F Retest', { sex: 'male', dob: '1995-06-06' });
    db.sessions.push(mk({ athleteId: F.id, gymId: gym.id, date: '2026-03-06',
      bw: 83.0, ht: 183, age: 30, notes: 'QC fixture F — baseline.',
      data: {
        cmj: [36.0, 37.2, 36.6], bj: [214, 218, 216], slbj: [150, 157],
        mb: [4, 610, 648], sprint: { attempts: [1.88, 1.86, 1.87] },
        trapbar: [150, 3], chin: 9, bench: [90, 3],
        aer: { mean_watts: 196 }, ana: { peak_watts: 990, mean_watts: 705, min_watts: 545 },
        rep: [[960, 826], [935, 800], [910, 778], [888, 758], [868, 740], [852, 727]],
        movement: { ankle_df_l: 1, ankle_df_r: 1, hip_ir_l: 2, hip_ir_r: 2, hip_er_l: 2,
                    hip_er_r: 2, shoulder_flex_l: 2, shoulder_flex_r: 2, thoracic_rot_l: 1,
                    thoracic_rot_r: 1, sl_squat_l: 2, sl_squat_r: 2 }
      } }));
    db.sessions.push(mk({ athleteId: F.id, gymId: gym.id, date: '2026-09-06',
      bw: 84.2, ht: 183, age: 31,
      notes: 'QC fixture F — retest after 26 weeks. Repeated-sprint protocol was changed to 5 x 20 s / 60 s, which makes it a different test.',
      data: {
        cmj: [39.5, 40.8, 40.1], bj: [222, 227, 224], slbj: [158, 164],
        mb: [4, 645, 688], sprint: { attempts: [1.84, 1.82, 1.83] },
        trapbar: [172.5, 3], chin: 12, bench: [95, 3],
        aer: { mean_watts: 228 }, ana: { peak_watts: 1035, mean_watts: 748, min_watts: 592 },
        repConfig: { sprints: 5, workS: 20, recoveryS: 60 },
        rep: [[1000, 858], [978, 836], [956, 818], [938, 802], [922, 790]],
        movement: { ankle_df_l: 2, ankle_df_r: 1, hip_ir_l: 2, hip_ir_r: 2, hip_er_l: 2,
                    hip_er_r: 2, shoulder_flex_l: 2, shoulder_flex_r: 2, thoracic_rot_l: 2,
                    thoracic_rot_r: 1, sl_squat_l: 2, sl_squat_r: 2 }
      } }));

    /* G — invalid / implausible input throughout */
    var G = athlete('qc_g', 'QC-G Invalid Input', { sex: 'male', dob: '1997-07-07' });
    db.sessions.push(mk({ athleteId: G.id, gymId: gym.id, date: '2026-09-07',
      bw: 10, ht: 178, age: 29,
      notes: 'QC fixture G — deliberately bad data. Every value here should be flagged, not silently corrected.',
      protocolConfirmed: false,
      equipment: { jumpDevice: 'unknown', airBike: 'unknown', trapBarMassKg: null,
                   timingDevice: 'handheld', timingMethod: 'hand' },
      data: {
        cmj: [-5, 140, 42], bj: [900, 220, 225], slbj: [160, 40],
        mb: [4, 3000, 600], sprint: { attempts: [0.2, 1.8, 1.9], extra: { time_20m_s: 0.15 } },
        trapbar: [5000, 3], chin: 95, wchin: [0, 3], bench: [100, 25],
        aer: { mean_watts: 2000, mean_hr: 200, peak_hr: 150 },
        ana: { peak_watts: 500, mean_watts: 800, min_watts: 900 },
        /* sprint 1 has mean above peak (an impossible reading) AND the set
           rises across sprints, which is what a paced opening sprint looks
           like — both must be caught. */
        rep: [[500, 520], [600, 540], [650, 560], [700, 580], [750, 600], [800, 620]],
        movement: { ankle_df_l: 2, ankle_df_r: 2 }
      } }));

    db.isDemo = true;
    db.isQC = true;
    return db;
  }

  var API = { demoDatabase: demoDatabase, qcDatabase: qcDatabase, makeSession: mk,
              STD_EQUIPMENT: STD_EQUIPMENT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.PGP = root.PGP || {};
  root.PGP.Sample = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
