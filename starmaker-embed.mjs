import {mountCardTools} from './quanta-card-experience.mjs?v=20261027-karaoke1';
import {STARMAKER_EMBED_URL,STARMAKER_EMBED_HTML} from './starmaker-quick-card.mjs';
const card=Object.freeze({id:'starmaker',name:'StarMaker',kind:'Karaoke · Singing',feature:'Find a song and sing karaoke',official:'https://www.starmakerstudios.com/en/songs',featureUrl:'https://www.starmakerstudios.com/en/songs'});
mountCardTools(document.getElementById('starmakerLive'),card);
const url=STARMAKER_EMBED_URL;
const snippet=STARMAKER_EMBED_HTML;
const code=document.getElementById('smEmbedCode'),status=document.getElementById('smShareStatus');
code.value=snippet;
async function copyValue(value){
 if(navigator.clipboard?.writeText)try{await navigator.clipboard.writeText(value);return true;}catch{}
 code.focus();code.select();try{return document.execCommand('copy');}catch{return false;}
}
document.getElementById('smCopyEmbed').addEventListener('click',async()=>{
 const ok=await copyValue(snippet);
 status.textContent=ok?'Website embed HTML copied. Paste it into an HTML block on the destination website.':'Select the snippet and copy it manually. The host site must permit iframe embedding.';
});
document.getElementById('smShareCard').addEventListener('click',async()=>{
 try{
  if(navigator.share){await navigator.share({title:'Try the StarMaker × QuantaPhi Quick Card',text:'Try this interactive karaoke discovery card, then embed it on your site.',url});status.textContent='System share sheet opened.';return;}
 }catch(e){if(e?.name==='AbortError'){status.textContent='Share cancelled.';return;}}
 const ok=await copyValue(url);
 status.textContent=ok?'Card link copied. Add this link to emails or messages.':'Copy this card link: '+url;
});
