// Admin panel HTML, Nova brand design system (tokens copied from the production
// Nova panel), Inter + Vazirmatn, light/dark, English + Persian with RTL,
// enterprise sidebar layout. Shipped inline so the whole bot is one Worker.

const LOGO = `<svg viewBox="0 0 1254 1254" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="ng" x1="128" y1="1122" x2="1206" y2="44" gradientUnits="userSpaceOnUse"><stop offset=".04" stop-color="#9d4efb"/><stop offset="1" stop-color="#02cdf3"/></linearGradient></defs><path d="M1185.57,149.23c0-43.84-27.55-82.6-66.19-100.7-40.83-19.13-87.98-16.85-126.82,6.19-33.3,19.76-56.22,55.99-56.25,95.68l-.38,653.25.09,39.98c.03,13.51-.33,26.37-3.82,39.13-8.12,29.65-30.52,53.04-56.69,62.39-32.53,11.62-65.87,5.5-91.07-15.75-20.65-17.42-33.28-42.64-33.32-70.11l-.35-245.85.07-231.05c.04-148.83-97.26-281.46-240.38-321.81-67.49-19.02-138.62-19.66-204.99,2.42l-13.66,4.55C159.84,114.72,68.42,239.99,68.41,381.43l-.06,712.76c0,68.93,56.48,123.39,124.03,124.15,65.31.73,125.56-52.18,125.64-120.57l.88-712.63c.07-54.62,49.94-96.23,103.56-88.53,43.56,6.25,78.96,43.23,79.08,88.34l1.24,493.92c.16,62.52,24.72,123.29,59.49,174.21,43.7,63.99,108.48,111.28,182.25,133.98,91.72,28.23,190.9,16.68,273.4-31.79,36.89-21.68,68.83-50.13,94.95-83.49l16.54-23.16c31.76-44.47,56.26-119.27,56.25-174.93l-.09-724.43Z" fill="url(#ng)"/></svg>`;

const STYLE = `
:root{
 --bg:#f4f6fb;--panel:#ffffff;--card:#ffffff;--card2:#f7f9fc;--bd:#e6eaf1;--bd2:#dde2eb;
 --tx:#101622;--tx2:#3a465c;--mu:#5f6a7d;--ac:#0ea5c4;--ac2:#7c3aed;
 --grad:linear-gradient(120deg,#0891b2,#7c3aed);--ring:rgba(8,145,178,.25);
 --ok:#047857;--dg:#dc2626;--wn:#b45309;
 --shadow:0 1px 2px rgba(20,40,80,.04),0 10px 28px rgba(40,60,110,.10);
 --ac-soft:color-mix(in srgb,var(--ac) 12%,transparent);--radius:12px;--sidebar:252px}
html[data-theme=dark]{
 --bg:#070809;--panel:#0c0e12;--card:#101319;--card2:#0b0d11;--bd:#1c2027;--bd2:#262b34;
 --tx:#e9edf4;--tx2:#aeb6c4;--mu:#6f7888;--ac:#22d3ee;--ac2:#a855f7;
 --grad:linear-gradient(120deg,#22d3ee,#7c5cff);--ring:rgba(34,211,238,.30);
 --ok:#34d399;--dg:#f87171;--wn:#f5b042;
 --shadow:0 1px 0 rgba(255,255,255,.02),0 12px 30px rgba(0,0,0,.45);
 --ac-soft:color-mix(in srgb,var(--ac) 15%,transparent)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{overflow-x:clip;-webkit-text-size-adjust:100%}
body{font-family:'Inter','Vazirmatn',system-ui,-apple-system,Segoe UI,Tahoma,sans-serif;
 background:var(--bg);color:var(--tx);min-height:100vh;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
html[dir=rtl] body{font-family:'Vazirmatn','Inter',system-ui,Tahoma,sans-serif}
a{color:var(--ac);text-decoration:none}
button{font-family:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--ac);outline-offset:2px;border-radius:6px}
::selection{background:var(--ac-soft)}

/* Layout */
.app{display:grid;grid-template-columns:var(--sidebar) 1fr;min-height:100vh}
.sidebar{background:var(--panel);border-right:1px solid var(--bd);padding:18px 14px;display:flex;flex-direction:column;gap:4px;position:sticky;top:0;height:100vh}
html[dir=rtl] .sidebar{border-right:none;border-left:1px solid var(--bd)}
.brand{display:flex;align-items:center;gap:11px;padding:6px 8px 16px}
.brand .lg{width:38px;height:38px;border-radius:11px;background:var(--card2);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;padding:6px}
.brand .lg svg{width:100%;height:100%;display:block}
.brand .nm{font-weight:800;font-size:15px;letter-spacing:-.2px}
.brand .nm small{display:block;font-weight:500;font-size:11px;color:var(--mu);letter-spacing:.2px}
.nav-label{font-size:10px;font-weight:700;letter-spacing:1.4px;color:var(--mu);text-transform:uppercase;padding:12px 10px 6px}
.nav-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:var(--tx2);border:none;background:transparent;width:100%;text-align:start;font-size:13.5px;font-weight:600;position:relative}
.nav-item svg{width:18px;height:18px;flex:0 0 18px;opacity:.75}
.nav-item:hover{background:var(--card2);color:var(--tx)}
.nav-item.on{background:var(--card2);color:var(--tx)}
.nav-item.on::before{content:'';position:absolute;inset-inline-start:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--grad)}
html[dir=rtl] .nav-item.on::before{border-radius:3px 0 0 3px}
.nav-item.on svg{opacity:1;color:var(--ac)}
.side-foot{margin-top:auto;display:flex;gap:8px;padding-top:12px}
.side-foot .tool{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;height:38px;background:var(--card2);border:1px solid var(--bd);border-radius:10px;color:var(--tx2);font-size:12px;font-weight:600}
.side-foot .tool:hover{color:var(--ac);border-color:var(--bd2)}
.lang{display:flex;gap:3px;background:var(--card2);border:1px solid var(--bd);border-radius:10px;padding:3px}
.lang button{border:none;background:transparent;color:var(--mu);font:inherit;font-size:12px;font-weight:700;padding:6px 11px;border-radius:7px}
.lang button.on{background:var(--ac);color:#fff}

/* Main */
.main{padding:26px 30px;max-width:900px}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
.topbar h1{font-size:20px;font-weight:800;letter-spacing:-.3px}
.topbar .sub{color:var(--mu);font-size:12.5px;margin-top:2px}
.pane{display:none}
.pane.on{display:block}

/* Cards & forms */
.card{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:20px;margin:0 0 16px;box-shadow:var(--shadow)}
.card h2{font-size:14px;font-weight:700;margin-bottom:4px}
.card .desc{color:var(--mu);font-size:12.5px;margin-bottom:14px}
label{display:block;font-size:12px;color:var(--tx2);font-weight:600;margin:14px 0 6px}
label:first-of-type{margin-top:0}
input,textarea{width:100%;background:var(--card2);border:1px solid var(--bd2);border-radius:11px;
 padding:12px 13px;color:var(--tx);font:inherit;font-size:14px;outline:none;transition:.12s}
input:focus,textarea:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--ring)}
textarea{min-height:96px;resize:vertical;line-height:1.6}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--ac);color:#fff;font-weight:700;
 border:none;border-radius:11px;padding:12px 18px;font-size:14px;margin-top:16px;transition:.12s}
.btn:hover{filter:brightness(1.06)}
.btn.ghost{background:var(--card2);color:var(--tx);border:1px solid var(--bd2)}
.btn.sm{padding:8px 13px;font-size:12.5px;margin:0}
.btn.dg{background:color-mix(in srgb,var(--dg) 12%,transparent);color:var(--dg);border:1px solid color-mix(in srgb,var(--dg) 40%,transparent)}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}

/* Stats */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.stat{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:18px;box-shadow:var(--shadow)}
.stat .n{font-size:2rem;font-weight:800;line-height:1;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.stat .l{color:var(--mu);font-size:12px;margin-top:8px;font-weight:600}

/* List items */
.item{border:1px solid var(--bd);border-radius:13px;padding:15px;margin:0 0 11px;background:var(--card)}
.item .q{font-weight:700;font-size:13.5px}
.item .a{color:var(--tx2);font-size:12.8px;white-space:pre-wrap;margin-top:5px;line-height:1.6}
.item .meta{color:var(--mu);font-size:11.5px;margin-top:5px}
.pill{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:999px;border:1px solid var(--bd2);color:var(--mu);background:var(--card2);margin-inline-start:6px}
.pill.off{color:var(--wn);border-color:color-mix(in srgb,var(--wn) 40%,transparent)}
.switch{display:inline-flex;align-items:center;gap:9px;font-size:13px;color:var(--tx2);font-weight:600;cursor:pointer;margin-top:14px}
.switch input{width:auto}
.muted{color:var(--mu);font-size:12.5px}
.note{background:color-mix(in srgb,var(--wn) 12%,transparent);border:1px solid color-mix(in srgb,var(--wn) 40%,transparent);
 color:var(--tx2);border-radius:11px;padding:11px 13px;font-size:12.5px;line-height:1.65;margin:0 0 6px}
.note b{color:var(--tx)}
.hidden{display:none}
.gstep{display:flex;gap:11px;padding:9px 0;font-size:13px;color:var(--tx2);line-height:1.75;border-top:1px solid var(--bd)}
.gstep:first-of-type{border-top:none}
.gstep .gn{flex:0 0 22px;height:22px;border-radius:50%;background:var(--ac-soft);color:var(--ac);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;margin-top:1px}
.gstep b{color:var(--tx);font-weight:700}
.gstep code{background:var(--card2);border:1px solid var(--bd2);border-radius:6px;padding:1px 6px;font-size:12px;direction:ltr;display:inline-block}
.toast{position:fixed;inset-block-end:22px;inset-inline:0;margin:auto;width:max-content;max-width:88%;
 background:var(--card);border:1px solid var(--bd2);padding:12px 20px;border-radius:12px;box-shadow:var(--shadow);
 opacity:0;transform:translateY(8px);transition:.22s;z-index:60;font-size:13px;font-weight:600}
.toast.show{opacity:1;transform:none}

/* Mobile */
.menu-btn{display:none}
.scrim{display:none}
@media (max-width:820px){
 .app{grid-template-columns:1fr}
 .sidebar{position:fixed;inset-block:0;inset-inline-start:0;width:262px;z-index:50;transform:translateX(-110%);transition:transform .2s;box-shadow:var(--shadow)}
 html[dir=rtl] .sidebar{transform:translateX(110%)}
 .app.open .sidebar{transform:none}
 .scrim{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:40}
 .app.open .scrim{display:block}
 .menu-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:1px solid var(--bd);background:var(--card);border-radius:10px;color:var(--tx);margin-inline-end:12px}
 .main{padding:18px 16px}
 .two{grid-template-columns:1fr}
 input,textarea{font-size:16px}
}

/* Login */
.login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;
 background:radial-gradient(820px 420px at 50% -6%,color-mix(in srgb,var(--ac) 15%,transparent),transparent 60%),
 radial-gradient(720px 420px at 88% 8%,color-mix(in srgb,var(--ac2) 13%,transparent),transparent 55%),var(--bg)}
.login .box{width:100%;max-width:392px}
.login .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.login .lg{width:40px;height:40px;border-radius:12px;background:var(--card2);border:1px solid var(--bd);padding:7px}
.login .lg svg{width:100%;height:100%}
`;

