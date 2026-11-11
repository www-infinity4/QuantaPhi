/* Oracle / ShopPhi first-party placement contract.
 * Public is broad but relevant. For You needs chosen departments/follows.
 * Neither phone gender, health records, private chat, nor device GPS is inferred.
 * No unreviewed or stale paid campaign can buy guaranteed placement.
 */
export const DEPARTMENTS=Object.freeze([
 {id:'all',label:'All Quick Cards'},
 {id:'shopping',label:'Shopping & brands'},
 {id:'restaurants',label:'Restaurants & food'},
 {id:'sports',label:'Sports · followed teams'},
 {id:'news',label:'News & civic updates'},
 {id:'media',label:'Movies & TV'},
 {id:'radio',label:'Music & radio'},
 {id:'developers',label:'Developers & AI'},
 {id:'travel',label:'Travel & destinations'},
 {id:'science',label:'Science & learning'},
 {id:'healthcare',label:'Healthcare · opt-in'},
 {id:'adult',label:'21+ · opt-in only'}
]);
export const INTEREST_DEPARTMENTS=Object.freeze(DEPARTMENTS.filter(x=>!['all','healthcare','adult'].includes(x.id)));
const safeText=v=>String(v??'').trim().slice(0,650);
export function departmentFor(card={}){
 const id=safeText(card.id).toLowerCase(),cat=safeText(card.category||card.kind).toLowerCase();
 const text=[id,cat,safeText(card.name||card.title)].join(' ').toLowerCase();
 if(/21\+|\b(dispensary|cannabis|adult store)\b|^adult-|^dispensary-|brucebannerweedmaps|infinityadultcontentcard|adult-content-preferences/.test(text))return 'adult';
 if(/\b(health|medical|screening|clinic|pharmacy|mychart)\b/.test(cat))return 'healthcare';
 if(/\b(sport|nfl|nba|mlb|nhl|football|baseball|basketball|hockey|soccer|team|olympic)\b/.test(cat)||/\b(nfl|nba|mlb|sports?|scores?|packers|lions|world.series)\b|googletrend(nba|mlb)|world-series/.test(id))return 'sports';
 if(/\b(news|journalis|civic|government|public.servic|politic)\b/.test(cat)||/\b(news|headline|breaking)\b/.test(id))return 'news';
 if(/\b(restaur|food|grocer|recipe|dining|pizza|produce|burger|coffee|cook)\b/.test(cat))return 'restaurants';
 if(/\b(develop|code|programming|builder|software|ai tools|computing)\b/.test(cat)||/\b(phiProjectActions|developer|termux|code.phi|bubbles.aicard)\b/i.test(id))return 'developers';
 if(/\b(radio|music|song|album|podcast|audio)\b/.test(cat)||/radio|music|song|spotify/.test(id))return 'radio';
 if(/\b(movie|tv|video|cinema|film|channel|stream)\b/.test(cat)||/movie|tv|video|cinema|film|channel/.test(id))return 'media';
 if(/\b(travel|touris|hotel|destination|vacation|cruise)\b/.test(cat))return 'travel';
 if(/\b(science|physics|research|history|learn|education|museum|books?)\b/.test(cat))return 'science';
 return 'shopping';
}
export const matchesDepartment=(card,department='all')=>department==='all'||departmentFor(card)===department;
const validDate=value=>{
 if(!value||typeof value!=='string')return null;
 const ms=Date.parse(value);return Number.isFinite(ms)?ms:null;
};
const validUrl=value=>{
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!u.hostname.endsWith('.local')&&u.href.length<=1800?u.href:'';}
 catch{return ''}
};
export function currentDaypart(date=new Date()){
 const h=date.getHours();
 return h>=5&&h<11?'breakfast':h>=11&&h<15?'lunch':h>=15&&h<18?'afternoon':h>=18&&h<22?'dinner':'overnight';
}
function seasonMatches(season,now){
 if(!season)return true;
 const month=now.getMonth()+1;
 const seasons={winter:[11,12,1,2],spring:[3,4,5],summer:[6,7,8],autumn:[9,10,11],fall:[9,10,11]};
 return !seasons[season]||seasons[season].includes(month);
}
const sensitiveCommercial=/\b(cannabis|dispensary|marijuana|thc|cigar|tobacco|vape|nicotine|alcohol|liquor|gambling|diagnos|medical|colorectal|disease|prescription|21\+)\b/i;
export function placementPolicy(campaign,{now=new Date(),daypart=currentDaypart(now),region=''}={}){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))return {eligible:false,reason:'Invalid clock',openNow:false,weight:0};
 const type=campaign?.type||'editorial',sponsor=type==='sponsored';
 const category=[campaign?.category,campaign?.title,campaign?.description].map(safeText).join(' ');
 if(sponsor&&sensitiveCommercial.test(category))return {eligible:false,reason:'Restricted ad category',openNow:false,weight:0};
 if(campaign?.status==='removed'||campaign?.status==='expired'||campaign?.status==='rejected')return {eligible:false,reason:'Not active',openNow:false,weight:0};
 const start=validDate(campaign?.startsAt),end=validDate(campaign?.endsAt);
 if(campaign?.startsAt&&!start||campaign?.endsAt&&!end||start&&now.getTime()<start||end&&now.getTime()>end){
  return {eligible:false,reason:'Campaign not currently valid',openNow:false,weight:0};
 }
 if(!seasonMatches(safeText(campaign?.season).toLowerCase(),now))return {eligible:false,reason:'Outside season',openNow:false,weight:0};
 const hours=campaign?.merchantHours;
 const openNow=hours?.verified===true&&hours?.open===true;
 if(hours?.verified===true&&hours?.open===false)return {eligible:false,reason:'Verified closed',openNow:false,weight:0};
 if(Array.isArray(campaign?.dayparts)&&campaign.dayparts.length&&!campaign.dayparts.includes(daypart))return {eligible:false,reason:'Outside campaign daypart',openNow:false,weight:0};
 if(Array.isArray(campaign?.allowedRegions)&&campaign.allowedRegions.length&&
  (!region||!campaign.allowedRegions.includes(region)))return {eligible:false,reason:'Region not verified',openNow:false,weight:0};
 if(sponsor){
  if(campaign.approved!==true||campaign.reviewed!==true)return {eligible:false,reason:'Ad approval not verified',openNow:false,weight:0};
  const verifiedAt=validDate(campaign?.updatedAt||campaign?.createdAt);
  if(!verifiedAt||verifiedAt>now.getTime()||now.getTime()-verifiedAt>60*86400000)
   return {eligible:false,reason:'Creative not recently verified',openNow:false,weight:0};
  if(!validUrl(campaign?.image)||!validUrl(campaign?.sourceUrl||campaign?.url||campaign?.destinationUrl))
   return {eligible:false,reason:'Official image or landing page missing',openNow:false,weight:0};
  if(!start||!end)return {eligible:false,reason:'Campaign schedule not verified',openNow:false,weight:0};
 }
 const ageDays=Math.max(0,Math.min(60,(now.getTime()-(validDate(campaign?.updatedAt||campaign?.createdAt)||now.getTime()))/86400000));
 return {eligible:true,reason:openNow?'Verified merchant hours open':'Relevant source · check provider hours',openNow,
  weight:Math.round((sponsor?12:0)+Math.max(0,35-ageDays)*0.6+(openNow?10:0))};
}
export function freshApprovedCreatives(payload,{now=new Date(),maxAgeDays=45}={}){
 const items=Array.isArray(payload?.cards)?payload.cards:[];
 const seen=new Set(),out=[];
 for(const card of items){
  if(card?.status!=='approved'||!card.slug||seen.has(card.slug))continue;
  const created=validDate(card.createdAt||card.updatedAt);
  if(!created||created>now.getTime()||now.getTime()-created>maxAgeDays*86400000)continue;
  const image=validUrl(card.image),website=validUrl(card.website),cardUrl=validUrl(card.cardUrl);
  if(!image||!website||!cardUrl||sensitiveCommercial.test([card.kind,card.title,card.description].join(' ')))continue;
  seen.add(card.slug);
  out.push({id:safeText(card.slug).slice(0,95),title:safeText(card.title).slice(0,85),
   description:safeText(card.description).slice(0,350),website,image,cardUrl,
   createdAt:new Date(created).toISOString(),source:'approved-publisher',rightsVerified:false});
  if(out.length===24)break;
 }
 return out;
}

