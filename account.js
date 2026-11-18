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
    const row=p=>{const btn=p.rel==='friend'?`<button class="frb" data-act="play">🎮 PLAY</button><button class="frx" data-act="remove" aria-label="Remove friend">✕</button>`
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
    async function act(u,what,b){if(frBusy)return;const p=frList.find(x=>x.username===u);if(what==='play'){close();pickGame(p);return}
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

// ================= MULTIPLAYER: invite a friend, then meet in a live room =================
// Games say they can be played together with KuzeyAccount.registerGame(id,{start(room)}). Until a game does, the lobby says it is coming soon.
const MPG=[['starsiege','Star Siege','🚀'],['skyraiders','Sky Raiders','✈️'],['galaxyguardian','Galaxy Guardian','👾'],['neonswarm','Neon Swarm','🔷'],['monstersurvivors','Monster Survivors','🧟'],
 ['tankcommander','Tank Commander','🛡️'],['dodger','Space Dodger','☄️'],['temples','Five Temples','🏛️'],['voidbridge','Void Bridge','🌉'],['bastion','Bastion Defense','🏰'],['roborampart','Robo Rampart','🤖'],
 ['castlesiege','Castle Siege','🏯'],['cardquest','Card Quest','🃏'],['crypt','Crypt Crawler','💀'],['turbotrails','Turbo Trails','🏎️'],['ninjarun','Ninja Run','🥷'],['pixelpeaks','Pixel Peaks','⛰️'],
 ['minigolf','Mini Golf World','⛳'],['goalrush','Goal Rush','⚽'],['pinballplanet','Pinball Planet','🪐'],['gemcascade','Gem Cascade','💎'],['stack','Tower Stack','🧱'],['laser','Laser Labyrinth','🔦'],
 ['words','Word Detective','🔎'],['beatblaster','Beat Blaster','🎵'],['bonjourparis','Bonjour Paris','🗼'],['snake','Neon Snake Rush','🐍'],['farm','Little Farmstead','🌾'],['gearworks','Gear Works','⚙️'],['craft','Kuzey Craft','⛏️']];
const MODES={coop:['🤝','Fight together'],race:['🏁','Race']};
const gameInfo=id=>MPG.find(g=>g[0]===id)||[id,id,'🎮'];
const READY={starsiege:'starsiege.html',stack:'stack.html',gemcascade:'gemcascade.html',ninjarun:'ninjarun.html',galaxyguardian:'galaxyguardian.html',neonswarm:'neonswarm.html',words:'words.html',laser:'laser.html',bonjourparis:'bonjourparis.html',beatblaster:'beatblaster.html',pinballplanet:'pinballplanet.html',turbotrails:'turbotrails.html',pixelpeaks:'pixelpeaks.html',dodger:'dodger.html'};// games that can really be played together: id -> page
let invSeen={},inbox=[],lobby=null;
// ---- check for invites every few seconds (friend invites + game invites) ----
async function poll(){const a=linked();if(!a||document.hidden)return;try{const r=await rpc('kz_inbox',{p_token:a.cloud.token});
  const before=frReq;frReq=r.requests;frBadge();if(frReq>before&&poll.done)toast('👋 You have a new friend invite!');poll.done=true;
  inbox=r.invites||[];if(popOpen&&!inbox.some(i=>i.id===popOpen.id)){popOpen.close();popOpen=null}
  const i=inbox[0];if(i&&!invSeen[i.id]&&!lobby&&!popOpen){invSeen[i.id]=1;invitePop(i)}}catch(e){}}
let popOpen=null;
function invitePop(i){const g=gameInfo(i.game),md=MODES[i.mode];try{SFXping()}catch(e){}
  modal(`<div class="mpinv"><div class="achead">${av(i)}<div><b>${esc(i.name)}</b><p>wants to play with you!</p></div></div>
    <div class="mpgame"><span>${g[2]}</span><div><b>${esc(g[1])}</b><small>${md[0]} ${md[1]}</small></div></div>
    <div class="row"><button class="acb alt" id="ivNo">NO THANKS</button><button class="acb" id="ivGo">🎮 JOIN</button></div></div>`,(m,close)=>{
    const t=setTimeout(()=>{close();popOpen=null},110000);popOpen={id:i.id,close:()=>{clearTimeout(t);close()}};
    m.querySelector('#ivNo').onclick=async()=>{clearTimeout(t);close();popOpen=null;try{await rpc('kz_invite_answer',{p_token:linked().cloud.token,p_id:i.id,p_accept:false})}catch(e){}};
    m.querySelector('#ivGo').onclick=async()=>{clearTimeout(t);close();popOpen=null;try{const r=await rpc('kz_invite_answer',{p_token:linked().cloud.token,p_id:i.id,p_accept:true});openLobby({room:r.room,game:r.game,mode:r.mode,host:r.from,friend:i})}
      catch(e){toast(e.code==='kz_invite_gone'?'That invite is over. Ask your friend to invite you again!':esc(e.message))}}})}
function SFXping(){const K=window.KIT;if(K&&K.sfx)K.sfx.power()}
// ---- the MULTIPLAYER button: friends list -> game -> mode -> invite ----
function mpUI(preGame){const a=linked();if(!a){friendsUI();return}
  modal(`<h2>🎮 Multiplayer</h2><p>Who do you want to play with?</p><div class="aclist" id="mpL"><p>Loading friends…</p></div><button class="acb alt" data-x>CLOSE</button>`,async(m,close)=>{
    const L=m.querySelector('#mpL');let list;try{list=(await rpc('kz_people',{p_token:a.cloud.token,p_search:''})).filter(p=>p.rel==='friend')}catch(e){L.innerHTML=`<p class="acerr">${esc(e.message)}</p>`;return}
    list.sort((x,y)=>(y.online-x.online));
    L.innerHTML=list.length?list.map(p=>`<button class="acitem" data-u="${esc(p.username)}">${av(p)}<div class="frname">${esc(p.name)} <i class="frol ${p.online?'on':''}"></i><small>${p.online?'Online now':'Offline · they will only see it if they open Kuzey Arcade'}</small></div><span class="frb">INVITE</span></button>`).join('')
      :`<p>You have no friends yet. Tap <b>👥 FRIENDS</b> → <b>EVERYONE</b> and invite someone first!</p><button class="acb" id="mpF">👥 FIND FRIENDS</button>`;
    const f=m.querySelector('#mpF');if(f)f.onclick=()=>{close();frTab='all';friendsUI()};
    L.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{const p=list.find(x=>x.username===b.dataset.u);close();preGame?pickMode(p,preGame):pickGame(p)})})}
function pickGame(p){modal(`<div class="achead">${av(p)}<div><b>${esc(p.name)}</b><p>Which game?</p></div></div><div class="mpgrid">${MPG.map(g=>`<button data-g="${g[0]}"><span>${g[2]}</span>${esc(g[1])}${READY[g[0]]?'':'<small>soon</small>'}</button>`).join('')}</div><button class="acb alt" data-x>BACK</button>`,(m,close)=>{
  m.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{close();pickMode(p,b.dataset.g)})})}
