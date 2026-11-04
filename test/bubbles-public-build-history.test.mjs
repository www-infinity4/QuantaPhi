import test from 'node:test';
import assert from 'node:assert/strict';
import {isBuildHistoryQuestion,readRecentBuildHistory} from '../bubbles-public-build-history.mjs';

const now=new Date('2026-11-04T02:42:00Z');
const commit=(sha,date,title)=>({sha,commit:{committer:{date},message:title},html_url:'https://github.com/www-infinity4/QuantaPhi/commit/'+sha});
const pr=(number,date,state='open')=>({number,title:'Work item '+number,html_url:'https://github.com/www-infinity4/QuantaPhi/pull/'+number,updated_at:date,draft:false,state});
const response=data=>({ok:true,json:async()=>data});

test('only read-only recent-work questions fetch build history',()=>{
 assert.equal(isBuildHistoryQuestion('Bubbles, what work was added tonight?'),true);
 assert.equal(isBuildHistoryQuestion('Show my recently merged work'),true);
 assert.equal(isBuildHistoryQuestion('Continue engineering and merging to pages'),false);
 assert.equal(isBuildHistoryQuestion('Build a new music player'),false);
});

test('today uses Central Time and reports commits separately from open PRs',async()=>{
 const sha='a'.repeat(40),old='b'.repeat(40);
 const fetcher=async url=>response(String(url).includes('/pulls?')?
   [pr(100, '2026-11-04T01:00:00Z'),pr(99,'2026-11-02T20:00:00Z')]:
   [commit(sha,'2026-11-04T02:19:00Z','Merge pull request #123'),commit(old,'2026-11-02T23:20:00Z','Old commit')]);
 const result=await readRecentBuildHistory({question:'what changed tonight',fetcher,now});
 assert.match(result,/Merge pull request #123/);
 assert.match(result,/commit\/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
 assert.match(result,/PR #100/);
 assert.doesNotMatch(result,/PR #99|Old commit/);
 assert.match(result,/not proof of Cloudflare deployment/i);
 assert.match(result,/not a memory or authorship record/i);
});

test('a GitHub outage never becomes a claim that work is finished or absent',async()=>{
 await assert.rejects(()=>readRecentBuildHistory({question:'show recent builds',fetcher:async()=>({ok:false,status:403}),now}),/unavailable/);
});
