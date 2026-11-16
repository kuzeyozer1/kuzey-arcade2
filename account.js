/* Kuzey Arcade accounts.
   - Several players can have their own account on one device. Each account keeps its own progress in every game.
   - The account in use keeps its data in the normal places; the others are packed away under "kuzeyacct:data:<id>".
   - "Send to another device" packs all progress into a code/file locked with the account's PIN.
     "Log in from another device" opens that code/file with the PIN and makes the account on this device.
   Everything stays on the devices: there is no server. */
(function(){
'use strict';
const P='kuzeyacct:',SKIP=['kuzeyacct:','bookClubCache'];
const AV=['🦊','🐼','🐯','🐸','🦁','🐨','🐵','🦄','🐲','🤖','👽','🐧','🦉','🐙','🦖','🐱','🐶','🐰','🦝','🐺'];
const COL=['#3ef0ff','#ff3d9a','#ffd23f','#5cf2b4','#b98bff','#ff8a3d','#4f8bff','#ff5d5d','#c6ff3e','#ffffff'];
const get=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let A=get(P+'list',null);

function liveKeys(){const out=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!SKIP.some(p=>k.startsWith(p)))out.push(k)}return out}
function snapshot(){const d={};for(const k of liveKeys())d[k]=localStorage.getItem(k);return d}
function profile(){return get('kuzey:profile',{name:'Player',avatar:'🦊',color:'#3ef0ff',vehicles:{}})}
function cur(){return A.accounts.find(a=>a.id===A.current)}
function saveA(){set(P+'list',A)}
function newId(){return Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>b.toString(16).padStart(2,'0')).join('')}
// first visit: the progress already on this device becomes the first account
if(!A||!A.accounts||!A.accounts.length){const p=profile();A={current:null,accounts:[]};const id=newId();A.accounts.push({id,name:p.name||'Player',avatar:p.avatar||'🦊',color:p.color||'#3ef0ff',pin:null,created:Date.now(),fresh:true});A.current=id;saveA()}
// keep the account card in step with the game profile (games can change name/avatar)
(()=>{const p=profile(),a=cur();if(a&&(p.name!==a.name||p.avatar!==a.avatar||p.color!==a.color)){a.name=p.name||a.name;a.avatar=p.avatar||a.avatar;a.color=p.color||a.color;saveA()}})();
function writeProfile(a){const p=profile();p.name=a.name;p.avatar=a.avatar;p.color=a.color;set('kuzey:profile',p)}

async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
const pinHash=(a,pin)=>sha('kuzey-arcade:'+a.id+':'+pin);
async function checkPin(a,pin){return !a.pin||await pinHash(a,pin)===a.pin}

// ---------- switching ----------
function packAway(){const a=cur(),d=snapshot();try{set(P+'data:'+a.id,d)}catch(e){throw new Error('This device is full. Delete an old account or a big Kuzey Craft world first.')}for(const k of Object.keys(d))localStorage.removeItem(k)}
function unpack(id){const d=get(P+'data:'+id,{});for(const k in d)localStorage.setItem(k,d[k]);localStorage.removeItem(P+'data:'+id)}
function switchTo(id,fresh){if(id===A.current)return;packAway();A.current=id;if(!fresh)unpack(id);const a=cur();writeProfile(a);saveA();location.reload()}

// ---------- transfer code ----------
const b64u={enc(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')},
  dec(s){s=s.replace(/[^A-Za-z0-9_-]/g,'').replace(/-/g,'+').replace(/_/g,'/');const b=atob(s+'==='.slice((s.length+3)%4));return Uint8Array.from(b,c=>c.charCodeAt(0))}};
async function zip(u8,how){if(!window.CompressionStream)return u8;const s=new Blob([u8]).stream().pipeThrough(how==='c'?new CompressionStream('gzip'):new DecompressionStream('gzip'));return new Uint8Array(await new Response(s).arrayBuffer())}
async function keyFor(pin,salt){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode('kuzey:'+pin),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function makeCode(pin){const a=cur(),payload={v:1,at:Date.now(),acct:{id:a.id,name:a.name,avatar:a.avatar,color:a.color,pin:a.pin,created:a.created},data:snapshot()};
  const raw=await zip(new TextEncoder().encode(JSON.stringify(payload)),'c'),gz=window.CompressionStream?1:0;
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyFor(pin,salt),raw));
  const out=new Uint8Array(1+16+12+ct.length);out[0]=gz;out.set(salt,1);out.set(iv,17);out.set(ct,29);return 'KZ1.'+b64u.enc(out)}
