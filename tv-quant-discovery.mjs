/* Additional TV choices are source-authentic. CNN/CNBC are provider/subscription
 * handoffs, not playable third-party iframes or unauthorized channel streams.
 * Actual in-card movie playback uses the EXISTING vetted PhiTVPrograms ids.
 * Quant interests come from a signed-in read only AFTER an explicit opt-in. */
export const quantTvConsentKey='quantaphi:tv:quant-recommendations:v1';
/* Standalone Oracle cards use individual publisher-uploaded YouTube videos.
 * This is not an unauthorized copy of a paywalled live television feed.
 * Embed availability is controlled by the original publisher. */
export const TV_EXPANSION_CHANNELS=Object.freeze([
 {id:'cnn',name:'CNN',category:'News',mode:'official-video',url:'https://www.cnn.com/',
  videoId:'_fLyisCUrQE',videoTitle:'CNN · Texas races and election analysis',
  poster:'https://i.ytimg.com/vi/_fLyisCUrQE/hqdefault.jpg',
  access:'Live CNN requires an All Access subscription or supported TV provider. This is an official public news clip.',
  description:'News reporting from CNN’s own video channel, inside this Quick Card. Not a live channel.'},
 {id:'cnbc',name:'CNBC',category:'Business news',mode:'official-video',url:'https://www.cnbc.com/live-tv/',
  videoId:'gvAkhbw620o',videoTitle:'CNBC Television · AI investment and energy costs',
  poster:'https://i.ytimg.com/vi/gvAkhbw620o/hqdefault.jpg',
  access:'Live CNBC may require CNBC+ or a supported TV provider. This is an official public business-news clip.',
  description:'Market and business reporting from CNBC Television’s video channel, played in this card. Not live television.'},
 {id:'nasa-plus',name:'NASA+',category:'Science',mode:'official-video',url:'https://plus.nasa.gov/',
  videoId:'uSMGENDH_QI',videoTitle:'NASA · Cosmic Dawn: James Webb Space Telescope',
  poster:'https://i.ytimg.com/vi/uSMGENDH_QI/hqdefault.jpg',
  access:'Free public NASA documentary clip. Live NASA+ is a separate official service.',
  description:'NASA science and exploration, with the official source video playing in this card.'},
 {id:'pbs-nova',name:'PBS NOVA',category:'Science documentaries',mode:'official-video',url:'https://www.pbs.org/show/nova/',
  videoId:'t06aTX9jM34',videoTitle:'NOVA PBS · Decoding the Universe: Quantum',
  poster:'https://i.ytimg.com/vi/t06aTX9jM34/hqdefault.jpg',
  access:'Public NOVA PBS official documentary; PBS Passport may be needed for other programs.',
  description:'Physics, science and original NOVA documentary video inside the card.'},
 {id:'pbs-history',name:'PBS American Experience',category:'History documentaries',mode:'official-video',url:'https://www.pbs.org/show/american-experience/',
  videoId:'EZyGL-BF-n8',videoTitle:'American Experience PBS · Season 34 preview',
  poster:'https://i.ytimg.com/vi/EZyGL-BF-n8/hqdefault.jpg',
  access:'Public official PBS preview; some full episodes require PBS Passport or regional access.',
  description:'Explore documentary history through American Experience official source video.'}
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