function pickMode(p,game){const g=gameInfo(game);modal(`<div class="mpgame"><span>${g[2]}</span><div><b>${esc(g[1])}</b><small>with ${esc(p.name)}</small></div></div>
  <button class="acb big" data-md="coop"><span>🤝</span><div>Fight together<small>Same team: help each other win</small></div></button>
  <button class="acb big" data-md="race"><span>🏁</span><div>Race<small>Who is the best? First one wins</small></div></button><button class="acb alt" data-x>BACK</button>`,(m,close)=>{
  m.querySelectorAll('[data-md]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await rpc('kz_game_invite',{p_token:linked().cloud.token,p_to:p.username,p_game:game,p_mode:b.dataset.md});close();
    openLobby({room:r.room,game,mode:b.dataset.md,host:linked().cloud.user,friend:p,inviteId:r.id})}catch(e){b.disabled=false;toast(esc(e.message))}})})}
// ---- the live room ----
let SB=null;function loadSB(){return new Promise((ok,no)=>{if(window.supabase)return ok();const s=document.createElement('script');s.src='supabase.js';s.onload=ok;s.onerror=()=>no(new Error('Could not load the multiplayer part. Check the internet.'));document.head.appendChild(s)})}
async function openLobby(o){const a=linked();if(!a)return;if(lobby)lobby.leave();const g=gameInfo(o.game),md=MODES[o.mode],me=a.cloud.user,host=o.host===me;
  let close=modal(`<h2>🎮 ${esc(g[1])}</h2><p>${md[0]} ${md[1]}</p><div class="mpplayers" id="lbP"></div><p id="lbS" class="mpstat">Connecting…</p><p id="lbN" class="mpnote" hidden></p>
    <button class="acb" id="lbR" disabled>✋ I'M READY</button><button class="acb alt" id="lbX">LEAVE</button>`,()=>{});
  const M=[...document.querySelectorAll('.acm')].pop();M.dataset.sticky=1;const P=M.querySelector('#lbP'),S=M.querySelector('#lbS'),R=M.querySelector('#lbR');
  let ready=false,ch=null,iv=null,done=false,started=false,people={},had=false;const N=M.querySelector('#lbN');
  const L=lobby={leave(){if(done)return;done=true;clearInterval(iv);try{ch&&ch.send({type:'broadcast',event:'bye',payload:{u:me}});ch&&SB.removeChannel(ch)}catch(e){}lobby=null;close()},o};
  M.querySelector('#lbX').onclick=async()=>{if(host&&o.inviteId&&!Object.keys(people).some(k=>k!==me))try{await rpc('kz_invite_status',{p_token:a.cloud.token,p_id:o.inviteId,p_cancel:true})}catch(e){}L.leave()};
  const draw=()=>{const list=[{u:me,name:a.name,avatar:a.avatar,color:a.color,ready}];const other=Object.values(people).find(p=>p.u!==me);
    if(other)list.push(other);else list.push({u:'',name:o.friend?o.friend.name:'Friend',avatar:o.friend?o.friend.avatar:'❔',color:'#55507a',wait:true});
    P.innerHTML=list.map(p=>`<div class="mpp ${p.wait?'wait':''}">${av(p)}<b>${esc(p.name)}</b><small>${p.wait?'⏳ not here yet':p.ready?'✅ READY':'…getting ready'}</small></div>`).join('<span class="mpvs">'+(o.mode==='race'?'VS':'＋')+'</span>');
    R.disabled=!other;R.textContent=ready?'✅ READY! (tap to wait)':'✋ I\'M READY';
    if(other&&ready&&other.ready&&!started){started=true;countdown()}};
  async function countdown(){for(const n of[3,2,1]){if(done)return;S.innerHTML=`<span class="mpcd">${n}</span>`;SFXping();await new Promise(r=>setTimeout(r,800))}if(done)return;
    const G=READY[o.game];if(G){const other=Object.values(people).find(p=>p.u!==me)||{};L.leave();location.href=`${G}?mp=${encodeURIComponent(o.room)}&mm=${o.mode}&h=${host?1:0}&fn=${encodeURIComponent(other.name||'')}`;return}
    else if(location.pathname.endsWith('/'+o.game+'.html')||!READY[o.game]){N.innerHTML=`🛠️ <b>${esc(g[1])}</b> multiplayer is being built right now. You are connected, so it will work here as soon as the game part is ready!`;N.hidden=false;started=false;ready=false;track();draw()}}
  const track=()=>ch&&ch.track({u:me,name:a.name,avatar:a.avatar,color:a.color,ready});
  R.onclick=()=>{ready=!ready;track();draw()};draw();
  try{await loadSB();if(!SB){const c=cloudCfg();SB=supabase.createClient(c.rtUrl||c.url,c.rtKey||c.key,{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:40}}})}}catch(e){S.textContent=e.message;return}
  ch=SB.channel('kz:'+o.room,{config:{broadcast:{self:false},presence:{key:me}}});
  ch.on('presence',{event:'sync'},()=>{people={};const st=ch.presenceState();for(const k in st){const p=st[k][st[k].length-1];if(p)people[k]=p}
      const other=Object.values(people).find(p=>p.u!==me);if(other)had=true;S.textContent=other?`${other.name} is here! Tap READY when you are.`:had?'Your friend left the room.':(host?`Waiting for ${o.friend?o.friend.name:'your friend'} to join…`:'Joining…');draw()})
    .on('broadcast',{event:'bye'},({payload})=>{if(payload.u!==me){S.textContent='Your friend left the room.';ready=false;track()}})
    .subscribe(s=>{if(s==='SUBSCRIBED'){track();if(!Object.keys(people).length)S.textContent=host?`Waiting for ${o.friend?o.friend.name:'your friend'} to answer…`:'Joining…'}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')S.textContent='Connection problem. Check the internet and try again.'});
  if(host&&o.inviteId)iv=setInterval(async()=>{if(Object.values(people).some(p=>p.u!==me)){clearInterval(iv);return}try{const st=await rpc('kz_invite_status',{p_token:a.cloud.token,p_id:o.inviteId});
      if(st==='declined'){clearInterval(iv);S.textContent=`${o.friend.name} said no this time.`}else if(st==='expired'){clearInterval(iv);S.textContent=`${o.friend.name} didn't answer. Try again later!`}}catch(e){}},2500)}
ERR.kz_not_friends='You can only invite friends.';ERR.kz_invite_gone='That invite is over.';

// ---- live connection inside a game: KuzeyAccount.net(room) -> {me,send(type,data),on(type,fn),onPeer(fn),onLeave(fn),peer(),leave()} ----
async function net(room){const a=linked();if(!a)throw new Error('Log in to your online account first.');await loadSB();
  if(!SB){const c=cloudCfg();SB=supabase.createClient(c.rtUrl||c.url,c.rtKey||c.key,{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:40}}})}
  const me=a.cloud.user,H={},cb={peer:[],leave:[]};let peer=null,ok=false;
  const ch=SB.channel('kz:'+room+':play',{config:{broadcast:{self:false},presence:{key:me}}});
  ch.on('broadcast',{event:'m'},({payload})=>{const f=H[payload.e];if(f)try{f(payload.d)}catch(e){console.error(e)}})
    .on('presence',{event:'sync'},()=>{const st=ch.presenceState();let o=null;for(const k in st)if(k!==me&&st[k].length)o=st[k][st[k].length-1];
      if(o&&!peer){peer=o;cb.peer.forEach(f=>f(o))}else if(!o&&peer){peer=null;cb.leave.forEach(f=>f())}});
  await new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('Could not connect. Check the internet.')),15000);
    ch.subscribe(s=>{if(s==='SUBSCRIBED'&&!ok){ok=true;clearTimeout(t);ch.track({u:me,name:a.name,avatar:a.avatar,color:a.color});res()}else if((s==='CHANNEL_ERROR'||s==='TIMED_OUT')&&!ok){clearTimeout(t);rej(new Error('Could not connect. Check the internet.'))}})});
  return{me,name:a.name,avatar:a.avatar,color:a.color,send(e,d){ch.send({type:'broadcast',event:'m',payload:{e,d}}).catch(()=>{})},on(e,f){H[e]=f},
    onPeer(f){cb.peer.push(f);if(peer)f(peer)},onLeave(f){cb.leave.push(f)},peer:()=>peer,leave(){try{SB.removeChannel(ch)}catch(e){}}}}