async function readCode(code,pin){code=code.trim();if(!code.startsWith('KZ1.'))throw new Error('That is not a Kuzey Arcade code.');const u=b64u.dec(code.slice(4));
  let raw;try{raw=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(17,29)},await keyFor(pin,u.slice(1,17)),u.slice(29)))}catch(e){throw new Error('Wrong PIN (or the code is not complete).')}
  if(u[0])raw=await zip(raw,'d');return JSON.parse(new TextDecoder().decode(raw))}
function login(p){const ex=A.accounts.find(a=>a.id===p.acct.id);
  if(ex){if(ex.id===A.current){for(const k of liveKeys())localStorage.removeItem(k);for(const k in p.data)localStorage.setItem(k,p.data[k]);Object.assign(ex,p.acct);delete ex.fresh;writeProfile(ex);saveA();location.reload();return}
    Object.assign(ex,p.acct);delete ex.fresh;set(P+'data:'+ex.id,p.data);saveA();switchTo(ex.id);return}
  const a=Object.assign({},p.acct),o=cur();A.accounts.push(a);
  if(o.fresh&&trophies().n===0&&bytes()<4000){// an empty guest account: replace it instead of keeping it
    for(const k of liveKeys())localStorage.removeItem(k);A.accounts=A.accounts.filter(x=>x!==o);A.current=a.id;for(const k in p.data)localStorage.setItem(k,p.data[k]);writeProfile(a);saveA();location.reload();return}
  saveA();set(P+'data:'+a.id,p.data);switchTo(a.id)}

// ---------- stats ----------
function trophies(){let n=0,g=0;for(const k of liveKeys())if(k.startsWith('kuzey:ach:')){const c=Object.keys(get(k,{})).length;n+=c;if(c)g++}return{n,g}}
function bytes(){let n=0;for(const k of liveKeys())n+=k.length+(localStorage.getItem(k)||'').length;return n}

