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

// ================= ONLINE ACCOUNTS (Supabase) =================
// Put your Supabase Project URL and its anon / publishable key here (Project Settings -> API). That key is meant to be
// public: the database only lets it call the kz_* functions from supabase-setup.sql. NEVER put the service_role / secret key here.
const CLOUD_URL='https://ahdidgzraaisooduipkt.supabase.co',CLOUD_KEY='sb_publishable_PMvvVoPQYgi9Awd4kmtz-Q_is5vBUfn';
function cloudCfg(){const t=get(P+'cloudtest',null);return t||{url:CLOUD_URL,key:CLOUD_KEY}}
const cloudOn=()=>!!cloudCfg().url&&!!cloudCfg().key;
const ERR={kz_taken:'That username is already taken. Try another one.',kz_bad_name:'Usernames are 3 to 20 letters, numbers or _ (no spaces).',kz_short_pass:'The password must be at least 6 characters.',
  kz_wrong:'Wrong username or password.',kz_slow_down:'Too many wrong tries. Wait 10 minutes and try again.',kz_logged_out:'You were logged out on this device. Log in again.',kz_conflict:'kz_conflict',kz_need_setup:'This needs the new database setup. Open supabase-setup.html, tap COPY and run it in Supabase again.',kz_too_big:'Your saves are too big to put online (over 8 MB). Delete a big Kuzey Craft world and try again.'};
async function rpc(fn,args){const c=cloudCfg(),h={'Content-Type':'application/json',apikey:c.key};if(c.key.startsWith('eyJ'))h.Authorization='Bearer '+c.key;
  let r;try{r=await fetch(c.url.replace(/\/+$/,'')+'/rest/v1/rpc/'+fn,{method:'POST',headers:h,body:JSON.stringify(args)})}catch(e){const x=new Error('No internet right now. Your progress is safe on this device.');x.offline=true;throw x}
  const j=await r.json().catch(()=>null);if(!r.ok){let m=(j&&(j.message||j.hint))||('Server error '+r.status);if(/Could not find the function/i.test(m))m='kz_need_setup';const x=new Error(ERR[m]||m);x.code=m;throw x}
  if(j&&j.error){const x=new Error(ERR[j.error]||j.error);x.code=j.error;throw x}return j}
function clean(d){const o={};for(const k of Object.keys(d).sort())if(!SKIP.some(p=>k.startsWith(p)))o[k]=d[k];return o}
const hashOf=d=>sha(JSON.stringify(clean(d)));
const devName=()=>(/iPad/.test(navigator.userAgent)?'iPad':/iPhone/.test(navigator.userAgent)?'iPhone':/Android/.test(navigator.userAgent)?'Android':/Mac/.test(navigator.userAgent)?'Mac':/Win/.test(navigator.userAgent)?'Windows':'Device');
const profOut=a=>({name:a.name,avatar:a.avatar,color:a.color});
function reloadA(){A=get(P+'list',A)}
let syncing=false,syncMsg='';
function setSync(msg){syncMsg=msg;const e=document.getElementById('acSync');if(e)e.textContent=msg}
function applyData(a,data){for(const k of liveKeys())localStorage.removeItem(k);for(const k in data)if(!SKIP.some(p=>k.startsWith(p)))localStorage.setItem(k,data[k]);writeProfile(a)}
async function pushNow(a,force){const snap=snapshot();const r=await rpc('kz_push',{p_token:a.cloud.token,p_profile:profOut(a),p_data:snap,p_base:a.cloud.base,p_force:!!force});
  reloadA();const b=A.accounts.find(x=>x.id===a.id);b.cloud.base=r.updated_at;b.cloud.hash=await hashOf(snap);b.cloud.at=Date.now();saveA();return b}
