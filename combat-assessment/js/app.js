/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/app.js — SHELL, ROUTER AND BOOTSTRAP
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;

  var App = {
    page: 'dashboard',
    /* view state shared between pages */
    ctx: { athleteId: null, sessionId: null, eventId: null, step: 0, wizardSession: null },
    views: {}   /* registered by each view file: { render(mount) } */
  };

  /* Four tabs. Everything a coach does at a gym is on the first one; the
     rest of the system lives behind More, which is where you go between
     testing days rather than during one. */
  var PAGES = [
    { id: 'test',       label: 'Testing',  primary: true },
    { id: 'athletes',   label: 'Athletes', primary: true },
    { id: 'reports',    label: 'Reports',  primary: true },
    { id: 'more',       label: 'More',     primary: true },
    { id: 'dashboard',  label: 'Gym view' },
    { id: 'database',   label: 'Database' },
    { id: 'benchmarks', label: 'Benchmarks' },
    { id: 'protocol',   label: 'Protocol' },
    { id: 'settings',   label: 'Settings' }
  ];
  App.PAGES = PAGES;

  App.go = function (page, ctx) {
    if (ctx) Object.assign(App.ctx, ctx);
    App.page = page;
    var primary = PAGES.filter(function (p) { return p.id === page; })[0];
    var highlight = (primary && primary.primary) ? page : 'more';
    U.$$('.nav-tab').forEach(function (t) {
      if (t.dataset.page === highlight) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    U.$$('.pg').forEach(function (p) { p.classList.toggle('on', p.id === 'pg-' + page); });
    App.render();
    if (location.hash.slice(1) !== page) history.replaceState(null, '', '#' + page);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  };

  App.render = function () {
    var mount = U.$('#pg-' + App.page);
    if (!mount) return;
    var view = App.views[App.page];
    if (!view) { mount.innerHTML = U.empty('Not available', 'This page is not registered.'); return; }
    try {
      view.render(mount);
    } catch (e) {
      mount.innerHTML = U.notice('critical',
        '<b>This page could not be drawn.</b><br>' + U.esc(e.message) +
        '<br><span class="fineprint">Your data is not affected. Export a JSON backup from Settings, then reload.</span>');
      if (root.console) console.error(e);
    }
    U.bindTips(mount);
  };

  /* Re-render the current page and any page that shows aggregate counts. */
  App.refresh = function () { App.render(); };

  /* The header says where the data is actually going, at all times. A coach
     about to drive away from a gym should never have to guess. */
  App.saveState = function () {
    var el = U.$('#saveState');
    if (!el) return;
    var S = P.Store, dest = S.destination();

    if (S.lastError) {
      el.className = 'save-state bad';
      el.textContent = 'NOT SAVED';
      el.title = S.lastError;
      return;
    }
    if (dest.kind === 'file') {
      el.className = 'save-state ok';
      el.textContent = '\u25cf ' + dest.name;
      el.title = dest.detail;
      return;
    }
    if (S.unsaved > 0) {
      el.className = 'save-state warn';
      el.textContent = S.unsaved + ' unsaved';
      el.title = 'This browser is holding ' + S.unsaved + ' change' + (S.unsaved === 1 ? '' : 's') +
        ' that are not in a file anywhere. Connect a workbook file or export before you finish.';
      return;
    }
    el.className = 'save-state ok';
    el.textContent = 'Saved in browser';
    el.title = dest.detail;
  };

  App.touch = function () {
    P.Store.autosave(function () { App.saveState(); App.storageNotice(); });
  };

  /* ---------------- boot ---------------- */
  function boot() {
    var db = P.Store.load();
    P.Store.onChange = function () { App.saveState(); };

    /* nav */
    var nav = U.$('#nav');
    PAGES.filter(function (p) { return p.primary; }).forEach(function (p) {
      nav.appendChild(U.el('button', {
        class: 'nav-tab', dataset: { page: p.id }, type: 'button',
        onclick: function () {
          /* A top-level nav click is "take me to this section", not "resume
             whatever I was last looking at". Clear the per-item context so
             each page opens at its own list rather than deep inside the last
             athlete, session or testing day. */
          App.go(p.id, { athleteId: null, sessionId: null, eventId: null,
                         step: 0, compare: false });
        }
      }, p.label));
    });

    /* header meta */
    U.$('#hdrDate').textContent = U.date(P.Model.today());
    U.$('#hdrProtocol').textContent = P.Settings.PROTOCOL_VERSION;

    /* modal close wiring */
    U.$('#modalClose').addEventListener('click', U.closeModal);
    U.$('#modalBg').addEventListener('click', function (e) {
      if (e.target === U.$('#modalBg')) U.closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { U.closeModal(); U.tipHide(); }
    });

    /* Reconnect the workbook file, if one was used before. Reading a file
       is asynchronous, so the app starts on the browser copy and adopts the
       file's contents the moment they arrive. */
    if (P.FileStore) {
      P.FileStore.restore().then(function (handle) {
        if (!handle) { App.saveState(); App.storageNotice(); return; }
        return P.FileStore.read().then(function (text) {
          if (text && P.Store.adoptText(text)) U.toast('Workbook loaded from ' + P.FileStore.name);
          App.saveState();
          App.storageNotice();
          App.render();
        });
      }).catch(function () { App.saveState(); App.storageNotice(); });
    }

    /* where the data is going, and anything that needs acting on */
    App.storageNotice();

    /* deep link */
    var hash = location.hash.slice(1);
    /* Opens on the testing screen: that is what the app is for. */
    App.go(PAGES.some(function (p) { return p.id === hash; }) ? hash : 'test');
    window.addEventListener('hashchange', function () {
      var h = location.hash.slice(1);
      if (h && h !== App.page && PAGES.some(function (p) { return p.id === h; })) App.go(h);
    });

    App.saveState();
  }

  /* The banner above every page: what is holding this data, and what to do
     about it. Rewritten whenever the storage situation changes. */
  App.storageNotice = function () {
    var el = U.$('#globalNotice');
    if (!el) return;
    var S = P.Store, F = P.FileStore, dest = S.destination();
    var html = '';

    if (S.lastError) {
      html += U.notice('critical', '<b>Storage problem.</b> ' + U.esc(S.lastError));
    }
    if (F && F.state === 'needs_permission') {
      html += U.notice('critical', '<b>Not saving to your workbook file.</b> ' + U.esc(F.describe().detail) +
        ' <button class="btn btn-sm btn-primary" id="gnReconnect" style="margin-left:8px">Reconnect ' +
        U.esc(F.name || 'workbook') + '</button>');
    } else if (F && F.state === 'error') {
      html += U.notice('critical', '<b>Could not write to the workbook file.</b> ' + U.esc(F.describe().detail));
    } else if (dest.kind !== 'file' && S.unsaved >= 12) {
      html += U.notice('warning', '<b>' + S.unsaved + ' changes are only in this browser.</b> ' +
        'Browser storage is not a filing cabinet — it goes when the device does, and Safari clears it for sites ' +
        'left unopened for about a week. ' +
        (F && F.supported()
          ? 'Connect a workbook file so every change writes straight to disk.'
          : 'Export before you finish here.') +
        ' <button class="btn btn-sm btn-primary" id="gnFix" style="margin-left:8px">' +
        (F && F.supported() ? 'Connect a workbook file' : 'Export now') + '</button>');
    }
    if (P.Store.hasDemoData()) {
      html += U.notice('gold',
        '<b>Sample data loaded.</b> Every athlete currently in this database is fictional and is here to demonstrate ' +
        'the system. Remove it from <b>Settings \u2192 Data</b> before you start entering real athletes, so your gym ' +
        'aggregates and your PGP internal norms are built from real data only.');
    }
    el.innerHTML = html;

    var rc = U.$('#gnReconnect', el);
    if (rc) rc.addEventListener('click', function () {
      P.FileStore.reconnect().then(function (ok) {
        if (!ok) { U.toast('Permission not granted'); App.storageNotice(); return; }
        P.Store.saveNow();
        U.toast('Workbook reconnected');
        App.saveState(); App.storageNotice();
      });
    });
    var fx = U.$('#gnFix', el);
    if (fx) fx.addEventListener('click', function () {
      if (P.FileStore && P.FileStore.supported()) P.App.views.settings.connectWorkbook();
      else U.exportFile('json');
    });
  };

  P.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