// ---------- UI ----------
const css=`
.acbar{display:flex;align-items:center;gap:12px;background:var(--panel,#151036);border:2px solid var(--line,#2c2468);border-radius:16px;padding:10px 12px;margin-top:14px;cursor:pointer;color:inherit;font:inherit;width:100%;text-align:left}
.acbar:hover{border-color:var(--cyan,#3ef0ff)}
.acav{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font-size:30px;flex:none;border:3px solid}
.acbar b{font:900 18px Orbitron,monospace;display:block}.acbar small{color:var(--mute,#9a94c9)}
.acbar .go{margin-left:auto;font:900 12px Orbitron,monospace;letter-spacing:.08em;background:var(--cyan,#3ef0ff);color:#0b0820;padding:8px 12px;border-radius:10px;white-space:nowrap}
.acm{position:fixed;inset:0;z-index:9000;background:rgba(5,3,20,.8);display:grid;place-items:center;padding:16px;font-family:'Chakra Petch',system-ui,sans-serif;color:#ecebff}
.acm .bx{background:#151036;border:2px solid #2c2468;border-radius:18px;padding:18px;width:min(480px,100%);max-height:90vh;overflow:auto;display:flex;flex-direction:column;gap:12px}
.acm h2{margin:0;font:900 20px Orbitron,monospace;color:#ffd23f}.acm p{margin:0;color:#c8c4ee}
.acm input,.acm textarea{width:100%;box-sizing:border-box;background:#0b0820;border:2px solid #2c2468;border-radius:10px;color:#fff;padding:10px;font:16px 'Chakra Petch',sans-serif}
.acm textarea{height:110px;font:12px ui-monospace,monospace;word-break:break-all}
.acm .pin{font:900 26px Orbitron,monospace;letter-spacing:.5em;text-align:center}
.acm .grid{display:flex;flex-wrap:wrap;gap:6px}.acm .grid button{width:44px;height:44px;border-radius:12px;border:2px solid #2c2468;background:#0b0820;font-size:24px;cursor:pointer;color:#fff}
.acm .grid button.on{border-color:#ffd23f;background:#2c2468}.acm .grid .sw{border-radius:50%;width:38px;height:38px}
.acm .row{display:flex;gap:8px;flex-wrap:wrap}.acm .row>*{flex:1}
.acb{font:900 13px Orbitron,monospace;letter-spacing:.06em;border:0;border-radius:12px;padding:13px 14px;cursor:pointer;background:#ffd23f;color:#0b0820;text-align:center}
.acb.alt{background:#1d1748;color:#ecebff;border:2px solid #2c2468}.acb.red{background:#5a1830;color:#fff}
.acb.big{display:flex;align-items:center;gap:12px;text-align:left;background:#1d1748;color:#ecebff;border:2px solid #2c2468;font:600 15px 'Chakra Petch',sans-serif;letter-spacing:0}
.acb.big span{font-size:26px}.acb.big small{display:block;color:#9a94c9;font-size:12px}
.aclist{display:flex;flex-direction:column;gap:8px}
.acitem{display:flex;align-items:center;gap:10px;border:2px solid #2c2468;border-radius:14px;padding:8px 10px;background:#0b0820;cursor:pointer;color:#fff;font:600 16px 'Chakra Petch',sans-serif;text-align:left}
.acitem.on{border-color:#ffd23f}.acitem .acav{width:40px;height:40px;font-size:22px}.acitem small{display:block;color:#9a94c9;font-size:12px}
.acerr{color:#ff7a9a;font-weight:600;min-height:1.2em}
.achead{display:flex;align-items:center;gap:12px}.achead b{font:900 22px Orbitron,monospace}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
function modal(html,bind){const m=document.createElement('div');m.className='acm';m.innerHTML=`<div class="bx">${html}</div>`;document.body.appendChild(m);
  const close=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m)close()});m.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);bind&&bind(m,close);return close}
const av=(a,cls='')=>`<span class="acav ${cls}" style="border-color:${a.color};background:${a.color}22">${a.avatar}</span>`;
function bar(){const el=document.getElementById('acct');if(!el)return;const a=cur(),t=trophies();
  el.innerHTML=`<button class="acbar" id="acOpen">${av(a)}<span><b>${esc(a.name)}</b><small>${a.fresh?'Tap to create your account':`🏆 ${t.n} trophies · ${A.accounts.length>1?A.accounts.length+' players on this device':'Your account'}`}</small></span><span class="go">${a.fresh?'CREATE':'ACCOUNT'}</span></button>`;
  document.getElementById('acOpen').onclick=()=>cur().fresh?editor(cur(),true):menu()}

function menu(){const a=cur(),t=trophies(),kb=Math.ceil(bytes()/1024);
  modal(`<div class="achead">${av(a)}<div><b>${esc(a.name)}</b><p>🏆 ${t.n} trophies in ${t.g} games · ${a.pin?'🔒 PIN on':'🔓 no PIN'}</p></div></div>
    <button class="acb big" id="mEdit"><span>✏️</span><div>Edit my account<small>Name, avatar, colour and PIN</small></div></button>
    <button class="acb big" id="mSend"><span>📤</span><div>Use my account on another device<small>Makes a login code for your iPad, computer or a new phone</small></div></button>
    <button class="acb big" id="mLogin"><span>📥</span><div>Log in from another device<small>Paste your login code or open the file</small></div></button>
    <button class="acb big" id="mSwitch"><span>👥</span><div>Switch player<small>${A.accounts.length} account${A.accounts.length>1?'s':''} on this device · add a new one</small></div></button>
    <p style="font-size:12px;color:#9a94c9">Your progress is saved on this device (${kb} KB). Nobody else can see it.</p>
    <button class="acb alt" data-x>CLOSE</button>`,(m,close)=>{
    m.querySelector('#mEdit').onclick=()=>{close();editor(a)};m.querySelector('#mSend').onclick=()=>{close();send()};
    m.querySelector('#mLogin').onclick=()=>{close();loginUI()};m.querySelector('#mSwitch').onclick=()=>{close();switcher()}})}

function editor(a,first){let p={name:first&&a.name==='Player'?'':a.name,avatar:a.avatar,color:a.color};
  modal(`<h2>${first?'👤 Create your account':'✏️ Edit account'}</h2>${first?'<p>Your trophies, coins and saves from every game stay with your account.</p>':''}
    <label>Name<input id="eN" maxlength="14" value="${esc(p.name)}" placeholder="Your name"></label>
    <b>Avatar</b><div class="grid" id="eA">${AV.map(x=>`<button data-a="${x}" class="${x===p.avatar?'on':''}">${x}</button>`).join('')}</div>
    <b>Colour</b><div class="grid">${COL.map(c=>`<button class="sw ${c===p.color?'on':''}" data-c="${c}" style="background:${c}" aria-label="colour ${c}"></button>`).join('')}</div>
    <label><b>Secret PIN</b> (4 to 6 numbers)${a.pin?' · leave empty to keep your PIN':''}<input id="eP" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="••••"></label>
    <p style="font-size:13px">You need the PIN to log in on another device, and to switch to your account if other people use this device. Don't tell anyone, but tell a parent!</p>
    <div class="acerr" id="eE"></div><div class="row"><button class="acb alt" data-x>CANCEL</button><button class="acb" id="eOk">SAVE</button></div>`,(m,close)=>{
    m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{p.avatar=b.dataset.a;m.querySelectorAll('[data-a]').forEach(x=>x.classList.toggle('on',x===b))});
    m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{p.color=b.dataset.c;m.querySelectorAll('[data-c]').forEach(x=>x.classList.toggle('on',x===b))});
    m.querySelector('#eOk').onclick=async()=>{const name=m.querySelector('#eN').value.trim().slice(0,14),pin=m.querySelector('#eP').value.trim(),err=m.querySelector('#eE');
      if(!name){err.textContent='Type your name.';return}if(pin&&!/^\d{4,6}$/.test(pin)){err.textContent='The PIN must be 4 to 6 numbers.';return}
      if(!pin&&!a.pin){err.textContent='Choose a secret PIN so only you can log in.';return}
      if(pin)a.pin=await pinHash(a,pin);a.name=name;a.avatar=p.avatar;a.color=p.color;delete a.fresh;saveA();if(a.id===A.current)writeProfile(a);close();bar();if(first)toast('🎉 Account ready! Welcome, '+esc(name)+'!')}})}

function askPin(a,title,cb){modal(`<div class="achead">${av(a)}<div><b>${esc(a.name)}</b><p>${title}</p></div></div><input class="pin" id="pP" type="password" inputmode="numeric" maxlength="6" placeholder="PIN"><div class="acerr" id="pE"></div>
  <div class="row"><button class="acb alt" data-x>CANCEL</button><button class="acb" id="pOk">OK</button></div>`,(m,close)=>{const i=m.querySelector('#pP');setTimeout(()=>i.focus(),50);
  const go=async()=>{if(await checkPin(a,i.value.trim())){close();cb(i.value.trim())}else{m.querySelector('#pE').textContent='Wrong PIN, try again.';i.value=''}};m.querySelector('#pOk').onclick=go;i.onkeydown=e=>{if(e.key==='Enter')go()}})}

function switcher(){modal(`<h2>👥 Who is playing?</h2><div class="aclist">${A.accounts.map(a=>`<button class="acitem ${a.id===A.current?'on':''}" data-id="${a.id}">${av(a)}<div>${esc(a.name)}<small>${a.id===A.current?'Playing now':a.pin?'🔒 PIN':'Tap to play'}</small></div></button>`).join('')}</div>
  <button class="acb" id="sNew">＋ NEW ACCOUNT</button>${A.accounts.length>1?'<button class="acb red" id="sDel">🗑️ DELETE AN ACCOUNT</button>':''}<button class="acb alt" data-x>CLOSE</button>`,(m,close)=>{
  m.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{const a=A.accounts.find(x=>x.id===b.dataset.id);if(a.id===A.current){close();return}close();
    if(a.pin)askPin(a,'Type your PIN to play',()=>doSwitch(a.id));else doSwitch(a.id)});
  m.querySelector('#sNew').onclick=()=>{close();const id=newId(),a={id,name:'Player',avatar:AV[A.accounts.length%AV.length],color:COL[A.accounts.length%COL.length],pin:null,created:Date.now(),fresh:true};
    A.accounts.push(a);saveA();doSwitch(id,true)};
  const d=m.querySelector('#sDel');if(d)d.onclick=()=>{close();deleter()}})}
function doSwitch(id,fresh){try{switchTo(id,fresh)}catch(e){toast(e.message)}}
function deleter(){const others=A.accounts.filter(a=>a.id!==A.current);
  modal(`<h2>🗑️ Delete an account</h2><p>All its progress on this device is deleted. You can't delete the account you are playing with.</p><div class="aclist">${others.map(a=>`<button class="acitem" data-id="${a.id}">${av(a)}<div>${esc(a.name)}</div></button>`).join('')}</div><button class="acb alt" data-x>CANCEL</button>`,(m,close)=>{
  m.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{const a=A.accounts.find(x=>x.id===b.dataset.id);close();const kill=()=>{if(!confirm('Really delete '+a.name+' and all their progress?'))return;A.accounts=A.accounts.filter(x=>x!==a);localStorage.removeItem(P+'data:'+a.id);saveA();toast('Deleted '+esc(a.name))};
    a.pin?askPin(a,'Type the PIN to delete this account',kill):kill()})})}