async function pullNow(a){const r=await rpc('kz_pull',{p_token:a.cloud.token});reloadA();const b=A.accounts.find(x=>x.id===a.id);
  if(r.profile&&r.profile.name){b.name=r.profile.name;b.avatar=r.profile.avatar||b.avatar;b.color=r.profile.color||b.color}
  applyData(b,r.data||{});b.cloud.base=r.updated_at;b.cloud.hash=await hashOf(r.data||{});b.cloud.at=Date.now();saveA();return b}
// bg = inside a game: only upload, never replace what is on the screen
async function sync(bg){if(syncing||!cloudOn())return;reloadA();let a=cur();if(!a||!a.cloud||!a.cloud.token)return;syncing=true;
  try{setSync('☁️ Syncing…');const meta=await rpc('kz_meta',{p_token:a.cloud.token});const h=await hashOf(snapshot());
    const localCh=h!==a.cloud.hash,remoteCh=meta.updated_at!==a.cloud.base;
    if(localCh&&!remoteCh){try{await pushNow(a)}catch(e){if(e.code!=='kz_conflict')throw e;if(!bg)await conflict(a)}}
    else if(!localCh&&remoteCh){if(!bg){await pullNow(a);location.reload();return}}
    else if(localCh&&remoteCh){if(!bg)await conflict(a)}
    else{a.cloud.at=Date.now();saveA()}
    setSync('☁️ Saved online · '+(cur().cloud?'just now':''))}
  catch(e){if(e.code==='kz_logged_out'){reloadA();const b=cur();b.cloud.token=null;saveA();setSync('☁️ Logged out · tap to log in')}else setSync(e.offline?'☁️ Offline · will sync later':'☁️ Could not sync');if(!bg&&!e.offline&&e.code!=='kz_logged_out')console.warn(e)}
  finally{syncing=false}}
async function conflict(a){// both this device and the online copy changed: if they are the same, nothing to do
  const r=await rpc('kz_pull',{p_token:a.cloud.token});const rh=await hashOf(r.data||{}),lh=await hashOf(snapshot());
  if(rh===lh){reloadA();const b=cur();b.cloud.base=r.updated_at;b.cloud.hash=lh;saveA();return}
  const t=trophies(),rt=Object.entries(r.data||{}).filter(([k])=>k.startsWith('kuzey:ach:')).reduce((n,[k,v])=>{try{return n+Object.keys(JSON.parse(v)).length}catch(e){return n}},0);
  return new Promise(res=>modal(`<h2>☁️ Which progress do you want?</h2><p>You played on another device too, so there are two different saves.</p>
    <button class="acb big" id="kL"><span>📱</span><div>Keep THIS device<small>🏆 ${t.n} trophies · the online copy gets replaced</small></div></button>
    <button class="acb big" id="kR"><span>☁️</span><div>Use the ONLINE copy<small>🏆 ${rt} trophies · saved ${new Date(r.updated_at).toLocaleString()}</small></div></button>`,(m,close)=>{
    m.querySelector('#kL').onclick=async()=>{close();await pushNow(cur(),true);res()};m.querySelector('#kR').onclick=async()=>{close();await pullNow(cur());location.reload()}}))}
// log in to an online account on this device
async function cloudLogin(user,pass){const r=await rpc('kz_login',{p_user:user,p_pass:pass,p_device:devName()});const pr=r.profile||{};
  const local=A.accounts.find(a=>a.cloud&&a.cloud.user===r.username);
  const acct={id:local?local.id:newId(),name:pr.name||r.username,avatar:pr.avatar||'🦊',color:pr.color||'#3ef0ff',pin:local?local.pin:null,created:local?local.created:Date.now(),
    cloud:{user:r.username,token:r.token,base:r.updated_at,hash:await hashOf(r.data||{}),at:Date.now()}};
  login({acct,data:r.data||{}})}
async function cloudSignup(user,pass){const a=cur(),snap=snapshot();const r=await rpc('kz_signup',{p_user:user,p_pass:pass,p_profile:profOut(a),p_data:snap,p_device:devName()});
  reloadA();const b=cur();b.cloud={user:r.username,token:r.token,base:r.updated_at,hash:await hashOf(snap),at:Date.now()};delete b.fresh;saveA();return b}