const HEAD = (title) => `<!doctype html><html lang="en" dir="ltr" data-theme="dark"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🚀%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${STYLE}</style></head>`;

const THEME_BOOT = `<script>
try{var th=localStorage.getItem('nova-theme')||'dark';document.documentElement.setAttribute('data-theme',th);
var lg=localStorage.getItem('nova-lang')||'en';document.documentElement.lang=lg;document.documentElement.dir=lg==='fa'?'rtl':'ltr';}catch(e){}
</script>`;

export function LOGIN_HTML(failed) {
  return HEAD("Nova Bot Admin") + `<body>${THEME_BOOT}
<div class="login"><div class="box">
 <div class="head">
  <div style="display:flex;align-items:center;gap:11px">
   <span class="lg">${LOGO}</span>
   <div><div style="font-weight:800;font-size:16px" id="brand">Nova Bot</div><div class="muted" id="brandsub" style="font-size:11px">Admin panel</div></div>
  </div>
  <div class="row" style="gap:8px">
   <div class="lang" id="lg"><button data-l="en" class="on">EN</button><button data-l="fa">فا</button></div>
   <button class="tool" id="theme" title="Theme" style="width:40px;height:38px;background:var(--card2);border:1px solid var(--bd);border-radius:10px;color:var(--tx2)">☀</button>
  </div>
 </div>
 <div class="card">
  <div style="font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:14px" id="t1">Sign in to the admin panel</div>
  ${failed ? '<p style="color:var(--dg);font-size:13px;margin-bottom:12px" id="bad">Wrong password.</p>' : ''}
  <form method="POST" action="/admin/login">
   <label id="lpw">Password</label>
   <input type="password" name="password" id="pw" placeholder="password" autofocus autocomplete="current-password">
   <button class="btn" style="width:100%;justify-content:center" type="submit" id="go">Sign in</button>
  </form>
 </div>
 <p class="muted" style="text-align:center;margin-top:16px;font-size:11.5px" id="ft">Nova Proxy, open-source networking tools</p>
</div></div>
<script>
var T={en:{t1:'Sign in to the admin panel',lpw:'Password',pw:'password',go:'Sign in',bad:'Wrong password.',bs:'Admin panel',ft:'Nova Proxy, open-source networking tools'},
fa:{t1:'ورود به پنل مدیریت',lpw:'رمز عبور',pw:'رمز عبور',go:'ورود',bad:'رمز اشتباه است.',bs:'پنل مدیریت',ft:'نوا پراکسی، ابزار شبکه متن‌باز'}};
function $(i){return document.getElementById(i)}
var lang=localStorage.getItem('nova-lang')||'en',theme=localStorage.getItem('nova-theme')||'dark';
function ap(){var t=T[lang];document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';
$('t1').textContent=t.t1;$('lpw').textContent=t.lpw;$('pw').placeholder=t.pw;$('go').textContent=t.go;$('brandsub').textContent=t.bs;$('ft').textContent=t.ft;
if($('bad'))$('bad').textContent=t.bad;[].forEach.call(document.querySelectorAll('#lg button'),function(b){b.classList.toggle('on',b.dataset.l===lang)})}
function at(){document.documentElement.setAttribute('data-theme',theme);$('theme').textContent=theme==='dark'?'☀':'☾'}
$('lg').onclick=function(e){var b=e.target.closest('button');if(b){lang=b.dataset.l;localStorage.setItem('nova-lang',lang);ap()}};
$('theme').onclick=function(){theme=theme==='dark'?'light':'dark';localStorage.setItem('nova-theme',theme);at()};
at();ap();
</script></body></html>`;
}

