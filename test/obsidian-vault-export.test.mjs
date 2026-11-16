import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {extractTickets,exportIndexToVault} from '../scripts/obsidian-vault-export.mjs';

const sample=`# Open and unfinished work — agent routing index
| Project | Canonical issue | Linked source | Dot | Progress | Sessions | Next verified action |
| --- | --- | --- | --- | --- | --- | --- |
| Continuity Builder / agent orchestration | [#1908](https://github.com/www-infinity4/QuantaPhi/issues/1908) | [PR #1911](https://github.com/www-infinity4/QuantaPhi/pull/1911) | 🟡 | Source staged; not deployed | 2 / unknown | Exact-head CI and review |
| Avatar AI | [#1923](https://github.com/www-infinity4/QuantaPhi/issues/1923) | [PR #1924](https://github.com/www-infinity4/QuantaPhi/pull/1924) | 🔴 | Unverified | unknown | Source review |
| Unrelated repo | [#7](https://github.com/other/repo/issues/7) | - | 🟡 | - | - | - |
`;

test('extracts only canonical QuantaPhi issue links as unverified source pointers',()=>{
 const t=extractTickets(sample);
 assert.deepEqual(t.map(x=>x.id),[1908,1923]);
 assert.equal(t[0].url,'https://github.com/www-infinity4/QuantaPhi/issues/1908');
 assert.equal(t[0].progress,'Source staged; not deployed');
 assert.equal(t[0].next,'Exact-head CI and review');
});

test('creates Obsidian vault with bounded hot context, provenance, and no forged runtime receipts',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'qb-'));
 try {
  const root=path.join(tmp,'repo'),vault=path.join(tmp,'my-vault');
  await mkdir(path.join(root,'work','unfinished'),{recursive:true});
  await writeFile(path.join(root,'work','unfinished','INDEX.md'),sample);
  const r=await exportIndexToVault({root,vault,hotLimit:1});
  assert.equal(r.ticketCount,2);
  assert.match(await readFile(path.join(vault,'hot.md'),'utf8'),/\[\[Tickets\/TICKET-1908\|/);
  assert.doesNotMatch(await readFile(path.join(vault,'hot.md'),'utf8'),/TICKET-1923/);
  const note=await readFile(path.join(vault,'Tickets','TICKET-1908.md'),'utf8');
  assert.match(note,/review_status: unverified_source_pointer/);
  assert.match(note,/https:\/\/github.com\/www-infinity4\/QuantaPhi\/issues\/1908/);
  assert.match(note,/Not proof of CI, approval, merge, deployment, or Android acceptance/);
  assert.match(await readFile(path.join(vault,'Projects','QuantaPhi.md'),'utf8'),/existing signed runner/i);
 }finally{await rm(tmp,{recursive:true,force:true})}
});

test('never overwrites a user-edited Obsidian note',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'qb-'));
 try{
  const root=path.join(tmp,'repo'),vault=path.join(tmp,'my-vault');
  await mkdir(path.join(root,'work','unfinished'),{recursive:true});
  await writeFile(path.join(root,'work','unfinished','INDEX.md'),sample);
  await exportIndexToVault({root,vault});
  const own=path.join(vault,'Tickets','TICKET-1908.md');
  await writeFile(own,'# My own thoughts\n', 'utf8');
  await assert.rejects(exportIndexToVault({root,vault}),/Refusing to replace a non-generated note/);
  assert.equal(await readFile(own,'utf8'),'# My own thoughts\n');
 }finally{await rm(tmp,{recursive:true,force:true})}
});

test('refuses writing a vault inside the public GitHub checkout',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'qb-'));
 try{
  await mkdir(path.join(tmp,'work','unfinished'),{recursive:true});
  await writeFile(path.join(tmp,'work','unfinished','INDEX.md'),sample);
  await assert.rejects(exportIndexToVault({root:tmp,vault:path.join(tmp,'second-brain')}),/outside the source repository/);
  await assert.rejects(stat(path.join(tmp,'second-brain')),/ENOENT/);
 }finally{await rm(tmp,{recursive:true,force:true})}
});

test('fails closed rather than generating false memories from an empty source',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'qb-'));
 try{
  await mkdir(path.join(tmp,'work','unfinished'),{recursive:true});
  await writeFile(path.join(tmp,'work','unfinished','INDEX.md'),'No verified issue rows.');
  await assert.rejects(exportIndexToVault({root:tmp,vault:tmp+'-vault'}),/No canonical tickets/);
 }finally{await rm(tmp,{recursive:true,force:true});await rm(tmp+'-vault',{recursive:true,force:true})}
});

test('exports all six supporting repositories and the upstream vault foundation',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'qb-'));
 try {
  const root=path.join(tmp,'repo'),vault=path.join(tmp,'vault');
  await mkdir(path.join(root,'work','unfinished'),{recursive:true});
  await writeFile(path.join(root,'work','unfinished','INDEX.md'),sample);
  await exportIndexToVault({root,vault});
  const collection=await readFile(path.join(vault,'Sources','Obsidian-Collection.md'),'utf8');
  for(const name of ['kepano/kepano-obsidian','obsidianmd/obsidian-skills','Ar9av/obsidian-wiki','groepl/Obsidian-Templates','MaggieAppleton/digital-gardeners','obsidianmd/jsoncanvas','obsidianmd/obsidian-releases']) {
   assert.ok(collection.includes('https://github.com/'+name),'Missing upstream '+name);
  }
  assert.match(collection,/reference only, not proof of installation/i);
  assert.match(await readFile(path.join(vault,'index.md'),'utf8'),/\[\[Sources\/Obsidian-Collection\]\]/);
 }finally{await rm(tmp,{recursive:true,force:true})}
});
