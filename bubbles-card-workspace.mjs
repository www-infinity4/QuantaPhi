import {cards,cardIntent} from './bubbles-card-catalog.mjs';
import {cardControlDecision,safeCardControls,toolReply} from './bubbles-action-driver.mjs';
export {cardIntent};
export class CardWorkspace{
 constructor(container,onEvidence=()=>{},onClose=()=>{},onEdit=()=>{}){
  this.container=container;this.onEvidence=onEvidence;this.onClose=onClose;this.onEdit=onEdit;this.frames=new Map();this.active=null;this.lastSuggestedWords=[];
  this.heading=document.createElement('h3');this.status=document.createElement('p');this.status.setAttribute('role','status');
  this.stage=document.createElement('div');this.actions=document.createElement('div');this.actions.className='ba-card-toolbar';
  this.escape=event=>{if(event.key==='Escape'&&!this.container.hidden){event.preventDefault();this.close();}};
  container.addEventListener('keydown',this.escape);document.addEventListener?.('keydown',this.escape);
  for(const [label,action] of [['Back to chat',()=>this.close()],['Play',()=>this.play()],['Diagnose card',()=>this.diagnose()],['Draft edit',()=>this.draftEdit()],['Close card',()=>this.close()]]){
   const button=document.createElement('button');button.type='button';button.className='ba-miniaction';button.textContent=label;button.onclick=action;this.actions.append(button);
  }
  container.className='ba-card-workspace';container.hidden=true;container.append(this.heading,this.status,this.actions,this.stage);
 }
 async handle(intent){
  if(intent.action==='catalog'){
   this.pause(this.active);this.stage.hidden=true;this.container.hidden=false;this.heading.textContent='Card catalog';
   let menu=this.container.querySelector('.ba-card-catalog');if(menu)menu.remove();
   menu=document.createElement('div');menu.className='ba-card-catalog';
   for(const card of cards){const button=document.createElement('button');button.type='button';button.textContent=card.title;button.onclick=()=>void this.open(card,false);menu.append(button);}
   this.container.append(menu);return {message:cards.length+' registered cards are available here. Choose a card or tell me its name.'};
  }
  if(intent.action==='close'){this.close();return {message:'Card closed. Playback paused.'};}
  if(intent.action==='diagnose')return this.diagnose();
  if(intent.action==='play-active')return this.play();
  if(intent.action==='suggest-words')return this.suggestWords();
  if(intent.action==='add-suggested-words')return this.addWords(this.lastSuggestedWords.join(', '));
  if(intent.action==='add-words')return this.addWords(intent.words);
  if(intent.action==='edit'){const opened=await this.open(intent.card,false);if(this.active?.loaded)this.draftEdit();return opened;}
  return this.open(intent.card,intent.action==='play');
 }
 async pressControl(label){
  const record=this.active;
  if(!record?.loaded||this.container.hidden)return {status:'control_not_found',message:'Open the requested card before asking me to press its controls.'};
  const name=String(label||'').trim().toLowerCase();
  // Fred's player links to X; a synthetic click cannot certify hearing audio.
  if(['media-star','fred-spaces'].includes(record.card.id)&&/^(?:play|listen|replay|start|audio|▶)$/.test(name))
   return {status:'external_link_requires_user_tap',message:this.play().message};
  const doc=record.frame.contentDocument;
  if(!doc)return {status:'control_not_found',message:'Card document is not available. No tap occurred.'};
  let decision;
  try{decision=cardControlDecision(label,safeCardControls(doc));}
  catch(error){return {status:'control_not_found',message:'Card controls could not be inspected: '+String(error.message||error).slice(0,110)}}
  if(decision.status!=='safe_click')return {status:decision.status,message:toolReply(decision)};
  try{
   // Only a named, unique, visible, enabled and non-sensitive card control.
   // Browser scripts still enforce all wallet/owner permissions independently.
   decision.control.element.click();
   const receipt={status:'safe_click',label:decision.control.label,card:record.card.title};
   this.onEvidence({...this.getEvidence(record),controlAction:receipt,loaded:true});
   return {...receipt,message:toolReply(receipt)};
  }catch(error){return {status:'tap_failed',message:'Card control did not accept the tap: '+String(error.message||error).slice(0,130)}}
 }
 pause(record){if(record)for(const media of record.media)try{media.pause();}catch{}}
 close(){this.pause(this.active);this.active=null;this.container.hidden=true;this.onEvidence(null);this.onClose();}
 async open(card,play){
  this.pause(this.active);this.stage.hidden=false;this.container.querySelector('.ba-card-catalog')?.remove();this.container.hidden=false;this.heading.textContent=card.title;this.status.textContent='Opening '+card.title+'…';
  let record=this.frames.get(card.id);
  if(!record){
   const frame=document.createElement('iframe');frame.title=card.title;frame.allow='autoplay; fullscreen';
   frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');
   record={card,frame,media:new Set(),errors:[],loaded:false};
   record.ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Card loading timed out')),20000);
    frame.addEventListener('load',()=>{
     clearTimeout(timer);
     try{
      // A catalog route must remain on our origin; redirected third-party pages are not controlled.
      if(frame.contentWindow.location.origin!==location.origin)throw Error('Card left the suite origin');
      const win=frame.contentWindow;
      // Iframe 'load' includes HTTP fallback pages and asset failures.
      // Local cards must report actual registered-script rendering, not just
      // navigation to an empty or broken host document.
      if(card.mount){
       const report=win.BubblesCardDiagnostics?.();
       if(report?.id!==card.id||report?.loaded!==true)
        throw Error('Registered card did not finish loading: '+String(report?.errors?.at(-1)||win.document.getElementById('host-status')?.textContent||'no verified card host').slice(0,170));
      }
      const proto=win.HTMLMediaElement.prototype,original=proto.play;
      win.addEventListener('keydown',this.escape);
      proto.play=function(...args){
       record.media.add(this);
       this.addEventListener('playing',()=>{if(thisWorkspace.active===record)thisWorkspace.status.textContent=card.title+' · playback confirmed';},{once:true});
       try{const result=original.apply(this,args);if(result?.catch)result.catch(error=>{record.errors.push(String(error.message||error).slice(0,150));if(thisWorkspace.active===record)thisWorkspace.status.textContent='Playback needs attention. Use Play here or the player’s control.';});return result;}
       catch(error){record.errors.push(String(error.message||error));throw error;}
      };
      const thisWorkspace=this;
      for(const media of win.document.querySelectorAll('audio,video'))record.media.add(media);
      win.addEventListener('error',event=>record.errors.push(String(event.message||'Card error').slice(0,180)));
      record.loaded=true;resolve();
     }catch(error){reject(error);}
    },{once:true});
   });
   frame.src=card.url;this.frames.set(card.id,record);
   if(this.frames.size>3){const [id,old]=this.frames.entries().next().value;this.pause(old);old.frame.remove();this.frames.delete(id);}
  }
  this.active=record;
  for(const entry of this.frames.values())entry.frame.hidden=entry!==record;
  if(record.frame.parentNode!==this.stage)this.stage.append(record.frame);
  if(record.loaded)this.onEvidence(this.getEvidence(record));
  try{
   await record.ready;if(this.active!==record)return {message:'Card selection changed.'};
   this.onEvidence({...this.getEvidence(record),loaded:true});
   this.status.textContent=card.title+' is open in chat.'+
    (['media-star','fred-spaces'].includes(card.id)?
     ' Fred’s Space is linked to the original X replay. Tap ▶ in the card to listen; audio has not been confirmed.':'');
   if(play)return this.play();
   return {message:this.status.textContent};
  }catch(error){
   record.errors.push(String(error.message||error).slice(0,180));
   // Failed iframe loads must be retryable on the next owner command.
   this.pause(record);record.frame.remove();this.frames.delete(card.id);
   this.status.textContent='Card could not open: '+String(error.message||error).slice(0,180);
   this.onEvidence({cardId:card.id,title:card.title,repository:card.repository,loaded:false,errors:[...record.errors]});
   return {message:this.status.textContent};
  }
 }
 getEvidence(record=this.active){
  if(!record)return null;
  const card=record.card;
  return {cardId:card.id,title:card.title,repository:card.repository,url:card.url,
   sourcePaths:card.scripts?[...card.scripts,...card.styles]:card.id==='infinity-radio'?['index.html','app.js']:['index.html']};
 }
 draftEdit(){
  const evidence=this.getEvidence();
  if(!evidence)return {message:'Open a project or card before drafting a change.'};
  this.onEdit(evidence);
  return {message:'Editable work draft prepared for '+evidence.title+'. The original page remains intact until an authenticated GitHub edit, test and deployment are verified.'};
 }
 suggestWords(){
  if(this.active?.card.id!=='bitcoin-crusher')return {message:'Open Bitcoin Crusher first. Word suggestions belong to its research collector.'};
  this.lastSuggestedWords=['bitcoin','mining','hashrate','difficulty','cryptography','blockchain','energy','consensus','transactions','wallets'];
  return {message:'Here are 10 research terms: '+this.lastSuggestedWords.join(', ')+'. Say “add these 10 words” or give me your own comma-separated terms. I will not spin the StarCoin machine without a separate request.'};
 }
 addWords(raw){
  if(this.active?.card.id!=='bitcoin-crusher')return {message:'Open Bitcoin Crusher before adding research words.'};
  if(!this.active.loaded)return {message:'Bitcoin Crusher is not loaded yet.'};
  const items=String(raw||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
  if(!items.length||items.length>100||items.some(x=>x.length>90))
   return {message:'Give 1–100 research terms separated with commas; each term can have up to 90 characters.'};
  try{
   const doc=this.active.frame.contentDocument;
   const field=doc?.querySelector('#researchIdea'),button=doc?.querySelector('#addWords');
   if(!field||!button||button.disabled)return {message:'The Bitcoin Crusher research word collector is unavailable. No words were added.'};
   const setter=Object.getOwnPropertyDescriptor(this.active.frame.contentWindow.HTMLTextAreaElement.prototype,'value')?.set;
   if(setter)setter.call(field,items.join(', '));else field.value=items.join(', ');
   field.dispatchEvent(new this.active.frame.contentWindow.Event('input',{bubbles:true}));
   button.click();
   const status=(doc.querySelector('#researchIdeaStatus')?.textContent||'').trim();
   return {message:'Sent '+items.length+' research terms to Bitcoin Crusher. '+status.slice(0,200)+' The machine has not been spun.'};
  }catch(error){return {message:'Research collector could not be updated: '+String(error.message||error).slice(0,150)};}
 }
 play(){
  const record=this.active;if(!record?.loaded)return {message:'Open a card before playback.'};
  const doc=record.frame.contentDocument;
  if(!doc)return {message:'Card moved outside the suite. Reopen it before playback.'};
  // Media Star / Fred's curated Spaces are publisher-owned replay links,
  // NOT a licensed in-chat audio stream. Opening a card is verified here,
  // but real listening requires a user tap on the original X link.
  if(['media-star','fred-spaces'].includes(record.card.id)){
   const source=doc.querySelector('#fredSpacesRadio .fs-play');
   const href=source?.getAttribute('href')||source?.href||'';
   let trusted=false;try{const u=new URL(href,location.origin);trusted=u.protocol==='https:'&&['x.com','twitter.com','www.x.com','www.twitter.com'].includes(u.hostname)&&/^\/i\/spaces\//.test(u.pathname)}catch{}
   const message=trusted
    ?'Fred’s Space is selected. Tap ▶ in the card to open the original X replay. X controls actual playback; no in-chat audio has been verified.'
    :'Fred’s original X replay is not available in this card right now. No audio playback was started.';
   this.status.textContent=message;return {message};
  }
  const button=record.card.play?doc.querySelector(record.card.play):null;
  if(button&&!button.disabled){if(![...record.media].some(media=>!media.paused&&!media.ended))button.click();}
  else{const media=doc.querySelector('audio,video');if(!media)return {message:'This card has no available registered playback control. Its controls are available in chat.'};record.media.add(media);const promise=media.play();if(promise?.catch)promise.catch(()=>{});}
  const message='Playback requested for '+record.card.title+'. Use Diagnose card to check observed media state; a click does not prove audible sound.';
  this.status.textContent=message;return {message};
 }
 diagnose(){
  const record=this.active;if(!record)return {message:'Open a card so I can inspect its controls and playback.'};
  let snapshot={cardId:record.card.id,title:record.card.title,repository:record.card.repository,url:record.card.url,sourcePaths:record.card.scripts?[...record.card.scripts,...record.card.styles]:record.card.id==='infinity-radio'?['index.html','app.js']:['index.html'],loaded:record.loaded};
  try{
   const doc=record.frame.contentDocument;
   snapshot={...snapshot,controls:[...doc.querySelectorAll('button,input,select,textarea')].slice(0,35).map(control=>({label:(control.getAttribute('aria-label')||control.textContent||control.placeholder||control.name||control.id).trim().slice(0,100),disabled:control.disabled===true})),
    playback:[...record.media].map(media=>({paused:media.paused,ended:media.ended,currentTime:Math.round(media.currentTime||0),readyState:media.readyState,error:media.error?.code||null})),
    errors:[...record.errors,...(record.frame.contentWindow.BubblesCardDiagnostics?.().errors||[])].slice(-8)};
   if(['media-star','fred-spaces'].includes(record.card.id)){
    const source=doc.querySelector('#fredSpacesRadio .fs-play');
    const link=source?.getAttribute('href')||source?.href||'';
    snapshot.fredReplay={linkAvailable:/^https:\/\/(?:www\.)?(?:x|twitter)\.com\/i\/spaces\//.test(link),audioHostedInCard:false,
     publisher:'X',requiresOriginalSource:true};
   }
  }catch(error){snapshot.error=String(error.message||error).slice(0,140);}
  if(record.card.id==='bitcoin-crusher'){
   try{const doc=record.frame.contentDocument;
    const jukebox=doc?.querySelector('#crusherMusicFrame');
    snapshot.jukebox={iframePresent:Boolean(jukebox),sourceSelected:doc?.querySelector('#musicSelection')?.textContent?.slice(0,160)||'',
      srcSet:Boolean(jukebox?.getAttribute('src')),notice:doc?.querySelector('#musicPlayerNotice')?.textContent?.slice(0,180)||''};
   }catch{}
  }
  if(record.card.id==='infinity-radio'){
   try{const doc=record.frame.contentDocument;
    snapshot.radio={playButtonPresent:Boolean(doc?.querySelector('#play-btn')),nowPlaying:doc?.querySelector('#np-title')?.textContent?.slice(0,160)||''};
   }catch{}
  }
  this.onEvidence(snapshot);
  const message=record.card.title+': '+(snapshot.controls?.length||0)+' controls inspected; '+(snapshot.errors?.length||0)+' recorded errors. '+(snapshot.playback?.some(media=>!media.paused&&!media.ended)?'Playback is active.':'No active playback confirmed.');
  this.status.textContent=message;return {message,snapshot};
 }
}
