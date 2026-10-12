/* QuantaPhi Infinity Concept Reader.
 * Shows ONLY sourced experiments already produced by the WidgetPhi robot.
 * Safe read-only UI: no eval, HTML injection, payments, or guessed wallet rewards. */
(() => {
  'use strict';
  const mount=document.getElementById('infinityConcepts');
  if(!mount) return;
  const BASE='https://raw.githubusercontent.com/www-infinity4/WidgetPhi/main/catalog/';
  const node=(tag,cls,value)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(value!==undefined)e.textContent=String(value);
    return e;
  };
  const add=(parent,element)=>{parent.append(element);return element;};
  const url=value=>{
    try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}
    catch{return'';}
  };
  const link=(label,href)=>{
    const a=node('a','',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
  };
  const list=(parent,tag,items)=>{
    if(!Array.isArray(items)||!items.length)return;
    const ul=add(parent,node(tag));
    for(const item of items.slice(0,12))add(ul,node('li','',item));
  };
  const summary=(parent,cls,title)=>{
    const d=add(parent,node('details',cls));add(d,node('summary','',title));return d;
  };
  let entries=[],current=0;
  function render(){
    mount.replaceChildren();
    if(!entries.length)return renderEmpty('The generated physics card feed has no available cards.');
    const e=entries[current];
    const shell=add(mount,node('article','icp-shell'));
    shell.setAttribute('data-infinity-concept-id',String(e.id));
    const header=add(shell,node('div','icp-hero'));
    add(header,node('strong','icp-brand','INFINITY 2026® · CONCEPT CARD · NO. '+String(e.number).padStart(3,'0')+' · 1/1 DESIGN'));
    const next=add(header,node('button','icp-next','Another experiment'));
    next.type='button';next.disabled=entries.length<2;
    next.addEventListener('click',()=>{
      current=(current+1)%entries.length;render();mount.scrollIntoView({block:'start',behavior:'auto'});
    });
    add(shell,node('h2','',e.title));
    const labels=add(shell,node('div','icp-labels'));
    add(labels,node('span','icp-tag','Physics experiment'));
    add(labels,node('span','icp-tag','Guide: '+String(e.character||'Oracle')));
    add(shell,node('p','',e.description||''));
    add(shell,node('p','icp-explanation',e.principle||''));
    const exp=summary(shell,'icp-exp','Open experiment instructions');
    add(exp,node('h3','','Materials'));list(exp,'ul',e.materials);
    add(exp,node('h3','','Try it'));list(exp,'ol',e.steps);
    if(e.safety)add(exp,node('p','icp-safety','Safety: '+e.safety));
    const story=e.story&&typeof e.story==='object'?e.story:null;
    if(story&&(story.body||story.url)){
      const s=summary(shell,'icp-story','Read attached story · '+String(story.title||'Original Story'));
      add(s,node('h3','',story.title||'Original Story'));
      if(story.character)add(s,node('p','','Story character: '+story.character));
      if(story.body)for(const p of String(story.body).split(/\n{2,}/).slice(0,20))add(s,node('p','',p));
      const target=url(story.url);
      if(target)add(s,link('Read full story on its website ↗',target));
    }
    const references=Array.isArray(e.sources)?e.sources.filter(s=>url(s.url)).slice(0,8):[];
    if(references.length){
      const s=summary(shell,'icp-references','Sources & further research ('+references.length+')');
      const ul=add(s,node('ul'));
      for(const source of references){const li=add(ul,node('li'));add(li,link(source.label||'Original educational source',url(source.url)));}
    }
    add(shell,node('p','icp-fine','Original Infinity concept design. Characters are narration choices; these are not attributed quotes or confirmed demonstrations by a named historical educator.'));
    add(shell,node('p','icp-status','Bot-built card '+(current+1)+' of '+entries.length+' · Source-backed preview'));
  }
  function renderEmpty(message){
    const p=add(mount,node('section','icp-shell'));
    add(p,node('strong','icp-brand','INFINITY 2026® · CONCEPT CARDS'));
    add(p,node('p','icp-status',message));
    add(p,link('See the WidgetPhi source library ↗','https://github.com/www-infinity4/WidgetPhi/tree/main/catalog'));
  }
  async function load(){
    renderEmpty('Loading robot-built physics cards…');
    const controller=new AbortController();
    const stop=setTimeout(()=>controller.abort(),12000);
    try{
      const files=await Promise.all(['physics-experiments.json','physics-built.json'].map(async name=>{
        const r=await fetch(BASE+name,{signal:controller.signal,cache:'no-cache'});
        if(!r.ok)throw Error('HTTP '+r.status);
        return r.json();
      }));
      const [catalog,produced]=files;
      if(catalog.schema!=='widgetphi.physics-seed/v1'||produced.schema!=='widgetphi.physics-built/v1')throw Error('Feed schema');
      const ids=new Set(Array.isArray(produced.generatedIds)?produced.generatedIds:[]);
      entries=(Array.isArray(catalog.experiments)?catalog.experiments:[])
        .filter(e=>e&&ids.has(e.id)&&Number.isInteger(e.number)&&e.sources?.length&&e.steps?.length)
        .sort((a,b)=>a.number-b.number);
      current=0;render();
    }catch(error){
      renderEmpty('Physics concept cards are unavailable from the source feed right now. The rest of QuantaPhi remains available.');
      console.warn('Infinity concept reader:',error?.message||error);
    }finally{clearTimeout(stop)}
  }
  load();
})();
