/* One approved source-backed card = one story page; its 1-6 real images play
 * once in order, then the next approved page begins. No synthetic creatives. */
export const MAX_STORY_SLIDES=6;
const restricted=/(?:\b(?:cannabis|dispensary|tobacco|nicotine|cigar|vape|alcohol|beer|wine|liquor|marijuana|thc|medical|diagnosis)\b|21\+)/i;
function safeUrl(value){
 try{const u=new URL(String(value||''));if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.')||u.href.length>1800)return '';return u.href;}
 catch{return '';}
}
function safeText(x,max=180){return String(x||'').replace(/[\x00-\x1f]/g,' ').trim().slice(0,max);}
export function normalizeStoryPage(row){
 if(!row||typeof row!=='object'||row.ageRestricted||restricted.test([row.category,row.title,row.description,row.contextTopic].join(' ')))return null;
 const type=row.type,status=row.status;
 const reviewed=type==='published-card'&&status==='approved'||
  type==='sponsored'&&status==='approved'&&row.creativeApproved===true;
 if(!reviewed)return null;
 const id=safeText(row.id,100),title=safeText(row.title,130),url=safeUrl(row.url);
 if(!id||!title||!url)return null;
 const sources=[...(Array.isArray(row.images)?row.images:[]),row.image];
 const seen=new Set(),images=[];
 for(const value of sources){
  const src=safeUrl(typeof value==='string'?value:value?.src);
  if(!src||seen.has(src))continue;
  images.push(src);seen.add(src);
  if(images.length===MAX_STORY_SLIDES)break;
 }
 if(!images.length)return null;
 return {id,title,url,images,type,sponsor:type==='sponsored'?safeText(row.sponsor||'Advertiser'):null,
  description:safeText(row.description,300),category:safeText(row.category,80)};
}
export function storyStep(pages,position,direction=1){
 const card=Math.max(0,Math.min(pages.length-1,Number(position?.card)||0));
 const slide=Math.max(0,Math.min((pages[card]?.images.length||1)-1,Number(position?.slide)||0));
 if(!pages.length)return {card:0,slide:0,done:true};
 if(direction<0){
  if(slide>0)return {card,slide:slide-1,done:false};
  if(card>0)return {card:card-1,slide:pages[card-1].images.length-1,done:false};
  return {card:0,slide:0,done:false};
 }
 if(position?.done)return {card,slide,done:true};
 if(slide+1<pages[card].images.length)return {card,slide:slide+1,done:false};
 if(card+1<pages.length)return {card:card+1,slide:0,done:false};
 return {card,slide,done:true};
}
export function storySwipe(dx,dy,interactive=false){
 if(interactive||!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5)return null;
 return dx<0?'next':'previous';
}
const SEEDS=[
 {pattern:/\bmiami vice\b/i,topics:/\b(travel|tropical|vacation|palms?|florida|beach|hotel|destination)\b/i},
 {pattern:/\b(syntax error|debug|programming|fix code|coding|developer|gpt app|software)\b/i,
  topics:/\b(developer|code|syntax|debug|builder|software|tools)\b/i},
 {pattern:/\b(movie|film|cinema|television|tv)\b/i,topics:/\b(cinema|movie|video|entertainment|streaming)\b/i},
 {pattern:/\b(cooking|recipes?|carrots?|celery|garden|produce)\b/i,
  topics:/\b(food|produce|garden|vegetable|cooking|groceries)\b/i}
];
export function chooseContextualStories(context,candidates){
 const input=[context?.title,context?.category,context?.description].join(' ').slice(0,700);
 if(!input||restricted.test(input))return [];
 const applicable=SEEDS.filter(row=>row.pattern.test(input));
 if(!applicable.length)return [];
 return (Array.isArray(candidates)?candidates:[]).filter(c=>{
  const story=normalizeStoryPage(c);if(!story)return false;
  const text=[story.title,story.description,story.category].join(' ');
  return applicable.some(a=>a.topics.test(text));
 });
}
