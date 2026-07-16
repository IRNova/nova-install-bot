// Admin panel HTML for the Nova Telegram bot. The design system is taken
// straight from the production Nova Proxy panel (identical tokens, component
// shapes and shell) so the two panels read as siblings. Inter + Vazirmatn,
// light/dark themes, English + Persian with full RTL. Shipped inline so the
// whole bot stays a single Worker.

const LOGO = `<svg viewBox="0 0 1254 1254" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="ng" x1="128" y1="1122" x2="1206" y2="44" gradientUnits="userSpaceOnUse"><stop offset=".04" stop-color="#9d4efb"/><stop offset="1" stop-color="#02cdf3"/></linearGradient></defs><path d="M1185.57,149.23c0-43.84-27.55-82.6-66.19-100.7-40.83-19.13-87.98-16.85-126.82,6.19-33.3,19.76-56.22,55.99-56.25,95.68l-.38,653.25.09,39.98c.03,13.51-.33,26.37-3.82,39.13-8.12,29.65-30.52,53.04-56.69,62.39-32.53,11.62-65.87,5.5-91.07-15.75-20.65-17.42-33.28-42.64-33.32-70.11l-.35-245.85.07-231.05c.04-148.83-97.26-281.46-240.38-321.81-67.49-19.02-138.62-19.66-204.99,2.42l-13.66,4.55C159.84,114.72,68.42,239.99,68.41,381.43l-.06,712.76c0,68.93,56.48,123.39,124.03,124.15,65.31.73,125.56-52.18,125.64-120.57l.88-712.63c.07-54.62,49.94-96.23,103.56-88.53,43.56,6.25,78.96,43.23,79.08,88.34l1.24,493.92c.16,62.52,24.72,123.29,59.49,174.21,43.7,63.99,108.48,111.28,182.25,133.98,91.72,28.23,190.9,16.68,273.4-31.79,36.89-21.68,68.83-50.13,94.95-83.49l16.54-23.16c31.76-44.47,56.26-119.27,56.25-174.93l-.09-724.43Z" fill="url(#ng)"/></svg>`;

const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(LOGO);

// Theme toggle icons: CSS shows the sun in dark mode and the moon in light.
const SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

