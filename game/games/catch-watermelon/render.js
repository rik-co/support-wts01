'use strict';
const playerImage = new Image();
playerImage.src = 'assets/player-poses.png';
const LANES = [
  { x: 451, y: 361, endX: 623, endY: 515 },
  { x: 456, y: 521, endX: 645, endY: 584 },
  { x: 993, y: 361, endX: 825, endY: 515 },
  { x: 990, y: 521, endX: 803, endY: 584 }
];
const FRUIT_STEPS = 5;
// Source rectangles keep the head and feet registered at the same scale.
const PLAYER_POSES = [
  { x: 200, y: 0, w: 400, h: 586 },
  { x: 787, y: 0, w: 400, h: 586 },
  { x: 190, y: 586, w: 410, h: 570 },
  { x: 785, y: 586, w: 410, h: 570 }
];
function fruitStep(fruit) {
  return Math.min(FRUIT_STEPS - 1, Math.floor(fruit.progress * FRUIT_STEPS));
}
function fruitPosition(fruit) {
  const lane = LANES[fruit.lane];
  const step = fruitStep(fruit);
  const p = step / (FRUIT_STEPS - 1);
  return { x: lane.x + (lane.endX - lane.x) * p, y: lane.y + (lane.endY - lane.y) * p };
}
function watermelon(ctx, x, y, radius, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.globalAlpha = .86;
  ctx.fillStyle = '#304532';
  ctx.strokeStyle = '#283a2b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * .83, radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  // Uneven pale bands echo the printed watermelons in the original reference.
  ctx.fillStyle = '#919985';
  for (const offset of [-.5, .08, .58]) {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const y = -radius + i * radius / 6;
      const bend = Math.sin(i * .72 + offset * 4) * 3;
      const x = offset * radius * Math.sin(Math.PI * i / 12) + bend;
      ctx.lineTo(x - 2.4 - (i % 3), y);
    }
    for (let i = 12; i >= 0; i--) {
      const y = -radius + i * radius / 6;
      const bend = Math.sin(i * .72 + offset * 4) * 3;
      const x = offset * radius * Math.sin(Math.PI * i / 12) + bend;
      ctx.lineTo(x + 2.4 + (i % 2), y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#304532';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(3, -radius - 9, -3, -radius - 10);
  ctx.stroke();
  ctx.restore();
}
function drawBrokenWatermelon(ctx, broken) {
  const x=broken.lane<2?570:878, y=725;
  ctx.save();
  ctx.translate(x,y);
  ctx.globalAlpha=.88;
  // Printed LCD-style halves, a jagged edge and scattered seeds at ground level.
  for(const side of [-1,1]){
    ctx.save();ctx.translate(side*24,side===1?3:0);ctx.rotate(side*.28);
    ctx.fillStyle='#354a34';ctx.strokeStyle='#2b3c2b';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(-27,-11);ctx.lineTo(-15,-6);ctx.lineTo(-5,-14);ctx.lineTo(5,-7);ctx.lineTo(17,-13);ctx.lineTo(28,-9);
    ctx.bezierCurveTo(27,27,-24,30,-27,-11);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#929a78';ctx.beginPath();ctx.moveTo(-23,-5);ctx.lineTo(23,-5);ctx.bezierCurveTo(19,20,-18,22,-23,-5);ctx.fill();
    ctx.fillStyle='#966d52';ctx.beginPath();ctx.moveTo(-20,-7);ctx.lineTo(-6,-10);ctx.lineTo(4,-4);ctx.lineTo(20,-8);ctx.bezierCurveTo(17,15,-15,18,-20,-7);ctx.fill();
    ctx.fillStyle='#2b3c2b';
    for(const [sx,sy] of [[-10,1],[0,5],[10,0]]){ctx.beginPath();ctx.ellipse(sx,sy,1.6,3,.5,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  ctx.fillStyle='#354a34';
  for(const [sx,sy] of [[-54,12],[51,16],[-9,21],[8,19]]){ctx.beginPath();ctx.ellipse(sx,sy,3,1.5,-.4,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function drawPlayer(ctx, s) {
  if (!playerImage.complete || !playerImage.naturalWidth) return;
  const dancing = s.phase === 'birthday';
  const beat = Math.floor(s.time / .42) % 2;
  const pose = PLAYER_POSES[dancing ? 2 + beat : s.lane % 2];
  const scale = 300 / 586;
  ctx.save();
  ctx.translate(724, 748);
  if (dancing) {
    // Alternate both raised fists together; keep the body facing the audience.
    ctx.translate(Math.sin(s.time * Math.PI / .42) * 3, -Math.abs(Math.sin(s.time * Math.PI / .42)) * 3);
  } else {
    ctx.scale(s.lane >= 2 ? 1 : -1, 1);
  }
  const left = dancing ? -pose.w * scale / 2 : -76;
  ctx.drawImage(playerImage, pose.x, pose.y, pose.w, pose.h,
    left, -pose.h * scale, pose.w * scale, pose.h * scale);
  ctx.restore();
}
function drawBasket(ctx, lane) {
  const x = lane.endX, y = lane.endY + 18;
  ctx.fillStyle = '#999a79';
  ctx.strokeStyle = '#344231';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 48, y);
  ctx.lineTo(x - 32, y + 43);
  ctx.quadraticCurveTo(x, y + 55, x + 32, y + 43);
  ctx.lineTo(x + 48, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.lineWidth = 2;
  for (let i = -85; i < 85; i += 15) {
    ctx.beginPath();ctx.moveTo(x + i, y);ctx.lineTo(x + i + 45, y + 65);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x + i, y);ctx.lineTo(x + i - 45, y + 65);ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();ctx.ellipse(x, y, 49, 9, 0, 0, Math.PI * 2);ctx.fill();ctx.stroke();
}
function lcdText(ctx, text, x, y, size) {
  ctx.fillStyle = '#283528';
  ctx.font = `${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}
function drawGame(ctx, s) {
  ctx.clearRect(0, 0, 1448, 1086);
  ctx.save();ctx.beginPath();ctx.rect(359, 282, 731, 478);ctx.clip();
  lcdText(ctx, String(s.score).padStart(4, '0'), 772, 361, 68);
  lcdText(ctx, 'ПРОМАХИ ' + '●'.repeat(s.misses) + '○'.repeat(3 - s.misses), 755, 397, 25);
  drawPlayer(ctx, s);
  if (s.phase !== 'birthday') drawBasket(ctx, LANES[s.lane]);
  for (const fruit of s.fruits) {
    const p = fruitPosition(fruit);
    watermelon(ctx, p.x, p.y, 28, fruit.lane < 2 ? -.28 : .28);
  }
  for (const broken of s.broken) drawBrokenWatermelon(ctx, broken);
  if (s.phase === 'birthday') {
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = ['#8c6048', '#aaa064', '#64805c'][i % 3];
      ctx.fillRect(385 + (i * 83) % 685, 490 + ((s.time * 65 + i * 31) % 250), 6, 9);
    }
    lcdText(ctx, 'С ДНЁМ РОЖДЕНИЯ!', 724, 434, 31);
    lcdText(ctx, '68 — пора потанцевать!', 724, 461, 20);
  } else if (['idle', 'paused', 'over'].includes(s.phase)) {
    lcdText(ctx, s.phase === 'idle' ? 'ЛОВИ АРБУЗЫ!' : s.phase === 'paused' ? 'ПАУЗА' : 'ПОПРОБУЕМ ЕЩЁ?', 724, 439, 30);
  }
  ctx.restore();
}
