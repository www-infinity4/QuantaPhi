/* Page-local Oracle controls: a new search never mints, clears wallets or reloads the card engines. */
(function(){
 'use strict';
 const search=document.getElementById('q'),go=document.getElementById('go'),button=document.getElementById('qNewSearch');
 if(!search||!go||!button)return;
 button.addEventListener('click',()=>{
  search.value='';
  const refine=document.getElementById('qrefine');if(refine)refine.value='';
  const refWrap=document.getElementById('qrefineWrap');if(refWrap)refWrap.hidden=true;
  const result=document.getElementById('result');if(result)result.hidden=true;
  const status=document.getElementById('status');if(status)status.textContent='';
  const media=document.getElementById('media');if(media)media.hidden=true;
  const grid=document.getElementById('mediaGrid');if(grid)grid.replaceChildren();
  const menu=document.getElementById('qmenu');if(menu)menu.hidden=true;
  try{
   const u=new URL(location.href);
   for(const key of ['q','from','story','storyTitle','storySummary','storyDetail','storySector','storySource','fredSpace','refine'])u.searchParams.delete(key);
   u.hash='';history.replaceState(history.state,'',u.href);
  }catch(_){}
  window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  search.focus({preventScroll:true});
 });
})();
