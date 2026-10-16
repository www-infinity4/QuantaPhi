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
 assert.match(js,/10000/);
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

test('Story card is before compact robot brain and detailed controls start hidden',()=>{
 const story=page.indexOf('id="infiniteBook"');
 const brain=page.indexOf('id="quantaAgentIterations"');
 const writer=page.indexOf('id="phiStoryWriter"');
 assert.ok(story>=0&&brain>story&&writer>brain,'Reads & Realms must remain the first content card');
 assert.match(page,/id="qai-brain-log"[^>]*role="log"/);
 assert.match(page,/id="qai-dashboard" hidden/);
 assert.match(page,/id="qai-more"[^>]*aria-expanded="false"/);
 assert.match(page,/id="qai-brain-status"/);
 assert.match(css,/#quantaAgentIterations #qai-dashboard\[hidden\]\{display:none!important\}/);
});
test('notification selection advances only with arrows, never on a timer',()=>{
 assert.doesNotMatch(js,/setInterval\(speakNext/);
 assert.match(js,/Previous notification/);assert.match(js,/Next notification/);
 assert.match(js,/log\.replaceChildren\(paintBrainEvent/);
 assert.match(js,/notifications\.move\(-1\)/);assert.match(js,/notifications\.move\(1\)/);
});
test('fresh receipts preserve the visible notification until arrow navigation',async()=>{
 const vm=require('node:vm');const {NotificationDeck}=await import('../brain-notifications.mjs');
 const notifications=new NotificationDeck(),log={children:[],replaceChildren(...rows){this.children=rows}},status={textContent:''};
 const context=vm.createContext({Date,notifications,log,status,notificationCount:{},previousNotification:{},nextNotification:{},$:id=>id.includes('status')?status:log,paintBrainEvent:e=>e,assembleBrain:x=>x,ui:()=>({})});
 const source=js.slice(js.indexOf(' function renderBrainNotification(){'),js.indexOf('\n\n function makeEvent'));
 vm.runInContext(source,context);
 const now=Date.now();context.rows=[{id:'first',when:new Date(now-1000).toISOString()}];vm.runInContext('updateBrain(rows)',context);
 context.rows=[{id:'new',when:new Date(now).toISOString()}];vm.runInContext('updateBrain(rows)',context);
 assert.equal(log.children.length,1);assert.equal(log.children[0].id,'first');
 notifications.move(-1);vm.runInContext('renderBrainNotification()',context);assert.equal(log.children[0].id,'new');
});
