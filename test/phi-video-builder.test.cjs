const test=require('node:test'),assert=require('node:assert/strict');
const {sceneAt,validateStoryboard}=require('../phi-video-builder.js');
test('video timeline selects source frames and retains the last shot at its endpoint',()=>{
 assert.equal(sceneAt(0,15,3).index,0);assert.equal(sceneAt(5,15,3).index,1);assert.equal(sceneAt(10,15,3).index,2);
 assert.deepEqual(sceneAt(15,15,3),{index:2,progress:1,per:5});assert.equal(sceneAt(-5,9,1).index,0);
 assert.throws(()=>sceneAt(15,0,3));assert.throws(()=>sceneAt(15,15,0));assert.throws(()=>sceneAt(15,15,7));
});
test('unsupported Oracle storyboard responses fail instead of becoming a fabricated ready video',()=>{
 assert.throws(()=>validateStoryboard({scenes:[]}));assert.throws(()=>validateStoryboard({scenes:[{visual:'a'}, {visual:'b'}, {visual:'c'}]}));
 const scenes=validateStoryboard({scenes:[{visual:' first ',caption:' A '},{visual:'second',caption:'B'},{visual:'third',caption:'C'}]});
 assert.equal(scenes[0].visual,'first');assert.equal(scenes[0].caption,'A');
});
