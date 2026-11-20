import {FAMILY_TV_SOURCE,fetchFamilyEpisodes} from './family-parenting-tv-core.mjs';
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const btn=(label,action)=>{const b=el('button','qcx-button',label);b.type='button';b.addEventListener('click',action);return b};
let activePlayer=null;
function stopPlayer(){if(activePlayer){activePlayer.remove();activePlayer=null;}}
export function mountFamilyParentingTvCard(root,card){
 if(card?.id!==FAMILY_TV_SOURCE.id)return false;
 const panel=el('section','qcx-tool qcx-family-tv');
 const title=el('h3','','Family & Parenting TV');
 panel.append(title,el('p','qcx-note','Family education · Daycare providers · Professional childcare resources. No 21+ material or paid advertising.'),
  el('p','qcx-note','Videos stay with their publishers. This independent index does not copy or own the videos.'));
 const status=el('p','qcx-note','Loading Cloudflare catalog…');status.setAttribute('role','status');
 const controls=el('div','qcx-family-controls');const search=el('input','qcx-input');
 search.type='search';search.maxLength=120;search.placeholder='Search verified video titles';
 search.setAttribute('aria-label','Search Family and Parenting TV episodes');
 const picker=el('select','qcx-input');picker.setAttribute('aria-label','Choose family education episode');
 controls.append(search,picker);
 const actions=el('div','qcx-controls'),contents=el('div','qcx-family-selected');
 panel.append(status,controls,actions,contents);root.append(panel);
 let videos=[],selected='';
 const selectRows=()=>videos.filter(v=>[v.title,v.publisher,v.topic].join(' ').toLowerCase().includes(search.value.trim().toLowerCase()));
 function paint(){
  stopPlayer();const rows=selectRows();
  if(!rows.some(v=>v.videoId===selected))selected=rows[0]?.videoId||'';
  picker.replaceChildren(...rows.map(v=>{const o=el('option','',v.title+' · '+v.publisher);o.value=v.videoId;return o;}));
  picker.value=selected;picker.disabled=!rows.length;
  contents.replaceChildren();actions.replaceChildren();
  const item=rows.find(v=>v.videoId===selected);
  status.dataset.matches=String(rows.length);
  if(!item){status.textContent='No indexed videos match this search.';return;}
  status.textContent=(rows.findIndex(v=>v.videoId===selected)+1)+' of '+rows.length+' matching indexed videos · nonsexual family education';
  const image=el('img','qcx-family-thumbnail');image.alt='YouTube original thumbnail: '+item.title;
  image.src=item.thumbnail;image.loading='lazy';image.decoding='async';
  image.addEventListener('error',()=>image.remove(),{once:true});
  const heading=el('h4','',item.title),byline=el('p','qcx-note',item.publisher+' · original YouTube source · exact publication date unverified');
  const source=el('a','qcx-link','Read original on YouTube ↗');source.href=item.sourceUrl;
  source.target='_blank';source.rel='noopener noreferrer';
  const player=el('div','qcx-player');
  const play=btn('Play original in card',()=>{
   stopPlayer();player.replaceChildren();
   const frame=el('iframe','qcx-video');frame.title=item.title+' · YouTube player';
   frame.src='https://www.youtube-nocookie.com/embed/'+item.videoId;
   frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
   frame.allow='encrypted-media; picture-in-picture; web-share';frame.allowFullscreen=true;
   player.append(frame);activePlayer=frame;stop.hidden=false;
  });
  const stop=btn('Stop playback',()=>{stopPlayer();player.replaceChildren();stop.hidden=true;});
  stop.hidden=true;actions.append(source,play,stop);
  contents.append(image,heading,byline,player,
   el('p','qcx-note','Playback loads only when requested. If embedding is unavailable, use the original YouTube link.'));
 }
 search.addEventListener('input',paint);
 picker.addEventListener('change',()=>{selected=picker.value;paint();});
 void fetchFamilyEpisodes().then(result=>{
  videos=result.videos;
  const note=el('p','qcx-note',result.source==='cloudflare-d1'?
   'Cloudflare D1 read-only database · '+videos.length+' verified original video records · partial collection':
   'Cloudflare feed unavailable · showing '+videos.length+' previously reviewed cached videos');
  panel.insertBefore(note,status);paint();
 });
 return true;
}
