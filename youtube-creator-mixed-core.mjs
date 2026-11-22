import {YOUTUBE_CHANNEL,YOUTUBE_VIDEO_DATABASE} from './youtube-creator-catalog.mjs';
import {JULIE_DERU_CHANNEL,JULIE_DERU_VIDEO_DATABASE} from './julie-deru-catalog.mjs';

/* Known publisher identities + inspected starting links. Official keyless RSS
 * supplies recent uploads, not a complete historical channel archive. */
const canonical=id=>'https://www.youtube.com/watch?v='+id;
const seed=(channelId,videoId,title)=>Object.freeze({
 channelId,videoId,title,sourceUrl:canonical(videoId),publishedAt:null,origin:'reviewed'
});
export const CREATOR_CHANNELS=Object.freeze([
 Object.freeze({key:'gana',name:'GANA Tribe · Mama Cabbage',channelId:'UC6ySmwN_K8fGGD2EKLQdEGA',
  url:'https://www.youtube.com/@ganatribe',seed:Object.freeze([
   seed('UC6ySmwN_K8fGGD2EKLQdEGA','OqRb8RKNgQQ','Everyone Needed Mama - and Her Ice Cream'),
   seed('UC6ySmwN_K8fGGD2EKLQdEGA','PyUwXoTabPA','REFRESHING! 6-2-2014')
  ])}),
 Object.freeze({key:'abbe',name:YOUTUBE_CHANNEL.name,channelId:YOUTUBE_CHANNEL.channelId,
  url:YOUTUBE_CHANNEL.profileUrl,
  seed:Object.freeze(YOUTUBE_VIDEO_DATABASE.videos.map(v=>seed(v.channelId,v.videoId,v.title)))}),
 Object.freeze({key:'julie',name:JULIE_DERU_CHANNEL.name,channelId:JULIE_DERU_CHANNEL.channelId,
  url:JULIE_DERU_CHANNEL.profileUrl,
  seed:Object.freeze(JULIE_DERU_VIDEO_DATABASE.videos.map(v=>seed(v.channelId,v.videoId,v.title)))}),
 // Source-linked video only: public watch metadata checked, but no verified
 // channel ID. Never request RSS or pretend this is a full creator archive.
 Object.freeze({key:'samirah',name:'Samirah Ann · owner-linked video',channelId:null,
  url:'https://www.youtube.com/@SamirahAnn',seed:Object.freeze([
   seed('samirah','UPFgnpkm7MQ','BREASTFEEDING A TEETHING BABY | Clingy baby | Clean with me | Mum of four')
  ])}),
 // Public watch page identifies Brittikitty and the original channel handle.
 // No canonical UC ID was verified; link the full Videos tab but do not fetch RSS.
 Object.freeze({key:'brittikitty',name:'Brittikitty',channelId:null,
  url:'https://www.youtube.com/@brittikitty',seed:Object.freeze([
   seed('brittikitty','eikANmw714k','Lily can literally fall asleep everywhere and anywhere 😂😂')
  ])}),
 Object.freeze({key:'landing',name:'LANDing Autism',channelId:'UCQU1zvNELO2AatGXMRQ2bSw',
  url:'https://www.youtube.com/@LANDingAutism',seed:Object.freeze([
   seed('UCQU1zvNELO2AatGXMRQ2bSw','QR_c5m1RLtk','Penelope Takes Her FIRST STEPS!!'),
   seed('UCQU1zvNELO2AatGXMRQ2bSw','ZXcfl1rNQP0','WHY We Moved To Texas'),
   seed('UCQU1zvNELO2AatGXMRQ2bSw','MuZXaYXfPXs','FURNISHED HOME TOUR | New House Reveal 2026'),
   seed('UCQU1zvNELO2AatGXMRQ2bSw','xDr8qOYR93M','Answering Questions I Really Don\'t Want To'),
   seed('UCQU1zvNELO2AatGXMRQ2bSw','rS_P180JLU8','Autism Life In Texas'),
   seed('UCQU1zvNELO2AatGXMRQ2bSw','4CjRqGBkjQY','New House Grocery Haul 2026 | WALMART GROCERIES')
  ])}),
 // Verified directly on the public video and channel pages on 2026-11-22.
 // RSS supplies recent uploads; historical videos stay on the original channel.
 Object.freeze({key:'agorasoumae',name:'AGORA SOU MÃE',channelId:'UCjht-pbc_924v1ovsKHZd9Q',
  url:'https://www.youtube.com/@agorasoumae173',seed:Object.freeze([
   seed('UCjht-pbc_924v1ovsKHZd9Q','XNXSduqwZ54','MAMÃES ASSISTAM ESTE VIDEO'),
   // Six additional exact ID/title pairs inspected from official public upload RSS.
   seed('UCjht-pbc_924v1ovsKHZd9Q','VnDurY3dysA','Decoração de Natal | AGORA SOU MÃE ❤️'),
   seed('UCjht-pbc_924v1ovsKHZd9Q','5vkwoZXc6Vg','FAZENDO FAXINA NA CASA TODA | AGORA SOU MÃE ❤️'),
   seed('UCjht-pbc_924v1ovsKHZd9Q','GzTixQ8PVvY','VIAJAMOS PARA APARECIDA DO NORTE | AGORA SOU MÃE 🥰'),
   seed('UCjht-pbc_924v1ovsKHZd9Q','ZqXrplTyGg0','Como está sendo a fase dos 3 anos da minha filha? | AGORA SOU MÃE'),
   seed('UCjht-pbc_924v1ovsKHZd9Q','MNcG0UM9t4c','Dia de faxina pesadona 🫢 |AGORA SOU MÃE'),
   seed('UCjht-pbc_924v1ovsKHZd9Q','97l1heMfoiE','Uma faxina na cozinha, óleo pra todo lado 🫢 | AGORA SOU MÃE')
  ])}),
 // Watch page, channel canonical metadata and public Atom feed checked 2026-11-22.
 Object.freeze({key:'autism-out-loud',name:'Becki | Autism Out Loud Coach',channelId:'UC4ZlERGU2sUoBP_ssCagn5g',
  url:'https://www.youtube.com/@autismoutloudcoach',
  videosUrl:'https://www.youtube.com/@autismoutloudcoach/shorts',seed:Object.freeze([
   seed('UC4ZlERGU2sUoBP_ssCagn5g','L9x-4pLKG50','When My Autistic Daughter Has No Wet Wipes! 😂❤️'),
   seed('UC4ZlERGU2sUoBP_ssCagn5g','iWXbl9-5O98',"Well, That's Not How I Expected My Saturday Night To Go!! 😂❤️"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g','TvGFHhVF7eo','Is There Still a Stigma Around Specialist Schools?'),
   seed('UC4ZlERGU2sUoBP_ssCagn5g','dM3t5FTzucI','Just Another Saturday With My Autistic Daughter Bethany!! 😂❤️'),
   seed('UC4ZlERGU2sUoBP_ssCagn5g','yGkisQ2DWx4',"I've Been Hiding in the Car AGAIN! 😂"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g','QlUq_VZhlx8',"Bethany Wasn't Falling for That! 😂❤️"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"M-aXHaL6QJ0","DLA Refusals: What Are the Government Figures Revealing?"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"7zKM6RTQ1NI","Why Does Respite Cause So Much Judgement?"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"c2vGt3ikN64","Trying to find my Friday feeling..."),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"uA6ljU-FZRg","Why Is Everything a Competition in the SEND Community?"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"oWH3L64NCS8","I just love Bethany’s personality..."),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"LVhwoW28PS0","Why This Is a HUGE Mealtime Win for My Autistic Daughter! ❤️"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"R5ZnOXIKWxQ","Indian Christmas Music Is My New Favourite Mood Booster 😂🎄"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"S5-Tm1oi4uQ","The Parenting Advice Nobody Asked For 🙄"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"o1BfJwDPwMk","The truth about High Rate Mobility DLA for autistic children"),
   seed('UC4ZlERGU2sUoBP_ssCagn5g',"yguj32c--8E","How I Know When My Autistic Daughter Is Having a Meltdown ❤️")
  ])}),
 // Publisher page and Videos tab verified 2026-11-22: all 18 listed uploads.
 // The owner-selected video is intentionally first. Dates/rights not inferred.
 Object.freeze({key:'dekret',name:'ДЕКРЕТ',channelId:'UC_z0l4Wm8yai_rDlZ2iPjrg',
  url:'https://www.youtube.com/channel/UC_z0l4Wm8yai_rDlZ2iPjrg',seed:Object.freeze([
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','BNMCCyjAb74','Кормить грудью легко'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','FC7SEj-F0vo',"Women's rights in prenatal clinics, maternity hospitals, and vaccination matters"),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','Nb9HuzcsEvQ','Gentle Hypnosis During Childbirth'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','YlNcU6CRrAs','Первое купание новорожденного'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','sOaDnUxD_aQ','Кесарево сечение - роды или операция?'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','1tWQ9VFfMW8','What is homeopathy?'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','Hs5ikoqJaz8','Why Do Kids Get Sick?'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','7tlG8T_BxbI',"Gave birth. What's next?"),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','N3iYfTLJotk','Who will help relieve the pain of the expectant mother?'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','ylJz_HPP7l8','How to find your osteopath?'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','qVidBmlJrZw','Peculiarities of raising boys and girls'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','cGFBILXi0QY','Остеопат Сергеев Андрей Андреевич'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','eCvKvwvQmn4','How to prepare your body for labor'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','2kjUNfI4wj4','Как укрепить иммунитет ребенка?'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','7y06kzGb3zo','Childbirth through the eyes of an obstetrician'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','MRKCrFVFAjQ','Recommendations from a lactation consultant'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','7NSg9XlBdho','Consultation with a pediatrician'),
   seed('UC_z0l4Wm8yai_rDlZ2iPjrg','tgwwm_iR698','Погода в доме')
  ])})
]);
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID=/^UC[A-Za-z0-9_-]{22}$/;
export function parseCreatorInput(input){
 if(typeof input!=='string'||input.length>320)return null;
 let url;try{url=new URL(input.trim())}catch{return null}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)return null;
 const host=url.hostname.toLowerCase(),path=url.pathname;
 if(host==='youtu.be'&&/^\/[A-Za-z0-9_-]{11}\/?$/.test(path))
  return {type:'video',videoId:path.split('/')[1]};
 if(!['youtube.com','www.youtube.com','m.youtube.com'].includes(host))return null;
 if(path==='/watch'&&VIDEO_ID.test(url.searchParams.get('v')||''))
  return {type:'video',videoId:url.searchParams.get('v')};
 const short=path.match(/^\/(?:shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
 if(short)return {type:'video',videoId:short[1]};
 const channel=path.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})\/?$/);
 if(channel)return {type:'channel',channelId:channel[1]};
 const handle=path.match(/^\/@([A-Za-z0-9._-]{3,40})\/?$/);
 if(handle)return {type:'handle',handle:handle[1].toLowerCase()};
 return null;
}
export function validCreatorVideo(v){
 return Boolean(v&&VIDEO_ID.test(v.videoId||'')&&typeof v.channelId==='string'&&
  v.channelId.length<=40&&/^[A-Za-z0-9_-]+$/.test(v.channelId)&&
  typeof v.title==='string'&&v.title.length>0&&v.title.length<=160&&
  !/[\u0000-\u001f]/.test(v.title)&&v.sourceUrl===canonical(v.videoId)&&
  (v.publishedAt===null||(typeof v.publishedAt==='string'&&Number.isFinite(Date.parse(v.publishedAt)))));
}
export function mixCreatorVideos(items,order=[]){
 if(!Array.isArray(items))return [];
 const groups=new Map();const seen=new Set();
 for(const v of items){
  if(!validCreatorVideo(v)||seen.has(v.videoId))continue;
  seen.add(v.videoId);
  if(!groups.has(v.channelId))groups.set(v.channelId,[]);
  groups.get(v.channelId).push(v);
 }
 const keys=[...new Set([...order,...groups.keys()])].filter(id=>groups.has(id));
 const mixed=[];
 for(let i=0;;i++){
  let found=false;
  for(const key of keys){const v=groups.get(key)[i];if(v){mixed.push(v);found=true;}}
  if(!found)break;
 }
 return mixed;
}
export function pageCreatorVideos(videos,offset=0,limit=6){
 if(!Array.isArray(videos))return [];
 const start=Number.isInteger(offset)&&offset>=0?offset:0;
 const count=Number.isInteger(limit)?Math.max(1,Math.min(limit,24)):6;
 return videos.slice(start,start+count);
}
export const CREATOR_MIX_SOURCE=Object.freeze({
 id:'youtube-creator-mix',name:'GANA Tribe · Abbe · Julie · Samirah · Brittikitty · LANDing Autism · Becki · Creator Mix',
 kind:'Video · YouTube',feature:'Mixed channel uploads and saved creator videos',
 featureUrl:'https://www.youtube.com/@ganatribe/videos',
 official:'https://www.youtube.com/@ganatribe',
 focus:'Watch official public YouTube uploads from selected channels, with one optional player, a paginated mixed feed and user-added channel/video links.',
 details:'Official YouTube RSS provides only the latest uploads for channels with a verified channel ID. Historical channel videos and Community posts remain at YouTube; no ads, view counts, payment rights or complete archive are claimed.',
 youtubeMixedFeed:true
});

