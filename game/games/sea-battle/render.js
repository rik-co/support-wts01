'use strict';
function drawSea(canvas,s,cfg){
 const c=canvas.getContext('2d'),W=1000,H=560,horizon=238;
 c.clearRect(0,0,W,H);
 c.fillStyle='#050907';c.fillRect(0,0,W,H);
 // The eyepiece clips a moving world; the reticle stays in screen space.
 c.save();c.beginPath();c.ellipse(500,280,425,235,0,0,Math.PI*2);c.clip();
 c.save();c.translate(500,horizon);c.scale(cfg.viewScale,cfg.viewScale);c.translate(-s.aim,-horizon);

 let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#316d61');g.addColorStop(.42,'#71947b');g.addColorStop(.43,'#345f50');g.addColorStop(1,'#102f27');c.fillStyle=g;c.fillRect(-1000,-1000,3000,2500);
 // Soft painted clouds, kept deterministic so the scenery never flickers.
 for(let i=0;i<18;i++){const x=(i*173)%1100-40,y=45+(i*37)%130;c.fillStyle=`rgba(182,194,147,${.025+(i%3)*.012})`;c.beginPath();c.ellipse(x,y,100+(i%4)*20,14+(i%3)*6,0,0,Math.PI*2);c.fill();}
 c.fillStyle='#a7b78b20';c.fillRect(80,horizon-3,840,3);
 for(let i=0;i<42;i++){const z=i/42,y=horizon+z*z*(H-horizon);const offset=Math.sin(s.time*.6+i*1.9)*9;c.strokeStyle=`rgba(150,186,143,${.045+(i%4)*.025})`;c.lineWidth=1+z*2;c.beginPath();c.moveTo(offset,y);c.bezierCurveTo(420,y-3,1060,y+4,cfg.worldWidth+offset,y);c.stroke();}
 function rocks(points){c.fillStyle='#183b30';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.strokeStyle='#60745a35';c.lineWidth=3;c.stroke();}
 // Ship silhouette on a single horizontal target lane.
 const sinking=s.ship.sinking===null?0:Math.min(1,s.ship.sinking/cfg.sinkTime);
  c.save();c.beginPath();c.rect(0,0,cfg.worldWidth,horizon+2);c.clip();c.translate(s.ship.x,horizon+sinking*55);c.rotate(sinking*.28*s.ship.direction);c.scale(s.ship.direction,1);c.fillStyle='#172e27';c.beginPath();c.moveTo(-34,-8);c.lineTo(34,-8);c.lineTo(24,1);c.lineTo(-24,1);c.closePath();c.fill();c.fillRect(-15,-17,29,9);c.fillRect(-4,-25,8,10);c.fillRect(0,-39,2,24);c.fillRect(-9,-30,20,2);c.fillRect(15,-22,5,9);c.restore();
 // Enlarged landmarks make the edge of the playable sea readable through the narrow eyepiece.
 rocks([[0,42],[58,72],[86,128],[119,111],[151,178],[184,165],[214,225],[270,244],[480,314],[0,360]]);
 rocks([[cfg.worldWidth,64],[cfg.worldWidth-58,91],[cfg.worldWidth-86,145],[cfg.worldWidth-119,126],[cfg.worldWidth-151,190],[cfg.worldWidth-184,174],[cfg.worldWidth-214,228],[cfg.worldWidth-270,250],[cfg.worldWidth-480,314],[cfg.worldWidth,360]]);
 if(sinking>0 && sinking<1){c.strokeStyle=`rgba(187,211,167,${1-sinking})`;c.beginPath();c.ellipse(s.ship.x,horizon+3,25+sinking*35,3+sinking*5,0,0,Math.PI*2);c.stroke();}
 if(s.torpedo){const p=Math.min(1,s.torpedo.elapsed/cfg.travel);for(let j=0;j<7;j++){const t=p-j*.038;if(t<0)continue;const y=H-15-(H-15-horizon)*t,x=s.torpedo.origin+(s.torpedo.x-s.torpedo.origin)*t;c.strokeStyle=`rgba(222,241,181,${(1-j/7)*.9})`;c.lineWidth=4*(1-t)+1;c.shadowColor='#d9ffab';c.shadowBlur=9;c.beginPath();c.moveTo(x,y);c.lineTo(x-(s.torpedo.x-s.torpedo.origin)*.018,y+7*(1-t)+2);c.stroke();}c.shadowBlur=0;}
 if(s.burst){const b=s.burst,a=1-b.age;c.save();c.translate(b.x,horizon);c.globalAlpha=a;if(b.hit){c.fillStyle='#f1d79a';c.shadowColor='#f6d799';c.shadowBlur=25;c.beginPath();for(let i=0;i<24;i++){const angle=i/24*Math.PI*2,r=(i%2?12:34)*(1+b.age);c.lineTo(Math.cos(angle)*r,Math.sin(angle)*r-12);}c.closePath();c.fill();}else{c.strokeStyle='#c7dcc0';c.lineWidth=2;c.beginPath();c.ellipse(0,0,12+b.age*30,3+b.age*6,0,0,Math.PI*2);c.stroke();}c.restore();}
 c.restore();
 // Fixed optical reticle, independent of the world-space firing bearing.
 // A warm illuminated reticle keeps the original instrument feel while staying readable over the sea.
 c.save();c.shadowColor='#e15a3f';c.shadowBlur=12;c.strokeStyle='#e87555cc';c.lineWidth=2;c.beginPath();c.moveTo(500,horizon-62);c.lineTo(500,horizon-13);c.moveTo(500,horizon+13);c.lineTo(500,horizon+56);c.moveTo(500-42,horizon);c.lineTo(500-13,horizon);c.moveTo(500+13,horizon);c.lineTo(500+42,horizon);for(let i=-3;i<=3;i++){c.moveTo(500+i*13,horizon+47);c.lineTo(500+i*13,horizon+47+(i%3===0?8:4));}c.stroke();c.shadowBlur=0;
 c.fillStyle='#f0a06e';c.shadowColor='#e15a3f';c.shadowBlur=10;c.beginPath();c.arc(500,horizon,3.5,0,Math.PI*2);c.fill();c.restore();
 g=c.createRadialGradient(500,240,130,500,260,560);g.addColorStop(0,'#00000000');g.addColorStop(.7,'#03140c30');g.addColorStop(1,'#020e09df');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle='#08180e14';for(let y=0;y<H;y+=4)c.fillRect(0,y,W,1);
 c.restore();
 c.strokeStyle='#344239';c.lineWidth=12;c.beginPath();c.ellipse(500,280,431,241,0,0,Math.PI*2);c.stroke();
 c.strokeStyle='#101913';c.lineWidth=8;c.beginPath();c.ellipse(500,280,441,251,0,0,Math.PI*2);c.stroke();
 // Vacuum-tube style readout, kept in screen space like an instrument label.
 const worldCenter=cfg.worldWidth/2;const angleRange=worldCenter-(500/cfg.viewScale);const angle=Math.max(-45,Math.min(45,Math.round((s.aim-worldCenter)/angleRange*45)));const angleText=`ПОВОРОТ ${angle>=0?'+':''}${angle}°`;
 c.save();c.textAlign='center';c.font='12px monospace';c.shadowColor='#a9e3a0';c.shadowBlur=9;c.fillStyle='#b7e2a4';c.fillText(angleText,500,548);
 if(s.torpedo){
   const distance=Math.max(0,Math.round(Math.abs(s.ship.x-s.torpedo.x)));
   c.font='11px monospace';c.fillStyle='#d2e8ae';c.shadowBlur=11;c.fillText(`ДИСТАНЦИЯ ${String(distance).padStart(3,'0')} м`,500,529);
 }
 c.restore();
}