// ---- a multiplayer session inside a game page: KuzeyAccount.session({start(S,go), hello(), goExtra(peerHello), lowerWins, unit}) ----
// Page URL has ?mp=room&mm=coop|race&h=1|0&fn=Name (the lobby sends both players there).
// S.status({score,txt,alive}) shares live progress, S.finish({score,won,txt}) ends your part, S.send/S.recv for game messages.
async function session(o){const q=new URLSearchParams(location.search);if(!q.get('mp'))return null;
  const S={room:q.get('mp'),mode:q.get('mm')==='race'?'race':'coop',host:q.get('h')==='1',fname:q.get('fn')||'Friend',opp:{},peer:null,result:null,mine:null,oppFin:null,left:false};
  const page=location.pathname.split('/').pop()||'index.html';
  let closeWait=modal(`<h2>🎮 ${S.mode==='race'?'🏁 Race':'🤝 Fight together'}</h2><p id="ssT">Connecting to ${esc(S.fname)}…</p><button class="acb alt" id="ssX">LEAVE</button>`,(m)=>{m.dataset.sticky=1;m.querySelector('#ssX').onclick=()=>S.quit()});
  S.quit=()=>{try{S.net&&S.net.send('bye',1);S.net&&S.net.leave()}catch(e){}location.href=page};
  try{S.net=await net(S.room)}catch(e){const t=document.getElementById('ssT');if(t)t.textContent=e.message;return null}
  const a=cur(),hello=Object.assign({name:a.name,avatar:a.avatar,color:a.color},o.hello?o.hello():{});let peerHello=null,go=null,acked=false,started=false;
  const begin=g=>{if(started)return;started=true;closeWait();S.go=g;S.peer=S.host?g.guest:g.host;panel();o.start(S,g);if(!S.host)S.net.send('ok',1)};
  S.net.on('hi',h=>{peerHello=h;const t=document.getElementById('ssT');if(t)t.textContent=h.name+' is here! Starting…';
    if(S.host&&!go){go=Object.assign({seed:(hashCode(S.room)>>>0)||7,host:hello,guest:h},o.goExtra?o.goExtra(h):{});const snd=()=>{if(acked||!S.net)return;S.net.send('go',go);setTimeout(snd,700)};snd();setTimeout(()=>begin(go),400)}});
  S.net.on('go',g=>{if(!S.host)begin(g)});S.net.on('ok',()=>{acked=true});
  const hi=()=>{if(started||!S.net)return;S.net.send('hi',hello);setTimeout(hi,1000)};hi();
  S.net.on('st',d=>{S.opp=d;panel()});
  S.net.on('fin',d=>{if(S.oppFin)return;S.oppFin=d;S.opp=Object.assign(S.opp,d,{alive:false});panel();if(o.onOppFinish)o.onOppFinish(d);judge()});
  const gone=()=>{if(S.left)return;S.left=true;panel();if(o.onLeave)o.onLeave();judge()};
  S.net.on('bye',gone);S.net.onLeave(()=>setTimeout(()=>{if(S.net&&!S.net.peer())gone()},4000));
  S.send=(e,d)=>S.net.send(e,d);S.recv=(e,f)=>S.net.on(e,f);
  let lastSt=0;S.status=d=>{const now=performance.now();if(now-lastSt<300)return;lastSt=now;S.net.send('st',d)};
  S.finish=d=>{if(S.mine)return;d.at=Date.now();S.mine=d;S.net.send('fin',d);setTimeout(()=>S.net&&S.net.send('fin',d),600);judge()};
  function judge(){const m=S.mine,f=S.oppFin;
    if(!S.result){if(S.mode==='race'){if(f&&f.won&&!(m&&m.won&&m.at<f.at))S.result='lose';else if(m&&m.won&&!(f&&f.won))S.result='win';
        else if(m&&f){const a=m.score||0,b=f.score||0;S.result=a===b?'tie':((o.lowerWins?a<b:a>b)?'win':'lose')}else if(m&&S.left)S.result='left'}
      else if(m&&(f||S.left||m.shared))S.result='team'}
    if(S.result==='lose'&&!S.toldLose&&!m&&o.onLose){S.toldLose=true;o.onLose()}
    if(m)result()}
  function result(){let box=document.getElementById('ssRes');const nm=esc(S.peer?S.peer.name:S.fname),u=o.unit||'';
    const sc=v=>v==null?'–':(typeof v==='number'?v.toLocaleString():v)+u;
    let t,l;const r=S.result;
    if(S.mode==='race'){t=r==='win'?'🏆 YOU WON!':r==='lose'?'RACE LOST':r==='tie'?'IT\'S A TIE!':r==='left'?'FRIEND LEFT':'⏳ WAITING…';
      l=r==='win'?'You beat '+nm+'!':r==='lose'?nm+' won this time.':r==='tie'?'Exactly the same!':r==='left'?nm+' left the race.':nm+' is still playing…'}
    else{const team=S.mine.shared?S.mine.score:(S.mine.score||0)+((S.oppFin&&S.oppFin.score)||0);t=r?'🤝 TEAM SCORE: '+sc(team):'⏳ WAITING…';l=r?(S.left&&!S.oppFin&&!S.mine.shared?nm+' left the game.':'Great teamwork with '+nm+'!'):nm+' is still playing…'}
    const html=`<h2>${t}</h2><p>${l}</p><div class="mpplayers"><div class="mpp">${av(a)}<b>${esc(a.name)}</b><small>${sc(S.mine.score)}${S.mine.txt?' · '+esc(S.mine.txt):''}</small></div><span class="mpvs">${S.mode==='race'?'VS':'＋'}</span><div class="mpp">${av(S.peer||{avatar:'❔',color:'#55507a'})}<b>${nm}</b><small>${S.oppFin?sc(S.oppFin.score)+(S.oppFin.txt?' · '+esc(S.oppFin.txt):''):S.left?'left':'playing… '+sc(S.opp.score)}</small></div></div>
      <button class="acb" id="ssBack">🏠 LEAVE</button>`;
    if(!box){const m=document.createElement('div');m.className='acm';m.id='ssRes';m.innerHTML=`<div class="bx"></div>`;document.body.appendChild(m);box=m}
    box.querySelector('.bx').innerHTML=html;box.querySelector('#ssBack').onclick=()=>S.quit();if(r==='win'&&!S.cheered){S.cheered=true;const K=window.KIT;K&&K.sfx&&K.sfx.win()}}
  function panel(){let p=document.getElementById('ssPanel');if(!p){p=document.createElement('div');p.id='ssPanel';if(o.panelAt==='bottom')p.classList.add('bot');document.body.appendChild(p)}
    const pe=S.peer||{name:S.fname,avatar:'❔',color:'#55507a'},d=S.opp||{};
    p.innerHTML=`<span class="acav" style="border-color:${pe.color};background:${pe.color}22">${pe.avatar}</span><div><b>${esc(pe.name)}</b><small>${S.left?'left the game':d.alive===false||S.oppFin?(S.oppFin&&(S.oppFin.won||S.mode==='coop')?'✅ finished':'💥 out'):esc(d.txt||'playing…')}</small></div><em>${(d.score||0).toLocaleString()}${o.unit||''}</em>`}
  return S}