function cloudUI(){const a=cur();if(!cloudOn()){modal(`<h2>☁️ Online accounts</h2><p>Online accounts are not switched on yet. (The arcade owner has to add the Supabase settings.)</p><button class="acb alt" data-x>OK</button>`);return}
  if(a.cloud&&a.cloud.token){modal(`<h2>☁️ Online account</h2><div class="achead">${av(a)}<div><b>${esc(a.cloud.user)}</b><p id="cuS">${syncMsg||'☁️ Linked'}</p></div></div>
    <p>Your progress saves online by itself. On another device, open Kuzey Arcade → Account → <b>Log in</b> with <b>${esc(a.cloud.user)}</b> and your password.</p>
    <button class="acb" id="cuSync">🔄 SYNC NOW</button><button class="acb alt" id="cuPass">🔑 CHANGE PASSWORD</button><button class="acb red" id="cuOut">🚪 LOG OUT OF THIS DEVICE</button><button class="acb alt" data-x>CLOSE</button>`,(m,close)=>{
    m.querySelector('#cuSync').onclick=async()=>{const s=m.querySelector('#cuS');s.textContent='☁️ Syncing…';await sync(false);s.textContent=syncMsg};
    m.querySelector('#cuPass').onclick=()=>{close();passUI(a)};
    m.querySelector('#cuOut').onclick=async()=>{if(!confirm('Log out of '+a.cloud.user+' on this device? Your progress stays online, and you can log in again any time.'))return;close();
      await sync(false).catch(()=>{});try{await rpc('kz_logout',{p_token:cur().cloud.token})}catch(e){}reloadA();const b=cur();delete b.cloud;saveA();bar();toast('Logged out of the online account.')}});return}
  if(a.cloud&&!a.cloud.token){cloudForm('login',a.cloud.user);return}
  cloudForm(a.fresh||trophies().n===0?'login':'signup')}
function cloudForm(mode,user=''){modal(`<h2>☁️ Online account</h2><div class="tabs2 row"><button class="acb ${mode==='login'?'':'alt'}" data-m="login">LOG IN</button><button class="acb ${mode==='signup'?'':'alt'}" data-m="signup">CREATE</button></div>
  <p id="cfP">${mode==='login'?'Log in with your online account. Your progress comes to this device.':'Make an online account. Your progress on this device is saved online, and you can log in on any device.'}</p>
  <label>Username<input id="cfU" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" value="${esc(user)}" placeholder="like kuzey_10"></label>
  <label>Password<input id="cfW" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="at least 6 characters"></label>
  ${mode==='signup'?'<label>Password again<input id="cfW2" type="password" autocomplete="new-password"></label><p style="font-size:13px">💡 Tell a parent your username and password so you don\'t forget them. Don\'t use your real full name.</p>':''}
  <div class="acerr" id="cfE"></div><div class="row"><button class="acb alt" data-x>CANCEL</button><button class="acb" id="cfOk">${mode==='login'?'LOG IN':'CREATE'}</button></div>`,(m,close)=>{
  m.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{close();cloudForm(b.dataset.m,m.querySelector('#cfU').value)});
  m.querySelector('#cfOk').onclick=async()=>{const u=m.querySelector('#cfU').value.trim().toLowerCase(),w=m.querySelector('#cfW').value,err=m.querySelector('#cfE'),b=m.querySelector('#cfOk');err.textContent='';
    if(!/^[a-z0-9_]{3,20}$/.test(u)){err.textContent=ERR.kz_bad_name;return}if(w.length<6){err.textContent=ERR.kz_short_pass;return}
    if(mode==='signup'&&w!==m.querySelector('#cfW2').value){err.textContent='The two passwords are different.';return}
    b.disabled=true;b.textContent='…';
    try{if(mode==='login'){await cloudLogin(u,w)}else{await cloudSignup(u,w);close();bar();toast('☁️ Online account made! Your progress is saved online.')}}
    catch(e){err.textContent=e.message;b.disabled=false;b.textContent=mode==='login'?'LOG IN':'CREATE'}}})}
