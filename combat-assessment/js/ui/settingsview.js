/* ==========================================================================
   js/ui/settingsview.js — SETTINGS (scoring, thresholds, weights, data, QC)
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;
  var tab = 'scoring';

  function render(mount) {
    var html = '<div class="pg-head"><h1 class="pg-title">Settings</h1>' +
      '<p class="pg-sub">Everything the scoring engine uses is editable here, and every change is stored with your ' +
      'database. Change a scoring rule and every report recalculates — the app derives reports from the raw data ' +
      'each time rather than storing the scores.</p></div>';

    html += '<div class="btn-row" style="margin-bottom:16px">' +
      b('scoring', 'Scoring & levels') + b('weights', 'Category weights') +
      b('reference', 'Reference sources') + b('thresholds', 'Thresholds') +
      b('data', 'Data') + b('qc', 'Quality control') + b('about', 'About') + '</div>';

    html += '<div>' + body() + '</div>';
    mount.innerHTML = html;
    U.$$('[data-tab]', mount).forEach(function (x) {
      x.addEventListener('click', function () { tab = x.dataset.tab; P.App.render(); });
    });
    wire(mount);
  }

  function b(id, label) {
    return '<button class="btn btn-sm' + (tab === id ? ' btn-primary' : '') + '" data-tab="' + id + '">' +
      U.esc(label) + '</button>';
  }

  function body() {
    var set = P.Store.settings();
    if (tab === 'weights') return weightsHtml(set);
    if (tab === 'reference') return referenceHtml(set);
    if (tab === 'thresholds') return thresholdsHtml(set);
    if (tab === 'data') return dataHtml();
    if (tab === 'qc') return qcHtml();
    if (tab === 'about') return aboutHtml();
    return scoringHtml(set);
  }

  /* ---------------- scoring & levels ---------------- */
  function scoringHtml(set) {
    var html = '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Performance level boundaries</span>' +
      '<span class="card-note">percentile</span></div><div class="card-bd">';
    set.levels.forEach(function (l, i) {
      html += '<div class="grid g3" style="align-items:end;margin-bottom:10px">' +
        '<div class="field" style="margin:0"><label>' + U.esc(l.name) + '</label>' +
        '<input type="text" value="' + U.esc(l.name) + '" data-lv="' + i + '|name"></div>' +
        '<div class="field" style="margin:0"><label>From percentile</label>' +
        '<input type="number" value="' + l.min + '" data-lv="' + i + '|min"' +
        (i === 0 ? ' disabled' : '') + '></div>' +
        '<div class="field" style="margin:0"><label>To percentile</label>' +
        '<input type="number" value="' + l.max + '" data-lv="' + i + '|max"' +
        (i === set.levels.length - 1 ? ' disabled' : '') + '></div>' +
        '</div><div class="fineprint" style="margin:-4px 0 14px">' + U.esc(l.desc) + '</div>';
    });
    html += U.notice('info', 'Boundaries must be continuous and increasing. The first band starts at 0 and the last ' +
      'ends at 100. Changing them relabels every result in the database, including reports you have already printed.') +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="stLevels">Save boundaries</button>' +
      '<button class="btn btn-sm btn-ghost" id="stLevelsReset">Reset to defaults</button></div>' +
      '</div></div>';

    html += '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Overall / composite score</span></div><div class="card-bd">' +
      '<label class="check"><input type="checkbox" id="stComposite"' +
      (set.scoring.compositeEnabled ? ' checked' : '') + '><span><b>Show a single composite index on the report.</b> ' +
      'Off by default, and off is the recommendation.</span></label>' +
      '<div class="fineprint" style="margin-top:10px;line-height:1.7">' +
      U.esc(P.Engine.calculateComposite([], { levels: set.levels, scoring: { compositeEnabled: false } }).note) +
      '</div></div></div>';

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Display precision</span></div>' +
      '<div class="card-bd"><div class="grid g2">' +
      f('Round band-derived percentiles to the nearest',
        '<input type="number" id="stBandRound" value="' + set.scoring.bandDisplayRounding + '" min="1" max="25">',
        'Provisional band anchors do not support finer resolution than this. Setting it to 1 would imply the system ' +
        'can tell the 79th percentile from the 80th. It cannot.') +
      f('Round model-derived percentiles to the nearest',
        '<input type="number" id="stModelRound" value="' + set.scoring.modelDisplayRounding + '" min="1" max="10">',
        'Applies to percentiles from published statistics or from your own internal norms.') +
      '</div><div class="btn-row"><button class="btn btn-primary btn-sm" id="stPrecision">Save</button></div>' +
      '</div></div>';
    return html;
  }

  /* ---------------- weights ---------------- */
  function weightsHtml(set) {
    var html = '<div class="card"><div class="card-hd"><span class="card-ttl">Category score weights</span>' +
      '<span class="card-note">default is equal within a category</span></div><div class="card-bd">' +
      '<p class="fineprint" style="margin-bottom:14px">A category score is the weighted mean of its contributing ' +
      'test z-scores. A weight of 0 removes a metric from its category score entirely while still reporting it on ' +
      'the results table.</p>';
    P.Tests.CATEGORIES.forEach(function (c) {
      var ms = P.Tests.benchmarkedMetrics().filter(function (m) { return m.test.category === c.id; });
      if (!ms.length) return;
      html += '<div class="stat-lbl" style="margin:16px 0 8px">' + U.esc(c.name) +
        ' <span style="color:var(--text-muted);font-weight:500;text-transform:none;letter-spacing:0">— minimum ' +
        (set.scoring.minMetricsPerCategory[c.id] || 1) + ' metric' +
        ((set.scoring.minMetricsPerCategory[c.id] || 1) === 1 ? '' : 's') + ' required</span></div>';
      ms.forEach(function (m) {
        var k = m.testId + '.' + m.metric.key;
        html += '<div class="pbar" style="grid-template-columns:1fr 130px"><div class="pbar-lbl">' +
          U.esc(m.test.shortName) + '<small>' + U.esc(m.metric.label) + '</small></div>' +
          '<input type="number" step="0.1" min="0" max="5" data-w="' + U.esc(k) + '" value="' +
          set.scoring.weights[k] + '" style="text-align:right"></div>';
      });
    });
    html += '<div class="btn-row" style="margin-top:16px">' +
      '<button class="btn btn-primary btn-sm" id="stWeights">Save weights</button>' +
      '<button class="btn btn-sm btn-ghost" id="stWeightsReset">Reset to defaults</button></div>';
    html += '<div class="fineprint" style="margin-top:12px"><b>Why the two non-equal defaults exist:</b> the bench ' +
      'press and the weighted chin-up are weighted 0.5 — the bench because it has the weakest combat-sport rationale ' +
      'in the battery, the weighted chin-up because it overlaps with the bodyweight chin-up and would otherwise ' +
      'double-count upper-body pulling. Repeated effort weights mean sprint power 0.7 against decrement 0.3, because ' +
      'an athlete who paces the first sprint posts a flattering decrement with poor power, and weighting the amount ' +
      'of power higher stops that reading as a good result.</div>';
    html += '</div></div>';
    return html;
  }

  /* ---------------- reference ---------------- */
  function referenceHtml(set) {
    var r = set.reference;
    return '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">PGP internal norm thresholds</span></div><div class="card-bd">' +
      '<div class="grid g3">' +
      f('Computed and shown as supplementary at', '<input class="big" type="number" id="stMinN" value="' + r.internalMinN + '">') +
      f('Promoted to the primary reference at', '<input class="big" type="number" id="stPrimaryN" value="' + r.internalPrimaryN + '">') +
      f('"Preliminary" caveat dropped at', '<input class="big" type="number" id="stMatureN" value="' + r.internalMatureN + '">') +
      '</div>' +
      '<div class="fineprint" style="line-height:1.7">These counts are per MATCHED STRATUM — the same sex, a ' +
      'comparable age, the same protocol version, the same equipment conditions — not the total size of the database. ' +
      'Below about 20 matched athletes an empirical percentile is mostly noise. 50 is roughly where a decile becomes ' +
      'meaningful. Above 100 the tails start to behave. These are judgement calls, which is why they are editable.</div>' +
      '<div class="grid g2" style="margin-top:14px">' +
      f('Age tolerance (years either side of a reference set\'s range)',
        '<input type="number" id="stAgeTol" value="' + r.ageTolerance + '">') +
      '<div class="field"><label>Strict age matching</label>' +
      '<label class="check" style="margin-top:8px"><input type="checkbox" id="stStrictAge"' +
      (r.strictAgeMatching ? ' checked' : '') + '><span>An athlete outside every reference age range gets ' +
      '"insufficient reference data" rather than the nearest set.</span></label></div>' +
      '</div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-sm" id="stRef">Save</button></div>' +
      '</div></div>' +

      '<div class="card"><div class="card-hd"><span class="card-ttl">Reference source priority</span></div>' +
      '<div class="card-bd"><p class="fineprint" style="line-height:1.7">When more than one reference set matches an ' +
      'athlete, this is the order of preference:</p><ol style="margin:10px 0 0 20px;line-height:1.9">' +
      r.priority.map(function (p, i) {
        return '<li>' + U.refTag(p) + ' ' + ({
          PGP_INTERNAL: 'your own matched athletes, once the sample is large enough',
          PUBLISHED: 'a verified published set with a matching protocol',
          PGP_PROVISIONAL: 'the shipped coaching-judgement standards'
        })[p] + '</li>';
      }).join('') + '</ol>' +
      '<div class="fineprint" style="margin-top:12px">The matching order itself — same test, same protocol ' +
      'conditions, same sex, similar age, body-mass band, population, competitive level — is fixed in the engine and ' +
      'is documented on the Benchmarks page. Sex is never substituted in either direction.</div>' +
      '</div></div>';
  }

  /* ---------------- thresholds ---------------- */
  function thresholdsHtml(set) {
    return '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Strengths and development priorities</span></div><div class="card-bd">' +
      '<div class="grid g3">' +
      f('A quality is a strength at or above', '<input class="big" type="number" id="stStrMin" value="' +
        set.profiling.strengthMinPercentile + '">', 'percentile') +
      f('A quality is a priority at or below', '<input class="big" type="number" id="stPriMax" value="' +
        set.profiling.priorityMaxPercentile + '">', 'percentile') +
      f('Maximum items in each list', '<input class="big" type="number" id="stMaxItems" value="' +
        set.profiling.maxItems + '">') +
      '</div>' +
      '<div class="fineprint" style="line-height:1.7">Results between these two points are not far enough from the ' +
      'middle of the reference population to be called either a strength or a weakness, so they are reported without ' +
      'being labelled. Selection is not a simple sort on the percentile: a test that was not performed, a value ' +
      'awaiting verification, and the criterion-scored movement screen are all excluded, and ordering accounts for ' +
      'how reliable each test is and how confident its reference set is.</div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-sm" id="stProfiling">Save</button></div>' +
      '</div></div>' +

      '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Inter-limb difference</span></div><div class="card-bd">' +
      f('Note a difference between sides at or above', '<input class="big" type="number" step="0.5" id="stAsym" value="' +
        set.asymmetry.noteThresholdPct + '">', 'percent') +
      '<div class="fineprint" style="line-height:1.7">' + U.esc(set.asymmetry.disclaimer) +
      ' This threshold is a commonly used rule of thumb, not a validated cut-off.</div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-sm" id="stAsymSave">Save</button></div>' +
      '</div></div>' +

      '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Movement screen bands</span></div><div class="card-bd">' +
      '<div class="grid g2">' +
      f('"Acceptable" from', '<input class="big" type="number" id="stMovAcc" value="' +
        set.movement.bands.acceptable + '">', '% of the achievable score') +
      f('"Monitor" from', '<input class="big" type="number" id="stMovMon" value="' +
        set.movement.bands.monitor + '">', '% of the achievable score') +
      '</div>' +
      '<div class="fineprint">' + U.esc(set.movement.disclaimer) + '</div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-sm" id="stMov">Save</button></div>' +
      '</div></div>' +

      '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Retest</span></div><div class="card-bd"><div class="grid g2">' +
      f('Default retest interval (weeks)', '<input class="big" type="number" id="stRetestWeeks" value="' +
        set.retest.defaultWeeks + '">') +
      f('Default target, as a multiple of the minimal detectable change',
        '<input class="big" type="number" step="0.1" id="stMdcMult" value="' + set.retest.targetMdcMultiple + '">',
        '1.0 means "improve by more than measurement error".') +
      '</div>' +
      '<label class="check"><input type="checkbox" id="stSameProto"' +
      (set.retest.requireSameProtocolVersion ? ' checked' : '') + '><span>Flag a retest across different protocol ' +
      'versions as not directly comparable. <b>Leave this on.</b></span></label>' +
      '<label class="check" style="margin-top:10px"><input type="checkbox" id="stSameEquip"' +
      (set.retest.requireSameEquipment ? ' checked' : '') + '><span>Flag a retest where the equipment changed.</span></label>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="stRetest">Save</button></div>' +
      '</div></div>' +

      '<div class="card"><div class="card-hd"><span class="card-ttl">Data validation limits</span></div>' +
      '<div class="card-bd"><div class="grid g3">' +
      f('Body mass range (kg)', '<div style="display:flex;gap:8px">' +
        '<input type="number" id="stBwMin" value="' + set.validation.bodyMassKg[0] + '">' +
        '<input type="number" id="stBwMax" value="' + set.validation.bodyMassKg[1] + '"></div>') +
      f('Height range (cm)', '<div style="display:flex;gap:8px">' +
        '<input type="number" id="stHtMin" value="' + set.validation.heightCm[0] + '">' +
        '<input type="number" id="stHtMax" value="' + set.validation.heightCm[1] + '"></div>') +
      f('Youth caution below age', '<input type="number" id="stYouth" value="' + set.validation.youthAgeCutoff + '">',
        'Below this age no percentile is produced: the adult reference sets do not apply to a maturing athlete.') +
      '</div>' +
      '<div class="fineprint">Values outside these ranges are FLAGGED for you to verify. They are never rejected and ' +
      'never corrected — an unusual value can be real.</div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-sm" id="stValidation">Save</button></div>' +
      '</div></div>';
  }

  /* ---------------- data ---------------- */
  function dataHtml() {
    var S = P.Store, F = P.FileStore, st = S.stats();
    var dest = S.destination(), fd = F ? F.describe() : null;

    /* ---- where this database is kept ---- */
    var cls = dest.kind === 'file' ? 'wb-ok'
            : (F && (F.state === 'needs_permission' || F.state === 'error')) ? 'wb-bad' : 'wb-warn';
    var html = '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Where this database is kept</span>' +
      '<span class="card-note">' + (dest.kind === 'file' ? 'a file on disk' : 'this browser only') +
      '</span></div><div class="card-bd">' +
      '<div class="wb ' + cls + '"><span class="wb-dot"></span><div>' +
      '<div class="wb-name">' + U.esc(dest.kind === 'file' ? dest.name : 'Browser storage') + '</div>' +
      '<div class="wb-detail">' + U.esc(dest.detail) + '</div></div></div>';

    if (F && F.supported()) {
      html += '<div class="btn-row" style="margin-top:14px">' +
        (dest.kind === 'file'
          ? '<button class="btn" id="wbChange">Use a different file</button>' +
            '<button class="btn btn-ghost" id="wbDisconnect">Disconnect</button>'
          : '<button class="btn btn-primary" id="wbNew">Create a workbook file</button>' +
            '<button class="btn" id="wbOpen">Open an existing workbook</button>') +
        (F.state === 'needs_permission' ? '<button class="btn btn-primary" id="wbReconnect">Reconnect</button>' : '') +
        '</div>' +
        '<div class="fineprint" style="margin-top:12px;line-height:1.7">' +
        '<b>Put the workbook inside a folder that syncs</b> — iCloud Drive, Dropbox, OneDrive, Google Drive. ' +
        'Every change writes straight into that file, your sync service carries it to your other devices, and there ' +
        'is no server, account or database service involved anywhere. Losing the laptop then costs you nothing.' +
        '</div>';
    } else {
      html += U.notice('warning',
        '<b>This browser cannot write directly to a file.</b> Safari on iPad and iPhone does not support it, so the ' +
        'data is held in this browser and you must export it yourself. Two things make that safe: add this app to ' +
        'the Home Screen so iOS keeps its storage, and export a JSON backup to the Files app before you leave every ' +
        'gym. On a laptop in Chrome or Edge the app can write straight to a file instead.');
    }
    html += '</div></div>';

    /* ---- backup and restore ---- */
    html += '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Backup and restore</span>' +
      (S.unsaved > 0 && dest.kind !== 'file'
        ? '<span class="badge badge-warning">' + S.unsaved + ' unsaved</span>' : '') +
      '</div><div class="card-bd">' +
      '<div class="btn-row">' +
      '<button class="btn btn-primary" id="sdJson">Export JSON backup</button>' +
      '<button class="btn" id="sdRaw">Export raw results (CSV)</button>' +
      '<button class="btn" id="sdScores">Export scores (CSV)</button>' +
      '<button class="btn" id="sdMerge">Merge in another device\'s file</button>' +
      '</div>' +
      (dest.kind === 'file'
        ? U.notice('info', '<b>Every change is already being written to ' + U.esc(dest.name) + '.</b> ' +
            'Exports are still useful as a dated snapshot before a big change, but you are no longer relying on ' +
            'your memory to keep the data safe.')
        : U.notice('gold', '<b>This database lives in one browser on one device.</b> There is no server and no ' +
            'account. Clearing site data, switching browser or losing the device means the data is gone, and iOS ' +
            'Safari clears storage for sites left unopened for about a week. An exported JSON file is the only ' +
            'backup that exists — export after every testing day.')) +
      '<div class="fineprint" style="margin-top:10px"><b>Merge</b> folds another device\'s file into this one ' +
      'instead of replacing it: new athletes and sessions are added, a session edited more recently on the other ' +
      'device wins, and nothing already here is deleted. Use it to bring an iPad\'s testing day back to the laptop.</div>' +
      '<dl class="kv" style="margin-top:14px">' +
      '<dt>Athletes</dt><dd>' + st.athletes + '</dd>' +
      '<dt>Sessions</dt><dd>' + st.sessions + '</dd>' +
      '<dt>Gyms</dt><dd>' + st.gyms + '</dd>' +
      '<dt>Athletes with a retest</dt><dd>' + st.retested + '</dd>' +
      '<dt>Stored size</dt><dd>' + Math.round(st.bytes / 1024) + ' KB</dd>' +
      '<dt>Browser storage</dt><dd>' + (P.Store.storageOk ? 'Available' : 'BLOCKED — nothing is being saved') + '</dd>' +
      '<dt>Last written to file</dt><dd>' +
        (F && F.lastWriteAt ? F.lastWriteAt.toLocaleString() : 'never') + '</dd>' +
      '</dl>' +
      (P.Store.lastError ? U.notice('critical', '<b>Storage problem.</b> ' + U.esc(P.Store.lastError)) : '') +
      '</div></div>';

    html += '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Sample data</span></div><div class="card-bd">' +
      (S.hasDemoData()
        ? U.notice('warning', '<b>This database currently contains fictional sample athletes.</b> ' +
            'Remove them before you start entering real athletes, so that your gym aggregates and your PGP internal ' +
            'norms are built from real data only.')
        : '<p class="fineprint">No sample data in this database.</p>') +
      '<div class="btn-row" style="margin-top:12px">' +
      (S.hasDemoData() ? '<button class="btn btn-danger btn-sm" id="sdClearDemo">Remove all sample athletes</button>' : '') +
      '<button class="btn btn-sm" id="sdLoadDemo">Reload the sample database</button>' +
      '<button class="btn btn-sm btn-ghost" id="sdLoadQC">Load the quality-control fixtures</button>' +
      '</div>' +
      '<div class="fineprint" style="margin-top:10px">The quality-control fixtures are the seven test athletes the ' +
      'system is verified against: normal, very high, very low, missing tests, different body weight and sex, a ' +
      'retest with a changed protocol, and deliberately invalid input. Loading them REPLACES the current database.</div>' +
      '</div></div>';

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Danger zone</span></div>' +
      '<div class="card-bd"><div class="btn-row">' +
      '<button class="btn btn-danger" id="sdReset">Delete everything and start empty</button></div>' +
      '<div class="fineprint" style="margin-top:10px">Removes every athlete, session, gym and testing day from this ' +
      'browser. Settings and any custom reference sets go too. Export first.</div></div></div>';
    return html;
  }

  /* ---------------- QC ---------------- */
  function qcHtml() {
    return '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Self-test suite</span></div><div class="card-bd">' +
      '<p style="line-height:1.7">The calculation engine, the benchmark matching, the missing-data rules and the ' +
      'report generation are verified by a suite that runs against seven fixture athletes: normal results, very high, ' +
      'very low, missing tests, a different body weight and sex, a retest with a changed protocol, and deliberately ' +
      'invalid input. Run it here whenever you change a setting, a weight or a benchmark anchor.</p>' +
      '<div class="btn-row" style="margin-top:14px">' +
      '<button class="btn btn-primary" id="qcRun">Run the self-test suite</button>' +
      '<a class="btn btn-ghost" href="tests/qc.html" target="_blank" rel="noopener">Open the full test page</a>' +
      '</div><div id="qcOut" style="margin-top:16px"></div></div></div>' +

      '<div class="card"><div class="card-hd"><span class="card-ttl">What the suite checks</span></div>' +
      '<div class="card-bd"><ul style="margin-left:18px;line-height:1.8" class="fineprint">' +
      '<li>Percentile maths: the normal CDF and its inverse round-trip, and band anchors land exactly on the 25th, ' +
      '65th and 90th percentiles in both directions.</li>' +
      '<li>Lower-is-better metrics invert correctly, and extremes clamp to 1 and 99 rather than 0 and 100.</li>' +
      '<li>Every formula: asymmetry, estimated 1RM and its refusal above 12 reps, the Fitzsimons decrement, the ' +
      'fatigue index returning nothing when there is no minimum power, and minimal detectable change.</li>' +
      '<li>Missing data is stripped rather than zeroed, everywhere.</li>' +
      '<li>Category scores reproduce by hand from the workings printed on the report.</li>' +
      '<li>A category with no data reports "insufficient", not a low score.</li>' +
      '<li>A different ball mass, an unrecorded or different air bike, a hand-timed sprint, a youth athlete and an ' +
      'athlete with no recorded sex all produce "insufficient reference data" rather than a wrong percentile.</li>' +
      '<li>Female athletes are matched only to female reference sets, and chin-ups to the right body-mass band.</li>' +
      '<li>Retests compute absolute and percentage change, detect level transitions, refuse to call a small change an ' +
      'improvement, and refuse to compare across protocol versions or configurations.</li>' +
      '<li>Implausible values are flagged without being altered, and are excluded from benchmarking and profiling.</li>' +
      '<li>Internal norms stay hidden below the minimum sample, never pool sexes, and exclude the athlete themselves.</li>' +
      '<li>Gym aggregates contain no athlete names and warn on small samples.</li>' +
      '<li>JSON export and import round-trip to identical scores, and CSV never writes 0 for a test that was not ' +
      'performed.</li>' +
      '<li>No report-facing text makes an injury-risk or fight-outcome claim, and the aerobic test is never labelled ' +
      'as a VO2max test.</li>' +
      '</ul></div></div>';
  }

  /* ---------------- about ---------------- */
  function aboutHtml() {
    var set = P.Store.settings();
    var v = P.Settings.PROTOCOL_VERSION_NOTES[P.Settings.PROTOCOL_VERSION];
    return '<div class="card" style="margin-bottom:16px"><div class="card-bd">' +
      '<div class="eyebrow">' + U.esc(set.branding.company) + '</div>' +
      '<div class="pg-title" style="margin:4px 0">' + U.esc(set.branding.product) + '</div>' +
      '<div class="fineprint">' + U.esc(set.branding.tagline) + '</div>' +
      '<dl class="kv" style="margin-top:16px">' +
      '<dt>Protocol version</dt><dd>' + U.esc(P.Settings.PROTOCOL_VERSION) + '</dd>' +
      '<dt>Released</dt><dd>' + U.esc(v ? v.released : '—') + '</dd>' +
      '<dt>Tests in the battery</dt><dd>' + P.Tests.TESTS.length + ' (' +
      P.Tests.TESTS.filter(function (t) { return t.optional; }).length + ' optional)</dd>' +
      '<dt>Benchmarked metrics</dt><dd>' + P.Tests.benchmarkedMetrics().length + '</dd>' +
      '<dt>Reference sets shipped</dt><dd>' + P.Benchmarks.BENCHMARKS.length + ', all PGP provisional</dd>' +
      '</dl>' +
      '<div class="fineprint" style="margin-top:14px;line-height:1.7"><b>What this version contains:</b> ' +
      U.esc(v ? v.summary : '') + '</div>' +
      '</div></div>' +

      '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">Protocol versioning</span></div><div class="card-bd">' +
      '<p style="line-height:1.7">Every session records the protocol version it was run under, and the app refuses ' +
      'to compare results across different versions. <b>Bump the version in <span class="mono">js/config/settings.js</span> ' +
      'whenever a change makes results non-comparable:</b> a different air-bike protocol, a different sprint recovery ' +
      'period, a change to the countermovement jump procedure or device standard, a different strength rep scheme, or ' +
      'a change to the scoring methodology itself. Add a note to PROTOCOL_VERSION_NOTES describing what changed, so ' +
      'that in two years you can still tell why two numbers are not comparable.</p></div></div>' +

      '<div class="card"><div class="card-hd"><span class="card-ttl">Commercial packages this supports</span></div>' +
      '<div class="card-bd"><ul style="margin-left:18px;line-height:1.9">' +
      '<li><b>Gym testing day</b> — Testing Day mode: a queue, athlete numbers, rapid entry, a report each, and a ' +
      'de-identified gym report for the head coach.</li>' +
      '<li><b>Individual athlete assessment</b> — one athlete, full battery, printed report with priorities and targets.</li>' +
      '<li><b>Retesting package</b> — the comparison view, with change against measurement error and level transitions.</li>' +
      '<li><b>Gym performance dashboard</b> — squad averages, level distribution, the most common development ' +
      'priority, filtered by sport, sex, age or weight.</li>' +
      '<li><b>Ongoing athlete monitoring</b> — trends across every testing date, per metric.</li>' +
      '</ul>' +
      '<div class="fineprint" style="margin-top:12px">Say what the system does and nothing more: seven physical ' +
      'qualities measured against a defined reference population, a profile rather than a grade, the two or three ' +
      'qualities worth training next, and a re-measure that shows whether it worked. That is worth paying for without ' +
      'any inflation, and the provisional status of the standards is worth saying out loud.</div>' +
      '</div></div>';
  }

  /* ---------------- wiring ---------------- */
  function wire(mount) {
    var S = P.Store, set = S.settings();
    function save(msg) {
      S.saveNow(); P.App.saveState(true); U.toast(msg || 'Saved'); P.App.render();
    }
    function on(id, fn) { var n = U.$('#' + id, mount); if (n) n.addEventListener('click', fn); }

    on('stLevels', function () {
      var levels = JSON.parse(JSON.stringify(set.levels));
      U.$$('[data-lv]', mount).forEach(function (n) {
        var p = n.dataset.lv.split('|');
        var i = parseInt(p[0], 10);
        if (p[1] === 'name') levels[i].name = n.value.trim().toUpperCase();
        else levels[i][p[1]] = U.numVal(n);
      });
      levels[0].min = 0;
      levels[levels.length - 1].max = 100;
      for (var i = 0; i < levels.length - 1; i++) {
        if (levels[i].max === null || levels[i].max <= levels[i].min || levels[i].max >= 100) {
          U.toast('Boundaries must increase and stay between 0 and 100'); return;
        }
        levels[i + 1].min = levels[i].max;
      }
      set.levels = levels;
      save('Performance levels updated');
    });
    on('stLevelsReset', function () {
      set.levels = P.Settings.cloneDefaults().levels;
      save('Levels reset to defaults');
    });
    var comp = U.$('#stComposite', mount);
    if (comp) comp.addEventListener('change', function () {
      set.scoring.compositeEnabled = comp.checked;
      save(comp.checked ? 'Composite index enabled — it is labelled as unvalidated on the report'
                        : 'Composite index disabled');
    });
    on('stPrecision', function () {
      set.scoring.bandDisplayRounding = Math.max(1, U.numVal(U.$('#stBandRound', mount)) || 5);
      set.scoring.modelDisplayRounding = Math.max(1, U.numVal(U.$('#stModelRound', mount)) || 1);
      save('Display precision updated');
    });
    on('stWeights', function () {
      U.$$('[data-w]', mount).forEach(function (n) {
        var v = U.numVal(n);
        if (v !== null && v >= 0) set.scoring.weights[n.dataset.w] = v;
      });
      save('Weights updated');
    });
    on('stWeightsReset', function () {
      set.scoring.weights = P.Settings.cloneDefaults().scoring.weights;
      save('Weights reset to defaults');
    });
    on('stRef', function () {
      set.reference.internalMinN = Math.max(5, U.numVal(U.$('#stMinN', mount)) || 20);
      set.reference.internalPrimaryN = Math.max(set.reference.internalMinN, U.numVal(U.$('#stPrimaryN', mount)) || 50);
      set.reference.internalMatureN = Math.max(set.reference.internalPrimaryN, U.numVal(U.$('#stMatureN', mount)) || 100);
      set.reference.ageTolerance = Math.max(0, U.numVal(U.$('#stAgeTol', mount)) || 0);
      set.reference.strictAgeMatching = U.$('#stStrictAge', mount).checked;
      save('Reference rules updated');
    });
    on('stProfiling', function () {
      set.profiling.strengthMinPercentile = U.numVal(U.$('#stStrMin', mount)) || 60;
      set.profiling.priorityMaxPercentile = U.numVal(U.$('#stPriMax', mount)) || 45;
      set.profiling.maxItems = Math.max(1, U.numVal(U.$('#stMaxItems', mount)) || 3);
      if (set.profiling.priorityMaxPercentile >= set.profiling.strengthMinPercentile) {
        U.toast('The priority threshold must be below the strength threshold'); return;
      }
      save('Profiling thresholds updated');
    });
    on('stAsymSave', function () {
      set.asymmetry.noteThresholdPct = Math.max(0, U.numVal(U.$('#stAsym', mount)) || 10);
      save('Inter-limb threshold updated');
    });
    on('stMov', function () {
      set.movement.bands.acceptable = U.numVal(U.$('#stMovAcc', mount)) || 80;
      set.movement.bands.monitor = U.numVal(U.$('#stMovMon', mount)) || 60;
      /* keep the criterion level bands in step with the editable thresholds */
      if (set.movement.criterionLevels) {
        set.movement.criterionLevels[0].max = set.movement.bands.monitor;
        set.movement.criterionLevels[1].min = set.movement.bands.monitor;
        set.movement.criterionLevels[1].max = set.movement.bands.acceptable;
        set.movement.criterionLevels[2].min = set.movement.bands.acceptable;
      }
      save('Movement bands updated');
    });
    on('stRetest', function () {
      set.retest.defaultWeeks = Math.max(1, U.numVal(U.$('#stRetestWeeks', mount)) || 12);
      set.retest.targetMdcMultiple = Math.max(0.1, U.numVal(U.$('#stMdcMult', mount)) || 1);
      set.retest.requireSameProtocolVersion = U.$('#stSameProto', mount).checked;
      set.retest.requireSameEquipment = U.$('#stSameEquip', mount).checked;
      save('Retest rules updated');
    });
    on('stValidation', function () {
      set.validation.bodyMassKg = [U.numVal(U.$('#stBwMin', mount)) || 35, U.numVal(U.$('#stBwMax', mount)) || 180];
      set.validation.heightCm = [U.numVal(U.$('#stHtMin', mount)) || 130, U.numVal(U.$('#stHtMax', mount)) || 220];
      set.validation.youthAgeCutoff = U.numVal(U.$('#stYouth', mount)) || 18;
      save('Validation limits updated');
    });

    /* ---- workbook file ---- */
    function afterConnect(created) {
      /* A file just picked for a NEW workbook is empty, so this database is
         written into it. An EXISTING workbook already holds data, so its
         contents win — otherwise opening last month's file would silently
         overwrite it with whatever this browser happened to be holding. */
      var F2 = P.FileStore;
      if (created) {
        S.saveNow();
        U.toast('Workbook created — changes now save to ' + F2.name);
        P.App.saveState(); P.App.storageNotice(); P.App.render();
        return;
      }
      F2.read().then(function (text) {
        if (text && S.adoptText(text)) U.toast('Workbook opened — ' + S.db.athletes.length + ' athletes loaded');
        else { S.saveNow(); U.toast('Workbook connected'); }
        P.App.saveState(); P.App.storageNotice(); P.App.render();
      });
    }
    function fileErr(e) {
      if (e && e.name === 'AbortError') return;      /* the coach cancelled */
      U.modal({ title: 'Could not connect the file',
        bodyHtml: U.notice('critical', U.esc(e && e.message ? e.message : String(e))) });
    }
    on('wbNew', function () { P.FileStore.createWorkbook().then(function () { afterConnect(true); }).catch(fileErr); });
    on('wbChange', function () { P.FileStore.createWorkbook().then(function () { afterConnect(true); }).catch(fileErr); });
    on('wbOpen', function () { P.FileStore.openWorkbook().then(function () { afterConnect(false); }).catch(fileErr); });
    on('wbReconnect', function () {
      P.FileStore.reconnect().then(function (ok) {
        if (ok) { S.saveNow(); U.toast('Workbook reconnected'); }
        else U.toast('Permission not granted');
        P.App.saveState(); P.App.storageNotice(); P.App.render();
      });
    });
    on('wbDisconnect', function () {
      U.confirm('Disconnect the workbook file?',
        'Changes will stop being written to <b>' + U.esc(P.FileStore.name || 'the file') +
        '</b> and will be held in this browser only. The file itself is not deleted and keeps everything saved so far.',
        function () {
          P.FileStore.disconnect().then(function () {
            U.toast('Workbook disconnected');
            P.App.saveState(); P.App.storageNotice(); P.App.render();
          });
        }, 'Disconnect');
    });
    on('sdMerge', mergeFile);

    on('sdJson', function () { U.exportFile('json'); });
    on('sdRaw', function () { U.exportFile('sessions'); });
    on('sdScores', function () { U.exportFile('scores'); });
    on('sdClearDemo', function () {
      U.confirm('Remove all sample athletes?',
        'This deletes every fictional sample athlete and their sessions, and leaves any real data you have entered ' +
        'untouched. Recommended before you start testing for real.',
        function () {
          var r = S.clearDemoData();
          U.toast(r.removedAthletes + ' sample athletes removed');
          P.App.go('dashboard');
        }, 'Remove sample data');
    });
    on('sdLoadDemo', function () {
      U.confirm('Reload the sample database?',
        'This <b>replaces everything</b> currently in this browser with the fictional sample database. Export a backup first.',
        function () { S.loadDemo(); U.toast('Sample database loaded'); P.App.go('dashboard'); },
        'Replace with sample data');
    });
    on('sdLoadQC', function () {
      U.confirm('Load the quality-control fixtures?',
        'This <b>replaces everything</b> currently in this browser with the seven QC test athletes. Export a backup first.',
        function () { S.loadQC(); U.toast('QC fixtures loaded'); P.App.go('athletes', { athleteId: null }); },
        'Replace with QC fixtures');
    });
    on('sdReset', function () {
      U.confirm('Delete everything?',
        'This removes every athlete, session, gym and testing day from this browser, along with your settings and ' +
        'custom reference sets. It cannot be undone. <b>Export a JSON backup first.</b>',
        function () { S.reset(); U.toast('Database emptied'); P.App.go('dashboard'); },
        'Delete everything');
    });

    on('qcRun', function () {
      var out = U.$('#qcOut', mount);
      out.innerHTML = '<div class="fineprint">Running…</div>';
      setTimeout(function () {
        if (!P.QC) { out.innerHTML = U.notice('critical', 'The test suite is not loaded on this page.'); return; }
        /* run against the fixtures without touching the live database */
        var live = S.db;
        var res;
        try { res = P.QC.run(); } finally { S.db = live; }
        var pass = res.filter(function (r) { return r.pass; }).length;
        var html = U.notice(pass === res.length ? 'info' : 'critical',
          '<b>' + pass + ' of ' + res.length + ' checks passed.</b>' +
          (pass === res.length ? ' The calculation engine, matching rules and report generation are behaving as specified.'
                               : ' Review the failures below before using this build for real testing.'));
        html += '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th></th>' +
          '<th>Check</th><th>Result</th></tr></thead><tbody>' +
          res.map(function (r) {
            return '<tr><td>' + (r.pass ? '<span class="badge badge-good">pass</span>'
                                        : '<span class="badge badge-critical">fail</span>') + '</td>' +
              '<td>' + U.esc(r.name) + '</td>' +
              '<td class="fineprint">' + U.esc(r.msg) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        out.innerHTML = html;
      }, 30);
    });
  }

  /* Fold another device's export into this database. */
  function mergeFile() {
    var S = P.Store;
    U.modal({
      title: 'Merge in another device\'s file',
      bodyHtml: '<p style="line-height:1.65">Pick a JSON backup exported from another device. Its athletes and ' +
        'sessions are added to this database. <b>Nothing already here is deleted.</b></p>' +
        '<ul class="fineprint" style="margin:12px 0 0 18px;line-height:1.8">' +
        '<li>An athlete or session that only exists in the other file is added.</li>' +
        '<li>A session that exists in both is taken from whichever device edited it most recently.</li>' +
        '<li>An athlete record that exists in both keeps the version on THIS device, because athlete records carry ' +
        'consent and notes you may have changed here deliberately.</li>' +
        '<li>Settings and custom reference sets in the other file are ignored — adopting them would change every ' +
        'percentile in this database without telling you.</li>' +
        '</ul>',
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: 'Choose file…', class: 'btn-primary', onClick: function () {
          U.closeModal();
          U.pickFile('.json,application/json', function (text) {
            var r = P.Csv.mergeJSON(text, S.db);
            if (!r.ok) {
              U.modal({ title: 'Merge failed', bodyHtml: U.notice('critical', U.esc(r.error)) });
              return;
            }
            S.saveNow();
            P.App.saveState();
            var rep = r.report;
            U.modal({
              title: rep.total ? 'Merged' : 'Nothing new to merge',
              bodyHtml: (rep.total
                ? '<dl class="kv">' +
                  '<dt>Athletes added</dt><dd>' + rep.athletesAdded + '</dd>' +
                  '<dt>Athletes already here</dt><dd>' + rep.athletesKept + '</dd>' +
                  '<dt>Sessions added</dt><dd>' + rep.sessionsAdded + '</dd>' +
                  '<dt>Sessions updated from the other device</dt><dd>' + rep.sessionsUpdated + '</dd>' +
                  '<dt>Gyms added</dt><dd>' + rep.gymsAdded + '</dd>' +
                  '<dt>Testing days added</dt><dd>' + rep.eventsAdded + '</dd></dl>'
                : '<p>That file contained nothing this database did not already have. Nothing was changed.</p>') +
                '<div class="fineprint" style="margin-top:12px">' + U.esc(r.note) + '</div>' +
                (r.warnings && r.warnings.length
                  ? '<div style="margin-top:12px">' + U.notice('warning', r.warnings.map(U.esc).join('<br>')) + '</div>'
                  : ''),
              buttons: [{ label: 'Done', class: 'btn-primary', onClick: function () {
                P.App.storageNotice(); P.App.go('dashboard');
              } }]
            });
          });
          return true;
        } }
      ]
    });
  }

  function f(label, control, hint) {
    return '<div class="field"><label>' + U.esc(label) + '</label>' + control +
      (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.settings = {
    render: render,
    /* Called from the banner's "Connect a workbook file" button. */
    connectWorkbook: function () {
      if (!P.FileStore || !P.FileStore.supported()) { U.exportFile('json'); return; }
      P.App.go('settings');
      tab = 'data';
      P.App.render();
      P.FileStore.createWorkbook().then(function () {
        P.Store.saveNow();
        U.toast('Workbook created — changes now save to ' + P.FileStore.name);
        P.App.saveState(); P.App.storageNotice(); P.App.render();
      }).catch(function (e) { if (e && e.name !== 'AbortError') U.toast('Could not create the file'); });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
