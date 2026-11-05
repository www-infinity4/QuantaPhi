/* Public Media Star discovery: score usefulness, never award currency.
 * A card appears only after independent rights/image/source approval.
 */
const stop=new Set(['show','find','look','hear','listen','watch','radio','replay','game','games','the','and','this','that','with','into','from','what','media','star','please','near','for','you']);
const httpsUrl=s=>{
 try{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||u.hash)return false;
  const h=u.hostname.toLowerCase();
  return h!=='localhost'&&h!=='127.0.0.1'&&!h.endsWith('.localhost')&&!h.endsWith('.local')&&
   !/^10\.|^192\.168\.|^172\.(?:1[6-9]|2[0-9]|3[01])\./.test(h);
 }catch{return false}
};
const err=code=>{throw Error(code)};
export function extractPublicInterest(query,optedIn=false){
 if(optedIn!==true)return [];
 const parts=String(query||'').toLowerCase().match(/[a-z0-9]+/g)||[];
 return [...new Set(parts.filter(x=>x.length>=3&&!stop.has(x)))].slice(0,8);
}
export function validateGallerySubmission(item){
 if(!item||typeof item!=='object'||Array.isArray(item))err('invalid_submission');
 const title=String(item.title||'').trim(),description=String(item.description||'').trim();
 if(title.length<3||title.length>160||description.length<5||description.length>450)err('invalid_card_text');
 if(!httpsUrl(item.sourceUrl)||!httpsUrl(item.imageUrl))err('https_owned_media_required');
 if(item.confirmRights!==true)err('explicit_rights_confirmation_required');
 if(!Array.isArray(item.topics)||item.topics.length<1||item.topics.length>6)err('invalid_topics');
 const topics=item.topics.map(x=>String(x).trim().toLowerCase());
 if(new Set(topics).size!==topics.length||topics.some(t=>!(/^[a-z0-9][a-z0-9 -]{2,27}$/).test(t)))err('invalid_topics');
 return {title,description,sourceUrl:new URL(item.sourceUrl).href,imageUrl:new URL(item.imageUrl).href,
  topics,confirmRights:true};
}
const approved=card=>card&&card.status==='approved'&&card.rightsVerified===true&&
 card.imageVerified===true&&typeof card.id==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(card.id)&&
 typeof card.title==='string'&&card.title.trim().length>0&&
 typeof card.reviewReceipt==='string'&&card.reviewReceipt.trim().length>=8&&
 httpsUrl(card.sourceUrl)&&httpsUrl(card.imageUrl)&&
 Array.isArray(card.topics)&&card.topics.every(t=>typeof t==='string'&&t.length<=30);
export function rankPublicMediaStars(cards,{interestTerms=[],followingIds=[]}={}){
 if(!Array.isArray(cards))throw TypeError('cards_array_required');
 const terms=new Set((Array.isArray(interestTerms)?interestTerms:[]).map(x=>String(x).toLowerCase()).filter(x=>/^[a-z0-9 -]{3,30}$/.test(x)).slice(0,8));
 const follows=new Set(Array.isArray(followingIds)?followingIds:[]);
 return cards.filter(approved).map((card,i)=>{
  const topicSet=new Set(card.topics.map(t=>t.toLowerCase()));
  const title=card.title.toLowerCase();
  let score=1;
  for(const word of terms){if(topicSet.has(word))score+=8;else if(title.includes(word))score+=3}
  if(follows.has(card.publisherId))score+=6;
  return {...card,matchScore:score,originalIndex:i};
 }).sort((a,b)=>b.matchScore-a.matchScore||a.originalIndex-b.originalIndex);
}
