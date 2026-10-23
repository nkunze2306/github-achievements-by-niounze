// Standalone achievements page (works on GitHub Pages of the user's repo): all achievements, expandable levels.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderPage(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const who = data.login ? esc(data.login) : 'you';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Achievements - ${who}</title>
<style>:root{color-scheme:dark}body{margin:0;background:#000;color:#e6e6e6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}main{max-width:1100px;margin:0 auto;padding:28px 16px 48px}
.top{margin:0 0 18px;font-size:22px;font-weight:700;color:#fff}.top small{display:block;font-size:13px;font-weight:400;color:#8b8b8b;margin-top:2px}
footer{margin-top:28px;font-size:12px;color:#6a6a6a}footer a{color:#8b8b8b}</style></head>
<body><main><h1 class="top">${who}<small>GitHub achievements, updated ${new Date(data.updated).toUTCString()}</small></h1><div id="root"></div>
<footer>GitHub Achievements by <a href="https://github.com/nkunze2306/github-achievements-by-niounze">niounze</a></footer></main>
<script src="achievements-ui.js"></script>
<script>AchUI.mount(document.getElementById('root'), ${json});</script></body></html>
`;
}
