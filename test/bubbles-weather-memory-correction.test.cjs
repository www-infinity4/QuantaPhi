const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('bubbles-ai.js','utf8');
const scope={};vm.createContext(scope);
vm.runInContext(source.slice(source.indexOf('function isWeatherTownReply('),source.indexOf('async function currentOwnerContext(')),scope);
test('location clarification accepts towns and ZIP without consuming conversational corrections',()=>{
 for(const value of ['Lovilia, Iowa','Albia','New York, NY','50150','50150-1234'])assert.equal(scope.isWeatherTownReply(value),true,value);
 for(const value of ['You should remember that.','Remember my town','I already told you','Play Infinity Radio','Open Media Star','No thanks','What do you remember?','Cancel','weather tomorrow'])assert.equal(scope.isWeatherTownReply(value),false,value);
});
test('the actual pending weather route uses the location guard',()=>{
 assert.match(source,/const townFollowup=.*isWeatherTownReply\(request\)/);
});
