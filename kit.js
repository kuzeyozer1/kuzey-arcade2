/* Kuzey Arcade Kit — shared by every game.
   KIT.profile   your player: name, avatar, colour, and the vehicle you picked for each game
   KIT.sfx       little synth sound effects (no files needed), with one mute switch for the arcade
   KIT.fx        particles, floating text and screen shake for canvas games
   KIT.scores    best scores per game
   KIT.ach       achievements per game, with a pop-up when you unlock one
   KIT.pad       on-screen joystick and buttons for touch screens (keyboard still works)
   KIT.ui        toast, profile editor, achievements list, pause button
   Everything is stored on this device only. */
(function(){
'use strict';
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* ---------------- profile ---------------- */
const AVATARS=['🦊','🐼','🐯','🐸','🦁','🐨','🐵','🦄','🐲','🤖','👽','🐧','🦉','🐙','🦖','🐱','🐶','🐰','🦝','🐺'];
const COLORS=['#3ef0ff','#ff3d9a','#ffd23f','#5cf2b4','#b98bff','#ff8a3d','#4f8bff','#ff5d5d','#c6ff3e','#ffffff'];
const prof=Object.assign({name:'Player',avatar:'🦊',color:'#3ef0ff',vehicles:{}},LS.get('kuzey:profile',{}));
const profile={
  get name(){return prof.name},get avatar(){return prof.avatar},get color(){return prof.color},
  AVATARS,COLORS,
  vehicle(game,def){return prof.vehicles[game]||def},
  setVehicle(game,v){prof.vehicles[game]=v;save()},
  set(p){Object.assign(prof,p);save()}};
function save(){LS.set('kuzey:profile',prof)}

/* ---------------- sound ---------------- */
let AC=null,master=null,muted=LS.get('kuzey:muted',false);
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.5;master.connect(AC.destination)}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,d,{type='square',vol=.12,slide=0,delay=0,attack=.005}={}){
  if(muted||!ac())return;const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+d);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g).connect(master);o.start(t);o.stop(t+d+.02)}
function noise(d,{vol=.15,delay=0,lp=1200}={}){
  if(muted||!ac())return;const t=AC.currentTime+delay,len=Math.floor(AC.sampleRate*d),buf=AC.createBuffer(1,len,AC.sampleRate),ch=buf.getChannelData(0);
  for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*(1-i/len);
  const src=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();src.buffer=buf;f.type='lowpass';f.frequency.value=lp;g.gain.value=vol;
  src.connect(f).connect(g).connect(master);src.start(t)}
const SFX={
  click:()=>tone(660,.05,{vol:.06}),
  coin:()=>{tone(988,.07,{vol:.08});tone(1319,.12,{vol:.08,delay:.06})},
  jump:()=>tone(330,.18,{type:'square',slide:420,vol:.08}),
  shoot:()=>tone(880,.08,{type:'sawtooth',slide:-500,vol:.05}),
  laser:()=>tone(1200,.12,{type:'sawtooth',slide:-900,vol:.05}),
  hit:()=>{tone(180,.12,{type:'square',slide:-80,vol:.1});noise(.08,{vol:.08})},
  hurt:()=>{tone(220,.25,{type:'sawtooth',slide:-150,vol:.12});noise(.15,{vol:.1,lp:800})},
  explode:()=>{noise(.5,{vol:.25,lp:900});tone(90,.4,{type:'triangle',slide:-50,vol:.15})},
  power:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,.12,{vol:.07,delay:i*.06}))},
  win:()=>{[523,659,784,1047,1319].forEach((f,i)=>tone(f,.18,{type:'triangle',vol:.1,delay:i*.1}))},
  lose:()=>{[392,330,262,196].forEach((f,i)=>tone(f,.25,{type:'triangle',vol:.1,delay:i*.14}))},
  place:()=>tone(440,.08,{type:'triangle',vol:.1}),
  error:()=>tone(150,.15,{type:'square',vol:.08}),
  engine:(p=0)=>tone(70+p*120,.09,{type:'sawtooth',vol:.025}),
  kick:()=>{tone(160,.15,{type:'sine',slide:-110,vol:.25});noise(.05,{vol:.1,lp:3000})},
  bounce:()=>tone(520,.06,{type:'sine',slide:200,vol:.1}),
  splash:()=>noise(.35,{vol:.12,lp:600}),
  levelup:()=>{[392,523,659,784].forEach((f,i)=>tone(f,.14,{type:'square',vol:.07,delay:i*.08}))},
  tick:()=>tone(1800,.02,{type:'square',vol:.03}),
  whoosh:()=>noise(.25,{vol:.08,lp:2500}),
  tone,noise,
  get muted(){return muted},
  toggle(){muted=!muted;LS.set('kuzey:muted',muted);return muted}};

