import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildManifest, classifyLine } from '../gitcoin/line-receipts.mjs';

const sha='a'.repeat(40);
const diff=[
 'diff --git a/src/site.js b/src/site.js',
 'new file mode 100644',
 '--- /dev/null',
 '+++ b/src/site.js',
 '@@ -0,0 +1,7 @@',
 '+const price = 12;',
 '+const price = 12;',
 '+// copyright example',
 '+',
 '+export function total(x) {',
 '+  return x + price;',
 '+}',
 'diff --git a/README.md b/README.md',
 '--- /dev/null',
 '+++ b/README.md',
 '@@ -0,0 +1 @@',
 '+This is documentation',
 'diff --git a/keys/.env b/keys/.env',
 '--- /dev/null',
 '+++ b/keys/.env',
 '@@ -0,0 +1 @@',
 '+TOKEN=not-a-real-secret',
 'diff --git a/src/note.py b/src/note.py',
 '--- a/src/note.py',
 '+++ b/src/note.py',
 '@@ -2,2 +2,3 @@',
 ' keep_old()',
 '-remove_old()',
 '+print("ok")',
 '+run_tests()',
 ].join('\n');
const source={repo:'www-infinity4/demo',commit:sha,intent:'website',builderClaim:'human',githubLoginClaim:'someone'};

test('each added line receives a stable distinct provenance receipt, including excluded lines',()=>{
 const x=buildManifest(diff,source);
 assert.equal(x.version,1);
 assert.equal(x.lines.length,11);
 assert.equal(new Set(x.lines.map(l=>l.id)).size,11);
 assert.equal(x.lines[0].line_number,1);
 assert.equal(x.lines[1].line_number,2);
 assert.equal(x.lines.at(-1).line_number,4);
 assert.equal(x.lines.at(-1).path,'src/note.py');
 assert.equal(x.lines[0].content_sha256.length,64);
 assert.equal(x.lines[0].content,undefined);
 assert.equal(x.lines[2].eligible,false);
 assert.equal(x.lines[2].reason,'comment_only');
 assert.equal(x.lines[3].eligible,false);
 assert.equal(x.lines[3].reason,'blank_line');
 assert.equal(x.lines[7].reason,'non_code_file');
 assert.equal(x.lines[8].reason,'sensitive_path');
 assert.equal(x.lines[1].eligible,false);
 assert.equal(x.lines[1].reason,'duplicate_in_commit');
 assert.equal(x.summary.eligible,5);
 assert.equal(x.summary.excluded,6);
 assert.equal(x.status,'provisional_not_minted');
 assert.deepEqual(x,buildManifest(diff,source));
});

test('changing provenance changes receipt identity and metadata type but not line hashes',()=>{
 const a=buildManifest(diff,source);
 const b=buildManifest(diff,{...source,commit:'b'.repeat(40),intent:'test',builderClaim:'bubbles'});
 assert.notEqual(a.lines[0].id,b.lines[0].id);
 assert.equal(a.lines[0].content_sha256,b.lines[0].content_sha256);
 assert.equal(b.lines[0].git_type,'git:test');
 assert.equal(b.builder_claim,'bubbles');
});

test('no arbitrary values, fabricated commits, or truncated diffs',()=>{
 assert.throws(()=>buildManifest(diff,{...source,commit:'oops'}));
 assert.throws(()=>buildManifest(diff,{...source,intent:'billion-dollar-code'}));
 assert.throws(()=>buildManifest(diff,{...source,repo:'../../../escape'}));
 assert.throws(()=>buildManifest('garbage',source));
});

test('repetitive filler, minified vendors and lockfiles cannot become eligible receipts',()=>{
 assert.equal(classifyLine('let q = 123123123123123123123123123123;', 'src/demo.js').eligible,true);
 assert.equal(classifyLine('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'src/demo.js').eligible,false);
 assert.equal(classifyLine('const x = 1;', 'node_modules/pkg/test.js').eligible,false);
 assert.equal(classifyLine('const x = 1;', 'src/bundle.min.js').eligible,false);
 assert.equal(classifyLine('const x = 1;', 'package-lock.json').eligible,false);
});

test('HTML structural closing lines such as Moltnook guestbook </a> are real provisional code candidates',()=>{
 const sourceHtml={...source,commit:'c'.repeat(40)};
 const html=['diff --git a/guestbook/index.html b/guestbook/index.html',
  '--- /dev/null','+++ b/guestbook/index.html','@@ -0,0 +1,5 @@',
  '+<a href="../index.html" aria-label="Moltnook home">',
  '+</a>',
  '+<section aria-label="Second link">',
  '+</a>',
  '+<p>Other content</p>'].join('\\n');
 const manifest=buildManifest(html,sourceHtml);
 assert.equal(manifest.lines.length,5);
 assert.equal(manifest.lines[1].eligible,true,'a real closing anchor is not discarded just for short length');
 assert.equal(manifest.lines[3].eligible,true,'separate structural anchor in the same source file remains traceable');
 assert.notEqual(manifest.lines[1].id,manifest.lines[3].id);
 assert.equal(manifest.lines[1].content_sha256,manifest.lines[3].content_sha256);
});
