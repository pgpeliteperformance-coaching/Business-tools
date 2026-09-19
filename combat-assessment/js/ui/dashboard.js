/* ==========================================================================
   js/ui/dashboard.js — DASHBOARD + GYM DASHBOARD
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;

  var filters = { gymId: '', sport: '', sex: '', level: '', ageMin: '', ageMax: '', massMin: '', massMax: '' };

  function render(mount) {
    var App = P.App, S = P.Store, db = S.db, set = S.settings();
    var stats = S.stats();

    var f = {};
    Object.keys(filters).forEach(function (k) {
      if (filters[k] !== '' && filters[k] !== null) {
        f[k] = (['ageMin', 'ageMax', 'massMin', 'massMax'].indexOf(k) > -1) ? parseFloat(filters[k]) : filters[k];
      }
    });
    var ag = P.Engine.gymAggregate(db, f, set);

    var html = '';
    html += '<div class="pg-head"><div class="eyebrow">' + U.esc(set.branding.tagline) + '</div>' +
      '<h1 class="pg-title">Dashboard</h1>' +
      '<p class="pg-sub">Squad-level view of everything tested so far. Figures here are aggregates only — ' +
      'no athlete is named and no individual result is shown.</p></div>';

    /* ---- headline tiles ---- */
    html += '<div class="grid g4">' +
      tile('Athletes tested', stats.athletes, ag.athleteCount + ' in the current filter') +
      tile('Testing sessions', stats.sessions, stats.retested + ' athlete' + (stats.retested === 1 ? '' : 's') + ' retested') +
      tile('Gyms', stats.gyms, 'Protocol ' + P.Settings.PROTOCOL_VERSION) +
      tile('Reference sets', P.Benchmarks.BENCHMARKS.length + (db.customBenchmarks || []).length,
           'All currently PGP provisional') +
      '</div>';

    /* ---- filters ---- */
    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Filter the squad</span>' +
      '<span class="card-note">' + ag.athleteCount + ' athlete' + (ag.athleteCount === 1 ? '' : 's') +
      ' match</span></div><div class="card-bd">' +
      '<div class="searchbar" id="dashFilters">' +
      '<select data-f="gymId">' + U.selectOpts(db.gyms.map(function (g) { return { id: g.id, label: g.name }; }), filters.gymId, 'All gyms') + '</select>' +
      '<select data-f="sport">' + U.selectOpts(P.Model.SPORTS, filters.sport, 'All sports') + '</select>' +
      '<select data-f="sex">' + U.selectOpts(P.Model.SEXES, filters.sex, 'All') + '</select>' +
      '<select data-f="level">' + U.selectOpts(P.Model.LEVELS, filters.level, 'All levels') + '</select>' +
      '<input type="number" data-f="ageMin" placeholder="Age from" value="' + U.esc(filters.ageMin) + '" style="flex:0 1 100px">' +
      '<input type="number" data-f="ageMax" placeholder="Age to" value="' + U.esc(filters.ageMax) + '" style="flex:0 1 100px">' +
      '<input type="number" data-f="massMin" placeholder="kg from" value="' + U.esc(filters.massMin) + '" style="flex:0 1 100px">' +
      '<input type="number" data-f="massMax" placeholder="kg to" value="' + U.esc(filters.massMax) + '" style="flex:0 1 100px">' +
      '<button class="btn btn-sm btn-ghost" id="dashClear">Clear</button>' +
      '</div>';
    if (ag.smallSampleWarning) {
      html += U.notice('warning', '<b>Small sample.</b> ' + U.esc(ag.smallSampleWarning));
    }
    html += '<div class="fineprint" style="margin-top:10px">' + U.esc(ag.privacyNote) + '</div>';
    html += '</div></div>';

    if (!ag.athleteCount) {
      html += '<div class="card" style="margin-top:16px">' +
        U.empty('Nothing to aggregate', 'No athlete matches the current filter.') + '</div>';
      mount.innerHTML = html;
      wire(mount);
      return;
    }

    /* ---- category averages ---- */
    html += '<div class="grid g21" style="margin-top:16px">' +
      '<div class="card"><div class="card-hd"><span class="card-ttl">Average category percentile</span>' +
      '<span class="card-note">mean across matched athletes</span></div>' +
      '<div class="card-bd"><div id="dashCatBars"></div>' +
      '<div class="fineprint" style="margin-top:12px">Each athlete\'s most recent qualifying session is used. ' +
      'Movement is a criterion score (percentage of the achievable score), not a percentile — it is shown on the same ' +
      'row for convenience, not because the two numbers mean the same thing.</div></div></div>';

    var pri = ag.commonPriorities.slice(0, 5);
    html += '<div class="stack">' +
      '<div class="card"><div class="card-hd"><span class="card-ttl">Most common development priority</span></div>' +
      '<div class="card-bd">' +
      (pri.length
        ? '<dl class="kv">' + pri.map(function (p) {
            return '<dt>' + U.esc(p.categoryName) + '</dt><dd>' + p.count + ' athlete' +
              (p.count === 1 ? '' : 's') + '</dd>';
          }).join('') + '</dl>' +
          '<div class="fineprint" style="margin-top:10px">Counted from each athlete\'s top three development ' +
          'priorities, which are selected on percentile, test reliability and reference confidence — not on the ' +
          'lowest number alone.</div>'
        : '<div class="fineprint">No shared development priority across this group.</div>') +
      '</div></div>';

    html += '<div class="card"><div class="card-hd"><span class="card-ttl">Test completion</span>' +
      '<span class="card-note">share of athletes with a result</span></div><div class="card-bd">';
    var comp = Object.keys(ag.completion).map(function (k) { return ag.completion[k]; })
      .sort(function (a, b) { return b.pct - a.pct; });
    comp.forEach(function (c) {
      html += '<div class="pbar" style="grid-template-columns:minmax(90px,1.3fr) 3fr auto"><div class="pbar-lbl">' +
        U.esc(c.name) + '</div><div class="pbar-track">' +
        '<span class="pbar-fill lv3" style="width:' + Math.max(1, c.pct) + '%"></span></div>' +
        '<div class="pbar-end"><span class="pbar-pct" style="font-size:12px">' + c.pct + '%</span></div></div>';
    });
    html += '<div class="fineprint" style="margin-top:10px">A low completion rate usually reflects the facility ' +
      '(no sprint space, no bike, no bench) rather than the athletes. Missing tests are never scored as zero.</div>';
    html += '</div></div></div></div>';

    /* ---- level distribution ---- */
    html += '<div class="card" style="margin-top:16px"><div class="card-hd">' +
      '<span class="card-ttl">Distribution of performance levels</span>' +
      '<span class="card-note">percentile-scored categories</span></div>' +
      '<div class="card-bd"><div id="dashDist"></div></div></div>';

    /* ---- gym report link ---- */
    html += '<div class="btn-row" style="margin-top:16px">' +
      '<button class="btn" id="dashPrint">Print / save this gym report as PDF</button>' +
      '<button class="btn btn-ghost" id="dashExportScores">Export scores as CSV</button>' +
      '</div>';

    mount.innerHTML = html;
    P.Charts.categoryBars(U.$('#dashCatBars', mount), Object.keys(ag.categories).map(function (k) {
      var c = ag.categories[k];
      return {
        categoryId: c.categoryId, categoryName: c.categoryName,
        status: c.n ? 'scored' : 'insufficient',
        percentile: c.mean, displayPercentile: c.mean === null ? null : Math.round(c.mean),
        scoreType: c.scoreType, n: c.n,
        level: c.mean === null ? null : (c.scoreType === 'criterion'
          ? P.Engine.calculateCriterionLevel(c.mean, set)
          : P.Engine.calculatePerformanceLevel(c.mean, set))
      };
    }));
    P.Charts.levelDistribution(U.$('#dashDist', mount), ag.categories, set);
    wire(mount);
  }

  function tile(label, value, sub) {
    return '<div class="stat"><div class="stat-lbl">' + U.esc(label) + '</div>' +
      '<div class="stat-val num">' + U.esc(String(value)) + '</div>' +
      '<div class="stat-sub">' + U.esc(sub || '') + '</div></div>';
  }

  function wire(mount) {
    U.$$('#dashFilters [data-f]', mount).forEach(function (n) {
      n.addEventListener('change', function () {
        filters[n.dataset.f] = n.value;
        P.App.render();
      });
    });
    var clr = U.$('#dashClear', mount);
    if (clr) clr.addEventListener('click', function () {
      Object.keys(filters).forEach(function (k) { filters[k] = ''; });
      P.App.render();
    });
    var pr = U.$('#dashPrint', mount);
    if (pr) pr.addEventListener('click', function () { window.print(); });
    var ex = U.$('#dashExportScores', mount);
    if (ex) ex.addEventListener('click', function () { U.exportFile('scores'); });
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.dashboard = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
