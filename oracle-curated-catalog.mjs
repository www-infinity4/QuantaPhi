/* Infinity Oracle curated media: source-reviewed YouTube embeds only.
 * These are editorial examples, not real-time trends or guarantees of embed availability.
 * Additions must be checked at the publisher's source and versioned in this repository. */
export const CURATED_VIDEOS=Object.freeze([
 {id:'NDPglzwQclU',category:'cartoons',title:'G.I. Joe · The Complete First Season',publisher:'Hasbro Pulse',sourceType:'publisher',reviewed:true,sourceUrl:'https://www.youtube.com/watch?v=NDPglzwQclU',note:'Official publisher season stream; playback availability can change'},
 {id:'Sjs93KJAfyE',category:'cartoons',title:'The Smurfs · Classic Full-Episode Collection',publisher:'The Smurfs · Official Channel',sourceType:'publisher',reviewed:true,sourceUrl:'https://www.youtube.com/watch?v=Sjs93KJAfyE',note:'Official remastered episodes; live-stream availability can change'},
 {id:'E1_wK0BbBis',category:'documentaries',title:'The Mystery of Water · Nature’s Strangest Liquid',publisher:'Free Documentary · Ocean',sourceType:'publisher',reviewed:true,sourceUrl:'https://www.youtube.com/watch?v=E1_wK0BbBis',note:'Full documentary · science and water'},
 {id:'4UJ22jvzG7A',category:'documentaries',title:'Beyond Myth · The Atlantis Enigma',publisher:'Get.factual',sourceType:'publisher',reviewed:true,sourceUrl:'https://www.youtube.com/watch?v=4UJ22jvzG7A',note:'Full history documentary; distinguish interpretation from established evidence'},
 {id:'DmEmIBOvNsU',category:'shows',title:'Anthony Bourdain · Vietnam · Parts Unknown',publisher:'Anthony Bourdain Parts Unknown',sourceType:'publisher',reviewed:true,sourceUrl:'https://www.youtube.com/watch?v=DmEmIBOvNsU',note:'Official full episode · international food and travel'},
 {id:'_nlMKcjXPbk',category:'shows',title:'Pawn Stars · Pawn of Fire · S12 E1',publisher:'HISTORY',sourceType:'publisher',reviewed:true,sourceUrl:'https://www.youtube.com/watch?v=_nlMKcjXPbk',note:'Official full episode'}
]);
const CATEGORIES=new Set(['cartoons','documentaries','shows']);
export function normalizeVideoCatalog(items){
 if(!Array.isArray(items))return [];
 const seen=new Set(),result=[];
 for(const item of items.slice(0,300)){
  if(!item||item.reviewed!==true||!CATEGORIES.has(item.category))continue;
  if(typeof item.id!=='string'||!(/^[a-zA-Z0-9_-]{11}$/).test(item.id)||seen.has(item.id))continue;
  if(item.sourceUrl!=='https://www.youtube.com/watch?v='+item.id)continue;
  if(typeof item.title!=='string'||item.title.trim().length<10||/[<>]/.test(item.title)||item.title.length>150)continue;
  if(typeof item.publisher!=='string'||item.publisher.trim().length<3||/[<>]/.test(item.publisher)||item.publisher.length>100)continue;
  if(!['publisher','curated'].includes(item.sourceType))continue;
  seen.add(item.id);
  result.push({id:item.id,category:item.category,title:item.title.trim(),publisher:item.publisher.trim(),
   sourceType:item.sourceType,sourceUrl:item.sourceUrl,note:typeof item.note==='string'?item.note.slice(0,200):''});
  if(result.length>=80)break;
 }
 return result;
}
export function nextCardIndex(current,direction,length){
 if(!Number.isInteger(length)||length<=0)return 0;
 return ((Number(current)||0)+(direction<0?-1:1)+length)%length;
}
