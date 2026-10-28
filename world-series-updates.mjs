import {
 isNotificationWindow,fetchWorldSeries,REFRESH_MS,FOX_WATCH_URL,
 TEAMS,scoreText
} from './world-series-score.mjs?v=20261027-fox1';
/* Five-minute live score notifications. Scheduled only for Oct 27 Game 4.
 * Uses MLB scores and official linked logos; no guessed inning or points.
 * Score notification takes priority over unrelated Quick Ads.
 */
(()=>{
 if(typeof document==='undefined')return;
 const quietKey='quantaphi:worldseries-score-quiet:20261027';
 const el=(tag,klass,label)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(label!==undefined)n.textContent=label;return n};
 const toast=el('aside','fit-update-toast');toast.id='worldSeriesUpdateToast';toast.hidden=true;
 toast.setAttribute('aria-label','World Series live scoreboard update');
 document.body.append(toast);
 let timer=null,lastShown='',wasLive=false;
 const notify=visible=>window.dispatchEvent(new CustomEvent('quantaphi:world-series-toast',{detail:{visible}}));
 function close(){
  if(timer)clearTimeout(timer);timer=null;
  toast.classList.remove('fit-toast-visible');toast.hidden=true;
  notify(false);
 }
 function show(game){
  if(document.hidden||!isNotificationWindow())return;
  close();toast.replaceChildren();
  const label=el('div','fit-update-summary');
  label.append(el('small','fit-update-kicker','MLB · WORLD SERIES GAME 4 · LIVE'));
  const score=el('div','fit-update-score');
  const logo=(team)=>{
   const img=el('img','fit-update-logo');img.src=team.logo;img.alt=team.name;img.loading='eager';img.width=36;img.height=36;return img;
  };
  score.append(logo(TEAMS.away),el('strong','',scoreText(game)),logo(TEAMS.home));
  label.append(score,el('small','fit-update-details',game.inning||'Brewers at Rays · via MLB'));
  const watch=el('a','fit-update-watch','▶ Watch FOX');
  watch.href='/infinity-tv/fox.html?channel=world-series';
  watch.setAttribute('aria-label','Open Infinity TV to watch the World Series on FOX One');
  const dismiss=el('button','fit-update-dismiss','×');dismiss.type='button';
  dismiss.setAttribute('aria-label','Dismiss live score reminders for ten minutes');
  dismiss.addEventListener('click',()=>{
   try{sessionStorage.setItem(quietKey,String(Date.now()+600000))}catch{}
   close();
  });
  toast.append(label,watch,dismiss,el('small','fit-update-foot','Score updated via MLB · FOX broadcast at FOX One'));
  toast.hidden=false;requestAnimationFrame(()=>toast.classList.add('fit-toast-visible'));
  notify(true);
  lastShown=scoreText(game)+'|'+game.inning+'|'+game.status;
  timer=setTimeout(close,8000);
 }
 async function tick(){
  if(document.hidden||!isNotificationWindow()){close();return;}
  let quiet=0;try{quiet=Number(sessionStorage.getItem(quietKey))||0}catch{}
  const game=await fetchWorldSeries({force:true});
  if(!isNotificationWindow()||document.hidden)return;
  if(!game||game.stale||game.status!=='live'){
   if(wasLive&&game?.status==='final')close();
   return;
  }
  wasLive=true;
  if(Date.now()<quiet)return;
  // Notify every five minutes even when tied, but ONLY with a verified current score.
  show(game);
 }
 void tick();
 const interval=setInterval(()=>{
  if(!isNotificationWindow()&&Date.now()>Date.parse('2026-10-27T23:59:59-05:00')){
   close();clearInterval(interval);return;
  }
  void tick();
 },REFRESH_MS);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)close(); // No background pop-ups or periodic audio
  else if(isNotificationWindow())void tick();
 });
 window.addEventListener('pagehide',()=>{close();clearInterval(interval)},{once:true});
})();
