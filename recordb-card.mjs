/* RecordB | Bubbles in-chat Android screen + microphone recorder.
 * Source home: www-infinity4/RecordB; QuantaPhi bundles the identical module
 * so Android's signed-in first-party WebView can load it from the site.
 * Browser JS never records the device itself or grants Android permissions.
 */
export const RECORD_B_COMMANDS=Object.freeze({
 start:'record screen',pause:'pause screen recording',
 resume:'resume screen recording',stop:'stop recording'
});
export function recordBState(capture={},native=false){
 const screenActive=capture.screenActive===true;
 const screenRecording=capture.screenRecording===true;
 const screenPaused=capture.screenPaused===true;
 const soundActive=capture.soundActive===true;
 const detail=String(capture.screenState||'').slice(0,180);
 const soundDetail=String(capture.soundState||'').slice(0,180);
 const saving=!screenActive&&/stopping|saving|finalizing|processing|finishing/i.test(detail+' '+soundDetail);
 const waiting=!screenActive&&/approval|approve|requested|permission/i.test(detail);
 const active=screenActive||soundActive;
 const saved=!active&&!saving&&/saved\b/i.test(detail+' '+soundDetail);
 const failed=!active&&!saving&&/failed|error/i.test(detail+' '+soundDetail);
 const status=!native?'Android app required for screen and microphone recording':
  screenPaused?'Paused · recording remains on this phone':
  screenRecording?'Recording screen and microphone':
  screenActive?'Preparing screen recording':
  soundActive?'Recording microphone':
  saving?'Saving recording to Movies/Bubbles…':
  waiting?'Waiting for Android screen-capture approval':
  saved?'Saved · '+(detail||soundDetail):
  failed?'Recording problem · '+(detail||soundDetail):
  'Ready · Android asks permission when you start';
 return {status,active,screenPaused,waiting,saving,
  canStart:native&&!active&&!waiting&&!saving,
  canPause:native&&screenRecording&&!screenPaused,
  canResume:native&&screenActive&&screenPaused,
  canStop:native&&active};
}
export function mountRecordBCard({document,container,before,native,enqueue}){
 if(!document||!container||typeof enqueue!=='function')throw Error('recordb_mount_missing_dependencies');
 const create=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
 const card=create('section','ba-recordb-card');
 card.setAttribute('aria-label','RecordB phone recorder');
 const heading=create('strong','ba-recordb-title','RecordB · Screen + sound');
 const info=create('small','ba-recordb-state','Ready');
 info.setAttribute('role','status');info.setAttribute('aria-live','polite');
 const row=create('div','ba-recordb-actions');
 const buttons={};
 for(const [key,label] of [['start','Record'],['pause','Pause'],['resume','Resume'],['stop','Stop & save']]){
  const b=create('button','ba-control ba-recordb-'+key,label);b.type='button';
  b.addEventListener('click',()=>{
   if(b.disabled)return;
   if(enqueue(RECORD_B_COMMANDS[key])===false){
    info.textContent='Android command queue full or recorder unavailable. No action confirmed.';
    return;
   }
   info.textContent=key==='start'?'Request sent to Android. Approve screen capture on the phone.':
    key==='stop'?'Stop requested. Waiting for the phone to save the file…':
    key==='pause'?'Pause requested. Waiting for Android status…':'Resume requested. Waiting for Android status…';
  });
  buttons[key]=b;row.append(b);
 }
 const hint=create('small','ba-recordb-hint','Recorded video stays on your phone in Movies/Bubbles. RecordB stores app code, not your footage.');
 card.append(heading,info,row,hint);
 if(before)container.insertBefore(card,before);else container.append(card);
 const update=(capture={})=>{
  const s=recordBState(capture,native);
  info.textContent=s.status;
  buttons.start.hidden=!s.canStart;
  buttons.pause.hidden=!s.canPause;
  buttons.resume.hidden=!s.canResume;
  buttons.stop.hidden=!s.canStop;
  if(!native){buttons.start.hidden=false;buttons.start.disabled=true;}
  else buttons.start.disabled=!s.canStart;
  return s;
 };
 update({});
 return {element:card,buttons,update};
}
