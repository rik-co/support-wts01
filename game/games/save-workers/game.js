(() => {
  'use strict';
  const CONFIG = { slots: 8, playerSlots: 7, firstX: 9, lastX: 91, stepDelay: 0.19, workerMinDelay: 0.4, workerMaxDelay: 1.6, workerIdleChance: 0.2, workerTurnChance: 0.3, workerSwapChance: 0.65, stepPoseDuration: 0.13, cruiseSpeed: 19, approachDuration: 0.8, chargeDuration: 1.9, beamTravel: 0.23, beamHold: 0.45, escapeDuration: 0.65 };
  // Mirror center in the aligned player-3 canvas, expressed in scene percentages.
  const MIRROR = { offsetX: 5.876, y: 63.65 };
  const scene = document.getElementById('scene');
  const player = document.getElementById('player');
  const message = document.getElementById('message');
  const pauseButton = document.getElementById('pause');
  const resetButton = document.getElementById('reset');
  const shipElement = document.getElementById('ship');
  const beamElement = document.getElementById('beam');
  const marker = document.getElementById('target-mark');
  const attackStatus = document.getElementById('attack-status');
  const ship = {};
  let side = null;
  const fireButton = document.getElementById('fire');
  const sideMenu = document.getElementById('side-menu');
  const cabinet = document.getElementById('game-cabinet');
  const unicorn = document.getElementById('unicorn');
  const finalePlane = document.getElementById('finale-plane');
  const finale = { phase: 'idle' };
  const banknoteLayer = document.getElementById('banknotes');
  const banknotes = [];
  let banknoteDelay = 0;
  const planePosition = () => 102 - (Math.max(0, finale.time - FINALE.planeDelay) * FINALE.planeSpeed) % 176;
  const FINALE = { entranceSpeed: 32, bumpDuration: 0.35, jumpDuration: 1.1, rideSpeed: 20, poseDuration: 0.16, planeDelay: 0.8, planeSpeed: 12, dancePoseDuration: 0.3 };
  const music = document.getElementById('music');
  const musicButton = document.getElementById('music-toggle');
  let musicEnabled = false;
  let musicMuted = false;
  let musicTrack = 'sad';
  music.volume = 0.5;
  let soundContext;
  const soundVoices = new Set();
  function unlockSound() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context || musicMuted) return;
    if (!soundContext) soundContext = new Context();
    if (soundContext.state === 'suspended') soundContext.resume().catch(() => {});
  }
  function stopSounds() {
    soundVoices.forEach(voice => { try { voice.stop(); } catch (_) {} });
    soundVoices.clear();
  }
  // Short synthesized arcade cues; each voice has a soft attack and release.
  function playSound(effect) {
    if (!soundContext || soundContext.state !== 'running' || !side || !musicEnabled || musicMuted || paused || document.hidden) return;
    const tone = (frequency, endFrequency, delay, duration, volume, type = 'sine') => {
      const start = soundContext.currentTime + delay;
      const oscillator = soundContext.createOscillator();
      const gain = soundContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(soundContext.destination);
      soundVoices.add(oscillator);
      oscillator.onended = () => { soundVoices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    };
    if (effect === 'laser') {
      tone(1250, 150, 0, 0.32, 0.13, 'sawtooth');
      tone(1850, 440, 0.025, 0.28, 0.08, 'sine');
    } else if (effect === 'transform') {
      [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => {
        tone(note, note * 1.005, i * 0.075, 0.34, 0.14, 'triangle');
        tone(note * 2, note * 2, i * 0.075, 0.22, 0.035);
      });
    } else if (effect === 'reflect') {
      [880, 1320, 2349].forEach(note => tone(note, note * 0.98, 0, 0.38, 0.09));
      tone(180, 1500, 0.02, 0.24, 0.07, 'triangle');
    } else if (effect === 'escape') {
      tone(750, 65, 0, 0.6, 0.13, 'triangle');
      tone(1600, 120, 0.04, 0.5, 0.05, 'sawtooth');
    }
  }
  function syncMusic() {
    musicButton.textContent = musicMuted ? '♫ Выкл.' : '♫ Звук';
    musicButton.setAttribute('aria-pressed', String(musicEnabled && !musicMuted));
    musicButton.setAttribute('aria-label', musicEnabled && !musicMuted ? 'Выключить звук' : 'Включить звук');
    if (!side || !musicEnabled || musicMuted || !ready || paused || document.hidden) { music.pause(); stopSounds(); return; }
    music.play().catch(() => {
      if (!musicMuted && !paused) musicButton.setAttribute('aria-label', 'Включить звук');
    });
  }
  function selectMusic(track, restart = false) {
    if (musicTrack !== track) {
      music.pause();
      musicTrack = track;
      music.src = `assets/${track}-song.mp3`;
    } else if (restart) music.currentTime = 0;
    syncMusic();
  }
  function enableMusic(event) {
    unlockSound();
    if (event.target.closest('#music-toggle') || musicEnabled) return;
    musicEnabled = true;
    syncMusic();
  }
  document.addEventListener('pointerdown', enableMusic);
  document.addEventListener('keydown', enableMusic);
  musicButton.addEventListener('click', () => {
    if (!musicEnabled) musicEnabled = true;
    else musicMuted = !musicMuted;
    unlockSound();
    syncMusic();
  });
  window.addEventListener('pagehide', () => { music.pause(); stopSounds(); });
  const keys = new Set();
  const images = {};
  const workers = [];
  let ready = false;
  let paused = false;
  let slot = 3;
  let pose = 1;
  let facing = 1;
  let poseUntil = 0;
  let elapsed = 0;
  let cooldown = 0;
  let previousTime = null;
  const x = index => CONFIG.firstX + index * (CONFIG.lastX - CONFIG.firstX) / (CONFIG.slots - 1);

  const workerDelay = () => CONFIG.workerMinDelay + Math.random() * (CONFIG.workerMaxDelay - CONFIG.workerMinDelay);

  [0, 1, 2, 4, 6, 7].forEach((initialSlot, i) => {
    const element = document.createElement('div');
    element.className = 'actor worker';
    element.innerHTML = '<div class="shadow"></div><img alt="" draggable="false">';
    document.getElementById('workers').append(element);
    workers.push({ element, type: i % 4 + 1, initialSlot, slot: initialSlot, pose: 1, poseUntil: 0, direction: 1, happy: false, nextAction: workerDelay() });
  });

  function renderPlayer() {
    if (finale.phase !== 'idle') { drawFinale(); return; }
    const reflecting = ship.phase === 'beam' && isGuarded() && (!ship.resolved || ship.reflected);
    player.classList.toggle('mirror-horizontal', reflecting);
    player.style.left = `${reflecting ? ship.aimX - facing * MIRROR.offsetX : x(slot + 0.5)}%`;
    player.querySelector('img').style.transform = `scaleX(${facing})`;
    if (ready) player.querySelector('img').src = images[`player-${reflecting ? 3 : pose}`].src;
  }
  function render() {
    renderPlayer();
    workers.forEach((worker, index) => {
      const dancing = finale.phase !== 'idle';
      const dancePose = Math.floor((finale.travelTime + index * 0.11) / FINALE.dancePoseDuration) % 2 + 1;
      worker.element.classList.toggle('dancing', dancing);
      worker.element.style.left = `${x(worker.slot)}%`;
      worker.element.querySelector('img').style.transform = `scaleX(${worker.direction})`;
      worker.element.classList.toggle('happy', worker.happy);
      if (ready) worker.element.querySelector('img').src = images[`${dancing ? 'dance' : worker.happy ? 'happy' : 'worker'}-${worker.type}-${dancing ? dancePose : worker.pose}`].src;
    });
    const blocked = !side || !ready || paused || finale.phase !== 'idle';
    const flying = side === 'light';
    document.getElementById('left').disabled = blocked || (flying ? ship.phase !== 'cruise' || ship.controlSlot === 0 : slot === 0 && facing === -1);
    document.getElementById('right').disabled = blocked || (flying ? ship.phase !== 'cruise' || ship.controlSlot === 7 : slot === 6 && facing === 1);
    fireButton.disabled = blocked || ship.phase !== 'cruise';
  }
  function moveTo(target) {
    if (!side || !ready || paused || document.hidden || finale.phase !== 'idle') return;
    const direction = Math.sign(target - slot);
    if (!direction) return;
    if (facing !== direction) {
      facing = direction;
      pose = 1;
      render();
      return;
    }
    const next = Math.max(0, Math.min(CONFIG.playerSlots - 1, target));
    if (next === slot) return;
    slot = next;
    pose = 2;
    poseUntil = elapsed + CONFIG.stepPoseDuration;
    render();
  }
  function moveControlled(direction) {
    if (side === 'light') moveShipTo(ship.controlSlot + direction);
    else moveTo(slot + direction);
  }
  function moveShipTo(target) {
    if (side !== 'light' || !ready || paused || document.hidden || finale.phase !== 'idle' || ship.phase !== 'cruise') return;
    ship.controlSlot = Math.max(0, Math.min(7, target));
    ship.x = x(ship.controlSlot);
    drawShip();
    render();
  }
  function fireLaser() {
    if (side !== 'light' || !ready || paused || document.hidden || finale.phase !== 'idle' || ship.phase !== 'cruise') return;
    ship.target = workers.find(worker => !worker.happy && worker.slot === ship.controlSlot) || null;
    ship.aimX = ship.x;
    ship.aiReactAt = elapsed + 0.65 + Math.random() * 0.4;
    ship.aiWillDefend = Math.random() < 0.85;
    if (ship.target) ship.target.pose = 1;
    setShipPhase('charge');
    attackStatus.textContent = 'ЗАРЯДКА ЛАЗЕРА…';
    render();
  }
  function chooseSide(value) {
    if (!ready) return;
    side = value;
    scene.dataset.side = value;
    sideMenu.hidden = true;
    cabinet.hidden = false;
    fireButton.hidden = value !== 'light';
    document.getElementById('side-label').textContent = value === 'light' ? 'СВЕТЛАЯ СТОРОНА' : 'ТЁМНАЯ СТОРОНА';
    const instructions = document.getElementById('instructions');
    instructions.hidden = false;
    instructions.textContent = value === 'light'
      ? 'Стрелки или A / D — корабль. Пробел или «Лазер» — выстрел. Наведитесь на работягу и превратите всех шестерых.'
      : 'Встаньте рядом с целью и поверните зеркало к ней. Стрелки или A / D: сначала поворот, затем шаг.';
    musicEnabled = true;
    reset();
    document.getElementById('left').focus();
  }
  function showSideMenu() {
    side = null;
    keys.clear();
    music.pause();
    stopSounds();
    cabinet.hidden = true;
    sideMenu.hidden = false;
    document.getElementById('instructions').hidden = true;
    previousTime = null;
    document.getElementById('choose-dark').focus();
  }
  function setPaused(value) {
    paused = value;
    if (paused) { pose = 1; workers.forEach(worker => { worker.pose = 1; }); }
    keys.clear();
    cooldown = 0;
    pauseButton.textContent = paused ? 'Продолжить' : 'Пауза';
    pauseButton.setAttribute('aria-pressed', String(paused));
    message.textContent = paused ? 'Пауза' : '';
    syncMusic();
    render();
  }
  function reset() {
    stopSounds();
    slot = 3; pose = 1; facing = 1; poseUntil = 0; elapsed = 0;
    workers.forEach(worker => Object.assign(worker, { slot: worker.initialSlot, pose: 1, poseUntil: 0, direction: 1, happy: false, nextAction: workerDelay() }));
    finale.phase = 'idle';
    banknotes.length = 0;
    banknoteLayer.replaceChildren();
    banknoteDelay = 0;
    scene.dataset.finale = 'idle';
    unicorn.hidden = true;
    finalePlane.hidden = true;
    finalePlane.style.left = '102%';
    player.hidden = false;
    player.style.bottom = '';
    player.style.transform = '';
    resetShip();
    selectMusic('sad', true);
    setPaused(false);
  }
  // Each worker decides independently; occupancy is checked after each action.
  function updateWorkers() {
    if (finale.phase !== 'idle') return;
    let changed = false;
    const acted = new Set();
    workers.forEach(worker => {
      if (worker === ship.target || elapsed < worker.nextAction || acted.has(worker)) return;
      acted.add(worker);
      worker.nextAction = elapsed + workerDelay();
      const choice = Math.random();
      if (choice < CONFIG.workerIdleChance) return;
      if (choice < CONFIG.workerIdleChance + CONFIG.workerTurnChance) {
        worker.direction *= -1;
        worker.pose = 1;
        changed = true;
        return;
      }
      const target = worker.slot + worker.direction;
      const neighbor = workers.find(other => other !== worker && other.slot === target);
      // Exchange both positions in one update; neither worker can join another action.
      if (neighbor && neighbor !== ship.target && neighbor.direction === -worker.direction && neighbor.pose === 1 && !acted.has(neighbor) && Math.random() < CONFIG.workerSwapChance) {
        neighbor.slot = worker.slot;
        worker.slot = target;
        worker.pose = neighbor.pose = 2;
        worker.poseUntil = neighbor.poseUntil = elapsed + CONFIG.stepPoseDuration;
        neighbor.nextAction = elapsed + workerDelay();
        acted.add(neighbor);
      } else if (target < 0 || target >= CONFIG.slots || neighbor) {
        worker.direction *= -1;
        worker.pose = 1;
      } else {
        worker.slot = target;
        worker.pose = 2;
        worker.poseUntil = elapsed + CONFIG.stepPoseDuration;
      }
      changed = true;
    });
    if (changed) render();
  }
  function setShipPhase(phase) {
    ship.phase = phase;
    ship.time = 0;
    scene.dataset.phase = phase;
  }
  function updateCity() {
    const count = workers.filter(worker => worker.happy).length;
    const stage = Math.floor(count / 2);
    const city = scene.querySelector('.city');
    const source = stage === 0 ? 'assets/city.jpg' : images[`city-0${stage + 1}`].src;
    if (city.getAttribute('src') !== source) city.src = source;
    city.alt = [
      'Заводской город под багровым небом и дымящими трубами',
      'Заводской город в тёплом вечернем свете',
      'Светлый заводской город с деревьями и чистой улицей',
      'Зелёный солнечный город с кафе и дворцом культуры'
    ][stage];
    document.getElementById('happy-count').textContent = `${count} / 6`;
  }
  function resetShip() {
    Object.assign(ship, { x: side === 'light' ? x(3) : -20, controlSlot: 3, aiNextStep: 0.8, aiReactAt: Infinity, aiWillDefend: false, direction: 1, target: null, attackAt: 4.5, reflected: false, resolved: false });
    setShipPhase('cruise');
    attackStatus.textContent = side === 'light' ? 'НАВЕДИТЕСЬ И НАЖМИТЕ ПРОБЕЛ' : 'КОРАБЛЬ НАД ГОРОДОМ';
    updateCity();
    shipElement.querySelector('img').src = images.ship.src;
    drawShip();
  }
  function releaseTarget() {
    if (ship.target) ship.target.nextAction = elapsed + workerDelay();
    ship.target = null;
  }
  function isGuarded() {
    return ship.target && ((slot === ship.target.slot - 1 && facing === 1) || (slot === ship.target.slot && facing === -1));
  }
  function updateShip(dt) {
    ship.time += dt;
    if (ship.phase === 'cruise' && side === 'light') {
      drawShip();
      return;
    }
    if (ship.phase === 'cruise') {
      ship.x += ship.direction * CONFIG.cruiseSpeed * dt;
      if (ship.x > 122 || ship.x < -22) {
        ship.direction *= -1;
        ship.x = ship.direction === 1 ? -22 : 122;
      }
      if (elapsed >= ship.attackAt && ship.x > 0 && ship.x < 100) {
        const candidates = workers.filter(worker => !worker.happy);
        if (candidates.length) {
          ship.target = candidates[Math.floor(Math.random() * candidates.length)];
          ship.target.pose = 1;
          ship.fromX = ship.x;
          ship.aimX = x(ship.target.slot);
          setShipPhase('approach');
          attackStatus.textContent = 'ЦЕЛЬ ВЫБРАНА — ПОДСТАВЬТЕ ЗЕРКАЛО';
          render();
        } else {
          ship.attackAt = elapsed + 5;
          attackStatus.textContent = 'ВСЕ СТАЛИ ВЕСЕЛЬЧАКАМИ. ПОПРОБУЙТЕ ЗАНОВО';
        }
      }
    } else if (ship.phase === 'approach') {
      const t = Math.min(1, ship.time / CONFIG.approachDuration);
      ship.x = ship.fromX + (ship.aimX - ship.fromX) * t * t;
      if (t === 1) { setShipPhase('charge'); attackStatus.textContent = 'ЗАРЯДКА… ПОВЕРНИТЕ ЗЕРКАЛО К ЦЕЛИ'; }
    } else if (ship.phase === 'charge') {
      if (ship.time >= CONFIG.chargeDuration) {
        ship.reflected = false;
        ship.resolved = false;
        setShipPhase('beam');
        playSound('laser');
      }
    } else if (ship.phase === 'beam') {
      // Check the mirror when the advancing beam reaches its height.
      if (!ship.resolved && ship.time >= CONFIG.beamTravel * 0.86) {
        ship.resolved = true;
        ship.reflected = isGuarded();
        if (ship.reflected) {
          attackStatus.textContent = 'ОТРАЖЕНО!';
          playSound('reflect');
        }
      }
      if (!ship.reflected && ship.time >= CONFIG.beamTravel && ship.target && !ship.target.happy) {
        ship.target.happy = true;
        playSound('transform');
        selectMusic('happy');
        ship.target.pose = 1;
        updateCity();
        attackStatus.textContent = 'ПОПАДАНИЕ — ЕЩЁ ОДИН ВЕСЕЛЬЧАК';
        render();
      }
      if (ship.time >= CONFIG.beamTravel + CONFIG.beamHold) {
        if (!ship.target) attackStatus.textContent = 'ПРОМАХ — ВЫБЕРИТЕ ДРУГУЮ ПОЗИЦИЮ';
        releaseTarget();
        if (workers.every(worker => worker.happy)) {
          startFinale();
        } else if (ship.reflected) {
          ship.fromX = ship.x;
          ship.direction = ship.x < 50 ? -1 : 1;
          setShipPhase('escape');
          playSound('escape');
        } else {
          ship.attackAt = elapsed + 4 + Math.random() * 2;
          setShipPhase('cruise');
        }
      }
    } else if (ship.phase === 'escape') {
      const t = Math.min(1, ship.time / CONFIG.escapeDuration);
      ship.x = ship.fromX + ship.direction * 150 * t * t;
      if (t === 1) setShipPhase('away');
    } else if (ship.phase === 'away' && ship.time >= 2.2) {
      ship.direction = Math.random() < 0.5 ? -1 : 1;
      ship.x = side === 'light' ? x(ship.controlSlot) : ship.direction === 1 ? -22 : 122;
      ship.attackAt = elapsed + 4 + Math.random() * 2;
      setShipPhase('cruise');
      attackStatus.textContent = 'КОРАБЛЬ ВОЗВРАЩАЕТСЯ';
    }
    drawShip();
    render();
  }
  function drawShip() {
    renderPlayer();
    const charge = ship.phase === 'charge' ? Math.min(1, ship.time / CONFIG.chargeDuration) : 0;
    const shakeX = Math.sin(ship.time * 95) * charge * 0.55;
    const shakeY = Math.cos(ship.time * 113) * charge * 0.35;
    const scale = ship.phase === 'escape' ? Math.max(0.1, 1 - ship.time / CONFIG.escapeDuration * 0.9) : 1;
    shipElement.style.left = `${ship.x + shakeX}%`;
    shipElement.style.top = `${9 + shakeY}%`;
    shipElement.style.transform = `translateX(-50%) scale(${scale})`;
    shipElement.style.visibility = ship.phase === 'away' ? 'hidden' : 'visible';
    document.getElementById('charge-orb').style.opacity = charge ? 0.35 + charge * 0.65 : 0;
    document.getElementById('charge-orb').style.scale = 0.5 + charge * 1.7;
    marker.hidden = !ship.target;
    if (ship.target) marker.style.left = `${x(ship.target.slot)}%`;
    beamElement.hidden = ship.phase !== 'beam';
    if (ship.phase === 'beam') {
      beamElement.style.left = `${ship.aimX}%`;
      const end = ship.reflected ? MIRROR.y : 70;
      beamElement.style.height = `${(end - 25.2) * Math.min(1, ship.time / (CONFIG.beamTravel * (ship.reflected ? 0.86 : 1)))}%`;
    }
    document.getElementById('mirror-link').setAttribute('d', ship.phase === 'beam' && ship.reflected
      ? `M ${ship.aimX} ${MIRROR.y} L ${ship.aimX} 25.2` : '');
  }
  function setFinalePhase(phase) {
    finale.phase = phase;
    finale.time = 0;
    scene.dataset.finale = phase;
  }
  function startFinale() {
    if (finale.phase !== 'idle') return;
    keys.clear();
    pose = 1;
    player.classList.remove('mirror-horizontal');
    const heroX = x(slot + 0.5);
    const direction = heroX < 50 ? 1 : -1;
    Object.assign(finale, { x: direction === 1 ? -18 : 118, direction, heroX, travelTime: 0 });
    finale.stopX = heroX - direction * 5;
    workers.forEach(worker => { worker.nextDanceTurn = 0.6 + Math.random() * 1.5; });
    setFinalePhase('enter');
    setShipPhase('finale');
    attackStatus.textContent = 'КАЖЕТСЯ, ЗА ВАМИ ПРИШЛИ…';
    unicorn.hidden = false;
    render();
  }
  function updateBanknotes(dt) {
    banknoteDelay -= dt;
    const dropX = planePosition() + 19;
    if (finale.phase === 'ride' && finale.time >= FINALE.planeDelay && dropX > -2 && dropX < 102 && banknoteDelay <= 0 && banknotes.length < 80) {
      const element = document.createElement('img');
      element.className = 'banknote';
      element.src = 'assets/dollar-100.svg';
      element.alt = '';
      element.draggable = false;
      banknoteLayer.append(element);
      banknotes.push({ element, x: dropX, y: 28, age: 0, fall: 9 + Math.random() * 5, drift: 1 + Math.random() * 3, phase: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 100 });
      banknoteDelay = 0.14 + Math.random() * 0.12;
    }
    for (let i = banknotes.length - 1; i >= 0; i--) {
      const note = banknotes[i];
      note.age += dt;
      note.x += note.drift * dt;
      note.y += note.fall * dt;
      if (note.y > 106) { note.element.remove(); banknotes.splice(i, 1); continue; }
      const flutter = note.age * 4 + note.phase;
      note.element.style.left = `${note.x + Math.sin(flutter) * Math.min(2, note.age)}%`;
      note.element.style.top = `${note.y}%`;
      note.element.style.transform = `translate(-50%, -50%) rotate(${Math.sin(flutter * 0.7) * 25 + note.age * note.spin}deg) scaleY(${0.3 + Math.abs(Math.cos(flutter)) * 0.7})`;
      note.element.style.opacity = Math.min(1, (106 - note.y) / 12);
    }
  }
  function updateFinale(dt) {
    finale.time += dt;
    finale.travelTime += dt;
    updateBanknotes(dt);
    workers.forEach(worker => {
      if (finale.travelTime >= worker.nextDanceTurn) {
        worker.direction *= -1;
        worker.nextDanceTurn = finale.travelTime + 0.8 + Math.random() * 1.8;
      }
    });
    ship.x += (ship.x < 50 ? -1 : 1) * 50 * dt;
    shipElement.style.left = `${ship.x}%`;
    if (finale.phase === 'enter') {
      finale.x += finale.direction * FINALE.entranceSpeed * dt;
      if ((finale.x - finale.stopX) * finale.direction >= 0) {
        finale.x = finale.stopX;
        setFinalePhase('bump');
      }
    } else if (finale.phase === 'bump') {
      if (finale.time >= FINALE.bumpDuration) setFinalePhase('jump');
    } else if (finale.phase === 'jump') {
      if (finale.time >= FINALE.jumpDuration) {
        setFinalePhase('ride');
        attackStatus.textContent = 'ВСЕ СЧАСТЛИВЫ. ДАЖЕ ВЫ. КОНЕЦ!';
      }
    } else if (finale.phase === 'ride') {
      finale.x += finale.direction * FINALE.rideSpeed * dt;
      if (finale.x >= 84) { finale.x = 84; finale.direction = -1; }
      if (finale.x <= 16) { finale.x = 16; finale.direction = 1; }
    }
    render();
  }
  function drawFinale() {
    const mounted = finale.phase === 'ride';
    const planeX = planePosition();
    finalePlane.hidden = !mounted || finale.time < FINALE.planeDelay;
    finalePlane.style.left = `${planeX}%`;
    if (ready) finalePlane.src = images['finale-plane'].src;
    const moving = finale.phase === 'enter' || mounted;
    const frame = moving ? Math.floor(finale.travelTime / FINALE.poseDuration) % 2 + 1 : 1;
    const img = unicorn.querySelector('img');
    if (ready) img.src = images[`unicorn-${mounted ? 'with_player' : 'alone'}-${frame}`].src;
    img.style.transform = `scaleX(${finale.direction})`;
    unicorn.style.left = `${finale.x}%`;
    unicorn.style.bottom = `${8 + (mounted ? Math.abs(Math.sin(finale.travelTime * 10)) * 0.65 : 0)}%`;
    player.hidden = mounted;
    if (mounted) return;
    let heroX = finale.heroX;
    let bottom = 15;
    let rotation = 0;
    if (finale.phase === 'bump') {
      const t = Math.min(1, finale.time / FINALE.bumpDuration);
      bottom -= Math.sin(Math.PI * t) * 2;
      rotation = -finale.direction * Math.sin(Math.PI * t) * 9;
      unicorn.style.left = `${finale.x + finale.direction * Math.sin(Math.PI * t) * 1.5}%`;
    } else if (finale.phase === 'jump') {
      const t = Math.min(1, finale.time / FINALE.jumpDuration);
      heroX += (finale.x - finale.direction * 2 - heroX) * t;
      bottom += Math.sin(Math.PI * t) * 26 + t * 15;
      rotation = finale.direction * Math.sin(Math.PI * t) * 18;
    }
    player.style.left = `${heroX}%`;
    player.style.bottom = `${bottom}%`;
    player.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    player.querySelector('img').style.transform = `scaleX(${finale.direction})`;
    if (ready) player.querySelector('img').src = images['player-1'].src;
  }
  function updateDefender() {
    if (side !== 'light' || finale.phase !== 'idle' || elapsed < ship.aiNextStep) return;
    ship.aiNextStep = elapsed + 0.38 + Math.random() * 0.17;
    if (ship.phase === 'charge' && ship.target && ship.aiWillDefend && elapsed >= ship.aiReactAt) {
      const targetSlot = ship.target.slot;
      const options = [targetSlot - 1, targetSlot].filter(index => index >= 0 && index < CONFIG.playerSlots);
      const desired = options.sort((a, b) => Math.abs(a - slot) - Math.abs(b - slot))[0];
      if (slot !== desired) moveTo(slot + Math.sign(desired - slot));
      else {
        const desiredFacing = desired < targetSlot ? 1 : -1;
        if (facing !== desiredFacing) moveTo(slot + desiredFacing);
      }
    } else if (ship.phase === 'cruise' && Math.random() < 0.45) {
      moveTo(slot + (Math.random() < 0.5 ? -1 : 1));
    }
  }
  function frame(time) {
    const dt = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.1);
    previousTime = time;
    if (side && ready && !paused && !document.hidden) {
      elapsed += dt;
      cooldown -= dt;
      let settled = false;
      if (pose === 2 && elapsed >= poseUntil) { pose = 1; settled = true; }
      workers.forEach(worker => {
        if (worker.pose === 2 && elapsed >= worker.poseUntil) { worker.pose = 1; settled = true; }
      });
      if (settled) render();
      const direction = Number(keys.has('right')) - Number(keys.has('left'));
      if (direction && cooldown <= 0) { moveControlled(direction); cooldown = CONFIG.stepDelay; }
      updateWorkers();
      updateDefender();
      if (finale.phase === 'idle') updateShip(dt);
      else updateFinale(dt);
    }
    requestAnimationFrame(frame);
  }
  const directionFor = code => ({ ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' })[code];
  document.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea, select')) return;
    if (!side) {
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault();
        document.getElementById(event.code === 'ArrowLeft' ? 'choose-dark' : 'choose-light').focus();
      } else if (event.code === 'Enter' && !event.target.closest('.side-choice')) {
        event.preventDefault(); chooseSide('dark');
      }
      return;
    }
    if (event.code === 'Space' && side === 'light' && !event.target.closest('button')) {
      event.preventDefault(); if (!event.repeat) fireLaser(); return;
    }
    if (event.code === 'Space' && side === 'light' && event.target.id !== 'music-toggle' && event.target.id !== 'pause' && event.target.id !== 'reset' && event.target.id !== 'change-side') {
      event.preventDefault(); if (!event.repeat) fireLaser(); return;
    }
    const direction = directionFor(event.code);
    if (!direction) return;
    event.preventDefault();
    if (!keys.has(direction) && !event.repeat) {
      moveControlled(direction === 'right' ? 1 : -1);
      cooldown = CONFIG.stepDelay;
    }
    keys.add(direction);
  });
  document.addEventListener('keyup', event => { const direction = directionFor(event.code); if (direction) keys.delete(direction); });
  window.addEventListener('blur', () => { keys.clear(); });
  document.addEventListener('visibilitychange', () => {
    keys.clear(); previousTime = null;
    if (document.hidden && ready && side) setPaused(true);
  });
  document.getElementById('left').addEventListener('click', () => moveControlled(-1));
  document.getElementById('right').addEventListener('click', () => moveControlled(1));
  scene.addEventListener('click', event => {
    const bounds = scene.getBoundingClientRect();
    if (side !== 'light' && (event.clientY - bounds.top) / bounds.height < 0.5) return;
    const percent = (event.clientX - bounds.left) / bounds.width * 100;
    if (side === 'light') {
      moveShipTo(Math.round((percent - CONFIG.firstX) / (CONFIG.lastX - CONFIG.firstX) * 7));
      return;
    }
    const target = Math.round((percent - CONFIG.firstX) / (CONFIG.lastX - CONFIG.firstX) * (CONFIG.slots - 1) - 0.5);
    moveTo(Math.max(0, Math.min(CONFIG.playerSlots - 1, target)));
  });
  document.getElementById('choose-dark').addEventListener('click', () => chooseSide('dark'));
  document.getElementById('choose-light').addEventListener('click', () => chooseSide('light'));
  document.getElementById('change-side').addEventListener('click', showSideMenu);
  fireButton.addEventListener('click', fireLaser);
  pauseButton.addEventListener('click', () => setPaused(!paused));
  resetButton.addEventListener('click', reset);

  const names = ['player-1', 'player-2', 'player-3', 'ship', 'city-02', 'city-03', 'city-04', 'unicorn-alone-1', 'unicorn-alone-2', 'unicorn-with_player-1', 'unicorn-with_player-2', 'finale-plane', 'choose-side'];
  for (let type = 1; type <= 4; type++) for (let frame = 1; frame <= 2; frame++) names.push(`worker-${type}-${frame}`, `happy-${type}-${frame}`, `dance-${type}-${frame}`);
  render();
  Promise.all([...names.map(name => new Promise((resolve, reject) => {
    const image = new Image(); images[name] = image;
    image.onload = resolve; image.onerror = reject; image.src = `assets/${name}.${(name.startsWith('city-') || name === 'choose-side') ? 'jpg' : 'png'}`;
  })), new Promise((resolve, reject) => {
    const city = scene.querySelector('.city');
    if (city.complete) { city.naturalWidth ? resolve() : reject(); }
    else { city.onload = resolve; city.onerror = reject; }
  })]).then(() => {
    ready = true; pauseButton.disabled = false; resetButton.disabled = false;
    document.getElementById('choose-dark').disabled = false;
    document.getElementById('choose-light').disabled = false;
    document.getElementById('menu-status').textContent = 'Выберите сторону. ← → и Enter или касание.';
  }).catch(() => { document.getElementById('menu-status').textContent = 'Не удалось загрузить игру. Обновите страницу, чтобы попробовать ещё раз.'; });
  requestAnimationFrame(frame);
})();
