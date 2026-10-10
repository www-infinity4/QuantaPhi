/* Magoo PhD guest recordings and X Spaces catalog; separate host and D1 index from Fred.
 * Shuffle is free, device-local, and never reveals Fred's curated paid links.
 */
(() => {
  "use strict";
  const root=document.getElementById("magooSpacesRadio");
  if(!root)return;
  const API="https://magoo-phd-spaces.marvaseater.workers.dev/v1/episodes";
  const FALLBACK="/magoo-spaces-index.json";
  const SEEN="phi:magoo-spaces-seen:v1", CURRENT="phi:magoo-spaces-current:v1";
  const state={episodes:[],current:null,loading:true,error:""};
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback;}catch{return fallback;}}
  function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
  function elem(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function btn(label,callback){const b=elem("button","mp-btn",label);b.type="button";b.addEventListener("click",callback);return b;}
  function normalize(raw){
    if(!raw||!raw.source)return null;
    let u;try{u=new URL(raw.source)}catch{return null}
    if(u.protocol!=="https:")return null;
    const host=u.hostname.toLowerCase(),kind=String(raw.kind||"space"),platform=String(raw.platform||"X");
    const space=["x.com","twitter.com","www.x.com","www.twitter.com"].includes(host)&&/^\/i\/spaces\/[A-Za-z0-9]+\/?$/.test(u.pathname);
    const podcast=host==="podcasts.apple.com"&&/^\/us\/podcast\//.test(u.pathname)&&/^\d+$/.test(u.searchParams.get("i")||"");
    const youtube=["www.youtube.com","youtube.com"].includes(host)&&u.pathname==="/watch"&&/^[a-zA-Z0-9_-]{11}$/.test(u.searchParams.get("v")||"");
    if(!(space||podcast||youtube))return null;
    if((space&&kind!=="space")||(podcast&&(platform!=="Apple Podcasts"||kind==="space"))||(youtube&&(platform!=="YouTube"||kind==="space")))return null;
    const id=String(raw.id||(space?"magoo-"+(raw.spaceId||u.pathname.split("/").pop()):""));
    if(!/^[a-zA-Z0-9_-]{5,100}$/.test(id))return null;
    const source=space?u.origin+u.pathname:u.href;
    return {id,title:String(raw.title||(space?"Magoo PhD Space":"Magoo PhD appearance")),date:String(raw.date||""),duration:String(raw.duration||""),source,tags:Array.isArray(raw.tags)?raw.tags.slice(0,10).map(String):[],kind,platform};
  }
  function pick(){
    const seen=new Set(read(SEEN,[]));if(state.current)seen.add(state.current.id);
    let pool=state.episodes.filter(e=>!seen.has(e.id));
    if(!pool.length){seen.clear();pool=state.episodes.filter(e=>e.id!==state.current?.id);if(!pool.length)pool=state.episodes.slice();}
    if(!pool.length)return null;
    // Prefer a newly indexed replay before starting another shuffle cycle.
    const value=new Uint32Array(1);crypto.getRandomValues(value);
    const chosen=pool[value[0]%pool.length];
    seen.add(chosen.id);store(SEEN,[...seen]);store(CURRENT,chosen.id);return chosen;
  }
  function shuffle(){const next=pick();if(next){state.current=next;state.error="";render();}}
  async function refresh(){
    state.loading=true;render();
    let records=null;
    try{
      const response=await fetch(API,{cache:"no-store"});
      if(!response.ok)throw new Error("Catalog API unavailable");
      const data=await response.json();
      if(!data.ok||!Array.isArray(data.episodes))throw new Error("Invalid catalog");
      records=data.episodes;
    }catch(_){
      try{const response=await fetch(FALLBACK,{cache:"no-store"});if(response.ok){const data=await response.json();if(Array.isArray(data.episodes))records=data.episodes;}}catch(_){}
      if(!records)state.error="Catalog service is unavailable; no episodes have been invented.";
    }
    if(records){
      const unique=new Map();
      for(const entry of records){const episode=normalize(entry);if(episode)unique.set(episode.id,episode);}
      state.episodes=[...unique.values()];
      state.current=state.episodes.find(e=>e.id===read(CURRENT,""))||state.episodes[0]||null;
      if(!state.episodes.length)state.error="No verified Magoo recordings indexed yet.";
      else state.error="";
    }
    state.loading=false;render();
  }
  function render(){
    root.replaceChildren();
    const card=elem("article","mp-card"),header=elem("header","mp-header");
    header.append(elem("small","mp-eyebrow","ORACLE OCTAVES · RECORDING LIBRARY"),elem("h2","mp-name","Magoo PhD Recordings"),elem("p","mp-host","@HodlMagoo · Independent Cloudflare catalog"));
    card.append(header);
    const spaceCount=state.episodes.filter(e=>e.kind==="space").length;
    const guestCount=state.episodes.length-spaceCount;
    const info=elem("p","mp-info",state.loading?"Loading verified recordings…":guestCount+" guest recording"+(guestCount===1?"":"s")+" · "+spaceCount+" X Spaces · No-repeat shuffle");
    card.append(info);
    if(state.current){
      card.append(elem("p","mp-kind",state.current.kind==="space"?"X Space replay":state.current.kind==="guest-panel"?"Guest panel · "+state.current.platform:"Guest interview · "+state.current.platform));
      card.append(elem("h3","mp-title",state.current.title));
      card.append(elem("p","mp-meta",[state.current.date,state.current.duration].filter(Boolean).join(" · ")||"Original recording"));
      if(state.current.tags.length)card.append(elem("p","mp-topics",state.current.tags.join(" · ")));
      const play=elem("a","mp-play","▶ Open original on "+state.current.platform+" ↗");play.href=state.current.source;play.target="_blank";play.rel="noopener noreferrer";card.append(play);
      card.append(elem("small","mp-disclaimer","Opens the original "+state.current.platform+" recording. Playback and sign-in depend on the provider; Phi does not copy or simulate the audio."));
    }else{
      card.append(elem("p","mp-empty","The Magoo catalog is ready, awaiting verified recording links."));
    }
    const actions=elem("div","mp-actions");
    const next=btn("⤨ Shuffle Magoo",shuffle);next.disabled=state.loading||state.episodes.length===0;
    const reload=btn("↻ Refresh catalog",()=>void refresh());reload.disabled=state.loading;
    const fred=elem("a","mp-btn","♫ Fred Spaces library");fred.href="#fredSpacesRadio";
    actions.append(next,reload,fred);
    card.append(actions);
    const profile=elem("a","mp-profile","Magoo PhD on X ↗");profile.href="https://x.com/HodlMagoo";profile.target="_blank";profile.rel="noopener noreferrer";
    card.append(profile);
    if(state.error)card.append(elem("p","mp-status",state.error));
    root.append(card);
  }
  render();void refresh();
})();
