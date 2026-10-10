/* Magoo PhD X Spaces catalog: separate host and D1 index from Fred.
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
  function validLink(value){try{const u=new URL(value);return u.protocol==="https:"&&["x.com","twitter.com","www.x.com","www.twitter.com"].includes(u.hostname)&&/^\/i\/spaces\/[A-Za-z0-9]+\/?$/.test(u.pathname);}catch{return false;}}
  function normalize(raw){
    if(!raw||!validLink(raw.source))return null;
    const id=String(raw.spaceId||new URL(raw.source).pathname.split("/").pop());
    if(!/^[A-Za-z0-9]+$/.test(id))return null;
    return {id:"magoo-"+id,title:String(raw.title||"Magoo PhD Space"),date:String(raw.date||""),duration:String(raw.duration||""),source:new URL(raw.source).origin+"/i/spaces/"+id,tags:Array.isArray(raw.tags)?raw.tags.slice(0,10).map(String):[]};
  }
  function pick(){
    const seen=new Set(read(SEEN,[]));
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
      if(!state.episodes.length)state.error="No verified Magoo replay links indexed yet.";
      else state.error="";
    }
    state.loading=false;render();
  }
  function render(){
    root.replaceChildren();
    const card=elem("article","mp-card"),header=elem("header","mp-header");
    header.append(elem("small","mp-eyebrow","ORACLE OCTAVES · SPACES LIBRARY"),elem("h2","mp-name","Magoo PhD Spaces"),elem("p","mp-host","@HodlMagoo · Separate Cloudflare catalog"));
    card.append(header);
    const info=elem("p","mp-info",state.loading?"Loading verified episodes…":state.episodes.length+" verified replay"+(state.episodes.length===1?"":"s")+" indexed · Shuffles without repeats");
    card.append(info);
    if(state.current){
      card.append(elem("h3","mp-title",state.current.title));
      card.append(elem("p","mp-meta",[state.current.date,state.current.duration].filter(Boolean).join(" · ")||"Original X Space"));
      if(state.current.tags.length)card.append(elem("p","mp-topics",state.current.tags.join(" · ")));
      const play=elem("a","mp-play","▶ Open original Space on X ↗");play.href=state.current.source;play.target="_blank";play.rel="noopener noreferrer";card.append(play);
      card.append(elem("small","mp-disclaimer","X controls recording availability and sign-in. This site does not host or simulate the audio."));
    }else{
      card.append(elem("p","mp-empty","The Magoo catalog is ready. A verified X Space URL is needed before there is anything to shuffle."));
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
