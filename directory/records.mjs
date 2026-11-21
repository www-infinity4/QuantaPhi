// Curated public organizations and official websites; never a people-data scraper.
// A contact number/social account is published only with a matching verified source.
export const DIRECTORY_SOURCES=Object.freeze([
 Object.freeze({id:'usagov',name:'USAGov Contact Center',kind:'organization',category:'Government',description:'Official U.S. government information and agency referrals.',website:'https://www.usa.gov/',contactUrl:'https://www.usa.gov/',phone:'+18448724681',phoneDisplay:'1-844-872-4681',email:'',facebook:'',x:'',source:'https://www.usa.gov/',verifiedAt:'2026-10-23',publicationBasis:'official_contact'}),
 Object.freeze({id:'nasa-inquiries',name:'NASA Public Inquiries',kind:'organization',category:'Science',description:'NASA Headquarters public communications and general inquiries.',website:'https://www.nasa.gov/',contactUrl:'https://www.nasa.gov/headquarters/about/',phone:'+12023580001',phoneDisplay:'202-358-0001',email:'public-inquiries@hq.nasa.gov',facebook:'',x:'',source:'https://www.nasa.gov/headquarters/about/',verifiedAt:'2026-10-23',publicationBasis:'official_contact'}),
 Object.freeze({id:'national-archives',name:'National Archives Customer Service',kind:'organization',category:'Government',description:'Official U.S. National Archives records and public-service contact.',website:'https://www.archives.gov/',contactUrl:'https://www.archives.gov/contact',phone:'+18662726272',phoneDisplay:'1-866-272-6272',email:'',facebook:'',x:'',source:'https://www.archives.gov/contact',verifiedAt:'2026-10-23',publicationBasis:'official_contact'}),
 Object.freeze({id:'quantaphi',name:'QuantaPhi',kind:'website',category:'AI & Tools',description:'Interactive research, Bubbles AI, media cards and original QuantaPhi tools.',website:'https://quantaphi.org/',source:'https://quantaphi.org/',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'starmaker',name:'StarMaker Songbook',kind:'website',category:'Music',description:'Official StarMaker song discovery and karaoke app entry.',website:'https://www.starmakerstudios.com/en/songs',source:'https://www.starmakerstudios.com/en/songs',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'nasa-webb',name:'NASA James Webb',kind:'website',category:'Science',description:'Official Webb Space Telescope research, images and mission news.',website:'https://science.nasa.gov/mission/webb/',source:'https://science.nasa.gov/mission/webb/',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'cloudflare',name:'Cloudflare',kind:'website',category:'Technology',description:'Official site for Cloudflare connectivity, security and developer products.',website:'https://www.cloudflare.com/',source:'https://www.cloudflare.com/',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'github',name:'GitHub',kind:'website',category:'Development',description:'Repositories, collaborative programming and software automation.',website:'https://github.com/',source:'https://github.com/',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'wikipedia',name:'Wikipedia',kind:'website',category:'Reference',description:'Community-edited encyclopedia articles with citations.',website:'https://www.wikipedia.org/',source:'https://www.wikipedia.org/',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'google-search',name:'Google Search',kind:'website',category:'Search',description:'Web search and discovery at the official Google website.',website:'https://www.google.com/',source:'https://www.google.com/',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'youtube',name:'YouTube',kind:'website',category:'Video',description:'Official YouTube channels, videos and search.',website:'https://www.youtube.com/',source:'https://www.youtube.com/',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'reddit',name:'Reddit',kind:'website',category:'Community',description:'Public community discussions and topic communities.',website:'https://www.reddit.com/',source:'https://www.reddit.com/',verifiedAt:'2026-10-23',publicationBasis:'official_website'}),
 Object.freeze({id:'chatgpt',name:'ChatGPT',kind:'website',category:'AI & Tools',description:'Official ChatGPT conversation website.',website:'https://chatgpt.com/',source:'https://chatgpt.com/',verifiedAt:'2026-10-23',publicationBasis:'official_website'})
]);
const ACCEPTED_BASIS=new Set(['official_contact','official_website','opt_in_verified']);
const SAFE_SOCIAL_HOSTS={facebook:['facebook.com','www.facebook.com'],x:['x.com','www.x.com','twitter.com','www.twitter.com']};
function externalHttps(value,hosts=null){
 if(typeof value!=='string')return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&
  (!hosts||hosts.includes(u.hostname));}catch{return false}
}
export function publicListingValid(record){
 if(!record||!ACCEPTED_BASIS.has(record.publicationBasis)||!['organization','website','professional'].includes(record.kind))return false;
 if(!/^[a-z0-9-]{3,70}$/.test(record.id)||typeof record.name!=='string'||record.name.length<3||record.name.length>130)return false;
 if(!externalHttps(record.website)||!externalHttps(record.source)||!/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedAt))return false;
 if(record.phone&&(!/^\+[1-9]\d{7,14}$/.test(record.phone)||!record.phoneDisplay))return false;
 if(record.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(record.email))return false;
 for(const [field,hosts] of Object.entries(SAFE_SOCIAL_HOSTS)){if(record[field]&&!externalHttps(record[field],hosts))return false}
 // No scraping or publishing people from externally aggregated public profiles.
 if(record.kind==='professional'&&record.publicationBasis!=='opt_in_verified')return false;
 return true;
}
export function directorySearch(records,{query='',kind='all',category='all'}={}){
 const words=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean).slice(0,8);
 return records.filter(publicListingValid).filter(r=>(kind==='all'||r.kind===kind)&&
  (category==='all'||r.category===category)&&words.every(w=>
   [r.name,r.description,r.category,r.website,r.phoneDisplay,r.email].filter(Boolean).join(' ').toLocaleLowerCase().includes(w)));
}
export function safeProfileDraft(fields){
 const value=k=>String(fields?.[k]||'').trim();
 const name=value('name'),website=value('website'),description=value('description');
 const phone=value('phone'),email=value('email'),facebook=value('facebook'),x=value('x');
 if(name.length<3||name.length>130||description.length<30||description.length>600||!externalHttps(website))
  return {ok:false,error:'Enter a name, a 30–600 character description, and your official HTTPS website.'};
 if(phone&&!/^\+[1-9]\d{7,14}$/.test(phone))return {ok:false,error:'Use a public business number with country code, such as +12025550123.'};
 if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return {ok:false,error:'Email address is not valid.'};
 if(facebook&&!externalHttps(facebook,SAFE_SOCIAL_HOSTS.facebook))return {ok:false,error:'Facebook link must point to an official facebook.com page.'};
 if(x&&!externalHttps(x,SAFE_SOCIAL_HOSTS.x))return {ok:false,error:'X link must point to an official x.com or twitter.com profile.'};
 return {ok:true,draft:{name,website,description,phone,email,facebook,x,
  publicationBasis:'pending_owner_verification',public:false,searchIndexable:false}};
}