function send(){const a=cur();if(!a.pin){toast('First choose a secret PIN for your account.');editor(a);return}
  askPin(a,'Type your PIN to make a login code',async pin=>{let code;try{code=await makeCode(pin)}catch(e){toast('Could not make the code: '+e.message);return}
    const file=new File([code],`kuzey-${a.name.replace(/[^\w-]/g,'')||'account'}.kuzey`,{type:'text/plain'}),canShare=navigator.canShare&&navigator.canShare({files:[file]});
    modal(`<h2>📤 Your login code</h2><p>On the other device, open Kuzey Arcade, tap your account bar → <b>Log in from another device</b>, then give it this code and your PIN.</p>
      ${canShare?'<button class="acb" id="cShare">📲 SEND WITH AIRDROP / MESSAGES</button>':''}<div class="row"><button class="acb ${canShare?'alt':''}" id="cCopy">📋 COPY CODE</button><button class="acb alt" id="cFile">💾 SAVE FILE</button></div>
      <textarea readonly id="cT">${code}</textarea><p style="font-size:12px;color:#9a94c9">The code holds all your progress right now (${Math.ceil(code.length/1024)} KB). It is locked with your PIN. Make a new code whenever you want to bring new progress across.</p>
      <button class="acb alt" data-x>DONE</button>`,(m)=>{
      const t=m.querySelector('#cT');m.querySelector('#cCopy').onclick=async()=>{try{await navigator.clipboard.writeText(code);toast('Code copied! Paste it on the other device.')}catch(e){t.select();document.execCommand('copy');toast('Code copied!')}};
      m.querySelector('#cFile').onclick=()=>{const u=URL.createObjectURL(file),l=document.createElement('a');l.href=u;l.download=file.name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)};
      const sh=m.querySelector('#cShare');if(sh)sh.onclick=()=>navigator.share({files:[file],title:'Kuzey Arcade login'}).catch(()=>{})})})}