/* Independent original-source Quick Card. RSS adds recent uploads; the
 * published channel link is the only full historical YouTube archive. */
export const LANDING_AUTISM_SOURCE=Object.freeze({
 id:'landing-autism-youtube',name:'LANDing Autism · Full Channel',
 kind:'Video · YouTube',feature:'Watch channel videos and browse recent uploads',
 featureUrl:'https://www.youtube.com/@LANDingAutism/videos',
 official:'https://www.youtube.com/@LANDingAutism',
 focus:'Browse six source-identified public original videos, recent official YouTube RSS uploads and the publisher\'s complete public Videos tab. Playback starts only when tapped.',
 details:'Source-identified public YouTube video links, checked 2026-11-21. This is a partial indexed selection with keyless recent-upload refresh, not a complete historical video download or licensed rehost; YouTube owns playback restrictions.',
 youtubeMixedFeed:true,initialCreatorChannel:'landing'
});

export const AUTISM_OUT_LOUD_SOURCE=Object.freeze({
 id:'autism-out-loud-youtube',name:'Becki | Autism Out Loud Coach · Full Channel',
 kind:'Video · YouTube',feature:'Browse original Shorts and recent channel uploads',
 featureUrl:'https://www.youtube.com/@autismoutloudcoach/shorts',
 official:'https://www.youtube.com/@autismoutloudcoach',
 focus:'Watch the requested original video, browse 16 reviewed channel links and refresh recent uploads from the official YouTube feed. Search, load more or open the creator’s complete public channel.',
 details:'Original watch page, publisher channel ID and public uploads feed checked 2026-11-22. This card indexes a partial selection and recent uploads; the complete archive and Posts remain on YouTube. Playback depends on the publisher’s restrictions.',
 youtubeMixedFeed:true,initialCreatorChannel:'autism-out-loud',initialCreatorVideoId:'L9x-4pLKG50'
});

