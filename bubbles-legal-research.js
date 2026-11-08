import {LEGAL_TOPICS,LEGAL_SOURCES,buildAttorneyPrepPacket} from './bubbles-legal-research-data.mjs';

// This page never stores, uploads or forwards visitor notes. A user has to
// explicitly copy/download their own attorney-prep packet.
const byId=id=>document.getElementById(id);
const topics=byId('legalTopicList'),sources=byId('legalSources'),notes=byId('legalNotes');
const preview=byId('legalPacketPreview'),status=byId('legalStatus');
const selected=()=>[...topics.querySelectorAll('input:checked')].map(x=>x.value);
const details=()=>({topicIds:selected(),notes:notes.value});
function render(){
 try{preview.textContent=buildAttorneyPrepPacket(details());status.textContent='';}
 catch{preview.textContent='The draft could not be prepared. Review your selections.';status.textContent='Draft unavailable.';}
}
for(const topic of LEGAL_TOPICS){
 const label=document.createElement('label');label.className='topic';
 const check=document.createElement('input');check.type='checkbox';check.value=topic.id;
 check.name='legal-topic';check.checked=['play','privacy','copyright','trademark'].includes(topic.id);
 check.addEventListener('change',render);
 const caption=document.createElement('span');caption.textContent=topic.name;
 label.append(check,caption);topics.append(label);
}
for(const source of LEGAL_SOURCES){
 const anchor=document.createElement('a');anchor.href=source.url;
 anchor.target='_blank';anchor.rel='noopener noreferrer';
 anchor.textContent=source.authority;
 const description=document.createElement('small');description.textContent=source.purpose;
 anchor.append(description);sources.append(anchor);
}
notes.addEventListener('input',render);
byId('legalOpenChat').addEventListener('click',()=>{
 const bubble=document.querySelector('.quantaphi-bubbles-embed-launcher');
 if(!bubble){status.textContent='The Bubbles launcher did not load. Use the Bubbles main chat link above.';return;}
 bubble.click();status.textContent='Bubbles Legal Research opened. Share only information you choose.';
});
byId('legalCopyPacket').addEventListener('click',async()=>{
 const packet=buildAttorneyPrepPacket(details());
 try{
  if(!navigator.clipboard?.writeText)throw Error('clipboard_unavailable');
  await navigator.clipboard.writeText(packet);status.textContent='Packet copied by your request. Nothing was sent to a lawyer.';
 }catch{
  preview.focus();status.textContent='Copy unavailable in this browser. Select the preview text and copy manually.';
 }
});
byId('legalDownloadPacket').addEventListener('click',()=>{
 const content=buildAttorneyPrepPacket(details());
 const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='bubbles-attorney-prep.txt';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status.textContent='Text file prepared on this device. No legal filing or publication occurred.';
});
byId('legalClearPacket').addEventListener('click',()=>{
 notes.value='';
 topics.querySelectorAll('input').forEach(box=>{box.checked=false});
 render();status.textContent='Local draft cleared. No saved copy was stored by this page.';
});
render();
