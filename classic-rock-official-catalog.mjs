/* Public, first-party catalog of artist/channel and merch landing pages.
 * Verified against official artist sites on 2026-11-03.
 * Each button opens the real YouTube artist channel. Do not pretend an album
 * is already playing on QuantaPhi or send buyers to unverified lookalike shops.
 * Source notes: pinkfloyd.com/store, reospeedwagon.com/music,
 * cheaptrick.com, journeymusic.com, styxworld.com.
 */
const origins = new Set([
 'www.youtube.com',
 'www.pinkfloyd.com','shop.pinkfloyd.com',
 'www.reospeedwagon.com',
 'store.cheaptrick.com','cheaptrick.tmstor.es',
 'journeymusic.com','styxworld.com'
]);
export function linkIsAllowed(raw){
 try {
  const u=new URL(raw);
  return u.protocol==='https:' && !u.username && !u.password && origins.has(u.hostname);
 } catch { return false }
}
export const CLASSIC_ROCK_BANDS = Object.freeze([
 Object.freeze({
  id:'pink-floyd',name:'Pink Floyd',feature:'Wish You Were Here · official recordings',
  youtube:'https://www.youtube.com/@pinkfloyd',
  offers:Object.freeze([
   {category:'Vinyl · CD · box sets',label:'Shop Pink Floyd albums',url:'https://www.pinkfloyd.com/store/'},
   {category:'Official apparel & releases',label:'Wish You Were Here 50 collection',url:'https://shop.pinkfloyd.com/collections/wish-you-were-here-50'}
  ])
 }),
 Object.freeze({
  id:'reo-speedwagon',name:'REO Speedwagon',feature:'Hi Infidelity · official recordings',
  youtube:'https://www.youtube.com/@REOSpeedwagon',
  offers:Object.freeze([
   {category:'Official album · buying information',label:'Hi Infidelity',url:'https://www.reospeedwagon.com/album/hi-infidelity/'},
   {category:'Artist discography',label:'Browse REO albums',url:'https://www.reospeedwagon.com/music/'}
  ])
 }),
 Object.freeze({
  id:'cheap-trick',name:'Cheap Trick',feature:'All Washed Up · official recordings',
  youtube:'https://www.youtube.com/@officialcheaptrick',
  offers:Object.freeze([
   {category:'Official CD · LP · digital · shirts',label:'Shop Cheap Trick releases',url:'https://store.cheaptrick.com/'},
   {category:'Artist-linked music collection',label:'Complete Epic Albums collection',url:'https://cheaptrick.tmstor.es/'}
  ])
 }),
 Object.freeze({
  id:'journey',name:'Journey',feature:'Escape · official recordings',
  youtube:'https://www.youtube.com/@journey',
  offers:Object.freeze([
   {category:'Official apparel · tour merchandise',label:'Shop Journey',url:'https://journeymusic.com/pages/store'},
   {category:'Band music · current releases',label:'Browse Journey albums',url:'https://journeymusic.com/'}
  ])
 }),
 Object.freeze({
  id:'styx',name:'Styx',feature:'Circling From Above · official recordings',
  youtube:'https://www.youtube.com/@styxtheband',
  offers:Object.freeze([
   {category:'Artist-operated CD · vinyl',label:'Shop Styx releases',url:'https://styxworld.com/collections/all'},
   {category:'Official album discography',label:'Browse Styx music',url:'https://styxworld.com/pages/music'}
  ])
 })
]);
