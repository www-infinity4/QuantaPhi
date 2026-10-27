export const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0070ba">
<title>Continuity · Live cycle</title><link rel="stylesheet" href="/style.css"><script type="module" src="/app.js"></script></head>
<body><main><header><a class="brand" href="https://quantaphi.org/continuity/">∞ QuantaPhi</a><span class="eyebrow">CONTINUITY</span>
<h1>A clear view of the work.</h1><p class="intro">Eight tracks. Saved checkpoints. Real system checks.</p>
<div class="toolbar"><span id="fresh" class="pill">Reading latest cycle…</span><button id="refresh" type="button">Refresh</button></div>
<p id="time" class="muted" role="status" aria-live="polite">Loading the latest saved checkpoint.</p></header>
<section class="numbers" aria-label="Cycle status"><div><strong>5 min</strong><span>Monitoring cycle</span></div><div><strong>Hourly</strong><span>Engineering task</span></div><div><strong id="sessions">—</strong><span>Connected chat sessions</span></div></section>
<p class="explain">These tracks monitor the site and its engineering evidence. ChatGPT, Work and Gemini execution require their own connected, authorized runners.</p>
<section id="tracks" class="grid" aria-label="Eight Continuity tracks"></section>
<footer><a href="/status">Read the cycle receipt</a><a href="https://quantaphi.org/continuity/owner/">Open owner work</a><a href="https://github.com/www-infinity4/QuantaPhi/issues/1145">Engineering checkpoint</a></footer>
</main></body></html>`;

export const STYLE = `*{box-sizing:border-box}body{margin:0;background:#f7f9fc;color:#192b3c;font:16px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1080px;margin:auto;padding:38px 22px 32px}.brand{color:#006bb3;font-weight:750;text-decoration:none}.eyebrow{display:block;margin-top:36px;font-size:12px;letter-spacing:.2em;font-weight:750;color:#526d83}h1{font-size:clamp(30px,5vw,48px);letter-spacing:-.04em;line-height:1.15;margin:10px 0 14px}.intro{font-size:19px;color:#50677c;margin:0 0 24px}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}button,.pill{border-radius:24px;padding:10px 17px;font-size:14px;font-weight:650}button{background:#0070ba;border:0;color:#fff;min-height:44px;cursor:pointer}button:disabled{opacity:.5}.pill{background:#e8edf3;color:#41566c}.pill.live{background:#dff4e9;color:#126b45}.pill.stale{background:#fff0d5;color:#81590b}.muted{color:#60778a;font-size:14px}.numbers{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:30px}.numbers div{background:white;border:1px solid #dde6ee;border-radius:18px;padding:20px}.numbers strong{display:block;font-size:26px;line-height:1.2}.numbers span{display:block;color:#60778a;font-size:13px;margin-top:6px}.explain{color:#50677c;max-width:800px;font-size:14px;margin:22px 0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{background:white;border:1px solid #dce5ee;border-radius:20px;padding:22px;min-width:0}.card h2{font-size:18px;margin:0 0 12px;letter-spacing:-.02em}.state{display:inline-flex;font-size:12px;padding:4px 10px;border-radius:12px;background:#e9eef5;color:#435e74;font-weight:700}.state.checked{background:#e3f3ec;color:#16694b}.state.attention,.state.unreachable,.state.stale{background:#fff0d5;color:#835b11}.card p{margin:14px 0 8px;font-size:14px;color:#50677c;overflow-wrap:anywhere}.card a,footer a{color:#006bb3;font-size:14px;text-underline-offset:3px}.card small{display:block;margin-top:10px;color:#60778a;overflow-wrap:anywhere}footer{display:flex;flex-wrap:wrap;gap:14px 24px;margin-top:30px;padding-top:20px;border-top:1px solid #dce5ee}@media(max-width:550px){main{padding:24px 16px}.eyebrow{margin-top:28px}.grid{grid-template-columns:1fr}.numbers{gap:8px}.numbers div{padding:15px 10px}.numbers strong{font-size:21px}.numbers span{font-size:11px}.card{padding:20px}}`;

export const APP = `const el=id=>document.getElementById(id);
const states={checked:'Checked',cached:'Saved source check',stale:'Saved check · refresh unavailable',blocked:'Needs connection or acceptance',attention:'Needs attention',unreachable:'Check unavailable'};
let busy=false;
async function refresh(){
 if(busy)return;busy=true;el('refresh').disabled=true;
 try{
  const response=await fetch('/status',{cache:'no-store',signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(!data.report?.tracks)throw Error();
  el('fresh').textContent=data.fresh?'Latest cycle received':'Cycle overdue';el('fresh').className='pill '+(data.fresh?'live':'stale');
  el('time').textContent='Last completed '+new Date(data.completedAt).toLocaleString()+'.';
  el('sessions').textContent=String(data.report.observedAuthenticatedSessions);
  const fragment=document.createDocumentFragment();
  for(const t of data.report.tracks){
   const card=document.createElement('article');card.className='card';
   const title=document.createElement('h2');title.textContent=t.label;card.append(title);
   const state=document.createElement('span');state.className='state '+t.state;state.textContent=states[t.state]||'Unknown';card.append(state);
   const text=document.createElement('p');text.textContent=t.detail;card.append(text);
   if(t.sourceRevision){const revision=document.createElement('small');revision.textContent='Source '+t.sourceRevision.slice(0,12);card.append(revision);}
   if(t.traffic){const numbers=document.createElement('small');numbers.textContent=t.traffic.requests.toLocaleString()+' requests · '+t.traffic.pageViews.toLocaleString()+' page views since '+(t.traffic.since||'first available record');card.append(numbers);}
   if(t.url){const url=new URL(t.url);if(url.protocol==='https:'&&['github.com','quantaphi.org'].includes(url.hostname)){const link=document.createElement('a');link.href=url.href;link.textContent='Open source';card.append(link);}}
   fragment.append(card);
  }
  el('tracks').replaceChildren(fragment);
 }catch{el('fresh').textContent='Cycle unavailable';el('fresh').className='pill stale';el('time').textContent='The latest checkpoint could not be read. No new cycle is being claimed.';}
 finally{busy=false;el('refresh').disabled=false;}
}
el('refresh').addEventListener('click',refresh);refresh();setInterval(()=>{if(!document.hidden)refresh()},60000);
`;
