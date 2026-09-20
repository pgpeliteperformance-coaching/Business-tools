/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/core/store.js — PERSISTENCE
   --------------------------------------------------------------------------
   localStorage only: no backend, no account, no network. The database lives
   on the device it was entered on, which means:
     * it works in a gym with no signal,
     * nothing leaves the device unless you export it,
     * and an export is the ONLY backup. Export after every testing day.
   Every write is wrapped: a full or blocked localStorage must not lose the
   data already in memory.
   ========================================================================== */
(function (root) {
  'use strict';

  var isNode = (typeof require === 'function' && typeof module !== 'undefined');
  var Model    = isNode ? require('./model.js')            : root.PGP.Model;
  var Settings = isNode ? require('../config/settings.js') : root.PGP.Settings;
  var Sample   = isNode ? require('../data/sample.js')     : root.PGP.Sample;
  var FileStore = isNode ? require('./filestore.js')       : root.PGP.FileStore;

  var KEY = 'pgp_combat_assessment_v1';
  var S = {
    key: KEY, db: null, lastSaved: null, lastError: null, storageOk: true,
    /* Unsaved-work tracking. `unsaved` counts changes not yet written to a
       workbook file or an export, so the UI can insist on one before the
       coach leaves a gym rather than hoping they remember. */
    unsaved: 0, lastExportAt: null, onChange: null
  };

  function ls() {
    try {
      if (typeof localStorage === 'undefined') return null;
      localStorage.setItem('__pgp_probe', '1');
      localStorage.removeItem('__pgp_probe');
      return localStorage;
    } catch (e) { S.storageOk = false; return null; }
  }

  /* Adopt a database read out of the workbook file. Called by the boot
     sequence once the file has been read, because reading a file is async
     and load() is not. */
  S.adoptText = function (text) {
    try {
      var parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.athletes) || !Array.isArray(parsed.sessions)) return false;
      S.db = S.hydrate(parsed);
      S.unsaved = 0;
      if (ls()) { try { ls().setItem(KEY, JSON.stringify(S.db)); } catch (e) {} }
      if (S.onChange) S.onChange();
      return true;
    } catch (e) {
      S.lastError = 'The workbook file could not be read (' + e.message +
        '). The data already in this browser has been left untouched.';
      return false;
    }
  };

  /* Shared by load() and adoptText(): fill in anything a database saved by
     an older build is missing, then re-derive so this build's calculations
     apply to stored data. */
  S.hydrate = function (parsed) {
    var fresh = Model.newDatabase();
    var db = Object.assign(fresh, parsed);
    db.settings = Object.assign(Settings.cloneDefaults(), parsed.settings || {});
    db.settings.scoring = Object.assign(Settings.cloneDefaults().scoring,
      (parsed.settings || {}).scoring || {});
    db.settings.scoring.weights = Object.assign(Settings.cloneDefaults().scoring.weights,
      ((parsed.settings || {}).scoring || {}).weights || {});
    (db.sessions || []).forEach(function (s) { Model.deriveSession(s); });
    return db;
  };

  S.load = function () {
    var store = ls();
    if (!store) {
      S.db = S.seed();
      S.unsaved = 0;
      S.lastError = 'This browser is blocking local storage (often private browsing). The app works, but NOTHING WILL BE SAVED when you close the tab. Connect a workbook file, or export to JSON before you finish.';
      return S.db;
    }
    var raw = store.getItem(KEY);
    if (!raw) { S.db = S.seed(); S.save(); S.unsaved = 0; return S.db; }
    try {
      S.db = S.hydrate(JSON.parse(raw));
      S.unsaved = 0;
      return S.db;
    } catch (e) {
      S.lastError = 'The saved database could not be read (' + e.message +
        '). A fresh database has been started. Your previous data has NOT been deleted — it is still in this browser under the key ' +
        KEY + ', so export or recover it before saving over it.';
      S.db = Model.newDatabase();
      return S.db;
    }
  };

  S.seed = function () {
    var db = Sample.demoDatabase();
    db.seededAt = new Date().toISOString();
    return db;
  };

  S.save = function () {
    var store = ls();
    var text = null;
    try { S.db.savedAt = new Date().toISOString(); text = JSON.stringify(S.db); }
    catch (e) { S.lastError = 'Could not serialise the database: ' + e.message; return false; }

    /* The workbook file, where one is connected, is the real destination.
       Browser storage is kept as a same-device cache behind it. */
    var toFile = false;
    if (FileStore && FileStore.state === 'connected') {
      toFile = true;
      FileStore.write(text).then(function (ok) {
        if (ok) { S.unsaved = 0; S.lastExportAt = new Date(); }
        if (S.onChange) S.onChange();
      });
    } else {
      S.unsaved++;
    }

    if (!store) return toFile;
    try {
      store.setItem(KEY, text);
      S.lastSaved = new Date();
      S.lastError = null;
      if (S.onChange) S.onChange();
      return true;
    } catch (e) {
      S.lastError = (e && e.name === 'QuotaExceededError')
        ? 'Local storage is full, so this change was NOT saved. Export to JSON now, then use Settings to remove the sample data or archive old athletes.'
        : 'Could not save to local storage: ' + (e && e.message);
      return false;
    }
  };

  /* Debounced autosave for rapid data entry on a testing day. */
  var timer = null;
  S.autosave = function (cb) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      var ok = S.save();
      if (cb) cb(ok);
    }, 350);
  };

  S.saveNow = function () { if (timer) { clearTimeout(timer); timer = null; } return S.save(); };

  S.replace = function (db) { S.db = db; return S.saveNow(); };

  S.reset = function () {
    S.db = Model.newDatabase();
    return S.saveNow();
  };

  S.loadDemo = function () { S.db = S.seed(); return S.saveNow(); };

  S.loadQC = function () { S.db = Sample.qcDatabase(); return S.saveNow(); };

  /* Remove every athlete and session flagged as demo/fictional, keeping any
     real data the coach has entered alongside it. */
  S.clearDemoData = function () {
    var demoIds = {};
    (S.db.athletes || []).forEach(function (a) { if (a.isDemo) demoIds[a.id] = true; });
    S.db.athletes = (S.db.athletes || []).filter(function (a) { return !a.isDemo; });
    S.db.sessions = (S.db.sessions || []).filter(function (s) { return !demoIds[s.athleteId]; });
    S.db.gyms = (S.db.gyms || []).filter(function (g) { return !/\(sample\)|QC Test Gym/.test(g.name); });
    S.db.events = (S.db.events || []).filter(function (e) { return e.id !== 'evt_demo'; });
    S.db.isDemo = false;
    S.db.isQC = false;
    return { removedAthletes: Object.keys(demoIds).length, ok: S.saveNow() };
  };

  S.hasDemoData = function () {
    return (S.db.athletes || []).some(function (a) { return a.isDemo; });
  };

  /* ---- accessors ------------------------------------------------------ */
  S.settings = function () { return (S.db && S.db.settings) || Settings.DEFAULTS; };
  S.athlete = function (id) {
    return (S.db.athletes || []).filter(function (a) { return a.id === id; })[0] || null;
  };
  S.gym = function (id) {
    return (S.db.gyms || []).filter(function (g) { return g.id === id; })[0] || null;
  };
  S.session = function (id) {
    return (S.db.sessions || []).filter(function (s) { return s.id === id; })[0] || null;
  };
  S.event = function (id) {
    return (S.db.events || []).filter(function (e) { return e.id === id; })[0] || null;
  };
  S.sessionsFor = function (athleteId) {
    return (S.db.sessions || []).filter(function (s) { return s.athleteId === athleteId; })
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  };
  S.latestSession = function (athleteId) {
    var ss = S.sessionsFor(athleteId);
    return ss.length ? ss[ss.length - 1] : null;
  };
  S.previousSession = function (session) {
    var ss = S.sessionsFor(session.athleteId).filter(function (s) {
      return s.date < session.date || (s.date === session.date && s.createdAt < session.createdAt);
    });
    return ss.length ? ss[ss.length - 1] : null;
  };

  S.upsertAthlete = function (a) {
    var i = (S.db.athletes || []).findIndex(function (x) { return x.id === a.id; });
    if (i === -1) S.db.athletes.push(a); else S.db.athletes[i] = a;
    S.autosave(); return a;
  };
  S.upsertSession = function (s) {
    Model.deriveSession(s);
    Model.touchSession(s);
    var i = (S.db.sessions || []).findIndex(function (x) { return x.id === s.id; });
    if (i === -1) S.db.sessions.push(s); else S.db.sessions[i] = s;
    S.autosave(); return s;
  };
  S.upsertGym = function (g) {
    var i = (S.db.gyms || []).findIndex(function (x) { return x.id === g.id; });
    if (i === -1) S.db.gyms.push(g); else S.db.gyms[i] = g;
    S.autosave(); return g;
  };
  S.upsertEvent = function (e) {
    var i = (S.db.events || []).findIndex(function (x) { return x.id === e.id; });
    if (i === -1) S.db.events.push(e); else S.db.events[i] = e;
    S.autosave(); return e;
  };
  S.deleteSession = function (id) {
    S.db.sessions = (S.db.sessions || []).filter(function (s) { return s.id !== id; });
    delete (S.db.retestTargets || {})[id];
    S.saveNow();
  };
  S.deleteAthlete = function (id) {
    S.db.athletes = (S.db.athletes || []).filter(function (a) { return a.id !== id; });
    S.db.sessions = (S.db.sessions || []).filter(function (s) { return s.athleteId !== id; });
    S.saveNow();
  };

  /* Called after a successful export, so the unsaved-work nag clears. */
  S.markExported = function () {
    S.unsaved = 0;
    S.lastExportAt = new Date();
    if (S.onChange) S.onChange();
  };

  /* Where is this database actually being kept? */
  S.destination = function () {
    if (FileStore && FileStore.state === 'connected') {
      return { kind: 'file', safe: true, name: FileStore.name,
               detail: FileStore.describe().detail };
    }
    return { kind: 'browser', safe: false, name: null,
             detail: (FileStore ? FileStore.describe().detail
                                : 'Data is held in this browser only.') };
  };

  S.stats = function () {
    return {
      athletes: (S.db.athletes || []).filter(function (a) { return !a.archived; }).length,
      sessions: (S.db.sessions || []).length,
      gyms: (S.db.gyms || []).length,
      retested: (S.db.athletes || []).filter(function (a) {
        return S.sessionsFor(a.id).length > 1;
      }).length,
      bytes: (function () {
        try { return JSON.stringify(S.db).length; } catch (e) { return 0; }
      })()
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = S;
  root.PGP = root.PGP || {};
  root.PGP.Store = S;
})(typeof globalThis !== 'undefined' ? globalThis : this);