const STYLE = `
/* Design tokens, verbatim from the production Nova Proxy panel. */
:root{
 --bg:#f4f6fb;--panel:#ffffff;--card:#ffffff;--card2:#f7f9fc;--bd:#e6eaf1;--bd2:#dde2eb;
 --tx:#101622;--tx2:#3a465c;--mu:#5f6a7d;--ac:#0ea5c4;--ac2:#7c3aed;
 --grad:linear-gradient(120deg,#0891b2,#7c3aed);--ring:rgba(8,145,178,.25);
 --ok:#047857;--dg:#dc2626;--wn:#b45309;
 --shadow:0 1px 2px rgba(20,40,80,.04),0 10px 28px rgba(40,60,110,.10);
 --ac-soft:color-mix(in srgb,var(--ac) 12%,transparent);
 --ac-line:color-mix(in srgb,var(--ac) 38%,transparent);
 --btn-tx:#ffffff;--radius:12px;--r-sm:9px;--r-lg:16px;--sidebar:264px}
html[data-theme=dark]{
 --bg:#070809;--panel:#0c0e12;--card:#101319;--card2:#0b0d11;--bd:#1c2027;--bd2:#262b34;
 --tx:#e9edf4;--tx2:#aeb6c4;--mu:#6f7888;--ac:#22d3ee;--ac2:#a855f7;
 --grad:linear-gradient(120deg,#22d3ee,#7c5cff);--ring:rgba(34,211,238,.30);
 --ok:#34d399;--dg:#f87171;--wn:#f5b042;
 --shadow:0 1px 0 rgba(255,255,255,.02),0 12px 30px rgba(0,0,0,.45);
 --ac-soft:color-mix(in srgb,var(--ac) 14%,transparent);--btn-tx:#04121a}

/* Base */
*{box-sizing:border-box;margin:0;padding:0}
html,body{overflow-x:clip;-webkit-text-size-adjust:100%}
body{font-family:'Inter','Vazirmatn',system-ui,-apple-system,Segoe UI,Tahoma,sans-serif;
 background:var(--bg);color:var(--tx);min-height:100vh;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
html[dir=rtl] body{font-family:'Vazirmatn','Inter',system-ui,Tahoma,sans-serif}
a{color:var(--ac);text-decoration:none}
button{font-family:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--ac);outline-offset:2px;border-radius:6px}
::selection{background:var(--ac-soft)}
code{font-family:ui-monospace,'SF Mono',SFMono-Regular,Menlo,monospace;font-size:12px;background:var(--card2);border:1px solid var(--bd);border-radius:5px;padding:1px 6px;direction:ltr;unicode-bidi:embed;display:inline-block}
.skip-link{position:absolute;inset-inline-start:8px;top:-60px;z-index:1000;background:var(--ac);color:var(--btn-tx);padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;transition:top .15s ease}
.skip-link:focus{top:8px}

/* App shell */
.app{display:flex;min-height:100vh}
.sidebar{width:var(--sidebar);flex:0 0 var(--sidebar);background:var(--panel);border-inline-end:1px solid var(--bd);
 position:sticky;top:0;height:100vh;overflow-y:auto;overscroll-behavior:contain;
 display:flex;flex-direction:column;padding:18px 14px;gap:2px;z-index:60}
.brand{display:flex;align-items:center;gap:12px;padding:6px 8px 18px}
.brand .mark{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:var(--card2);border:1px solid var(--bd);border-radius:11px;padding:8px}
.brand .mark svg{width:100%;height:100%;display:block}
.brand .name{font-size:15.5px;font-weight:700;letter-spacing:-.2px}
.brand .env{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--mu);font-weight:600;margin-top:2px}
.brand .env .d{width:6px;height:6px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px color-mix(in srgb,var(--ok) 22%,transparent)}
.nav-label{font-size:10px;font-weight:700;letter-spacing:1.4px;color:var(--mu);text-transform:uppercase;padding:14px 12px 6px}
.nav{display:flex;flex-direction:column;gap:2px}
.nav-item{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:var(--r-sm);color:var(--tx2);
 border:none;background:transparent;width:100%;text-align:start;font-size:13.5px;font-weight:500;position:relative;transition:background .13s,color .13s}
.nav-item svg{width:18px;height:18px;flex:0 0 18px;opacity:.8}
.nav-item:hover{background:color-mix(in srgb,var(--tx) 4%,transparent);color:var(--tx)}
.nav-item.on{background:color-mix(in srgb,var(--tx) 6%,transparent);color:var(--tx);font-weight:600}
.nav-item.on::before{content:'';position:absolute;inset-inline-start:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--grad)}
html[dir=rtl] .nav-item.on::before{border-radius:3px 0 0 3px}
.nav-item.on svg{opacity:1;color:var(--ac)}
.side-foot{margin-top:auto;padding-top:14px;border-top:1px solid var(--bd)}
.logout{display:flex;align-items:center;justify-content:center;gap:8px;height:38px;border:1px solid var(--bd);background:var(--card2);border-radius:var(--r-sm);color:var(--tx2);font-size:12.5px;font-weight:500;transition:.13s}
.logout:hover{border-color:color-mix(in srgb,var(--dg) 45%,transparent);color:var(--dg)}
.logout svg{width:15px;height:15px}

/* Main column + top bar */
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.topbar{position:sticky;top:0;z-index:40;height:62px;display:flex;align-items:center;gap:12px;padding:0 22px;
 border-bottom:1px solid var(--bd);background:color-mix(in srgb,var(--bg) 84%,transparent);
 backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.menu-btn{display:none;width:38px;height:38px;flex:0 0 38px;border:1px solid var(--bd);background:var(--card);border-radius:var(--r-sm);color:var(--tx);align-items:center;justify-content:center}
.menu-btn svg{width:20px;height:20px}
.page-id{min-width:0}
.page-id .t{font-size:15.5px;font-weight:700;letter-spacing:-.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.page-id .s{font-size:11.5px;color:var(--mu);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.top-actions{margin-inline-start:auto;display:flex;align-items:center;gap:8px}
.lang{display:flex;align-items:center;border:1px solid var(--bd);background:var(--card);border-radius:var(--r-sm);padding:3px;height:36px}
.lang button{border:none;background:transparent;color:var(--mu);font-size:12px;font-weight:700;padding:0 11px;height:100%;border-radius:6px;transition:.12s}
.lang button.on{background:var(--ac);color:var(--btn-tx)}
.iconbtn{width:36px;height:36px;flex:0 0 36px;border:1px solid var(--bd);background:var(--card);border-radius:var(--r-sm);color:var(--tx2);display:flex;align-items:center;justify-content:center;transition:.12s}
.iconbtn:hover{color:var(--ac);border-color:var(--bd2)}
.iconbtn svg{width:17px;height:17px}
#theme .sun{display:none}
html[data-theme=dark] #theme .sun{display:block}
html[data-theme=dark] #theme .moon{display:none}

/* Content */
.content{flex:1;padding:24px 22px 48px;max-width:1080px;width:100%}
.pane{display:none}
.pane.on{display:block;animation:fade .22s ease}
.pane.on>*+*{margin-top:14px}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pane.on{animation:none}}

/* Cards */
.card{background:var(--card);border:1px solid var(--bd);border-radius:var(--radius);box-shadow:var(--shadow)}
.card-h{display:flex;align-items:center;gap:12px;padding:15px 20px;border-bottom:1px solid var(--bd)}
.card-h .hgroup{flex:1;min-width:0}
.card-h h3{font-size:13.5px;font-weight:700;letter-spacing:-.1px}
.card-h .sub{font-size:11.5px;color:var(--mu);font-weight:500;margin-top:3px;line-height:1.55}
.card-h .right{margin-inline-start:auto;display:flex;align-items:center;gap:8px;flex:0 0 auto}
.card-pad{padding:18px 20px}
.desc{color:var(--mu);font-size:12.5px;line-height:1.65;margin:0 0 14px}
.desc:last-child{margin-bottom:0}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 16px;
 border-radius:var(--r-sm);font-size:13px;font-weight:600;border:1px solid var(--ac);background:var(--ac);color:var(--btn-tx);
 transition:.13s;white-space:nowrap}
.btn svg{width:15px;height:15px}
.btn:hover{filter:brightness(1.07)}
.btn:active{transform:scale(.98)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.ghost{background:var(--card);color:var(--tx);border-color:var(--bd2)}
.btn.ghost:hover{filter:none;border-color:var(--ac);color:var(--ac)}
.btn.dg{background:color-mix(in srgb,var(--dg) 10%,transparent);color:var(--dg);border-color:color-mix(in srgb,var(--dg) 38%,transparent)}
.btn.dg:hover{filter:none;background:color-mix(in srgb,var(--dg) 16%,transparent)}
.btn.sm{height:32px;padding:0 12px;font-size:12px;gap:6px}
.btn.sm svg{width:13px;height:13px}

/* Forms */
label{display:block;font-size:12px;color:var(--tx2);font-weight:500;margin:14px 0 7px}
label:first-of-type{margin-top:0}
input:not([type=checkbox]),textarea{width:100%;background:var(--card2);border:1px solid var(--bd2);border-radius:var(--r-sm);
 padding:10px 12px;color:var(--tx);font:inherit;font-size:13.5px;outline:none;transition:border-color .12s,box-shadow .12s}
input:not([type=checkbox]):focus,textarea:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--ring)}
input::placeholder,textarea::placeholder{color:var(--mu)}
textarea{min-height:96px;resize:vertical;line-height:1.6}
.w-s{max-width:130px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.two{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
.form-foot{margin-top:18px;display:flex;gap:10px;align-items:center}
.search{width:240px;height:34px;padding:7px 11px;font-size:12.5px}
.switch{display:inline-flex;align-items:center;gap:10px;font-size:13px;color:var(--tx);font-weight:500;cursor:pointer;margin-top:14px;user-select:none}
.switch input{appearance:none;-webkit-appearance:none;width:40px;height:23px;flex:0 0 auto;border:none;margin:0;
 border-radius:999px;background:var(--bd2);position:relative;transition:background .16s;cursor:pointer}
.switch input::after{content:'';position:absolute;top:3px;inset-inline-start:3px;width:17px;height:17px;border-radius:50%;
 background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:inset-inline-start .16s}
.switch input:checked{background:var(--ac)}
.switch input:checked::after{inset-inline-start:20px}
.switch input:focus-visible{outline:2px solid var(--ac);outline-offset:2px}

/* Chips + status dots */
.chip{display:inline-flex;flex:0 0 auto;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:3px 10px;
 border-radius:999px;border:1px solid var(--bd2);background:var(--card2);color:var(--mu);white-space:nowrap}
.chip.ok{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 35%,transparent);background:color-mix(in srgb,var(--ok) 11%,transparent)}
.chip.warn{color:var(--wn);border-color:color-mix(in srgb,var(--wn) 35%,transparent);background:color-mix(in srgb,var(--wn) 11%,transparent)}
.chip.err{color:var(--dg);border-color:color-mix(in srgb,var(--dg) 35%,transparent);background:color-mix(in srgb,var(--dg) 11%,transparent)}
.chip.info{color:var(--ac);border-color:var(--ac-line);background:var(--ac-soft)}
.dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:var(--mu)}
.dot.info{background:var(--ac);box-shadow:0 0 0 3px var(--ac-soft)}
.dot.ok{background:var(--ok);box-shadow:0 0 0 3px color-mix(in srgb,var(--ok) 20%,transparent)}
.dot.warn{background:var(--wn);box-shadow:0 0 0 3px color-mix(in srgb,var(--wn) 20%,transparent)}
.dot.bad{background:var(--dg);box-shadow:0 0 0 3px color-mix(in srgb,var(--dg) 20%,transparent)}
.chip .dot{width:6px;height:6px;background:currentColor;box-shadow:none}

/* Overview */
.ovbar{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:32px}
.ovbar .muted{font-size:11.5px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.kpi{background:var(--card);border:1px solid var(--bd);border-radius:var(--radius);padding:15px 16px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:10px}
.kpi-top{display:flex;align-items:center;gap:11px}
.kpi-ic{width:36px;height:36px;flex:0 0 36px;border-radius:10px;background:var(--ac-soft);color:var(--ac);display:flex;align-items:center;justify-content:center}
.kpi-ic svg{width:18px;height:18px}
.kpi-top .lbl{font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;font-weight:700}
.kpi-val{font-size:22px;font-weight:700;letter-spacing:-.4px;line-height:1.1;font-variant-numeric:tabular-nums}
.kpi-sub{font-size:11.5px;color:var(--mu);line-height:1.5}
.kpi-sub b{color:var(--tx2);font-weight:600}
.statrow{display:grid;grid-template-columns:repeat(4,1fr);background:var(--card);border:1px solid var(--bd);border-radius:var(--radius);box-shadow:var(--shadow);padding:4px 0}
.mini{display:flex;align-items:center;gap:11px;padding:13px 18px;border-inline-start:1px solid var(--bd);min-width:0}
.mini:first-child{border-inline-start:none}
.mini .v{font-size:16px;font-weight:700;letter-spacing:-.2px;font-variant-numeric:tabular-nums;line-height:1.2}
.mini .k{font-size:11px;color:var(--mu);font-weight:600;margin-top:2px}
.legend{display:flex;align-items:center;gap:16px;font-size:11.5px;color:var(--tx2);font-weight:600;flex-wrap:wrap}
.legend .swatch{display:inline-block;width:9px;height:9px;border-radius:3px;margin-inline-end:6px;vertical-align:-1px}
.swatch.s1{background:var(--ac)}
.swatch.s2{background:var(--ac2)}

/* Activity chart */
.chart{display:flex;align-items:stretch}
.day{flex:1;min-width:0;position:relative}
.day .bars{height:150px;display:flex;align-items:flex-end;justify-content:center;gap:3px;padding:0 3px;border-bottom:1px solid var(--bd2);border-radius:4px 4px 0 0;transition:background .12s}
.day:hover .bars,.day:focus .bars{background:color-mix(in srgb,var(--tx) 5%,transparent)}
.day:focus{outline:none}
.day:focus-visible .bars{outline:2px solid var(--ac);outline-offset:2px}
.bars i{flex:1;max-width:12px;min-width:3px;border-radius:3px 3px 0 0;background:var(--ac)}
.bars i.q{background:var(--ac2)}
.day .dl{display:block;font-size:10px;color:var(--mu);text-align:center;padding-top:7px;font-variant-numeric:tabular-nums}
.tip{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:8px;background:var(--card);border:1px solid var(--bd2);border-radius:10px;padding:9px 12px;font-size:11.5px;line-height:1.8;white-space:nowrap;box-shadow:var(--shadow);opacity:0;pointer-events:none;transition:opacity .12s;z-index:5}
.tip b{font-weight:700}
.day:hover .tip,.day:focus .tip{opacity:1}
.day:first-child .tip{left:auto;right:auto;transform:none;inset-inline-start:0}
.day:last-child .tip{left:auto;right:auto;transform:none;inset-inline-end:0}

/* Support questions feed */
.qrow{display:flex;align-items:flex-start;gap:14px;padding:14px 20px;border-top:1px solid var(--bd)}
.qrow:first-child{border-top:none}
.qrow .chip{margin-top:1px}
.qrow .body{min-width:0;flex:1}
.qrow .btncol{display:flex;flex-direction:column;gap:6px;flex:0 0 auto;align-items:stretch}
.draftbox{background:var(--card2);border:1px solid var(--bd);border-radius:10px;padding:9px 11px;margin-top:7px;font-size:12.6px;line-height:1.6;color:var(--tx2);overflow-wrap:anywhere}
.draftbox .dlabel{display:block;font-size:10.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--mu);margin-bottom:4px}
.draftbox.unsure{border-color:color-mix(in srgb,var(--wn) 45%,transparent);background:color-mix(in srgb,var(--wn) 7%,var(--card2))}
.draftbox.unsure .dlabel .warn{color:var(--wn);letter-spacing:.3px;text-transform:none}
.radio{display:flex;gap:9px;align-items:flex-start;margin:8px 0 0;font-size:13px;color:var(--tx2);cursor:pointer;font-weight:500}
.radio input{width:auto;margin-top:3px;accent-color:var(--ac)}
.qrow .qt{font-weight:500;font-size:13px;line-height:1.6;overflow-wrap:anywhere;color:var(--tx)}
.qrow .meta{display:flex;gap:12px;color:var(--mu);font-size:11px;margin-top:4px;font-weight:500}
.qrow .btn{flex:0 0 auto}

/* FAQ / section list items */
.item{border:1px solid var(--bd);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:15px 18px}
.item+.item{margin-top:11px}
.item .item-h{display:flex;align-items:flex-start;gap:10px}
.item .q{font-weight:600;font-size:13.5px;flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.5}
.item .a{color:var(--tx2);font-size:12.5px;white-space:pre-wrap;margin-top:7px;line-height:1.65;overflow-wrap:anywhere}
.item .meta{color:var(--mu);font-size:11.5px;margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0}
.item .meta code{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item .acts{display:flex;gap:7px;margin-top:12px;padding-top:12px;border-top:1px solid var(--bd);flex-wrap:wrap}

/* User rows */
.urow{display:flex;align-items:center;gap:13px;padding:13px 20px;border-top:1px solid var(--bd);transition:background .12s}
.urow:first-child{border-top:none}
.urow:hover{background:color-mix(in srgb,var(--tx) 3%,transparent)}
.uav{width:36px;height:36px;flex:0 0 36px;border-radius:10px;background:var(--ac-soft);color:var(--ac);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
.urow.off .uav{opacity:.55}
.urow.off .nm{color:var(--tx2)}
.urow .info{min-width:0;flex:1}
.urow .nm{font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap;overflow-wrap:anywhere}
.urow .nm .un{color:var(--mu);font-weight:500;font-size:12px}
.urow .meta{display:flex;gap:12px;color:var(--mu);font-size:11px;margin-top:3px;flex-wrap:wrap;font-weight:500;align-items:center}
.urow .meta code{font-size:11px;padding:0 5px}
.urow .btn{flex:0 0 auto}

/* Notes, empty states, guide */
.muted{color:var(--mu);font-size:12.5px}
.note{background:color-mix(in srgb,var(--wn) 8%,transparent);border:1px solid color-mix(in srgb,var(--wn) 35%,transparent);
 color:var(--tx2);border-radius:10px;padding:12px 14px;font-size:12.5px;line-height:1.7;margin:0 0 14px}
.note b{color:var(--tx)}
.empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px;text-align:center}
.empty .ic{width:42px;height:42px;border-radius:12px;background:var(--card2);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;color:var(--mu)}
.empty .ic svg{width:20px;height:20px}
.empty p{font-size:12.5px;color:var(--mu);max-width:320px;line-height:1.65}
.gstep{display:flex;gap:13px;padding:10px 0;font-size:13px;color:var(--tx2);line-height:1.75}
.gstep+.gstep{border-top:1px solid var(--bd)}
.gstep .gn{flex:0 0 26px;height:26px;border-radius:8px;background:var(--ac-soft);color:var(--ac);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin-top:2px}
.gstep b{color:var(--tx);font-weight:600}
#guidebox .card+.card{margin-top:14px}
.hidden{display:none}

/* Toast */
.toast{position:fixed;inset-block-end:22px;inset-inline-end:22px;z-index:100;background:var(--card);color:var(--tx);
 border:1px solid var(--bd2);padding:12px 18px;border-radius:10px;box-shadow:var(--shadow);
 opacity:0;transform:translateY(8px);transition:.2s;font-size:13px;font-weight:600;pointer-events:none;max-width:calc(100vw - 44px)}
.toast.show{opacity:1;transform:none}

/* Mobile drawer + responsive */
.scrim{position:fixed;inset:0;background:rgba(2,6,12,.55);z-index:55;opacity:0;pointer-events:none;transition:.2s}
.app.open .scrim{opacity:1;pointer-events:auto}
@media (max-width:1024px){
 .sidebar{position:fixed;inset-block:0;inset-inline-start:0;width:272px;transform:translateX(-105%);transition:transform .22s ease;box-shadow:var(--shadow);padding-bottom:calc(18px + env(safe-area-inset-bottom))}
 html[dir=rtl] .sidebar{transform:translateX(105%)}
 .app.open .sidebar{transform:none}
 .menu-btn{display:flex}
}
@media (max-width:920px){.kpi-grid{grid-template-columns:1fr 1fr}}
@media (max-width:680px){
 .content{padding:16px 14px 40px}
 .topbar{padding:0 14px;gap:10px}
 .page-id .s{display:none}
 .two{grid-template-columns:1fr}
 .statrow{grid-template-columns:1fr 1fr;padding:2px 0}
 .mini{padding:12px 16px}
 .mini:nth-child(2n+1){border-inline-start:none}
 .day:nth-child(2n) .dl{visibility:hidden}
 .qrow,.urow{padding:13px 16px}
 .card-h{padding:13px 16px;flex-wrap:wrap}
 .card-pad{padding:16px}
 .card-h .right{margin-inline-start:0;width:100%}
 .search{width:100%}
}
@media (max-width:560px){
 input:not([type=checkbox]),textarea{font-size:16px}
 .btn{height:44px}
 .btn.sm{height:38px}
 .iconbtn,.menu-btn{width:44px;height:44px;flex:0 0 44px}
 .lang{height:40px}
 .lang button{min-width:44px}
 .qrow{flex-wrap:wrap}
 .qrow .body{order:3;flex:1 1 100%}
 .qrow .btn{margin-inline-start:auto}
}

/* Login */
.login-body{display:flex;align-items:center;justify-content:center;padding:20px;
 background:radial-gradient(820px 420px at 50% -6%,color-mix(in srgb,var(--ac) 15%,transparent),transparent 60%),
 radial-gradient(720px 420px at 88% 8%,color-mix(in srgb,var(--ac2) 13%,transparent),transparent 55%),var(--bg)}
.login-box{width:100%;max-width:392px}
.login-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px}
.login-bar .brand{padding:0}
.login-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r-lg);padding:26px 24px;box-shadow:var(--shadow)}
.kicker{font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:16px}
.login-card label{margin:0 0 7px}
.pwwrap{position:relative}
.pwwrap input{padding-inline-end:46px}
.peek{position:absolute;top:0;bottom:0;inset-inline-end:6px;margin:auto;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;color:var(--mu);padding:0;border-radius:8px;transition:.12s}
.peek:hover{color:var(--ac)}
.peek svg{width:18px;height:18px;display:block}
.peek .eoff{display:none}
.peek.on .eon{display:none}
.peek.on .eoff{display:block}
.login-err{color:var(--dg);font-size:12.5px;font-weight:600;margin:0 0 12px}
.btn.go{width:100%;height:44px;margin-top:16px;font-size:14px}
.login-foot{text-align:center;color:var(--mu);font-size:11.5px;margin-top:18px}
`;

