/* ==========================================================================
   PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT
   js/ui/charts.js — INLINE SVG CHARTS
   --------------------------------------------------------------------------
   No chart library: the app must work from a local file with no network.

   Design rules applied throughout:
     * thin marks, 2px lines, >=8px markers, recessive grid and axes
     * a legend whenever there are two or more series; a single series is
       named by the chart title instead
     * every mark carries a hover/focus tooltip
     * values are directly labelled selectively, never on every point
     * a table view of the same numbers always exists elsewhere on the page,
       so nothing depends on reading a colour
     * the performance-level scale is a single-hue sequential ramp and every
       mark that uses it is also labelled with the level name
   ========================================================================== */
(function (root) {
  'use strict';
  var P = root.PGP, U = P.UI;
  var Ch = {};

  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      e.setAttribute(k, attrs[k]);
    });
    return e;
  }
  function txt(x, y, s, cls, anchor, baseline) {
    var t = svg('text', { x: x, y: y, class: cls || 'tick-lbl',
      'text-anchor': anchor || 'middle', 'dominant-baseline': baseline || 'middle' });
    t.textContent = s;
    return t;
  }
  function lvVar(levelName) {
    var i = U.levelIndex(levelName);
    return 'var(--lv-' + (i || 2) + ')';
  }
  Ch.levelColor = lvVar;

  /* Attach a tooltip to an SVG node, with a generous invisible hit target. */
  function hover(node, html) {
    node.addEventListener('mouseenter', function (e) { U.tipShow(e, html); });
    node.addEventListener('mousemove', U.tipMove);
    node.addEventListener('mouseleave', U.tipHide);
    node.setAttribute('tabindex', '0');
    node.addEventListener('focus', function () {
      var r = node.getBoundingClientRect();
      U.tipShow({ clientX: r.left + r.width / 2, clientY: r.top }, html);
    });
    node.addEventListener('blur', U.tipHide);
  }

  /* ======================================================================
     RADAR — the performance profile across categories.
     Percentile-based. One series by default; two when comparing a retest,
     in which case a legend is drawn.
     Axis labels always show the level name, so the shape is never the only
     information.
     ====================================================================== */
  Ch.radar = function (mount, o) {
    U.clear(mount);
    var data = o.series[0].points;            /* [{label, value|null, level, sub}] */
    var n = data.length;
    if (!n) { mount.innerHTML = U.empty('No profile to plot', 'No category produced a score.'); return; }

    var W = 560, H = 440, cx = W / 2, cy = H / 2 + 6, R = 138;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart',
      role: 'img', 'aria-label': o.ariaLabel || 'Performance profile radar chart' });

    function pt(i, v) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      var r = R * Math.max(0, Math.min(100, v)) / 100;
      return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    }

    /* recessive rings at the level boundaries, so the reader can see where
       the bands sit without a numeric axis */
    [25, 50, 65, 90, 100].forEach(function (ring) {
      var d = '';
      for (var i = 0; i <= n; i++) {
        var p = pt(i % n, ring);
        d += (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }
      s.appendChild(svg('path', { d: d + 'Z', class: 'grid-line',
        'stroke-dasharray': (ring === 100 || ring === 50) ? null : '2 4',
        'stroke-opacity': ring === 100 ? .5 : .32 }));
    });
    for (var i = 0; i < n; i++) {
      var p = pt(i, 100);
      s.appendChild(svg('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], class: 'grid-line', 'stroke-opacity': .22 }));
    }
    s.appendChild(txt(cx + 3, cy - R * 0.5 + 1, '50', 'tick-lbl', 'start'));
    s.appendChild(txt(cx + 3, cy - R + 1, '100', 'tick-lbl', 'start'));

    /* series */
    o.series.forEach(function (ser, si) {
      var colour = ser.color || 'var(--gold)';
      var pts = data.map(function (_, i) {
        var v = ser.points[i] ? ser.points[i].value : null;
        return v === null || v === undefined ? null : pt(i, v);
      });
      /* a missing category breaks the polygon rather than being drawn as 0 */
      var drawn = pts.filter(function (x) { return x; });
      if (drawn.length >= 3) {
        var d = '';
        pts.forEach(function (p) { if (p) d += (d ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); });
        s.appendChild(svg('path', { d: d + 'Z', fill: colour, 'fill-opacity': si === 0 ? .14 : .07,
          stroke: colour, 'stroke-width': 2, 'stroke-dasharray': ser.dashed ? '5 4' : null,
          'stroke-linejoin': 'round' }));
      }
      pts.forEach(function (p, i) {
        if (!p) return;
        var dp = ser.points[i];
        /* 2px surface ring keeps overlapping markers legible */
        s.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 4.6, fill: colour,
          stroke: 'var(--surface-1)', 'stroke-width': 2 }));
        var hit = svg('circle', { cx: p[0], cy: p[1], r: 14, class: 'hit' });
        hover(hit, '<b>' + U.esc(dp.label) + '</b><br>' + U.esc(ser.name) + ': ' +
          (dp.scoreType === 'criterion' ? Math.round(dp.value) + '% of achievable'
                                        : U.ord(dp.display === undefined ? dp.value : dp.display) + ' percentile') +
          (dp.level ? '<br><span class="tip-k">' + U.esc(dp.level.name) + '</span>' : '') +
          (dp.sub ? '<br><span class="tip-k">' + U.esc(dp.sub) + '</span>' : ''));
        s.appendChild(hit);
      });
    });

    /* axis labels: name, value and level */
    data.forEach(function (dp, i) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      var lr = R + 30;
      var x = cx + lr * Math.cos(ang), y = cy + lr * Math.sin(ang);
      var anchor = Math.abs(Math.cos(ang)) < 0.25 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end');
      s.appendChild(txt(x, y - 7, dp.label.toUpperCase(), 'axis-lbl', anchor));
      var val = dp.value === null || dp.value === undefined ? 'no data'
        : (dp.scoreType === 'criterion' ? Math.round(dp.value) + '%'
                                        : U.ord(dp.display === undefined ? dp.value : dp.display));
      var vt = txt(x, y + 7, val, 'val-lbl', anchor);
      if (dp.value === null || dp.value === undefined) vt.setAttribute('class', 'tick-lbl');
      s.appendChild(vt);
    });

    mount.appendChild(s);

    if (o.series.length > 1) {
      mount.appendChild(Ch.legend(o.series.map(function (ser) {
        return { label: ser.name, color: ser.color || 'var(--gold)', dashed: ser.dashed };
      })));
    }
  };

  Ch.legend = function (items) {
    var wrap = U.el('div', { class: 'lv-legend', style: 'border-top:0;padding-top:4px;margin-top:2px' });
    items.forEach(function (it) {
      wrap.appendChild(U.el('span', { class: 'lv-legend-item' }, [
        U.el('span', { class: 'lv-swatch',
          style: 'background:' + (it.dashed ? 'transparent' : it.color) +
                 ';border:2px solid ' + it.color + (it.dashed ? ';border-style:dashed' : '') }),
        it.label
      ]));
    });
    return wrap;
  };

  /* ======================================================================
     CATEGORY BAR CHART — an alternative to the radar, and the form used in
     the printed report because bars survive greyscale better than a polygon.
     ====================================================================== */
  Ch.categoryBars = function (mount, cats) {
    U.clear(mount);
    var rows = cats.filter(function (c) { return true; });
    var W = 620, rowH = 34, padL = 118, padR = 118, padT = 26, padB = 22;
    var H = padT + rows.length * rowH + padB;
    var plotW = W - padL - padR;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart',
      role: 'img', 'aria-label': 'Category percentiles' });

    /* level-boundary guides */
    [25, 65, 90].forEach(function (t) {
      var x = padL + plotW * t / 100;
      s.appendChild(svg('line', { x1: x, y1: padT - 8, x2: x, y2: H - padB, class: 'grid-line',
        'stroke-dasharray': '2 4' }));
      s.appendChild(txt(x, padT - 15, t, 'tick-lbl'));
    });
    s.appendChild(svg('line', { x1: padL, y1: H - padB, x2: padL + plotW, y2: H - padB, class: 'grid-line' }));
    s.appendChild(svg('line', { x1: padL, y1: padT - 8, x2: padL, y2: H - padB, class: 'grid-line' }));

    rows.forEach(function (c, i) {
      var y = padT + i * rowH;
      s.appendChild(txt(padL - 10, y + 11, c.categoryName.toUpperCase(), 'axis-lbl', 'end'));
      if (c.status !== 'scored') {
        s.appendChild(txt(padL + 6, y + 11, 'insufficient data', 'tick-lbl', 'start'));
        return;
      }
      var v = Math.max(1, Math.min(100, c.percentile));
      var w = Math.max(3, plotW * v / 100);
      /* 4px rounded data-end, anchored to the baseline at x = padL */
      s.appendChild(svg('rect', { x: padL, y: y + 4, width: w, height: 14, rx: 4,
        fill: lvVar(c.level ? c.level.name : '') }));
      var lbl = (c.scoreType === 'criterion' ? Math.round(c.percentile) + '%' : U.ord(c.displayPercentile));
      /* Place the value outside the bar, unless the bar is long enough that
         the label would collide with the level name in the right-hand
         column — then sit it inside the bar's end. */
      var inside = (w > plotW - 46);
      var vt = txt(inside ? padL + w - 7 : padL + w + 8, y + 11, lbl, 'val-lbl',
        inside ? 'end' : 'start');
      if (inside) vt.setAttribute('fill', 'var(--surface-1)');
      s.appendChild(vt);
      s.appendChild(txt(padL + plotW + 8, y + 11, (c.level ? c.level.name : ''), 'tick-lbl', 'start'));
      var hit = svg('rect', { x: padL, y: y, width: plotW, height: rowH - 4, class: 'hit' });
      hover(hit, '<b>' + U.esc(c.categoryName) + '</b><br>' + lbl +
        (c.scoreType === 'criterion' ? ' of the achievable score' : ' percentile') +
        '<br><span class="tip-k">' + U.esc(c.level ? c.level.name : '') + ' · from ' + c.n +
        ' test' + (c.n === 1 ? '' : 's') + '</span>');
      s.appendChild(hit);
    });
    mount.appendChild(s);
  };

  /* ======================================================================
     TREND — one metric across testing dates, with a crosshair tooltip.
     ====================================================================== */
  Ch.trend = function (mount, o) {
    U.clear(mount);
    var pts = (o.points || []).filter(function (p) { return p.value !== null && p.value !== undefined; });
    if (pts.length < 2) {
      mount.innerHTML = '<div class="fineprint" style="padding:14px 0">' +
        'A trend needs at least two testing dates with a result for this metric.</div>';
      return;
    }
    var W = 620, H = 220, padL = 52, padR = 18, padT = 18, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var vals = pts.map(function (p) { return p.value; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var span = (hi - lo) || Math.abs(hi) * 0.1 || 1;
    lo -= span * 0.25; hi += span * 0.25;
    var x = function (i) { return padL + (pts.length === 1 ? plotW / 2 : plotW * i / (pts.length - 1)); };
    var y = function (v) { return padT + plotH - plotH * (v - lo) / (hi - lo); };

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart',
      role: 'img', 'aria-label': (o.title || 'Trend') + ' over time' });

    /* y grid: 3 recessive lines */
    [0, .5, 1].forEach(function (f) {
      var v = lo + (hi - lo) * f, yy = y(v);
      s.appendChild(svg('line', { x1: padL, y1: yy, x2: padL + plotW, y2: yy, class: 'grid-line',
        'stroke-dasharray': f === 0 ? null : '2 4' }));
      s.appendChild(txt(padL - 8, yy, v.toFixed(o.dp === undefined ? 1 : o.dp), 'tick-lbl', 'end'));
    });

    /* the improving direction, stated rather than implied */
    s.appendChild(txt(padL - 8, padT - 6,
      (o.direction === 'low' ? 'lower is better' : 'higher is better'), 'tick-lbl', 'start'));

    var d = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1);
    }).join('');
    s.appendChild(svg('path', { d: d, fill: 'none', stroke: 'var(--gold)', 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    pts.forEach(function (p, i) {
      s.appendChild(svg('circle', { cx: x(i), cy: y(p.value), r: 4.5, fill: 'var(--gold)',
        stroke: 'var(--surface-1)', 'stroke-width': 2 }));
      s.appendChild(txt(x(i), H - padB + 14, U.date(p.date).slice(0, 5), 'tick-lbl'));
      /* label only the first and last point — never every point */
      if (i === 0 || i === pts.length - 1) {
        s.appendChild(txt(x(i), y(p.value) - 13, p.value.toFixed(o.dp === undefined ? 1 : o.dp), 'val-lbl'));
      }
      var hit = svg('circle', { cx: x(i), cy: y(p.value), r: 16, class: 'hit' });
      hover(hit, '<b>' + U.date(p.date) + '</b><br>' + (o.title || '') + ': ' +
        p.value.toFixed(o.dp === undefined ? 1 : o.dp) + ' ' + (o.unit || '') +
        (p.level ? '<br><span class="tip-k">' + U.esc(p.level) + '</span>' : '') +
        (p.note ? '<br><span class="tip-k">' + U.esc(p.note) + '</span>' : ''));
      s.appendChild(hit);
    });
    mount.appendChild(s);
  };

  /* ======================================================================
     REPEATED-SPRINT PROFILE — power for each sprint in the set.
     Single series, so no legend; the title names it.
     ====================================================================== */
  Ch.sprintProfile = function (mount, sprints, cfg) {
    U.clear(mount);
    var vals = (sprints || []).map(function (s) { return s ? s.mean_watts : null; });
    var real = vals.filter(function (v) { return v !== null && v !== undefined; });
    if (!real.length) {
      mount.innerHTML = '<div class="fineprint" style="padding:12px 0">No sprint data recorded.</div>';
      return;
    }
    var best = Math.max.apply(null, real);
    var W = 620, H = 210, padL = 48, padR = 16, padT = 22, padB = 36;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var bw = Math.min(46, plotW / vals.length - 8);
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart',
      role: 'img', 'aria-label': 'Mean power for each sprint in the set' });

    var yMax = best * 1.12;
    [0, .5, 1].forEach(function (f) {
      var v = yMax * f, yy = padT + plotH - plotH * f;
      s.appendChild(svg('line', { x1: padL, y1: yy, x2: padL + plotW, y2: yy, class: 'grid-line',
        'stroke-dasharray': f === 0 ? null : '2 4' }));
      s.appendChild(txt(padL - 8, yy, Math.round(v), 'tick-lbl', 'end'));
    });
    /* best-sprint reference line: the decrement score is measured against it */
    var yb = padT + plotH - plotH * best / yMax;
    s.appendChild(svg('line', { x1: padL, y1: yb, x2: padL + plotW, y2: yb,
      stroke: 'var(--gold)', 'stroke-width': 1, 'stroke-dasharray': '4 4', 'stroke-opacity': .6 }));
    s.appendChild(txt(padL + plotW, yb - 8, 'best sprint', 'tick-lbl', 'end'));

    vals.forEach(function (v, i) {
      var cxx = padL + plotW * (i + 0.5) / vals.length;
      if (v === null || v === undefined) {
        s.appendChild(txt(cxx, padT + plotH - 10, '—', 'tick-lbl'));
        s.appendChild(txt(cxx, H - padB + 14, 'S' + (i + 1), 'tick-lbl'));
        return;
      }
      var h = Math.max(2, plotH * v / yMax);
      /* 2px gap between adjacent bars comes from bw being < slot width */
      s.appendChild(svg('rect', { x: cxx - bw / 2, y: padT + plotH - h, width: bw, height: h,
        rx: 4, fill: 'var(--lv-3)' }));
      s.appendChild(txt(cxx, H - padB + 14, 'S' + (i + 1), 'tick-lbl'));
      var pctOfBest = v / best * 100;
      if (i === 0 || i === vals.length - 1) {
        s.appendChild(txt(cxx, padT + plotH - h - 11, Math.round(v), 'val-lbl'));
      }
      var hit = svg('rect', { x: cxx - plotW / vals.length / 2, y: padT,
        width: plotW / vals.length, height: plotH, class: 'hit' });
      hover(hit, '<b>Sprint ' + (i + 1) + '</b><br>Mean power: ' + Math.round(v) + ' W' +
        (sprints[i] && sprints[i].peak_watts ? '<br>Peak power: ' + Math.round(sprints[i].peak_watts) + ' W' : '') +
        '<br><span class="tip-k">' + pctOfBest.toFixed(1) + '% of the best sprint</span>' +
        (cfg ? '<br><span class="tip-k">' + cfg.workS + ' s work / ' + cfg.recoveryS + ' s recovery</span>' : ''));
      s.appendChild(hit);
    });
    mount.appendChild(s);
  };

  /* ======================================================================
     LEVEL DISTRIBUTION — stacked bar, one row per category, for the gym
     dashboard. 2px surface gaps between segments.
     ====================================================================== */
  Ch.levelDistribution = function (mount, catStats, settings) {
    U.clear(mount);
    var names = settings.levels.map(function (l) { return l.name; });
    var rows = Object.keys(catStats).map(function (k) { return catStats[k]; })
      .filter(function (c) { return c.n > 0; });
    if (!rows.length) {
      mount.innerHTML = '<div class="fineprint" style="padding:12px 0">No scored categories in this selection.</div>';
      return;
    }
    var W = 620, rowH = 30, padL = 118, padR = 40, padT = 8, padB = 8;
    var H = padT + rows.length * rowH + padB, plotW = W - padL - padR;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart',
      role: 'img', 'aria-label': 'Distribution of performance levels by category' });

    rows.forEach(function (c, i) {
      var y = padT + i * rowH;
      s.appendChild(txt(padL - 10, y + 12, c.categoryName.toUpperCase(), 'axis-lbl', 'end'));
      var x = padL;
      names.forEach(function (nm, li) {
        var count = c.levelCounts[nm] || 0;
        if (!count) return;
        var w = plotW * count / c.n;
        s.appendChild(svg('rect', { x: x, y: y + 4, width: Math.max(1, w - 2), height: 15, rx: 3,
          fill: 'var(--lv-' + (li + 1) + ')' }));
        var hit = svg('rect', { x: x, y: y, width: Math.max(1, w), height: rowH - 2, class: 'hit' });
        hover(hit, '<b>' + U.esc(c.categoryName) + '</b><br>' + U.esc(nm) + ': ' + count +
          ' of ' + c.n + ' athletes (' + Math.round(count / c.n * 100) + '%)');
        s.appendChild(hit);
        x += w;
      });
      s.appendChild(txt(padL + plotW + 8, y + 12, 'n=' + c.n, 'tick-lbl', 'start'));
    });
    mount.appendChild(s);
    mount.appendChild(Ch.legend(names.map(function (nm, i) {
      return { label: nm, color: 'var(--lv-' + (i + 1) + ')' };
    })));
  };

  /* ======================================================================
     CHANGE BARS — retest deltas. Uses the reserved status colours, each
     paired with a glyph and the verdict word, never colour alone.
     ====================================================================== */
  Ch.changeBars = function (mount, rows) {
    U.clear(mount);
    var use = rows.filter(function (r) { return r.changePct !== null && r.changePct !== undefined; });
    if (!use.length) {
      mount.innerHTML = '<div class="fineprint" style="padding:12px 0">No metric has results at both testing dates.</div>';
      return;
    }
    var maxAbs = Math.max.apply(null, use.map(function (r) {
      return Math.abs(r.direction === 'low' ? -r.changePct : r.changePct);
    }));
    maxAbs = Math.max(maxAbs, 5) * 1.15;
    /* Where a test contributes more than one metric, the rows need the
       metric name too or the chart shows "30-s Bike" twice. */
    var perTest = {};
    use.forEach(function (r) { perTest[r.testId] = (perTest[r.testId] || 0) + 1; });
    var twoLine = use.some(function (r) { return perTest[r.testId] > 1; });
    var W = 620, rowH = twoLine ? 32 : 26, padL = 150, padR = 92, padT = 22, padB = 10;
    var H = padT + use.length * rowH + padB, plotW = W - padL - padR, mid = padL + plotW / 2;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart',
      role: 'img', 'aria-label': 'Change at retest for each metric' });

    s.appendChild(svg('line', { x1: mid, y1: padT - 10, x2: mid, y2: H - padB, class: 'grid-line' }));
    s.appendChild(txt(mid, padT - 16, 'no change', 'tick-lbl'));
    s.appendChild(txt(padL, padT - 16, 'decline', 'tick-lbl', 'start'));
    s.appendChild(txt(padL + plotW, padT - 16, 'improvement', 'tick-lbl', 'end'));

    use.forEach(function (r, i) {
      var y = padT + i * rowH;
      /* signed so that "better" always points right, whichever direction the
         metric improves in */
      var signed = r.direction === 'low' ? -r.changePct : r.changePct;
      var w = (plotW / 2) * Math.min(1, Math.abs(signed) / maxAbs);
      var colour = r.verdict === 'improved' ? 'var(--good)'
                 : r.verdict === 'declined' ? 'var(--critical)' : 'var(--text-muted)';
      var glyph = r.verdict === 'improved' ? '▲' : r.verdict === 'declined' ? '▼' : '=';
      if (perTest[r.testId] > 1) {
        s.appendChild(txt(padL - 10, y + 7, r.shortName, 'axis-lbl', 'end'));
        s.appendChild(txt(padL - 10, y + 19, r.metricLabel, 'tick-lbl', 'end'));
      } else {
        s.appendChild(txt(padL - 10, y + rowH / 2 - 1, r.shortName, 'axis-lbl', 'end'));
      }
      s.appendChild(svg('rect', {
        x: signed >= 0 ? mid : mid - w, y: y + rowH / 2 - 7, width: Math.max(2, w), height: 13, rx: 4,
        fill: colour, 'fill-opacity': r.verdict === 'within-noise' ? .45 : .9 }));
      s.appendChild(txt(padL + plotW + 8, y + rowH / 2 - 1,
        glyph + ' ' + U.fmtSigned(r.changePct, 1) + '%', 'val-lbl', 'start'));
      var hit = svg('rect', { x: padL, y: y, width: plotW, height: rowH - 2, class: 'hit' });
      hover(hit, '<b>' + U.esc(r.testName) + '</b><br>' + U.esc(r.metricLabel) + '<br>' +
        U.fmt(r.previous, r.dp) + ' → ' + U.fmt(r.current, r.dp) + ' ' + (r.unit || '') +
        '<br>' + U.fmtSigned(r.change, r.dp) + ' (' + U.fmtSigned(r.changePct, 1) + '%)' +
        '<br><span class="tip-k">' + glyph + ' ' +
        (r.verdict === 'within-noise' ? 'within measurement variation' : U.esc(r.verdict)) +
        (r.meaningful && r.meaningful.mdc95
          ? ' · detectable change threshold ' + U.fmt(r.meaningful.mdc95, r.dp + 1) + ' ' + (r.unit || '')
          : '') + '</span>');
      s.appendChild(hit);
    });
    mount.appendChild(s);
    mount.appendChild(Ch.legend([
      { label: '▲ Improved beyond measurement error', color: 'var(--good)' },
      { label: '= Within measurement variation', color: 'var(--text-muted)' },
      { label: '▼ Declined beyond measurement error', color: 'var(--critical)' }
    ]));
  };

  /* Small inline sparkline for an athlete list row. */
  Ch.spark = function (values, dir) {
    var v = (values || []).filter(function (x) { return x !== null && x !== undefined && isFinite(x); });
    if (v.length < 2) return '<span class="fineprint">—</span>';
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), span = (hi - lo) || 1;
    var W = 62, H = 18;
    var d = v.map(function (x, i) {
      return (i ? 'L' : 'M') + (i * W / (v.length - 1)).toFixed(1) + ' ' +
        (H - 2 - (H - 4) * (x - lo) / span).toFixed(1);
    }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
      '" aria-hidden="true" style="overflow:visible"><path d="' + d +
      '" fill="none" stroke="var(--gold)" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  };

  P.Charts = Ch;
})(typeof globalThis !== 'undefined' ? globalThis : this);
