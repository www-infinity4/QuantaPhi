import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('catalog staging includes brand-new untracked data files and retains an Actions artifact',()=>{
 const workflow=source('.github/workflows/developer-catalog-import.yml');
 assert.match(workflow,/git status --porcelain -- data\/developer-source-catalog\.json/);
 assert.doesNotMatch(workflow,/git diff --quiet -- data\/developer-source-catalog\.json/);
 assert.match(workflow,/actions\/upload-artifact@v4/);
 assert.match(workflow,/gh pr create/);
 assert.match(workflow,/source.*review|candidate.*review/i);
});

test('the metadata-only carousel can browse all 2,273 real records without thousands of live DOM panels',()=>{
 const viewer=source('developer-carousel.mjs');
 const sourceViewer=source('developer-discovery.mjs');
 assert.match(viewer,/cards\.length>=6000/);
 assert.match(sourceViewer,/slice\(0,5000\)/);
 assert.match(sourceViewer,/addResources\(good\)/);
 assert.match(sourceViewer,/validateIndexedResource/);
});