/* Provider-returned AdPhi creative. Missing provenance or rights never
 * becomes a paid campaign, image-source grant or builder prefill. */
export function freshBrokerCreative(ad,{now=new Date()}={}){
 if(!ad||typeof ad!=='object')return null;
 const review=ad.creativeApproved===true&&ad.approved===true&&ad.reviewed===true;
 const data={...ad,type:'sponsored',approved:review,reviewed:review,category:ad.category,
  title:ad.title,description:ad.body,image:ad.imageUrl,
  sourceUrl:ad.destinationUrl,startsAt:ad.startsAt,endsAt:ad.endsAt,
  createdAt:ad.createdAt,updatedAt:ad.updatedAt};
 if(!placementPolicy(data,{now}).eligible)return null;
 const images=[...new Set([...(Array.isArray(ad.images)?ad.images:[]),ad.imageUrl]
  .map(v=>validUrl(typeof v==='string'?v:v?.src)).filter(Boolean))].slice(0,6);
 if(!images.length)return null;
 return {id:safeText(ad.id||ad.campaignId).slice(0,90),title:safeText(ad.title).slice(0,85),
  description:safeText(ad.body).slice(0,350),website:validUrl(ad.destinationUrl),
  image:images[0],images,createdAt:ad.createdAt||ad.updatedAt,
  sponsor:safeText(ad.advertiser).slice(0,85),source:'verified-adphi',rightsVerified:true};
}
