/* QuantaPhi Infinity Concept Reader.
 * Shows ONLY sourced experiments already produced by the WidgetPhi robot.
 * Safe read-only UI: no eval, HTML injection, payments, or guessed wallet rewards. */
(() => {
  'use strict';
  const mount=document.getElementById('infinityConcepts');
  if(!mount) return;
  const BASE='https://raw.githubusercontent.com/www-infinity4/WidgetPhi/main/catalog/';
  const FAVORITES='quantaPhi:infinityConceptStars:v1',COLLECTED='quantaPhiCollected';
  const read=(key,otherwise=[])=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(value)?value:otherwise}catch{return otherwise}};
  const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const slug=value=>String(value||'').replace(/[^a-zA-Z0-9_-]/g,'-');
  const conceptKey=e=>'infinity-concept|'+String(e.id);
  const deepLink=e=>'https://quantaphi.org/#infinity-concept-'+slug(e.id);
  const cardData=e=>({
    key:conceptKey(e),type:'Physics Experiment',title:e.title,story:String(e.description||'')+'\n'+String(e.principle||''),
    media:e.id==='physics-001'?'https://quantaphi.org/assets/julius-balloon-001.jpg':url(e.imageUrl),sourceUrl:url(e.sources?.[0]?.url),experimentId:String(e.id),number:e.number
  });
  const creditStatus=(receipt,action)=>receipt?.pending
    ?action+' action saved; +0.1 StarCoin awaits ledger confirmation.'
    :receipt?.awarded?action+' credited by the wallet.'
    :action+' saved locally; wallet payout is unconfirmed. Check your StarQuest connection.';
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
    shell.id='infinity-concept-'+slug(e.id);
    const header=add(shell,node('div','icp-hero'));
    add(header,node('strong','icp-brand','INFINITY 2026® · CONCEPT CARD · NO. '+String(e.number).padStart(3,'0')+' · 1/1 DESIGN'));
    const next=add(header,node('button','icp-next','Another experiment'));
    next.type='button';next.disabled=entries.length<2;
    next.addEventListener('click',()=>{
      current=(current+1)%entries.length;render();mount.scrollIntoView({block:'start',behavior:'auto'});
    });
    add(shell,node('h2','',e.title));
    const art=e.id==='physics-001'?'/assets/julius-balloon-001.jpg':url(e.imageUrl);if(art){const image=add(shell,node('img','icp-art'));image.src=art;image.alt='Original Infinity Julius Miller illustration · '+e.title;image.loading='lazy';}

    const labels=add(shell,node('div','icp-labels'));
    add(labels,node('span','icp-tag','Physics experiment'));
    add(labels,node('span','icp-tag','Guide: '+String(e.character||'Oracle')));
    const demonstration=add(shell,node('section','icp-demonstration'));
    add(demonstration,node('span','icp-section-label','THE EXPERIMENT'));
    add(demonstration,node('p','',e.description||''));
    add(demonstration,node('span','icp-section-label','WHAT IT DEMONSTRATES'));
    add(demonstration,node('p','icp-explanation',e.principle||''));
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
    const actions=add(shell,node('div','icp-actions'));
    actions.setAttribute('aria-label','StarQuest concept actions');
    const starButton=add(actions,node('button','icp-action icp-star','☆ Star +0.1 ★'));
    const collectButton=add(actions,node('button','icp-action icp-collect','Collect +0.1 ★'));
    const shareButton=add(actions,node('button','icp-action icp-share','Share +0.1 ★'));
    for(const button of [starButton,collectButton,shareButton])button.type='button';
    const notice=add(shell,node('p','icp-reward-status','StarQuest rewards are submitted only after a real action; wallet confirmation may be pending.'));
    notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    const key=conceptKey(e),data=cardData(e);
    const update=()=>{
      starButton.textContent=read(FAVORITES).includes(key)?'★ Starred':'☆ Star +0.1 ★';
      collectButton.textContent=read(COLLECTED).some(row=>row?.key===key)?'Collected ✓':'Collect +0.1 ★';
    };
    starButton.addEventListener('click',()=>{
      const entries=read(FAVORITES);
      if(!entries.includes(key)&&!save(FAVORITES,[...entries,key])){notice.textContent='Could not save Star on this device. No payout submitted.';return}
      update();
      let receipt;try{receipt=window.QuantaStarCredit?.('star',key,data)}catch(error){console.warn('Concept Star credit deferred',error)}
      notice.textContent=creditStatus(receipt,'Star');
    });
    collectButton.addEventListener('click',()=>{
      const entries=read(COLLECTED),existing=entries.find(row=>row?.key===key);
      const item=existing||{...data,createdAt:new Date().toISOString(),collectedAt:new Date().toISOString(),generator:'infinity-concepts'};
      if(!existing){
        if(!save(COLLECTED,[...entries,item].slice(-1000))){notice.textContent='Cannot save collection on this device. No payout submitted.';return}
        window.dispatchEvent(new CustomEvent('quantaphi:collected',{detail:item}));
      }
      update();
      let receipt;try{receipt=window.QuantaStarCredit?.('collect',key,item)}catch(error){console.warn('Concept Collect credit deferred',error)}
      notice.textContent=creditStatus(receipt,'Collect');
    });
    shareButton.addEventListener('click',async()=>{
      if(shareButton.disabled)return;
      shareButton.disabled=true;
      try{
        const link=deepLink(e),details={title:e.title,text:'Infinity 2026® physics experiment: '+String(e.description||'').slice(0,170),url:link};
        if(navigator.share)await navigator.share(details);
        else if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(details.text+' '+link);
        else throw Error('Sharing is unavailable in this browser');
        let receipt;try{receipt=window.QuantaStarCredit?.('share','infinity-concept:'+String(e.id)+':'+Date.now(),{...data,shareUrl:link})}
        catch(error){console.warn('Concept Share credit deferred',error)}
        notice.textContent='Shared the direct concept-card link. '+creditStatus(receipt,'Share');
      }catch(error){notice.textContent=error?.name==='AbortError'?'Share canceled. No reward submitted.':'Share was not completed: '+String(error?.message||error)}
      finally{shareButton.disabled=false}
    });
    update();
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
      const requested=window.location.hash.slice(1);
      current=Math.max(0,entries.findIndex(e=>'infinity-concept-'+slug(e.id)===requested));render();
      if(requested.startsWith('infinity-concept-')&&entries.some(e=>'infinity-concept-'+slug(e.id)===requested))
        requestAnimationFrame(()=>mount.scrollIntoView({block:'start'}));
    }catch(error){
      renderEmpty('Physics concept cards are unavailable from the source feed right now. The rest of QuantaPhi remains available.');
      console.warn('Infinity concept reader:',error?.message||error);
    }finally{clearTimeout(stop)}
  }
  window.addEventListener('hashchange',()=>{
    const requested=window.location.hash.slice(1);
    const target=entries.findIndex(e=>'infinity-concept-'+slug(e.id)===requested);
    if(target>=0){current=target;render();mount.scrollIntoView({block:'start'});}
  });
  load();
})();
