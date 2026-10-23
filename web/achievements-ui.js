// GitHub Achievements by niounze - interactive view (highlights / closest / all, expandable levels)
// Usage: AchUI.mount(element, data)   data = contents of achievements.json
(function () {
  var CSS = [
    '.ach-root{color:#e6e6e6;font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
    '.ach-head{display:flex;align-items:center;justify-content:space-between;gap:10px 14px;flex-wrap:wrap}',
    '.ach-title{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#9a9a9a}',
    '.ach-dot{width:22px;height:22px;border-radius:50%;border:1px solid #38bdf88c;background:#38bdf821;display:grid;place-items:center;flex:none}',
    '.ach-dot i{width:7px;height:7px;border-radius:50%;background:#38bdf8}',
    '.ach-by{font-size:11px;font-weight:400;letter-spacing:0;text-transform:none;color:#6a6a6a;margin-left:4px}',
    '.ach-by a{color:inherit;text-decoration:none}.ach-by a:hover{color:#9a9a9a}',
    '.ach-right{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
    '.ach-count{font-size:13px;color:#8b8b8b}.ach-count b{color:#fff}',
    '.ach-exp{all:unset;cursor:pointer;font-size:12px;color:#9a9a9a;padding:4px 10px;border:1px solid #2c2c2c;border-radius:999px;background:#151515}.ach-exp:hover{color:#fff}',
    '.ach-tabs{display:inline-flex;border:1px solid #2c2c2c;border-radius:999px;padding:2px;background:#151515}',
    '.ach-tabs button{all:unset;cursor:pointer;font-size:12px;padding:4px 12px;border-radius:999px;color:#9a9a9a}',
    '.ach-tabs button.on{background:#262626;color:#fff}',
    '.ach-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px;margin-top:12px;align-items:start}',
    '.ach-group{margin:16px 0 0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#777;font-weight:700}',
    '.ach-card{border:1px solid #262626;border-radius:14px;background:#141414;overflow:hidden}',
    '.ach-card.leg{border-color:#ffd34e55}',
    '.ach-row{all:unset;box-sizing:border-box;width:100%;display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:pointer}',
    '.ach-row:focus-visible{outline:2px solid #38bdf8;outline-offset:-2px}',
    '.ach-body{flex:1;min-width:0}',
    '.ach-name{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:700;font-size:15px;color:#fff}',
    '.ach-card.lock .ach-name span{color:#9a9a9a}',
    '.ach-badge{font-style:normal;font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;border:1px solid;white-space:nowrap}',
    '.ach-bar{height:6px;border-radius:3px;background:#242424;margin:7px 0 5px;overflow:hidden}.ach-bar div{height:100%;border-radius:3px}',
    '.ach-sub{display:flex;justify-content:space-between;font-size:12.5px;color:#8b8b8b}',
    '.ach-chev{flex:none;color:#666;transition:transform .2s;font-size:12px}',
    '.ach-card.open .ach-chev{transform:rotate(180deg)}',
    '.ach-more{display:none;padding:0 16px 14px 16px;border-top:1px solid #1f1f1f}',
    '.ach-card.open .ach-more{display:block}',
    '.ach-desc{font-size:12.5px;color:#9a9a9a;margin:10px 0 8px}',
    '.ach-tier{display:flex;align-items:center;gap:10px;font-size:13px;padding:4px 0;color:#8b8b8b}',
    '.ach-tier .m{box-sizing:border-box;width:18px;height:18px;border-radius:50%;border:1.5px solid #3a3a3a;display:grid;place-items:center;font-size:11px;flex:none;color:#000}',
    '.ach-tier.done{color:#e6e6e6}.ach-tier.done .m{border:0}',
    '.ach-tier.next{color:#fff}.ach-tier.next .m{border-style:dashed}',
    '.ach-tier .n{flex:1}.ach-tier .s{font-size:11.5px}'
  ].join('');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function short(n) { return n >= 1e6 ? +(n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? +(n / 1e3).toFixed(1) + 'k' : String(Math.round(n)); }
  function fv(a, v) { return a.format === 'hours' ? Math.round(v) + 'h' : short(v); }

  function icon(ic, size, opacity) {
    var x1 = 12, x2 = -1, y1 = 12, y2 = -1;
    ic.rows.forEach(function (row, y) { for (var x = 0; x < 12; x++) if (row.charAt(x) !== '.') { x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); } });
    var w = x2 - x1 + 1, h = y2 - y1 + 1, p = size / Math.max(w, h), ox = 23 - (w * p) / 2 - x1 * p, oy = 23 - (h * p) / 2 - y1 * p;
    var s = '<g shape-rendering="crispEdges"' + (opacity < 1 ? ' opacity="' + opacity + '"' : '') + '>';
    ic.rows.forEach(function (row, y) {
      for (var x = 0; x < 12;) {
        var ch = row.charAt(x);
        if (ch === '.') { x++; continue; }
        var e = x; while (e < 12 && row.charAt(e) === ch) e++;
        s += '<rect x="' + (ox + x * p).toFixed(2) + '" y="' + (oy + y * p).toFixed(2) + '" width="' + ((e - x) * p + 0.03).toFixed(2) + '" height="' + (p + 0.03).toFixed(2) + '" fill="' + ic.palette[ch] + '"/>';
        x = e;
      }
    });
    return s + '</g>';
  }

  function card(a) {
    var c = a.maxed ? '#ffd34e' : (a.color || '#38bdf8'), lock = a.level === 0 && !a.legendary, r = 18, circ = 2 * Math.PI * r;
    var sub = a.maxed ? fv(a, a.value) + ' ' + a.unit + ' · max level' : fv(a, a.value) + ' / ' + fv(a, a.next) + ' ' + a.unit;
    var badge = a.legendary ? (a.maxed ? 'UNLOCKED' : 'LEGENDARY') : a.level + ' / ' + a.tiers.length;
    var pctv = a.maxed ? 100 : Math.floor(a.progress * 100);
    var tiers = a.tiers.map(function (t, i) {
      var done = a.value >= t, next = !done && i === a.level;
      var st = done ? 'reached' : next ? Math.max(0, Math.round((a.value / t) * 100)) + '%' : 'locked';
      return '<div class="ach-tier' + (done ? ' done' : '') + (next ? ' next' : '') + '"><span class="m"' + (done ? ' style="background:' + c + '"' : next ? ' style="border-color:' + c + '"' : '') + '>' + (done ? '✓' : '') + '</span>' +
        '<span class="n">' + (a.legendary ? 'Legendary: ' : 'Level ' + (i + 1) + ': ') + fv(a, t) + ' ' + esc(a.unit) + '</span><span class="s">' + st + '</span></div>';
    }).join('');
    return '<div class="ach-card' + (a.legendary || a.maxed ? ' leg' : '') + (lock ? ' lock' : '') + '">' +
      '<button class="ach-row" aria-expanded="false"><svg width="58" height="58" viewBox="0 0 46 46" style="flex:none;overflow:visible"><circle cx="23" cy="23" r="' + r + '" fill="none" stroke="#242424" stroke-width="4.5"/>' +
      '<circle cx="23" cy="23" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="' + (circ * (a.maxed ? 1 : a.progress)).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 23 23)"/>' +
      (a.icon ? icon(a.icon, 18.9, lock ? 0.45 : 1) + '<circle cx="36" cy="36" r="8" fill="#0b0b0b" stroke="' + c + '" stroke-width="1.5"/><text x="36" y="40" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + (lock ? '#777' : '#fff') + '">' + (a.legendary ? (a.maxed ? '\u2605' : '\u2606') : a.level) + '</text>' : '<text x="23" y="28.5" text-anchor="middle" font-size="16" font-weight="700" fill="' + (lock ? '#555' : '#fff') + '">' + (a.legendary ? (a.maxed ? '\u2605' : '\u2606') : a.level) + '</text>') + '</svg>' +
      '<span class="ach-body"><span class="ach-name"><span>' + (a.legendary ? '★ ' : '') + esc(a.name) + '</span><i class="ach-badge" style="color:' + c + ';border-color:' + c + '88;background:' + c + '1c">' + badge + '</i></span>' +
      '<span class="ach-bar" style="display:block"><div style="width:' + Math.round((a.maxed ? 1 : a.progress) * 100) + '%;background:' + c + '"></div></span>' +
      '<span class="ach-sub"><span>' + esc(sub) + '</span><span>' + pctv + '%</span></span></span><span class="ach-chev">▼</span></button>' +
      '<div class="ach-more"><div class="ach-desc">' + esc(a.description || '') + '</div>' + tiers + '</div></div>';
  }

  function mount(root, j, opt) {
    opt = opt || {};
    if (!document.getElementById('ach-css')) { var st = document.createElement('style'); st.id = 'ach-css'; st.textContent = CSS; document.head.appendChild(st); }
    root.classList.add('ach-root');
    var list = j.achievements, byId = {};
    list.forEach(function (a) { byId[a.id] = a; });
    var highlights = (j.highlights || []).map(function (id) { return byId[id]; }).filter(Boolean);
    var closest = list.filter(function (a) { return !a.maxed; }).sort(function (a, b) { return b.progress - a.progress || b.level - a.level; }).slice(0, highlights.length || 6);
    var view = opt.view || 'highlights', expandAll = false;
    var names = { highlights: 'Highlights', closest: 'Closest to next level', all: 'All' };

    function draw() {
      var body;
      if (view === 'all') {
        body = Object.keys(j.groups || {}).map(function (g) {
          var items = list.filter(function (a) { return a.group === g; });
          return items.length ? '<div class="ach-group">' + esc(j.groups[g]) + '</div><div class="ach-grid">' + items.map(card).join('') + '</div>' : '';
        }).join('');
      } else body = '<div class="ach-grid">' + (view === 'closest' ? closest : highlights).map(card).join('') + '</div>';
      root.innerHTML = '<div class="ach-head"><div class="ach-title"><span class="ach-dot"><i></i></span>Achievements · ' + esc(names[view]) +
        '<span class="ach-by"><a href="https://github.com/nkunze2306/github-achievements-by-niounze">GitHub Achievements by niounze</a></span></div>' +
        '<div class="ach-right"><span class="ach-count"><b>' + j.unlocked + '</b> / ' + j.total + ' unlocked</span><span class="ach-tabs">' +
        ['highlights', 'closest', 'all'].map(function (v) { return '<button data-v="' + v + '" class="' + (v === view ? 'on' : '') + '">' + (v === 'closest' ? 'Next level' : names[v]) + '</button>'; }).join('') +
        '</span><button class="ach-exp">' + (expandAll ? 'Collapse all' : 'Expand all') + '</button></div></div>' + body;
      if (expandAll) root.querySelectorAll('.ach-card').forEach(function (c) { c.classList.add('open'); });
    }
    root.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.ach-tabs button');
      if (t) { view = t.getAttribute('data-v'); draw(); return; }
      var ex = e.target.closest && e.target.closest('.ach-exp');
      if (ex) { expandAll = !expandAll; root.querySelectorAll('.ach-card').forEach(function (c) { c.classList.toggle('open', expandAll); c.querySelector('.ach-row').setAttribute('aria-expanded', expandAll ? 'true' : 'false'); }); ex.textContent = expandAll ? 'Collapse all' : 'Expand all'; return; }
      var row = e.target.closest && e.target.closest('.ach-row');
      if (row) { var c = row.parentNode; var open = c.classList.toggle('open'); row.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    });
    draw();
  }
  window.AchUI = { mount: mount };
})();
