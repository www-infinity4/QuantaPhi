import {AUTOMATIONS,planAutomation} from './catalog.mjs';

// Owner-facing status card. It NEVER activates a device permission or backend.
// Provider status must be checked by the existing authenticated adapter.
export function mountAutomationCard(host){
 if(!host||typeof document==='undefined')return null;
 if(host.dataset.automationMounted==='1')return host;
 host.dataset.automationMounted='1';
 const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node};
 host.append(make('p','Ten automation programs are registered. Each requires its own device or account authorization; source code does not prove a live connection.'));
 const list=make('div',undefined,'bubbles-auto-grid');
 for(const [id,entry] of Object.entries(AUTOMATIONS)){
  const detail=make('details',undefined,'bubbles-auto-item');
  detail.append(make('summary',entry.title));
  detail.append(make('p','Status: '+planAutomation(id,{}).status.replaceAll('_',' ')+' · No action has run.'));
  const link=make('a','View source adapter');
  link.href='https://github.com/www-infinity4/QuantaPhi/blob/main/'+entry.adapter;
  link.target='_blank';link.rel='noopener noreferrer';
  detail.append(link);list.append(detail);
 }
 host.append(list);
 const importBox=make('fieldset',undefined,'bubbles-auto-import');
 importBox.append(make('legend','Private history export · local preview'));
 importBox.append(make('p','Select your own ChatGPT JSON or compatible Gemini Takeout activity JSON. Only the count is displayed. The selected file never leaves this browser tab.'));
 const provider=make('select');provider.setAttribute('aria-label','History provider');
 for(const type of ['chatgpt','gemini']){const option=make('option',type==='chatgpt'?'ChatGPT export':'Gemini Takeout activity');option.value=type;provider.append(option)}
 const chooser=make('input');chooser.type='file';chooser.accept='.json,application/json';chooser.setAttribute('aria-label','Choose history export JSON file');
 const check=make('button','Preview file locally');check.type='button';
 const result=make('p','No file selected.');result.setAttribute('role','status');result.setAttribute('aria-live','polite');
 check.onclick=async()=>{
  result.textContent='Reading the selected file locally…';
  const file=chooser.files?.[0];
  if(!file||file.size<=0||file.size>5_000_000){result.textContent='Select a JSON file up to 5 MB.';return}
  try{
   const rows=JSON.parse(await file.text());
   if(!Array.isArray(rows))throw Error('Unsupported export layout');
   const count=provider.value==='chatgpt'?rows.reduce((sum,conversation)=>sum+(conversation?.mapping&&typeof conversation.mapping==='object'?Object.values(conversation.mapping).filter(node=>Array.isArray(node?.message?.content?.parts)&&['user','assistant'].includes(node?.message?.author?.role)).length:0),0)
    :rows.filter(activity=>Array.isArray(activity?.details)&&activity.details.some(d=>typeof d?.value==='string'&&d.value.trim())).length;
   result.textContent=count+' supported records found in local preview. No messages were uploaded, saved to QuantaPhi, or indexed in Bubbles.';
  }catch{result.textContent='Unsupported JSON export. The file was not uploaded or saved.'}
 };
 importBox.append(provider,chooser,check,result);host.append(importBox);
 return host;
}
if(typeof document!=='undefined'){
 const root=document.getElementById('bubblesAutomationHub');
 if(root)mountAutomationCard(root);
}