const HEAD = (title) => `<!doctype html><html lang="en" dir="ltr" data-theme="dark"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<link rel="icon" type="image/svg+xml" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${STYLE}</style></head>`;

const THEME_BOOT = `<script>
try{var th=localStorage.getItem('nova-theme')||'dark';document.documentElement.setAttribute('data-theme',th);
var lg=localStorage.getItem('nova-lang')||'en';document.documentElement.lang=lg;document.documentElement.dir=lg==='fa'?'rtl':'ltr';}catch(e){}
</script>`;

export function LOGIN_HTML(failed) {
  return HEAD("Nova Bot Admin") + `<body class="login-body">${THEME_BOOT}
<div class="login-box">
 <div class="login-bar">
  <div class="brand"><span class="mark">${LOGO}</span><div><div class="name" id="brand">Nova Bot</div><div class="env"><span class="d"></span><span id="brandsub">Admin panel</span></div></div></div>
  <div class="top-actions">
   <div class="lang" id="lg"><button type="button" data-l="en" class="on">EN</button><button type="button" data-l="fa">فا</button></div>
   <button type="button" class="iconbtn" id="theme" title="Theme">${SUN}${MOON}</button>
  </div>
 </div>
 <div class="login-card">
  <div class="kicker" id="t1">Sign in to the admin panel</div>
  ${failed ? '<p class="login-err" id="bad" role="alert">Wrong password.</p>' : ''}
  <form method="POST" action="/admin/login">
   <label id="lpw" for="pw">Password</label>
   <div class="pwwrap">
    <input type="password" name="password" id="pw" placeholder="password" autofocus autocomplete="current-password">
    <button type="button" class="peek" id="peek" aria-label="Show password"><svg class="eon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eoff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button>
   </div>
   <button class="btn go" type="submit" id="go">Sign in</button>
  </form>
 </div>
 <p class="login-foot" id="ft">Nova Proxy, open-source networking tools</p>
</div>
<script>
var T={en:{t1:'Sign in to the admin panel',lpw:'Password',pw:'password',go:'Sign in',bad:'Wrong password.',bs:'Admin panel',ft:'Nova Proxy, open-source networking tools',showpw:'Show password',hidepw:'Hide password',theme:'Theme'},
fa:{t1:'ورود به پنل مدیریت',lpw:'رمز عبور',pw:'رمز عبور',go:'ورود',bad:'رمز اشتباه است.',bs:'پنل مدیریت',ft:'نوا پراکسی، ابزار شبکه متن‌باز',showpw:'نمایش رمز',hidepw:'پنهان کردن رمز',theme:'پوسته'}};
function $(i){return document.getElementById(i)}
var lang=localStorage.getItem('nova-lang')||'en',theme=localStorage.getItem('nova-theme')||'dark';
function ap(){var t=T[lang];document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';
$('t1').textContent=t.t1;$('lpw').textContent=t.lpw;$('pw').placeholder=t.pw;$('go').textContent=t.go;$('brandsub').textContent=t.bs;$('ft').textContent=t.ft;
$('theme').title=t.theme;
$('peek').setAttribute('aria-label',$('pw').type==='password'?t.showpw:t.hidepw);
if($('bad'))$('bad').textContent=t.bad;
[].forEach.call(document.querySelectorAll('#lg button'),function(b){b.classList.toggle('on',b.dataset.l===lang)})}
function at(){document.documentElement.setAttribute('data-theme',theme)}
$('lg').onclick=function(e){var b=e.target.closest('button');if(b){lang=b.dataset.l;localStorage.setItem('nova-lang',lang);ap()}};
$('theme').onclick=function(){theme=theme==='dark'?'light':'dark';localStorage.setItem('nova-theme',theme);at()};
$('peek').onclick=function(){var i=$('pw');var show=i.type==='password';i.type=show?'text':'password';this.classList.toggle('on',show);this.setAttribute('aria-label',show?T[lang].hidepw:T[lang].showpw);i.focus()};
at();ap();
</script></body></html>`;
}

