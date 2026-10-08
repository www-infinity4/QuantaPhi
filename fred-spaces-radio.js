/* Fred Spaces Radio v1. One yellow card, no pretend audio or browser-side wallet debits. */
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
    {id:"fred-0700",slot:700,title:"Bitcoin and Coffee",date:"Dec 29, 2025",duration:"1:09:32",tags:["bitcoin","coffee","markets"],description:"Fred Krueger's archived Bitcoin and Coffee Space. The listing confirms its title, date and duration; a recording transcript has not been verified.",source:ARCHIVE,audioUrl:null},
    {id:"fred-0147",slot:147,title:"Silver is a bubble. The revolution will not be televised.",date:"May 26, 2025",duration:"0:16:21",tags:["silver","bitcoin","metals"],description:"A Fred Krueger recording listed under a title questioning silver. Its arguments are not independently verified without an authorized transcript.",source:ARCHIVE,audioUrl:null},
    {id:"fred-0298",slot:298,title:"New Year BTC",date:"Jan 1, 2026",duration:"0:56:17",tags:["new year","bitcoin","markets"],description:"An archived New Year's Day Space titled New Year BTC. Specific predictions and discussion are not inferred without an authorized recording.",source:ARCHIVE,audioUrl:null},
    {id:"fred-0555",slot:555,title:"State of the markets. Bitcoin.",date:"Feb 9, 2026",duration:"4:20:17",tags:["markets","bitcoin","macro"],description:"An extended market-focused Fred Krueger Space, according to the public episode listing. Discussion details require the recording or transcript.",source:ARCHIVE,audioUrl:null},
    {id:"fred-0888",slot:888,title:"Bitcoin and Trump’s “5D chess”",date:"Apr 7, 2026",duration:"3:22:21",tags:["bitcoin","politics","markets"],description:"A public Fred Krueger Space listed with a Bitcoin and Trump political title. The recording has not been independently reviewed.",source:ARCHIVE,audioUrl:null}
  ];
  const byId = new Map(episodes.map(e=>[e.id,e]));
  const seenKey="phi:fred-spaces-seen:v1";
  const starsKey="phi:fred-spaces-stars:v1";
  const currentKey="phi:fred-spaces-current:v1";
  let active=byId.get(FIRST), busy=false, unlocked=new Set(), balance=null, message="", stars=new Set(load(starsKey,[]));
  function load(key,fallback){try {return JSON.parse(localStorage.getItem(key)||"null")??fallback;}catch{return fallback;}}
  function save(key,data){try{localStorage.setItem(key,JSON.stringify(data));}catch{}}
  function node(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=String(txt);return el;}
  function button(label,handle,cls=""){const b=node("button","fs-btn "+cls,label);b.type="button";b.onclick=handle;return b;}
  function note(t){message=t;render();}
  function indexedTerms(e){return [...new Set([...(e.tags||[]),...e.title.toLowerCase().match(/[a-z]{4,}/g)||[]])].slice(0,6).join(" ");}
  function terms(){const query=String(document.getElementById("q")?.value||new URL(location.href).searchParams.get("q")||"").toLowerCase();return new Set((query.match(/[a-z]{3,}/g)||[]).filter(w=>w!=="the"));}
  function pickNext(){
    const old=new Set(load(seenKey,[]));old.add(active.id);
    const candidates=episodes.filter(e=>e.id!==FIRST&&!old.has(e.id));
    const pool=candidates.length?candidates:episodes.filter(e=>e.id!==FIRST&&e.id!==active.id);
    if(!pool.length)return null;
    const interests=terms();
    // A real 1-1000 random draw, mixed with known quant/search terms.
    const random=new Uint32Array(1);crypto.getRandomValues(random);
    const roll=1+(random[0]%1000);
    const ranked=pool.map(e=>({e,weight:1+e.tags.reduce((n,t)=>n+(interests.has(t)?6:0),0)}));
    const total=ranked.reduce((n,p)=>n+p.weight,0);
    let ticket=roll%total;
    for(const p of ranked){ticket-=p.weight;if(ticket<0)return p.e;}
    return ranked[0].e;
  }
  function token(){return window.QuantaCloudConnection?.resolveDeviceToken?.()||"";}
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
  async function sync(){try{const d=await ledger("/v1/spaces/unlocks");unlocked=new Set(d.unlocked||[]);balance=d.starCoins;const saved=byId.get(load(currentKey,FIRST));if(saved&&(saved.id===FIRST||unlocked.has(saved.id)))active=saved;render();}catch(error){message="StarCoin wallet not connected; the first episode remains free.";render();}}
  function rememberEpisode(e){active=e;const seen=new Set(load(seenKey,[]));seen.add(e.id);save(seenKey,[...seen].slice(-1000));save(currentKey,e.id);}
  async function more(){
    if(busy)return;
    const next=pickNext();if(!next){note("No additional indexed episodes are available.");return;}
    // This is an explicit charge for another curated discovery, not resale of X audio.
    if(!window.confirm("Spend 1 full StarCoin to reveal another matched Fred Krueger Space? Audio may require listening on X."))return;
    busy=true;render();
    try{
      const data=await ledger("/v1/spaces/unlock","POST",{episodeId:next.id});
      if(!data.ok)throw new Error("Unlock was not confirmed.");
      balance=data.starCoins;unlocked.add(next.id);rememberEpisode(next);
      message=(data.charged===1?"1 StarCoin spent. ":"Already unlocked; no new charge. ")+(next.audioUrl?"Ready to play.":"Recording source is linked; native audio is not yet available.");
      window.dispatchEvent(new Event("focus"));
    }catch(error){message=error.message||"No StarCoin was charged. Please retry.";}
    finally{busy=false;render();}
  }
  function share(){
    const url=new URL(location.href);url.hash="fredSpacesRadio";url.searchParams.set("fredSpace",active.id);
    const data={title:active.title+" — Fred Krueger Space",text:active.title,url:url.href};
    const completed=navigator.share?navigator.share(data):navigator.clipboard.writeText(url.href);
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
    u.searchParams.set("q",indexedTerms(active));
    u.searchParams.set("from","fred-spaces");
    u.searchParams.set("episode",active.id);
    u.searchParams.set("episodeSource",active.source);
    location.href=u.href;
  }
  function render(){
    root.replaceChildren();
    const card=node("article","fs-card"); const top=node("div","fs-header");
    const ident=node("div","fs-heading");ident.append(node("small","fs-eyebrow","YELLOW CARD · INFINITY SPACES RADIO"),node("h2","",active.title),node("p","fs-host","Fred Krueger · @dotkrueger · X Spaces"));
    top.append(ident,node("strong","fs-number","#"+active.slot));
    card.append(top,node("p","fs-meta",active.date+" · "+active.duration+" · Publicly indexed episode"),node("p","fs-summary",active.description));
    const tags=node("div","fs-tags");active.tags.forEach(t=>tags.append(node("span","",t)));card.append(tags);
    const stream=node("div","fs-stream");
    if(active.audioUrl){
      const audio=node("audio","fs-audio");audio.controls=true;audio.preload="none";audio.src=active.audioUrl;stream.append(audio);
    }else{
      stream.append(node("div","fs-play-symbol","◉"),node("p","fs-stream-note","Original recording audio is not available in the Phi player yet. No audio is copied or hidden from X."));
    }
    const link=node("a","fs-source","Find this Space in Fred's archive ↗");link.href=active.source;link.target="_blank";link.rel="noopener noreferrer";stream.append(link);card.append(stream);
    const actions=node("div","fs-actions");
    actions.append(button(stars.has(active.id)?"★ Starred":"☆ Star",favorite),button("Share +0.1 ★",share),button("Collect +0.1 ★",collect));
    card.append(actions);
    const builds=node("div","fs-builds");["InfinityPhi","OmniPhi","QuantaPhi"].forEach(t=>builds.append(button("Build with "+t,()=>build(t),"fs-phi")));card.append(builds);
    const nextRow=node("div","fs-bottom");
    const unlock=button(busy?"Checking StarQuest…":"Next matched Space · 1 ★",more,"fs-next");unlock.disabled=busy;
    nextRow.append(unlock,node("span","fs-balance",balance==null?"StarQuest balance pending":"StarCoins: "+balance+" · First card free"));
    card.append(nextRow);
    const status=node("p","fs-status",message||"A StarCoin buys the next curated episode selection. Audio rights are separate; X may be needed to listen.");
    status.setAttribute("role","status");card.append(status);
    root.append(card);
  }
  const requested=new URL(location.href).searchParams.get("fredSpace");
  if(requested===FIRST)active=byId.get(FIRST);
  render();void sync();
})();
