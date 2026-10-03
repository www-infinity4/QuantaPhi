const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const context={};vm.createContext(context);vm.runInContext(html.slice(html.indexOf('function overviewProse'),html.indexOf('function parseOverviewSections')),context);
test('malformed structured replies expose only the completed overview string',()=>{
 assert.equal(context.overviewProse('{"intent":"explain intent","red":{"overview":"Kenny Rogers was a singer."}}, "yellow":[]'), 'Kenny Rogers was a singer.');
 assert.equal(context.overviewProse('{"intent":"explain intent","red":{"overview"'), '');
 assert.equal(context.overviewProse('Natural overview prose.'),'Natural overview prose.');
 assert.equal(html.includes('<strong>Aim:</strong>'),false);
});