export const DASHBOARD_HTML = HEAD("Nova Bot Admin") + `<body>${THEME_BOOT}
<a class="skip-link" href="#content" data-k="skip">Skip to content</a>
<div class="app" id="app">
 <div class="scrim" onclick="toggleNav()"></div>
 <aside class="sidebar">
  <div class="brand"><span class="mark">${LOGO}</span><div><div class="name">Nova Bot</div><div class="env"><span class="d"></span><span id="brandsub">Admin panel</span></div></div></div>
  <div class="nav-label" data-k="manage">Manage</div>
  <nav class="nav">
   <button class="nav-item on" data-p="stats" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/></svg><span data-k="stats">Overview</span></button>
   <button class="nav-item" data-p="faq" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12" y2="17"/></svg><span data-k="faq">FAQ</span></button>
   <button class="nav-item" data-p="sections" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span data-k="sections">Sections</span></button>
   <button class="nav-item" data-p="users" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span data-k="users">Users</span></button>
   <button class="nav-item" data-p="settings" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span data-k="settings">Settings</span></button>
   <button class="nav-item" data-p="broadcast" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg><span data-k="broadcast">Broadcast</span></button>
  </nav>
  <div class="nav-label" data-k="help">Help</div>
  <nav class="nav">
   <button class="nav-item" data-p="guide" onclick="nav(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span data-k="guide">Guide</span></button>
  </nav>
  <div class="side-foot">
   <a class="logout" href="/admin/logout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span data-k="logout">Log out</span></a>
  </div>
 </aside>

 <div class="main">
  <header class="topbar">
   <button class="menu-btn" id="mn" onclick="toggleNav()" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
   <div class="page-id"><div class="t" id="ptitle">Overview</div><div class="s" id="psub">How the bot is doing</div></div>
   <div class="top-actions">
    <div class="lang" id="lg"><button data-l="en" class="on">EN</button><button data-l="fa">فا</button></div>
    <button class="iconbtn" id="theme" title="Theme">${SUN}${MOON}</button>
   </div>
  </header>

  <main class="content" id="content">

  <!-- OVERVIEW -->
  <div class="pane on" data-pane="stats">
   <div class="ovbar">
    <span class="muted" id="ovupd"></span>
    <button class="btn ghost sm" id="ovrefresh" onclick="loadStats()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg><span data-k="ov_refresh">Refresh</span></button>
   </div>
   <div class="kpi-grid" id="stats"></div>
   <div class="statrow" id="ministats"></div>
   <div class="card">
    <div class="card-h">
     <div class="hgroup"><h3 data-k="ov_chart">Activity, last 14 days</h3><div class="sub" data-k="ov_chart_d">New users and support questions per day.</div></div>
     <div class="right legend"><span><i class="swatch s1"></i><span data-k="ov_users_s">New users</span></span><span><i class="swatch s2"></i><span data-k="ov_q_s">Questions</span></span></div>
    </div>
    <div class="card-pad"><div class="chart" id="chart"></div></div>
   </div>
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="ov_recent">Recent support questions</h3><div class="sub" data-k="ov_recent_d">The latest messages users sent to support, newest first.</div></div></div>
    <div id="qfeed"></div>
   </div>
  </div>

  <!-- FAQ -->
  <div class="pane" data-pane="faq">
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="faq_add">Add a question</h3><div class="sub" data-k="faq_add_d">Shown as a tappable list in the bot. Answers support &lt;b&gt; &lt;i&gt; &lt;a&gt; &lt;code&gt;.</div></div></div>
    <div class="card-pad">
     <label data-k="f_q" for="fq">Question</label><input id="fq">
     <label data-k="f_a" for="fa">Answer</label><textarea id="fa"></textarea>
     <label data-k="order" for="fp">Order</label><input id="fp" type="number" value="0" class="w-s">
     <div class="form-foot"><button class="btn" onclick="addFaq()" data-k="add">Add question</button></div>
    </div>
   </div>
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="faq_ai">Draft from real questions</h3><div class="sub" data-k="faq_ai_d">The AI reads recent support questions and your team's answers, then drafts new FAQ entries. Drafts appear below as hidden; review, edit and Show the good ones.</div></div>
     <div class="right"><button class="btn ghost sm" onclick="suggestFaq(this)" data-k="faq_ai_btn">Suggest FAQ entries</button></div>
    </div>
   </div>
   <div id="faqlist"></div>
  </div>

  <!-- SECTIONS -->
  <div class="pane" data-pane="sections">
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="sec_add">Add a menu section</h3><div class="sub" data-k="sec_add_d">Adds a button to the bot's main menu with your text and an optional link.</div></div></div>
    <div class="card-pad">
     <label data-k="s_t" for="st">Button title</label><input id="st">
     <label data-k="s_b" for="sb">Body (HTML allowed)</label><textarea id="sb"></textarea>
     <div class="two">
      <div><label data-k="s_bt" for="sbt">Link button text (optional)</label><input id="sbt"></div>
      <div><label data-k="s_bu" for="sbu">Link URL (optional)</label><input id="sbu" dir="ltr"></div>
     </div>
     <label data-k="order" for="sp">Order</label><input id="sp" type="number" value="0" class="w-s">
     <div class="form-foot"><button class="btn" onclick="addSection()" data-k="add_sec">Add section</button></div>
    </div>
   </div>
   <div id="seclist"></div>
  </div>

  <!-- USERS -->
  <div class="pane" data-pane="users">
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="u_block_id">Block by user ID</h3><div class="sub" data-k="u_block_id_d">Paste a Telegram user ID (you'll see it on messages in your contact group) to block them from the bot.</div></div></div>
    <div class="card-pad">
     <div class="row">
      <input id="banid" inputmode="numeric" placeholder="123456789" dir="ltr" style="flex:1;min-width:160px;width:auto">
      <button class="btn dg" onclick="banById()" data-k="u_block">Block</button>
     </div>
    </div>
   </div>
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="users">Users</h3></div>
     <div class="right"><input id="usearch" class="search" data-kp="u_search" placeholder="Search name, username or ID" oninput="loadUsers()"></div>
    </div>
    <div id="userlist"></div>
   </div>
  </div>

  <!-- SETTINGS -->
  <div class="pane" data-pane="settings">
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="welcome">Welcome message</h3><div class="sub" data-k="welcome_d">Shown at the top of the main menu. Leave blank for the default. Set each language separately.</div></div></div>
    <div class="card-pad">
     <label for="welcome_en">English</label><textarea id="welcome_en"></textarea>
     <label for="welcome_fa">فارسی</label><textarea id="welcome_fa" dir="rtl"></textarea>
     <label data-k="w_img" for="welcome_image">Banner image URL (optional)</label>
     <input id="welcome_image" dir="ltr" placeholder="https://novaproxy.online/og.png">
     <div class="desc" style="margin:8px 0 0" data-k="w_img_d">Shown above the welcome text as a banner. Leave blank for a text-only menu. Max about 5&nbsp;MB, any public image URL.</div>
     <div class="form-foot"><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
    </div>
   </div>
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="chan">Required channel</h3><div class="sub" data-k="chan_d">Users must join this channel before they can use the bot.</div></div></div>
    <div class="card-pad">
     <div class="note" data-k="chan_note">⚠️ <b>The bot must be an admin of the channel</b> for this to work. Open the channel → Administrators → Add Admin → add <b>@IRNovaProxy_Bot</b> (no permissions needed). Until the bot is a channel admin, the check can't run and everyone is let through.</div>
     <label class="switch"><input type="checkbox" id="join_required"> <span data-k="chan_enable">Require channel membership</span></label>
     <label data-k="chan_user" for="join_channel">Channel username</label>
     <input id="join_channel" placeholder="irnova_proxy" dir="ltr">
     <div class="form-foot"><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
    </div>
   </div>
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="sup">Support us</h3><div class="sub" data-k="sup_d">Shown when a user taps 💝 Support us in the bot. If both fields are empty, the bot tells users support isn't set up yet.</div></div></div>
    <div class="card-pad">
     <label data-k="sup_text" for="support_text">Message (HTML allowed, e.g. wallet addresses in &lt;code&gt;)</label>
     <textarea id="support_text" dir="auto"></textarea>
     <label data-k="sup_links" for="support_links">Link buttons, one per line: Label | https://url</label>
     <textarea id="support_links" dir="ltr" placeholder="Donate | https://example.com/donate"></textarea>
     <div class="form-foot"><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
    </div>
   </div>
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="ai">AI assistant</h3><div class="sub" data-k="ai_d">Answers support messages automatically when it is confident, using your FAQ and your team's past answers. Everything else still goes to your admin group, and every AI answer is copied there for review.</div></div></div>
    <div class="card-pad">
     <label class="switch"><input type="checkbox" id="ai_enabled"> <span data-k="ai_enable">Auto-answer support questions</span></label>
     <label data-k="ai_mode_l">Mode</label>
     <label class="radio"><input type="radio" name="ai_mode" id="ai_mode_draft" value="draft"> <span data-k="ai_mode_draft">Draft for review: the AI drafts a reply, your team checks and sends it (recommended while the knowledge base is young)</span></label>
     <label class="radio"><input type="radio" name="ai_mode" id="ai_mode_auto" value="auto"> <span data-k="ai_mode_auto">Fully automatic: confident answers go straight to the user</span></label>
     <label data-k="ai_model_l" for="ai_model">Claude model (used when the API key is set)</label>
     <input id="ai_model" dir="ltr" placeholder="claude-opus-4-8">
     <div class="desc" style="margin:8px 0 0" data-k="ai_key_d">Works for free out of the box on Cloudflare Workers AI (10,000 neurons/day included). For the best Persian quality, add the <code>ANTHROPIC_API_KEY</code> secret (<code>wrangler secret put ANTHROPIC_API_KEY</code>) and the bot switches to Claude automatically.</div>
     <div class="form-foot"><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
    </div>
   </div>
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="contact">Contact us</h3></div></div>
    <div class="card-pad">
     <label class="switch" style="margin-top:0"><input type="checkbox" id="contact_enabled"> <span data-k="c_enable">Enable "Contact us"</span></label>
     <label data-k="c_group" for="contact_group_id">Admin group chat ID</label>
     <input id="contact_group_id" placeholder="-1001234567890" dir="ltr">
     <div class="desc" style="margin:8px 0 0" data-k="c_group_d">Create a Telegram group, add <b>@IRNovaProxy_Bot</b> as an admin, send <code>/id</code> in the group, and paste the ID here. Reply to a forwarded message to answer that user.</div>
     <label class="switch"><input type="checkbox" id="faq_enabled"> <span data-k="show_faq">Show FAQ in menu</span></label>
     <div class="form-foot"><button class="btn" onclick="saveConfig()" data-k="save">Save</button></div>
    </div>
   </div>
  </div>

  <!-- BROADCAST -->
  <div class="pane" data-pane="broadcast">
   <div class="card">
    <div class="card-h"><div class="hgroup"><h3 data-k="bc">Broadcast</h3><div class="sub" data-k="bc_d">Send a message to everyone who has used the bot. HTML allowed. Sends in the background.</div></div></div>
    <div class="card-pad">
     <textarea id="bc" style="min-height:130px"></textarea>
     <div class="form-foot"><button class="btn" onclick="broadcast()" data-k="bc_send">Send to all users</button></div>
    </div>
   </div>
  </div>

  <!-- GUIDE -->
  <div class="pane" data-pane="guide"><div id="guidebox"></div></div>

  </main>
 </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
var I={en:{manage:'Manage',help:'Help',guide:'Guide',stats:'Overview',faq:'FAQ',sections:'Sections',users:'Users',settings:'Settings',broadcast:'Broadcast',theme:'Theme',
 logout:'Log out',menu:'Menu',skip:'Skip to content',u_search:'Search name, username or ID',
 ptitle_stats:'Overview',psub_stats:'How Nova Bot is doing, at a glance',ptitle_faq:'FAQ',psub_faq:'Questions users can browse',
 ptitle_sections:'Menu sections',psub_sections:'Custom buttons on the bot menu',ptitle_settings:'Settings',psub_settings:'Welcome text and contact',
 ptitle_broadcast:'Broadcast',psub_broadcast:'Message every user',ptitle_guide:'Guide',psub_guide:'How each part works',
 ptitle_users:'Users',psub_users:'Block or unblock people',brandsub:'Admin panel',
 st_users:'Users',st_active:'Active (7d)',st_installs:'Panels built',st_builders:'Builders',st_banned:'Blocked',st_qa:'Questions',st_ai:'AI answered',
 st_human:'Team answered',st_wait:'Waiting',
 ov_refresh:'Refresh',ov_updated:'Updated {t}',
 ov_sub_users:'+{n} this week',ov_sub_active:'{n}% of all users',ov_sub_installs:'by {n} builders',ov_sub_ai:'{n}% answered by AI',
 ov_chart:'Activity, last 14 days',ov_chart_d:'New users and support questions per day. Hover a day for exact numbers.',
 ov_users_s:'New users',ov_q_s:'Questions',ov_empty:'No activity in the last 14 days yet.',
 ov_recent:'Recent support questions',ov_recent_d:'The latest messages users sent to support, newest first. Reply here and the bot delivers it to the user.',
 qa_draft:'AI draft',qa_send_draft:'Send draft',qa_edit_send:'Edit and send',qa_approve_c:'Send the AI draft to the user as written?',
 qa_unsure:'the model was unsure, read it closely',qa_approve_cu:'The model was unsure about this one and may have made details up. Send it to the user anyway, as written?',
 ai_mode_l:'Mode',ai_mode_draft:'Draft for review: the AI drafts a reply, your team checks and sends it (recommended while the knowledge base is young)',ai_mode_auto:'Fully automatic: confident answers go straight to the user',
 qa_reply:'Reply',qa_reply_p:'Write your answer. It is sent to the user in Telegram and saved as a human answer (the AI learns from it).',qa_sent:'Answer sent to the user',qa_fail:'Could not deliver, the user may have blocked the bot',
 ov_none:'No support questions yet. When users write to support, they show up here.',
 s_ai:'AI',s_human:'Team',s_wait:'Waiting',
 rt_just:'just now',rt_m:'{n}m ago',rt_h:'{n}h ago',rt_d:'{n}d ago',
 faq_ai:'Draft from real questions',faq_ai_d:"The AI reads recent support questions and your team's answers, then drafts new FAQ entries. Drafts appear below as hidden; review, edit and Show the good ones.",faq_ai_btn:'Suggest FAQ entries',faq_ai_done:'Drafts added:',faq_ai_nokey:'AI is not available on this Worker',
 ai:'AI assistant',ai_d:"Answers support messages automatically when it is confident, using your FAQ and your team's past answers. Everything else still goes to your admin group, and every AI answer is copied there for review.",ai_enable:'Auto-answer support questions',ai_model_l:'Claude model (used when the API key is set)',ai_key_d:'Works for free out of the box on Cloudflare Workers AI (10,000 neurons/day included). For the best Persian quality, add the <code>ANTHROPIC_API_KEY</code> secret (<code>wrangler secret put ANTHROPIC_API_KEY</code>) and the bot switches to Claude automatically.',
 u_block_id:'Block by user ID',u_block_id_d:"Paste a Telegram user ID (you'll see it on messages in your contact group) to block them from the bot.",u_block:'Block',u_unblock:'Unblock',u_blocked:'blocked',u_none:'No users yet.',u_installs:'installs',
 faq_add:'Add a question',faq_add_d:'Shown as a tappable list in the bot. Answers support &lt;b&gt; &lt;i&gt; &lt;a&gt; &lt;code&gt;.',f_q:'Question',f_a:'Answer',order:'Order',add:'Add question',
 sec_add:'Add a menu section',sec_add_d:"Adds a button to the bot's main menu with your text and an optional link.",s_t:'Button title',s_b:'Body (HTML allowed)',s_bt:'Link button text (optional)',s_bu:'Link URL (optional)',add_sec:'Add section',
 welcome:'Welcome message',welcome_d:'Shown at the top of the main menu. Leave blank for the default. Set each language separately.',save:'Save',
 w_img:'Banner image URL (optional)',w_img_d:'Shown above the welcome text as a banner. Leave blank for a text-only menu. Max about 5 MB, any public image URL.',
 contact:'Contact us',c_enable:'Enable "Contact us"',c_group:'Admin group chat ID',c_group_d:'Create a Telegram group, add <b>@IRNovaProxy_Bot</b> as an admin, send <code>/id</code> in the group, and paste the ID here. Reply to a forwarded message to answer that user.',show_faq:'Show FAQ in menu',
 chan:'Required channel',chan_d:'Users must join this channel before they can use the bot.',chan_note:'⚠️ <b>The bot must be an admin of the channel</b> for this to work. Open the channel → Administrators → Add Admin → add <b>@IRNovaProxy_Bot</b> (no permissions needed). Until the bot is a channel admin, the check can\\'t run and everyone is let through.',chan_enable:'Require channel membership',chan_user:'Channel username',
 sup:'Support us',sup_d:"Shown when a user taps 💝 Support us in the bot. If both fields are empty, the bot tells users support isn't set up yet.",sup_text:'Message (HTML allowed, e.g. wallet addresses in &lt;code&gt;)',sup_links:'Link buttons, one per line: Label | https://url',
 bc:'Broadcast',bc_d:'Send a message to everyone who has used the bot. HTML allowed. Sends in the background.',bc_send:'Send to all users',
 edit:'Edit',hide:'Hide',show:'Show',del:'Delete',hidden:'hidden',none_faq:'No questions yet.',none_sec:'No sections yet.',
 saved:'Saved',added:'Added',deleted:'Deleted',sending:'Sending to',fill:'Please fill the fields',confirm_del:'Delete this?',confirm_bc:'Send to all users?'},
fa:{manage:'مدیریت',help:'راهنما',guide:'راهنما',stats:'نمای کلی',faq:'سؤالات',sections:'بخش‌ها',users:'کاربران',settings:'تنظیمات',broadcast:'همگانی',theme:'پوسته',
 logout:'خروج',menu:'منو',skip:'پرش به محتوا',u_search:'جست‌وجوی نام، یوزرنیم یا آیدی',
 ptitle_stats:'نمای کلی',psub_stats:'وضعیت ربات در یک نگاه',ptitle_faq:'سؤالات متداول',psub_faq:'سؤال‌هایی که کاربران می‌بینند',
 ptitle_sections:'بخش‌های منو',psub_sections:'دکمه‌های سفارشی منوی ربات',ptitle_settings:'تنظیمات',psub_settings:'متن خوش‌آمد و تماس',
 ptitle_broadcast:'پیام همگانی',psub_broadcast:'ارسال به همهٔ کاربران',ptitle_guide:'راهنما',psub_guide:'هر بخش چطور کار می‌کند',
 ptitle_users:'کاربران',psub_users:'مسدود یا آزاد کردن افراد',brandsub:'پنل مدیریت',
 st_users:'کاربران',st_active:'فعال (۷ روز)',st_installs:'پنل ساخته‌شده',st_builders:'سازندگان',st_banned:'مسدود',st_qa:'سؤال‌ها',st_ai:'پاسخ هوش مصنوعی',
 st_human:'پاسخ ادمین',st_wait:'در انتظار پاسخ',
 ov_refresh:'به‌روزرسانی',ov_updated:'به‌روز شده در {t}',
 ov_sub_users:'{n} کاربر جدید در این هفته',ov_sub_active:'{n}٪ از کل کاربران',ov_sub_installs:'توسط {n} سازنده',ov_sub_ai:'{n}٪ را هوش مصنوعی پاسخ داده',
 ov_chart:'فعالیت ۱۴ روز اخیر',ov_chart_d:'کاربران جدید و سؤال‌های پشتیبانی در هر روز. برای عدد دقیق، نشانگر را روی هر روز نگه دار.',
 ov_users_s:'کاربران جدید',ov_q_s:'سؤال‌ها',ov_empty:'در ۱۴ روز گذشته هنوز فعالیتی ثبت نشده.',
 ov_recent:'سؤال‌های اخیر پشتیبانی',ov_recent_d:'آخرین پیام‌هایی که کاربران برای پشتیبانی فرستاده‌اند، جدیدترین اول. همین‌جا پاسخ بده تا ربات به کاربر برساند.',
 qa_draft:'پیش‌نویس هوش مصنوعی',qa_send_draft:'ارسال پیش‌نویس',qa_edit_send:'ویرایش و ارسال',qa_approve_c:'پیش‌نویس هوش مصنوعی همین‌طور که هست برای کاربر ارسال شود؟',
 qa_unsure:'مدل مطمئن نبود، با دقت بخوانید',qa_approve_cu:'مدل درباره این جواب مطمئن نبود و ممکن است چیزی از خودش ساخته باشد. با این حال همین‌طور برای کاربر ارسال شود؟',
 ai_mode_l:'حالت',ai_mode_draft:'پیش‌نویس برای بازبینی: هوش مصنوعی جواب را پیش‌نویس می‌کند، تیم شما بررسی و ارسال می‌کند (تا وقتی داده کم است پیشنهاد می‌شود)',ai_mode_auto:'کاملا خودکار: جواب‌های مطمئن مستقیم برای کاربر می‌رود',
 qa_reply:'پاسخ',qa_reply_p:'پاسخت را بنویس. در تلگرام برای کاربر ارسال می‌شود و به‌عنوان پاسخ انسانی ذخیره می‌شود (هوش مصنوعی از آن یاد می‌گیرد).',qa_sent:'پاسخ برای کاربر ارسال شد',qa_fail:'ارسال نشد، شاید کاربر ربات را بلاک کرده',
 ov_none:'هنوز سؤالی به پشتیبانی نرسیده. هر وقت کاربری پیام بدهد، همین‌جا دیده می‌شود.',
 s_ai:'هوش مصنوعی',s_human:'ادمین',s_wait:'در انتظار',
 rt_just:'همین حالا',rt_m:'{n} دقیقه پیش',rt_h:'{n} ساعت پیش',rt_d:'{n} روز پیش',
 faq_ai:'پیش‌نویس از سؤال‌های واقعی',faq_ai_d:'هوش مصنوعی سؤال‌های اخیر کاربران و پاسخ‌های تیمت را می‌خواند و سؤال‌های متداول جدید پیش‌نویس می‌کند. پیش‌نویس‌ها پایین به‌صورت پنهان ظاهر می‌شوند؛ بازبینی و ویرایش کن و خوب‌ها را نمایش بده.',faq_ai_btn:'پیشنهاد سؤالات متداول',faq_ai_done:'پیش‌نویس اضافه شد:',faq_ai_nokey:'هوش مصنوعی روی این ورکر در دسترس نیست',
 ai:'دستیار هوش مصنوعی',ai_d:'وقتی مطمئن باشد، با استفاده از سؤالات متداول و پاسخ‌های قبلی تیمت، به پیام‌های پشتیبانی خودکار جواب می‌دهد. بقیه مثل قبل به گروه ادمین می‌رود و هر پاسخ هوش مصنوعی هم برای بازبینی همان‌جا کپی می‌شود.',ai_enable:'پاسخ خودکار به سؤال‌های پشتیبانی',ai_model_l:'مدل Claude (وقتی کلید API تنظیم شده باشد)',ai_key_d:'به‌صورت پیش‌فرض رایگان روی Cloudflare Workers AI کار می‌کند (روزی ۱۰٬۰۰۰ نورون رایگان). برای بهترین کیفیت فارسی، سکرت <code>ANTHROPIC_API_KEY</code> را اضافه کن (<code>wrangler secret put ANTHROPIC_API_KEY</code>) تا ربات خودکار به Claude سوییچ کند.',
 u_block_id:'مسدود کردن با آیدی',u_block_id_d:'آیدی عددی کاربر تلگرام را بچسبان (روی پیام‌های گروه تماس دیده می‌شود) تا از ربات مسدود شود.',u_block:'مسدود',u_unblock:'آزاد کردن',u_blocked:'مسدود',u_none:'هنوز کاربری نیست.',u_installs:'نصب',
 faq_add:'افزودن سؤال',faq_add_d:'به‌صورت فهرست قابل‌لمس در ربات نشان داده می‌شود. پاسخ‌ها از &lt;b&gt; &lt;i&gt; &lt;a&gt; &lt;code&gt; پشتیبانی می‌کنند.',f_q:'سؤال',f_a:'پاسخ',order:'ترتیب',add:'افزودن سؤال',
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
 {h:'📊 Overview',s:[
  '<b>Users</b>: everyone who has ever opened the bot. <b>Active (7d)</b>: users who used it in the last 7 days.',
  '<b>Panels built</b>: how many Nova panels were installed through the bot, and by how many different builders.',
  '<b>Questions</b> counts every support message, with the share the AI answered on its own. The small row below splits them into AI answered, team answered and still waiting.',
  'The <b>14-day chart</b> shows new users and support questions per day; hover a day for the exact numbers.',
  '<b>Recent support questions</b> lists the latest messages with their status: 🤖 answered by the AI, 👤 answered by your team, ⏳ still waiting in your admin group.']},
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
 {h:'📊 نمای کلی',s:[
  '<b>کاربران</b>: همهٔ کسانی که تا حالا ربات را باز کرده‌اند. <b>فعال (۷ روز)</b>: کاربرانی که در ۷ روز گذشته استفاده کرده‌اند.',
  '<b>پنل ساخته‌شده</b>: چند پنل نوا از طریق ربات نصب شده و توسط چند سازندهٔ متفاوت.',
  '<b>سؤال‌ها</b> همهٔ پیام‌های پشتیبانی را می‌شمارد، همراه با سهمی که هوش مصنوعی خودش پاسخ داده. ردیف کوچک زیر آن، پاسخ هوش مصنوعی، پاسخ ادمین و در انتظار را جدا نشان می‌دهد.',
  '<b>نمودار ۱۴ روزه</b> کاربران جدید و سؤال‌های پشتیبانی هر روز را نشان می‌دهد؛ برای عدد دقیق، نشانگر را روی هر روز نگه دار.',
  '<b>سؤال‌های اخیر پشتیبانی</b> آخرین پیام‌ها را با وضعیتشان نشان می‌دهد: 🤖 پاسخ هوش مصنوعی، 👤 پاسخ تیم شما، ⏳ هنوز در گروه ادمین منتظر است.']},
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
var IC={
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
 pulse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
 box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
 msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
 inbox:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
 reply:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>'};
function emptyBox(k){return '<div class="empty"><span class="ic">'+IC.inbox+'</span><p>'+T(k)+'</p></div>'}
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('show')},2000)}
function toggleNav(){$('app').classList.toggle('open')}

function applyLang(){document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';
 document.querySelectorAll('[data-k]').forEach(function(el){var k=el.dataset.k;var v=T(k);if(v){if(/[<&]/.test(v))el.innerHTML=v;else el.textContent=v}});
 document.querySelectorAll('[data-kp]').forEach(function(el){el.placeholder=T(el.dataset.kp)});
 $('brandsub').textContent=T('brandsub');
 $('theme').title=T('theme');$('mn').setAttribute('aria-label',T('menu'));
 $('ptitle').textContent=T('ptitle_'+cur);$('psub').textContent=T('psub_'+cur);
 [].forEach.call(document.querySelectorAll('#lg button'),function(b){b.classList.toggle('on',b.dataset.l===lang)});
 rerender()}
function applyTheme(){document.documentElement.setAttribute('data-theme',theme)}
function rerender(){if(cur==='stats')loadStats();if(cur==='faq')loadFaq();if(cur==='sections')loadSections();if(cur==='users')loadUsers();if(cur==='guide')renderGuide()}
function renderGuide(){var g=GUIDE[lang]||GUIDE.en;$('guidebox').innerHTML=g.map(function(sec){
 var intro=sec.intro?'<div class="desc">'+sec.intro+'</div>':'';
 var steps=sec.s.map(function(line,i){return '<div class="gstep"><span class="gn">'+nf(i+1)+'</span><span>'+line+'</span></div>'}).join('');
 return '<div class="card"><div class="card-h"><h3>'+sec.h+'</h3></div><div class="card-pad">'+intro+steps+'</div></div>';
}).join('')}

function nav(btn){cur=btn.dataset.p;document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
 document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.dataset.pane===cur));
 $('ptitle').textContent=T('ptitle_'+cur);$('psub').textContent=T('psub_'+cur);$('app').classList.remove('open');
 if(cur==='stats')loadStats();if(cur==='faq')loadFaq();if(cur==='sections')loadSections();if(cur==='users')loadUsers();if(cur==='settings')loadConfig();if(cur==='guide')renderGuide()}

$('lg').onclick=function(e){var b=e.target.closest('button');if(b){lang=b.dataset.l;localStorage.setItem('nova-lang',lang);applyLang()}};
$('theme').onclick=function(){theme=theme==='dark'?'light':'dark';localStorage.setItem('nova-theme',theme);applyTheme()};

function nf(n){return Number(n||0).toLocaleString(lang==='fa'?'fa-IR':'en-US')}
function fmt(k,n){return T(k).replace('{n}',nf(n))}
function rel(ts){if(!ts)return'';var t=Date.parse(ts.indexOf('T')<0?ts.replace(' ','T')+'Z':ts);if(isNaN(t))return'';
 var s=Math.max(0,(Date.now()-t)/1000);
 if(s<60)return T('rt_just');if(s<3600)return fmt('rt_m',Math.floor(s/60));
 if(s<86400)return fmt('rt_h',Math.floor(s/3600));return fmt('rt_d',Math.floor(s/86400))}

async function loadStats(){
 var b=$('ovrefresh');if(b)b.disabled=true;
 var s=await api('GET','overview').catch(function(){return null});
 if(b)b.disabled=false;
 if(!s||s.error)return;
 var loc=lang==='fa'?'fa-IR':'en-US';
 var rate=s.questions?Math.round((s.aiAnswered||0)/s.questions*100):0;
 var new7=(s.days||[]).slice(-7).reduce(function(a,d){return a+d.users},0);
 var actPct=s.users?Math.round(s.active7d/s.users*100):0;
 $('ovupd').textContent=T('ov_updated').replace('{t}',new Date().toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit'}));

 var tile=function(n,k,sub,ic){return '<div class="kpi"><div class="kpi-top"><span class="kpi-ic">'+ic+'</span><span class="lbl">'+T(k)+'</span></div><div class="kpi-val">'+nf(n)+'</div>'+(sub?'<div class="kpi-sub">'+sub+'</div>':'')+'</div>'};
 $('stats').innerHTML=
  tile(s.users,'st_users','<b>'+fmt('ov_sub_users',new7)+'</b>',IC.users)+
  tile(s.active7d,'st_active',fmt('ov_sub_active',actPct),IC.pulse)+
  tile(s.installs,'st_installs',fmt('ov_sub_installs',s.builders||0),IC.box)+
  tile(s.questions||0,'st_qa',fmt('ov_sub_ai',rate),IC.msg);
 var mini=function(k,v,c){return '<div class="mini"><span class="dot '+c+'"></span><div><div class="v">'+nf(v)+'</div><div class="k">'+T(k)+'</div></div></div>'};
 $('ministats').innerHTML=mini('st_ai',s.aiAnswered,'info')+mini('st_human',s.humanAnswered,'ok')+mini('st_wait',s.waiting,'warn')+mini('st_banned',s.banned,'bad');

 var days=s.days||[],max=1;
 days.forEach(function(d){max=Math.max(max,d.users,d.questions)});
 var any=days.some(function(d){return d.users||d.questions});
 $('chart').innerHTML=!any?'<p class="muted">'+T('ov_empty')+'</p>':days.map(function(d){
  var dt=new Date(d.d+'T00:00:00Z');
  var dl=dt.toLocaleDateString(loc,{day:'numeric',timeZone:'UTC'});
  var full=dt.toLocaleDateString(loc,{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
  var h1=d.users?Math.max(4,Math.round(d.users/max*100)):0;
  var h2=d.questions?Math.max(4,Math.round(d.questions/max*100)):0;
  var lbl=full+', '+T('ov_users_s')+': '+nf(d.users)+', '+T('ov_q_s')+': '+nf(d.questions);
  return '<div class="day" tabindex="0" role="img" aria-label="'+esc(lbl)+'"><div class="tip" aria-hidden="true"><b>'+full+'</b><br>'+T('ov_users_s')+': '+nf(d.users)+'<br>'+T('ov_q_s')+': '+nf(d.questions)+'</div>'+
   '<div class="bars"><i style="height:'+h1+'%"></i><i class="q" style="height:'+h2+'%"></i></div>'+
   '<span class="dl">'+dl+'</span></div>'}).join('');

 var ST={ai:{c:'info',k:'s_ai'},human:{c:'ok',k:'s_human'},waiting:{c:'warn',k:'s_wait'}};
 var rec=s.recent||[];window._rec=rec;
 $('qfeed').innerHTML=!rec.length?emptyBox('ov_none'):rec.map(function(r){
  var st=ST[r.status]||ST.waiting;
  var q=String(r.question||'');if(q.length>140)q=q.slice(0,140)+'…';
  var hasDraft=r.status==='waiting'&&r.draft;
  // An unsure draft is still worth showing, but it leads with Edit and send:
  // the model tends to invent details on questions the knowledge base misses.
  var unsure=hasDraft&&!r.draft_sure;
  var draft=hasDraft?'<div class="draftbox'+(unsure?' unsure':'')+'" dir="auto"><span class="dlabel">'+
    T('qa_draft')+(unsure?' <span class="warn">'+T('qa_unsure')+'</span>':'')+'</span>'+esc(r.draft)+'</div>':'';
  var send='<button class="btn'+(unsure?' ghost':'')+' sm" onclick="qaApprove('+(+r.id)+')">'+T('qa_send_draft')+'</button>';
  var edit='<button class="btn'+(unsure?'':' ghost')+' sm" onclick="qaReply('+(+r.id)+')">'+T('qa_edit_send')+'</button>';
  var btns=hasDraft
   ?'<div class="btncol">'+(unsure?edit+send:send+edit)+'</div>'
   :'<div class="btncol"><button class="btn ghost sm" onclick="qaReply('+(+r.id)+')">'+IC.reply+T('qa_reply')+'</button></div>';
  return '<div class="qrow"><span class="chip '+st.c+'"><span class="dot"></span>'+T(st.k)+'</span>'+
   '<div class="body"><div class="qt" dir="auto">'+esc(q)+'</div>'+draft+
   '<div class="meta"><span>'+esc(String(r.lang||'').toUpperCase())+'</span><span>'+rel(r.created_at)+'</span></div></div>'+
   btns+'</div>'}).join('');
}

// Answer a support question from the panel. The reply is delivered to the
// user in Telegram and saved as the human answer, which the AI learns from.
async function qaReply(id){
 var r=(window._rec||[]).find(function(x){return x.id===id});
 var txt=prompt(T('qa_reply_p')+(r?'\\n\\n'+r.question:''),(r&&r.draft)||'');
 if(txt===null)return;txt=txt.trim();if(!txt)return toast(T('fill'));
 var res=await api('POST','qa-reply',{id:id,text:txt}).catch(function(){return null});
 if(res&&res.ok){toast(T('qa_sent'));loadStats()}
 else toast(res&&res.error==='undeliverable'?T('qa_fail'):'Error')}

// Send the stored AI draft exactly as written (recorded as an approved answer).
async function qaApprove(id){
 var r=(window._rec||[]).find(function(x){return x.id===id});
 if(!confirm(T(r&&!r.draft_sure?'qa_approve_cu':'qa_approve_c')))return;
 var res=await api('POST','qa-approve',{id:id}).catch(function(){return null});
 if(res&&res.ok){toast(T('qa_sent'));loadStats()}
 else toast(res&&res.error==='undeliverable'?T('qa_fail'):'Error')}

async function loadUsers(){var q=encodeURIComponent(($('usearch').value||'').trim());var list=await api('GET','users'+(q?('?q='+q):''));
 window._usr=list;var el=$('userlist');
 if(!list.length){el.innerHTML=emptyBox('u_none');return}
 el.innerHTML=list.map(function(u){
  var ini=String(u.first_name||u.username||'#').trim().charAt(0).toUpperCase()||'#';
  var name=esc(u.first_name||'')+(u.username?' <span class="un" dir="ltr">@'+esc(u.username)+'</span>':'');
  return '<div class="urow'+(u.banned?' off':'')+'"><span class="uav">'+esc(ini)+'</span>'+
   '<div class="info"><div class="nm"><span dir="auto">'+name+'</span>'+(u.banned?'<span class="chip err"><span class="dot"></span>'+T('u_blocked')+'</span>':'')+'</div>'+
   '<div class="meta"><code>'+u.id+'</code><span>'+nf(u.installs||0)+' '+T('u_installs')+'</span><span dir="ltr">'+esc((u.last_seen||'').slice(0,10))+'</span></div></div>'+
   '<button class="btn '+(u.banned?'ghost':'dg')+' sm" onclick="setBan('+u.id+','+(u.banned?0:1)+')">'+(u.banned?T('u_unblock'):T('u_block'))+'</button></div>'}).join('')}
async function setBan(id,banned){await api('POST','users',{id,banned:!!banned});toast(T('saved'));loadUsers()}
async function banById(){var v=($('banid').value||'').trim().replace(/[^0-9]/g,'');if(!v)return toast(T('fill'));
 await api('POST','users',{id:+v,banned:true});$('banid').value='';toast(T('saved'));loadUsers()}

async function loadFaq(){var list=await api('GET','faq');window._faq=list;var el=$('faqlist');
 if(!list.length){el.innerHTML=emptyBox('none_faq');return}
 el.innerHTML=list.map(function(f){
  return '<div class="item"><div class="item-h"><div class="q" dir="auto">'+esc(f.question)+'</div>'+
   (f.enabled?'':'<span class="chip warn"><span class="dot"></span>'+T('hidden')+'</span>')+'</div>'+
   '<div class="a" dir="auto">'+esc(f.answer)+'</div>'+
   '<div class="acts"><button class="btn ghost sm" onclick="editFaq('+f.id+')">'+T('edit')+'</button>'+
   '<button class="btn ghost sm" onclick="toggleFaq('+f.id+','+(f.enabled?0:1)+')">'+(f.enabled?T('hide'):T('show'))+'</button>'+
   '<button class="btn dg sm" onclick="delFaq('+f.id+')">'+T('del')+'</button></div></div>'}).join('')}
async function addFaq(){var q=fq.value.trim(),a=fa.value.trim();if(!q||!a)return toast(T('fill'));
 await api('POST','faq',{question:q,answer:a,position:+fp.value||0});fq.value=fa.value='';fp.value=0;toast(T('added'));loadFaq()}
function editFaq(id){var f=window._faq.find(x=>x.id===id);var q=prompt('Question:',f.question);if(q===null)return;var a=prompt('Answer:',f.answer);if(a===null)return;
 api('PUT','faq',{id,question:q,answer:a,position:f.position,enabled:f.enabled}).then(()=>{toast(T('saved'));loadFaq()})}
function toggleFaq(id,en){var f=window._faq.find(x=>x.id===id);api('PUT','faq',{id,question:f.question,answer:f.answer,position:f.position,enabled:en}).then(loadFaq)}
function delFaq(id){if(!confirm(T('confirm_del')))return;api('DELETE','faq',{id}).then(()=>{toast(T('deleted'));loadFaq()})}
async function suggestFaq(btn){btn.disabled=true;var old=btn.textContent;btn.textContent='…';
 var r=await api('POST','faq-suggest').catch(()=>null);btn.disabled=false;btn.textContent=old;
 if(r&&r.ok){toast(T('faq_ai_done')+' '+r.added);loadFaq()}
 else toast(r&&r.error==='no_api_key'?T('faq_ai_nokey'):(r&&r.error)||'Error')}

async function loadSections(){var list=await api('GET','sections');window._sec=list;var el=$('seclist');
 if(!list.length){el.innerHTML=emptyBox('none_sec');return}
 el.innerHTML=list.map(function(s){
  return '<div class="item"><div class="item-h"><div class="q" dir="auto">'+esc(s.title)+'</div>'+
   (s.enabled?'':'<span class="chip warn"><span class="dot"></span>'+T('hidden')+'</span>')+'</div>'+
   '<div class="a" dir="auto">'+esc(s.body)+'</div>'+
   (s.button_url?'<div class="meta"><span>'+esc(s.button_text)+'</span><code>'+esc(s.button_url)+'</code></div>':'')+
   '<div class="acts"><button class="btn ghost sm" onclick="editSection('+s.id+')">'+T('edit')+'</button>'+
   '<button class="btn ghost sm" onclick="toggleSection('+s.id+','+(s.enabled?0:1)+')">'+(s.enabled?T('hide'):T('show'))+'</button>'+
   '<button class="btn dg sm" onclick="delSection('+s.id+')">'+T('del')+'</button></div></div>'}).join('')}
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
 ai_enabled.checked=c.ai_enabled!=='0';ai_model.value=c.ai_model||'claude-opus-4-8';
 ((c.ai_mode||'draft')==='auto'?ai_mode_auto:ai_mode_draft).checked=true}
async function saveConfig(){await api('POST','config',{welcome_en:welcome_en.value,welcome_fa:welcome_fa.value,
 welcome_image:welcome_image.value.trim(),
 contact_group_id:contact_group_id.value.trim(),contact_enabled:contact_enabled.checked?'1':'0',faq_enabled:faq_enabled.checked?'1':'0',
 join_required:join_required.checked?'1':'0',join_channel:join_channel.value.trim().replace(/^@/,'').replace(/^https?:\\/\\/t\\.me\\//i,''),
 support_text:support_text.value,support_links:support_links.value,
 ai_enabled:ai_enabled.checked?'1':'0',ai_mode:ai_mode_auto.checked?'auto':'draft',
 ai_model:ai_model.value.trim()||'claude-opus-4-8'});toast(T('saved'))}

async function broadcast(){var t=bc.value.trim();if(!t)return toast(T('fill'));if(!confirm(T('confirm_bc')))return;
 var r=await api('POST','broadcast',{text:t});if(r.ok){toast(T('sending')+' '+r.recipients);bc.value=''}else toast('Error')}

applyTheme();applyLang();loadStats();
</script></body></html>`;
