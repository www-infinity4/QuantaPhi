/* Infinity Oracle Octaves: one original working card or authorized YouTube embed per lane.
 * Never clone a live widget; keep its event handlers and original DOM anchor.
 * Publisher videos play only through YouTube's own embed, on a user action. */
import {CURATED_VIDEOS,normalizeVideoCatalog,nextCardIndex} from './oracle-curated-catalog.mjs';

const h=(tag,cls,text)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;return el;
};
const createButton=(label,cls,action)=>{
 const button=h('button',cls,label);button.type='button';button.addEventListener('click',action);return button;
};
const safeText=value=>String(value||'').slice(0,220);
const videos=normalizeVideoCatalog(CURATED_VIDEOS);
const EXPERIMENTS=[
 {title:'Balloon Rocket',equipment:'Balloon, string, drinking straw, tape and two fixed supports.',
  steps:'Run the string through the straw and pull it taut. Tape an inflated balloon to the straw. Release the balloon and observe motion.',
  principle:'Air pushed backward produces an equal and opposite force on the balloon.',
  art:'A clear side-view physics demonstration of a balloon rocket sliding along a string, with straw, tape and supports visible.'},
 {title:'Floating Paper Clip',equipment:'Clear bowl of water, paper clip and small piece of tissue paper.',
  steps:'Lay tissue on the water, place a dry paper clip gently on top, and let the tissue sink away.',
  principle:'Surface tension can support a light object when the water surface is not broken.',
  art:'A close-up educational physics demonstration of a metal paper clip resting on water surface tension in a transparent bowl.'},
 {title:'Pendulum Motion',equipment:'String, a small soft weight, ruler and stable attachment point.',
  steps:'Suspend the weight securely. Pull it gently to one side and release without pushing. Compare short and long strings.',
  principle:'Gravity and string length influence a pendulum’s oscillation.',
  art:'A visually clear and safe pendulum experiment with string and a small soft weight, shown at several positions.'}
];
function buildPhysicsCard(root){
 root.classList.add('ioc-physics');const title=h('h3','','Physics Experiment Illustrator');
 const copy=h('p','','Choose an experiment, generate its picture with the real Oracle image renderer, and keep the procedure beside the artwork.');
 const select=h('select','ioc-select');select.setAttribute('aria-label','Select a physics experiment');
 EXPERIMENTS.forEach((row,i)=>{const o=h('option','',row.title);o.value=String(i);select.append(o)});
 const name=h('h4',''),tools=h('p',''),steps=h('p',''),principle=h('p','');
 const image=h('img','ioc-experiment-image');image.alt='Generated instructional illustration';image.hidden=true;
 const status=h('p','ioc-status','Select an experiment, then create its actual image.');status.setAttribute('role','status');
 const print=createButton('Create experiment image','ioc-primary',async()=>{
  if(print.disabled)return;
  const experiment=EXPERIMENTS[Number(select.value)||0];
  const renderer=window.PhiVisualRender;
  if(!renderer?.render){status.textContent='Image generation is unavailable. No experiment card was created.';return}
  print.disabled=true;image.hidden=true;image.removeAttribute('src');status.textContent='Creating experiment illustration from the real image renderer…';
  try{
   const description=experiment.art+' Equipment: '+experiment.equipment;
   const result=await renderer.render({description,mode:'Image',source:null,design:null,
    prompt:description+' Clean professional scientific instructional artwork, no text labels or invented measurements.',exactText:''});
   if(typeof result?.src!=='string'||!(/^(data:image\/|https:\/\/)/).test(result.src))throw Error('The image renderer did not return a usable picture.');
   image.src=result.src;image.hidden=false;
   status.textContent='Illustration created. Experiment instructions are shown beside the real image.';
  }catch(error){status.textContent='Image rendering failed; no finished illustration was claimed. '+safeText(error?.message)}
  finally{print.disabled=false}
 });
 function describe(){
  const row=EXPERIMENTS[Number(select.value)||0];
  name.textContent=row.title;tools.textContent='Materials: '+row.equipment;
  steps.textContent='Method: '+row.steps;principle.textContent='Why it works: '+row.principle;
  image.hidden=true;image.removeAttribute('src');status.textContent='Create the image for '+row.title+'.';
 }
 select.addEventListener('change',describe);
 root.append(title,copy,select,name,tools,steps,principle,print,image,status);describe();
}
function buildRealm(root){
 const scenes=[
  {title:'The Lost Observatory',text:'Beyond the bronze door, a dormant observatory faces two paths. Where do you explore?',choices:[['Enter the starlit library',1],['Follow the river below',2]]},
  {title:'The Starlit Library',text:'You find a celestial map and an old lens. What will you do?',choices:[['Restore the telescope',3],['Return to the crossroads',0]]},
  {title:'The Hidden River',text:'Water flows toward a bright cavern beneath the observatory.',choices:[['Follow the sound',4],['Return to the crossroads',0]]},
  {title:'A New Constellation',text:'The repaired telescope reveals a star map that no one has seen for centuries. You win this realm.',choices:[['Play again',0]]},
  {title:'The Sunken Archive',text:'You find records of forgotten voyages and a door back to the daylight. You win this realm.',choices:[['Play again',0]]}
 ];
 const heading=h('h3','','Oracle Realms · Play a Story'),text=h('p',''),buttons=h('div','ioc-realm-choices');
 root.classList.add('ioc-realm');root.append(heading,text,buttons);
 function show(i){const scene=scenes[i];heading.textContent=scene.title;text.textContent=scene.text;buttons.replaceChildren();
  scene.choices.forEach(([label,to])=>buttons.append(createButton(label,'ioc-secondary',()=>show(to))))}
 show(0);
}
function videoCard(video){
 const card=h('article','ioc-video'),hero=h('div','ioc-video-hero'),image=h('img','ioc-poster');
 image.src='https://i.ytimg.com/vi/'+video.id+'/hqdefault.jpg';image.alt='YouTube source thumbnail: '+video.title;
 image.loading='lazy';image.decoding='async';
 image.addEventListener('error',()=>{image.remove();hero.append(h('p','ioc-status','Publisher image unavailable. The video can still be tried.'))},{once:true});
 const title=h('h3','',video.title),credit=h('p','ioc-source',video.publisher+' · Publisher-posted selection'),note=h('p','',video.note);
 const status=h('p','ioc-status','Select Play to watch in this card. Video embedding may be restricted by the publisher.');
 const source=h('a','ioc-source-link','View original YouTube video');source.href=video.sourceUrl;
 source.target='_blank';source.rel='noopener noreferrer';
 const play=createButton('Play in this card','ioc-primary',()=>{
  hero.replaceChildren();
  const frame=h('iframe','ioc-player');frame.title=video.title+' · YouTube player';
  frame.src='https://www.youtube-nocookie.com/embed/'+video.id+'?autoplay=1&rel=0';
  frame.setAttribute('allow','accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share');
  frame.setAttribute('allowfullscreen','');frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='eager';
  hero.append(frame);play.hidden=true;status.textContent='Using YouTube’s embedded player. If YouTube says playback is unavailable, see the official source link.';
 });
 hero.append(image);card.append(hero,title,credit,note,play,status,source);
 return card;
}
const groupDefinitions=[
 {id:'creative',title:'Oracle Creator Studio',description:'One image prompt and Print Image. The original Story Writer is next, with its complete writing and illustration tools.',items:[
  {id:'phiMediaBuilder',title:'Image Printer · Original Generator'},{id:'phiStoryWriter',title:'Story Writer · Original Stories'}]},
 {id:'realms',title:'Physics · Stories · Realms · Games',description:'Illustrated experiments, original story reading, and playable story realms. Each selected card works inside this viewer.',items:[
  {id:'physicsOracleCard',title:'Physics · Generate a Picture'},{id:'infiniteBook',title:'Read a Story'},
  {id:'groupStoryBuild',title:'Build a Group Story'},{id:'oracleRealmGame',title:'Play Oracle Realms'}]},
 {id:'cartoons',title:'Classic Cartoons · 80s & 90s',description:'Publisher-posted classic episodes only, in a single inline YouTube player.',items:videos.filter(v=>v.category==='cartoons')},
 {id:'documentaries',title:'Full Documentary Films',description:'Water, history, discoveries and science. Selected full-length publisher videos, never trailers passed off as full films.',items:videos.filter(v=>v.category==='documentaries')},
 {id:'shows',title:'Pawn Stars · Bourdain · World TV',description:'Full episodes from recognized publishers, with international travel and food preferred.',items:videos.filter(v=>v.category==='shows')},
 {id:'adult',title:'Optional 21+ Directory',description:'Adult-only dispensary directory, intentionally outside Public and the regular shopping carousels.',items:[
  {id:'cannabisDirectoryCard',title:'National dispensary directory'},
  {id:'bruceBannerWeedmapsCard',title:'Bruce Banner · publisher source'},
  ...['livwell-colorado','livwell-central','native-roots-speer','native-roots-highlands','fired-sixth','fired-alameda',
   'fired-cherry','lightshade-evans','lightshade-dayton','star-buds-lakeside','green-solution-wewatta','maikoh-broadway'].map(id=>({id:'dispensary-'+id,title:'Independent dispensary listing'}))
 ]}
];
function mountLane(parent,definition){
 const section=h('section','ioc-lane');section.id='ioc-'+definition.id;section.setAttribute('aria-roledescription','carousel');
 section.setAttribute('aria-label',definition.title);
 const intro=h('header','ioc-intro');intro.append(h('p','ioc-kicker','INFINITY® · ORACLE OCTAVES'),h('h2','',definition.title),h('p','',definition.description));
 const nav=h('div','ioc-nav'),stage=h('div','ioc-stage'),status=h('p','ioc-count');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 let index=0,marker=null,selected=null,unlocked=definition.id!=='adult';
 function restore(){
  if(selected){document.dispatchEvent(new CustomEvent('oracle:card-deactivated',{detail:{id:selected.id}}));
   if(marker?.parentNode)marker.parentNode.insertBefore(selected,marker);
   marker?.remove();selected=null;marker=null;}
  stage.replaceChildren();
 }
 function show(){
  if(!unlocked)return;
  restore();
  const item=definition.items[index];if(!item){stage.append(h('p','','No reviewed cards available.'));return}
  if(item.id){
   const node=document.getElementById(item.id);
   if(!node){stage.append(h('p','ioc-status','This original card has not loaded yet.'));return}
   marker=document.createComment('Oracle Octaves original card return point: '+item.id);
   node.parentNode.insertBefore(marker,node);stage.append(node);selected=node;
   node.dispatchEvent(new Event('oracle:activate'));
  }else stage.append(videoCard(item));
  status.textContent=(index+1)+' / '+definition.items.length+' · '+(item.title||item.publisher||'Original card');
 }
 const previous=createButton('‹','ioc-arrow',()=>{index=nextCardIndex(index,-1,definition.items.length);show()});
 const next=createButton('›','ioc-arrow',()=>{index=nextCardIndex(index,1,definition.items.length);show()});
 previous.setAttribute('aria-label','Previous '+definition.title+' card');
 next.setAttribute('aria-label','Next '+definition.title+' card');
 nav.append(previous,status,next);
 section.append(intro,nav);
 if(definition.id==='adult'){
  const gate=h('div','ioc-gate');
  const enter=createButton('I am 21+ · View carousel','ioc-primary',()=>{
   unlocked=true;gate.hidden=true;stage.hidden=false;
   document.dispatchEvent(new Event('oracle:adult-acknowledged'));show();
  });
  const close=createButton('Hide 21+ carousel','ioc-secondary',()=>{
   restore();unlocked=false;stage.hidden=true;gate.hidden=false;
   document.dispatchEvent(new Event('oracle:adult-hidden'));status.textContent='21+ content hidden';
  });
  gate.append(h('p','','Only open this optional section if you are at least 21. This button is not legal age verification.'),enter);
  intro.append(close);stage.hidden=true;section.append(gate);status.textContent='21+ content hidden';
 }
 section.append(stage);
 parent.append(section);
 if(unlocked)show();
 let touchStart=0;
 stage.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0]?.screenX||0},{passive:true});
 stage.addEventListener('touchend',event=>{
  const distance=(event.changedTouches[0]?.screenX||0)-touchStart;
  if(Math.abs(distance)<70||!unlocked||event.target.closest('textarea,input,iframe,button,a,[contenteditable]'))return;
  index=nextCardIndex(index,distance<0?1:-1,definition.items.length);show();
 },{passive:true});
 section.addEventListener('keydown',e=>{
  if(e.target.matches('textarea,input,select,[contenteditable]'))return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();index=nextCardIndex(index,e.key==='ArrowRight'?1:-1,definition.items.length);show();
  }
 });
 return {refresh:()=>{if(unlocked&&!selected)show()},append:item=>{
  if(definition.items.some(row=>row.id===item.id))return;
  definition.items.push(item);if(unlocked&&definition.items.length===1)show();
 }};
}
function mount(){
 const parent=document.getElementById('oracleExperienceLanes');
 if(!parent||parent.dataset.mounted)return;parent.dataset.mounted='true';
 buildPhysicsCard(document.getElementById('physicsOracleCard'));
 buildRealm(document.getElementById('oracleRealmGame'));
 const refs=new Map();
 for(const group of groupDefinitions)refs.set(group.id,mountLane(parent,group));
 const adult=refs.get('adult');
 const addDirectory=()=>{
  for(const node of document.querySelectorAll('#cannabisDirectoryCards [data-directory-store-id]')){
   if(!node.id)continue;
   adult.append({id:node.id,title:node.dataset.directoryStoreName||'Independent dispensary'});
  }
 };
 addDirectory();window.addEventListener('quantaphi:directory-cards-ready',addDirectory);
}
if(document.readyState==='complete')mount();else window.addEventListener('load',mount,{once:true});
