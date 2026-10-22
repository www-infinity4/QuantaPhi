import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {browserClickExpression,browserReadExpression} from '../workers/bubbles-tools/browser-controls.mjs';

function fixture(items){
 const controls=items.map((attrs,i)=>{
  const el={
   tagName:attrs.tag||'BUTTON',type:attrs.type||'button',innerText:attrs.text||'',textContent:attrs.text||'',
   disabled:attrs.disabled||false,clickCount:0,
   getAttribute(name){return attrs[name]??null},
   getClientRects(){return attrs.hidden?[]:[{width:80}]},
   querySelector(q){return q==='img[alt],svg title'&&attrs.icon?{
     textContent:attrs.icon,getAttribute:()=>attrs.icon
    }:null;},
   closest(){return attrs.context?{querySelector:()=>({textContent:attrs.context})}:null},
   click(){this.clickCount++;if(attrs.after)doc.body.innerText=attrs.after;}
  };
  return el;
 });
 const doc={body:{innerText:'Before'},title:'Bubbles test',
  getElementById:()=>null,querySelectorAll:()=>controls};
 return {doc,controls,run:(script)=>vm.runInNewContext(script,{document:doc,location:{href:'https://quantaphi.org/bubbles.html'}},
  {timeout:700})};
}
test('read Chrome DOM including accessible icon controls without disclosing URLs',()=>{
 const f=fixture([{text:'View Stories',context:'Story Writer'},
   {'aria-label':'Play episode',icon:'triangle',text:'',context:'Media Star'},
   {text:'Buy Now',href:'https://payment.example/checkout'}]);
 const result=f.run(browserReadExpression);
 assert.equal(result.controls[0].label,'View Stories');
 assert.equal(result.controls[1].label,'Play episode');
 assert.equal(result.controls[1].context,'Media Star');
 assert.equal(result.controls[2].label,'Buy Now');
 assert.equal(result.text,'Before');
 assert.equal(result.controls.some(x=>Object.hasOwn(x,'href')),false);
});
test('click visible named button and report dispatch, then observe real DOM change separately',()=>{
 const f=fixture([{text:'View Stories',after:'Stories loaded'}]);
 const before=f.run(browserReadExpression);
 const click=f.run(browserClickExpression('View Stories'));
 const after=f.run(browserReadExpression);
 assert.equal(click.ok,true);assert.equal(click.clickDispatched,true);
 assert.equal(click.effectVerified,false);
 assert.equal(f.controls[0].clickCount,1);
 assert.equal(before.text,'Before');
 assert.equal(after.text,'Stories loaded');
});
test('icon-only media button is findable by aria label or title',()=>{
 const f=fixture([{'aria-label':'Play',context:'Pink Floyd track'},{title:'Pause music',text:''}]);
 assert.equal(f.run(browserClickExpression('Play')).ok,true);
 assert.equal(f.run(browserClickExpression('Pause music')).ok,true);
 assert.equal(f.controls[0].clickCount,1);assert.equal(f.controls[1].clickCount,1);
});
test('ambiguous Play targets do not silently choose the wrong card',()=>{
 const f=fixture([{'aria-label':'Play',context:'Episode 1'},{'aria-label':'Play',context:'Episode 2'}]);
 const ambiguous=f.run(browserClickExpression('Play'));
 assert.equal(ambiguous.ok,false);assert.equal(ambiguous.error,'ambiguous_control');
 assert.equal(f.controls[0].clickCount+f.controls[1].clickCount,0);
 const exact=f.run(browserClickExpression('Play Episode 2'));
 assert.equal(exact.ok,true);assert.equal(f.controls[1].clickCount,1);
});
test('unsafe approvals, disabled or hidden elements cannot be clicked',()=>{
 for(const attrs of [{text:'Buy Now'},{text:'Authorize App'},{text:'Submit',type:'submit'},
  {text:'Sign out'},{text:'Harmless',href:'javascript:alert(1)'},{text:'Play',disabled:true},
  {text:'Play',hidden:true}]){
  const f=fixture([attrs]);
  const x=f.run(browserClickExpression(attrs.text));
  assert.equal(x.ok,false,attrs.text);
  assert.equal(f.controls[0].clickCount,0);
 }
});
test('missing controls show bounded candidate labels instead of invented taps',()=>{
 const f=fixture([{text:'View Stories'},{text:'Play track'}]);
 const r=f.run(browserClickExpression('Download song'));
 assert.equal(r.ok,false);assert.equal(r.error,'control_not_found');
 assert.deepEqual(Array.from(r.suggestions),['View Stories','Play track']);
});
