/* ==========================================================================
   js/ui/more.js — everything that is not a testing day
   Kept off the main navigation so the four tabs a coach uses in a gym stay
   uncluttered.
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;

  var ITEMS = [
    { id: 'dashboard', name: 'Gym view',
      desc: 'Squad averages, spread of performance levels and the limitation shared by most of the group. De-identified — no names, no individual results.' },
    { id: 'database', name: 'Database',
      desc: 'Every stored session with its raw numbers, protocol and kit. Export to CSV or JSON, or merge in another device’s file.' },
    { id: 'benchmarks', name: 'Benchmarks',
      desc: 'The reference sets behind every percentile, where each came from, and how much confidence it carries. Edit the anchors as your own data tells you to.' },
    { id: 'protocol', name: 'Protocol',
      desc: 'How to run the battery: testing order, every test written out, the design decisions, and the assumptions and limitations to be straight about.' },
    { id: 'settings', name: 'Settings',
      desc: 'Where the data is kept, backups, scoring rules and thresholds, and the self-test suite.' }
  ];

  function render(mount) {
    var S = P.Store, st = S.stats(), dest = S.destination();

    var html = '<div class="pg-head"><h1 class="pg-title">More</h1>' +
      '<p class="pg-sub">The parts you use between testing days.</p></div>';

    html += '<div class="grid g4" style="margin-bottom:18px">' +
      tile('Athletes', st.athletes) +
      tile('Sessions', st.sessions) +
      tile('Retested', st.retested) +
      tile('Saving to', dest.kind === 'file' ? 'a file' : 'this browser',
           dest.kind === 'file' ? dest.name : (S.unsaved ? S.unsaved + ' unsaved' : '')) +
      '</div>';

    ITEMS.forEach(function (it) {
      html += '<div class="q-item" data-go="' + it.id + '" style="grid-template-columns:1fr auto">' +
        '<div><div class="q-name">' + U.esc(it.name) + '</div>' +
        '<div class="q-meta" style="white-space:normal">' + U.esc(it.desc) + '</div></div>' +
        '<div><button class="btn btn-sm">Open</button></div></div>';
    });

    mount.innerHTML = html;
    U.$$('[data-go]', mount).forEach(function (n) {
      n.addEventListener('click', function () { P.App.go(n.dataset.go); });
    });
  }

  function tile(l, v, s) {
    return '<div class="stat"><div class="stat-lbl">' + U.esc(l) + '</div>' +
      '<div class="stat-val num" style="font-size:20px">' + U.esc(String(v)) + '</div>' +
      (s ? '<div class="stat-sub">' + U.esc(s) + '</div>' : '') + '</div>';
  }

  P.App = P.App || {}; P.App.views = P.App.views || {};
  P.App.views.more = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
