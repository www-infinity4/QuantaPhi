/* Separate, ad-free 21+ external-source Quick Card.
 * No media requests, player, tracking, monetization or third-party widgets.
 * A visitor's 21+ declaration is browsing acknowledgment, not age verification. */
export const ADULT_VIDEO_SOURCE=Object.freeze({
 id:'xgroovy-205466',
 category:'21+ external source',
 kind:'source-link',
 title:'Submitted external video',
 url:'https://xgroovy.com/gifs/205466/filled-my-mouth-with-cum/'
});
export function sourceForAdultBrowse(acknowledged=false){
 return acknowledged===true?ADULT_VIDEO_SOURCE:null;
}

const root=globalThis.document?.getElementById('adultVideoCard');
if(root){
 const enter=root.querySelector('#adultVideoEnter');
 const close=root.querySelector('#adultVideoClose');
 const content=root.querySelector('#adultVideoContent');
 const link=root.querySelector('#adultVideoOpen');
 const status=root.querySelector('#adultVideoStatus');
 function hide(){
  content.hidden=true;
  link.removeAttribute('href');
  close.hidden=true;
  enter.hidden=false;
  status.textContent='External links are hidden until you confirm 21+ browsing.';
 }
 hide();
 enter.addEventListener('click',()=>{
  const source=sourceForAdultBrowse(true);
  if(!source)return;
  link.href=source.url;
  content.hidden=false;
  enter.hidden=true;
  close.hidden=false;
  status.textContent='Source link available for this visit. This is not verified-age access.';
 });
 close.addEventListener('click',()=>{
  hide();
  enter.focus();
 });
}
