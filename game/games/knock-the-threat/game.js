'use strict';
const CONFIG = {duration:60, spawnStart:.85, spawnEnd:.38, lifeStart:1.65, lifeEnd:.85, maxActive:3};
const positions = [[31.7,12.5],[50,9],[68.3,12.5],[25,22.8],[75.7,22.8],[40.9,31],[61,31]];
const names = ['Вакцина','Мировой сговор','Вышка 5G'];
// Atlas regions retain their original pixel proportions through SVG meet scaling.
const targetArt = [
  {box:'0 0 490 990', outline:'0,0 345,0 345,480 490,515 490,1000 0,1000'},
  {box:'430 200 670 760', outline:'590,200 980,200 980,430 1100,445 1100,650 1030,680 1030,960 510,960 510,600 430,550 430,370 590,330'},
  {box:'1000 90 536 875', outline:'1110,90 1410,90 1536,160 1536,965 1060,965 1080,630 1080,470 1000,450 1000,190'}
];
function targetMarkup(type, index) {
  const art=targetArt[type];
  return `<svg class="sprite" viewBox="${art.box}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs><clipPath id="target-cut-${index}"><polygon points="${art.outline}"/></clipPath></defs><image href="assets/threats.png" width="1536" height="1024" clip-path="url(#target-cut-${index})"/></svg>`;
}
const $ = id => document.getElementById(id);
let mode='ready', remaining=60, score=0, streak=0, hits=0, misses=0, escaped=0, spawnIn=0, last=0, muted=false, audio, best=0;
try {best=Number(localStorage.getItem('knock-the-threat-best'))||0;} catch {}
const holes=positions.map(([x,y],i)=>{const el=document.createElement('button');el.className='hole';el.style.left=x+'%';el.style.top=y+'%';el.style.zIndex=String(Math.round(y));el.setAttribute('aria-label',`Лунка ${i+1}`);el.innerHTML=`<span class="clip">${targetMarkup(0,i)}</span><kbd>${i+1}</kbd>`;$('holes').append(el);el.addEventListener('click',()=>strike(i));return {el,life:0,type:0};});
function tone(good){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type=good?'triangle':'sine';o.frequency.setValueAtTime(good?560:140,audio.currentTime);o.frequency.exponentialRampToValueAtTime(good?180:70,audio.currentTime+.12);g.gain.setValueAtTime(.13,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.start();o.stop(audio.currentTime+.16);}catch{}}
function hud(){$('score').textContent=String(score).padStart(4,'0');$('time').textContent=Math.ceil(remaining);$('combo').textContent='×'+Math.min(4,1+Math.floor(streak/5));$('best').textContent=String(best).padStart(4,'0');}
function clearHoles(){holes.forEach(h=>{h.life=0;h.reserved=false;h.el.classList.remove('up','hit','reserved');h.el.setAttribute('aria-label',`Лунка ${holes.indexOf(h)+1}`);});}
function start(){clearHoles();resetActor();score=streak=hits=misses=escaped=0;remaining=CONFIG.duration;spawnIn=.2;mode='playing';$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Пауза';$('status').textContent='Лови мишени! Каждые 5 попаданий подряд — выше множитель.';tone(true);hud();}
// Rig coordinates use the same 1000 x 800 space as the stage.
const HOME = {x:650, y:190};
let actorPosition = {...HOME};
let attack = null;
const attackQueue = [];
const lerp = (a,b,t) => a+(b-a)*t;
const ease = t => t*t*(3-2*t);
// Complete photographic poses keep arms, hands and mallet anatomically connected.
const POSE_SCALE=.5;
const CONTACT={x:-95,y:199};
function paintActor(body, striking=false, flash=0, lean=0) {
  $('player').setAttribute('transform',`translate(${body.x} ${body.y}) rotate(${lean} 100 450) scale(${POSE_SCALE})`);
  $('pose-ready').setAttribute('visibility',striking?'hidden':'visible');
  $('pose-hit').setAttribute('visibility',striking?'visible':'hidden');
  $('actor-shadow').setAttribute('cx',body.x+110);
  $('actor-shadow').setAttribute('cy',body.y+490);
  $('burst').setAttribute('transform',`translate(${body.x+CONTACT.x} ${body.y+CONTACT.y})`);
  $('burst').setAttribute('opacity',flash);
}
function resetActor() {
  attack=null;
  attackQueue.length=0;
  actorPosition={...HOME};
  paintActor(actorPosition);
  $('impact').classList.remove('show');
}
function strike(i) {
  if(mode!=='playing'||attackQueue.length>=2)return;
  const h=holes[i];
  if(h.reserved)return;
  const good=h.life>0;
  h.reserved=true;
  h.el.classList.add('reserved');
  const [x,y]=positions[i];
  const target={x:30+x*6.6,y:250+y*4.95-(good?48:4)};
  attackQueue.push({i,good,type:h.type,target});
}
function contact(a) {
  const h=holes[a.i];
  h.reserved=false;
  h.el.classList.remove('reserved');
  if(a.good) {
    const points=10*Math.min(4,1+Math.floor(streak/5));
    score+=points;streak++;hits++;h.life=0;
    h.el.classList.remove('up');h.el.classList.add('hit');
    $('impact').textContent='+'+points;
    $('status').textContent=names[a.type]+' — есть попадание!';
    h.el.setAttribute('aria-label',`Лунка ${a.i+1}`);
  } else {
    streak=0;misses++;
    $('impact').textContent='МИМО';
    $('status').textContent='Пустая лунка! Серия сброшена.';
  }
  $('impact').style.left=(a.target.x/10)+'%';
  $('impact').style.top=(a.target.y/8)+'%';
  $('impact').classList.remove('show');
  void $('impact').offsetWidth;
  $('impact').classList.add('show');
  tone(a.good);hud();
}
function animateActor(dt) {
  if(!attack&&attackQueue.length) {
    attack={...attackQueue.shift(),t:0,from:{...actorPosition},contacted:false};
    attack.to={x:attack.target.x-CONTACT.x,y:attack.target.y-CONTACT.y};
  }
  if(!attack) {
    const t=Math.min(1,dt*7);
    actorPosition={x:lerp(actorPosition.x,HOME.x,t),y:lerp(actorPosition.y,HOME.y,t)};
    paintActor(actorPosition);
    return;
  }
  const a=attack;
  a.t+=dt;
  const approach=ease(Math.min(1,a.t/.25));
  actorPosition={x:lerp(a.from.x,a.to.x,approach),y:lerp(a.from.y,a.to.y,approach)};
  if(a.t>=.29&&!a.contacted){a.contacted=true;contact(a);}
  const striking=a.t>=.24&&a.t<.43;
  const lean=a.t<.24?-3*Math.sin(a.t/.24*Math.PI):0;
  paintActor(actorPosition,striking,a.contacted&&a.t<.38?1:0,lean);
  if(a.t>=.49)attack=null;
}
function spawn(){const free=holes.filter(h=>h.life<=0&&!h.reserved);if(holes.length-free.length>=CONFIG.maxActive)return;const h=free[Math.floor(Math.random()*free.length)];const progress=1-remaining/CONFIG.duration;h.life=CONFIG.lifeStart+(CONFIG.lifeEnd-CONFIG.lifeStart)*progress;h.type=Math.floor(Math.random()*3);h.el.querySelector('.clip').innerHTML=targetMarkup(h.type,holes.indexOf(h));h.el.classList.remove('hit');h.el.classList.add('up');h.el.setAttribute('aria-label',`${names[h.type]}, лунка ${holes.indexOf(h)+1}`);}
function finish(){mode='over';clearHoles();resetActor();best=Math.max(best,score);try{localStorage.setItem('knock-the-threat-best',best);}catch{}$('overline').textContent='РАУНД ЗАВЕРШЁН';$('title').textContent=score+' очков!';$('message').textContent=`Попаданий: ${hits} · Мимо: ${misses} · Спрятались: ${escaped}. Ещё одну попытку?`;$('start').textContent='ЕЩЁ РАЗ ↗';$('overlay').hidden=false;$('pause').disabled=true;$('status').textContent='Раунд завершён. Рекорд сохранён на этом устройстве.';hud();}
function pause(){if(mode==='playing'){mode='paused';$('overline').textContent='ПАУЗА';$('title').textContent='Передышка';$('message').textContent='Мишени подождут. Продолжим, когда будешь готов.';$('start').textContent='ПРОДОЛЖИТЬ ↗';$('overlay').hidden=false;$('pause').textContent='Продолжить';}else if(mode==='paused'){mode='playing';$('overlay').hidden=true;$('pause').textContent='Пауза';}}
function update(dt){if(mode!=='playing')return;remaining=Math.max(0,remaining-dt);if(remaining===0){finish();return;}animateActor(dt);for(const h of holes){if(h.life>0&&!h.reserved){h.life-=dt;if(h.life<=0){h.el.classList.remove('up');h.el.setAttribute('aria-label',`Лунка ${holes.indexOf(h)+1}`);streak=0;escaped++;}}}spawnIn-=dt;if(spawnIn<=0){spawn();spawnIn=CONFIG.spawnEnd+(CONFIG.spawnStart-CONFIG.spawnEnd)*remaining/CONFIG.duration;}hud();}
function frame(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;update(dt);requestAnimationFrame(frame);}
$('start').onclick=()=>mode==='paused'?pause():start();$('pause').onclick=pause;$('sound').onclick=()=>{muted=!muted;$('sound').textContent='Звук: '+(muted?'выкл.':'вкл.');$('sound').setAttribute('aria-pressed',String(muted));};
document.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;if(/^[1-7]$/.test(e.key)){e.preventDefault();strike(Number(e.key)-1);}if(e.code==='Escape'&&['playing','paused'].includes(mode)){e.preventDefault();pause();}});
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden&&mode==='playing')pause();});resetActor();hud();requestAnimationFrame(frame);
