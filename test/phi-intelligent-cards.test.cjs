const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../phi-image-learning.js'),'utf8');
function rig(){
 const saved=new Map(),listeners=new Map(),events=[];
 const window={
  sessionStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
  addEventListener:(name,fn)=>listeners.set(name,fn),
  removeEventListener:name=>listeners.delete(name),
  dispatchEvent:event=>{events.push(event);listeners.get(event.type)?.(event)}
 };
 const CustomEvent=class{constructor(type,{detail}){this.type=type;this.detail=detail}};
 vm.runInNewContext(source,{window,document:{readyState:'loading',addEventListener(){}},CustomEvent,localStorage:{getItem:()=>null,setItem(){}},Date});
 return {window,saved,events};
}
test('radio-kit research context reaches image prompt and defaults to useful art rather than a logo',()=>{
 const {window,events}=rig(),v=window.PhiCardContext.publish({topic:'radio clubhouse kits',sourceCard:'search'});
 assert.equal(v.topic,'radio clubhouse kits');assert.equal(events.at(-1).type,'phi:card-context:update');
 assert.equal(window.PhiCardContext.getSnapshot().sourceCard,'search');
 const helper=window.PhiImageSuggestions;
 assert.equal(helper.ranked(v.topic)[0],'Kit Illustration');
 assert.equal(helper.renderMode('Kit Illustration'),'Image');
 assert.equal(helper.renderMode('Vintage Catalog Ad'),'Advertisement');
 assert.match(helper.promptFor(v.topic,'Kit Illustration'),/coils|tuning/i);
 assert.ok(helper.modes.some(x=>x.label==='Logo / Wordmark'));
});
test('a different research subject gets a different prefilling priority and legacy types remain supported',()=>{
 const {window}=rig(),p=window.PhiImageSuggestions;
 assert.equal(p.ranked('Pink Floyd music')[0],'Cover Art');
 assert.equal(p.ranked('helium element')[0],'Exploded Parts Diagram');
 for(const legacy of ['Image','Trading Card','Advertisement','Billboard','Poster','Cover Art'])assert.equal(p.renderMode(legacy),legacy);
 assert.match(p.promptFor('radio clubhouse kits','Trading Card'),/collector trading card/i);
});
test('context is bounded, cleared and expires with no email or payment-like term persisted',()=>{
 const {window,saved,events}=rig();
 assert.equal(window.PhiCardContext.publish({topic:'owner@example.com'}),null);
 assert.equal(window.PhiCardContext.publish({topic:'1234567890123456'}),null);
 const rec=window.PhiCardContext.publish({topic:'scientific radio projects',sourceCard:'story',summary:'Short research summary'});
 assert.equal(rec.sourceCard,'story');
 assert.ok(JSON.stringify([...saved]).length<1000);
 const stale={...rec,expiresAt:Date.now()-1};saved.set('phi_card_context_v1',JSON.stringify(stale));
 assert.equal(window.PhiCardContext.getSnapshot(),null);
 window.PhiCardContext.publish({topic:'helium educational project'});
 window.PhiCardContext.clear();
 assert.equal(window.PhiCardContext.getSnapshot(),null);
 assert.equal(events.at(-1).detail,null);
});
