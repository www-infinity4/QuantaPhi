(function(){
  'use strict';
  if(window.__quantaMediaRepairV1)return;
  window.__quantaMediaRepairV1=true;

  const IA='https://archive.org/advancedsearch.php';
  const COMMONS='https://commons.wikimedia.org/w/api.php';
  const SEARCH='https://orange-brook-a2ac.marvaseater.workers.dev/search';

  const q=()=>String(document.getElementById('q')?.value||'').trim();
  const media=()=>document.getElementById('media');
  const grid=()=>document.getElementById('mediaGrid');
  const menu=()=>document.getElementById('qmenu');
  const clean=(v,max=1200)=>String(v||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
  const esc=v=>clean(v,4000).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const show=(message,scroll=true)=>{const m=media(),g=grid();if(m)m.hidden=false;if(menu())menu().hidden=true;if(g)g.innerHTML=message||'';if(scroll)m?.scrollIntoView({behavior:'smooth',block:'start'})};
  const json=async(url,timeout=9000)=>{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
    try{const r=await fetch(url,{cache:'no-store',signal:ctl.signal});if(!r.ok)throw new Error('http '+r.status);return await r.json()}finally{clearTimeout(timer)}
  };
  const sourceUrl=id=>'https://archive.org/details/'+encodeURIComponent(id);
  const embedUrl=id=>'https://archive.org/embed/'+encodeURIComponent(id);

  function imageCard(x){
    const title=clean(x.title||'Image result',260),img=String(x.image||x.thumbnail||x.img_src||''),url=String(x.url||'');
    return '<article class="mcard imageCard" data-source-title="'+esc(title)+'" data-source-url="'+esc(url)+'" data-media-src="'+esc(img)+'" data-source-snippet="'+esc(x.description||'')+'">'+
      '<div class="imageVisual">'+(img?'<img loading="lazy" referrerpolicy="no-referrer" src="'+esc(img)+'" alt="'+esc(title)+'" onerror="this.style.display=\'none\';this.closest(\'.imageCard\')?.classList.add(\'image-load-error\')">':'')+'<span class="imageBadge">IMAGE</span></div>'+
      '<div class="imageBody"><h3 class="imageStoryTitle">'+esc(title)+'</h3><p>'+esc(x.description||'Image result for this search.')+'</p><div class="imageActions">'+
      (url?'<a target="_blank" rel="noopener" href="'+esc(url)+'">View source</a>':'')+
      '<button class="cardCollect" type="button">Collect +0.1 ★</button><button class="cardUncollect" type="button" hidden>Uncollect</button>'+
      '<button class="cardShare" type="button" data-title="'+esc(title)+'" data-url="'+esc(url)+'" data-image="'+esc(img)+'">Share image +0.1 ★</button></div></div></article>';
  }

  function videoCard(x){
    const id=String(x.identifier||x.archive_id||''),title=clean(x.title||id||'Internet Archive video',260),url=sourceUrl(id),embed=embedUrl(id),
      description=clean(Array.isArray(x.description)?x.description[0]:x.description||'',1000),
      meta=['Internet Archive identifier: '+id,x.creator&&('Creator: '+clean(Array.isArray(x.creator)?x.creator.join('; '):x.creator,300)),x.date&&('Date: '+clean(x.date,120)),description&&('Description: '+description)].filter(Boolean).join(' | ');
    return '<article class="mcard videoCard" data-source-title="'+esc(title)+'" data-source-url="'+esc(url)+'" data-media-src="'+esc(embed)+'" data-archive-id="'+esc(id)+'" data-archive-metadata="'+esc(meta)+'">'+
      '<div class="videoVisual"><iframe title="'+esc(title)+'" loading="lazy" src="'+esc(embed)+'" style="display:block;width:100%;height:100%;border:0;background:#000" allowfullscreen></iframe></div>'+
      '<div class="videoBody"><small>VIDEO</small><h3>'+esc(title)+'</h3><p>'+esc(description||'Internet Archive playable video.')+'</p><div class="videoActions">'+
      '<button class="cardCollect" type="button">Collect +0.1 ★</button><button class="cardUncollect" type="button" hidden>Uncollect</button>'+
      '<button class="cardShare" type="button" data-title="'+esc(title)+'" data-url="'+esc(url)+'">Share +0.1 ★</button></div></div></article>';
  }

  function soundCard(x){
    const id=String(x.identifier||x.archive_id||''),title=clean(x.title||id||'Internet Archive audio',260),url=sourceUrl(id),embed=embedUrl(id),
      description=clean(Array.isArray(x.description)?x.description[0]:x.description||'',1000),
      meta=['Internet Archive identifier: '+id,x.creator&&('Creator/performer: '+clean(Array.isArray(x.creator)?x.creator.join('; '):x.creator,300)),x.date&&('Date: '+clean(x.date,120)),description&&('Description: '+description)].filter(Boolean).join(' | ');
    return '<article class="mcard soundCard" data-source-title="'+esc(title)+'" data-source-url="'+esc(url)+'" data-media-src="'+esc(embed)+'" data-archive-id="'+esc(id)+'" data-archive-metadata="'+esc(meta)+'">'+
      '<div class="soundVisual">♫</div><div class="soundBody"><small>SOUND</small><h3>'+esc(title)+'</h3><p>'+esc(description||'Internet Archive playable audio.')+'</p>'+
      '<iframe title="'+esc(title)+'" loading="lazy" src="'+esc(embed)+'" style="width:100%;min-height:190px;border:0;border-radius:12px;background:#111"></iframe>'+
      '<div class="soundActions"><button class="cardCollect" type="button">Collect +0.1 ★</button><button class="cardUncollect" type="button" hidden>Uncollect</button>'+
      '<button class="cardShare" type="button" data-title="'+esc(title)+'" data-url="'+esc(url)+'">Share +0.1 ★</button></div></div></article>';
  }

  async function commonsImages(query){
    const u=new URL(COMMONS);
    u.search=new URLSearchParams({
      action:'query',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'24',
      prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'900',format:'json',origin:'*'
    });
    const j=await json(u,9000),pages=Object.values(j?.query?.pages||{});
    return pages.map(page=>{
      const info=page.imageinfo?.[0]||{},meta=info.extmetadata||{},mime=String(info.mime||'');
      if(mime&&!mime.startsWith('image/'))return null;
      return {
        title:String(page.title||'').replace(/^File:/,''),
        image:info.thumburl||info.url||'',
        url:info.descriptionurl||('https://commons.wikimedia.org/wiki/'+encodeURIComponent(String(page.title||'').replace(/ /g,'_'))),
        description:clean(meta.ImageDescription?.value||meta.ObjectName?.value||meta.Credit?.value||'',700)
      };
    }).filter(x=>x&&x.image);
  }

  async function searchImages(query){
    try{
      const rows=await commonsImages(query);
      if(rows.length)return rows;
    }catch(_){}
    try{
      const u=new URL(SEARCH);u.search=new URLSearchParams({q:query,format:'json',categories:'images',safesearch:'1'});
      const j=await json(u,7000);
      return (j.results||[]).map(x=>({title:x.title,image:x.img_src||x.thumbnail_src||x.thumbnail,url:x.url,description:x.content||x.description||''})).filter(x=>x.image).slice(0,24);
    }catch(_){return[]}
  }

  async function iaRows(query,kind){
    const exact=clean(query,240).replace(/[()"\\]/g,' ');
    const u=new URL(IA);
    const mediatype=kind==='video'?'movies':'audio';
    const queryText='mediatype:'+mediatype+' AND (title:("'+exact+'") OR creator:("'+exact+'") OR description:("'+exact+'") OR subject:("'+exact+'"))';
    u.search=new URLSearchParams({q:queryText,fl:'identifier,title,description,creator,date',rows:'16',page:'1',output:'json',sort:'downloads desc'});
    const j=await json(u,10000);
    return (j?.response?.docs||[]).filter(x=>x.identifier).slice(0,16);
  }

  let mediaRun=0;
  async function images(options={}){
    const ticket=++mediaRun;
    const query=q();if(!query)return;
    show('<small>Loading resilient image feed…</small>',options.scroll!==false);
    const rows=await searchImages(query);
    if(ticket!==mediaRun||q()!==query)return;
    const g=grid();if(g)g.innerHTML=rows.length?rows.map(imageCard).join(''):'<p class="err">No image results were returned. Try a more specific search.</p>';
  }
  async function videos(){
    const query=q();if(!query)return;
    show('<small>Loading Internet Archive video players…</small>');
    try{const rows=await iaRows(query,'video'),g=grid();if(g)g.innerHTML=rows.length?rows.map(videoCard).join(''):'<p class="err">No Internet Archive video items found for this search.</p>'}
    catch(_){const g=grid();if(g)g.innerHTML='<p class="err">Video feed could not load. Internet Archive may be temporarily unavailable.</p>'}
  }
  async function sounds(){
    const query=q();if(!query)return;
    show('<small>Loading Internet Archive audio players…</small>');
    try{const rows=await iaRows(query,'audio'),g=grid();if(g)g.innerHTML=rows.length?rows.map(soundCard).join(''):'<p class="err">No Internet Archive audio items found for this search.</p>'}
    catch(_){const g=grid();if(g)g.innerHTML='<p class="err">Audio feed could not load. Internet Archive may be temporarily unavailable.</p>'}
  }

  function replaceButton(id,handler){
    const old=document.getElementById(id);if(!old)return;
    const fresh=old.cloneNode(true);old.replaceWith(fresh);
    fresh.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handler()});
  }
  replaceButton('qImagesBtn',images);
  replaceButton('qVideoBtn',videos);
  replaceButton('qSoundBtn',sounds);

  // The original page's automatic media loader depended on one search backend.
  // Keep initial search media useful even when that backend is unavailable.
  window.loadMedia = async function(query) {
    return images({scroll:false,automatic:true});
  };
  const originalElementIdentity=window.elementIdentity;
  if(typeof originalElementIdentity==='function'){
    window.elementIdentity=function(query){
      const raw=String(query||'').trim(),normalized=raw.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),parts=normalized.split(/\s+/).filter(Boolean);
      const explicit=/\belement\s*(?:#|number|no\.?\s*)?\d{1,3}\b/i.test(raw)||/\batomic\s+number\s*\d{1,3}\b/i.test(raw)||parts.length===1||(parts.length===2&&(/^\d{1,3}$/.test(parts[1])||parts[1]==='element'));
      return explicit?originalElementIdentity(query):null;
    };
  }

  let overviewWatchRun=0;
  function scheduleOverviewWatchdog(){
    const ticket=++overviewWatchRun;
    const query=q();if(!query)return;
    setTimeout(async()=>{
      if(ticket!==overviewWatchRun||q()!==query)return;
      const overview=document.getElementById('overview');
      if(!overview)return;
      const text=String(overview.textContent||'').trim();
      if(text&&!/Building|AI Overview\s*$/i.test(text))return;
      try{
        const result=await window.fallbackResearch?.(query);
        const rows=(result?.results||[]).slice(0,10).map((x,i)=>({index:i,title:x.title||'',url:x.url||'',evidence:String(x.content||x.description||x.extract||'').trim()}));
        if(!rows.length||ticket!==overviewWatchRun||q()!==query)return;
        if(!/Building|AI Overview\s*$/i.test(String(overview.textContent||'')))return;
        const structured=window.buildStructuredEvidenceFallback?.(query,rows);
        const html=structured&&window.renderFivePartOverview?.(structured,query,rows);
        if(html){
          overview.innerHTML=html;
          window.activateFivePartOverview?.();
          const status=document.getElementById('status');
          if(status)status.innerHTML='<small>Source-backed overview ready · AI synthesis still refining…</small>';
        }
      }catch(_){}
    },2500);
  }
  window.addEventListener('quantaphi:search-start',scheduleOverviewWatchdog);

  window.QuantaMediaRepair={images,videos,sounds,commonsImages,iaRows,contract:'quanta-overview-first-v2'};
})();