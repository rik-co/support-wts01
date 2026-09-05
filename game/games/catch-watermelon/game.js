'use strict';
const CONFIG={target:68,maxMisses:3,travelA:3.2,travelB:2.6,spawnA:1.55,spawnB:1.2};
const state={phase:'idle',score:0,misses:0,lane:3,fruits:[],time:0,spawn:0,flash:0,mode:'A'};
const portraitScreen=window.matchMedia('(any-pointer: coarse) and (orientation: portrait)');
const ctx=document.getElementById('screen').getContext('2d');
const statusEl=document.getElementById('status'),scoreEl=document.getElementById('score');
const startButton=document.getElementById('start'),pauseButton=document.getElementById('pause'),soundButton=document.getElementById('sound');
let audioContext,master,muted=false,voices=[],previous=0,musicIndex=0,musicWait=0;
let timePresses=0;
const melody=[[60,.75],[60,.25],[62,1],[60,1],[65,1],[64,2],[60,.75],[60,.25],[62,1],[60,1],[67,1],[65,2],[60,.75],[60,.25],[72,1],[69,1],[65,1],[64,1],[62,2],[70,.75],[70,.25],[69,1],[65,1],[67,1],[65,3]];
function syncAudioButton(){
  const running=audioContext?.state==='running';
  soundButton.textContent=!(!muted)?'Звук: выкл':running?'Звук: вкл':'Включить звук';
  soundButton.setAttribute('aria-pressed',String((!muted)&&running));
}
function unlockAudio(recreate=false){
  if(!(!muted)||document.hidden)return Promise.resolve(false);
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
      master.gain.value=.16;
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
      soundButton.title='';
      syncAudioButton();
      return current.state==='running';
    }).catch(error=>{
      soundButton.title=error.message;
      syncAudioButton();
      return false;
    });
  }catch(error){
    soundButton.title=error.message;
    syncAudioButton();
    return Promise.resolve(false);
  }
}
// A fresh touch can restore an interrupted context after returning to Safari.
document.addEventListener('touchend',()=>{
  if(audioContext&&audioContext.state!=='running'&&(!muted))unlockAudio();
},{passive:true});
function tone(note,duration=.1){if(muted||document.hidden||portraitScreen.matches||!audioContext||audioContext.state!=='running')return;const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;o.type='triangle';o.frequency.value=440*2**((note-69)/12);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.65,now+.012);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g);g.connect(master);voices.push(o);o.onended=()=>{voices=voices.filter(v=>v!==o);o.disconnect();g.disconnect();};o.start();o.stop(now+duration+.02);}
function silence(){for(const v of voices){try{v.stop();}catch{}}voices=[];}
function refresh(){scoreEl.textContent=String(state.score).padStart(2,'0');startButton.textContent=state.phase==='idle'?'Начать игру':'Начать заново';pauseButton.disabled=!['playing','paused'].includes(state.phase);pauseButton.textContent=state.phase==='paused'?'Продолжить':'Пауза';if(state.phase==='playing')statusEl.textContent=`Игра ${state.mode==='A'?'А':'Б'} · Промахи: ${state.misses} из 3 · Цель: 68`;if(state.phase==='paused')statusEl.textContent='Игра на паузе. Нажмите «Продолжить».';if(state.phase==='over')statusEl.textContent=`Три промаха. Поймано арбузов: ${state.score}. Попробуйте ещё!`;if(state.phase==='birthday')statusEl.textContent='С днём рождения! 68 арбузов пойманы. Время танцевать!';}
function start(mode='A'){if(portraitScreen.matches)return;timePresses=0;unlockAudio().then(ready=>{if(ready&&state.phase==='playing')tone(72,.15);});silence();Object.assign(state,{phase:'playing',score:0,misses:0,lane:3,fruits:[],time:0,spawn:.7,flash:0,mode});musicIndex=0;musicWait=0;refresh();}
function pause(){if(portraitScreen.matches)return;if(state.phase==='playing'){state.phase='paused';silence();}else if(state.phase==='paused'){unlockAudio();state.phase='playing';}refresh();}
function choose(lane){if(portraitScreen.matches)return;if(state.phase==='playing'){state.lane=lane;}}
function celebrateBirthday(){
  state.score=CONFIG.target;
  state.phase='birthday';
  state.fruits=[];
  state.time=0;
  state.flash=0;
  timePresses=0;
  musicIndex=0;
  musicWait=.15;
  silence();
  refresh();
}
function resolveFruit(fruit){if(state.lane===fruit.lane){state.score++;tone(76,.09);if(state.score===CONFIG.target)celebrateBirthday();}else{state.misses++;state.flash=.3;tone(40,.22);if(state.misses===CONFIG.maxMisses){state.phase='over';state.fruits=[];}}refresh();}
function update(dt){if(state.phase==='paused'||document.hidden||portraitScreen.matches)return;state.time+=dt;state.flash=Math.max(0,state.flash-dt);if(state.phase==='birthday'){if(!muted&&audioContext?.state!=='running')return;musicWait-=dt;if(musicWait<=0){const [note,beats]=melody[musicIndex];tone(note,beats*.38);musicWait=beats*.42;musicIndex++;if(musicIndex===melody.length){musicIndex=0;musicWait+=2;}}return;}if(state.phase!=='playing')return;
const speed=1+state.score*.008,travel=(state.mode==='A'?CONFIG.travelA:CONFIG.travelB)/speed;
state.spawn-=dt;if(state.spawn<=0){state.fruits.push({lane:Math.floor(Math.random()*4),progress:0});state.spawn=(state.mode==='A'?CONFIG.spawnA:CONFIG.spawnB)/speed;}
for(const fruit of [...state.fruits]){fruit.progress+=dt/travel;if(fruit.progress>=1){state.fruits=state.fruits.filter(f=>f!==fruit);resolveFruit(fruit);if(state.phase!=='playing')break;}}
}
startButton.addEventListener('click',()=>start(state.mode));pauseButton.addEventListener('click',pause);document.getElementById('case-pause').addEventListener('click',()=>{
  if(portraitScreen.matches)return;
  timePresses++;
  pause();
});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
  if(portraitScreen.matches)return;
  const birthdayCode=b.dataset.mode==='B'&&timePresses===5;
  timePresses=0;
  if(birthdayCode){unlockAudio();celebrateBirthday();}
  else start(b.dataset.mode);
}));
// Other buttons interrupt the secret sequence; ordinary Time presses still pause.
document.addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(button&&button.id!=='case-pause'&&button.dataset.mode!=='B')timePresses=0;
},true);
document.querySelectorAll('[data-lane]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();choose(Number(b.dataset.lane));}));
document.querySelectorAll('[data-lane]').forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.lane))));
soundButton.addEventListener('click',()=>{
  if(!muted&&audioContext?.state==='running'){
    muted=true;silence();master.gain.value=0;syncAudioButton();
  }else{
    muted=false;
    unlockAudio(true).then(ready=>{if(ready)tone(72,.2);});
  }
});
syncAudioButton();
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;const keys={KeyQ:0,KeyE:2,KeyA:1,KeyD:3};if(e.code in keys){e.preventDefault();choose(keys[e.code]);}else if(e.code.startsWith('Arrow')){e.preventDefault();let l=state.lane;if(e.code==='ArrowLeft')l%=2;if(e.code==='ArrowRight')l=l%2+2;if(e.code==='ArrowUp')l-=l%2;if(e.code==='ArrowDown')l=l-l%2+1;choose(l);}else if(e.code==='Space'){e.preventDefault();if(!e.repeat)pause();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state.phase==='playing')pause();silence();if(audioContext)audioContext.suspend().catch(()=>{});}else{previous=performance.now();if(audioContext)audioContext.resume().catch(()=>{});}});
function syncOrientation(){
  document.querySelector('main').inert=portraitScreen.matches;
  if(portraitScreen.matches){
    if(state.phase==='playing'){state.phase='paused';refresh();}
    silence();
  }
  previous=performance.now();
}
portraitScreen.addEventListener('change',syncOrientation);
syncOrientation();
function frame(now){const dt=Math.min((now-previous)/1000,.05);previous=now;update(dt);drawGame(ctx,state);requestAnimationFrame(frame);}requestAnimationFrame(frame);
