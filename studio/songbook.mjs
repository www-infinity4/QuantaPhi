// Only independently verified public StarMaker song links. This is NOT a
// complete StarMaker API, licensed karaoke library or mirrored recording set.
export const STUDIO_SONGS=Object.freeze([
 Object.freeze({id:'perfect-ed-sheeran',title:'Perfect',artist:'Ed Sheeran',
  url:'https://www.starmakerstudios.com/en/song/ed-sheeran-perfect-lyrics/611752105016719259',
  source:'StarMaker official songbook',artStatus:'original_card_art_only'}),
 Object.freeze({id:'shape-of-you-ed-sheeran',title:'Shape Of You',artist:'Ed Sheeran',
  url:'https://www.starmakerstudios.com/en/song/ed-sheeran-shape-of-you-lyrics/611752105016885608',
  source:'StarMaker official songbook',artStatus:'original_card_art_only'}),
 Object.freeze({id:'rest-your-love-on-me-bee-gees',title:'Rest Your Love On Me',artist:'Bee Gees',
  url:'https://www.starmakerstudios.com/en/song/bee-gees-rest-your-love-on-me-lyrics/6755116273981412',
  source:'StarMaker official songbook',artStatus:'original_card_art_only'}),
 Object.freeze({id:'dance-monkey-tones-and-i',title:'Dance Monkey',artist:'TONES AND I',
  url:'https://www.starmakerstudios.com/en/song/tones-and-i-dance-monkey-lyrics/611752105020283316',
  source:'StarMaker official songbook',artStatus:'original_card_art_only'}),
 Object.freeze({id:'savage-love-jason-derulo',title:'Savage Love',artist:'Jason Derulo',
  url:'https://www.starmakerstudios.com/en/song/jason-derulo-savage-love-lyrics/611752105020739568',
  source:'StarMaker official songbook',artStatus:'original_card_art_only'}),
 Object.freeze({id:'like-im-gonna-lose-you-meghan-trainor',title:"Like I'm Gonna Lose You",artist:'Meghan Trainor',
  url:'https://www.starmakerstudios.com/en/song/meghan-trainor-like-im-gonna-lose-you-lyrics/6501562479804416',
  source:'StarMaker official songbook',artStatus:'original_card_art_only'}),
 Object.freeze({id:'hello-adele',title:'Hello',artist:'Adele',
  url:'https://www.starmakerstudios.com/en/song/adele-hello-lyrics/6755116273976328',
  source:'StarMaker official songbook',artStatus:'original_card_art_only'}),
 Object.freeze({id:'runaway-aurora',title:'Runaway',artist:'Aurora',
  url:'https://www.starmakerstudios.com/en/song/aurora-runaway-lyrics/611752105015240427',
  source:'StarMaker official songbook',artStatus:'original_card_art_only'})
]);
export const OFFICIAL_SONGBOOK='https://www.starmakerstudios.com/en/songs';
export function songLinkValid(song){
 if(!song||!/^[a-z0-9-]{4,90}$/.test(song.id||'')||!song.title||!song.artist)return false;
 try{
  const u=new URL(song.url);
  return u.protocol==='https:'&&u.hostname==='www.starmakerstudios.com'&&
   /^\/en\/song\/[a-z0-9-]+\/\d+$/.test(u.pathname);
 }catch{return false}
}
export function findSongs(query='',list=STUDIO_SONGS){
 const terms=String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean).slice(0,8);
 return list.filter(songLinkValid).filter(x=>terms.every(term=>(x.title+' '+x.artist).toLocaleLowerCase().includes(term)));
}
