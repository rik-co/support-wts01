'use strict';
function drawSea(canvas,s,cfg){
 const c=canvas.getContext('2d'),W=1000,H=560,horizon=238;
 c.clearRect(0,0,W,H);
 let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#316d61');g.addColorStop(.42,'#71947b');g.addColorStop(.43,'#345f50');g.addColorStop(1,'#102f27');c.fillStyle=g;c.fillRect(0,0,W,H);
 // Soft painted clouds, kept deterministic so the scenery never flickers.
 for(let i=0;i<18;i++){const x=(i*173)%1100-40,y=45+(i*37)%130;c.fillStyle=`rgba(182,194,147,${.025+(i%3)*.012})`;c.beginPath();c.ellipse(x,y,100+(i%4)*20,14+(i%3)*6,0,0,Math.PI*2);c.fill();}
 c.fillStyle='#a7b78b20';c.fillRect(80,horizon-3,840,3);
 for(let i=0;i<42;i++){const z=i/42,y=horizon+z*z*(H-horizon);const offset=Math.sin(s.time*.6+i*1.9)*9;c.strokeStyle=`rgba(150,186,143,${.045+(i%4)*.025})`;c.lineWidth=1+z*2;c.beginPath();c.moveTo(70+offset,y);c.bezierCurveTo(320,y-3,620,y+4,950+offset,y);c.stroke();}
 function rocks(points){c.fillStyle='#183b30';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.strokeStyle='#60745a35';c.lineWidth=3;c.stroke();}
 // Ship silhouette on a single horizontal target lane.
 const sinking=s.ship.sinking===null?0:Math.min(1,s.ship.sinking/cfg.sinkTime);
 c.save();c.beginPath();c.rect(0,0,W,horizon+2);c.clip();c.translate(s.ship.x,horizon+sinking*55);c.rotate(sinking*.28*s.ship.direction);c.scale(s.ship.direction,1);c.fillStyle='#172e27';c.beginPath();c.moveTo(-34,-8);c.lineTo(34,-8);c.lineTo(24,1);c.lineTo(-24,1);c.closePath();c.fill();c.fillRect(-15,-17,29,9);c.fillRect(-4,-25,8,10);c.fillRect(0,-39,2,24);c.fillRect(-9,-30,20,2);c.fillRect(15,-22,5,9);c.restore();
 rocks([[0,80],[38,107],[54,153],[77,143],[100,205],[126,219],[147,256],[0,288]]);
 rocks([[1000,112],[955,148],[932,141],[900,191],[879,174],[850,212],[818,222],[799,256],[1000,290]]);
 if(sinking>0 && sinking<1){c.strokeStyle=`rgba(187,211,167,${1-sinking})`;c.beginPath();c.ellipse(s.ship.x,horizon+3,25+sinking*35,3+sinking*5,0,0,Math.PI*2);c.stroke();}
 if(s.torpedo){const p=Math.min(1,s.torpedo.elapsed/cfg.travel);for(let j=0;j<7;j++){const t=p-j*.038;if(t<0)continue;const y=H-15-(H-15-horizon)*t,x=500+(s.torpedo.x-500)*t;c.strokeStyle=`rgba(222,241,181,${(1-j/7)*.9})`;c.lineWidth=4*(1-t)+1;c.shadowColor='#d9ffab';c.shadowBlur=9;c.beginPath();c.moveTo(x,y);c.lineTo(x-(s.torpedo.x-500)*.018,y+7*(1-t)+2);c.stroke();}c.shadowBlur=0;}
 if(s.burst){const b=s.burst,a=1-b.age;c.save();c.translate(b.x,horizon);c.globalAlpha=a;if(b.hit){c.fillStyle='#f1d79a';c.shadowColor='#f6d799';c.shadowBlur=25;c.beginPath();for(let i=0;i<24;i++){const angle=i/24*Math.PI*2,r=(i%2?12:34)*(1+b.age);c.lineTo(Math.cos(angle)*r,Math.sin(angle)*r-12);}c.closePath();c.fill();}else{c.strokeStyle='#c7dcc0';c.lineWidth=2;c.beginPath();c.ellipse(0,0,12+b.age*30,3+b.age*6,0,0,Math.PI*2);c.stroke();}c.restore();}
 // Fine periscope reticle: only horizontal aiming affects the shot.
 c.strokeStyle='#d2deac80';c.lineWidth=1;c.beginPath();c.moveTo(s.aim,horizon-62);c.lineTo(s.aim,horizon-13);c.moveTo(s.aim,horizon+13);c.lineTo(s.aim,horizon+56);c.moveTo(s.aim-42,horizon);c.lineTo(s.aim-13,horizon);c.moveTo(s.aim+13,horizon);c.lineTo(s.aim+42,horizon);for(let i=-3;i<=3;i++){c.moveTo(s.aim+i*13,horizon+47);c.lineTo(s.aim+i*13,horizon+47+(i%3===0?8:4));}c.stroke();
 g=c.createRadialGradient(500,240,130,500,260,560);g.addColorStop(0,'#00000000');g.addColorStop(.7,'#03140c30');g.addColorStop(1,'#020e09df');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle='#08180e14';for(let y=0;y<H;y+=4)c.fillRect(0,y,W,1);
}