function passUI(a){modal(`<h2>🔑 Change password</h2><label>Old password<input id="pO" type="password" autocomplete="current-password"></label><label>New password<input id="pN" type="password" autocomplete="new-password"></label>
  <p style="font-size:13px">Your other devices will need to log in again with the new password.</p><div class="acerr" id="pE"></div><div class="row"><button class="acb alt" data-x>CANCEL</button><button class="acb" id="pOk">CHANGE</button></div>`,(m,close)=>{
  m.querySelector('#pOk').onclick=async()=>{const err=m.querySelector('#pE');try{const nw=m.querySelector('#pN').value;await rpc('kz_change_pass',{p_user:a.cloud.user,p_old:m.querySelector('#pO').value,p_new:nw});close();
    await cloudLogin(a.cloud.user,nw)}catch(e){err.textContent=e.message}}})}

// ================= FRIENDS =================
const linked=()=>{const a=cur();return cloudOn()&&a&&a.cloud&&a.cloud.token?a:null};
let frReq=0,frTab='friends',frList=null,frBusy=false;
function frBadge(){const b=document.getElementById('frN');if(b){b.textContent=frReq;b.hidden=!frReq}}
async function frPoll(){const a=linked();if(!a||document.hidden)return;try{const r=await rpc('kz_friend_count',{p_token:a.cloud.token});const before=frReq;frReq=r.requests;frBadge();
  if(frReq>before&&before>=0&&frPoll.done)toast('👋 You have a new friend invite!');frPoll.done=true}catch(e){}}
