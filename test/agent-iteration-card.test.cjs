const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('quanta-agent-iterations.js','utf8');
const css=fs.readFileSync('quanta-agent-iterations.css','utf8');
test('QuantaPhi has a mounted agent card without replacing existing search and wallet sections',()=>{
 const ids=['quantaAgentIterations','qai-jobs-count','qai-signal-count','qai-updated','qai-refresh','qai-watch','qai-skills','qai-events','qai-jobs','qai-last-event','qai-reset','qai-source'];
 for(const id of ids)assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/id="q"[^>]*autocomplete="off"/);
 assert.match(page,/id="infiniteBook"/);
 assert.match(page,/id="phiStoryWriter"/);
 assert.match(page,/id="phiImageBuilder"/);
 assert.match(page,/quanta-agent-iterations\.css\?v=/);
 assert.match(page,/quanta-agent-iterations\.js\?v=/);
});
test('verified agent evidence comes from Moltnook and is never invented as a completed task',()=>{
 assert.match(js,/activity\/iterations\.json/);
 assert.match(js,/activity\/repair-report\.json/);
 assert.match(js,/Array\.isArray\(payload\.jobs\)/);
 assert.match(js,/Array\.isArray\(payload\.messages\)/);
 assert.match(js,/safeUrl\(x\.url\)/);
 assert.match(js,/https:\/\/quantaphi\.org\/moltnook\//);
 assert.match(js,/45000/);
 assert.doesNotMatch(js,/Math\.random\(/);
 assert.doesNotMatch(js,/document\.write\(/);
});
test('skill learning retains aggregate categories locally without uploading search input',()=>{
 assert.match(js,/const STORE='quantaphi:agent-learning-local:v1'/);
 assert.match(js,/localStorage\.setItem\(STORE,JSON\.stringify\(local\)\)/);
 assert.match(js,/const raw=String\(input\|\|''\)\.trim\(\)/);
 assert.match(js,/local\.counts\[key\]=/);
 assert.match(js,/WORKFLOWS/);
 assert.match(js,/local\.flows\[pair\]=/);
 assert.match(js,/stories>visuals/);
 assert.match(js,/chemistry>visuals/);
 assert.match(js,/qai-watch/);
 assert.match(js,/qai-reset/);
 assert.doesNotMatch(js,/fetch\([^)]*raw/);
 assert.doesNotMatch(js,/JSON\.stringify\(.*search\.value/);
 assert.match(js,/issues\/new\?title=/);
});
test('accessible animation and consistent card size for mobile',()=>{
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/#quantaAgentIterations/);
 assert.match(css,/@keyframes qai-scroll/);
 assert.match(css,/:focus-visible/);
});