/* ---------------- fx: particles, floating text, shake ---------------- */
class FX{
  constructor(){this.p=[];this.t=[];this.sh=0;this.max=600}
  burst(x,y,{n=14,color='#ffd23f',speed=160,life=.6,size=3,grav=0,spread=Math.PI*2,dir=0,shape='sq'}={}){
    for(let i=0;i<n&&this.p.length<this.max;i++){const a=dir+(Math.random()-.5)*spread,s=speed*(.3+Math.random()*.7);
      this.p.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,size:size*(.6+Math.random()*.8),color:Array.isArray(color)?color[i%color.length]:color,grav,shape})}}
  trail(x,y,color,size=2,life=.3){if(this.p.length<this.max)this.p.push({x,y,vx:(Math.random()-.5)*20,vy:(Math.random()-.5)*20,life,max:life,size,color,grav:0,shape:'ci'})}
  text(x,y,str,color='#fff',size=16){this.t.push({x,y,str,color,size,life:1})}
  shake(a){this.sh=Math.max(this.sh,a)}
  update(dt){for(const q of this.p){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=q.grav*dt;q.vx*=.985;q.life-=dt}this.p=this.p.filter(q=>q.life>0);
    for(const q of this.t){q.y-=30*dt;q.life-=dt}this.t=this.t.filter(q=>q.life>0);this.sh=Math.max(0,this.sh-dt*30)}
  offset(){return this.sh>0?[(Math.random()-.5)*this.sh,(Math.random()-.5)*this.sh]:[0,0]}
  draw(ctx){for(const q of this.p){ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.color;
      if(q.shape==='ci'){ctx.beginPath();ctx.arc(q.x,q.y,q.size,0,7);ctx.fill()}else ctx.fillRect(q.x-q.size/2,q.y-q.size/2,q.size,q.size)}
    ctx.globalAlpha=1;ctx.textAlign='center';
    for(const q of this.t){ctx.globalAlpha=Math.min(1,q.life*2);ctx.font=`900 ${q.size}px Orbitron, monospace`;ctx.fillStyle='#000';ctx.fillText(q.str,q.x+1,q.y+1);ctx.fillStyle=q.color;ctx.fillText(q.str,q.x,q.y)}
    ctx.globalAlpha=1}
  clear(){this.p=[];this.t=[];this.sh=0}}

/* ---------------- scores and achievements ---------------- */
const scores={
  best(game,key='best'){return LS.get('kuzey:score:'+game,{})[key]||0},
  submit(game,val,key='best',lower=false){const all=LS.get('kuzey:score:'+game,{}),old=all[key];const better=old==null||(lower?val<old:val>old);
    if(better){all[key]=val;LS.set('kuzey:score:'+game,all)}return better},
  all(game){return LS.get('kuzey:score:'+game,{})},
  set(game,key,val){const all=LS.get('kuzey:score:'+game,{});all[key]=val;LS.set('kuzey:score:'+game,all)}};
