/* Kuzey Arcade categories: buttons above the games that show only one kind of game, plus a search box */
(function(){
const CATS=[
 ['all','⭐','All'],
 ['adventure','🗺️','Adventure',['blockbreakout','pixelpeaks','crypt','cardquest','temples','bandit','craft','voidbridge','ninjarun','kuzeytown']],
 ['action','💥','Action',['starsiege','skyraiders','neonswarm','tankcommander','galaxyguardian','monstersurvivors','dodger','snake','snake-arena','voidbridge','ninjarun','temples']],
 ['puzzle','🧩','Puzzle',['laser','gemcascade','stack','words','gearworks','illusions']],
 ['strategy','🏰','Strategy',['blockbreakout','bastion','roborampart','castlesiege','cardquest','gearworks','farm']],
 ['racing','🏎️','Racing & Sports',['turbotrails','minigolf','goalrush','pinballplanet']],
 ['pretend','🏡','Pretend & Build',['kuzeytown','farm','craft','pixel','flipbook','app-forge']],
 ['music','🎵','Music & Art',['beatblaster','beats','piano','pixel','kaleido','flipbook','voice','fractal']],
 ['learn','📚','Learning',['bonjourparis','space','reader','english','yazili','sosyal','elements','flags','mathgym','typing','cards','codes','words']],
 ['multi','🎮','Multiplayer',['starsiege','stack','gemcascade','ninjarun','galaxyguardian','neonswarm','words','laser','bonjourparis','beatblaster','pinballplanet','turbotrails','pixelpeaks','dodger','snake','minigolf','snake-arena','goalrush']],
 ['tools','🛠️','Tools',['timer','convert','weather','planner','picker','qr','reader','bookclub','fll','elementals','minecraft','app-forge']]];
const idOf=a=>(a.getAttribute('href')||'').replace(/\.html$/,'').replace(/\/$/,'');
let cur='all';try{cur=localStorage.getItem('kuzey:cat')||'all'}catch(e){}
function apply(){const q=(document.getElementById('catQ').value||'').trim().toLowerCase(),cat=CATS.find(c=>c[0]===cur)||CATS[0];let shown=0;
  document.querySelectorAll('a.game').forEach(a=>{const id=idOf(a),inCat=cur==='all'||(cat[3]||[]).includes(id),txt=a.textContent.toLowerCase(),ok=inCat&&(!q||txt.includes(q));a.hidden=!ok;if(ok)shown++});
  document.querySelectorAll('.games').forEach(g=>{const any=[...g.querySelectorAll('a.game')].some(a=>!a.hidden);g.hidden=!any;let h=g.previousElementSibling;if(h&&h.classList.contains('sect'))h.hidden=!any});
  document.getElementById('catNone').hidden=shown>0;
  document.querySelectorAll('#catBar [data-c]').forEach(b=>b.classList.toggle('on',b.dataset.c===cur))}
function build(){const host=document.getElementById('cats');if(!host)return;const all=[...document.querySelectorAll('a.game')].map(idOf);
  host.innerHTML=`<div id="catBar">${CATS.map(c=>{const n=c[0]==='all'?all.length:all.filter(id=>c[3].includes(id)).length;return`<button data-c="${c[0]}"><span>${c[1]}</span>${c[2]} <small>${n}</small></button>`}).join('')}</div>
    <input id="catQ" type="search" placeholder="🔍 Search games" autocomplete="off"><p id="catNone" hidden>No games found. Try another word!</p>`;
  host.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{cur=b.dataset.c;try{localStorage.setItem('kuzey:cat',cur)}catch(e){}apply();b.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})});
  document.getElementById('catQ').oninput=apply;apply()}
const st=document.createElement('style');st.textContent=`#cats{display:flex;flex-direction:column;gap:10px}
#catBar{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 6px;scrollbar-width:thin}
#catBar button{flex:none;display:flex;align-items:center;gap:6px;border:2px solid var(--line);background:var(--panel);color:var(--ink);border-radius:999px;padding:8px 14px;font:600 14px var(--body);cursor:pointer;white-space:nowrap}
#catBar button span{font-size:18px}#catBar button small{color:var(--mute);font-size:12px}
#catBar button.on{background:linear-gradient(90deg,var(--cyan),var(--pink));border-color:transparent;color:#0b0820}#catBar button.on small{color:#0b0820}
#catQ{width:100%;box-sizing:border-box;background:var(--panel);border:2px solid var(--line);border-radius:14px;color:var(--ink);padding:10px 14px;font:16px var(--body)}
#catNone{margin:0;color:var(--mute);text-align:center}
a.game[hidden],.games[hidden],.sect[hidden],#catNone[hidden]{display:none!important}`;document.head.appendChild(st);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
