'use strict';
const CONFIG = { shots: 10, travel: 1.65, speed: 53, shipWidth: 66, aimSpeed: 280, sinkTime: 2.4 };
const state = { phase:'ready', ammo:CONFIG.shots, score:0, aim:500, ship:{x:80, direction:1, sinking:null}, torpedo:null, burst:null, time:0, cooldown:0 };
const ui = Object.fromEntries(['sea','overlay','headline','intro','start','score','rounds','status','fire','sound'].map(id=>[id,document.getElementById(id)]));
const keys = new Set();
let audioContext, master, soundEnabled=true;
function unlockAudio(){
  if(!soundEnabled)return;
  const Audio=window.AudioContext || window.webkitAudioContext;
  if(!Audio)return;
  audioContext ||= new Audio();
  if(!master){master=audioContext.createGain();master.gain.value=.65;master.connect(audioContext.destination);}
  audioContext.resume().catch(()=>{});
}
function sound(frequency,duration,type='sine'){
  if(!soundEnabled)return;
  unlockAudio();if(!audioContext)return;
  const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(frequency,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(40,audioContext.currentTime+duration);g.gain.setValueAtTime(.3,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g).connect(master);o.start();o.stop(audioContext.currentTime+duration);
}
function noise(duration,volume,cutoff){
  if(!soundEnabled)return;
  unlockAudio();if(!audioContext)return;
  const buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate);
  const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
  source.connect(filter).connect(gain).connect(master);source.start();source.stop(audioContext.currentTime+duration);
}
function spawnShip(){const direction=-state.ship.direction;state.ship={x:direction===1?80:920,direction,sinking:null};}
function sync(message){
  ui.score.textContent=String(state.score).padStart(2,'0');
  ui.rounds.innerHTML=Array.from({length:CONFIG.shots},(_,i)=>`<i class="${i>=state.ammo?'used':''}"></i>`).join('');
  ui.rounds.setAttribute('aria-label',`Осталось торпед: ${state.ammo}`);
  ui.fire.disabled=state.phase!=='playing'||!!state.torpedo||state.cooldown>0||state.ammo===0;
  if(message)ui.status.textContent=message;
}
function start(){unlockAudio();sound(440,.18);Object.assign(state,{phase:'playing',ammo:CONFIG.shots,score:0,aim:500,ship:{x:80,direction:1,sinking:null},torpedo:null,burst:null,cooldown:0});ui.overlay.hidden=true;sync('ВЫБЕРИТЕ МОМЕНТ ДЛЯ АТАКИ');ui.fire.focus();}
function fire(){if(ui.fire.disabled)return;state.ammo--;state.torpedo={x:state.aim,elapsed:0};sound(240,.35,'sawtooth');noise(CONFIG.travel,.35,1600);sync('ТОРПЕДА НА ХОДУ');}
function finish(){state.phase='finished';ui.headline.textContent=`Попаданий: ${state.score} из ${CONFIG.shots}`;ui.intro.textContent=state.score>=7?'Отличная стрельба, командир.': 'Берите упреждение — цель движется, пока идёт торпеда.';ui.start.innerHTML='ЕЩЁ ОДНА ПАРТИЯ <span>→</span>';ui.overlay.hidden=false;sync('БОЕКОМПЛЕКТ ИЗРАСХОДОВАН');}
function update(dt){
 state.time+=dt;if(state.phase!=='playing')return;
 const move=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);state.aim=Math.max(100,Math.min(900,state.aim+move*CONFIG.aimSpeed*dt));
 if(state.ship.sinking!==null){state.ship.sinking+=dt;if(state.ship.sinking>=CONFIG.sinkTime && state.ammo>0)spawnShip();}
 else {state.ship.x+=CONFIG.speed*state.ship.direction*dt;if(state.ship.x>980||state.ship.x<20)spawnShip();}
 if(state.burst){state.burst.age+=dt;if(state.burst.age>1)state.burst=null;}
 if(state.cooldown>0){state.cooldown=Math.max(0,state.cooldown-dt);if(!state.cooldown){if(!state.ammo){finish();return;}sync('ГОТОВ К ПУСКУ');}}
 if(state.torpedo){state.torpedo.elapsed+=dt;if(state.torpedo.elapsed>=CONFIG.travel){const hit=state.ship.sinking===null && state.ship.x>155 && state.ship.x<790 && Math.abs(state.torpedo.x-state.ship.x)<=CONFIG.shipWidth/2;state.burst={x:state.torpedo.x,age:0,hit};if(hit){state.score++;state.ship.sinking=0;sound(100,1.3,'sawtooth');noise(1.8,.9,850);}else sound(80,.2);state.torpedo=null;state.cooldown=hit?CONFIG.sinkTime+.3:1.05;sync(hit?'ПОПАДАНИЕ · ЦЕЛЬ ТОНЕТ':'МИМО · ВОЗЬМИТЕ УПРЕЖДЕНИЕ');}}
}
ui.start.addEventListener('click',start);ui.fire.addEventListener('click',fire);
ui.sound.addEventListener('click',()=>{soundEnabled=!soundEnabled;ui.sound.textContent=soundEnabled?'ЗВУК ВКЛ':'ЗВУК ВЫКЛ';ui.sound.setAttribute('aria-pressed',soundEnabled);if(master)master.gain.setValueAtTime(soundEnabled?.65:0,audioContext.currentTime);if(soundEnabled)sound(300,.15);});
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code)){if(e.target.tagName==='BUTTON'&&e.code==='Space')return;e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)fire();}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
function aim(e){const r=ui.sea.getBoundingClientRect();state.aim=Math.max(100,Math.min(900,(e.clientX-r.left)/r.width*1000));}
ui.sea.addEventListener('pointerdown',e=>{ui.sea.setPointerCapture(e.pointerId);aim(e);});ui.sea.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)aim(e);});
for(const [id,key] of [['left','ArrowLeft'],['right','ArrowRight']]){const b=document.getElementById(id);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);keys.add(key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(key));}
let previous=performance.now();function frame(now){const dt=Math.min((now-previous)/1000,.05);previous=now;if(!document.hidden)update(dt);drawSea(ui.sea,state,CONFIG);requestAnimationFrame(frame);}sync();requestAnimationFrame(frame);
