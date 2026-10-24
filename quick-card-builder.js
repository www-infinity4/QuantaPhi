const form=document.getElementById('quickCardCreate'),result=document.getElementById('qcpResult'),kind=document.getElementById('qcpKind');
const show=()=>{document.getElementById('qcpSearchLine').hidden=kind.value!=='search';document.getElementById('qcpVideoLine').hidden=kind.value!=='video';};
kind.addEventListener('change',show);show();
const button=document.getElementById('qcpPublish');
form.addEventListener('submit',async event=>{
 event.preventDefault();button.disabled=true;result.replaceChildren();button.textContent='Publishing…';
 const body=Object.fromEntries(new FormData(form).entries());
 try{
  const response=await fetch('/api/quick-cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const value=await response.json();
  if(!response.ok||!value.ok)throw new Error(value.error||'Publishing was not confirmed.');
  const message=document.createElement('p');message.textContent='Card published. Your link is ready to share. Placement in the homepage rotation requires review.';
  const field=document.createElement('input');field.type='url';field.readOnly=true;field.value=value.cardUrl;field.setAttribute('aria-label','Your shareable card URL');
  const row=document.createElement('div');row.className='qcp-share';
  const link=document.createElement('a');link.href=value.cardUrl;link.textContent='Open your card';link.target='_blank';link.rel='noopener';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copy link';copy.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(value.cardUrl);copy.textContent='Copied';}catch{field.focus();field.select();copy.textContent='Select and copy the link';}
  });
  row.append(link,copy);result.append(message,field,row);
 }catch(error){const p=document.createElement('p');p.textContent=error.message||'Could not publish your card.';result.append(p);}
 finally{button.disabled=false;button.textContent='Publish shareable card';}
});