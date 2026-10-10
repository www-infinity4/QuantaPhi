/* Fred Spaces Radio: yellow electric player-style card; genuine replays open on X. Cloud wallet charges only for explicitly approved curated-next links. */
(() => {
  "use strict";
  const root = document.getElementById("fredSpacesRadio");
  if (!root) return;
  const API = "https://fred-spaces-ledger.marvaseater.workers.dev";
  const ARCHIVE = "https://www.twitterspacegpt.com/hosts/dotkrueger";
  const FIRST = "fred-0700";
  // Stable numbers: never remap an episode number after somebody shares it.
  // Metadata is verified from the public host catalog; audio is NOT licensed here.
  const episodes = [
    {id:"fred-0700",slot:700,title:"Bitcoin and Coffee",date:"Dec 29, 2025",duration:"1:09:32",tags:["bitcoin","coffee","markets"],description:"Fred Krueger's recorded Bitcoin and Coffee Space. The public listing confirms its title, date and duration; the conversation has not been independently transcribed here.",source:"https://x.com/i/spaces/1OyKAjYPeXqGb",audioUrl:null},
    {id:"fred-0147",slot:147,title:"Silver is a bubble. Bitcoin is the real deal.",date:"Dec 27, 2025",duration:"0:16:21",tags:["silver","bitcoin","metals"],description:"A brief Fred Krueger Space indexed as a comparison of silver and Bitcoin. The specific arguments have not been verified against a transcript.",source:"https://twitter.com/i/spaces/1MnGnPEEvWYxO",audioUrl:null},
    {id:"fred-0298",slot:298,title:"New Year BTC",date:"Jan 1, 2026",duration:"0:56:17",tags:["new year","bitcoin","markets"],description:"An archived New Year's Day Space titled New Year BTC. Specific predictions and discussion are not inferred without an authorized recording.",source:ARCHIVE,audioUrl:null},
    {id:"fred-0555",slot:555,title:"State of the markets. Bitcoin.",date:"Feb 9, 2026",duration:"4:20:17",tags:["markets","bitcoin","macro"],description:"An extended market-focused Fred Krueger Space, according to the public episode listing. Discussion details require the recording or transcript.",source:"https://twitter.com/i/spaces/1MYxNlwEqYyGw",audioUrl:null},
    {id:"fred-0888",slot:888,title:"Bitcoin and Trump’s “5D chess”",date:"Apr 7, 2026",duration:"3:22:21",tags:["bitcoin","politics","markets"],description:"A public Fred Krueger Space listed with a Bitcoin and Trump political title. The recording has not been independently reviewed.",source:ARCHIVE,audioUrl:null}
  ];
  let catalogLoading=true;
  const byId = new Map(episodes.map(e=>[e.id,e]));
  const seenKey="phi:fred-spaces-seen:v1";
  const starsKey="phi:fred-spaces-stars:v1";
  const currentKey="phi:fred-spaces-current:v1";
  let active=byId.get(FIRST), busy=false, paymentsReady=false, isPlatformOwner=false, unlocked=new Set(), balance=null, message="", stars=new Set(load(starsKey,[])), interestWeights=new Map(), selectedTopic="", selectedMode="search";
  function load(key,fallback){try {return JSON.parse(localStorage.getItem(key)||"null")??fallback;}catch{return fallback;}}
  function save(key,data){try{localStorage.setItem(key,JSON.stringify(data));}catch{}}
  function node(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=String(txt);return el;}
  function button(label,handle,cls=""){const b=node("button","fs-btn "+cls,label);b.type="button";b.onclick=handle;return b;}
  function note(t){message=t;render();}
  function indexedTerms(e){return [...new Set([...(e.tags||[]),...e.title.toLowerCase().match(/[a-z]{4,}/g)||[]])].slice(0,6).join(" ");}
  function terms(){const query=String(document.getElementById("q")?.value||new URL(location.href).searchParams.get("q")||"").toLowerCase();return new Set((query.match(/[a-z]{3,}/g)||[]).filter(w=>w!=="the"));}
  async function loadQuantInterests(){
    try {
      const bridge=window.QuantaCloudConnection;
      if(!bridge?.authenticatedFetch)return;
      const response=await bridge.authenticatedFetch("https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/interests",{cache:"no-store"});
      if(!response.ok)return;
      const data=await response.json();
      if(!data.ok||!Array.isArray(data.topics))return;
      const counts=new Map();
      // Count previously committed Quant searches only. Never mint from a radio card.
      for(const entry of data.topics){
        const frequency=Math.max(1,Math.min(50,Number(entry.hits)||1));
        for(const word of (String(entry.query||"").toLowerCase().match(/[a-z]{3,}/g)||[])){
          counts.set(word,(counts.get(word)||0)+frequency);
        }
      }
      interestWeights=counts;
    }catch(e){console.warn("Fred Spaces Quant preferences temporarily unavailable",e);}
  }
  function isReplayLink(episode){try{const u=new URL(episode.source);return ["x.com","twitter.com","www.x.com","www.twitter.com"].includes(u.hostname)&&/^\/i\/spaces\/[A-Za-z0-9]+\/?$/.test(u.pathname)}catch{return false}}
  function pickNext(){
    const old=new Set(load(seenKey,[]));old.add(active.id);
    const available=episodes.filter(e=>isReplayLink(e));
    let pool=available.filter(e=>!old.has(e.id));
    // Start a new round only after every indexed episode has been selected.
    if(!pool.length){pool=available.filter(e=>e.id!==active.id);}
    if(!pool.length)return null;
    const interests=terms();
    const favoriteTopics=new Set(episodes.filter(e=>stars.has(e.id)).flatMap(e=>e.tags));
    // A real 1-1000 random draw, mixed with known quant/search terms.
    const random=new Uint32Array(1);crypto.getRandomValues(random);
    const roll=1+(random[0]%1000);
    const ranked=pool.map(e=>({e,weight:1+e.tags.reduce((n,t)=>n+(interests.has(t)?6:0)+(favoriteTopics.has(t)?4:0)+Math.min(30,interestWeights.get(t)||0),0)}));
    const total=ranked.reduce((n,p)=>n+p.weight,0);
    let ticket=roll%total;
    for(const p of ranked){ticket-=p.weight;if(ticket<0)return p.e;}
    return ranked[0].e;
  }
  async function token(){return await window.QuantaCloudConnection?.resolveDeviceToken?.()||"";}
  async function ledger(path,method="GET",body){
    const url=API+path, bridge=window.StarQuestCloudLedger;
    let response;
    const opts={method,cache:"no-store",headers:{"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})};
    if(bridge?.authenticatedFetch && !url.includes("fred-spaces-ledger.marvaseater.workers.dev")){response=await bridge.authenticatedFetch(url,opts);}
    else {
      const t=await token();
      if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(t))throw new Error("Connect your existing StarCoin wallet before spending.");
      response=await fetch(url,{...opts,headers:{...opts.headers,authorization:"Bearer "+t}});
    }
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok)throw new Error(data.message||data.error||"StarQuest could not confirm the charge.");
    return data;
  }
  async function checkPaymentReadiness(){
    try {
      const response=await fetch(API+"/health",{cache:"no-store"});
      const data=await response.json();
      paymentsReady=Boolean(response.ok&&data.ok&&data.paymentsReady);
    }catch(_){paymentsReady=false;}
    if(!paymentsReady)message="Media Star purchases are paused until the owner's StarCoin payout wallet is connected. No StarCoin will be charged.";
    render();
  }
  async function sync(){try{const d=await ledger("/v1/spaces/unlocks");unlocked=new Set(d.unlocked||[]);balance=d.starCoins;isPlatformOwner=!!d.isPlatformOwner;const saved=byId.get(requested||load(currentKey,FIRST));if(saved&&(saved.id===FIRST||unlocked.has(saved.id)))active=saved;render();}catch(error){message="StarCoin wallet not connected; the first episode remains free.";render();}}
  function rememberEpisode(e){const seen=new Set(load(seenKey,[]));seen.add(active.id);active=e;seen.add(e.id);const available=episodes.filter(isReplayLink);
    if(available.length&&available.every(x=>seen.has(x.id))) {save("phi:fred-spaces-previous-round:v1",[...seen]);seen.clear();seen.add(e.id);}
    save(seenKey,[...seen]);save(currentKey,e.id);}
  async function more(){
    if(busy||catalogLoading)return;
    if(!paymentsReady){note("Media Star payments are paused until the owner payout wallet is verified. No StarCoin was charged.");return;}
    const next=pickNext();if(!next){note("No additional indexed episodes are available.");return;}
    // The fee is for curated discovery of a direct X replay link, not streaming rights.
    // The source may require X sign-in or disappear. Display this before every new debit.
    if(next.id!==FIRST&&!isPlatformOwner&&!unlocked.has(next.id)&&!window.confirm("Spend 1 full StarCoin to reveal the curated episode: "+next.title+"? The replay opens on X, not inside QuantaPhi. X may require sign-in or may not offer playback. The StarCoin pays for curation, not guaranteed audio. Continue?"))return;
    busy=true;render();
    try{
      const data=next.id===FIRST?{ok:true,charged:0,starCoins:balance}:await ledger("/v1/spaces/unlock","POST",{episodeId:next.id});
      if(!data.ok)throw new Error("Unlock was not confirmed.");
      balance=data.starCoins;unlocked.add(next.id);rememberEpisode(next);
      message=(data.ownerPreview?"Owner preview — no StarCoin deducted. ":data.charged===1?"1 StarCoin paid to the QuantaPhi Media Star platform. ":"Already unlocked; no new charge. ")+"Use the play button to open the original replay on X."
      window.dispatchEvent(new Event("focus"));
    }catch(error){message=error.message||"No StarCoin was charged. Please retry.";}
    finally{busy=false;render();}
  }
  function share(){
    const url=new URL(location.href);url.hash="fredSpacesRadio";url.searchParams.set("fredSpace",active.id);
    const data={title:active.title+" — Fred Krueger Space",text:active.title,url:url.href};
    const completed=navigator.share?navigator.share(data):navigator.clipboard?.writeText?.(url.href)||Promise.reject(new Error("No share mechanism"));
    Promise.resolve(completed).then(()=>{window.QuantaStarCredit?.("share","fred-space:"+active.id+":"+Date.now());note("Shared +0.1 StarCoin.");}).catch(()=>note("Share canceled; no StarCoin awarded."));
  }
  function collect(){
    try{window.QuantaStarCredit?.("collect","fred-space:"+active.id,{key:"fred-space|"+active.id,type:"fred-space",title:active.title,story:active.description,media:"",sourceUrl:active.source});note("Collected to Phi. Collect rewards follow the existing StarCoin rules.");}
    catch{note("Collect is temporarily unavailable.");}
  }
  function favorite(){stars.has(active.id)?stars.delete(active.id):stars.add(active.id);save(starsKey,[...stars]);note(stars.has(active.id)?"Starred for future matching.":"Removed from favorites.");}
  function build(tool){
    const paths={InfinityPhi:"/InfinityPhi/",OmniPhi:"/OmniPhi/overview/",QuantaPhi:"/"};
    const u=new URL(paths[tool],location.origin);
    u.searchParams.set("q",tool==="InfinityPhi"?active.title:indexedTerms(active));
    if(tool==="InfinityPhi"){
      u.searchParams.set("cardTitle",active.title);
      u.searchParams.set("sourceQuery",indexedTerms(active));
      u.searchParams.set("run","1");
    }
    u.searchParams.set("from","fred-spaces");
    u.searchParams.set("episode",active.id);
    // Builders receive searchable topic context, not Fred audio/media packaged into an embed.
    if(tool!=="QuantaPhi")u.searchParams.set("buildPrompt","Research the topic of this recorded Space and build an original page with citations. Do not repackage Fred\'s replay as an embeddable Media Star. The Media Star embed is a separate, blank creator-owned media template.");
    location.href=u.href;
  }
  function chooseTopic(tag){selectedTopic=selectedTopic===tag?"":tag;selectedMode="search";render();}
  function routeTopic(tool){
    const topic=selectedTopic.trim();
    const paths={InfinityPhi:"/InfinityPhi/",OmniPhi:"/OmniPhi/overview/",QuantaPhi:"/"};
    if(!topic||!paths[tool])return;
    const q=selectedMode==="learn"?"Learn about "+topic:topic;
    if(tool==="QuantaPhi"&&selectedMode==="search"){
      const input=document.getElementById("q"),go=document.getElementById("go");
      if(input&&go){input.value=q;selectedTopic="";go.click();input.scrollIntoView({behavior:"smooth",block:"start"});render();return;}
    }
    const u=new URL(paths[tool],location.origin);
    u.searchParams.set("q",q);u.searchParams.set("intent",selectedMode);
    u.searchParams.set("topic",topic);u.searchParams.set("from","fred-spaces");
    // Topic actions initiate searches/learning; do not export source replay or wallet configuration.
    if(selectedMode==="build")u.searchParams.set("buildPrompt","Create an original website about "+topic+". Any Media Star card must start blank and contain only content provided by the creator; verify other factual claims.");
    location.assign(u.href);
  }
  const escapeMarkup=x=>String(x||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  // Export ONLY the blank Media Star asset; Fred's curated content remains on QuantaPhi.
  function mediaStarEmbed(){return "<!-- Media Star: blank, creator-editable card template by QuantaPhi. -->\n<!-- Your AI website builder replaces the sample title, description and source with YOUR content. -->\n<!-- This template carries no show recordings, unlock tokens, platform-wallet credentials or payout endpoints. -->\n<article data-media-star=\"creator-template-v2\" data-payment-mode=\"off\" aria-label=\"Media Star creator card\" style=\"position:relative;isolation:isolate;overflow:hidden;max-width:720px;padding:24px;border:2px solid #f2c44f;border-radius:24px;background:linear-gradient(135deg,#fff9d0,#e8b537);color:#33200a;font:16px/1.5 system-ui,sans-serif;box-shadow:0 9px 28px #8d5d2666\">\n  <span aria-hidden=\"true\" style=\"position:absolute;right:-55px;top:-75px;width:300px;height:300px;clip-path:polygon(50% 0%,62% 34%,98% 35%,69% 57%,80% 91%,50% 72%,20% 91%,31% 57%,2% 35%,38% 34%);background:linear-gradient(135deg,#fff0ad,#f6b81e);opacity:.48;z-index:-1\"></span>\n  <div style=\"position:relative\"><strong style=\"font-size:21px;letter-spacing:.06em\">⭐ MEDIA STAR</strong><p style=\"font-size:12px;font-weight:700;letter-spacing:.08em;margin:6px 0\">YOUR ORIGINAL MEDIA</p>\n  <h2 data-creator-field=\"title\" style=\"font-size:25px;margin:8px 0\">Add your title with your AI builder</h2>\n  <p data-creator-field=\"description\">Add your own original episode, podcast, music, video or media description here.</p>\n  <div data-creator-field=\"player\" role=\"note\" style=\"padding:14px;border-radius:14px;background:#fff4c9;border:1px dashed #926820\">Your AI builder adds your own authorized media player or original source link here.</div>\n  <p style=\"font-size:12px\">Optional paid access: configure your own creator payment provider and verified recipient on your own server. Default: free; no payment is connected.</p></div>\n</article>";}
  async function copyMediaStarEmbed(){
    const snippet=mediaStarEmbed();
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(snippet);
      note('Blank Media Star template copied. Add your own media and optional payment setup in your AI website builder. Fred episodes and Phi wallet connections are not included.');
    }catch(error){
      if(typeof window.prompt==='function')window.prompt('Copy this Media Star HTML into your website builder:',snippet);
      note('Blank Media Star template ready to copy. Add your own authorized content and separate optional creator payments.');
    }
  }
  window.PhiMediaStarAsset={html:mediaStarEmbed};
  function render(){
    root.replaceChildren();
    const card=node("article","fs-card fs-media-star"),top=node("div","fs-header"),ident=node("div","fs-heading");
    card.setAttribute("data-media-asset","media-star-v1");
    const backdrop=node("div","fs-star-backdrop");
    backdrop.setAttribute("aria-hidden","true");
    const avatar=node("img","fs-star-avatar");avatar.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\"><defs><radialGradient id=\"bg\" cx=\"32%\" cy=\"25%\" r=\"90%\"><stop stop-color=\"#8158ae\"/><stop offset=\"1\" stop-color=\"#2b1b4e\"/></radialGradient><linearGradient id=\"gold\"><stop stop-color=\"#ffe69f\"/><stop offset=\"1\" stop-color=\"#b97a24\"/></linearGradient></defs><rect width=\"128\" height=\"128\" rx=\"64\" fill=\"url(#bg)\"/><circle cx=\"64\" cy=\"56\" r=\"23\" fill=\"#f0bb88\"/><path d=\"M27 118c2-27 17-41 37-41s35 14 37 41\" fill=\"#edd2b8\"/><path d=\"M42 57c-8-20 4-37 21-37 14 0 29 10 25 36-3-11-10-15-17-16-9 12-18 16-29 17\" fill=\"#37243a\"/><path d=\"M34 57c-2-21 12-38 30-38s32 17 30 38\" fill=\"none\" stroke=\"url(#gold)\" stroke-width=\"7\" stroke-linecap=\"round\"/><rect x=\"28\" y=\"49\" width=\"13\" height=\"25\" rx=\"6\" fill=\"#fbd979\"/><rect x=\"87\" y=\"49\" width=\"13\" height=\"25\" rx=\"6\" fill=\"#fbd979\"/><path d=\"M93 71c0 19-9 25-23 25\" fill=\"none\" stroke=\"#e5b95f\" stroke-width=\"5\" stroke-linecap=\"round\"/><circle cx=\"69\" cy=\"96\" r=\"5\" fill=\"#fff3bd\"/></svg>");avatar.alt="";avatar.decoding="async";
    backdrop.append(node("span","fs-star-rays"),node("span","fs-big-star"),avatar);
    card.append(backdrop);
    ident.append(node("strong","fs-brand","⭐ Media Star"),node("small","fs-eyebrow","CURIO SPACE SPOTLIGHT"),node("h2","",active.title),node("p","fs-host","Fred Krueger · @dotkrueger · X Spaces"));
    top.append(ident);card.append(top);
    if(active.id===FIRST)card.append(node("p","fs-free","FEATURED EPISODE · FREE"));
    card.append(node("p","fs-meta",active.date+" · "+active.duration),node("p","fs-summary",active.description));
    const stream=node("section","fs-stream");
    stream.setAttribute("aria-label","X Spaces replay player-style link");
    const player=node("div","fs-player"),play=node("a","fs-play","▶");
    play.href=active.source;play.target="_blank";play.rel="noopener noreferrer";
    play.setAttribute("aria-label","Open "+active.title+" on X to play the replay");
    player.append(play);
    const deck=node("div","fs-player-deck");
    deck.append(node("strong","fs-player-name","X Spaces replay"),node("span","fs-player-sub","Open on X to listen · Not hosted by Phi"));
    const track=node("div","fs-player-track");track.setAttribute("aria-hidden","true");
    for(let i=0;i<13;i++)track.append(node("i",""));deck.append(track);
    const timing=node("div","fs-player-timing");
    timing.append(node("span","","Replay on X"),node("span","",active.duration));deck.append(timing);
    player.append(deck);stream.append(player);
    const replay=node("a","fs-source","Open original on X ↗");
    replay.href=active.source;replay.target="_blank";replay.rel="noopener noreferrer";
    stream.append(replay,node("small","fs-play-disclaimer","X sign-in or replay availability may vary. No simulated audio."));
    card.append(stream);
    const tags=node("div","fs-tags");tags.setAttribute("aria-label","Explore episode topics");
    for(const tag of active.tags){
      const b=button(tag,()=>chooseTopic(tag),"fs-topic");
      b.setAttribute("aria-expanded",String(selectedTopic===tag));tags.append(b);
    }
    card.insertBefore(tags,stream);
    if(selectedTopic){
      const chooser=node("section","fs-topic-panel");
      chooser.setAttribute("aria-label","Explore "+selectedTopic+" with Phi");
      const header=node("div","fs-topic-header");
      header.append(node("strong","","Explore "+selectedTopic));
      header.append(button("Close",()=>{selectedTopic="";render()},"fs-topic-close"));
      chooser.append(header,node("p","","Choose Search, Build or Learn, then select a Phi."));
      const modes=node("div","fs-mode-row");
      for(const mode of ["search","build","learn"]){
        const b=button(mode[0].toUpperCase()+mode.slice(1),()=>{selectedMode=mode;render()},"fs-mode");
        b.setAttribute("aria-pressed",String(selectedMode===mode));modes.append(b);
      }
      chooser.append(modes);
      const tools=node("div","fs-tool-row");
      for(const phi of ["QuantaPhi","InfinityPhi","OmniPhi"]){
        const b=button(phi,()=>routeTopic(phi),"fs-tool");
        b.setAttribute("aria-label",selectedMode+" "+selectedTopic+" with "+phi);tools.append(b);
      }
      chooser.append(tools);card.insertBefore(chooser,stream);
    }
    card.append(node("h3","fs-control-label","Save & share"));
    const actions=node("div","fs-actions");
    actions.append(button(stars.has(active.id)?"★ Starred":"☆ Star",favorite),button("Share +0.1 ★",share),button("Collect +0.1 ★",collect));card.append(actions);
    card.append(node("h3","fs-control-label","Build this episode with"));
    const builds=node("div","fs-builds");
    ["InfinityPhi","OmniPhi","QuantaPhi"].forEach(t=>builds.append(button(t,()=>build(t),"fs-phi")));
    card.append(builds);
    const embedRow=node("div","fs-embed-row");
    embedRow.append(button("Copy blank Media Star template",()=>{void copyMediaStarEmbed()},"fs-phi fs-embed"));card.append(embedRow);
    const nextRow=node("div","fs-bottom");
    const hasCurated=episodes.some(e=>e.id!==FIRST&&isReplayLink(e));
    const unlock=button(busy?"Loading next episode…":!paymentsReady?"Episode unlocks paused — wallet routing":isPlatformOwner?"Next curated episode · owner preview (free)":"Unlock next curated episode · 1 ★",more,"fs-next");
    unlock.disabled=busy||catalogLoading||!hasCurated||!paymentsReady;
    nextRow.append(node("span","fs-index-count",catalogLoading?"Loading episode index…":episodes.filter(isReplayLink).length+" indexed Fred Spaces · no repeats until the round is complete"),unlock,node("span","fs-balance",balance==null?"Wallet balance unavailable":"StarCoins: "+balance));card.append(nextRow);
    const status=node("p","fs-status",message||"Featured replay is free. One new curated X episode link costs 1 full StarCoin after confirmation. Listening happens on X.");
    status.setAttribute("role","status");status.setAttribute("aria-live","polite");card.append(status);
    root.append(card);
  }
  const requested=new URL(location.href).searchParams.get("fredSpace");
  if(requested===FIRST)active=byId.get(FIRST);
  async function loadCatalog(){
    try{
      const response=await fetch(new URL("media-star-index.json?v=20261009-full-fred1",document.currentScript?.src||location.href),{cache:"no-cache"});
      if(!response.ok)throw Error("Episode index unavailable");
      const catalog=await response.json();
      if(catalog.schemaVersion!==1||!Array.isArray(catalog.episodes))throw Error("Invalid episode index");
      const valid=catalog.episodes.filter(e=>e.hostId==="dotkrueger"&&e.id&&e.title&&Array.isArray(e.tags)&&isReplayLink(e));
      if(!valid.some(e=>e.id===FIRST))throw Error("Featured episode missing");
      episodes.splice(0,episodes.length,...valid);byId.clear();episodes.forEach(e=>byId.set(e.id,e));
      active=byId.get(FIRST);
      window.PhiMediaStarAsset.catalog=catalog;
    }catch(error){message="Full episode index could not load. Next episode is paused; retry by reloading.";render();return;}
    catalogLoading=false;render();await sync();await checkPaymentReadiness();
  }
  render();void loadCatalog();void loadQuantInterests();
})();
