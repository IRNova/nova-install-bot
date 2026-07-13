// Admin panel HTML. Kept as template strings so the whole bot ships as one Worker.

const STYLE = `
:root{--bg:#05060a;--bg2:#090b12;--card:rgba(255,255,255,.04);--card2:rgba(255,255,255,.07);
--line:rgba(255,255,255,.10);--line2:rgba(255,255,255,.18);--tx:#eef1f7;--mu:#9aa4b8;
--cyan:#22d3ee;--violet:#a855f7;--grad:linear-gradient(120deg,#22d3ee,#818cf8 50%,#a855f7);
--ok:#34d399;--bad:#f87171;--r:14px;--font:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font-family:var(--font);line-height:1.55}
a{color:var(--cyan)}
.bar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;
border-bottom:1px solid var(--line);background:rgba(5,6,10,.7);backdrop-filter:blur(12px);
position:sticky;top:0;z-index:10}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.1rem}
.mk{width:30px;height:30px;border-radius:8px;background:var(--grad);display:flex;align-items:center;
justify-content:center;font-weight:900;color:#05060a}
.wrap{max-width:820px;margin:0 auto;padding:20px}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}
.tabs button{border:1px solid var(--line2);background:var(--card2);color:var(--mu);cursor:pointer;
font:inherit;font-weight:600;font-size:.9rem;padding:8px 14px;border-radius:999px}
.tabs button.on{color:#05060a;background:var(--grad);border-color:transparent}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:18px;margin:0 0 16px}
h2{font-size:1.05rem;margin:0 0 12px}
label{display:block;font-weight:600;font-size:.85rem;margin:12px 0 6px}
input,textarea,select{width:100%;background:#0b0e16;border:1px solid var(--line);border-radius:10px;
color:var(--tx);font:inherit;font-size:.95rem;padding:11px 12px}
input:focus,textarea:focus{outline:none;border-color:var(--cyan)}
textarea{min-height:90px;resize:vertical}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--grad);color:#05060a;font-weight:700;
border:none;border-radius:10px;padding:11px 18px;cursor:pointer;font:inherit;font-size:.95rem;margin-top:14px}
.btn.ghost{background:var(--card2);color:var(--tx);border:1px solid var(--line2)}
.btn.sm{padding:7px 12px;font-size:.85rem;margin:0}
.btn.bad{background:rgba(248,113,113,.15);color:#fecaca;border:1px solid rgba(248,113,113,.4)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.stat{background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:16px}
.stat .n{font-size:1.9rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;
background-clip:text;color:transparent}
.stat .l{color:var(--mu);font-size:.85rem}
.item{border:1px solid var(--line);border-radius:12px;padding:14px;margin:0 0 10px;background:var(--card2)}
.item .q{font-weight:700}
.item .a{color:var(--mu);font-size:.9rem;white-space:pre-wrap;margin-top:4px}
.muted{color:var(--mu);font-size:.85rem}
.switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:.9rem}
.hidden{display:none}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--card2);
border:1px solid var(--line2);padding:12px 18px;border-radius:12px;opacity:0;transition:opacity .25s;z-index:50}
.toast.show{opacity:1}
.login{max-width:360px;margin:12vh auto;padding:0 20px;text-align:center}
.login .mk{margin:0 auto 16px;width:52px;height:52px;font-size:24px;border-radius:14px}
`;

export function LOGIN_HTML(failed) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nova Bot Admin</title><style>${STYLE}</style></head><body>
<div class="login">
  <div class="mk">N</div>
  <h2>Nova Bot Admin</h2>
  ${failed ? '<p style="color:var(--bad)">Wrong password.</p>' : '<p class="muted">Enter your admin password.</p>'}
  <form method="POST" action="/admin/login">
    <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password">
    <button class="btn" style="width:100%" type="submit">Sign in</button>
  </form>