/* Dedicated publisher channel viewer. The official channel Videos tab hosts
 * the full catalog; our keyless RSS endpoint only fetches recent uploads. */
export const AGORA_SOU_MAE_SOURCE=Object.freeze({
 id:'agora-sou-mae-youtube',name:'AGORA SOU MÃE · Full Channel',
 kind:'Video · YouTube',feature:'Browse recent public uploads and the full original channel',
 featureUrl:'https://www.youtube.com/@agorasoumae173/videos',
 official:'https://www.youtube.com/@agorasoumae173',
 focus:'Browse a source-identified original YouTube video and recent public uploads, with search, pagination and tap-to-play in card. Open the publisher channel for the complete historical catalog.',
 details:'Official publisher and UC channel ID verified on 2026-11-22. The keyless public RSS feed loads only recent uploads, not every historic video, Short or Community post. No media downloads, paid API, affiliation, advertising or licensed rehosting are claimed.',
 youtubeMixedFeed:true,initialCreatorChannel:'agorasoumae'
});


/* Verified original uploader's public Videos tab, with a complete 18-link
 * observed starting snapshot and a separate keyless recent-upload refresh. */
export const DEKRET_SOURCE=Object.freeze({
 id:'dekret-youtube',name:'ДЕКРЕТ · Full Channel',
 kind:'Video · YouTube',feature:'Browse 18 original channel videos and recent uploads',
 featureUrl:'https://www.youtube.com/channel/UC_z0l4Wm8yai_rDlZ2iPjrg/videos',
 official:'https://www.youtube.com/channel/UC_z0l4Wm8yai_rDlZ2iPjrg',
 focus:'Watch the requested Кормить грудью легко video first, search or load more across all 18 publicly listed uploads, and open the original creator channel.',
 details:'All 18 video URLs were read from the publisher’s Videos tab on 2026-11-22. The optional RSS refresh may show newer uploads, but historical completeness is only as of that observation. Provider controls playback and embed restrictions. This is attributed discovery, not medical endorsement or permission to copy or monetize video.',
 youtubeMixedFeed:true,initialCreatorChannel:'dekret',initialCreatorVideoId:'BNMCCyjAb74'
});