function drawRadar(canvas,s,cfg){
 if(!canvas)return;
 const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,cx=W/2,cy=H/2,r=112;
 const worldCenter=cfg.worldWidth/2;
 c.clearRect(0,0,W,H);c.fillStyle='#06110d';c.fillRect(0,0,W,H);
 c.save();c.translate(cx,cy);
 c.shadowColor='#5eea9b';c.shadowBlur=14;c.strokeStyle='#5fbd83aa';c.lineWidth=1;
 for(const ring of [.25,.5,.75,1]){c.beginPath();c.arc(0,0,r*ring,0,Math.PI*2);c.stroke();}
 c.shadowBlur=0;c.strokeStyle='#5fbd8340';c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.moveTo(0,-r);c.lineTo(0,r);c.stroke();
 const sweep=(s.time*1.8)%(Math.PI*2);const gradient=c.createConicGradient(sweep-.48,0,0);gradient.addColorStop(0,'#8dffc055');gradient.addColorStop(.12,'#78ed9b18');gradient.addColorStop(.2,'#78ed9b00');gradient.addColorStop(1,'#78ed9b00');c.fillStyle=gradient;c.beginPath();c.moveTo(0,0);c.arc(0,0,r,sweep-.48,sweep);c.closePath();c.fill();
 c.strokeStyle='#9fffb7dd';c.shadowColor='#65ff9c';c.shadowBlur=12;c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(sweep)*r,Math.sin(sweep)*r);c.stroke();
 const safeHalf=worldCenter-(500/cfg.viewScale);const viewRotation=((s.aim-worldCenter)/safeHalf)*Math.PI/4;const targetAngle=-Math.PI/2+Math.atan2(s.ship.x-s.aim,500);const targetRadius=Math.min(108,18+Math.abs(s.ship.x-s.aim)/500*90);const tx=Math.cos(targetAngle)*targetRadius,ty=Math.sin(targetAngle)*targetRadius;let delta=Math.atan2(Math.sin(sweep-targetAngle),Math.cos(sweep-targetAngle));const detected=Math.abs(delta)<.16;
 c.fillStyle=detected?'#eaffc1':'#80e79d88';c.shadowColor=detected?'#eaff9d':'#5eea9b';c.shadowBlur=detected?24:9;c.beginPath();c.arc(tx,ty,detected?5:3,0,Math.PI*2);c.fill();
 if(detected){c.strokeStyle='#d7ffad99';c.lineWidth=1;c.beginPath();c.arc(tx,ty,10+(Math.sin(s.time*12)+1)*4,0,Math.PI*2);c.stroke();}
 if(s.torpedo){const torpedoAngle=-Math.PI/2+Math.atan2(s.torpedo.origin-s.aim,500);const torpedoRadius=Math.min(108,Math.max(4,4+(s.torpedo.elapsed/cfg.travel)*104));const px=Math.cos(torpedoAngle)*torpedoRadius,py=Math.sin(torpedoAngle)*torpedoRadius;c.fillStyle='#f19a65';c.shadowColor='#ed7549';c.shadowBlur=12;c.beginPath();c.arc(px,py,3.5,0,Math.PI*2);c.fill();}
 c.restore();
 // The optical axis is always the 12 o'clock bearing; the compass rotates beneath it.
 const compassRotation=-viewRotation;const compass=[['N',-Math.PI/2],['E',0],['S',Math.PI/2],['W',Math.PI]];
 c.save();c.fillStyle='#77b88a';c.font='9px monospace';c.textAlign='center';c.textBaseline='middle';
 for(const [label,bearing] of compass){const a=bearing+compassRotation;c.fillText(label,cx+Math.cos(a)*(r+13),cy+Math.sin(a)*(r+13));}
 c.fillStyle='#b5e8a1';c.shadowColor='#79e99b';c.shadowBlur=8;c.beginPath();c.moveTo(cx,cy-r-4);c.lineTo(cx-4,cy-r+5);c.lineTo(cx+4,cy-r+5);c.closePath();c.fill();c.restore();
 if(document.getElementById('radar-readout'))document.getElementById('radar-readout').textContent=detected?'КОНТАКТ · ВСПЛЕСК':'ЦЕЛЬ В СЕКТОРЕ';
}
