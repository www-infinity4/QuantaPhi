/* Original light-weight, live QuantaPhi Bubbles motion preview.
 * Not an AI-rendered movie, not a background recorder and not an ad.
 * Deterministic CSS/canvas animation honours reduced-motion and visibility.
 */
(function(root){
'use strict';
const docs=root.document;if(!docs)return;
const panels=[...docs.querySelectorAll('[data-bubbles-orbit]')];
if(!panels.length)return;
const TAU=Math.PI*2;
function draw(ctx,w,h,t){
 ctx.clearRect(0,0,w,h);
 const bg=ctx.createLinearGradient(0,0,w,h);
 bg.addColorStop(0,'#1d1039');bg.addColorStop(.55,'#47206e');bg.addColorStop(1,'#102f52');
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const n=22,cx=w/2,cy=h/2,scale=Math.min(w,h),dt=t/1000;
 for(let i=0;i<n;i++){
  const p=i/n,theta=dt*.55+i*2.399963,depth=.52+.48*Math.cos(theta*.75+p*6);
  const r=scale*(.09+.30*p)*depth;
  const x=cx+Math.cos(theta)*r,y=cy+Math.sin(theta*1.17)*r*.62+Math.sin(dt+p*15)*scale*.08;
  const size=scale*(.013+.021*(1-p))* (.65+depth);
  const glow=ctx.createRadialGradient(x-size*.35,y-size*.45,1,x,y,size*1.6);
  glow.addColorStop(0,'#fff');glow.addColorStop(.24,i%4===0?'#f3c7ff':'#c3ffff');
  glow.addColorStop(.64,i%4===0?'#b06cfeaa':'#5c9deab0');glow.addColorStop(1,'#5d68dc00');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,size*1.6,0,TAU);ctx.fill();
  ctx.strokeStyle='#ecfcffc9';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,size*.85,0,TAU);ctx.stroke();
 }
 ctx.textAlign='center';ctx.font='700 '+Math.max(17,Math.round(scale*.053))+'px system-ui,sans-serif';
 ctx.fillStyle='#fff';ctx.fillText('Bubbles in motion',cx,h*.86);
}
for(const panel of panels){
 const canvas=panel.querySelector('canvas');
 if(!canvas)continue;
 const ctx=canvas.getContext('2d');if(!ctx)continue;
 const button=panel.querySelector('[data-bubbles-pause]');
 let playing=!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let frame=0,last=0,visible=true;
 const maxWidth=1000;
 function paint(now){const width=Math.max(320,Math.min(maxWidth,Math.round(canvas.clientWidth||720))),height=Math.round(width*9/16);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
 draw(ctx,width,height,now)}
 function loop(now){frame=0;if(!playing||!visible||docs.hidden)return;last=now;paint(now);frame=root.requestAnimationFrame(loop)}
 function update(){if(button)button.textContent=playing?'Pause motion':'Play motion';
 if(frame)root.cancelAnimationFrame(frame);frame=0;paint(last);if(playing&&visible&&!docs.hidden)frame=root.requestAnimationFrame(loop)}
 button?.addEventListener('click',()=>{playing=!playing;update()});
 docs.addEventListener('visibilitychange',update);
 if('IntersectionObserver' in root){
  const observer=new IntersectionObserver(items=>{visible=items.some(item=>item.isIntersecting);update()},{threshold:.05});observer.observe(canvas);
 }
 if('ResizeObserver' in root){new ResizeObserver(()=>paint(last)).observe(canvas)}
 update();
}
})(window);
