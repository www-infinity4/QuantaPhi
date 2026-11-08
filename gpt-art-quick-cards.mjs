/* Original artwork articles mount in QuantaPhi's existing Oracle viewer.
 * A draft, unhosted or unapproved image is never a public Quick Card. */
import {GPT_ART_CARDS,eligibleArtCards} from './gpt-art-catalog.mjs';
import {mountCardTools} from './quanta-card-experience.mjs';
const host=document.getElementById('gptArtworkQuickCards');
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
export async function mountArtworkCards(root=host,cards=GPT_ART_CARDS){
 if(!root)return 0;
 let count=0;
 for(const card of eligibleArtCards(cards)){
  if(root.querySelector(`[data-source-id="${card.id}"]`))continue;
  const image=new Image();image.decoding='async';image.alt=card.title;
  try{image.src=card.imagePath;await image.decode();if(image.naturalWidth<100)continue;}catch{continue;}
  const node=make('article','iqc-card gpt-art-quick-card');
  node.dataset.sourceId=card.id;node.dataset.sourceName=card.title;
  node.dataset.sourceReady='true';node.dataset.sourceCategory=card.collection==='fantasy'?'Fantasy Artwork':'GPT Artwork';
  node.dataset.official=location.origin+'/';
  node.append(make('p','iqc-kind',card.collection==='fantasy'?'FANTASY ART · UNOFFICIAL FAN CONCEPT':'GPT ARTWORK · CREATOR SHOWCASE'));
  const picture=make('div','gpt-art-frame');picture.append(image);node.append(picture);
  node.append(make('h3','gpt-art-title',card.title));
  node.append(make('p','iqc-description',card.description));
  const controls=make('div','iqc-inline-tools');
  mountCardTools(controls,{id:card.id,name:card.title,kind:'Art',official:location.origin+'/',feature:'Explore original artwork'});
  node.append(controls);
  const action=make('a','gpt-art-create','Create an image in Oracle Octaves');
  action.href='/?card=phiMediaBuilder';node.append(action);
  node.append(make('small','gpt-art-disclosure','Independent creator showcase · no paid placement or official brand endorsement.'));
  root.append(node);count++;
 }
 if(count){root.hidden=true;window.dispatchEvent(new Event('quantaphi:source-cards-ready'));}
 return count;
}
if(host)void mountArtworkCards();
