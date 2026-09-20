/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/core/filestore.js — WORKBOOK FILE STORAGE
   --------------------------------------------------------------------------
   Makes a real file on disk the source of truth instead of browser storage.

   WHY THIS EXISTS
   Browser storage is not a filing cabinet. Clearing site data wipes it,
   losing the device loses it, and iOS Safari evicts script-writable storage
   for sites that have not been opened in about a week — which is exactly
   what a gym you visit quarterly looks like. A coach travelling between
   gyms needs their database to survive all of that.

   HOW IT WORKS
   Where the browser supports the File System Access API (Chrome, Edge and
   other Chromium desktop browsers), the coach picks a .json workbook file
   once — ideally inside iCloud Drive, Dropbox or OneDrive. From then on
   every change is written straight into that file, and the sync service
   they already use carries it to every other device. No server, no account,
   no database service.

   The file handle is remembered in IndexedDB so the workbook reconnects on
   the next visit. Browsers cannot silently re-grant file permission, so if
   the browser asks again, the app shows a Reconnect button rather than
   pretending to be saving.

   WHERE IT IS NOT SUPPORTED (iPad and iPhone Safari, Firefox)
   The app falls back to browser storage exactly as before, and store.js
   counts unsaved changes so the UI can insist on a manual export. Nothing
   about this file changes the calculation engine or the data model.
   ========================================================================== */