const ACHDEF={};
const ach={
  define(game,list){ACHDEF[game]=list},
  has(game,id){return !!LS.get('kuzey:ach:'+game,{})[id]},
  unlock(game,id){const got=LS.get('kuzey:ach:'+game,{});if(got[id])return false;const d=(ACHDEF[game]||[]).find(a=>a.id===id);if(!d)return false;
    got[id]=Date.now();LS.set('kuzey:ach:'+game,got);SFX.power();ui.toast(`🏆 ${d.icon||''} ${d.name}`,'Achievement unlocked!');return true},
  count(game){const got=LS.get('kuzey:ach:'+game,{});return{got:Object.keys(got).filter(k=>(ACHDEF[game]||[]).some(a=>a.id===k)).length,total:(ACHDEF[game]||[]).length}},
  list(game){const got=LS.get('kuzey:ach:'+game,{});return(ACHDEF[game]||[]).map(a=>Object.assign({},a,{got:!!got[a.id]}))}};

/* ---------------- touch pad ---------------- */
// KIT.pad.create({joystick:true, buttons:[{id:'fire',label:'🔥'}], onButton(id,down){}}) -> pad.x / pad.y in -1..1, pad.held(id)
function makePad(opt={}){
  const touch=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;
  const pad={x:0,y:0,on:touch,held:id=>!!down[id],destroy(){root.remove()}},down={};
  const root=document.createElement('div');root.className='kpad';root.hidden=!touch||opt.hidden;
  document.body.appendChild(root);
  if(opt.joystick!==false){
    const zone=document.createElement('div');zone.className='kjoy';root.appendChild(zone);let id=null,ox=0,oy=0;const knob=document.createElement('i');zone.appendChild(knob);
    const R=50,set=(dx,dy)=>{const d=Math.hypot(dx,dy),k=d>R?R/d:1;dx*=k;dy*=k;knob.style.transform=`translate(${dx}px,${dy}px)`;pad.x=dx/R;pad.y=dy/R;if(Math.abs(pad.x)<.15)pad.x=0;if(Math.abs(pad.y)<.15)pad.y=0};
    zone.addEventListener('pointerdown',e=>{id=e.pointerId;zone.setPointerCapture(id);const r=zone.getBoundingClientRect();ox=r.left+r.width/2;oy=r.top+r.height/2;set(e.clientX-ox,e.clientY-oy);e.preventDefault()});
    zone.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e.clientX-ox,e.clientY-oy)});
    const end=e=>{if(e.pointerId===id){id=null;set(0,0)}};zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end)}
  const bw=document.createElement('div');bw.className='kbtns';root.appendChild(bw);
  (opt.buttons||[]).forEach(b=>{const el=document.createElement('button');el.className='kbtn';el.textContent=b.label;el.setAttribute('aria-label',b.name||b.id);bw.appendChild(el);
    const on=e=>{e.preventDefault();down[b.id]=true;el.classList.add('on');opt.onButton&&opt.onButton(b.id,true)},off=e=>{down[b.id]=false;el.classList.remove('on');opt.onButton&&opt.onButton(b.id,false)};
    el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off)});
  pad.show=v=>{root.hidden=!touch||!v};
  return pad}

