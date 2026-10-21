import test from 'node:test';
import assert from 'node:assert/strict';
import {RECORD_B_COMMANDS,recordBState,mountRecordBCard} from '../recordb-card.mjs';
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.hidden=false;this.disabled=false;this.handlers={};this.textContent='';}
 append(...nodes){for(const node of nodes)this.children.push(node);}
 insertBefore(node,before){const index=this.children.indexOf(before);if(index<0)throw Error('missing anchor');this.children.splice(index,0,node);}
 setAttribute(name,value){this[name]=value;}
 addEventListener(type,fn){this.handlers[type]=fn;}
 click(){this.handlers.click?.();}
}
const document={createElement:tag=>new Element(tag)};
test('RecordB uses Android-recognized commands, never silent background capture',()=>{
 assert.deepEqual(Object.values(RECORD_B_COMMANDS),['record screen','pause screen recording','resume screen recording','stop recording']);
 assert.equal(recordBState({},false).canStart,false);
 assert.match(recordBState({},false).status,/Android app required/);
 assert.match(recordBState({screenState:'Waiting for Android approval'},true).status,/Waiting for Android/);
});
test('RecordB card is in-chat and sends only user-tapped commands',()=>{
 const container=new Element(),messages=new Element(),calls=[];
 container.append(messages);
 const view=mountRecordBCard({document,container,before:messages,native:true,enqueue:command=>{calls.push(command);return true;}});
 assert.equal(container.children[0],view.element);
 assert.deepEqual(calls,[],'opening a card cannot start recording');
 assert.equal(view.buttons.start.hidden,false);
 view.buttons.start.click();
 assert.deepEqual(calls,['record screen']);
 const ongoing=view.update({screenActive:true,screenRecording:true,soundActive:true});
 assert.equal(ongoing.canStop,true);
 assert.equal(view.buttons.pause.hidden,false);
 assert.equal(view.buttons.start.hidden,true);
 view.buttons.pause.click();
 view.update({screenActive:true,screenRecording:true,screenPaused:true});
 assert.equal(view.buttons.resume.hidden,false);
 view.buttons.resume.click();view.buttons.stop.click();
 assert.deepEqual(calls,['record screen','pause screen recording','resume screen recording','stop recording']);
});
test('Native recorder state is authoritative, including save/failure',()=>{
 assert.equal(recordBState({screenActive:true,screenPaused:true},true).canResume,true);
 assert.equal(recordBState({screenState:'Saving video to Movies/Bubbles'},true).canStart,false);
 assert.match(recordBState({screenState:'Saved screen MP4 to Movies/Bubbles'},true).status,/Saved/);
 assert.match(recordBState({screenState:'Gallery export failed'},true).status,/problem/i);
});
