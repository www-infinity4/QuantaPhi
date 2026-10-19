import {cards,cardIntent} from './bubbles-card-catalog.mjs';
export {cardIntent};
export class CardWorkspace{
 constructor(container,onEvidence=()=>{},onClose=()=>{}){
  this.container=container;this.onEvidence=onEvidence;this.onClose=onClose;this.frames=new Map();this.active=null;
  this.heading=document.createElement('h3');this.status=document.createElement('p');this.status.setAttribute('role','status');
  this.stage=document.createElement('div');this.actions=document.createElement('div');this.actions.className='ba-card-toolbar';
  this.escape=event=>{if(event.key==='Escape'&&!this.container.hidden){event.preventDefault();this.close();}};
  container.addEventListener('keydown',this.escape);document.addEventListener?.('keydown',this.escape);
  for(const [label,action] of [['Back to chat',()=>this.close()],['Play',()=>this.play()],['Diagnose card',()=>this.diagnose()],['Close card',()=>this.close()]]){
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
  return this.open(intent.card,intent.action==='play');
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
      const win=frame.contentWindow,proto=win.HTMLMediaElement.prototype,original=proto.play;
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
  if(record.frame.parentNode!==this.stage)this.stage.append(record.frame);this.onEvidence({cardId:card.id,title:card.title,repository:card.repository,url:card.url,sourcePaths:card.scripts?[...card.scripts,...card.styles]:card.id==='infinity-radio'?['index.html','app.js']:['index.html']});
  try{
   await record.ready;if(this.active!==record)return {message:'Card selection changed.'};
   this.status.textContent=card.title+' is open in chat.';
   if(play)return this.play();
   return {message:this.status.textContent};
  }catch(error){this.status.textContent='Card could not open: '+String(error.message||error);return {message:this.status.textContent};}
 }
 play(){
  const record=this.active;if(!record?.loaded)return {message:'Open a card before playback.'};
  const doc=record.frame.contentDocument;
  if(!doc)return {message:'Card moved outside the suite. Reopen it before playback.'};
  // Never guess at Buy, Next, Collect or other potentially paid controls.
  const button=record.card.play?doc.querySelector(record.card.play):null;
  if(button){if(![...record.media].some(media=>!media.paused&&!media.ended))button.click();}
  else{const media=doc.querySelector('audio,video');if(!media)return {message:'This card has no registered playback control. Its controls are available in chat.'};record.media.add(media);const promise=media.play();if(promise?.catch)promise.catch(()=>{});}
  const message='Playback requested for '+record.card.title+'.';this.status.textContent=message;return {message};
 }
 diagnose(){
  const record=this.active;if(!record)return {message:'Open a card so I can inspect its controls and playback.'};
  let snapshot={cardId:record.card.id,title:record.card.title,repository:record.card.repository,url:record.card.url,sourcePaths:record.card.scripts?[...record.card.scripts,...record.card.styles]:record.card.id==='infinity-radio'?['index.html','app.js']:['index.html'],loaded:record.loaded};
  try{
   const doc=record.frame.contentDocument;
   snapshot={...snapshot,controls:[...doc.querySelectorAll('button,input,select,textarea')].slice(0,35).map(control=>({label:(control.getAttribute('aria-label')||control.textContent||control.placeholder||control.name||control.id).trim().slice(0,100),disabled:control.disabled===true})),
    playback:[...record.media].map(media=>({paused:media.paused,ended:media.ended,currentTime:Math.round(media.currentTime||0),readyState:media.readyState,error:media.error?.code||null})),
    errors:[...record.errors,...(record.frame.contentWindow.BubblesCardDiagnostics?.().errors||[])].slice(-8)};
  }catch(error){snapshot.error=String(error.message||error).slice(0,140);}
  this.onEvidence(snapshot);
  const message=record.card.title+': '+(snapshot.controls?.length||0)+' controls inspected; '+(snapshot.errors?.length||0)+' recorded errors. '+(snapshot.playback?.some(media=>!media.paused&&!media.ended)?'Playback is active.':'No active playback confirmed.');
  this.status.textContent=message;return {message,snapshot};
 }
}