function loginUI(){modal(`<h2>📥 Log in from another device</h2><p>On your other device: Account → <b>Use my account on another device</b>. Then paste the code here, or open the file it saved.</p>
  <textarea id="lC" placeholder="Paste your code here (it starts with KZ1.)"></textarea><button class="acb alt" id="lF">📂 OPEN A .kuzey FILE</button><input type="file" id="lFi" accept=".kuzey,.txt,text/plain" hidden>
  <input class="pin" id="lP" type="password" inputmode="numeric" maxlength="6" placeholder="PIN"><div class="acerr" id="lE"></div>
  <div class="row"><button class="acb alt" data-x>CANCEL</button><button class="acb" id="lOk">LOG IN</button></div>`,(m,close)=>{
  const c=m.querySelector('#lC'),fi=m.querySelector('#lFi'),err=m.querySelector('#lE');m.querySelector('#lF').onclick=()=>fi.click();fi.onchange=async()=>{if(fi.files[0])c.value=(await fi.files[0].text()).trim()};
  m.querySelector('#lOk').onclick=async()=>{err.textContent='';const b=m.querySelector('#lOk');b.disabled=true;b.textContent='CHECKING…';
    try{const p=await readCode(c.value,m.querySelector('#lP').value.trim());const ex=A.accounts.find(a=>a.id===p.acct.id);
      if(ex&&!confirm(`${p.acct.name} is already on this device. Replace its progress with the progress from the code (saved ${new Date(p.at).toLocaleString()})?`)){b.disabled=false;b.textContent='LOG IN';return}
      close();login(p)}catch(e){err.textContent=e.message;b.disabled=false;b.textContent='LOG IN'}}})}

function toast(html){const t=document.createElement('div');t.className='acm';t.style.cssText='inset:auto 0 auto 0;top:calc(16px + env(safe-area-inset-top,0px));background:none;pointer-events:none';
  t.innerHTML=`<div class="bx" style="width:auto;max-width:90%;border-color:#ffd23f;padding:12px 16px;font-weight:600">${html}</div>`;document.body.appendChild(t);setTimeout(()=>t.remove(),3200)}
window.KuzeyAccount={current:cur,menu,send,login:loginUI,switcher};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bar);else bar();
})();
