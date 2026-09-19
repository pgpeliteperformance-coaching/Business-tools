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

  var PAGES = [
    { id: 'dashboard',  label: 'Dashboard' },
    { id: 'athletes',   label: 'Athletes' },
    { id: 'newtest',    label: 'New Test' },
    { id: 'event',      label: 'Testing Day' },
    { id: 'database',   label: 'Database' },
    { id: 'benchmarks', label: 'Benchmarks' },
    { id: 'reports',    label: 'Reports' },
    { id: 'protocol',   label: 'Protocol' },
    { id: 'settings',   label: 'Settings' }
  ];
  App.PAGES = PAGES;

  App.go = function (page, ctx) {
    if (ctx) Object.assign(App.ctx, ctx);
    App.page = page;
    U.$$('.nav-tab').forEach(function (t) {
      if (t.dataset.page === page) t.setAttribute('aria-current', 'page');
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

  App.saveState = function (ok) {
    var el = U.$('#saveState');
    if (!el) return;
    if (P.Store.lastError) {
      el.textContent = 'NOT SAVED';
      el.className = 'save-state';
      el.style.color = 'var(--critical)';
      el.title = P.Store.lastError;
      return;
    }
    el.style.color = '';
    el.className = 'save-state ok';
    el.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  App.touch = function () {
    P.Store.autosave(function (ok) { App.saveState(ok); });
  };

  /* ---------------- boot ---------------- */
  function boot() {
    var db = P.Store.load();

    /* nav */
    var nav = U.$('#nav');
    PAGES.forEach(function (p) {
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

    /* storage warning */
    if (P.Store.lastError) {
      U.$('#globalNotice').innerHTML = U.notice('critical', '<b>Storage problem.</b> ' +
        U.esc(P.Store.lastError));
    } else if (P.Store.hasDemoData()) {
      U.$('#globalNotice').innerHTML = U.notice('gold',
        '<b>Sample data loaded.</b> Every athlete currently in this database is fictional and is here to demonstrate the system. ' +
        'Remove it from <b>Settings → Data</b> before you start entering real athletes. ' +
        'Fictional athletes are excluded from nothing automatically except where marked, so clear them before building PGP internal norms.');
    }

    /* deep link */
    var hash = location.hash.slice(1);
    App.go(PAGES.some(function (p) { return p.id === hash; }) ? hash : 'dashboard');
    window.addEventListener('hashchange', function () {
      var h = location.hash.slice(1);
      if (h && h !== App.page && PAGES.some(function (p) { return p.id === h; })) App.go(h);
    });

    App.saveState(true);
  }

  P.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
