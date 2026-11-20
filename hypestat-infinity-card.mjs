// One lazy, same-origin workspace shared by the homepage and full-size cards.
export const HYPESTAT_VIEWS=Object.freeze([
 ['records','Evidence'],['tor','Tor records'],['traffic','Traffic'],['google','Google + Gemini']
].map(view=>Object.freeze(view)));
export function hypestatWorkspacePath(value='records',embedded=false){
 const view=HYPESTAT_VIEWS.some(([id])=>id===value)?value:'records';
 return '/hypestat-infinity.html?view='+view+(embedded?'&embed=1':'');
}
export function mountHypeStatInfinityCard(root){
 if(!root||root.querySelector('[data-hypestat-component]'))return;
 const doc=root.ownerDocument;
 const node=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 if(!doc.getElementById('hypestatInfinityCardStyle')){
  const style=node('style');style.id='hypestatInfinityCardStyle';
  style.textContent='.hi-project{font:17px/1.65 system-ui,sans-serif;letter-spacing:.012em;color:#30243e;overflow-wrap:anywhere}.hi-project h2{font-size:clamp(1.55rem,4vw,2.1rem);line-height:1.2;margin:.25rem 0 .65rem}.hi-project p{color:#65536f;margin:.5rem 0 1rem}.hi-kicker{font-size:.75rem!important;font-weight:750;letter-spacing:.12em;color:#5f2c91!important}.hi-actions,.hi-links{display:flex;flex-wrap:wrap;gap:9px;align-items:center}.hi-project button,.hi-project a{min-height:46px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #bda2d3;border-radius:999px;padding:10px 16px;background:#f5edfc;color:#532885;font:650 16px/1.45 system-ui,sans-serif;text-decoration:none;cursor:pointer}.hi-project button[aria-pressed=true]{background:#5f2c91!important;color:white!important}.hi-project :is(button,a):focus-visible{outline:3px solid #8654de;outline-offset:3px}.hi-status{font-size:.88rem!important}.hi-frame{display:block;width:100%;height:min(78svh,900px);min-height:510px;border:1px solid #ddcdea;border-radius:18px;background:white;margin:14px 0}.hi-project [hidden]{display:none!important}.hi-links{margin-top:12px}.hi-links a{background:white}.hi-project .hi-close{margin-left:auto}@media(max-width:430px){.hi-actions>*{flex:1 1 135px}.hi-project .hi-close{margin-left:0}.hi-frame{min-height:500px}.hi-project{font-size:17px}}';
  doc.head.append(style);
 }
 const panel=node('div',undefined,'hi-project');panel.dataset.hypestatComponent='';
 panel.append(node('p','INFINITY® · WEB RESEARCH','hi-kicker'),node('h2','HypeStat Infinity'),node('p','Tor public records, source evidence, authorized traffic, and Google + Gemini tools in one workspace.'));
 const actions=node('div',undefined,'hi-actions'),status=node('p','Choose a view to open the workspace here.','hi-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const stage=node('div');stage.hidden=true;
 const links=node('div',undefined,'hi-links'),full=node('a','Open full page');full.href=hypestatWorkspacePath();full.target='_top';links.append(full);
 let frame=null,requested='records';const buttons=new Map();
 const selected=view=>{for(const [id,b] of buttons)b.setAttribute('aria-pressed',String(view===id));};
 function selectInFrame(){
  try{
   const tab=frame?.contentDocument?.getElementById('tab-'+requested);
   if(!tab)return false;
   tab.click();
   if(tab.getAttribute('aria-selected')!=='true')return false;
   selected(requested);status.textContent='Opened '+HYPESTAT_VIEWS.find(([id])=>id===requested)[1]+' in this Quick Card.';
   return true;
  }catch{return false;}
 }
 function open(value){
  requested=HYPESTAT_VIEWS.some(([id])=>id===value)?value:'records';
  full.href=hypestatWorkspacePath(requested);stage.hidden=false;close.hidden=false;
  if(frame&&selectInFrame())return;
  status.textContent='Loading the research workspace…';
  if(!frame){
   frame=node('iframe',undefined,'hi-frame');frame.title='HypeStat Infinity · Tor, traffic, Google and evidence workspace';frame.referrerPolicy='no-referrer';frame.dataset.hypestatFrame='';
   frame.addEventListener('load',()=>{if(!selectInFrame())status.textContent='Use the workspace navigation or Open full page if this view is unavailable.';});
   frame.src=hypestatWorkspacePath(requested,true);stage.append(frame);
  }else frame.src=hypestatWorkspacePath(requested,true);
 }
 for(const [id,label] of HYPESTAT_VIEWS){const b=node('button',label);b.type='button';b.dataset.hypestatView=id;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>open(id));buttons.set(id,b);actions.append(b);}
 const close=node('button','Minimize workspace','hi-close');close.type='button';close.hidden=true;close.addEventListener('click',()=>{stage.hidden=true;close.hidden=true;selected(null);status.textContent='Workspace minimized. Choose a view to continue; drafts stay in the open workspace.';});links.append(close);
 panel.append(actions,status,stage,links);root.replaceChildren(panel);
}
if(typeof document!=='undefined')mountHypeStatInfinityCard(document.getElementById('hypestatInfinityQuickCard'));