function hashCode(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

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
.acrow{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.acrow .acbar{margin-top:0;flex:1 1 100%;min-width:0}
.frbtn{position:relative;flex:1;height:54px;border:2px solid var(--line,#2c2468);background:var(--panel,#151036);border-radius:16px;color:inherit;cursor:pointer;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:8px;font:900 13px Orbitron,monospace;letter-spacing:.06em}
.frbtn span{font-size:24px}.frbtn:hover{border-color:var(--pink,#ff3d9a)}
.frbtn b,.frdot{position:absolute;top:-6px;right:-6px;min-width:22px;height:22px;border-radius:11px;background:#ff3d5a;color:#fff;font:900 12px system-ui;display:grid;place-items:center;padding:0 5px}
.frdot{position:static;display:inline-grid;margin-left:4px}.frbtn b[hidden],.frdot[hidden]{display:none}
.frtabs .acb{padding:10px 6px;font-size:11px}
.frrow{cursor:default}.frname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.fract{display:flex;gap:6px;align-items:center;flex:none}
.frb{border:0;border-radius:10px;padding:9px 10px;font:900 11px Orbitron,monospace;background:#ffd23f;color:#0b0820;cursor:pointer;white-space:nowrap}.frb.alt{background:#1d1748;color:#ecebff;border:2px solid #2c2468}
.frx{border:0;background:none;color:#9a94c9;font-size:18px;cursor:pointer;padding:4px}.frok{color:#5cf2b4;font-weight:600;font-size:13px;white-space:nowrap}
.frol{display:inline-block;width:9px;height:9px;border-radius:50%;background:#55507a;margin-left:2px}.frol.on{background:#5cf2b4;box-shadow:0 0 6px #5cf2b4}
.mpbtn{border-color:var(--cyan,#3ef0ff)}.mpbtn:hover{border-color:var(--gold,#ffd23f)}
.mpgame{display:flex;align-items:center;gap:12px;background:#0b0820;border:2px solid #2c2468;border-radius:14px;padding:10px 12px}.mpgame span{font-size:34px}.mpgame b{font:900 17px Orbitron,monospace;display:block}.mpgame small{color:#9a94c9}
.mpinv{display:flex;flex-direction:column;gap:12px}
.mpgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}.mpgrid button{border:2px solid #2c2468;background:#0b0820;color:#fff;border-radius:12px;padding:8px 4px;cursor:pointer;font:600 12px 'Chakra Petch',sans-serif;display:flex;flex-direction:column;align-items:center;gap:2px}
.mpgrid button span{font-size:28px}.mpgrid small{color:#9a94c9;font-size:10px}.mpgrid button:hover{border-color:#ffd23f}
.mpplayers{display:flex;align-items:center;justify-content:center;gap:10px}.mpp{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;background:#0b0820;border:2px solid #2c2468;border-radius:14px;padding:12px 6px;text-align:center}
.mpp .acav{width:60px;height:60px;font-size:34px}.mpp.wait{opacity:.5}.mpp small{color:#9a94c9}.mpvs{font:900 20px Orbitron,monospace;color:#ff3d9a}
.mpstat{text-align:center;min-height:2.6em}
#ssPanel{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:8px;background:rgba(11,8,32,.82);border:2px solid #2c2468;border-radius:14px;padding:5px 10px;color:#ecebff;font:600 12px 'Chakra Petch',sans-serif;pointer-events:none;max-width:70vw}
#ssPanel.bot{top:auto;bottom:calc(10px + env(safe-area-inset-bottom,0px))}#ssPanel .acav{width:30px;height:30px;font-size:17px;border-width:2px}#ssPanel b{display:block;font:900 11px Orbitron,monospace}#ssPanel small{color:#9a94c9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:34vw}#ssPanel em{font:900 15px Orbitron,monospace;color:#ffd23f;font-style:normal;margin-left:4px}.mpnote{background:#1d1748;border-left:4px solid #ffd23f;border-radius:8px;padding:10px 12px;font-size:14px}.mpcd{font:900 54px Orbitron,monospace;color:#ffd23f}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
function modal(html,bind){const m=document.createElement('div');m.className='acm';m.innerHTML=`<div class="bx">${html}</div>`;document.body.appendChild(m);
  const close=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m&&!m.dataset.sticky)close()});m.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);bind&&bind(m,close);return close}
const av=(a,cls='')=>`<span class="acav ${cls}" style="border-color:${a.color};background:${a.color}22">${a.avatar}</span>`;
function bar(){const el=document.getElementById('acct');if(!el)return;const a=cur(),t=trophies();
  el.innerHTML=`<div class="acrow"><button class="acbar" id="acOpen">${av(a)}<span><b>${esc(a.name)}</b><small>${a.fresh?'Tap to create your account':`🏆 ${t.n} trophies · ${A.accounts.length>1?A.accounts.length+' players on this device':'Your account'}`}<br><span id="acSync">${a.cloud?(syncMsg||(a.cloud.token?'☁️ Online: '+esc(a.cloud.user):'☁️ Logged out · tap to log in')):cloudOn()&&!a.fresh?'☁️ Not online yet · tap to save online':''}</span></small></span><span class="go">${a.fresh?'CREATE':'ACCOUNT'}</span></button>${cloudOn()?'<button class="frbtn mpbtn" id="mpOpen" aria-label="Multiplayer"><span>🎮</span>MULTIPLAYER</button><button class="frbtn" id="frOpen" aria-label="Friends"><span>👥</span>FRIENDS<b id="frN" hidden>0</b></button>':''}</div>`;const fo=document.getElementById('frOpen');if(fo)fo.onclick=friendsUI;const mo=document.getElementById('mpOpen');if(mo)mo.onclick=()=>mpUI();frBadge();
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
window.KuzeyAccount={current:cur,menu,send,login:loginUI,switcher,cloud:cloudUI,sync,friends:friendsUI,multiplayer:mpUI,net,session};
const hub=()=>!!document.getElementById('acct');
function start(){bar();poll();setInterval(poll,hub()?6000:8000);if(hub()){sync(false)}setInterval(()=>sync(!hub()),hub()?60000:90000)}
document.addEventListener('visibilitychange',()=>{if(document.hidden)sync(true);else if(hub())sync(false)});
addEventListener('online',()=>sync(!hub()));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
