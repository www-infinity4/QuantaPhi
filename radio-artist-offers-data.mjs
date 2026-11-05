/* Verified first-party artist catalog for compact Infinity Radio product offers.
 * Entries are discovery links, not paid ads, licenses, prices or inventory.
 * Apple album data is displayed only when a matching provider result is returned.
 */
const officialHosts=new Set([
 'www.stevemillerband.com','stevemillerband.com',
 'www.pinkfloyd.com','shop.pinkfloyd.com',
 'www.reospeedwagon.com',
 'store.cheaptrick.com','cheaptrick.tmstor.es',
 'journeymusic.com','styxworld.com'
]);
export function officialUrlAllowed(raw){
 try{
  const u=new URL(raw);
  return u.protocol==='https:'&&!u.username&&!u.password&&officialHosts.has(u.hostname);
 }catch{return false}
}
export const ARTIST_OFFERS=Object.freeze([
 {id:'steve-miller',artist:'Steve Miller Band',album:'Book of Dreams',
  albumUrl:'https://www.stevemillerband.com/releases-archive/book-dreams/',
  merchUrl:'https://www.stevemillerband.com/'},
 {id:'pink-floyd',artist:'Pink Floyd',album:'Wish You Were Here',
  albumUrl:'https://www.pinkfloyd.com/albums/wish-you-were-here-50/',
  merchUrl:'https://www.pinkfloyd.com/store/'},
 {id:'reo-speedwagon',artist:'REO Speedwagon',album:'Hi Infidelity',
  albumUrl:'https://www.reospeedwagon.com/album/hi-infidelity/',
  merchUrl:'https://www.reospeedwagon.com/music/'},
 {id:'cheap-trick',artist:'Cheap Trick',album:'All Washed Up',
  albumUrl:'https://store.cheaptrick.com/',
  merchUrl:'https://store.cheaptrick.com/'},
 {id:'journey',artist:'Journey',album:'Escape',
  albumUrl:'https://journeymusic.com/',
  merchUrl:'https://journeymusic.com/pages/store'},
 {id:'styx',artist:'Styx',album:'Circling From Above',
  albumUrl:'https://styxworld.com/pages/music',
  merchUrl:'https://styxworld.com/collections/all'}
].map(Object.freeze));
const normalize=value=>String(value||'').toLowerCase()
 .replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim();
function appleUrlAllowed(raw){
 try{
  const url=new URL(raw);
  return url.protocol==='https:'&&!url.username&&!url.password&&
    (url.hostname==='itunes.apple.com'||url.hostname==='music.apple.com');
 }catch{return false}
}
function appleArtAllowed(raw){
 try{
  const url=new URL(raw);
  return url.protocol==='https:'&&!url.username&&!url.password&&
   /^(?:is[0-9]+-ssl|is[0-9]+)\.mzstatic\.com$/.test(url.hostname);
 }catch{return false}
}
export function appleAlbumForArtist(offer,albums){
 if(!offer||!Array.isArray(albums))return null;
 const expectedArtist=normalize(offer.artist),expectedAlbum=normalize(offer.album);
 return albums.find(item=>
  item?.wrapperType==='collection'&&item.collectionType==='Album'&&
  normalize(item.artistName)===expectedArtist&&
  normalize(item.collectionName).includes(expectedAlbum)&&
  appleUrlAllowed(item.collectionViewUrl)&&appleArtAllowed(item.artworkUrl100))||null;
}