/* ---------------- ui ---------------- */
const css=`
.ktoast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:9999;background:rgba(15,10,40,.94);color:#fff;border:2px solid #ffd23f;border-radius:14px;padding:10px 16px;font:600 15px 'Chakra Petch',system-ui,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.4);max-width:90vw;pointer-events:none;animation:kin .3s}
.ktoast b{display:block;color:#ffd23f;font:900 12px Orbitron,monospace;letter-spacing:.1em}
@keyframes kin{from{opacity:0;transform:translate(-50%,-14px)}}
.kpad{position:fixed;inset:auto 0 0 0;height:0;z-index:50;pointer-events:none}
.kjoy{position:fixed;left:calc(18px + env(safe-area-inset-left,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.25);pointer-events:auto;touch-action:none;display:grid;place-items:center}
.kjoy i{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.35);display:block}
.kbtns{position:fixed;right:calc(18px + env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));display:flex;gap:12px;flex-wrap:wrap-reverse;justify-content:flex-end;max-width:240px;pointer-events:auto}
.kbtn{width:74px;height:74px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;font-size:28px;touch-action:none;user-select:none;-webkit-user-select:none}
.kbtn.on{background:rgba(255,210,63,.45)}
.kmodal{position:fixed;inset:0;z-index:9998;background:rgba(5,3,20,.78);display:grid;place-items:center;padding:16px;font-family:'Chakra Petch',system-ui,sans-serif;color:#ecebff}
.kmodal .kbox{background:#151036;border:2px solid #2c2468;border-radius:18px;padding:18px;width:min(520px,100%);max-height:88vh;overflow:auto;display:flex;flex-direction:column;gap:12px}
.kmodal h2{margin:0;font:900 20px Orbitron,monospace;color:#ffd23f}
.kmodal input{width:100%;background:#0b0820;border:2px solid #2c2468;border-radius:10px;color:#fff;padding:8px 10px;font:inherit}
.kgrid{display:flex;flex-wrap:wrap;gap:8px}
.kgrid button{min-width:46px;height:46px;border-radius:12px;border:2px solid #2c2468;background:#0b0820;color:#fff;font-size:24px;cursor:pointer}
.kgrid button.on{border-color:#ffd23f;background:#2c2468}
.kgrid .sw{width:40px;min-width:40px;height:40px;border-radius:50%}
.kach{display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid #2c2468;border-radius:12px;opacity:.5}
.kach.got{opacity:1;border-color:#ffd23f}
.kach span{font-size:26px}.kach small{display:block;color:#9a94c9}
.kbtn2{font:900 13px Orbitron,monospace;letter-spacing:.08em;border:0;border-radius:10px;padding:11px 16px;cursor:pointer;background:#ffd23f;color:#0b0820}
.kbtn2.alt{background:transparent;color:#ecebff;border:2px solid #2c2468}
.kveh{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
.kveh button{border:2px solid #2c2468;background:#0b0820;color:#fff;border-radius:12px;padding:8px;cursor:pointer;font:600 13px 'Chakra Petch',sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px}
.kveh button.on{border-color:#ffd23f}.kveh button[disabled]{opacity:.4;cursor:default}
.kveh canvas{width:90px;height:54px}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
let toastQ=[],toastOn=false;
const ui={
  toast(msg,head){toastQ.push([msg,head]);if(!toastOn)next()},
  modal(html,bind){const m=document.createElement('div');m.className='kmodal';m.innerHTML=`<div class="kbox">${html}</div>`;document.body.appendChild(m);
    const close=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m)close()});m.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);bind&&bind(m,close);return close},
  profileEditor(onDone){let p={name:prof.name,avatar:prof.avatar,color:prof.color};
    const close=ui.modal(`<h2>👤 Your player</h2><label>Name<input id="kpn" maxlength="14" value="${(p.name||'').replace(/"/g,'')}"></label>
      <b>Avatar</b><div class="kgrid" id="kpa">${AVATARS.map(a=>`<button data-a="${a}" class="${a===p.avatar?'on':''}">${a}</button>`).join('')}</div>
      <b>Colour</b><div class="kgrid" id="kpc">${COLORS.map(c=>`<button class="sw ${c===p.color?'on':''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="kbtn2" id="kpok">SAVE</button></div>`,(m,cl)=>{
      m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{p.avatar=b.dataset.a;m.querySelectorAll('[data-a]').forEach(x=>x.classList.toggle('on',x===b));SFX.click()});
      m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{p.color=b.dataset.c;m.querySelectorAll('[data-c]').forEach(x=>x.classList.toggle('on',x===b));SFX.click()});
      m.querySelector('#kpok').onclick=()=>{p.name=m.querySelector('#kpn').value.trim().slice(0,14)||'Player';profile.set(p);cl();onDone&&onDone()}})},
  // vehicle / skin picker: items [{id,name,cost?,draw(ctx,w,h)}]; owned(id) and buy(id) let a game sell skins for coins
  vehiclePicker(game,title,items,{owned=()=>true,buy=null,coins=null,onDone}={}){
    const cur=()=>profile.vehicle(game,items[0].id);
    const draw=m=>{m.querySelector('.kveh').innerHTML=items.map(v=>{const own=owned(v.id);return`<button data-v="${v.id}" class="${cur()===v.id?'on':''}" ${!own&&(!buy||coins==null||coins()<v.cost)?'disabled':''}><canvas width="180" height="108"></canvas><span>${v.name}</span><small>${own?(cur()===v.id?'✔ chosen':'tap to use'):'🪙 '+v.cost}</small></button>`}).join('');
      m.querySelectorAll('.kveh button').forEach((b,i)=>{const c=b.querySelector('canvas'),x=c.getContext('2d');x.scale(2,2);items[i].draw(x,90,54);
        b.onclick=()=>{const v=items[i];if(!owned(v.id)){if(buy&&buy(v.id))SFX.coin();else return}profile.setVehicle(game,v.id);SFX.click();draw(m)}})};
    return ui.modal(`<h2>${title}</h2>${coins?`<p style="margin:0">🪙 <b id="kco">${coins()}</b></p>`:''}<div class="kveh"></div><div style="display:flex;justify-content:flex-end"><button class="kbtn2" data-close>DONE</button></div>`,(m,cl)=>{draw(m);const done=m.querySelector('[data-close]');done.onclick=()=>{cl();onDone&&onDone()};
      if(coins){const t=setInterval(()=>{const e=m.querySelector('#kco');if(!e)return clearInterval(t);e.textContent=coins()},300)}})},
  achievements(game,title){const list=ach.list(game),c=ach.count(game);
    ui.modal(`<h2>🏆 ${title||'Achievements'} <small style="color:#9a94c9">${c.got}/${c.total}</small></h2>${list.map(a=>`<div class="kach ${a.got?'got':''}"><span>${a.got?a.icon||'🏆':'🔒'}</span><div><b>${a.name}</b><small>${a.desc}</small></div></div>`).join('')}<div style="display:flex;justify-content:flex-end"><button class="kbtn2" data-close>CLOSE</button></div>`)}};