function friendsUI(){const a=linked();
  if(!cloudOn()){toast('Online accounts are not switched on yet.');return}
  if(!a){modal(`<h2>👥 Friends</h2><p>To add friends you need an <b>online account</b>. Then you can see everyone in Kuzey Arcade and invite them.</p><button class="acb" id="fGo">☁️ MAKE OR LOG IN TO AN ONLINE ACCOUNT</button><button class="acb alt" data-x>CLOSE</button>`,(m,close)=>{m.querySelector('#fGo').onclick=()=>{close();const c=cur();c.fresh?editor(c,true):cloudForm(c.cloud?'login':'signup',c.cloud?c.cloud.user:'')}});return}
  modal(`<div class="achead">${av(a)}<div><b>👥 Friends</b><p>@${esc(a.cloud.user)}</p></div></div>
    <div class="row frtabs"><button class="acb" data-ft="friends">FRIENDS</button><button class="acb" data-ft="invites">INVITES <span class="frdot" id="frT"></span></button><button class="acb" data-ft="all">EVERYONE</button></div>
    <input id="frQ" placeholder="🔍 Search by name" autocapitalize="none" autocorrect="off" spellcheck="false" hidden>
    <div class="aclist" id="frL"><p>Loading…</p></div><button class="acb alt" data-x>CLOSE</button>`,(m,close)=>{
    const L=m.querySelector('#frL'),Q=m.querySelector('#frQ');let t=null;
    const tabs=()=>m.querySelectorAll('[data-ft]').forEach(b=>b.classList.toggle('alt',b.dataset.ft!==frTab));
    const row=p=>{const btn=p.rel==='friend'?`<span class="frok">✓ Friends</span><button class="frx" data-act="remove" aria-label="Remove friend">✕</button>`
        :p.rel==='sent'?`<button class="frb alt" data-act="remove">Invited · cancel</button>`
        :p.rel==='received'?`<button class="frb" data-act="accept">✓ Accept</button><button class="frb alt" data-act="no">No</button>`
        :`<button class="frb" data-act="invite">＋ Invite</button>`;
      return`<div class="acitem frrow" data-u="${esc(p.username)}">${av(p)}<div class="frname">${esc(p.name)} <i class="frol ${p.online?'on':''}" title="${p.online?'Online now':'Offline'}"></i><small>@${esc(p.username)}${p.online?' · online now':''}</small></div><div class="fract">${btn}</div></div>`};
    function draw(){tabs();Q.hidden=frTab!=='all';if(!frList){L.innerHTML='<p>Loading…</p>';return}
      const inv=frList.filter(p=>p.rel==='received');const d=m.querySelector('#frT');d.textContent=inv.length||'';d.hidden=!inv.length;
      let list=frTab==='friends'?frList.filter(p=>p.rel==='friend'):frTab==='invites'?frList.filter(p=>p.rel==='received'||p.rel==='sent'):frList;
      L.innerHTML=list.length?list.map(row).join(''):`<p>${frTab==='friends'?'No friends yet. Go to <b>EVERYONE</b> and invite someone!':frTab==='invites'?'No invites right now.':'Nobody found.'}</p>`;
      L.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act(b.closest('[data-u]').dataset.u,b.dataset.act,b))}
    async function load(){try{frList=await rpc('kz_people',{p_token:a.cloud.token,p_search:frTab==='all'?Q.value:''});frReq=frList.filter(p=>p.rel==='received').length;frBadge();draw()}
      catch(e){L.innerHTML=`<p class="acerr">${esc(e.message)}</p>`}}
    async function act(u,what,b){if(frBusy)return;const p=frList.find(x=>x.username===u);
      if(what==='remove'&&p.rel==='friend'&&!confirm(`Stop being friends with ${p.name}?`))return;
      frBusy=true;b.disabled=true;try{
        if(what==='invite'){p.rel=await rpc('kz_friend_invite',{p_token:a.cloud.token,p_to:u});toast(p.rel==='friend'?`🎉 You and ${esc(p.name)} are friends now!`:`📨 Invite sent to ${esc(p.name)}`)}
        else if(what==='accept'){p.rel=await rpc('kz_friend_answer',{p_token:a.cloud.token,p_from:u,p_accept:true});toast(`🎉 You and ${esc(p.name)} are friends now!`)}
        else if(what==='no'){p.rel=await rpc('kz_friend_answer',{p_token:a.cloud.token,p_from:u,p_accept:false})}
        else p.rel=await rpc('kz_friend_remove',{p_token:a.cloud.token,p_other:u});
        frReq=frList.filter(x=>x.rel==='received').length;frBadge()}catch(e){toast(esc(e.message))}frBusy=false;draw()}
    m.querySelectorAll('[data-ft]').forEach(b=>b.onclick=()=>{frTab=b.dataset.ft;if(frTab==='all'&&Q.value){Q.value='';load()}draw()});
    Q.oninput=()=>{clearTimeout(t);t=setTimeout(load,300)};
    if(frReq>0)frTab='invites';draw();load();
    const iv=setInterval(()=>{if(!document.body.contains(m))return clearInterval(iv);if(!document.hidden&&!frBusy&&!(frTab==='all'&&Q.value))load()},20000)})}
