/* Integra X tour: public, static, source-linked guide inside the existing X card.
 * No X/Integra login, API access, live agent, browser session or posting claim.
 */
const STEP_DATA=[
 {id:'discover',title:'Discover what people are discussing',body:'Explore X topics and public posts. Search results and trends depend on X access and may require signing in. This guide does not invent a live trend list.',url:'https://x.com/explore',link:'Explore X'},
 {id:'following',title:'Your Following timeline',body:'Once signed in on X, switch between available timeline views and follow accounts you choose. QuantaPhi cannot read your private Following feed without your account authorization.',url:'https://x.com/home',link:'Open your X timeline'},
 {id:'posting',title:'Write posts and replies',body:'Use the text editor below to prepare a post, then review and publish it on X. To reply, open a specific X post and use its reply controls; this card cannot silently publish as you.',url:'https://x.com/compose/post',link:'Open official X composer'},
 {id:'spaces',title:'Join live Spaces',body:'Spaces are live audio conversations. You can explore and listen through supported X experiences; hosting and speaking features depend on device and account permissions. This card does not claim an in-card live audio session.',url:'https://help.x.com/en/using-x/spaces',link:'X Spaces help'},
 {id:'communities',title:'Find Communities',body:'Communities let members talk around shared subjects. Joining, posting and moderation depend on each Community’s rules; viewing a Community is not the same as joining it.',url:'https://help.x.com/en/using-x/communities',link:'X Communities help'},
 {id:'developer',title:'Build with the X APIs',body:'Developers can build tools for supported public posts, account features and publishing. Each operation needs a registered app, supported endpoint, applicable access plan and—where required—user consent via OAuth. A web sign-in alone does not give QuantaPhi API permission.',url:'https://docs.x.com/',link:'Official X developer documentation'},
 {id:'integra',title:'Meet Integra on X',body:'@IntegraAI is the owner-designated guide account. This is a prewritten tour, not a signed-in or live response from that account. Cloud-browser reads and account-authorized replies are a separate unfinished integration; visitors never inherit an owner browser session.',url:'https://x.com/IntegraAI',link:'Visit @IntegraAI on X'}
];
export const INTEGRA_X_TOUR_STEPS=Object.freeze(STEP_DATA.map(step=>Object.freeze({...step})));
export function xTourStep(index){
 const n=Number(index);
 return INTEGRA_X_TOUR_STEPS[Number.isInteger(n)&&n>=0&&n<INTEGRA_X_TOUR_STEPS.length?n:0];
}
const element=(tag,cls,text)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;
 return n;
};
export function mountIntegraXTour(root){
 if(!root||typeof document==='undefined')return null;
 const section=element('section','qcx-integra-tour');
 section.setAttribute('aria-label','Explore X with Integra');
 const title=element('h3','qcx-integra-heading','Explore X with Integra');
 const notice=element('p','qcx-integra-note','Interactive, source-linked tour · not a live @IntegraAI chat or connected X account.');
 const tools=element('div','qcx-integra-choose');
 const label=element('label','qcx-integra-label','Choose a topic');
 const select=element('select','qcx-integra-select');
 select.setAttribute('aria-label','Choose an X tour topic');
 INTEGRA_X_TOUR_STEPS.forEach(step=>{
  const option=element('option','',step.title);option.value=step.id;select.append(option);
 });
 label.append(select);tools.append(label);
 const panel=element('div','qcx-integra-step');
 const position=element('p','qcx-integra-position','');
 const heading=element('h4','qcx-integra-title','');
 const body=element('p','qcx-integra-body','');
 const link=element('a','qcx-integra-source','');
 link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
 const navigation=element('div','qcx-integra-nav');
 const previous=element('button','qcx-integra-button','Previous');
 const next=element('button','qcx-integra-button','Next');
 previous.type='button';next.type='button';
 const live=element('span','qcx-integra-sr');
 live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');
 navigation.append(previous,next);
 panel.append(position,heading,body,link,navigation,live);
 const foot=element('p','qcx-integra-foot','Live Integra cloud-browser replies and X account permissions: not connected to this public tour. No social message is sent by these controls.');
 let index=0;
 const show=i=>{
  index=Math.min(Math.max(Number(i)||0,0),INTEGRA_X_TOUR_STEPS.length-1);
  const step=xTourStep(index);
  select.value=step.id;
  position.textContent='STEP '+(index+1)+' OF '+INTEGRA_X_TOUR_STEPS.length;
  heading.textContent=step.title;body.textContent=step.body;
  link.href=step.url;link.textContent=step.link+' ↗';
  previous.disabled=index===0;next.disabled=index===INTEGRA_X_TOUR_STEPS.length-1;
  live.textContent=step.title;
 };
 select.addEventListener('change',()=>show(INTEGRA_X_TOUR_STEPS.findIndex(x=>x.id===select.value)));
 previous.addEventListener('click',()=>show(index-1));
 next.addEventListener('click',()=>show(index+1));
 show(0);section.append(title,notice,tools,panel,foot);root.append(section);return section;
}