export const DASHBOARD_HTML = HEAD("Nova Bot Admin") + `<body>${THEME_BOOT}
<div class="app" id="app">
 <div class="scrim" onclick="toggleNav()"></div>
 <aside class="sidebar">
  <div class="brand"><span class="lg">${LOGO}</span><span class="nm">Nova Bot<small id="brandsub">Admin panel</small></span></div>
  <div class="nav-label" data-k="manage">Manage</div>
  <button class="nav-item on" data-p="stats" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/></svg><span data-k="stats">Stats</span></button>
  <button class="nav-item" data-p="faq" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12" y2="17"/></svg><span data-k="faq">FAQ</span></button>
  <button class="nav-item" data-p="sections" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span data-k="sections">Sections</span></button>
  <button class="nav-item" data-p="users" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span data-k="users">Users</span></button>
  <button class="nav-item" data-p="settings" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span data-k="settings">Settings</span></button>
  <button class="nav-item" data-p="broadcast" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg><span data-k="broadcast">Broadcast</span></button>
  <div class="nav-label" data-k="help">Help</div>
  <button class="nav-item" data-p="guide" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span data-k="guide">Guide</span></button>
  <div class="side-foot">
   <div class="lang" id="lg"><button data-l="en" class="on">EN</button><button data-l="fa">فا</button></div>
   <button class="tool" id="theme" title="Theme">☀ <span data-k="theme">Theme</span></button>
   <a class="tool" href="/admin/logout" style="flex:0 0 auto"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></a>
  </div>
 </aside>

 <main class="main">
  <div class="topbar">
   <div style="display:flex;align-items:center">
    <button class="menu-btn" onclick="toggleNav()"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
    <div><h1 id="ptitle">Stats</h1><div class="sub" id="psub">How the bot is doing</div></div>
   </div>
  </div>

  <!-- STATS -->
  <div class="pane on" data-pane="stats"><div class="grid" id="stats"></div></div>

  <!-- FAQ -->
  <div class="pane" data-pane="faq">
   <div class="card">
    <h2 data-k="faq_add">Add a question</h2>
    <div class="desc" data-k="faq_add_d">Shown as a tappable list in the bot. Answers support &lt;b&gt; &lt;i&gt; &lt;a&gt; &lt;code&gt;.</div>
    <label data-k="f_q">Question</label><input id="fq">
    <label data-k="f_a">Answer</label><textarea id="fa"></textarea>
    <label data-k="order">Order</label><input id="fp" type="number" value="0" style="max-width:120px">
    <button class="btn" onclick="addFaq()" data-k="add">Add question</button>
   </div>
   <div class="card">
    <h2 data-k="faq_ai">Draft from real questions</h2>
    <div class="desc" data-k="faq_ai_d">The AI reads recent support questions and your team's answers, then drafts new FAQ entries. Drafts appear below as hidden; review, edit and Show the good ones.</div>
    <button class="btn ghost" style="margin-top:0" onclick="suggestFaq(this)" data-k="faq_ai_btn">✨ Suggest FAQ entries</button>
   </div>
   <div id="faqlist"></div>
  </div>

  <!-- SECTIONS -->
  <div class="pane" data-pane="sections">
   <div class="card">
    <h2 data-k="sec_add">Add a menu section</h2>
    <div class="desc" data-k="sec_add_d">Adds a button to the bot's main menu with your text and an optional link.</div>
    <label data-k="s_t">Button title</label><input id="st">
    <label data-k="s_b">Body (HTML allowed)</label><textarea id="sb"></textarea>
    <div class="two">
     <div><label data-k="s_bt">Link button text (optional)</label><input id="sbt"></div>
     <div><label data-k="s_bu">Link URL (optional)</label><input id="sbu"></div>
    </div>
    <label data-k="order">Order</label><input id="sp" type="number" value="0" style="max-width:120px">
    <button class="btn" onclick="addSection()" data-k="add_sec">Add section</button>
   </div>
   <div id="seclist"></div>
  </div>

  <!-- USERS -->
  <div class="pane" data-pane="users">
   <div class="card">
    <h2 data-k="u_block_id">Block by user ID</h2>
    <div class="desc" data-k="u_block_id_d">Paste a Telegram user ID (you'll see it on messages in your contact group) to block them from the bot.</div>
    <div class="row">
     <input id="banid" inputmode="numeric" placeholder="123456789" style="flex:1;min-width:160px">
     <button class="btn dg" style="margin-top:0" onclick="banById()" data-k="u_block">Block</button>
    </div>
   </div>
   <div class="card">
    <div class="row" style="margin-bottom:6px">
     <input id="usearch" placeholder="Search name / username / ID" oninput="loadUsers()" style="flex:1">
    </div>
    <div id="userlist"></div>
   </div>
  </div>

  <!-- SETTINGS -->
  <div class="pane" data-pane="settings">
   <div class="card">
    <h2 data-k="welcome">Welcome message</h2>
    <div class="desc" data-k="welcome_d">Shown at the top of the main menu. Leave blank for the default. Set each language separately.</div>
    <label>English</label><textarea id="welcome_en"></textarea>
    <label>فارسی</label><textarea id="welcome_fa" dir="rtl"></textarea>
    <label data-k="w_img">Banner image URL (optional)</label>
    <input id="welcome_image" dir="ltr" placeholder="https://novaproxy.online/og.png">
    <div class="desc" style="margin-top:6px" data-k="w_img_d">Shown above the welcome text as a banner. Leave blank for a text-only menu. Max about 5&nbsp;MB, any public image URL.</div>
    <button class="btn" onclick="saveConfig()" data-k="save">Save</button>
   </div>
   <div class="card">
    <h2 data-k="chan">Required channel</h2>
    <div class="desc" data-k="chan_d">Users must join this channel before they can use the bot.</div>
    <div class="note" data-k="chan_note">⚠️ <b>The bot must be an admin of the channel</b> for this to work. Open the channel → Administrators → Add Admin → add <b>@IRNovaProxy_Bot</b> (no permissions needed). Until the bot is a channel admin, the check can't run and everyone is let through.</div>
    <label class="switch"><input type="checkbox" id="join_required"> <span data-k="chan_enable">Require channel membership</span></label>
    <label data-k="chan_user">Channel username</label>
    <input id="join_channel" placeholder="irnova_proxy" dir="ltr">
    <div><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
   </div>
   <div class="card">
    <h2 data-k="sup">Support us</h2>
    <div class="desc" data-k="sup_d">Shown when a user taps 💝 Support us in the bot. If both fields are empty, the bot tells users support isn't set up yet.</div>
    <label data-k="sup_text">Message (HTML allowed, e.g. wallet addresses in &lt;code&gt;)</label>
    <textarea id="support_text" dir="auto"></textarea>
    <label data-k="sup_links">Link buttons, one per line: Label | https://url</label>
    <textarea id="support_links" dir="ltr" placeholder="Donate | https://example.com/donate"></textarea>
    <div><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
   </div>
   <div class="card">
    <h2 data-k="ai">AI assistant</h2>
    <div class="desc" data-k="ai_d">Answers support messages automatically when it is confident, using your FAQ and your team's past answers. Everything else still goes to your admin group, and every AI answer is copied there for review.</div>
    <label class="switch"><input type="checkbox" id="ai_enabled"> <span data-k="ai_enable">Auto-answer support questions</span></label>
    <label data-k="ai_model_l">Claude model (used when the API key is set)</label>
    <input id="ai_model" dir="ltr" placeholder="claude-opus-4-8">
    <div class="desc" style="margin-top:8px" data-k="ai_key_d">Works for free out of the box on Cloudflare Workers AI (10,000 neurons/day included). For the best Persian quality, add the <code>ANTHROPIC_API_KEY</code> secret (<code>wrangler secret put ANTHROPIC_API_KEY</code>) and the bot switches to Claude automatically.</div>
    <div><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
   </div>
   <div class="card">
    <h2 data-k="contact">Contact us</h2>
    <label class="switch"><input type="checkbox" id="contact_enabled"> <span data-k="c_enable">Enable "Contact us"</span></label>
    <label data-k="c_group">Admin group chat ID</label>
    <input id="contact_group_id" placeholder="-1001234567890">
    <div class="desc" style="margin-top:8px" data-k="c_group_d">Create a Telegram group, add <b>@IRNovaProxy_Bot</b> as an admin, send <code>/id</code> in the group, and paste the ID here. Reply to a forwarded message to answer that user.</div>
    <label class="switch"><input type="checkbox" id="faq_enabled"> <span data-k="show_faq">Show FAQ in menu</span></label>
    <div><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
   </div>
  </div>

  <!-- BROADCAST -->
  <div class="pane" data-pane="broadcast">
   <div class="card">
    <h2 data-k="bc">Broadcast</h2>
    <div class="desc" data-k="bc_d">Send a message to everyone who has used the bot. HTML allowed. Sends in the background.</div>
    <textarea id="bc" style="min-height:120px"></textarea>
    <button class="btn" onclick="broadcast()" data-k="bc_send">Send to all users</button>
   </div>
  </div>

  <!-- GUIDE -->
  <div class="pane" data-pane="guide"><div id="guidebox"></div></div>
 </main>
</div>
<div class="toast" id="toast"></div>
<script>
var I={en:{manage:'Manage',help:'Help',guide:'Guide',stats:'Stats',faq:'FAQ',sections:'Sections',users:'Users',settings:'Settings',broadcast:'Broadcast',theme:'Theme',
 ptitle_stats:'Stats',psub_stats:'How the bot is doing',ptitle_faq:'FAQ',psub_faq:'Questions users can browse',
 ptitle_sections:'Menu sections',psub_sections:'Custom buttons on the bot menu',ptitle_settings:'Settings',psub_settings:'Welcome text and contact',
 ptitle_broadcast:'Broadcast',psub_broadcast:'Message every user',ptitle_guide:'Guide',psub_guide:'How each part works',
 ptitle_users:'Users',psub_users:'Block or unblock people',brandsub:'Admin panel',
 st_users:'Users',st_active:'Active (7d)',st_installs:'Panels built',st_builders:'Builders',st_banned:'Blocked',st_qa:'Questions',st_ai:'AI answered',
 faq_ai:'Draft from real questions',faq_ai_d:"The AI reads recent support questions and your team's answers, then drafts new FAQ entries. Drafts appear below as hidden; review, edit and Show the good ones.",faq_ai_btn:'✨ Suggest FAQ entries',faq_ai_done:'Drafts added:',faq_ai_nokey:'AI is not available on this Worker',
 ai:'AI assistant',ai_d:"Answers support messages automatically when it is confident, using your FAQ and your team's past answers. Everything else still goes to your admin group, and every AI answer is copied there for review.",ai_enable:'Auto-answer support questions',ai_model_l:'Claude model (used when the API key is set)',ai_key_d:'Works for free out of the box on Cloudflare Workers AI (10,000 neurons/day included). For the best Persian quality, add the <code>ANTHROPIC_API_KEY</code> secret (<code>wrangler secret put ANTHROPIC_API_KEY</code>) and the bot switches to Claude automatically.',
 u_block_id:'Block by user ID',u_block_id_d:"Paste a Telegram user ID (you'll see it on messages in your contact group) to block them from the bot.",u_block:'Block',u_unblock:'Unblock',u_blocked:'blocked',u_none:'No users yet.',u_installs:'installs',
 faq_add:'Add a question',faq_add_d:'Shown as a tappable list in the bot. Answers support <b> <i> <a> <code>.',f_q:'Question',f_a:'Answer',order:'Order',add:'Add question',
 sec_add:'Add a menu section',sec_add_d:"Adds a button to the bot's main menu with your text and an optional link.",s_t:'Button title',s_b:'Body (HTML allowed)',s_bt:'Link button text (optional)',s_bu:'Link URL (optional)',add_sec:'Add section',
 welcome:'Welcome message',welcome_d:'Shown at the top of the main menu. Leave blank for the default. Set each language separately.',save:'Save',
 w_img:'Banner image URL (optional)',w_img_d:'Shown above the welcome text as a banner. Leave blank for a text-only menu. Max about 5 MB, any public image URL.',
 contact:'Contact us',c_enable:'Enable "Contact us"',c_group:'Admin group chat ID',c_group_d:'Create a Telegram group, add <b>@IRNovaProxy_Bot</b> as an admin, send <code>/id</code> in the group, and paste the ID here. Reply to a forwarded message to answer that user.',show_faq:'Show FAQ in menu',
 chan:'Required channel',chan_d:'Users must join this channel before they can use the bot.',chan_note:'⚠️ <b>The bot must be an admin of the channel</b> for this to work. Open the channel → Administrators → Add Admin → add <b>@IRNovaProxy_Bot</b> (no permissions needed). Until the bot is a channel admin, the check can\\'t run and everyone is let through.',chan_enable:'Require channel membership',chan_user:'Channel username',
 sup:'Support us',sup_d:"Shown when a user taps 💝 Support us in the bot. If both fields are empty, the bot tells users support isn't set up yet.",sup_text:'Message (HTML allowed, e.g. wallet addresses in &lt;code&gt;)',sup_links:'Link buttons, one per line: Label | https://url',
 bc:'Broadcast',bc_d:'Send a message to everyone who has used the bot. HTML allowed. Sends in the background.',bc_send:'Send to all users',
 edit:'Edit',hide:'Hide',show:'Show',del:'Delete',hidden:'hidden',none_faq:'No questions yet.',none_sec:'No sections yet.',
 saved:'Saved',added:'Added',deleted:'Deleted',sending:'Sending to',fill:'Please fill the fields',confirm_del:'Delete this?',confirm_bc:'Send to all users?'},
fa:{manage:'مدیریت',help:'راهنما',guide:'راهنما',stats:'آمار',faq:'سؤالات',sections:'بخش‌ها',users:'کاربران',settings:'تنظیمات',broadcast:'همگانی',theme:'پوسته',
 ptitle_stats:'آمار',psub_stats:'وضعیت ربات',ptitle_faq:'سؤالات متداول',psub_faq:'سؤال‌هایی که کاربران می‌بینند',
 ptitle_sections:'بخش‌های منو',psub_sections:'دکمه‌های سفارشی منوی ربات',ptitle_settings:'تنظیمات',psub_settings:'متن خوش‌آمد و تماس',
 ptitle_broadcast:'پیام همگانی',psub_broadcast:'ارسال به همهٔ کاربران',ptitle_guide:'راهنما',psub_guide:'هر بخش چطور کار می‌کند',
 ptitle_users:'کاربران',psub_users:'مسدود یا آزاد کردن افراد',brandsub:'پنل مدیریت',
 st_users:'کاربران',st_active:'فعال (۷ روز)',st_installs:'پنل ساخته‌شده',st_builders:'سازندگان',st_banned:'مسدود',st_qa:'سؤال‌ها',st_ai:'پاسخ هوش مصنوعی',
 faq_ai:'پیش‌نویس از سؤال‌های واقعی',faq_ai_d:'هوش مصنوعی سؤال‌های اخیر کاربران و پاسخ‌های تیمت را می‌خواند و سؤال‌های متداول جدید پیش‌نویس می‌کند. پیش‌نویس‌ها پایین به‌صورت پنهان ظاهر می‌شوند؛ بازبینی و ویرایش کن و خوب‌ها را نمایش بده.',faq_ai_btn:'✨ پیشنهاد سؤالات متداول',faq_ai_done:'پیش‌نویس اضافه شد:',faq_ai_nokey:'هوش مصنوعی روی این ورکر در دسترس نیست',
 ai:'دستیار هوش مصنوعی',ai_d:'وقتی مطمئن باشد، با استفاده از سؤالات متداول و پاسخ‌های قبلی تیمت، به پیام‌های پشتیبانی خودکار جواب می‌دهد. بقیه مثل قبل به گروه ادمین می‌رود و هر پاسخ هوش مصنوعی هم برای بازبینی همان‌جا کپی می‌شود.',ai_enable:'پاسخ خودکار به سؤال‌های پشتیبانی',ai_model_l:'مدل Claude (وقتی کلید API تنظیم شده باشد)',ai_key_d:'به‌صورت پیش‌فرض رایگان روی Cloudflare Workers AI کار می‌کند (روزی ۱۰٬۰۰۰ نورون رایگان). برای بهترین کیفیت فارسی، سکرت <code>ANTHROPIC_API_KEY</code> را اضافه کن (<code>wrangler secret put ANTHROPIC_API_KEY</code>) تا ربات خودکار به Claude سوییچ کند.',
 u_block_id:'مسدود کردن با آیدی',u_block_id_d:'آیدی عددی کاربر تلگرام را بچسبان (روی پیام‌های گروه تماس دیده می‌شود) تا از ربات مسدود شود.',u_block:'مسدود',u_unblock:'آزاد کردن',u_blocked:'مسدود',u_none:'هنوز کاربری نیست.',u_installs:'نصب',
 faq_add:'افزودن سؤال',faq_add_d:'به‌صورت فهرست قابل‌لمس در ربات نشان داده می‌شود. پاسخ‌ها از <b> <i> <a> <code> پشتیبانی می‌کنند.',f_q:'سؤال',f_a:'پاسخ',order:'ترتیب',add:'افزودن سؤال',
 sec_add:'افزودن بخش منو',sec_add_d:'یک دکمه به منوی اصلی ربات با متن شما و یک لینک اختیاری اضافه می‌کند.',s_t:'عنوان دکمه',s_b:'متن (HTML مجاز)',s_bt:'متن دکمهٔ لینک (اختیاری)',s_bu:'آدرس لینک (اختیاری)',add_sec:'افزودن بخش',
 welcome:'پیام خوش‌آمد',welcome_d:'بالای منوی اصلی نشان داده می‌شود. برای پیش‌فرض خالی بگذار. هر زبان را جدا تنظیم کن.',save:'ذخیره',
 w_img:'آدرس تصویر بنر (اختیاری)',w_img_d:'به‌عنوان بنر بالای متن خوش‌آمد نشان داده می‌شود. برای منوی فقط‌متنی خالی بگذار. حداکثر حدود ۵ مگابایت، هر آدرس تصویر عمومی.',
 contact:'تماس با ما',c_enable:'فعال‌سازی «تماس با ما»',c_group:'آیدی گروه ادمین',c_group_d:'یک گروه تلگرام بساز، <b>@IRNovaProxy_Bot</b> را ادمین کن، در گروه <code>/id</code> بفرست و آیدی را اینجا بچسبان. برای پاسخ به کاربر، روی پیام فوروارد‌شده ریپلای کن.',show_faq:'نمایش سؤالات در منو',
 chan:'کانال اجباری',chan_d:'کاربران باید قبل از استفاده از ربات عضو این کانال شوند.',chan_note:'⚠️ <b>ربات باید ادمین کانال باشد</b> تا این قابلیت کار کند. کانال → مدیران → افزودن مدیر → <b>@IRNovaProxy_Bot</b> را اضافه کن (نیازی به دسترسی نیست). تا وقتی ربات ادمین کانال نباشد، بررسی انجام نمی‌شود و همه عبور داده می‌شوند.',chan_enable:'اجباری بودن عضویت در کانال',chan_user:'یوزرنیم کانال',
 sup:'حمایت از ما',sup_d:'وقتی کاربر در ربات 💝 حمایت از ما را می‌زند نشان داده می‌شود. اگر هر دو فیلد خالی باشند، ربات به کاربران می‌گوید حمایت هنوز تنظیم نشده.',sup_text:'پیام (HTML مجاز، مثلاً آدرس کیف پول داخل <code>)',sup_links:'دکمه‌های لینک، هر خط یکی: عنوان | https://url',
 bc:'پیام همگانی',bc_d:'به همهٔ کسانی که از ربات استفاده کرده‌اند پیام بفرست. HTML مجاز است. در پس‌زمینه ارسال می‌شود.',bc_send:'ارسال به همه',
 edit:'ویرایش',hide:'پنهان',show:'نمایش',del:'حذف',hidden:'پنهان',none_faq:'هنوز سؤالی نیست.',none_sec:'هنوز بخشی نیست.',
 saved:'ذخیره شد',added:'اضافه شد',deleted:'حذف شد',sending:'در حال ارسال به',fill:'لطفاً فیلدها را پر کن',confirm_del:'حذف شود؟',confirm_bc:'به همهٔ کاربران ارسال شود؟'}};
var GUIDE={en:[
 {h:'👋 Overview',intro:'This panel runs your Nova Telegram bot. Users message the bot to build their own free Nova proxy panel, read your FAQ, and reach your team. Everything below is managed from here and updates the bot instantly.',s:[
  'The bot works in <b>English and Persian</b>. Each user sees their own language automatically, and can switch it with the 🌐 button in the bot.',
  'Use the language and theme switches at the bottom of this sidebar. Your choice is remembered on this device.']},
 {h:'📊 Stats',s:[
  '<b>Users</b>: everyone who has ever opened the bot.',
  '<b>Active (7d)</b>: users who used it in the last 7 days.',
  '<b>Panels built</b>: how many Nova panels were installed through the bot.',
  '<b>Builders</b>: how many different users built at least one panel.']},
 {h:'❓ FAQ',s:[
  'Add a <b>Question</b> and its <b>Answer</b>, then tap <b>Add question</b>. It appears in the bot under the FAQ button.',
  'Answers accept simple HTML: <code>&lt;b&gt;bold&lt;/b&gt;</code>, <code>&lt;i&gt;italic&lt;/i&gt;</code>, <code>&lt;a href="…"&gt;link&lt;/a&gt;</code>, <code>&lt;code&gt;</code>.',
  '<b>Order</b> sets the position (lower shows first). <b>Hide</b> keeps an entry without showing it; <b>Delete</b> removes it.']},
 {h:'🧩 Sections',s:[
  'Sections are your own buttons on the bot menu, a user guide, a channel, rules, anything.',
  'Give a <b>Button title</b> (shown on the menu), a <b>Body</b> (the message when tapped, HTML allowed), and optionally a <b>link button</b> (text + URL).',
  'This is the place to add your own <b>how-to guides for users</b> in each language, create one section in English and one in Persian.']},
 {h:'⚙️ Settings, Welcome',s:[
  'The <b>Welcome message</b> shows at the top of the bot menu. Set the <b>English</b> and <b>فارسی</b> boxes separately; leave a box blank to use the built-in default.']},
 {h:'✉️ Settings, Contact setup',intro:'Let users message your team from the bot. One-time setup:',s:[
  'In <b>@BotFather</b> send <code>/setprivacy</code>, choose your bot, and tap <b>Disable</b> (so the bot can read admin replies in the group).',
  'Create a Telegram <b>group</b> for your admins and add <b>@IRNovaProxy_Bot</b> to it.',
  'In that group send <code>/id</code>, the bot replies with the group ID.',
  'Paste that ID into <b>Admin group chat ID</b> here and tap <b>Save</b>.',
  'Now when a user taps <b>Contact us</b> and writes, it appears in your group. <b>Reply</b> to that message in the group and the bot relays your answer back to the user privately.',
  'Each forwarded message shows a compact card: <b>name, @username and numeric ID</b>. Once your reply is delivered, the Reply button turns green and reads <b>Replied</b>, so you can see which messages are handled.',
  'Need the full picture on someone (bio, Premium, account-age estimate, history with the bot)? Send <code>/whois &lt;id&gt;</code> in the group, or reply <code>/whois</code> to a forwarded message.']},
 {h:'📣 Channel lock, Support us, Update panel',s:[
  '<b>Required channel</b> (Settings): users must join your channel before the bot responds. Add the bot as an <b>admin</b> of the channel, or the check is skipped and everyone is let through.',
  '<b>Support us</b> (Settings): fill in a message (wallet addresses, HTML allowed) and/or link buttons (one per line, <code>Label | https://url</code>). The bot menu shows a green 💝 button; while both fields are empty it tells users support is not set up yet.',
  '<b>Update my panel</b>: users can update an existing Nova panel to the latest version from the bot menu. They send a token like during install, pick their Worker from a list, and confirm. Code is replaced, settings and users are kept.']},
 {h:'📢 Broadcast',s:[
  'Type a message and tap <b>Send to all users</b>. It goes to everyone who has used the bot, in the background.',
  'HTML is allowed. People who blocked the bot, or who you blocked, are skipped automatically.',
  'Tip: keep it short and useful, a new feature, an update, a new server. Overuse leads to blocks.']},
 {h:'🚫 Users, blocking',s:[
  'Open <b>Users</b> to see everyone, search by name / username / ID, and <b>Block</b> or <b>Unblock</b> each one.',
  'To block someone you only know by ID, paste it into <b>Block by user ID</b> (the ID shows on every message in your contact group).',
  'You can also tap <b>🚫 Block user</b> right on a message in the contact group.',
  'A blocked user gets a short "no access" notice and the bot ignores everything else from them, until you unblock.']},
 {h:'🚀 How users install their panel',intro:'What a user experiences when they tap Install, good to know when you help someone:',s:[
  'They need a free <b>Cloudflare account</b> (the bot links to sign-up).',
  'They tap <b>Get my token</b>; a pre-filled Cloudflare page opens. They scroll down, <b>Continue to summary</b>, <b>Create Token</b>, and <b>Copy</b> it.',
  'They paste the token into the chat. The bot <b>deletes it instantly</b> and never stores it, then builds the panel on their own account (~1 min).',
  'The bot returns their panel address and a button to set their admin password.']},
],
fa:[
 {h:'👋 معرفی',intro:'این پنل، ربات تلگرام نوای شما را اداره می‌کند. کاربران به ربات پیام می‌دهند تا پنل پراکسی نوای رایگان خودشان را بسازند، سؤالات متداول را بخوانند و به تیم شما برسند. همه‌چیزِ زیر از همین‌جا مدیریت می‌شود و ربات فوراً به‌روز می‌شود.',s:[
  'ربات به دو زبان <b>انگلیسی و فارسی</b> کار می‌کند. هر کاربر به‌طور خودکار زبان خودش را می‌بیند و با دکمهٔ 🌐 در ربات می‌تواند عوضش کند.',
  'از کلیدهای زبان و پوستهٔ پایین همین نوار کناری استفاده کن. انتخاب تو روی این دستگاه ذخیره می‌شود.']},
 {h:'📊 آمار',s:[
  '<b>کاربران</b>: همهٔ کسانی که تا حالا ربات را باز کرده‌اند.',
  '<b>فعال (۷ روز)</b>: کاربرانی که در ۷ روز گذشته استفاده کرده‌اند.',
  '<b>پنل ساخته‌شده</b>: چند پنل نوا از طریق ربات نصب شده است.',
  '<b>سازندگان</b>: چند کاربر متفاوت دست‌کم یک پنل ساخته‌اند.']},
 {h:'❓ سؤالات متداول',s:[
  'یک <b>سؤال</b> و <b>پاسخ</b> آن را وارد کن و <b>افزودن سؤال</b> را بزن. زیر دکمهٔ سؤالات در ربات ظاهر می‌شود.',
  'پاسخ‌ها از HTML ساده پشتیبانی می‌کنند: <code>&lt;b&gt;پررنگ&lt;/b&gt;</code>، <code>&lt;i&gt;مورب&lt;/i&gt;</code>، <code>&lt;a href="…"&gt;لینک&lt;/a&gt;</code>، <code>&lt;code&gt;</code>.',
  '<b>ترتیب</b> جای نمایش را تعیین می‌کند (کوچک‌تر اول). <b>پنهان</b> سؤال را نگه می‌دارد ولی نشان نمی‌دهد؛ <b>حذف</b> پاکش می‌کند.']},
 {h:'🧩 بخش‌ها',s:[
  'بخش‌ها دکمه‌های اختصاصی تو در منوی ربات هستند، راهنمای کاربر، کانال، قوانین، هر چیزی.',
  'یک <b>عنوان دکمه</b> (روی منو)، یک <b>متن</b> (پیامی که با زدنش نشان داده می‌شود، HTML مجاز) و به‌دلخواه یک <b>دکمهٔ لینک</b> (متن + آدرس) بده.',
  'اینجا بهترین جا برای افزودن <b>راهنمای کاربران</b> به هر زبان است، یک بخش انگلیسی و یک بخش فارسی بساز.']},
 {h:'⚙️ تنظیمات، خوش‌آمد',s:[
  '<b>پیام خوش‌آمد</b> بالای منوی ربات نشان داده می‌شود. کادر <b>English</b> و <b>فارسی</b> را جدا تنظیم کن؛ کادر خالی یعنی استفاده از پیش‌فرض.']},
 {h:'✉️ تنظیمات، راه‌اندازی تماس',intro:'بگذار کاربران از ربات به تیم تو پیام بدهند. تنظیم یک‌باره:',s:[
  'در <b>@BotFather</b> دستور <code>/setprivacy</code> را بفرست، ربات را انتخاب کن و <b>Disable</b> را بزن (تا ربات بتواند پاسخ ادمین‌ها را در گروه بخواند).',
  'یک <b>گروه</b> تلگرام برای ادمین‌ها بساز و <b>@IRNovaProxy_Bot</b> را به آن اضافه کن.',
  'در آن گروه <code>/id</code> بفرست، ربات آیدی گروه را جواب می‌دهد.',
  'آن آیدی را در <b>آیدی گروه ادمین</b> همین‌جا بچسبان و <b>ذخیره</b> را بزن.',
  'حالا وقتی کاربری <b>تماس با ما</b> را می‌زند و می‌نویسد، در گروه شما ظاهر می‌شود. در گروه به آن پیام <b>ریپلای</b> کن تا ربات جوابت را خصوصی به کاربر برساند.',
  'هر پیام فوروارد‌شده یک کارت خلاصه دارد: <b>نام، یوزرنیم و آیدی عددی</b>. وقتی پاسخت تحویل شد، دکمهٔ پاسخ سبز می‌شود و <b>پاسخ داده شد</b> نشان می‌دهد تا بدانی کدام پیام‌ها رسیدگی شده‌اند.',
  'اطلاعات کامل کسی را می‌خواهی (بیو، پرمیوم، تخمین سن حساب، سابقه با ربات)؟ در گروه <code>/whois &lt;id&gt;</code> بفرست یا روی پیام فوروارد‌شده <code>/whois</code> ریپلای کن.']},
 {h:'📣 قفل کانال، حمایت از ما، به‌روزرسانی پنل',s:[
  '<b>کانال اجباری</b> (تنظیمات): کاربران باید قبل از پاسخ‌گویی ربات عضو کانالت شوند. ربات را <b>ادمین</b> کانال کن، وگرنه بررسی رد می‌شود و همه عبور می‌کنند.',
  '<b>حمایت از ما</b> (تنظیمات): یک پیام (آدرس کیف پول، HTML مجاز) و/یا دکمه‌های لینک (هر خط یکی، <code>عنوان | https://url</code>) وارد کن. منوی ربات یک دکمهٔ سبز 💝 نشان می‌دهد؛ تا وقتی هر دو فیلد خالی باشند به کاربران می‌گوید حمایت هنوز تنظیم نشده.',
  '<b>به‌روزرسانی پنل من</b>: کاربران می‌توانند پنل نوای موجودشان را از منوی ربات به آخرین نسخه به‌روز کنند. مثل نصب یک توکن می‌فرستند، ورکر خودشان را از فهرست انتخاب می‌کنند و تأیید می‌کنند. کد جایگزین می‌شود، تنظیمات و کاربران حفظ می‌شوند.']},
 {h:'📢 پیام همگانی',s:[
  'یک پیام بنویس و <b>ارسال به همه</b> را بزن. در پس‌زمینه به همهٔ کاربران ربات می‌رود.',
  'HTML مجاز است. کسانی که ربات را بلاک کرده‌اند یا تو مسدودشان کرده‌ای به‌طور خودکار رد می‌شوند.',
  'نکته: کوتاه و مفید نگه‌دار، یک قابلیت تازه، یک به‌روزرسانی، یک سرور جدید. زیاده‌روی باعث بلاک می‌شود.']},
 {h:'🚫 کاربران و مسدودسازی',s:[
  '<b>کاربران</b> را باز کن تا همه را ببینی، با نام / یوزرنیم / آیدی جست‌وجو کنی و هر کدام را <b>مسدود</b> یا <b>آزاد</b> کنی.',
  'برای مسدود کردن کسی که فقط آیدی‌اش را داری، در <b>مسدود کردن با آیدی</b> بچسبانش (آیدی روی هر پیام در گروه تماس دیده می‌شود).',
  'همچنین می‌توانی روی هر پیام در گروه تماس دکمهٔ <b>🚫 مسدود کردن</b> را بزنی.',
  'کاربر مسدودشده یک پیام کوتاه «عدم دسترسی» می‌گیرد و ربات بقیهٔ پیام‌هایش را نادیده می‌گیرد، تا وقتی آزادش کنی.']},
 {h:'🚀 کاربران چطور پنل نصب می‌کنند',intro:'وقتی کاربری روی نصب می‌زند چه می‌بیند، برای کمک به دیگران خوب است بدانی:',s:[
  'به یک <b>حساب رایگان Cloudflare</b> نیاز دارد (ربات لینک ثبت‌نام را می‌دهد).',
  '<b>گرفتن توکن</b> را می‌زند؛ یک صفحهٔ از‌پیش‌پرشدهٔ Cloudflare باز می‌شود. پایین می‌رود، <b>Continue to summary</b>، <b>Create Token</b>، و آن را <b>Copy</b> می‌کند.',
  'توکن را در چت می‌چسباند. ربات <b>فوراً پاکش می‌کند</b> و هرگز ذخیره‌اش نمی‌کند، بعد پنل را روی حساب خودش می‌سازد (حدود ۱ دقیقه).',
  'ربات آدرس پنل و دکمه‌ای برای تنظیم رمز ادمین را برمی‌گرداند.']},
]};
function $(i){return document.getElementById(i)}
var lang=localStorage.getItem('nova-lang')||'en',theme=localStorage.getItem('nova-theme')||'dark',cur='stats';
var api=(m,r,b)=>fetch('/admin/api/'+r,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(x=>x.json());
var esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function T(k){return (I[lang]||I.en)[k]||(I.en[k]||k)}
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function toggleNav(){$('app').classList.toggle('open')}

function applyLang(){document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';
 document.querySelectorAll('[data-k]').forEach(function(el){var k=el.dataset.k;var v=T(k);if(v){if(/[<&]/.test(v))el.innerHTML=v;else el.textContent=v}});
 $('brandsub').textContent=T('brandsub');
 $('ptitle').textContent=T('ptitle_'+cur);$('psub').textContent=T('psub_'+cur);
 [].forEach.call(document.querySelectorAll('#lg button'),function(b){b.classList.toggle('on',b.dataset.l===lang)});
 rerender()}
function applyTheme(){document.documentElement.setAttribute('data-theme',theme);$('theme').firstChild.textContent=theme==='dark'?'☀ ':'☾ '}
function rerender(){if(cur==='stats')loadStats();if(cur==='faq')loadFaq();if(cur==='sections')loadSections();if(cur==='users')loadUsers();if(cur==='guide')renderGuide()}
function renderGuide(){var g=GUIDE[lang]||GUIDE.en;$('guidebox').innerHTML=g.map(function(sec){
 var intro=sec.intro?'<div class="desc">'+sec.intro+'</div>':'';
 var steps=sec.s.map(function(line,i){return '<div class="gstep"><span class="gn">'+(i+1)+'</span><span>'+line+'</span></div>'}).join('');
 return '<div class="card"><h2>'+sec.h+'</h2>'+intro+steps+'</div>';
}).join('')}

function nav(btn){cur=btn.dataset.p;document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
 document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.dataset.pane===cur));
 $('ptitle').textContent=T('ptitle_'+cur);$('psub').textContent=T('psub_'+cur);$('app').classList.remove('open');
 if(cur==='stats')loadStats();if(cur==='faq')loadFaq();if(cur==='sections')loadSections();if(cur==='users')loadUsers();if(cur==='settings')loadConfig();if(cur==='guide')renderGuide()}

$('lg').onclick=function(e){var b=e.target.closest('button');if(b){lang=b.dataset.l;localStorage.setItem('nova-lang',lang);applyLang()}};
$('theme').onclick=function(){theme=theme==='dark'?'light':'dark';localStorage.setItem('nova-theme',theme);applyTheme()};

async function loadStats(){var s=await api('GET','stats');$('stats').innerHTML=
 [['st_users',s.users],['st_active',s.active7d],['st_installs',s.installs],['st_builders',s.builders],['st_banned',s.banned||0],['st_qa',s.questions||0],['st_ai',s.aiAnswered||0]]
 .map(([k,n])=>'<div class="stat"><div class="n">'+n+'</div><div class="l">'+T(k)+'</div></div>').join('')}

async function loadUsers(){var q=encodeURIComponent(($('usearch').value||'').trim());var list=await api('GET','users'+(q?('?q='+q):''));
 window._usr=list;var el=$('userlist');el.innerHTML=list.length?'':'<p class="muted">'+T('u_none')+'</p>';
 list.forEach(function(u){var d=document.createElement('div');d.className='item';
 var name=esc(u.first_name||'')+(u.username?' <span class="muted">@'+esc(u.username)+'</span>':'');
 d.innerHTML='<div class="q">'+name+(u.banned?' <span class="pill off">'+T('u_blocked')+'</span>':'')+'</div>'+
 '<div class="meta">ID <code>'+u.id+'</code>, '+(u.installs||0)+' '+T('u_installs')+', '+esc((u.last_seen||'').slice(0,10))+'</div>'+
 '<div class="row" style="margin-top:11px"><button class="btn '+(u.banned?'ghost':'dg')+' sm" onclick="setBan('+u.id+','+(u.banned?0:1)+')">'+(u.banned?T('u_unblock'):T('u_block'))+'</button></div>';
 el.appendChild(d)})}
async function setBan(id,banned){await api('POST','users',{id,banned:!!banned});toast(T('saved'));loadUsers()}
async function banById(){var v=($('banid').value||'').trim().replace(/[^0-9]/g,'');if(!v)return toast(T('fill'));
 await api('POST','users',{id:+v,banned:true});$('banid').value='';toast(T('saved'));loadUsers()}

async function loadFaq(){var list=await api('GET','faq');window._faq=list;var el=$('faqlist');
 el.innerHTML=list.length?'':'<p class="muted">'+T('none_faq')+'</p>';
 list.forEach(function(f){var d=document.createElement('div');d.className='item';
 d.innerHTML='<div class="q">'+esc(f.question)+(f.enabled?'':' <span class="pill off">'+T('hidden')+'</span>')+'</div><div class="a">'+esc(f.answer)+'</div>'+
 '<div class="row" style="margin-top:11px"><button class="btn ghost sm" onclick="editFaq('+f.id+')">'+T('edit')+'</button>'+
 '<button class="btn ghost sm" onclick="toggleFaq('+f.id+','+(f.enabled?0:1)+')">'+(f.enabled?T('hide'):T('show'))+'</button>'+
 '<button class="btn dg sm" onclick="delFaq('+f.id+')">'+T('del')+'</button></div>';el.appendChild(d)})}
async function addFaq(){var q=fq.value.trim(),a=fa.value.trim();if(!q||!a)return toast(T('fill'));
 await api('POST','faq',{question:q,answer:a,position:+fp.value||0});fq.value=fa.value='';fp.value=0;toast(T('added'));loadFaq()}
function editFaq(id){var f=window._faq.find(x=>x.id===id);var q=prompt('Question:',f.question);if(q===null)return;var a=prompt('Answer:',f.answer);if(a===null)return;
 api('PUT','faq',{id,question:q,answer:a,position:f.position,enabled:f.enabled}).then(()=>{toast(T('saved'));loadFaq()})}
function toggleFaq(id,en){var f=window._faq.find(x=>x.id===id);api('PUT','faq',{id,question:f.question,answer:f.answer,position:f.position,enabled:en}).then(loadFaq)}
function delFaq(id){if(!confirm(T('confirm_del')))return;api('DELETE','faq',{id}).then(()=>{toast(T('deleted'));loadFaq()})}
async function suggestFaq(btn){btn.disabled=true;var old=btn.textContent;btn.textContent='⏳ …';
 var r=await api('POST','faq-suggest').catch(()=>null);btn.disabled=false;btn.textContent=old;
 if(r&&r.ok){toast(T('faq_ai_done')+' '+r.added);loadFaq()}
 else toast(r&&r.error==='no_api_key'?T('faq_ai_nokey'):(r&&r.error)||'Error')}

async function loadSections(){var list=await api('GET','sections');window._sec=list;var el=$('seclist');
 el.innerHTML=list.length?'':'<p class="muted">'+T('none_sec')+'</p>';
 list.forEach(function(s){var d=document.createElement('div');d.className='item';
 d.innerHTML='<div class="q">'+esc(s.title)+(s.enabled?'':' <span class="pill off">'+T('hidden')+'</span>')+'</div><div class="a">'+esc(s.body)+'</div>'+
 (s.button_url?'<div class="meta">🔗 '+esc(s.button_text)+' → '+esc(s.button_url)+'</div>':'')+
 '<div class="row" style="margin-top:11px"><button class="btn ghost sm" onclick="editSection('+s.id+')">'+T('edit')+'</button>'+
 '<button class="btn ghost sm" onclick="toggleSection('+s.id+','+(s.enabled?0:1)+')">'+(s.enabled?T('hide'):T('show'))+'</button>'+
 '<button class="btn dg sm" onclick="delSection('+s.id+')">'+T('del')+'</button></div>';el.appendChild(d)})}
async function addSection(){var t=st.value.trim(),b=sb.value.trim();if(!t||!b)return toast(T('fill'));
 await api('POST','sections',{title:t,body:b,button_text:sbt.value.trim(),button_url:sbu.value.trim(),position:+sp.value||0});
 st.value=sb.value=sbt.value=sbu.value='';sp.value=0;toast(T('added'));loadSections()}
function editSection(id){var s=window._sec.find(x=>x.id===id);var t=prompt('Title:',s.title);if(t===null)return;var b=prompt('Body:',s.body);if(b===null)return;
 var bt=prompt('Button text:',s.button_text||'');var bu=prompt('Button URL:',s.button_url||'');
 api('PUT','sections',{id,title:t,body:b,button_text:bt||'',button_url:bu||'',position:s.position,enabled:s.enabled}).then(()=>{toast(T('saved'));loadSections()})}
function toggleSection(id,en){var s=window._sec.find(x=>x.id===id);api('PUT','sections',{id,title:s.title,body:s.body,button_text:s.button_text,button_url:s.button_url,position:s.position,enabled:en}).then(loadSections)}
function delSection(id){if(!confirm(T('confirm_del')))return;api('DELETE','sections',{id}).then(()=>{toast(T('deleted'));loadSections()})}

async function loadConfig(){var c=await api('GET','config');welcome_en.value=c.welcome_en||c.welcome||'';welcome_fa.value=c.welcome_fa||'';
 welcome_image.value=c.welcome_image||'';
 contact_group_id.value=c.contact_group_id||'';contact_enabled.checked=c.contact_enabled!=='0';faq_enabled.checked=c.faq_enabled!=='0';
 join_required.checked=c.join_required!=='0';join_channel.value=c.join_channel||'';
 support_text.value=c.support_text||'';support_links.value=c.support_links||'';
 ai_enabled.checked=c.ai_enabled!=='0';ai_model.value=c.ai_model||'claude-opus-4-8'}
async function saveConfig(){await api('POST','config',{welcome_en:welcome_en.value,welcome_fa:welcome_fa.value,
 welcome_image:welcome_image.value.trim(),
 contact_group_id:contact_group_id.value.trim(),contact_enabled:contact_enabled.checked?'1':'0',faq_enabled:faq_enabled.checked?'1':'0',
 join_required:join_required.checked?'1':'0',join_channel:join_channel.value.trim().replace(/^@/,'').replace(/^https?:\\/\\/t\\.me\\//i,''),
 support_text:support_text.value,support_links:support_links.value,
 ai_enabled:ai_enabled.checked?'1':'0',ai_model:ai_model.value.trim()||'claude-opus-4-8'});toast(T('saved'))}

async function broadcast(){var t=bc.value.trim();if(!t)return toast(T('fill'));if(!confirm(T('confirm_bc')))return;
 var r=await api('POST','broadcast',{text:t});if(r.ok){toast(T('sending')+' '+r.recipients);bc.value=''}else toast('Error')}

applyTheme();applyLang();loadStats();
</script></body></html>`;
