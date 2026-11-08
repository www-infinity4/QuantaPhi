/* HTML created elsewhere stays on-device until user explicitly publishes a hosted URL. */
import {validateHtmlImport,isolatedPreviewDocument,publisherDraftUrl,normalizePrice,PREVIEW_LIMIT} from './gpt-html-implant-core.mjs';
const root=document.getElementById('gptHtmlImplant');
if(root){
 const $=id=>root.querySelector('#'+id),info=$('gptStatus'),html=$('gptCode'),file=$('gptFile'),frame=$('gptPreviewFrame');
 const status=(text)=>info.textContent=text;
 const pricing=$('gptMonetization'),priceLine=$('gptPriceLine');
 pricing.addEventListener('change',()=>{priceLine.hidden=pricing.value!=='paid'});
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];if(!selected)return;
  if(!/\.html?$/i.test(selected.name)||selected.size>PREVIEW_LIMIT){status('Choose an .html or .htm file under 150 KB for local preview.');return;}
  try{const code=await selected.text(),result=validateHtmlImport(code);
   if(result.error){status(result.error);return}
   html.value=result.html;
   if($('gptTitle').value==='Pi Singer')$('gptTitle').value=selected.name.replace(/\.html?$/i,'').replace(/[-_]+/g,' ').slice(0,85);
   status('HTML loaded on this device. Preview it before submitting a hosted URL.');
  }catch{status('This HTML file could not be read locally.');}
 });
 $('gptPreview').addEventListener('click',()=>{
  const result=isolatedPreviewDocument(html.value);
  if(result.error){status(result.error);return;}
  // Opaque origin: never add allow-same-origin, top-navigation, forms, downloads or popups.
  frame.setAttribute('sandbox','allow-scripts');
  frame.srcdoc=result.html;frame.hidden=false;
  status('Local isolated preview ready. The code has not been uploaded or published.');
 });
 $('gptDownload').addEventListener('click',()=>{
  const checked=validateHtmlImport(html.value);if(checked.error){status(checked.error);return;}
  const source=new Blob([checked.html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(source),a=document.createElement('a');
  a.href=url;a.download=($('gptTitle').value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'gpt-app')+'.html';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status('Downloaded your original HTML. Host it using a reviewed provider before public discovery.');
 });
 $('gptPrepare').addEventListener('click',()=>{
  const amount=normalizePrice(pricing.value,$('gptPrice').value);
  if(amount.error){status(amount.error);return;}
  const result=publisherDraftUrl({title:$('gptTitle').value,website:$('gptWebsite').value,
   description:$('gptDescription').value||undefined,interactionRequest:$('gptInteraction').value||undefined,
   mode:amount.mode,starCoins:amount.starCoins,profile:$('gptXProfile').value});
  if(result.error){status(result.error);return;}
  status('Opening your existing moderated publisher. No HTML or wallet access is transferred.');
  location.assign(result.url);
 });
}
