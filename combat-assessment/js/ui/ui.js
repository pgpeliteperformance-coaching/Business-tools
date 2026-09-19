/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/ui/ui.js — UI HELPERS
   Small DOM/format utilities shared by every view. No business logic here:
   all of that lives in js/core.
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP;
  var U = {};

  /* ---- DOM ------------------------------------------------------------- */
  U.$  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  U.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  U.el = function (tag, attrs, children) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { e.dataset[d] = v[d]; });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (Array.isArray(children) ? children : (children ? [children] : [])).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  };

  /* Escape untrusted text before it goes into innerHTML. Coach-entered notes
     and athlete names go through here. */
  U.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };

  U.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; };
  U.set = function (node, html) { if (node) node.innerHTML = html; return node; };

  /* ---- number / text formatting --------------------------------------- */
  U.fmt = function (v, dp, unit) {
    if (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
    var n = typeof v === 'number' ? v : parseFloat(v);
    if (!isFinite(n)) return '—';
    var s = n.toFixed(dp === undefined ? 1 : dp);
    return unit ? s + ' ' + unit : s;
  };
  U.fmtSigned = function (v, dp, unit) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    var s = (v > 0 ? '+' : '') + v.toFixed(dp === undefined ? 1 : dp);
    return unit ? s + ' ' + unit : s;
  };
  U.ord = function (n) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    n = Math.round(n);
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  U.ordSup = function (n) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    n = Math.round(n);
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + '<sup>' + (s[(v - 20) % 10] || s[v] || s[0]) + '</sup>';
  };
  U.date = function (iso) { return P.Model.formatDate(iso); };
  U.titleCase = function (s) {
    if (!s) return '';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  };
  U.label = function (list, id, fallback) {
    for (var i = 0; i < (list || []).length; i++) {
      if (list[i].id === id) return list[i].label || list[i].name;
    }
    return fallback === undefined ? U.titleCase(id) : fallback;
  };
  U.sportLabel = function (id) { return U.label(P.Model.SPORTS, id); };
  U.levelLabel = function (id) { return U.label(P.Model.LEVELS, id); };
  U.sexLabel = function (id) { return U.label(P.Model.SEXES, id, 'Not recorded'); };

  /* ---- level badge ----------------------------------------------------- */
  U.levelIndex = function (levelName) {
    var i = ['DEVELOPING', 'TRAINED', 'ADVANCED', 'HIGH PERFORMANCE'].indexOf(levelName);
    if (i > -1) return i + 1;
    var j = ['LIMITATIONS NOTED', 'MONITOR', 'ACCEPTABLE', 'FULL RANGE OBSERVED'].indexOf(levelName);
    return j > -1 ? j + 1 : 0;
  };
  U.levelBadge = function (level) {
    if (!level) return '<span class="badge badge-none">Not scored</span>';
    var i = U.levelIndex(level.name);
    return '<span class="badge badge-lv' + (i || 1) + '" title="' + U.esc(level.desc || '') + '">' +
      U.esc(level.name) + '</span>';
  };
  U.refTag = function (type) {
    if (!type) return '';
    var t = { PUBLISHED: 'Published', PGP_PROVISIONAL: 'PGP provisional', PGP_INTERNAL: 'PGP internal' }[type] || type;
    return '<span class="ref-tag ref-' + type + '">' + U.esc(t) + '</span>';
  };
  U.confBadge = function (c) {
    if (!c) return '';
    var cls = { high: 'badge-good', medium: 'badge-warning', low: 'badge-critical' }[c] || 'badge-none';
    var glyph = { high: '●●●', medium: '●●', low: '●' }[c] || '';
    return '<span class="badge ' + cls + '">' + glyph + ' ' + U.esc(c) + ' confidence</span>';
  };

  /* ---- percentile bar -------------------------------------------------- */
  /* One row: label, track with band ticks, value and level. The level name is
     always printed, so the colour never carries the meaning on its own. */
  U.percentileBar = function (o) {
    var lbl = '<div class="pbar-lbl">' + U.esc(o.label) +
      (o.sub ? '<small>' + U.esc(o.sub) + '</small>' : '') + '</div>';
    if (o.percentile === null || o.percentile === undefined) {
      return '<div class="pbar">' + lbl +
        '<div class="pbar-track"></div>' +
        '<div class="pbar-end"><span class="pbar-none">' + U.esc(o.emptyText || 'Not scored') +
        '</span></div></div>';
    }
    var lv = U.levelIndex(o.level ? o.level.name : '') || 1;
    var pct = Math.max(1, Math.min(99, o.percentile));
    var ticks = (o.ticks === false) ? '' :
      [25, 65, 90].map(function (t) {
        return '<span class="pbar-tick" style="left:' + t + '%" title="' + t +
          'th percentile — performance level boundary"></span>';
      }).join('');
    var unitTxt = o.scoreType === 'criterion'
      ? Math.round(o.percentile) + '<sup>%</sup>'
      : U.ordSup(o.displayPercentile === undefined ? o.percentile : o.displayPercentile);
    return '<div class="pbar">' + lbl +
      '<div class="pbar-track" title="' + U.esc(o.tip || '') + '">' + ticks +
      '<span class="pbar-fill lv' + lv + '" style="width:' + pct + '%"></span></div>' +
      '<div class="pbar-end"><span class="pbar-pct">' + unitTxt + '</span>' +
      U.levelBadge(o.level) + '</div></div>';
  };

  U.levelLegend = function (settings, criterion) {
    var levels = criterion
      ? ((settings.movement && settings.movement.criterionLevels) || settings.levels)
      : settings.levels;
    return '<div class="lv-legend">' + levels.map(function (l, i) {
      return '<span class="lv-legend-item"><span class="lv-swatch" style="background:var(--lv-' +
        (i + 1) + ')"></span>' + U.esc(l.name) + ' <span style="color:var(--text-muted)">(' +
        l.min + (criterion ? '–' + l.max + '%' : '–' + l.max) + ')</span></span>';
    }).join('') + '</div>';
  };

  /* ---- notices --------------------------------------------------------- */
  U.notice = function (kind, html, glyph) {
    var g = glyph || ({ critical: '!', warning: '!', info: 'i', gold: '★', plain: '·' })[kind] || 'i';
    return '<div class="notice notice-' + kind + '"><span class="notice-ico" aria-hidden="true">' +
      g + '</span><div>' + html + '</div></div>';
  };

  /* ---- toast ----------------------------------------------------------- */
  var toastEl = null, toastTimer = null;
  U.toast = function (msg) {
    if (!toastEl) {
      toastEl = U.el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  };

  /* ---- modal ----------------------------------------------------------- */
  U.modal = function (o) {
    var bg = U.$('#modalBg');
    U.$('#modalTitle').textContent = o.title || '';
    U.$('#modalBody').innerHTML = o.bodyHtml || '';
    var ft = U.$('#modalFoot');
    U.clear(ft);
    (o.buttons || [{ label: 'Close' }]).forEach(function (b) {
      ft.appendChild(U.el('button', {
        class: 'btn ' + (b.class || ''),
        onclick: function () {
          var keep = b.onClick ? b.onClick() : false;
          if (!keep) U.closeModal();
        }
      }, b.label));
    });
    bg.classList.add('on');
    if (o.onOpen) o.onOpen(U.$('#modalBody'));
  };
  U.closeModal = function () { U.$('#modalBg').classList.remove('on'); };

  U.confirm = function (title, msg, onYes, yesLabel) {
    U.modal({
      title: title,
      bodyHtml: '<p style="line-height:1.65">' + msg + '</p>',
      buttons: [
        { label: 'Cancel', class: 'btn-ghost' },
        { label: yesLabel || 'Confirm', class: 'btn-danger', onClick: onYes }
      ]
    });
  };

  /* ---- tooltip --------------------------------------------------------- */
  var tipEl = null;
  U.tipShow = function (evt, html) {
    if (!tipEl) { tipEl = U.el('div', { class: 'tip', role: 'tooltip' }); document.body.appendChild(tipEl); }
    tipEl.innerHTML = html;
    tipEl.classList.add('on');
    U.tipMove(evt);
  };
  U.tipMove = function (evt) {
    if (!tipEl) return;
    var pad = 14, r = tipEl.getBoundingClientRect();
    var x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - pad;
    tipEl.style.left = Math.max(8, x) + 'px';
    tipEl.style.top = Math.max(8, y) + 'px';
  };
  U.tipHide = function () { if (tipEl) tipEl.classList.remove('on'); };

  /* Attach hover + focus tooltips to every [data-tip] inside a container. */
  U.bindTips = function (ctx) {
    U.$$('[data-tip]', ctx || document).forEach(function (n) {
      if (n._tipBound) return;
      n._tipBound = true;
      n.setAttribute('tabindex', n.getAttribute('tabindex') || '0');
      n.addEventListener('mouseenter', function (e) { U.tipShow(e, n.dataset.tip); });
      n.addEventListener('mousemove', U.tipMove);
      n.addEventListener('mouseleave', U.tipHide);
      n.addEventListener('focus', function (e) {
        var r = n.getBoundingClientRect();
        U.tipShow({ clientX: r.left + r.width / 2, clientY: r.top }, n.dataset.tip);
      });
      n.addEventListener('blur', U.tipHide);
    });
  };

  /* ---- form helpers ---------------------------------------------------- */
  U.selectOpts = function (list, selected, placeholder) {
    var out = placeholder ? '<option value="">' + U.esc(placeholder) + '</option>' : '';
    (list || []).forEach(function (o) {
      var id = (typeof o === 'object') ? o.id : o;
      var lb = (typeof o === 'object') ? (o.label || o.name) : o;
      out += '<option value="' + U.esc(id) + '"' + (String(id) === String(selected) ? ' selected' : '') +
        '>' + U.esc(lb) + '</option>';
    });
    return out;
  };

  U.numVal = function (input) {
    if (!input) return null;
    var v = input.value;
    if (v === '' || v === null || v === undefined) return null;
    var n = parseFloat(v);
    return isFinite(n) ? n : null;
  };

  /* ---- csv/json download ---------------------------------------------- */
  U.exportFile = function (kind) {
    var db = P.Store.db, C = P.Csv, stamp = C.stamp();
    if (kind === 'json') {
      C.download('pgp-assessment-database-' + stamp + '.json', C.exportJSON(db), 'application/json');
    } else if (kind === 'sessions') {
      C.download('pgp-raw-results-' + stamp + '.csv', C.exportSessionsCSV(db), 'text/csv');
    } else if (kind === 'scores') {
      C.download('pgp-scores-and-percentiles-' + stamp + '.csv', C.exportScoresCSV(db), 'text/csv');
    } else if (kind === 'athletes') {
      C.download('pgp-athlete-roster-' + stamp + '.csv', C.exportAthletesCSV(db), 'text/csv');
    }
    U.toast('Export downloaded');
  };

  U.pickFile = function (accept, onText) {
    var inp = U.el('input', { type: 'file', accept: accept, style: 'display:none' });
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { onText(String(fr.result), f.name); };
      fr.onerror = function () { U.toast('Could not read that file'); };
      fr.readAsText(f);
    });
    document.body.appendChild(inp);
    inp.click();
    setTimeout(function () { document.body.removeChild(inp); }, 1000);
  };

  U.empty = function (title, msg, btnHtml) {
    return '<div class="empty"><div class="empty-t">' + U.esc(title) + '</div><div>' +
      U.esc(msg) + '</div>' + (btnHtml ? '<div style="margin-top:16px">' + btnHtml + '</div>' : '') + '</div>';
  };

  root.PGP.UI = U;
})(typeof globalThis !== 'undefined' ? globalThis : this);
