/* ==========================================================================
   js/ui/benchmarks.js — BENCHMARK / REFERENCE PAGE
   Shows every reference set, where it came from, its confidence, the protocol
   it applies to, and the literature queue for replacing provisional sets
   with published data. Band anchors are editable.
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;
  var tab = 'sets';

  function render(mount) {
    var S = P.Store, set = S.settings();
    var counts = P.Benchmarks.counts();
    var custom = (S.db.customBenchmarks || []).length;

    var html = '<div class="pg-head"><h1 class="pg-title">Benchmarks</h1>' +
      '<p class="pg-sub">Every reference set the app can compare an athlete against, what kind of data it is, and ' +
      'how much confidence it carries. Nothing here is hidden: if a percentile comes from a coaching judgement rather ' +
      'than a study, it says so.</p></div>';

    html += U.notice('warning', '<b>Every standard shipped with this build is a PGP PROVISIONAL STANDARD.</b> ' +
      'They are coaching-judgement reference points chosen to be plausible for trained combat athletes. They are not ' +
      'taken from published research and must not be described to an athlete or a gym as scientific norms. ' +
      'Percentiles derived from them are shown rounded to the nearest 5 because they do not support finer resolution. ' +
      'Replacing them — with published data, or with PGP\'s own athlete data — is the highest-value improvement ' +
      'available to this system.');

    html += '<div class="grid g4" style="margin:16px 0">' +
      tile('Published sets', counts.PUBLISHED, 'require a verified source') +
      tile('PGP provisional', counts.PGP_PROVISIONAL, 'coaching judgement') +
      tile('Custom sets you added', custom, 'editable on this page') +
      tile('Internal norms', internalCount(), 'built from your own database') +
      '</div>';

    html += '<div class="btn-row no-print" style="margin-bottom:16px">' +
      btn('sets', 'Reference sets') + btn('internal', 'PGP internal norms') +
      btn('method', 'How percentiles are calculated') + btn('queue', 'Literature queue') +
      '</div>';

    html += '<div id="bmBody">' + body(set) + '</div>';
    mount.innerHTML = html;
    U.$$('[data-tab]', mount).forEach(function (b) {
      b.addEventListener('click', function () { tab = b.dataset.tab; P.App.render(); });
    });
    wire(mount);
  }

  function btn(id, label) {
    return '<button class="btn btn-sm' + (tab === id ? ' btn-primary' : '') + '" data-tab="' + id + '">' +
      U.esc(label) + '</button>';
  }

  function body(set) {
    if (tab === 'internal') return internalHtml(set);
    if (tab === 'method') return methodHtml(set);
    if (tab === 'queue') return queueHtml();
    return setsHtml(set);
  }

  /* ---------------- reference sets ---------------- */
  function setsHtml(set) {
    var S = P.Store;
    var all = P.Benchmarks.BENCHMARKS.concat(S.db.customBenchmarks || []);
    var html = '';
    P.Tests.orderedTests().forEach(function (t) {
      var sets = all.filter(function (b) { return b.testId === t.id; });
      if (!sets.length) return;
      html += '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
        '<span class="card-ttl">' + U.esc(t.name) + '</span>' +
        '<span class="card-note">' + sets.length + ' reference set' + (sets.length === 1 ? '' : 's') + '</span></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Metric</th><th>Sex</th><th>Age</th>' +
        '<th>Body mass</th><th>Conditions</th><th class="num">25th</th><th class="num">65th</th>' +
        '<th class="num">90th</th><th>Type</th><th>Confidence</th><th></th></tr></thead><tbody>';
      sets.forEach(function (b) {
        var m = P.Tests.metric(b.testId, b.metric);
        var cond = Object.keys(b.conditions || {}).map(function (k) {
          return k + '=' + b.conditions[k];
        }).join(', ');
        html += '<tr><td><b>' + U.esc(m ? m.label : b.metric) + '</b><br><span class="fineprint">' +
          U.esc(b.unit) + ' · ' + (b.direction === 'low' ? 'lower is better' : 'higher is better') + '</span></td>' +
          '<td>' + U.esc(b.sex) + '</td>' +
          '<td class="dim">' + (b.ageRange ? b.ageRange.join('–') : 'any') + '</td>' +
          '<td class="dim">' + (b.bwBand ? U.esc(b.bwBand.label) : 'all') + '</td>' +
          '<td class="fineprint">' + U.esc(cond || '—') + '</td>' +
          (b.bands
            ? '<td class="num">' + b.bands.p25 + '</td><td class="num">' + b.bands.p65 +
              '</td><td class="num">' + b.bands.p90 + '</td>'
            : '<td colspan="3" class="fineprint">' + U.esc(b.method) + '</td>') +
          '<td>' + U.refTag(b.referenceType) + '</td>' +
          '<td>' + U.confBadge(b.confidence) + '</td>' +
          '<td><button class="btn btn-sm btn-ghost" data-bm="' + U.esc(b.id) + '">Details</button></td></tr>';
      });
      html += '</tbody></table></div></div>';
    });

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Add your own reference set</span></div>' +
      '<div class="card-bd"><p class="fineprint" style="margin-bottom:12px">Add a published set once you have the ' +
      'paper in front of you, or a revised provisional set once your own data tells you the current anchors are wrong. ' +
      'A set you add takes priority over the shipped provisional set for the same test, metric, sex and conditions if ' +
      'you mark it as published.</p>' +
      '<div class="btn-row"><button class="btn btn-primary btn-sm" id="bmAdd">+ Add reference set</button></div></div></div>';
    return html;
  }

  /* ---------------- internal norms ---------------- */
  function internalHtml(set) {
    var S = P.Store, rs = set.reference;
    var html = '<div class="card" style="margin-bottom:16px"><div class="card-bd">' +
      '<p style="line-height:1.7">The plan is that PGP\'s own database becomes the primary benchmarking source. ' +
      'The app builds internal norms automatically as soon as a <b>matched group</b> of athletes is large enough — ' +
      'matched means the same sex, a comparable age, the same protocol version and the same equipment conditions. ' +
      'Fifty athletes in total is not fifty in one stratum, which is why the counts below are usually smaller than ' +
      'the size of the database.</p>' +
      '<dl class="kv" style="margin-top:14px">' +
      '<dt>Computed and shown as supplementary at</dt><dd>' + rs.internalMinN + ' matched athletes</dd>' +
      '<dt>Promoted to the primary reference at</dt><dd>' + rs.internalPrimaryN + ' matched athletes</dd>' +
      '<dt>"Preliminary" caveat dropped at</dt><dd>' + rs.internalMatureN + ' matched athletes</dd>' +
      '</dl><div class="fineprint" style="margin-top:10px">Editable in Settings. Athletes without data consent are ' +
      'excluded, and an athlete is always excluded from their own reference sample.</div>' +
      '</div></div>';

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Current internal sample by metric</span>' +
      '<span class="card-note">per sex</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th>Test</th><th>Metric</th><th>Sex</th><th class="num">Matched athletes</th><th>Status</th>' +
      '</tr></thead><tbody>';
    P.Tests.benchmarkedMetrics().forEach(function (m) {
      ['male', 'female'].forEach(function (sex) {
        var r = P.Engine.buildInternalNorm(S.db, m.testId, m.metric.key, {
          sex: sex, ageRange: [18, 35], conditions: {},
          protocolVersion: P.Settings.PROTOCOL_VERSION
        }, set);
        if (!r) return;
        var status = !r.available
          ? '<span class="badge badge-none">not yet available</span>'
          : (r.isPrimary
              ? '<span class="badge badge-good">primary reference' + (r.mature ? '' : ' · preliminary') + '</span>'
              : '<span class="badge badge-info">supplementary</span>');
        html += '<tr><td>' + U.esc(m.test.shortName) + '</td>' +
          '<td class="fineprint">' + U.esc(m.metric.label) + '</td>' +
          '<td>' + U.esc(sex) + '</td>' +
          '<td class="num"><b>' + r.n + '</b> / ' + rs.internalMinN + '</td>' +
          '<td>' + status + '</td></tr>';
      });
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  /* ---------------- methodology ---------------- */
  function methodHtml(set) {
    var html = '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">From a raw result to a percentile</span></div><div class="card-bd">' +
      '<h4 style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:0 0 6px">Step 1 — match a reference set</h4>' +
      '<p style="line-height:1.7">Matching is tried in a fixed order: same test and metric, then the protocol ' +
      'conditions that can actually be verified from the recorded data (medicine-ball mass, air-bike family, sprint ' +
      'timing method, repeated-sprint configuration), then sex, then age range, then body-mass band where the metric ' +
      'requires one, then sport, then competitive level. <b>If nothing matches, the app reports "insufficient ' +
      'reference data" and the metric is excluded from the category score.</b> It never substitutes the other sex, a ' +
      'different ball mass, a different machine or a different protocol configuration, and it never interpolates a ' +
      'percentile out of nothing.</p>' +
      '<h4 style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:14px 0 6px">Step 2 — derive the percentile</h4>' +
      '<p style="line-height:1.7"><b>Provisional bands</b> (everything shipped): the set gives the value at the 25th, ' +
      '65th and 90th percentiles, and the app interpolates linearly between those anchors, extrapolating beyond the ' +
      'end anchors with the slope of the nearest segment and clamping to 1–99. The result is marked as ' +
      'band-derived and displayed rounded to the nearest ' + set.scoring.bandDisplayRounding + '.<br>' +
      '<b>Published mean and SD:</b> a z-score, then the normal cumulative distribution function.<br>' +
      '<b>Published percentile table:</b> linear interpolation within the table.<br>' +
      '<b>PGP internal norms:</b> the empirical mid-rank percentile within the matched sample.<br>' +
      'For a metric where lower is better, such as sprint time, the direction is inverted first so that a faster time ' +
      'always produces a higher percentile.</p>' +
      '<h4 style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:14px 0 6px">Step 3 — performance level</h4>' +
      '<p style="line-height:1.7">' + set.levels.map(function (l) {
        return '<b>' + U.esc(l.name) + '</b> — ' + l.min + 'th to ' + l.max + 'th percentile. ' + U.esc(l.desc);
      }).join('<br>') + '</p>' +
      '<p class="fineprint" style="margin-top:10px">' + U.esc(P.Settings.REPORT_COPY.levelCaveat) + '</p>' +
      '</div></div>';

    html += '<div class="card" style="margin-bottom:16px"><div class="card-hd">' +
      '<span class="card-ttl">From test percentiles to a category score</span></div><div class="card-bd">' +
      '<p style="line-height:1.7">Percentiles are not a linear scale, so averaging them directly distorts the result ' +
      'at the extremes. Instead:</p><ol style="margin:10px 0 10px 20px;line-height:1.8">' +
      '<li>each available test percentile in the category is converted to a z-score,</li>' +
      '<li>the weighted mean of those z-scores is taken,</li>' +
      '<li>the mean z is converted back to a percentile.</li></ol>' +
      '<p style="line-height:1.7">The contributing tests, their weights and the mean z are printed on every report, ' +
      'so any category score can be reproduced by hand. A test that was not performed is simply absent from the ' +
      'calculation: it is never entered as a zero and it never lowers the score.</p>' +
      '<div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr><th>Category</th>' +
      '<th>Contributing metric</th><th class="num">Default weight</th><th class="num">Minimum metrics</th>' +
      '</tr></thead><tbody>' +
      P.Tests.CATEGORIES.map(function (c) {
        var ms = P.Tests.benchmarkedMetrics().filter(function (m) { return m.test.category === c.id; });
        return ms.map(function (m, i) {
          return '<tr><td>' + (i === 0 ? '<b>' + U.esc(c.name) + '</b>' : '') + '</td>' +
            '<td class="fineprint">' + U.esc(m.test.shortName + ' — ' + m.metric.label) + '</td>' +
            '<td class="num">' + set.scoring.weights[m.testId + '.' + m.metric.key] + '</td>' +
            '<td class="num dim">' + (i === 0 ? (set.scoring.minMetricsPerCategory[c.id] || 1) : '') + '</td></tr>';
        }).join('');
      }).join('') +
      '</tbody></table></div>' +
      '<div class="fineprint" style="margin-top:10px">Weights are editable in Settings. Defaults are equal within a ' +
      'category, with two documented exceptions: the bench press and the weighted chin-up are halved, and the ' +
      'repeated-effort category weights mean sprint power above decrement at 70/30.</div>' +
      '</div></div>';

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Why there is no overall score</span>' +
      '</div><div class="card-bd"><p style="line-height:1.7">' +
      U.esc(P.Engine.calculateComposite([], set).note) + '</p></div></div>';
    return html;
  }

  /* ---------------- literature queue ---------------- */
  function queueHtml() {
    var html = U.notice('info', '<b>These are citation handles, not extracted data.</b> Each entry names a source ' +
      'likely to contain usable descriptive statistics for combat athletes. No mean, standard deviation or percentile ' +
      'from any of them has been entered into this app, because entering numbers from memory rather than from the ' +
      'paper is exactly how a testing product becomes indefensible. Confirm each citation against the full text ' +
      'before printing it on a report.');

    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Workflow for replacing a provisional set</span></div><div class="card-bd">' +
      '<ol style="margin-left:20px;line-height:1.8">' +
      '<li>Obtain the full text and confirm the citation is correct.</li>' +
      '<li>Check the protocol matches the PGP protocol — device, arm position, start distance, rep scheme, machine. ' +
      'If it does not, either do not use it, or add it as a separate set with its own protocol string and matching conditions.</li>' +
      '<li>Record the sample size, sex, age, competitive level and sport.</li>' +
      '<li>Add the set with a mean and standard deviation, or with the published percentile table.</li>' +
      '<li>Mark it as published and set its confidence from sample size, protocol match and population match.</li>' +
      '</ol></div></div>';

    html += '<div style="margin-top:16px">';
    P.Benchmarks.LITERATURE_QUEUE.forEach(function (l) {
      var isGap = /GAP/.test(l.status);
      html += '<div class="card" style="margin-bottom:12px"><div class="card-bd">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
        '<div class="stat-lbl" style="margin:0">' + U.esc(l.topic) + '</div>' +
        '<span class="badge ' + (isGap ? 'badge-critical' : 'badge-warning') + '">' + U.esc(l.status) + '</span></div>' +
        '<p style="margin-top:8px;line-height:1.65">' + U.esc(l.handle) + '</p>' +
        '<p class="fineprint" style="margin-top:6px"><b>Look for:</b> ' + U.esc(l.lookFor) + '</p>' +
        '</div></div>';
    });
    html += '</div>';
    return html;
  }

  /* ---------------- wiring ---------------- */
  function wire(mount) {
    U.$$('[data-bm]', mount).forEach(function (b) {
      b.addEventListener('click', function () { detail(b.dataset.bm); });
    });
    var add = U.$('#bmAdd', mount);
    if (add) add.addEventListener('click', function () { addForm(); });
  }

  function detail(id) {
    var S = P.Store;
    var b = P.Benchmarks.byId(id) ||
      (S.db.customBenchmarks || []).filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    var m = P.Tests.metric(b.testId, b.metric);
    var t = P.Tests.get(b.testId);
    var isCustom = !P.Benchmarks.byId(id);

    var html = '<dl class="kv">' +
      row('Test', t.name) + row('Metric', m ? m.label : b.metric) +
      row('Unit', b.unit) + row('Direction', b.direction === 'low' ? 'Lower is better' : 'Higher is better') +
      row('Reference type', b.referenceType) + row('Population', b.population) +
      row('Sport', b.sport) + row('Competitive level', b.level) +
      row('Sex', b.sex) + row('Age range', b.ageRange ? b.ageRange.join('–') : 'any') +
      row('Body-mass band', b.bwBand ? b.bwBand.label : 'all') +
      row('Sample size', b.n === null ? 'not applicable' : b.n) +
      row('Method', b.method) + row('Confidence', b.confidence) +
      row('Added', b.dateAdded) +
      '</dl>';

    if (b.bands) {
      html += '<div class="stat-lbl" style="margin-top:16px">Band anchors</div>' +
        '<div class="grid g3" style="margin-top:8px">' +
        ['p25', 'p65', 'p90'].map(function (k) {
          return '<div class="field"><label>' + k.slice(1) + 'th percentile</label>' +
            '<input class="big" type="number" step="any" id="bd_' + k + '" value="' + b.bands[k] + '"></div>';
        }).join('') + '</div>' +
        '<div class="fineprint">Editing these changes every percentile derived from this set, including on reports ' +
        'already generated — the app recalculates from the raw data every time it draws a report, so old reports ' +
        'will show the new numbers. Note what you changed and why.</div>';
    }

    html += '<div class="stat-lbl" style="margin-top:16px">Protocol this set applies to</div>' +
      '<p class="fineprint" style="margin-top:4px;line-height:1.65">' + U.esc(b.protocol) + '</p>';
    html += '<div class="stat-lbl" style="margin-top:14px">Source</div>' +
      '<p class="fineprint" style="margin-top:4px;line-height:1.65">' + U.esc(b.source.citation) +
      '<br><b>Verified:</b> ' + (b.source.verified ? 'yes' : 'NO — not a published value') +
      (b.source.note ? '<br>' + U.esc(b.source.note) : '') + '</p>';
    if (b.notes) {
      html += '<div class="stat-lbl" style="margin-top:14px">Notes</div>' +
        '<p class="fineprint" style="margin-top:4px;line-height:1.65">' + U.esc(b.notes) + '</p>';
    }
    html += '<div class="stat-lbl" style="margin-top:14px">Why this benchmark?</div>' +
      '<p class="fineprint" style="margin-top:4px;line-height:1.65"><b>What it measures:</b> ' +
      U.esc(t.evidence.whatItMeasures) + '<br><b>Why it is relevant:</b> ' + U.esc(t.evidence.whyRelevant) +
      '<br><b>Limitations:</b> ' + U.esc(t.evidence.limitations) +
      '<br><b>Strength of the evidence:</b> ' + U.esc(t.evidence.evidenceStrength) + '</p>';

    var buttons = [{ label: 'Close', class: 'btn-ghost' }];
    if (b.bands) {
      buttons.push({ label: 'Save anchors', class: 'btn-primary', onClick: function () {
        var p25 = U.numVal(U.$('#bd_p25')), p65 = U.numVal(U.$('#bd_p65')), p90 = U.numVal(U.$('#bd_p90'));
        if (p25 === null || p65 === null || p90 === null) { U.toast('All three anchors are needed'); return true; }
        var ok = b.direction === 'low' ? (p25 > p65 && p65 > p90) : (p25 < p65 && p65 < p90);
        if (!ok) {
          U.toast(b.direction === 'low'
            ? 'For a lower-is-better metric the anchors must decrease: 25th > 65th > 90th'
            : 'The anchors must increase: 25th < 65th < 90th');
          return true;
        }
        if (!isCustom) {
          /* shipped sets are overridden by a stored copy rather than mutated,
             so the original stays visible in the source file */
          var copy = JSON.parse(JSON.stringify(b));
          copy.bands = { p25: p25, p65: p65, p90: p90 };
          copy.notes = (copy.notes ? copy.notes + ' ' : '') +
            '[Anchors edited in the app on ' + P.Model.today() + ', overriding the shipped values.]';
          copy.dateAdded = P.Model.today();
          if (!S.db.customBenchmarks) S.db.customBenchmarks = [];
          S.db.customBenchmarks = S.db.customBenchmarks.filter(function (x) { return x.id !== copy.id; });
          /* keep the same id so it replaces the shipped set in matching */
          S.db.customBenchmarks.push(copy);
        } else {
          b.bands = { p25: p25, p65: p65, p90: p90 };
        }
        S.saveNow();
        P.App.saveState(true);
        U.toast('Anchors updated');
        P.App.render();
      } });
    }
    U.modal({ title: (m ? m.label : b.metric) + ' — ' + b.sex, bodyHtml: html, buttons: buttons });
  }

  function addForm() {
    var S = P.Store;
    var metrics = P.Tests.benchmarkedMetrics();
    U.modal({
      title: 'Add a reference set',
      bodyHtml: '<div class="grid g2">' +
        f('Test and metric', '<select id="nbMetric">' + metrics.map(function (m) {
          return '<option value="' + m.testId + '|' + m.metric.key + '">' +
            U.esc(m.test.shortName + ' — ' + m.metric.label) + '</option>';
        }).join('') + '</select>') +
        f('Sex', '<select id="nbSex">' + U.selectOpts(P.Model.SEXES, 'male') + '</select>') +
        f('Reference type', '<select id="nbType">' + U.selectOpts([
          { id: 'PUBLISHED', label: 'Published — I have the paper' },
          { id: 'PGP_PROVISIONAL', label: 'PGP provisional — coaching judgement' }
        ], 'PGP_PROVISIONAL') + '</select>') +
        f('Confidence', '<select id="nbConf">' + U.selectOpts([
          { id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }
        ], 'low') + '</select>') +
        f('Age from', '<input type="number" id="nbAgeMin" value="18">') +
        f('Age to', '<input type="number" id="nbAgeMax" value="35">') +
        '</div>' +
        '<div class="stat-lbl" style="margin-top:6px">Band anchors — the value at each percentile</div>' +
        '<div class="grid g3" style="margin-top:8px">' +
        f('25th percentile', '<input class="big" type="number" step="any" id="nbP25">') +
        f('65th percentile', '<input class="big" type="number" step="any" id="nbP65">') +
        f('90th percentile', '<input class="big" type="number" step="any" id="nbP90">') +
        '</div>' +
        f('Population', '<input type="text" id="nbPop" value="Trained combat-sport athletes">') +
        f('Sample size (leave blank if not applicable)', '<input type="number" id="nbN">') +
        f('Protocol this set applies to', '<textarea id="nbProto" placeholder="Device, arm position, rep scheme, machine, ball mass — everything that would make a result non-comparable."></textarea>') +
        f('Source / citation', '<input type="text" id="nbSrc" placeholder="Author, title, journal, year — or PGP provisional">') +
        '<label class="check"><input type="checkbox" id="nbVerified"><span>I have the full text in front of me and ' +
        'have taken these values from it. Leave unchecked for a coaching-judgement set — the app will label it as ' +
        'provisional wherever it is used.</span></label>',
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: 'Add set', class: 'btn-primary', onClick: function () {
          var parts = U.$('#nbMetric').value.split('|');
          var m = P.Tests.metric(parts[0], parts[1]);
          var p25 = U.numVal(U.$('#nbP25')), p65 = U.numVal(U.$('#nbP65')), p90 = U.numVal(U.$('#nbP90'));
          if (p25 === null || p65 === null || p90 === null) { U.toast('All three anchors are needed'); return true; }
          var dir = m.direction;
          var ok = dir === 'low' ? (p25 > p65 && p65 > p90) : (p25 < p65 && p65 < p90);
          if (!ok) {
            U.toast(dir === 'low' ? 'Lower-is-better: anchors must decrease 25th > 65th > 90th'
                                  : 'Anchors must increase 25th < 65th < 90th');
            return true;
          }
          var verified = U.$('#nbVerified').checked;
          var type = U.$('#nbType').value;
          if (type === 'PUBLISHED' && !verified) {
            U.toast('A published set requires the source to be confirmed as verified');
            return true;
          }
          var b = {
            id: 'custom_' + P.Model.uid('bm'),
            testId: parts[0], metric: parts[1],
            referenceType: type,
            sex: U.$('#nbSex').value,
            ageRange: [U.numVal(U.$('#nbAgeMin')) || 18, U.numVal(U.$('#nbAgeMax')) || 35],
            bwBand: null, population: U.$('#nbPop').value.trim(), sport: 'any', level: 'any',
            direction: dir, unit: m.unit, conditions: {},
            method: 'bands', bands: { p25: p25, p65: p65, p90: p90 },
            distribution: null, percentiles: null,
            n: U.numVal(U.$('#nbN')),
            protocol: U.$('#nbProto').value.trim() || 'Not specified — record it before relying on this set.',
            source: { citation: U.$('#nbSrc').value.trim() || 'Not specified', verified: verified,
                      note: verified ? 'Entered from the full text.' : 'Coaching judgement, not a published value.' },
            confidence: U.$('#nbConf').value, dateAdded: P.Model.today(),
            notes: 'Added in the app.'
          };
          if (!S.db.customBenchmarks) S.db.customBenchmarks = [];
          S.db.customBenchmarks.push(b);
          S.saveNow();
          P.App.saveState(true);
          U.toast('Reference set added');
          P.App.render();
        } }
      ]
    });
  }

  function internalCount() {
    var S = P.Store, set = S.settings(), n = 0;
    P.Tests.benchmarkedMetrics().forEach(function (m) {
      ['male', 'female'].forEach(function (sex) {
        var r = P.Engine.buildInternalNorm(S.db, m.testId, m.metric.key, {
          sex: sex, ageRange: [18, 35], conditions: {},
          protocolVersion: P.Settings.PROTOCOL_VERSION
        }, set);
        if (r && r.available) n++;
      });
    });
    return n;
  }

  function row(k, v) {
    return '<dt>' + U.esc(k) + '</dt><dd style="font-variant-numeric:normal">' +
      U.esc(v === null || v === undefined ? '—' : String(v)) + '</dd>';
  }
  function f(label, control, hint) {
    return '<div class="field"><label>' + U.esc(label) + '</label>' + control +
      (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + '</div>';
  }
  function tile(l, v, s) {
    return '<div class="stat"><div class="stat-lbl">' + U.esc(l) + '</div><div class="stat-val num">' +
      U.esc(String(v)) + '</div>' + (s ? '<div class="stat-sub">' + U.esc(s) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.benchmarks = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
