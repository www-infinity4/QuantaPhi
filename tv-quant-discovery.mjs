/* Additional TV choices are source-authentic. CNN/CNBC are provider/subscription
 * handoffs, not playable third-party iframes or unauthorized channel streams.
 * Actual in-card movie playback uses the EXISTING vetted PhiTVPrograms ids.
 * Quant interests come from a signed-in read only AFTER an explicit opt-in. */
export const quantTvConsentKey='quantaphi:tv:quant-recommendations:v1';
export const TV_EXPANSION_CHANNELS=Object.freeze([
 {id:'cnn',name:'CNN',category:'News',mode:'official-link',url:'https://www.cnn.com/',
  poster:'https://www.google.com/s2/favicons?domain=cnn.com&sz=128',
  access:'CNN All Access subscription or supported TV provider required for full live channels.',
  description:'Watch CNN news and original films with your own valid subscription or TV provider. Choose Watch at CNN.'},
 {id:'cnbc',name:'CNBC',category:'Business news',mode:'official-link',url:'https://www.cnbc.com/live-tv/',
  poster:'https://www.google.com/s2/favicons?domain=cnbc.com&sz=128',
  access:'CNBC+, CNBC Pro or supported TV provider subscription may be required.',
  description:'Open the original CNBC livestream player. Public clips may be available without a subscription.'},
 {id:'nasa-plus',name:'NASA+',category:'Science',mode:'official-link',url:'https://plus.nasa.gov/',
  poster:'https://www.google.com/s2/favicons?domain=nasa.gov&sz=128',
  access:'Free official NASA live coverage, science documentaries and series.',
  description:'Watch NASA missions, science films and original documentary programs on the official NASA+ service.'},
 {id:'pbs-nova',name:'PBS NOVA',category:'Science documentaries',mode:'official-link',url:'https://www.pbs.org/show/nova/',
  poster:'https://www.google.com/s2/favicons?domain=pbs.org&sz=128',
  access:'Public PBS clips and eligible episodes; some full programs may require PBS Passport.',
  description:'Discover physics, inventions, astronomy and nature documentaries through the original NOVA player.'},
 {id:'pbs-history',name:'PBS American Experience',category:'History documentaries',mode:'official-link',url:'https://www.pbs.org/show/american-experience/',
  poster:'https://www.google.com/s2/favicons?domain=pbs.org&sz=128',
  access:'PBS video availability varies by episode, region and Passport status.',
  description:'Watch history documentary episodes and clips through the official PBS website or app.'}
]);
const finite=(x,cap=100)=>Number.isFinite(Number(x))?Math.max(0,Math.min(cap,Number(x))):0;
const sciences=/(?:science|space|nasa|webb|physics|astrophys|cosmos|cosmic|astronomy|satellite|moon|planet|quantum|technology)/i;
const mystery=/(?:mystery|suspense|horror|chiller|twilight|detective|hitchcock|thriller)/i;
const oldMovie=/(?:starquest|classic|vintage|nostalgia|old.movie|cinema|historic|film|movie)/i;
export const QUANT_TV_TOPICS=Object.freeze([
 {id:'science',name:'Science, space, physics, NASA, exploration',category:'Science',feature:'Astrophysics astronomy quantum technology Moon planets and satellite discoveries',study:'Science films and spacecraft'},
 {id:'space',name:'Space travel and science fiction',category:'Science fiction',feature:'Astronomy rockets planets and NASA space exploration',study:'Old space movies and adventures'},
 {id:'suspense',name:'Suspense mystery horror and thrillers',category:'Mystery',feature:'Twilight Zone Alfred Hitchcock detective suspense thriller',study:'Suspense cinema'},
 {id:'classic',name:'Classic vintage movies',category:'Movies',feature:'History of cinema and nostalgic movie classics',study:'Classic movies'}
]);
export function movieContextFromSignals(raw={}){
 const signal=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const result={science:0,suspense:0,classic:0};
 const keys=new Set((Array.isArray(signal.following)?signal.following:[]).slice(0,250).filter(x=>typeof x==='string'));
 for(const [key,count] of Object.entries(signal.counts||{}).slice(0,250))if(finite(count)>0)keys.add(key);
 for(const key of keys){
  if(sciences.test(key))result.science=Math.min(100,result.science+12);
  if(mystery.test(key))result.suspense=Math.min(100,result.suspense+12);
  if(oldMovie.test(key))result.classic=Math.min(100,result.classic+8);
 }
 for(const [key,score] of Object.entries(signal.quantScores||{}).slice(0,80)){
  if(sciences.test(key))result.science=Math.min(100,result.science+finite(score));
  if(mystery.test(key))result.suspense=Math.min(100,result.suspense+finite(score));
  if(oldMovie.test(key))result.classic=Math.min(100,result.classic+finite(score));
 }
 return result;
}
/* NASA's VERIFIED official YouTube uploads, publicly available without rehosting.
 * Publisher still controls whether an individual embed can play. */
export const NASA_MOVIES=Object.freeze([
 {title:'Cosmic Dawn · James Webb Space Telescope (NASA documentary)',videoId:'uSMGENDH_QI',year:'2025',source:'NASA',category:'science'},
 {title:'Moonbound Episode 1 · Charting the Course (NASA)',videoId:'bfw4G59j9uw',year:'2026',source:'NASA',category:'science'},
 {title:'Moonbound Episode 2 · For All Humanity (NASA)',videoId:'ttiLcMUQq80',year:'2026',source:'NASA',category:'science'}
]);
const SCIENCE_FILMS=new Set(['MqaN40sbap4','22cOGjikPG8','duc_edJQaxU','SN8R3k73qj0','PkSlAmx_wnk']);
export function rankMoviePrograms(catalog,signals={}){
 const science=finite(signals.science),suspense=finite(signals.suspense),classic=finite(signals.classic);
 const source=[...(Array.isArray(catalog?.STARQUEST)?catalog.STARQUEST:[]),...(Array.isArray(catalog?.CHILLER)?catalog.CHILLER:[]),...NASA_MOVIES];
 const entries=source.filter(row=>typeof catalog?.valid==='function'&&catalog.valid(row.videoId));
 const rank=row=>{
  const isMystery=Array.isArray(catalog.CHILLER)&&catalog.CHILLER.some(x=>x.videoId===row.videoId);
  return (isMystery?suspense*2:classic)+(row.source==='NASA'?science*3:!isMystery&&SCIENCE_FILMS.has(row.videoId)?science*2:0);
 };
 return entries.map((row,index)=>({row,index,score:rank(row)})).sort((a,b)=>b.score-a.score||a.index-b.index)
  .map(x=>({...x.row,channel:'movies',start:0,poster:'https://i.ytimg.com/vi/'+x.row.videoId+'/hqdefault.jpg'}));
}