(function (root) {
  'use strict';

  var F = {
    handle: null,
    name: null,
    state: 'unsupported',  /* unsupported | none | connected | needs_permission | error */
    lastWriteAt: null,
    lastError: null,
    pendingWrite: false
  };

  /* ---- capability ------------------------------------------------------ */
  F.supported = function () {
    return typeof window !== 'undefined' &&
           typeof window.showSaveFilePicker === 'function' &&
           typeof window.showOpenFilePicker === 'function';
  };

  /* ---- tiny IndexedDB store, only ever holds the file handle ----------- */
  var DB_NAME = 'pgp_workbook', STORE = 'handles', KEY = 'current';

  function idb() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbPut(value) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbGet() {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbClear() {
    return idb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      });
    });
  }

  /* ---- permissions ----------------------------------------------------- */
  F.queryPermission = function (handle) {
    if (!handle || !handle.queryPermission) return Promise.resolve('granted');
    return handle.queryPermission({ mode: 'readwrite' });
  };

  F.requestPermission = function (handle) {
    if (!handle || !handle.requestPermission) return Promise.resolve('granted');
    return handle.requestPermission({ mode: 'readwrite' });
  };

  /* ---- connect --------------------------------------------------------- */

  /* Create a new workbook file. Must be called from a user gesture. */
  F.createWorkbook = function (suggestedName) {
    if (!F.supported()) return Promise.reject(new Error('This browser cannot write files directly.'));
    return window.showSaveFilePicker({
      suggestedName: suggestedName || ('pgp-assessment-' + new Date().toISOString().slice(0, 10) + '.json'),
      types: [{ description: 'PGP assessment workbook', accept: { 'application/json': ['.json'] } }]
    }).then(function (handle) {
      F.handle = handle; F.name = handle.name; F.state = 'connected'; F.lastError = null;
      return idbPut(handle).catch(function () { return false; }).then(function () { return handle; });
    });
  };

  /* Open an existing workbook. Must be called from a user gesture. */
  F.openWorkbook = function () {
    if (!F.supported()) return Promise.reject(new Error('This browser cannot open files directly.'));
    return window.showOpenFilePicker({
      multiple: false,
      types: [{ description: 'PGP assessment workbook', accept: { 'application/json': ['.json'] } }]
    }).then(function (handles) {
      var handle = handles[0];
      return F.requestPermission(handle).then(function (p) {
        if (p !== 'granted') throw new Error('Permission to edit that file was not granted.');
        F.handle = handle; F.name = handle.name; F.state = 'connected'; F.lastError = null;
        return idbPut(handle).catch(function () { return false; }).then(function () { return handle; });
      });
    });
  };

  /* Reconnect the remembered workbook on load. Never prompts: a browser
     cannot silently re-grant file permission, so when it needs asking the
     state becomes needs_permission and the UI offers a Reconnect button. */
  F.restore = function () {
    if (!F.supported()) { F.state = 'unsupported'; return Promise.resolve(null); }
    return idbGet().then(function (handle) {
      if (!handle) { F.state = 'none'; return null; }
      F.handle = handle; F.name = handle.name;
      return F.queryPermission(handle).then(function (p) {
        F.state = (p === 'granted') ? 'connected' : 'needs_permission';
        return (p === 'granted') ? handle : null;
      });
    }).catch(function (e) {
      F.state = 'none'; F.lastError = e.message; return null;
    });
  };

  /* Called from a user gesture after restore() reported needs_permission. */
  F.reconnect = function () {
    if (!F.handle) return Promise.resolve(false);
    return F.requestPermission(F.handle).then(function (p) {
      F.state = (p === 'granted') ? 'connected' : 'needs_permission';
      return p === 'granted';
    });
  };

  F.disconnect = function () {
    F.handle = null; F.name = null; F.state = F.supported() ? 'none' : 'unsupported';
    return idbClear().catch(function () { return false; });
  };

  /* ---- read / write ---------------------------------------------------- */
  F.read = function () {
    if (!F.handle || F.state !== 'connected') return Promise.resolve(null);
    return F.handle.getFile()
      .then(function (file) { return file.text(); })
      .then(function (text) {
        if (!text || !text.trim()) return null;   /* a newly created file is empty */
        return text;
      })
      .catch(function (e) { F.lastError = e.message; F.state = 'error'; return null; });
  };

  /* Writes are serialised: a write in flight defers the next one rather
     than interleaving, so the file is never left half-written. */
  var writing = false, queued = null;

  F.write = function (text) {
    if (!F.handle || F.state !== 'connected') return Promise.resolve(false);
    if (writing) { queued = text; F.pendingWrite = true; return Promise.resolve(false); }
    writing = true;
    return F.handle.createWritable()
      .then(function (w) { return w.write(text).then(function () { return w.close(); }); })
      .then(function () {
        F.lastWriteAt = new Date();
        F.lastError = null;
        writing = false;
        if (queued !== null) { var next = queued; queued = null; F.pendingWrite = false; return F.write(next); }
        F.pendingWrite = false;
        return true;
      })
      .catch(function (e) {
        writing = false; queued = null; F.pendingWrite = false;
        F.lastError = e.message;
        /* A revoked or moved file reports as needing permission again rather
           than silently failing, so the coach is told before they walk away. */
        F.state = (e && e.name === 'NotAllowedError') ? 'needs_permission' : 'error';
        return false;
      });
  };

  F.describe = function () {
    switch (F.state) {
      case 'connected':
        return { ok: true, label: F.name,
                 detail: F.lastWriteAt
                   ? 'Saved to the file at ' + F.lastWriteAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                   : 'Connected. Changes are written straight into this file.' };
      case 'needs_permission':
        return { ok: false, label: F.name || 'Workbook file',
                 detail: 'This browser needs permission again before it can write to the file. Nothing is being saved to it until you reconnect.' };
      case 'error':
        return { ok: false, label: F.name || 'Workbook file',
                 detail: 'Could not write to the file: ' + (F.lastError || 'unknown error') +
                         '. Your data is still in this browser — export it now.' };
      case 'unsupported':
        return { ok: false, label: null,
                 detail: 'This browser cannot write directly to a file. Data is held in this browser only, so export after every testing day.' };
      default:
        return { ok: false, label: null,
                 detail: 'No workbook file connected. Data is held in this browser only.' };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = F;
  root.PGP = root.PGP || {};
  root.PGP.FileStore = F;
})(typeof globalThis !== 'undefined' ? globalThis : this);
