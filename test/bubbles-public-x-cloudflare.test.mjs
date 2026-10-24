import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublicProfile,classifyPost} from '../workers/bubbles-public-x/worker.mjs';
const x=(id,body,author='YahooPingcwlz')=>
 '<div role="link" data-href="/'+author+'/status/'+id+'"><a href="/'+author+'/status/'+id+'">Link</a>'+
 '<article><a href="/'+author+'">'+author+'</a><div class="max-w-full text-body whitespace-pre-wrap wrap-break-word" dir="auto"><span>'+body+'</span></div></article></div>';
test('parses exact owner public profile article and decodes entities',()=>{
 const html=x('2113352129427730641','Build a VAMWorld card &amp; add coins. #bubbles');
 const p=parsePublicProfile(html);
 assert.equal(p.length,1);
 assert.equal(p[0].id,'2113352129427730641');
 assert.equal(p[0].text,'Build a VAMWorld card & add coins. #bubbles');
 assert.equal(p[0].url,'https://x.com/YahooPingcwlz/status/2113352129427730641');
});
test('skips other-account quote and duplicates',()=>{
 const owner=x('2113352129427730641','Fix QuantaPhi');
 const outsider=x('2113352129427730642','Build on others account #bubbles','OtherUser');
 assert.deepEqual(parsePublicProfile(owner+owner+outsider).map(x=>x.id),['2113352129427730641']);
});
test('discovers untagged work ideas and tagged posts without treating everything as commands',()=>{
 assert.equal(classifyPost('We should add a Heritage coin card to QuantaPhi'),'possible');
 assert.equal(classifyPost('Please add this #bubbles'),'tagged');
 assert.equal(classifyPost('Bubbles sounds interesting'),'context');
 assert.equal(classifyPost('Had lunch today'),'other');
});
test('cannot obtain posts from static login wall',()=>{
 assert.equal(parsePublicProfile('<p>Log in to X</p>').length,0);
});
