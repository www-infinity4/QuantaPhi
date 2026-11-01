import {mountCardActions} from './quanta-card-actions.mjs';
/* Independently source-checked destinations. No invented availability or financial operations. */
const photo=(file,credit,license)=>({file,credit,license,source:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file)});
const d=(id,name,location,official,summary,visitorNote,experience,actions,image)=>Object.freeze({id,name,location,official,summary,visitorNote,experience,actions:Object.freeze(actions),image});
export const MINERAL_DESTINATIONS=Object.freeze([
d('crater-of-diamonds','Crater of Diamonds State Park','209 State Park Road, Murfreesboro, AR 71958','https://www.arkansasstateparks.com/parks/crater-diamonds-state-park','Search a real volcanic diamond field and keep eligible gems you discover.','Public diamond search field; opening times change seasonally. Check park rules, admission and field conditions before visiting.','DIAMOND DIGGING · ARKANSAS',[{label:'Park & admission',url:'https://www.arkansasstateparks.com/parks/crater-diamonds-state-park'},{label:'How to search',url:'https://www.arkansasstateparks.com/parks/crater-diamonds-state-park/digging-for-diamonds/how-do-i-search-for-diamonds'}],photo('Crater of Diamonds State Park pano.jpg','HAL333','CC BY-SA 4.0')),
d('national-mining-hall-of-fame','National Mining Hall of Fame and Museum','120 W 9th Street, Leadville, CO 80461','https://mininghalloffame.org/museum/','Explore mine reconstructions, fluorescent minerals and historic extraction technology.','The museum runs year-round, but the separate Matchless Mine site is seasonal. Confirm ticket options and tour schedules.','MINE MUSEUM · LEADVILLE',[{label:'Museum & tickets',url:'https://mininghalloffame.org/museum/'},{label:'Hall of Fame',url:'https://mininghalloffame.org/'}],photo('Top of the Rockies - National Mining Hall of Fame and Museum - NARA - 7722442.jpg','Jenette Purdy / U.S. National Archives','Public domain')),
d('gem-mountain-montana','Gem Mountain Sapphire Mine','201 W Broadway, Philipsburg, MT 59858','https://gemmountainmt.com/visit-us-in-philipsburg','Wash Montana sapphire-bearing gravel at the downtown Philipsburg location.','The downtown storefront offers year-round gravel washing; the outdoor mine is seasonal. Check the operator for current dates and gravel supplies.','SAPPHIRE WASHING · MONTANA',[{label:'Downtown gem washing',url:'https://gemmountainmt.com/visit-us-in-philipsburg'},{label:'Seasonal mine visits',url:'https://gemmountainmt.com/plan-your-trip'}],null),
d('western-mining-museum','Western Museum of Mining & Industry','225 North Gate Boulevard, Colorado Springs, CO 80921','https://wmmi.org/plan-your-visit/','See a restored Corliss steam engine and other historic mining machinery demonstrated.','Machinery runs on scheduled tours and can be loud. Confirm tour times, admission and gold-panning availability.','WORKING MACHINERY · COLORADO',[{label:'Hours & tickets',url:'https://wmmi.org/plan-your-visit/'},{label:'Museum website',url:'https://wmmi.org/'}],photo('500 hp Corliss Steam Engine.jpg','Carl & Peggy Backes','CC BY-SA 2.0')),
d('last-chance-mine','Last Chance Mine','504 Last Chance Mine Road, Creede, CO 81130','https://lastchancemine.com/','Explore an 1891 silver mine, mineral specimens and mining history.','Mine tours and on-site collecting are seasonal and weather-dependent. Verify access and permitted collecting directly with the mine.','SILVER MINE · CREEDE',[{label:'Mine tours & details',url:'https://lastchancemine.com/'},{label:'Creede visitor info',url:'https://www.creede.com/biz/last-chance-mine'}],photo('Quartz-258682.jpg','Robert M. Lavinsky','CC BY-SA 3.0')),
d('mines-museum-earth-science','Mines Museum of Earth Science','1310 Maple Street, Golden, CO 80401','https://museum.mines.edu/','Explore Colorado minerals, meteorites and an Apollo 17 lunar sample.','Free admission. Regular posted hours are daily 10 a.m.–4 p.m.; check holiday closures and events.','EARTH SCIENCE · FREE MUSEUM',[{label:'Visit the free museum',url:'https://museum.mines.edu/'},{label:'Museum programs',url:'https://museum.mines.edu/'}],photo('Colorado School of Mines Geology Museum, Golden, Colorado, US.jpg','Clyde Charles Brown','CC BY-SA 4.0'))
]);
export function validMineralDestination(c){
 if(!c||!/^[a-z0-9-]+$/.test(c.id||'')||!c.name||!c.summary||!c.visitorNote||!c.location)return false;
 return [c.official,...(c.actions||[]).map(a=>a.url)].every(raw=>{try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port}catch{return false}})
 &&(c.actions||[]).every(a=>Boolean(a.label))
 &&(!c.image||Boolean(c.image.file&&c.image.credit&&c.image.license));
}
export const officialMapsUrl=c=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(c.location);
export const imageAltForMineralDestination=c=>c.id==='last-chance-mine'?'Quartz specimen photograph; not verified as originating at Last Chance Mine':c.name+' photograph';
const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node};
const link=(label,url,cls='')=>{const a=el('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='strict-origin-when-cross-origin';return a};
export function mountMineralDestination(c){
 if(!validMineralDestination(c))return null;
 const card=el('article','iqc-card mineral-destination-card');
 card.dataset.sourceId=c.id;card.dataset.sourceName=c.name;card.dataset.sourceReady='true';card.dataset.official=c.official;card.dataset.sourceCategory='Mines & minerals';card.dataset.sourceQuery=c.name;
 const hero=el('div','mineral-card-hero');
 if(c.image){
  const img=el('img','mineral-card-image');img.alt=imageAltForMineralDestination(c);
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>{img.remove();hero.classList.add('mineral-card-photo-missing')},{once:true});
  img.src='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(c.image.file)+'?width=1280';hero.append(img);
  const credit=el('p','mineral-card-photo-credit');credit.append(link('Photo: '+c.image.credit+' · '+c.image.license,c.image.source));
  if(c.image.license!=='Public domain')credit.append(' · Cropped for card display');hero.append(credit);
 }else hero.classList.add('mineral-card-photo-missing');
 hero.append(link('View original destination photos',c.official,'mineral-card-photo-fallback'));
 const body=el('div','mineral-card-body');
 body.append(el('p','iqc-kind',c.experience),el('h2','mineral-card-name',c.name),el('p','mineral-card-city',c.location),el('p','mineral-card-summary',c.summary));
 const actions=el('nav','mineral-card-links');actions.setAttribute('aria-label',c.name+' visit actions');
 for(const item of c.actions)actions.append(link(item.label,item.url,'mineral-card-link'));
 actions.append(link('Directions',officialMapsUrl(c),'mineral-card-link'));body.append(actions);
 const detail=el('details','mineral-card-visitor-guide');detail.append(el('summary','','Visitor information'),el('p','',c.visitorNote));body.append(detail);
 body.append(el('p','mineral-card-update','Sources reviewed November 2026 · Verify hours, tickets and access at the original destination.'));
 const shared=el('div','mineral-card-shared');
 mountCardActions(shared,{id:c.id,name:c.name,category:'Mines & minerals',official:c.official,featureUrl:c.official,route:'/?card='+c.id},{showSearch:false});
 body.append(shared);card.append(hero,body);return card;
}
function mount(){
 const bank=document.getElementById('premiumSourceCards');if(!bank)return;
 for(const c of MINERAL_DESTINATIONS){
  if(bank.querySelector('[data-source-id="'+c.id+'"]'))continue;
  const card=mountMineralDestination(c);if(card)bank.append(card);
 }
 window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