function next(){const it=toastQ.shift();if(!it){toastOn=false;return}toastOn=true;const el=document.createElement('div');el.className='ktoast';el.innerHTML=(it[1]?`<b>${it[1]}</b>`:'')+it[0];document.body.appendChild(el);setTimeout(()=>{el.remove();next()},2300)}

/* ---------------- tiny helpers ---------------- */
const util={
  clamp:(v,a,b)=>v<a?a:v>b?b:v,lerp:(a,b,t)=>a+(b-a)*t,rand:(a,b)=>a+Math.random()*(b-a),irand:(a,b)=>Math.floor(a+Math.random()*(b-a+1)),pick:a=>a[Math.floor(Math.random()*a.length)],
  dist:(a,b,c,d)=>Math.hypot(c-a,d-b),
  rng(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}},
  // fit a canvas to its CSS box at device pixel ratio; returns {w,h,dpr}
  fit(cv,maxDpr=2){const d=Math.min(maxDpr,devicePixelRatio||1),r=cv.getBoundingClientRect();cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return{w:r.width,h:r.height,dpr:d}},
  keys(){const k={};addEventListener('keydown',e=>{k[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault()});addEventListener('keyup',e=>{k[e.key.toLowerCase()]=false});addEventListener('blur',()=>{for(const x in k)k[x]=false});return k},
  fmtTime(s){s=Math.max(0,s);return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')},
  save:LS.set,load:LS.get};

window.KIT={profile,sfx:SFX,FX,scores,ach,pad:{create:makePad},ui,util};
})();
