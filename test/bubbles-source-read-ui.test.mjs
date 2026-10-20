import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Bubbles reads named public README through real source receipt before generic conversational model',async()=>{
 const src=await readFile(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const first=src.indexOf("const sourceReadRequested=");
 const generic=src.indexOf("if(!embedded&&/\\bgithub\\b/i.test(request))");
 assert.ok(first>0&&generic>first,'verified source-read route must precede generic GitHub discovery');
 const part=src.slice(first,generic);
 assert.match(part,/receipt\?\.tool!=='github\.read_file'/);
 assert.match(part,/receipt\?\.sourceReadVerified!==true/);
 assert.match(part,/result\.sourceUrl/);
 assert.match(part,/bubblesFetch\(AI/);
 assert.match(part,/Bubbles · github\.read_file · verified/);
 assert.match(part,/No source content or repository change is being claimed/);
 assert.doesNotMatch(part,/submitRepositoryWork|startRunner|requestRunner|createGithubRepository/);
});
