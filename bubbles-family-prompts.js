/* Family Bubbles suggested questions — UI-only add-on.
 * Never modifies shared Bubbles JS, memory, provider requests, wallet or audio.
 * Gate by explicit embed, theme AND unique family chat ID.
 * Buttons fill the existing composer, but never submit or start a microphone.
 */
(function(){
 'use strict';
 const args=new URLSearchParams(location.search);
 if(args.get('embed')!=='1'||args.get('theme')!=='family-modern'||args.get('id')!=='gary-westerns-2026')return;
 let observer=null;
 let timeoutId=null;
 function mount(){
   const panel=document.querySelector('.ba-panel');
   const composer=panel?.querySelector('.ba-composer');
   const input=composer?.querySelector('textarea[aria-label="Message Bubbles"]');
   const before=panel?.querySelector('.ba-program');
   if(!panel||!composer||!input||!before)return false;
   if(panel.querySelector('.ba-family-suggestions'))return true;
   const nav=document.createElement('nav');
   nav.className='ba-family-suggestions';
   nav.setAttribute('aria-label','Suggested questions to ask Bubbles');
   const prompts=[
     ['📺 TV tonight','What can we watch on TV tonight?'],
     ['☀️ Iowa weather','What is the Iowa forecast this week?'],
     ['🎬 Westerns','Can you recommend a good Western movie?'],
     ['🍔 Food deals',"What deals should we check at Hardee's, McDonald's and Wendy's?"]
   ];
   for(const [label,message] of prompts){
     const button=document.createElement('button');
     button.type='button';
     button.className='ba-family-prompt';
     button.textContent=label;
     button.setAttribute('aria-label','Ask Bubbles: '+message);
     button.addEventListener('click',()=>{
       input.value=message;
       input.dispatchEvent(new Event('input',{bubbles:true}));
       input.focus();
     });
     nav.append(button);
   }
   panel.insertBefore(nav,before);
   observer?.disconnect();
   if(timeoutId!==null)clearTimeout(timeoutId);
   return true;
 }
 function start(){
   if(mount())return;
   if(typeof MutationObserver!=='function')return;
   observer=new MutationObserver(()=>{if(mount())observer?.disconnect()});
   observer.observe(document.body,{childList:true,subtree:true});
   timeoutId=setTimeout(()=>observer?.disconnect(),12000);
 }
 if(document.body)start();
 else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