</div></body></html>`;
}

export const DASHBOARD_HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nova Bot Admin</title><style>${STYLE}</style></head><body>
<div class="bar">
  <div class="logo"><span class="mk">N</span> Nova Bot Admin</div>
  <a class="btn ghost sm" href="/admin/logout">Sign out</a>
</div>
<div class="wrap">
  <div class="tabs" id="tabs"></div>

  <!-- STATS -->
  <div class="pane" data-pane="stats">
    <div class="card"><h2>Overview</h2><div class="grid" id="stats"></div></div>
  </div>

  <!-- FAQ -->
  <div class="pane hidden" data-pane="faq">
    <div class="card">
      <h2>Add a question</h2>
      <label>Question</label><input id="fq" placeholder="How do I connect?">
      <label>Answer (HTML allowed: &lt;b&gt; &lt;i&gt; &lt;a&gt; &lt;code&gt;)</label>
      <textarea id="fa" placeholder="Open the app, paste your subscription link…"></textarea>
      <label>Order</label><input id="fp" type="number" value="0" style="max-width:120px">
      <button class="btn" onclick="addFaq()">Add question</button>
    </div>
    <div id="faqlist"></div>
  </div>

  <!-- SECTIONS -->
  <div class="pane hidden" data-pane="sections">
    <div class="card">
      <h2>Add a menu section</h2>
      <p class="muted">Adds a button to the bot's main menu. Tapping it shows your text (and an optional link button).</p>
      <label>Button title</label><input id="st" placeholder="📖 User guide">
      <label>Body (HTML allowed)</label><textarea id="sb" placeholder="Here's how to get started…"></textarea>
      <div class="row">
        <div style="flex:1"><label>Link button text (optional)</label><input id="sbt" placeholder="Open guide"></div>
        <div style="flex:1"><label>Link URL (optional)</label><input id="sbu" placeholder="https://…"></div>
      </div>
      <label>Order</label><input id="sp" type="number" value="0" style="max-width:120px">
      <button class="btn" onclick="addSection()">Add section</button>
    </div>
    <div id="seclist"></div>
  </div>

  <!-- SETTINGS -->
  <div class="pane hidden" data-pane="settings">
    <div class="card">
      <h2>Welcome message</h2>
      <p class="muted">Shown at the top of the main menu. Leave blank for the default.</p>
      <textarea id="welcome" placeholder="Default welcome is used when empty."></textarea>
      <button class="btn" onclick="saveConfig()">Save</button>
    </div>
    <div class="card">
      <h2>Contact us</h2>
      <label class="switch"><input type="checkbox" id="contact_enabled" style="width:auto"> Enable "Contact us"</label>
      <label>Admin group chat ID</label>
      <input id="contact_group_id" placeholder="-1001234567890">
      <p class="muted">Create a Telegram group, add <b>@IRNovaProxy_Bot</b> as an admin, send <code>/id</code> in the group, and paste the ID here. User messages arrive there; reply to a message to answer that user.</p>
      <label class="switch" style="margin-top:12px"><input type="checkbox" id="faq_enabled" style="width:auto"> Show FAQ in menu</label>
      <button class="btn" onclick="saveConfig()">Save</button>
    </div>
  </div>

  <!-- BROADCAST -->
  <div class="pane hidden" data-pane="broadcast">
    <div class="card">
      <h2>Broadcast</h2>
      <p class="muted">Send a message to everyone who has used the bot. HTML allowed. Sends in the background.</p>
      <textarea id="bc" placeholder="📢 New Nova update is out…"></textarea>
      <button class="btn" onclick="broadcast()">Send to all users</button>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script>
const PANES=[['stats','📊 Stats'],['faq','❓ FAQ'],['sections','🧩 Sections'],['settings','⚙️ Settings'],['broadcast','📢 Broadcast']];
const tabs=document.getElementById('tabs');
PANES.forEach(([id,label],i)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>show(id,b);if(i===0)b.className='on';tabs.appendChild(b);});
function show(id,btn){document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('hidden',p.dataset.pane!==id));
document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
if(id==='stats')loadStats();if(id==='faq')loadFaq();if(id==='sections')loadSections();if(id==='settings')loadConfig();}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);}
const api=(m,r,b)=>fetch('/admin/api/'+r,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(x=>x.json());
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

async function loadStats(){const s=await api('GET','stats');document.getElementById('stats').innerHTML=
[['Users',s.users],['Active (7d)',s.active7d],['Panels built',s.installs],['Builders',s.builders]]
.map(([l,n])=>'<div class="stat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');}

async function loadFaq(){const list=await api('GET','faq');const el=document.getElementById('faqlist');
el.innerHTML=list.length?'':'<p class="muted">No questions yet.</p>';
list.forEach(f=>{const d=document.createElement('div');d.className='item';
d.innerHTML='<div class="q">'+esc(f.question)+(f.enabled?'':' <span class="muted">(hidden)</span>')+'</div><div class="a">'+esc(f.answer)+'</div>'+
'<div class="row" style="margin-top:10px"><button class="btn ghost sm" onclick=\\'editFaq('+f.id+')\\'>Edit</button>'+
'<button class="btn sm '+(f.enabled?'ghost':'')+'" onclick="toggleFaq('+f.id+','+(f.enabled?0:1)+')">'+(f.enabled?'Hide':'Show')+'</button>'+
'<button class="btn bad sm" onclick="delFaq('+f.id+')">Delete</button></div>';
d.dataset.f=JSON.stringify(f);el.appendChild(d);});window._faq=list;}
async function addFaq(){const q=fq.value.trim(),a=fa.value.trim();if(!q||!a)return toast('Fill both fields');
await api('POST','faq',{question:q,answer:a,position:+fp.value||0});fq.value=fa.value='';fp.value=0;toast('Added');loadFaq();}
function editFaq(id){const f=window._faq.find(x=>x.id===id);const q=prompt('Question:',f.question);if(q===null)return;
const a=prompt('Answer:',f.answer);if(a===null)return;api('PUT','faq',{id,question:q,answer:a,position:f.position,enabled:f.enabled}).then(()=>{toast('Saved');loadFaq();});}
function toggleFaq(id,en){const f=window._faq.find(x=>x.id===id);api('PUT','faq',{id,question:f.question,answer:f.answer,position:f.position,enabled:en}).then(()=>loadFaq());}
function delFaq(id){if(!confirm('Delete this question?'))return;api('DELETE','faq',{id}).then(()=>{toast('Deleted');loadFaq();});}

async function loadSections(){const list=await api('GET','sections');const el=document.getElementById('seclist');
el.innerHTML=list.length?'':'<p class="muted">No sections yet.</p>';window._sec=list;
list.forEach(s=>{const d=document.createElement('div');d.className='item';
d.innerHTML='<div class="q">'+esc(s.title)+(s.enabled?'':' <span class="muted">(hidden)</span>')+'</div><div class="a">'+esc(s.body)+'</div>'+
(s.button_url?'<div class="muted" style="margin-top:4px">🔗 '+esc(s.button_text)+' → '+esc(s.button_url)+'</div>':'')+
'<div class="row" style="margin-top:10px"><button class="btn ghost sm" onclick="editSection('+s.id+')">Edit</button>'+
'<button class="btn sm '+(s.enabled?'ghost':'')+'" onclick="toggleSection('+s.id+','+(s.enabled?0:1)+')">'+(s.enabled?'Hide':'Show')+'</button>'+
'<button class="btn bad sm" onclick="delSection('+s.id+')">Delete</button></div>';el.appendChild(d);});}
async function addSection(){const t=st.value.trim(),b=sb.value.trim();if(!t||!b)return toast('Fill title and body');
await api('POST','sections',{title:t,body:b,button_text:sbt.value.trim(),button_url:sbu.value.trim(),position:+sp.value||0});
st.value=sb.value=sbt.value=sbu.value='';sp.value=0;toast('Added');loadSections();}
function editSection(id){const s=window._sec.find(x=>x.id===id);const t=prompt('Title:',s.title);if(t===null)return;
const b=prompt('Body:',s.body);if(b===null)return;const bt=prompt('Button text (blank for none):',s.button_text||'');
const bu=prompt('Button URL (blank for none):',s.button_url||'');
api('PUT','sections',{id,title:t,body:b,button_text:bt||'',button_url:bu||'',position:s.position,enabled:s.enabled}).then(()=>{toast('Saved');loadSections();});}
function toggleSection(id,en){const s=window._sec.find(x=>x.id===id);api('PUT','sections',{id,title:s.title,body:s.body,button_text:s.button_text,button_url:s.button_url,position:s.position,enabled:en}).then(()=>loadSections());}
function delSection(id){if(!confirm('Delete this section?'))return;api('DELETE','sections',{id}).then(()=>{toast('Deleted');loadSections();});}

async function loadConfig(){const c=await api('GET','config');welcome.value=c.welcome||'';
contact_group_id.value=c.contact_group_id||'';contact_enabled.checked=c.contact_enabled!=='0';faq_enabled.checked=c.faq_enabled!=='0';}
async function saveConfig(){await api('POST','config',{welcome:welcome.value,contact_group_id:contact_group_id.value.trim(),
contact_enabled:contact_enabled.checked?'1':'0',faq_enabled:faq_enabled.checked?'1':'0'});toast('Saved');}

async function broadcast(){const t=bc.value.trim();if(!t)return toast('Write a message');
if(!confirm('Send to all users?'))return;const r=await api('POST','broadcast',{text:t});
if(r.ok){toast('Sending to '+r.recipients+' users');bc.value='';}else toast('Error');}

loadStats();
</script></body></html>`;