ERR.kz_no_user='That player does not exist any more.';ERR.kz_too_many='You have 50 invites waiting already. Wait for some answers first.';

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
.achead{display:flex;align-items:center;gap:12px}.achead b{font:900 22px Orbitron,monospace}
.acrow{display:flex;gap:10px;margin-top:14px}.acrow .acbar{margin-top:0;flex:1;min-width:0}
.frbtn{position:relative;flex:none;width:96px;border:2px solid var(--line,#2c2468);background:var(--panel,#151036);border-radius:16px;color:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:900 11px Orbitron,monospace;letter-spacing:.06em}
.frbtn span{font-size:28px}.frbtn:hover{border-color:var(--pink,#ff3d9a)}
.frbtn b,.frdot{position:absolute;top:-6px;right:-6px;min-width:22px;height:22px;border-radius:11px;background:#ff3d5a;color:#fff;font:900 12px system-ui;display:grid;place-items:center;padding:0 5px}
.frdot{position:static;display:inline-grid;margin-left:4px}.frbtn b[hidden],.frdot[hidden]{display:none}
.frtabs .acb{padding:10px 6px;font-size:11px}
.frrow{cursor:default}.frname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.fract{display:flex;gap:6px;align-items:center;flex:none}
.frb{border:0;border-radius:10px;padding:9px 10px;font:900 11px Orbitron,monospace;background:#ffd23f;color:#0b0820;cursor:pointer;white-space:nowrap}.frb.alt{background:#1d1748;color:#ecebff;border:2px solid #2c2468}
.frx{border:0;background:none;color:#9a94c9;font-size:18px;cursor:pointer;padding:4px}.frok{color:#5cf2b4;font-weight:600;font-size:13px;white-space:nowrap}
.frol{display:inline-block;width:9px;height:9px;border-radius:50%;background:#55507a;margin-left:2px}.frol.on{background:#5cf2b4;box-shadow:0 0 6px #5cf2b4}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
function modal(html,bind){const m=document.createElement('div');m.className='acm';m.innerHTML=`<div class="bx">${html}</div>`;document.body.appendChild(m);
  const close=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m)close()});m.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);bind&&bind(m,close);return close}
const av=(a,cls='')=>`<span class="acav ${cls}" style="border-color:${a.color};background:${a.color}22">${a.avatar}</span>`;
function bar(){const el=document.getElementById('acct');if(!el)return;const a=cur(),t=trophies();
  el.innerHTML=`<div class="acrow"><button class="acbar" id="acOpen">${av(a)}<span><b>${esc(a.name)}</b><small>${a.fresh?'Tap to create your account':`🏆 ${t.n} trophies · ${A.accounts.length>1?A.accounts.length+' players on this device':'Your account'}`}<br><span id="acSync">${a.cloud?(syncMsg||(a.cloud.token?'☁️ Online: '+esc(a.cloud.user):'☁️ Logged out · tap to log in')):cloudOn()&&!a.fresh?'☁️ Not online yet · tap to save online':''}</span></small></span><span class="go">${a.fresh?'CREATE':'ACCOUNT'}</span></button>${cloudOn()?'<button class="frbtn" id="frOpen" aria-label="Friends"><span>👥</span>FRIENDS<b id="frN" hidden>0</b></button>':''}</div>`;const fo=document.getElementById('frOpen');if(fo)fo.onclick=friendsUI;frBadge();
  document.getElementById('acOpen').onclick=()=>{const c=cur();c.fresh?editor(c,true):c.cloud&&!c.cloud.token?cloudForm('login',c.cloud.user):menu()}}

function menu(){const a=cur(),t=trophies(),kb=Math.ceil(bytes()/1024);
  modal(`<div class="achead">${av(a)}<div><b>${esc(a.name)}</b><p>🏆 ${t.n} trophies in ${t.g} games · ${a.pin?'🔒 PIN on':'🔓 no PIN'}</p></div></div>
    ${cloudOn()?`<button class="acb big" id="mCloud" style="border-color:#3ef0ff"><span>☁️</span><div>${a.cloud&&a.cloud.token?'Online account: '+esc(a.cloud.user):'Online account'}<small>${a.cloud&&a.cloud.token?'Saved online · sync, password, log out':'Save online and log in on any device with a password'}</small></div></button>`:''}
    <button class="acb big" id="mEdit"><span>✏️</span><div>Edit my account<small>Name, avatar, colour and PIN</small></div></button>
    <button class="acb big" id="mSend"><span>📤</span><div>Login code (no internet needed)<small>Move your account to another device with a code or AirDrop</small></div></button>
    <button class="acb big" id="mLogin"><span>📥</span><div>Log in with a code<small>Paste a login code or open a .kuzey file</small></div></button>
    <button class="acb big" id="mSwitch"><span>👥</span><div>Switch player<small>${A.accounts.length} account${A.accounts.length>1?'s':''} on this device · add a new one</small></div></button>
    <p style="font-size:12px;color:#9a94c9">Your progress is saved on this device (${kb} KB). Nobody else can see it.</p>
    <button class="acb alt" data-x>CLOSE</button>`,(m,close)=>{
    m.querySelector('#mEdit').onclick=()=>{close();editor(a)};m.querySelector('#mSend').onclick=()=>{close();send()};
    m.querySelector('#mLogin').onclick=()=>{close();loginUI()};const mc=m.querySelector('#mCloud');if(mc)mc.onclick=()=>{close();cloudUI()};m.querySelector('#mSwitch').onclick=()=>{close();switcher()}})}

function editor(a,first){let p={name:first&&a.name==='Player'?'':a.name,avatar:a.avatar,color:a.color};
  modal(`<h2>${first?'👤 Create your account':'✏️ Edit account'}</h2>${first?'<p>Your trophies, coins and saves from every game stay with your account.</p>'+(cloudOn()?'<button class="acb alt" id="eCl">☁️ I ALREADY HAVE AN ONLINE ACCOUNT</button>':''):''}
    <label>Name<input id="eN" maxlength="14" value="${esc(p.name)}" placeholder="Your name"></label>
    <b>Avatar</b><div class="grid" id="eA">${AV.map(x=>`<button data-a="${x}" class="${x===p.avatar?'on':''}">${x}</button>`).join('')}</div>
    <b>Colour</b><div class="grid">${COL.map(c=>`<button class="sw ${c===p.color?'on':''}" data-c="${c}" style="background:${c}" aria-label="colour ${c}"></button>`).join('')}</div>
    <label><b>Secret PIN</b> (4 to 6 numbers, optional)${a.pin?' · leave empty to keep your PIN':''}<input id="eP" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="••••"></label>
    <p style="font-size:13px">You need the PIN to log in on another device, and to switch to your account if other people use this device. Don't tell anyone, but tell a parent!</p>
    <div class="acerr" id="eE"></div><div class="row"><button class="acb alt" data-x>CANCEL</button><button class="acb" id="eOk">SAVE</button></div>`,(m,close)=>{
    const ecl=m.querySelector('#eCl');if(ecl)ecl.onclick=()=>{close();cloudForm('login')};
    m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{p.avatar=b.dataset.a;m.querySelectorAll('[data-a]').forEach(x=>x.classList.toggle('on',x===b))});
    m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{p.color=b.dataset.c;m.querySelectorAll('[data-c]').forEach(x=>x.classList.toggle('on',x===b))});
    m.querySelector('#eOk').onclick=async()=>{const name=m.querySelector('#eN').value.trim().slice(0,14),pin=m.querySelector('#eP').value.trim(),err=m.querySelector('#eE');
      if(!name){err.textContent='Type your name.';return}if(pin&&!/^\d{4,6}$/.test(pin)){err.textContent='The PIN must be 4 to 6 numbers.';return}
      if(pin)a.pin=await pinHash(a,pin);a.name=name;a.avatar=p.avatar;a.color=p.color;delete a.fresh;saveA();if(a.id===A.current)writeProfile(a);close();bar();if(first){toast('🎉 Account ready! Welcome, '+esc(name)+'!');if(cloudOn()&&!a.cloud)setTimeout(()=>cloudForm('signup'),600)}else if(a.cloud)sync(true)}})}

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
window.KuzeyAccount={current:cur,menu,send,login:loginUI,switcher,cloud:cloudUI,sync,friends:friendsUI};
const hub=()=>!!document.getElementById('acct');
function start(){bar();if(hub()){sync(false);frPoll();setInterval(frPoll,30000)}setInterval(()=>sync(!hub()),hub()?60000:90000)}
document.addEventListener('visibilitychange',()=>{if(document.hidden)sync(true);else if(hub())sync(false)});
addEventListener('online',()=>sync(!hub()));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
