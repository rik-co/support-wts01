'use strict';
const CONFIG = { shots: 10, travel: 1.65, speed: 53, shipWidth: 66, aimSpeed: 260, viewScale: 1.6, sinkTime: 2.4, worldWidth: 1600 };
const state = { phase:'ready', ammo:CONFIG.shots, score:0, aim:800, ship:{x:274, direction:1, sinking:null}, torpedo:null, burst:null, time:0, cooldown:0 };
const ui = Object.fromEntries(['sea','radar','radar-readout','overlay','headline','intro','start','score','rounds','status','fire','sound'].map(id=>[id,document.getElementById(id)]));
const keys = new Set();
let audioContext, master, soundEnabled=true;
function aimLimits(){
  // Keep the entire optical window inside the 1000-unit game world.
  const halfView=500/CONFIG.viewScale;
  return {min:halfView,max:CONFIG.worldWidth-halfView};
}
function clampAim(value){const limits=aimLimits();return Math.max(limits.min,Math.min(limits.max,value));}
function syncAudioButton(){
  const running=audioContext?.state==='running';
  ui.sound.textContent=!(soundEnabled)?'Звук: выкл':running?'Звук: вкл':'Включить звук';
  ui.sound.setAttribute('aria-pressed',String((soundEnabled)&&running));
}
function unlockAudio(recreate=false){
  if(!(soundEnabled)||document.hidden)return Promise.resolve(false);
  try{
    // Request media playback routing where supported by Safari.
    try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}
    if(recreate&&audioContext){
      master?.disconnect();
      audioContext.close().catch(()=>{});
      audioContext=null;master=null;
    }
    if(!audioContext||audioContext.state==='closed'){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('Web Audio is unavailable');
      audioContext=new Audio();
      master=audioContext.createGain();
      master.gain.value=.65;
      master.connect(audioContext.destination);
      audioContext.addEventListener('statechange',syncAudioButton);
    }
    const current=audioContext;
    // Start an actual source synchronously inside the tap, before awaiting resume.
    const prime=current.createBufferSource();
    prime.buffer=current.createBuffer(1,1,current.sampleRate);
    prime.connect(master);
    prime.onended=()=>prime.disconnect();
    prime.start();
    return current.resume().then(()=>{
      if(current!==audioContext)return false;
      ui.sound.title='';
      syncAudioButton();
      return current.state==='running';
    }).catch(error=>{
      ui.sound.title=error.message;
      syncAudioButton();
      return false;
    });
  }catch(error){
    ui.sound.title=error.message;
    syncAudioButton();
    return Promise.resolve(false);
  }
}
// A fresh touch can restore an interrupted context after returning to Safari.
document.addEventListener('touchend',()=>{
  if(audioContext&&audioContext.state!=='running'&&(soundEnabled))unlockAudio();
},{passive:true});
function sound(frequency,duration,type='sine'){
  if(!soundEnabled)return;
  if(document.hidden||audioContext?.state!=='running')return;
  const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(frequency,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(40,audioContext.currentTime+duration);g.gain.setValueAtTime(.3,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g).connect(master);o.start();o.stop(audioContext.currentTime+duration);
}
function noise(duration,volume,cutoff){
  if(!soundEnabled)return;
  if(document.hidden||audioContext?.state!=='running')return;
  const buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate);
  const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
  source.connect(filter).connect(gain).connect(master);source.start();source.stop(audioContext.currentTime+duration);
}
function spawnShip(){const direction=-state.ship.direction;state.ship={x:direction===1?480:CONFIG.worldWidth-480,direction,sinking:null};}
function sync(message){
  ui.score.textContent=String(state.score).padStart(2,'0');
  ui.rounds.innerHTML=Array.from({length:CONFIG.shots},(_,i)=>`<i class="${i>=state.ammo?'used':''}"></i>`).join('');
  ui.rounds.setAttribute('aria-label',`Осталось торпед: ${state.ammo}`);
  ui.fire.disabled=state.phase!=='playing'||!!state.torpedo||state.cooldown>0||state.ammo===0;
  if(message)ui.status.textContent=message;
}
function start(){unlockAudio().then(ready=>{if(ready)sound(440,.18);});Object.assign(state,{phase:'playing',ammo:CONFIG.shots,score:0,aim:800,ship:{x:480,direction:1,sinking:null},torpedo:null,burst:null,cooldown:0});ui.overlay.hidden=true;sync('ВЫБЕРИТЕ МОМЕНТ ДЛЯ АТАКИ');ui.fire.focus();}
function fire(){if(ui.fire.disabled)return;if(soundEnabled&&audioContext?.state!=='running')unlockAudio();state.ammo--;state.torpedo={x:state.aim,origin:state.aim,elapsed:0};sound(240,.35,'sawtooth');noise(CONFIG.travel,.35,1600);sync('ТОРПЕДА НА ХОДУ');}
function finish(){state.phase='finished';ui.headline.textContent=`Попаданий: ${state.score} из ${CONFIG.shots}`;ui.intro.textContent=state.score>=7?'Отличная стрельба, командир.': 'Берите упреждение — цель движется, пока идёт торпеда.';ui.start.innerHTML='ЕЩЁ ОДНА ПАРТИЯ <span>→</span>';ui.overlay.hidden=false;sync('БОЕКОМПЛЕКТ ИЗРАСХОДОВАН');}
function update(dt){
 state.time+=dt;if(state.phase!=='playing')return;
 const move=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);state.aim=clampAim(state.aim+move*CONFIG.aimSpeed*dt);
 if(state.ship.sinking!==null){state.ship.sinking+=dt;if(state.ship.sinking>=CONFIG.sinkTime && state.ammo>0)spawnShip();}
 else {state.ship.x+=CONFIG.speed*state.ship.direction*dt;if(state.ship.x>CONFIG.worldWidth-480){state.ship.x=CONFIG.worldWidth-480;state.ship.direction=-1;}if(state.ship.x<480){state.ship.x=480;state.ship.direction=1;}}
 if(state.burst){state.burst.age+=dt;if(state.burst.age>1)state.burst=null;}
 if(state.cooldown>0){state.cooldown=Math.max(0,state.cooldown-dt);if(!state.cooldown){if(!state.ammo){finish();return;}sync('ГОТОВ К ПУСКУ');}}
 if(state.torpedo){state.torpedo.elapsed+=dt;if(state.torpedo.elapsed>=CONFIG.travel){const hit=state.ship.sinking===null && state.ship.x>155 && state.ship.x<CONFIG.worldWidth-155 && Math.abs(state.torpedo.x-state.ship.x)<=CONFIG.shipWidth/2;state.burst={x:state.torpedo.x,age:0,hit};if(hit){state.score++;state.ship.sinking=0;sound(100,1.3,'sawtooth');noise(1.8,.9,850);}else sound(80,.2);state.torpedo=null;state.cooldown=hit?CONFIG.sinkTime+.3:1.05;sync(hit?'ПОПАДАНИЕ · ЦЕЛЬ ТОНЕТ':'МИМО · ВОЗЬМИТЕ УПРЕЖДЕНИЕ');}}
}
ui.start.addEventListener('click',start);ui.fire.addEventListener('click',fire);
ui.sound.addEventListener('click',()=>{
  if(soundEnabled&&audioContext?.state==='running'){
    soundEnabled=false;master.gain.value=0;syncAudioButton();
  }else{
    soundEnabled=true;
    unlockAudio(true).then(ready=>{if(ready)sound(440,.2);});
  }
});
syncAudioButton();
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code)){if(e.target.tagName==='BUTTON'&&e.code==='Space')return;e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)fire();}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
// Dragging turns the optical axis; merely moving the mouse does not aim.
let drag=null;
ui.sea.addEventListener('pointerdown',e=>{
  if(state.phase!=='playing')return;
  ui.sea.setPointerCapture(e.pointerId);
  drag={id:e.pointerId,x:e.clientX,aim:state.aim};
});
ui.sea.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const width=ui.sea.getBoundingClientRect().width;
  state.aim=clampAim(drag.aim+(e.clientX-drag.x)*1000/width/CONFIG.viewScale);
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])ui.sea.addEventListener(event,()=>{drag=null;});
window.addEventListener('blur',()=>{drag=null;});
document.addEventListener('visibilitychange',()=>{drag=null;});
for(const [id,key] of [['left','ArrowLeft'],['right','ArrowRight']]){const b=document.getElementById(id);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);keys.add(key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(key));}
let previous=performance.now();function frame(now){const dt=Math.min((now-previous)/1000,.05);previous=now;if(!document.hidden)update(dt);drawSea(ui.sea,state,CONFIG);drawRadar(ui.radar,state,CONFIG);requestAnimationFrame(frame);}sync();requestAnimationFrame(frame);
