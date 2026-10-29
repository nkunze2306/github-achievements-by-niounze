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
    '.ach-tabs button[data-v="road"]{color:#ffd34e;font-weight:700;text-shadow:0 0 8px #ffd34e99;box-shadow:0 0 0 1px #ffd34e66,0 0 12px #ffb80066;animation:ach-gold 2.4s ease-in-out infinite}',
    '.ach-tabs button[data-v="road"].on{background:linear-gradient(135deg,#ffd34e,#ffb800);color:#2a1f00;text-shadow:none;box-shadow:0 0 0 1px #ffe27a,0 0 16px #ffb800aa}',
    '@keyframes ach-gold{0%,100%{box-shadow:0 0 0 1px #ffd34e55,0 0 8px #ffb80044}50%{box-shadow:0 0 0 1px #ffd34e,0 0 18px #ffb800aa}}',
    '@media (prefers-reduced-motion:reduce){.ach-tabs button[data-v="road"]{animation:none}}',
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
    // --- Stufen-Look der Kacheln (gleiche Regeln wie tierOf() in generate.mjs) ---
    ,'.ach-card{position:relative}',
    '.ach-card.t-locked{border:1px dashed #2f2f2f;background:#121212}',
    '.ach-card.t-common{border-color:#8b949e8c}',
    '.ach-card.t-uncommon{border-color:#3fb950}',
    '.ach-card.t-rare{border-color:#58a6ff;background:#141a22;box-shadow:0 0 0 2px #58a6ff38}',
    '.ach-card.t-epic{border-color:#a371f7;background:linear-gradient(135deg,#a371f733,#141414 62%);box-shadow:0 0 0 3px #a371f733}',
    '.ach-card.t-legendary{border-color:#ffb800;background:linear-gradient(135deg,#ffb80042,#141414 62%);box-shadow:0 0 0 3px #ffb80040}',
    '.ach-card.t-uncommon::before,.ach-card.t-epic::before,.ach-card.t-legendary::before{content:"";position:absolute;inset:6px;pointer-events:none;z-index:1;--n:10px;--t:2px;background:' +
      ['0 0/var(--n) var(--t)', '0 0/var(--t) var(--n)', '100% 0/var(--n) var(--t)', '100% 0/var(--t) var(--n)', '0 100%/var(--n) var(--t)', '0 100%/var(--t) var(--n)', '100% 100%/var(--n) var(--t)', '100% 100%/var(--t) var(--n)'].map(function (g) { return 'linear-gradient(var(--tc),var(--tc)) ' + g; }).join(',') + ';background-repeat:no-repeat}',
    '.ach-card.t-epic::before,.ach-card.t-legendary::before{--n:14px;--t:3px;inset:7px}',
    '.ach-card.t-rare::after,.ach-card.t-epic::after,.ach-card.t-legendary::after{content:"";position:absolute;inset:4px;border:1px solid var(--tc);opacity:.38;border-radius:10px;pointer-events:none}',
    '.ach-gem{position:absolute;left:50%;top:3px;width:7px;height:7px;margin-left:-3px;background:var(--tc);transform:rotate(45deg);z-index:2;pointer-events:none}',
    '.t-legendary .ach-gem{width:9px;height:9px;background:#ffd24d}',
    '.ach-shine{position:absolute;top:-4px;bottom:-4px;left:-30px;width:16px;background:#fff;opacity:.16;transform:skewX(-20deg);pointer-events:none;animation:ach-shine 5s ease-in-out infinite}',
    '@keyframes ach-shine{0%{left:-30px}55%,100%{left:calc(100% + 20px)}}',
    '@media (prefers-reduced-motion:reduce){.ach-shine{display:none}}',
    '.ach-card.t-legendary.inactive{opacity:.7}',
    // --- Baum ---
    '.ach-tree{position:relative;overflow:auto;margin-top:12px;border:1px solid #262626;border-radius:14px;background:#0f0f0f}',
    '.ach-tree svg{display:block;min-width:980px;width:100%;height:auto}',
    '.ach-node{cursor:pointer}.ach-node:hover .fr{stroke:#fff}',
    '.ach-tip{position:absolute;pointer-events:none;background:#0b0f14;border:2px solid #3a2d6b;border-radius:6px;padding:9px 12px;width:230px;box-shadow:0 8px 24px #000a;z-index:5;font-size:12px}',
    '.ach-tip b{display:block;font-size:14px;color:#fff}.ach-tip .d{color:#8b949e;font-size:11.5px;margin:2px 0 6px}',
    '.ach-tip .pb{height:5px;background:#222a33;border-radius:3px;margin:5px 0}.ach-tip .pb i{display:block;height:100%;border-radius:3px}',
    '.ach-tip .pips{display:flex;gap:3px;margin-top:6px}.ach-tip .pips s{width:16px;height:5px;background:#222a33;display:block}',
    '.ach-tip .r{font-size:10.5px;font-weight:700;letter-spacing:.5px;margin-top:6px}',
    '.ach-tree-hint{margin:8px 2px 0;font-size:11.5px;color:#6a6a6a}',
    // --- Master Road ---
    '.ach-road{position:relative;margin-top:12px;border:1px solid #262626;border-radius:16px;background:radial-gradient(120% 80% at 50% 0,#1a1630 0,#0b0d12 60%);min-height:520px}',
    '.ach-road svg{display:block;width:100%;height:auto}',
    '.ach-rnode{cursor:pointer}.ach-rnode .ring{transition:stroke .15s}.ach-rnode:hover .ring{stroke:#fff}',
    '.ach-rtip{position:absolute;pointer-events:none;background:#0b0f14f2;border:2px solid #6a4cc9;border-radius:10px;padding:14px 16px;width:min(360px,calc(100% - 16px));box-shadow:0 12px 40px #000c;z-index:5;font-size:12.5px}',
    '.ach-rtip .k{font-size:10.5px;letter-spacing:1px;font-weight:700;text-transform:uppercase}',
    '.ach-rtip h3{margin:2px 0 8px;font-size:17px;color:#fff}.ach-rtip .s{font-size:10.5px;font-weight:700;letter-spacing:.8px}',
    '.ach-rtip h4{margin:11px 0 3px;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:#9aa4b2}',
    '.ach-rtip p{margin:0;color:#c9d1d9}.ach-rtip ul,.ach-rtip ol{margin:2px 0 0;padding-left:18px;color:#c9d1d9}.ach-rtip li{margin:2px 0}',
    '.ach-rtip .f{margin-top:12px;padding-top:9px;border-top:1px dashed #3a3f55;color:#8b949e;font-size:11.5px}',
    '.ach-gate{padding:44px 24px;text-align:center}.ach-gate .lk{font-size:54px}.ach-gate h2{margin:6px 0;font-size:22px;color:#fff}',
    '.ach-gate p{color:#8b949e;max-width:520px;margin:6px auto}.ach-gate .bar{height:10px;border-radius:5px;background:#1d2230;max-width:420px;margin:16px auto 6px;overflow:hidden}',
    '.ach-gate .bar i{display:block;height:100%;background:linear-gradient(90deg,#6a4cc9,#ffd34e)}.ach-gate .n{font-size:13px;color:#e6edf3}'

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

  var TIER = {
    locked: { id: 'locked', name: 'Locked', c: '#555555' }, common: { id: 'common', name: 'Common', c: '#8b949e' }, uncommon: { id: 'uncommon', name: 'Uncommon', c: '#3fb950' },
    rare: { id: 'rare', name: 'Rare', c: '#58a6ff' }, epic: { id: 'epic', name: 'Epic', c: '#a371f7' }, legendary: { id: 'legendary', name: 'Legendary', c: '#ffb800' }
  };
  // Stufe = Anteil der erreichten Level; Höchststufe und Legendary sind golden (gleiche Regel wie in generate.mjs)
  function tierOf(a) {
    if (a.legendary || a.maxed) return TIER.legendary;
    if (a.level === 0) return TIER.locked;
    var f = a.level / a.tiers.length;
    return f < 0.25 ? TIER.common : f < 0.5 ? TIER.uncommon : f < 0.75 ? TIER.rare : TIER.epic;
  }

  function card(a) {
    var tr = tierOf(a), inactive = a.legendary && !a.maxed;
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
    return '<div class="ach-card t-' + tr.id + (inactive ? ' inactive' : '') + (a.legendary || a.maxed ? ' leg' : '') + (lock ? ' lock' : '') + '" style="--tc:' + (tr.id === 'legendary' ? '#ffe27a' : tr.c) + '">' +
      (tr.id === 'epic' || tr.id === 'legendary' ? '<i class="ach-gem"></i>' : '') + (tr.id === 'legendary' && !inactive ? '<i class="ach-shine"></i>' : '') +
      '<button class="ach-row" aria-expanded="false"><svg width="58" height="58" viewBox="0 0 46 46" style="flex:none;overflow:visible"><circle cx="23" cy="23" r="' + r + '" fill="none" stroke="#242424" stroke-width="4.5"/>' +
      '<circle cx="23" cy="23" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="' + (circ * (a.maxed ? 1 : a.progress)).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 23 23)"/>' +
      (a.icon ? icon(a.icon, 18.9, lock ? 0.45 : 1) + '<circle cx="36" cy="36" r="8" fill="#0b0b0b" stroke="' + c + '" stroke-width="1.5"/><text x="36" y="40" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + (lock ? '#777' : '#fff') + '">' + (a.legendary ? (a.maxed ? '\u2605' : '\u2606') : a.level) + '</text>' : '<text x="23" y="28.5" text-anchor="middle" font-size="16" font-weight="700" fill="' + (lock ? '#555' : '#fff') + '">' + (a.legendary ? (a.maxed ? '\u2605' : '\u2606') : a.level) + '</text>') + '</svg>' +
      '<span class="ach-body"><span class="ach-name"><span>' + (a.legendary ? '★ ' : '') + esc(a.name) + '</span><i class="ach-badge" style="color:' + c + ';border-color:' + c + '88;background:' + c + '1c">' + badge + '</i></span>' +
      '<span class="ach-bar" style="display:block"><div style="width:' + Math.round((a.maxed ? 1 : a.progress) * 100) + '%;background:' + c + '"></div></span>' +
      '<span class="ach-sub"><span>' + esc(sub) + '</span><span>' + pctv + '%</span></span></span><span class="ach-chev">▼</span></button>' +
      '<div class="ach-more"><div class="ach-desc">' + esc(a.description || '') + '</div>' + tiers + '</div></div>';
  }

  // ---------------- Baum ----------------
  // Nur die Voraussetzung (after) wird gepflegt, das Layout rechnet sich selbst: Spalte = Tiefe, Zeile = Reihenfolge der Geschwister (nach weight).
  // Unbekannte Achievements hängen automatisch an der Wurzel ihrer Gruppe.
  var AFTER = { 'committer': 'start', 'pull-shark': 'start', 'line-machine': 'start', 'pair-programmer': 'start', 'stargazer': 'start', 'unicorn': 'start',
    'streak-keeper': 'committer', 'daily-grinder': 'committer', 'commit-storm': 'committer', 'unbroken': 'streak-keeper', 'night-owl': 'daily-grinder', 'early-bird': 'daily-grinder', 'weekend-warrior': 'daily-grinder',
    'reviewer': 'pull-shark', 'open-sourcerer': 'pull-shark', 'issue-hunter': 'pull-shark', 'team-player': 'open-sourcerer', 'quickdraw': 'issue-hunter',
    'hand-crafted': 'line-machine', 'refactorer': 'line-machine', 'deep-diver': 'line-machine', 'repo-builder': 'line-machine', 'polyglot': 'repo-builder', 'babel': 'polyglot',
    'coding-time': 'pair-programmer', 'marathon': 'coding-time', 'consistent': 'coding-time',
    'supernova': 'stargazer', 'forked': 'stargazer', 'follower-club': 'stargazer',
    'christmas-coder': 'unicorn', 'new-year': 'christmas-coder', 'monster-pr': 'unicorn', 'clean-sweep': 'monster-pr' };
  var ROOT_OF_GROUP = { consistency: 'committer', collaboration: 'pull-shark', craft: 'line-machine', 'ai-time': 'pair-programmer', impact: 'stargazer', fun: 'unicorn', legendary: 'committer' };
  var ORDER = ['committer', 'pull-shark', 'line-machine', 'pair-programmer', 'stargazer', 'unicorn'];
  var RIGHT = { 'committer': 1, 'line-machine': 1 };
  var CENTER = 'grandmaster';
  var TS = 48, CW = 124, RH = 78, HALF = 62;

  function treeData(j, byId) {
    var after = {}, kids = {};
    j.achievements.forEach(function (a) {
      if (a.id === CENTER) return;
      var p = AFTER[a.id] || ROOT_OF_GROUP[a.group] || 'committer';
      if (p !== 'start' && (!byId[p] || p === a.id)) p = 'start';
      after[a.id] = p;
    });
    Object.keys(after).forEach(function (id) { (kids[after[id]] = kids[after[id]] || []).push(id); });
    Object.keys(kids).forEach(function (p) {
      kids[p].sort(function (x, y) {
        if (p === 'start') { var ix = ORDER.indexOf(x), iy = ORDER.indexOf(y); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); }
        return (byId[y].weight || 0) - (byId[x].weight || 0) || byId[x].name.localeCompare(byId[y].name);
      });
    });
    var roots = (kids.start || []), sides = { R: [], L: [] };
    roots.forEach(function (r) { (RIGHT[r] || (!ORDER.includes(r) && sides.R.length < sides.L.length) ? sides.R : sides.L).push(r); });
    var pos = {}, rows = { R: 0, L: 0 }, maxD = 0;
    ['R', 'L'].forEach(function (sd) {
      var row = 0, sign = sd === 'R' ? 1 : -1;
      sides[sd].forEach(function (r, i) {
        if (i > 0) row += 0.7;
        (function walk(id, d) {
          maxD = Math.max(maxD, d);
          var k = kids[id] || [];
          if (!k.length) { pos[id] = { d: d, r: row++, s: sign }; return; }
          k.forEach(function (c) { walk(c, d + 1); });
          pos[id] = { d: d, r: (pos[k[0]].r + pos[k[k.length - 1]].r) / 2, s: sign };
        })(r, 1);
      });
      var off = (row - 1) / 2;
      Object.keys(pos).forEach(function (id) { if (pos[id].s === sign) pos[id].r -= off; });
      rows[sd] = row;
    });
    return { after: after, kids: kids, pos: pos, sides: sides, rowsMax: Math.max(rows.R, rows.L), maxD: maxD };
  }

  function groupColor(a, byId) { var g = byId[ROOT_OF_GROUP[a.group]]; return (g && g.color) || a.color || '#38bdf8'; }

  function treeNode(a, x, y, c) {
    var t = tierOf(a), inact = a.legendary && !a.maxed, lock = a.level === 0 && !a.legendary, prog = lock && a.progress > 0, secret = lock && !(a.progress > 0), gold = a.legendary || a.maxed, col = gold ? '#ffd34e' : c;
    var fill = secret ? '#0e1218' : gold ? '#2a2008' : '#161b22', stroke = secret ? '#2a313a' : prog ? '#555' : col, S = TS, o = '';
    if (a.legendary) o += '<path class="fr" d="M' + (x + 8) + ' ' + y + 'h' + (S - 16) + 'l8 8v' + (S - 16) + 'l-8 8h-' + (S - 16) + 'l-8-8v-' + (S - 16) + 'z M' + (x + S / 2) + ' ' + (y - 5) + 'l3 5h-6z M' + (x + S / 2) + ' ' + (y + S + 5) + 'l3-5h-6z M' + (x - 5) + ' ' + (y + S / 2) + 'l5 3v-6z M' + (x + S + 5) + ' ' + (y + S / 2) + 'l-5 3v-6z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>';
    else o += '<rect class="fr" x="' + x + '" y="' + y + '" width="' + S + '" height="' + S + '" rx="7" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (prog ? ' stroke-dasharray="4 3"' : '') + '/>' + (a.maxed ? '<rect x="' + (x - 3) + '" y="' + (y - 3) + '" width="' + (S + 6) + '" height="' + (S + 6) + '" rx="10" fill="none" stroke="#ffd34e" opacity=".25" stroke-width="3"/>' : '');
    if (a.icon) o += '<g transform="translate(' + (x + S / 2 - 23) + ' ' + (y + S / 2 - 23) + ')"' + (secret ? ' style="filter:brightness(.25) grayscale(1)"' : prog || inact ? ' style="filter:grayscale(.85) brightness(.7)"' : '') + '>' + icon(a.icon, 30, 1) + '</g>';
    if (prog) o += '<rect x="' + (x + 6) + '" y="' + (y + S - 8) + '" width="' + (S - 12) + '" height="3" fill="#222a33"/><rect x="' + (x + 6) + '" y="' + (y + S - 8) + '" width="' + ((S - 12) * a.progress).toFixed(1) + '" height="3" fill="' + c + '"/>';
    if (!lock) o += '<circle cx="' + (x + S - 4) + '" cy="' + (y + S - 4) + '" r="9" fill="#0d1117" stroke="' + col + '" stroke-width="1.5"/><text x="' + (x + S - 4) + '" y="' + (y + S - 0.5) + '" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">' + (a.legendary ? '★' : a.level) + '</text>';
    if (secret) o += '<text x="' + (x + S / 2) + '" y="' + (y + S / 2 + 6) + '" font-size="17" text-anchor="middle" fill="#3a434f" font-weight="700">?</text>';
    return '<g class="ach-node" data-id="' + esc(a.id) + '"' + (inact ? ' opacity=".6"' : '') + '>' + o + '<text x="' + (x + S / 2) + '" y="' + (y + S + 15) + '" font-size="10.5" text-anchor="middle" fill="' + (secret ? '#4b5563' : '#aab3bf') + '">' + (secret ? '???' : esc(a.name)) + '</text></g>';
  }

  function treeSvg(j, byId) {
    var T = treeData(j, byId), pos = T.pos, kids = T.kids, W = 1500, H = Math.max(520, T.rowsMax * RH + 170), CX = W / 2, CY = H / 2, bands = '', lines = '', nodes = '';
    var X = function (id) { var p = pos[id]; return CX + p.s * (HALF + 56 + (p.d - 1) * CW + TS / 2); }, Y = function (id) { return CY + pos[id].r * RH; };
    var login = (j.login || 'N').charAt(0).toUpperCase();
    // Bänder je Ast mit Stufen-Zähler (jede Stufe einzeln)
    ['R', 'L'].forEach(function (sd) {
      T.sides[sd].forEach(function (r) {
        var ids = []; (function w(i) { ids.push(i); (kids[i] || []).forEach(w); })(r);
        var c = groupColor(byId[r], byId), ys = ids.map(Y), xs = ids.map(X), s = pos[r].s;
        var y0 = Math.min.apply(null, ys) - TS / 2 - 30, y1 = Math.max.apply(null, ys) + TS / 2 + 22, xa = Math.min.apply(null, xs) - TS / 2 - 16, xb = Math.max.apply(null, xs) + TS / 2 + 16;
        var got = ids.reduce(function (n, i) { return n + byId[i].level; }, 0), all = ids.reduce(function (n, i) { return n + byId[i].tiers.length; }, 0);
        var nm = (j.groups && j.groups[byId[r].group]) || byId[r].group;
        bands += '<rect x="' + xa + '" y="' + y0 + '" width="' + (xb - xa) + '" height="' + (y1 - y0) + '" rx="14" fill="' + c + '" opacity=".06"/><text x="' + (s > 0 ? xa + 10 : xb - 10) + '" y="' + (y0 + 16) + '" font-size="11" font-weight="700" letter-spacing="1" text-anchor="' + (s > 0 ? 'start' : 'end') + '" fill="' + c + '">' + esc(String(nm).toUpperCase()) + '  ' + got + ' / ' + all + '</text>';
      });
    });
    // rechtwinklige Verbindungen
    Object.keys(T.after).forEach(function (id) {
      var pid = T.after[id], c = pos[id], pa = pid === 'start' ? null : byId[pid], open = pid === 'start' || pa.level > 0, a = byId[id], col = groupColor(a, byId), on = open && a.level > 0, s = c.s;
      var x1 = pid === 'start' ? CX + s * HALF : X(pid) + s * TS / 2, y1 = pid === 'start' ? CY : Y(pid), x2 = X(id) - s * TS / 2, y2 = Y(id), m = x1 + (x2 - x1) / 2;
      lines += '<path d="M' + x1 + ' ' + y1 + 'H' + m + 'V' + y2 + 'H' + x2 + '" fill="none" stroke="' + (on ? col : open ? '#586271' : '#2a313a') + '" stroke-width="3"' + (open ? '' : ' stroke-dasharray="4 4"') + '/>';
    });
    // Mitte: Avatar-Initial, Rahmen = Fortschritt zum Grandmaster
    var gm = byId[CENTER], fr = gm ? (gm.maxed ? 1 : gm.progress) : 0;
    nodes += '<rect x="' + (CX - HALF) + '" y="' + (CY - HALF) + '" width="' + HALF * 2 + '" height="' + HALF * 2 + '" rx="10" fill="#0b0f14" stroke="#2a313a" stroke-width="3"/>' +
      (gm ? '<rect x="' + (CX - HALF) + '" y="' + (CY - HALF) + '" width="' + HALF * 2 + '" height="' + HALF * 2 + '" rx="10" fill="none" stroke="#ffd34e" stroke-width="4" pathLength="100" stroke-dasharray="' + (fr * 100).toFixed(1) + ' 200"/>' : '') +
      '<rect x="' + (CX - 40) + '" y="' + (CY - 40) + '" width="80" height="80" rx="8" fill="#0f1f18" stroke="#34f5a0" stroke-width="2.5"/><text x="' + CX + '" y="' + (CY + 12) + '" font-size="34" font-weight="700" text-anchor="middle" fill="#34f5a0">' + esc(login) + '</text>';
    if (gm) nodes += treeNode(gm, CX - TS / 2, CY - HALF - TS - 26, '#ffd34e') + '<text x="' + CX + '" y="' + (CY - HALF - TS - 36) + '" font-size="10.5" text-anchor="middle" fill="#ffd34e" opacity=".9">GRANDMASTER ' + gm.value + '/' + gm.tiers[0] + '</text>';
    Object.keys(T.after).forEach(function (id) { nodes += treeNode(byId[id], X(id) - TS / 2, Y(id) - TS / 2, groupColor(byId[id], byId)); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif">' + bands + lines + nodes + '</svg>';
  }

  function treeTip(a, byId) {
    var lock = a.level === 0 && !a.legendary, secret = lock && !(a.progress > 0), c = a.legendary ? '#ffd34e' : groupColor(a, byId), tr = tierOf(a);
    if (secret) return '<b>???</b><div class="d">Still locked. Get started and more will show up.</div>';
    var line = a.next ? fv(a, a.value) + ' / ' + fv(a, a.next) + ' ' + esc(a.unit) : 'Max level';
    return '<b style="color:' + (a.legendary ? '#ffd34e' : '#fff') + '">' + (a.legendary ? '★ ' : '') + esc(a.name) + '</b><div class="d">' + esc(a.description || '') + '</div><div>' + line + '</div>' +
      '<div class="pb"><i style="width:' + Math.round((a.maxed ? 1 : a.progress) * 100) + '%;background:' + c + '"></i></div><div class="pips">' + a.tiers.map(function (_, i) { return '<s' + (i < a.level ? ' style="background:' + c + '"' : '') + '></s>'; }).join('') + '</div>' +
      '<div class="r" style="color:' + tr.c + '">' + tr.name.toUpperCase() + ' · Level ' + a.level + ' / ' + a.tiers.length + '</div>';
  }

  // ---------- Master Road ----------
  var RROAD = { Rare: '#58a6ff', Epic: '#a371f7', Legendary: '#ffb800' };
  function roadTiers(j) { return j.achievements.reduce(function (n, a) { return n + (a.level || 0); }, 0); }
  function roadDone(road, state) {
    var ids = {}; ((state && state.completed) || []).forEach(function (c) { ids[c.id] = c; });
    var cur = 0; while (cur < road.stations.length && ids[road.stations[cur].id]) cur++;
    return { cur: cur, ids: ids };
  }
  function rpt(i) { return [410 + Math.sin(i * 0.95) * 230, 110 + i * 118]; }
  function rpath(a, b) { var p = rpt(a), q = rpt(b), my = (p[1] + q[1]) / 2; return 'M' + p[0] + ' ' + p[1] + 'C' + p[0] + ' ' + my + ' ' + q[0] + ' ' + my + ' ' + q[0] + ' ' + q[1]; }
  function roadHtml(j, road, state) {
    var N = road.stations.length, gate = road.gate || 100, have = roadTiers(j);
    if (have < gate) {
      return '<div class="ach-road"><div class="ach-gate"><div class="lk">🔒</div><h2>' + esc(road.title || 'Master Road') + '</h2><p>One single, long road with ' + N + ' challenges at professional level. These tasks are hard. They are meant to be real challenges, not quick wins: each one takes weeks or months of focused work. Only the next station is visible. Complete it and the following one is revealed.</p>' +
        '<div class="bar"><i style="width:' + Math.round(have / gate * 100) + '%"></i></div><div class="n"><b>' + have + '</b> / ' + gate + ' levels · <b>' + (gate - have) + '</b> to go until it unlocks</div>' +
        '<p style="font-size:12px">All reached achievement levels of your profile are counted.</p></div></div>';
    }
    var d = roadDone(road, state), cur = d.cur, last = Math.min(cur, N - 1) + 2, H = rpt(last)[1] + 60, g = '', n = '', i;
    for (i = 1; i < last; i++) {
      var on = i <= cur;
      g += '<path d="' + rpath(i - 1, i) + '" fill="none" stroke="' + (on ? '#ffd34e' : '#3a3f55') + '" stroke-width="' + (on ? 6 : 4) + '" stroke-linecap="round"' + (on ? '' : ' stroke-dasharray="2 10" opacity="' + (i === cur + 1 ? 0.45 : 0.2) + '"') + '/>';
    }
    for (i = 0; i <= Math.min(cur, N - 1); i++) {
      var p = rpt(i), x = p[0], y = p[1], s = road.stations[i], c = RROAD[s.rarity] || '#58a6ff', lbl = ' stroke="#0b0d12" stroke-width="4" paint-order="stroke"';
      if (i < cur) n += '<g class="ach-rnode" data-i="' + i + '"><circle class="ring" cx="' + x + '" cy="' + y + '" r="26" fill="#2a2008" stroke="#ffd34e" stroke-width="3"/><path d="M' + (x - 9) + ' ' + y + 'l6 7 12-14" fill="none" stroke="#ffd34e" stroke-width="4"/><text x="' + x + '" y="' + (y + 48) + '" font-size="12" text-anchor="middle" fill="#c9b36a"' + lbl + '>' + esc(s.name) + '</text></g>';
      else n += '<g class="ach-rnode" data-i="' + i + '"><circle cx="' + x + '" cy="' + y + '" r="46" fill="' + c + '" opacity=".12"><animate attributeName="r" values="40;52;40" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".22;.04;.22" dur="2.6s" repeatCount="indefinite"/></circle><circle class="ring" cx="' + x + '" cy="' + y + '" r="32" fill="#161b2b" stroke="' + c + '" stroke-width="4"/><text x="' + x + '" y="' + (y + 7) + '" font-size="20" font-weight="700" text-anchor="middle" fill="' + c + '">' + (i + 1) + '</text><text x="' + x + '" y="' + (y + 60) + '" font-size="14" font-weight="700" text-anchor="middle" fill="#fff"' + lbl + '>' + esc(s.name) + '</text><text x="' + x + '" y="' + (y + 78) + '" font-size="10.5" letter-spacing="1" text-anchor="middle" fill="' + c + '"' + lbl + '>' + esc(s.rarity.toUpperCase()) + ' · NEXT STATION</text></g>';
    }
    if (cur < N) { var f = rpt(cur + 1); n += '<text x="' + f[0] + '" y="' + (f[1] + 9) + '" font-size="30" text-anchor="middle" fill="#3a3f55" font-weight="700" opacity=".5">?</text>'; }
    else { var e = rpt(N - 1); n += '<text x="' + e[0] + '" y="' + (e[1] + 110) + '" font-size="18" font-weight="700" text-anchor="middle" fill="#ffd34e">★ Master of the Road ★</text>'; H += 60; }
    var fog = cur < N ? '<rect x="0" y="' + (rpt(cur + 1)[1] - 30) + '" width="820" height="' + (H - rpt(cur + 1)[1] + 30) + '" fill="url(#ach-fog)"/>' : '';
    return '<div class="ach-road"><svg viewBox="0 0 820 ' + H + '" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif"><defs><linearGradient id="ach-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0d12" stop-opacity="0"/><stop offset="1" stop-color="#0b0d12"/></linearGradient></defs>' + g + n + fog + '</svg></div>' +
      '<div class="ach-tree-hint">' + (cur >= N ? 'All ' + N + ' stations completed.' : 'Station ' + (cur + 1) + ' of ' + N + ' · ' + cur + ' completed. Hover a station (or tap it) for the full explanation. These tasks are hard and meant as real challenges.') + '</div>';
  }
  function roadTipHtml(i, road, state) {
    var d = roadDone(road, state), s = road.stations[i], c = RROAD[s.rarity] || '#58a6ff', N = road.stations.length;
    if (i < d.cur) {
      var pr = d.ids[s.id] || {};
      return '<div class="k" style="color:#ffd34e">Station ' + (i + 1) + ' · completed ✓</div><h3>' + esc(s.name) + '</h3><p>' + esc(s.goal) + '</p><div class="f">Proof: ' + (pr.proof && /^https?:\/\//.test(pr.proof) ? esc(pr.proof) : esc(s.proof)) + (pr.date ? ' · ' + esc(pr.date) : '') + '</div>';
    }
    return '<div class="k" style="color:' + c + '">Station ' + (i + 1) + ' of ' + N + ' · next station</div><h3>' + esc(s.name) + '</h3><div class="s" style="color:' + c + '">' + esc(s.rarity.toUpperCase()) + ' · Effort ' + esc(s.effort) + '</div>' +
      '<h4>Goal</h4><p>' + esc(s.goal) + '</p><h4>Why it matters</h4><p>' + esc(s.why) + '</p><h4>How it is checked</h4><ul>' + s.checks.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul>' +
      '<h4>Proof</h4><p>' + esc(s.proof) + '</p><h4>Your path</h4><ol>' + s.steps.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' +
      '<div class="f">Next: <b>???</b> Complete this station and the next one is revealed.</div>';
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
    var names = { highlights: 'Highlights', closest: 'Closest to next level', all: 'All', tree: 'Tree', road: 'Master Road' };

    function draw() {
      var body;
      if (view === 'road' && opt.road) {
        body = roadHtml(j, opt.road, opt.roadState);
      } else if (view === 'tree') {
        body = '<div class="ach-tree">' + treeSvg(j, byId) + '</div><div class="ach-tree-hint">Drag or scroll, tap or hover a node for details. The golden frame in the middle shows your progress towards Grandmaster.</div>';
      } else if (view === 'all') {
        body = Object.keys(j.groups || {}).map(function (g) {
          var items = list.filter(function (a) { return a.group === g; });
          return items.length ? '<div class="ach-group">' + esc(j.groups[g]) + '</div><div class="ach-grid">' + items.map(card).join('') + '</div>' : '';
        }).join('');
      } else body = '<div class="ach-grid">' + (view === 'closest' ? closest : highlights).map(card).join('') + '</div>';
      root.innerHTML = '<div class="ach-head"><div class="ach-title"><span class="ach-dot"><i></i></span>Achievements · ' + esc(names[view]) +
        '<span class="ach-by"><a href="https://github.com/nkunze2306/github-achievements-by-niounze">GitHub Achievements by niounze</a></span></div>' +
        '<div class="ach-right"><span class="ach-count"><b>' + j.unlocked + '</b> / ' + j.total + ' unlocked</span><span class="ach-tabs">' +
        ['highlights', 'closest', 'all', 'tree'].concat(opt.road ? ['road'] : []).map(function (v) { return '<button data-v="' + v + '" class="' + (v === view ? 'on' : '') + '">' + (v === 'closest' ? 'Next level' : names[v]) + '</button>'; }).join('') +
        '</span>' + (view === 'tree' || view === 'road' ? '' : '<button class="ach-exp">' + (expandAll ? 'Collapse all' : 'Expand all') + '</button>') + '</div></div>' + body;
      if (view === 'tree') { var tw = root.querySelector('.ach-tree'); if (tw) tw.scrollLeft = (tw.scrollWidth - tw.clientWidth) / 2; }
      if (expandAll) root.querySelectorAll('.ach-card').forEach(function (c) { c.classList.add('open'); });
    }
    function showTip(n, pin) {
      var wrap = root.querySelector('.ach-tree'); if (!wrap) return;
      var old = wrap.querySelector('.ach-tip'); if (old) old.remove();
      var a = byId[n.getAttribute('data-id')]; if (!a) return;
      var t = document.createElement('div'); t.className = 'ach-tip'; t.innerHTML = treeTip(a, byId); wrap.appendChild(t);
      var b = n.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      var left = b.left - w.left + wrap.scrollLeft + 64; if (left + 240 > wrap.scrollLeft + wrap.clientWidth) left = b.left - w.left + wrap.scrollLeft - 244;
      t.style.left = Math.max(wrap.scrollLeft + 4, left) + 'px'; t.style.top = (b.top - w.top + wrap.scrollTop) + 'px';
    }
    root.addEventListener('mouseover', function (e) { var n = e.target.closest && e.target.closest('.ach-node'); if (n) showTip(n); });
    root.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('.ach-node')) { var t = root.querySelector('.ach-tip'); if (t) t.remove(); } });
    function showRoadTip(n) {
      var box = root.querySelector('.ach-road'); if (!box || !opt.road) return;
      var old = box.querySelector('.ach-rtip'); if (old) old.remove();
      var i = +n.getAttribute('data-i'), t = document.createElement('div'); t.className = 'ach-rtip';
      var done = i < roadDone(opt.road, opt.roadState).cur; t.style.borderColor = done ? '#8a7020' : (RROAD[opt.road.stations[i].rarity] || '#6a4cc9');
      t.innerHTML = roadTipHtml(i, opt.road, opt.roadState); box.appendChild(t);
      var r = box.getBoundingClientRect(), b = n.querySelector('.ring').getBoundingClientRect(), W = t.offsetWidth, H = t.offsetHeight;
      var left = b.right - r.left + 20, top = b.top - r.top - 60;
      if (left + W > r.width) { left = b.left - r.left - W - 20; if (left < 8) { left = Math.min(Math.max(8, b.left - r.left + b.width / 2 - W / 2), r.width - W - 8); top = b.bottom - r.top + 64; } }
      t.style.left = left + 'px'; t.style.top = Math.max(8, top) + 'px'; box.style.minHeight = Math.max(520, top + H + 24) + 'px';
    }
    root.addEventListener('mouseover', function (e) { var n = e.target.closest && e.target.closest('.ach-rnode'); if (n) showRoadTip(n); });
    root.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('.ach-rnode')) { var t = root.querySelector('.ach-rtip'); if (t) t.remove(); } });
    root.addEventListener('click', function (e) {
      var rn = e.target.closest && e.target.closest('.ach-rnode'); if (rn) { showRoadTip(rn); return; }
      var nd = e.target.closest && e.target.closest('.ach-node'); if (nd) { showTip(nd); return; }
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
