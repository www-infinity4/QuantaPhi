/* Image / Video share one card; switching retains both working drafts. */
(function(){
'use strict';
const root=document.getElementById('phiMediaBuilder');if(!root)return;
const tabs=[...root.querySelectorAll('[role="tab"]')];
function select(mode,focus=false){
 for(const tab of tabs){const active=tab.dataset.mediaMode===mode;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;if(active&&focus)tab.focus()}
 root.dataset.mediaMode=mode;
 if(mode==='video'){const prompt=root.querySelector('#pv-prompt');if(prompt&&!prompt.value.trim())prompt.value=root.querySelector('#pi-prompt')?.value||''}
 else window.PhiVideoBuilder?.stopPreview?.();
}
for(const tab of tabs){tab.addEventListener('click',()=>select(tab.dataset.mediaMode));tab.addEventListener('keydown',event=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();select(event.key==='Home'?'image':event.key==='End'?'video':tab.dataset.mediaMode==='image'?'video':'image',true)})}
window.addEventListener('phi:media:show-image',()=>select('image'));
window.PhiMediaStudio={select};select('image');
})();
