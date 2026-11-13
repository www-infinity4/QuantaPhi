import {projectLegacyJob} from './continuity/owner/client-model.mjs';

/* Complete Me AI: one owner-authorized project on the EXISTING Brain ticket
 * intake and Moltnook signed runner. No private state, new scheduler,
 * approval shortcut or autonomous browser-side execution.
 */
const REPOSITORY=/^www-infinity4\/[A-Za-z0-9_.-]{1,100}$/;
const VERIFIED_SHA=/^[a-f0-9]{40}$/i;
const TICKET=/^IW-\d{8}-[0-9A-F]{8}$/;
const DONE=new Set(['merged_verified','deployed_verified','complete']);
const OWNER_BLOCK=/\b(?:owner_approval_required|owner_decision_required|owner_input_required|owner_authorization_required|approval_required|permission_required|permission_denied|security_review_required|security_hold)\b/i;
const limits={goal:1600,first:3000,second:3000,acceptance:700};
const normalize=value=>value.toLowerCase().replace(/\s+/g,' ');

export function completeMeCommand(input){
 if(typeof input!=='string'||input.length>2200)return null;
 const match=/^complete me ai(?:\s*[-–—:]\s*([\s\S]*))?$/i.exec(input.trim());
 return match?{goal:(match[1]||'').trim()}:null;
}

function validateProject(raw){
 const p={
  repository:typeof raw?.repository==='string'?raw.repository.trim():'',
  issue:String(raw?.issue??'').trim().replace(/^#/,'')
 };
 if(!REPOSITORY.test(p.repository))throw Error('An explicit owned repository is required');
 if(!/^[1-9][0-9]{0,8}$/.test(p.issue))throw Error('Existing numbered project issue required');
 for(const [field,limit] of Object.entries(limits)){
  const value=typeof raw[field]==='string'?raw[field].trim():'';
  if(!value||value.length>limit)throw Error('Enter the project goal, both jobs and the acceptance criteria within the form limits');
  p[field]=value;
 }
 return p;
}
function equalScope(previous,current){
 return previous&&previous.repository===current.repository&&previous.issue===current.issue&&
  typeof previous.goal==='string'&&normalize(previous.goal)===normalize(current.goal)&&
  ['first','second','acceptance'].every(key=>previous[key]===current[key]);
}
async function projectSubmissionId(p){
 if(!crypto?.subtle)throw Error('Authenticated project fingerprint unavailable');
 // The issue identifies the controller, not every project the owner may start.
 // Different goals stay distinct; whitespace/case-only retries remain stable.
 const normalizedGoal=normalize(p.goal);
 const data=new TextEncoder().encode(p.repository.toLowerCase()+'|'+p.issue+'|'+normalizedGoal);
 const digest=await crypto.subtle.digest('SHA-256',data);
 return 'complete-me-'+[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,48);
}
function projectJobs(p,id,sourceSha){
 const sourceUrl='https://github.com/'+p.repository+'/tree/'+sourceSha;
 const common='Use canonical GitHub issue #'+p.issue+' in '+p.repository+'. Source at intake: '+sourceUrl+'. '+
  'Work within the assigned repository source. Record any separate approval needed for external actions or release. '+
  'Use the existing signed owner runner. Write failing regressions before behavior changes. '+
  'Preserve identity, wallets and active leases. Require exact-head CI, independent review '+
  'and expected-head guarded merge before any authorized deployment; never claim live completion without readback.';
 return [
  {id:'TASK-1',agent:'greenbeans',executor:'repository-engine',repository:p.repository,
   title:p.first.slice(0,140),instructions:p.goal+'\nFirst scoped change: '+p.first+'\n'+common,
   dependencies:[],acceptance:['Implement and test the first scoped change. Record source, test, review and merge receipts.'],
   automationRecipe:{recipeId:'github',trigger:'manual',dedupeKey:id+':task-1',sourceUrl}},
  {id:'TASK-2',agent:'greenbeans',executor:'repository-engine',repository:p.repository,
   title:p.second.slice(0,140),instructions:p.goal+'\nDependent change: '+p.second+'\n'+common,
   dependencies:['TASK-1'],acceptance:[p.acceptance,'Start after the first job has a verified merge or completion. Record second-job receipts.'],
   automationRecipe:{recipeId:'github',trigger:'manual',dedupeKey:id+':task-2',sourceUrl}}
 ];
}

export async function startCompleteMe(project,request){
 const p=validateProject(project);
 if(typeof request!=='function')throw Error('Authenticated owner request adapter required');
 // Separate owner-scoped READ is mandatory: model text and a guessed SHA
 // never grant permission to create an engineering ticket.
 const source=await request('/work/github/read',{action:'read_repository',repository:p.repository});
 if(source?.ok!==true||source.repository!==p.repository||!VERIFIED_SHA.test(source.headSha||''))
  throw Error('Source verification failed; no project ticket created');
 const id=await projectSubmissionId(p);
 const context={
  kind:'robot-directions',project_type:'complete-me-ai',
  submission_id:id,
  repositories:[p.repository],
  // Intake excludes the plan from its stable fingerprint. Concurrent retries
  // that see a different source head still resolve to the same owner ticket.
  plan:{project:{...p},pinnedSourceSha:source.headSha},
  color_jobs:projectJobs(p,id,source.headSha)
 };
 const saved=await request('/work/tickets/create',{
  start_immediately:true,title:'Complete Me AI · '+p.goal.slice(0,125),
  request:'Complete Me AI — '+normalize(p.goal),repository:p.repository,context
 });
 if(saved?.ok!==true||!saved.ticket?.id)throw Error('Owner project intake did not confirm a saved ticket');
 const persisted=completeMeProject(saved.ticket);
 if(!persisted||!equalScope(persisted,p))
  throw Error('Project already exists with different scope; original work is preserved');
 return {project:persisted,deduplicated:saved.deduplicated===true,execution:saved.execution||{status:'not_confirmed'}};
}

// Read-only project display. Never infer a verified deployment from a status
// string, a model reply, or a workflow-dispatch acknowledgement.
export function completeMeProject(ticket){
 const context=ticket?.context;
 if(!TICKET.test(ticket?.id||'')||context?.project_type!=='complete-me-ai'||!Array.isArray(context.color_jobs))return null;
 const sourceSha=context.plan?.pinnedSourceSha??context.pinnedSourceSha;
 const raw=context.plan?.project??context.project;
 if(!VERIFIED_SHA.test(sourceSha||'')||raw?.repository!==ticket.repository)return null;
 let project;
 try{project=validateProject(raw);}catch{return null;}
 const jobs=context.color_jobs.filter(job=>job?.repository===project.repository);
 const byId=new Map(jobs.map(job=>[job.id,job]));
 const prerequisites=byId.get('TASK-2')?.dependencies;
 if(!byId.has('TASK-1')||!Array.isArray(prerequisites)||!prerequisites.includes('TASK-1'))return null;
 return {
  ...project,ticketId:ticket.id,sourceSha,status:ticket.status||'unverified',
  jobs:jobs.map((job,index)=>{
   const step=projectLegacyJob(job);
   const dependencies=Array.isArray(job.dependencies)?job.dependencies:[];
   const held=dependencies.some(id=>!DONE.has(byId.get(id)?.status));
   if(held&&['ready','queued'].includes(step.status)){
    step.phase='dependency_pending';
    step.next='Waiting for prerequisite jobs and their review.';
   }
   const approvalRequired=step.approvalRequired||OWNER_BLOCK.test(step.blocker);
   if(approvalRequired&&step.status==='blocked')step.next='Resolve the recorded owner or security approval.';
   return {...step,approvalRequired,title:job.id==='TASK-1'?project.first:job.id==='TASK-2'?project.second:
    String(job.title||'Job '+(index+1)).slice(0,180)};
  })
 };
}

const openCards = new WeakMap();

export async function openCompleteMe(container, text, {authorize, request: ownerRequest, scopeActive, initialRepository = ''}) {
  const command = completeMeCommand(text);
  if (!command) throw Error('Enter a Complete Me AI project goal.');
  const auth = (await authorize())?.Authorization;
  if (!auth || !scopeActive()) throw Error('Verify your Bubbles owner session to open Complete Me AI.');
  openCards.get(container)?.();
  const doc = container.ownerDocument;
  const events = new AbortController();
  const listen = (target, name, handler) => target.addEventListener(name, handler, {signal: events.signal});
  const element = (tag, text) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, type = 'button') => Object.assign(element('button', label), {type});
  const link = (label, href) => Object.assign(element('a', label), {href, target: '_blank', rel: 'noopener noreferrer'});
  const card = element('section');
  card.className = 'ba-complete-me';
  card.setAttribute('aria-label', 'Complete Me AI');
  const status = element('p');
  status.setAttribute('role', 'status');
  const details = element('div');
  const close = button('Close');
  const dispose = () => {
    if (events.signal.aborted) return;
    events.abort();
    openCards.delete(container);
    card.remove();
  };
  openCards.set(container, dispose);
  listen(close, 'click', dispose);
  listen(doc.defaultView, 'bubbles:owner-lost', dispose);
  listen(doc.defaultView, 'bubbles:iteration', event => {
    if (event.detail?.type === 'session_changed') dispose();
  });
  const checkScope = async () => {
    const current = await authorize().catch(() => null);
    if (events.signal.aborted || !scopeActive() || current?.Authorization !== auth) {
      dispose();
      throw Error('The owner session changed. Reopen Complete Me AI after signing in.');
    }
  };
  const request = async (path, data) => {
    await checkScope();
    const result = await ownerRequest(path, data, auth);
    await checkScope();
    if (result?.error === 'owner_authorization_required') {
      dispose();
      throw Error('Robot Brain could not verify your owner access.');
    }
    if (result?.ok !== true) throw Error('Robot Brain could not confirm the request.');
    return result;
  };

  const form = element('form');
  const field = (label, control) => {
    const wrapper = element('label', label);
    control.required = true;
    wrapper.append(control);
    form.append(wrapper);
    return control;
  };
  const goal = field('Project goal', element('textarea'));
  goal.defaultValue = command.goal;
  const repository = field('Repository', element('input'));
  repository.placeholder = 'www-infinity4/Project';
  repository.maxLength = 114;
  repository.defaultValue = initialRepository;
  const issue = field('Existing issue number', element('input'));
  issue.inputMode = 'numeric';
  const first = field('First job', element('textarea'));
  const second = field('Dependent job', element('textarea'));
  const acceptance = field('What must pass', element('textarea'));
  const controls = {goal, repository, issue, first, second, acceptance};
  for (const [key, maxLength] of Object.entries(limits)) controls[key].maxLength = maxLength;
  const start = button('Start project', 'submit');
  const recent = button('Saved projects');
  form.append(start);
  card.append(element('h3', 'Complete Me AI'), status, form, details, recent, close);
  if (!doc.getElementById('bubblesCompleteMeCss')) {
    const stylesheet = Object.assign(element('link'), {id: 'bubblesCompleteMeCss', rel: 'stylesheet', href: '/bubbles-complete-me.css'});
    doc.head.append(stylesheet);
  }
  container.append(card);

  let active = null;
  let busy = false;
  const action = async callback => {
    if (busy) return;
    busy = true;
    start.disabled = recent.disabled = true;
    try { await callback(); }
    catch (error) { status.textContent = error instanceof Error ? error.message : 'Robot Brain could not confirm the request.'; }
    finally { busy = false; start.disabled = recent.disabled = false; }
  };
  const dispatchText = (receipt, deduplicated = false) => {
    if (receipt?.status === 'queued_for_runner') return 'The runner request was accepted. Waiting for a signed claim.';
    if (receipt?.reason && /^[a-z][a-z0-9_]{0,79}$/.test(receipt.reason)) return 'Runner status: ' + receipt.reason.replaceAll('_', ' ') + '.';
    if (deduplicated) return 'Opened the existing project and saved checkpoint.';
    return 'Project saved. A runner claim has not been confirmed.';
  };
  const draw = project => {
    active = project.ticketId;
    goal.defaultValue = '';
    form.reset();
    form.hidden = true;
    details.replaceChildren(element('h4', project.goal), link('Open issue #' + project.issue, `https://github.com/${project.repository}/issues/${project.issue}`),
      element('p', 'Acceptance: ' + project.acceptance));
    const list = element('ol');
    for (const job of project.jobs) {
      const item = element('li');
      item.append(element('strong', job.title), element('p', job.latestRunnerStep || job.next));
      if (job.blocker) item.append(element('p', job.blocker));
      if (job.runUrl) item.append(link('Runner receipt', job.runUrl));
      if (job.commitSha) item.append(link('Source commit', `https://github.com/${project.repository}/commit/${job.commitSha}`));
      if (job.phase === 'ready_to_dispatch' && !job.approvalRequired) {
        const resume = button('Request runner');
        resume.addEventListener('click', event => {
          if (!event.isTrusted) return;
          void action(async () => {
            status.textContent = dispatchText(await request('/work/run-next', {ticketId: project.ticketId, jobId: job.jobId}));
          });
        });
        item.append(resume);
      }
      list.append(item);
    }
    details.append(list);
  };
  listen(form, 'submit', event => {
    event.preventDefault();
    if (!event.isTrusted) return;
    void action(async () => {
      status.textContent = 'Checking the repository and saving your project…';
      const input = Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value]));
      const result = await startCompleteMe(input, request);
      draw(result.project);
      status.textContent = dispatchText(result.execution, result.deduplicated);
    });
  });
  listen(recent, 'click', () => void action(async () => {
    const {tickets} = await request('/work/tickets/list', {});
    const projects = tickets.map(completeMeProject).filter(Boolean);
    const current = projects.find(project => project.ticketId === active);
    if (current) {
      draw(current);
      status.textContent = 'Loaded the current saved checkpoint.';
      return;
    }
    details.replaceChildren();
    status.textContent = projects.length ? 'Choose a saved project.' : 'No Complete Me projects in the latest owner tickets.';
    for (const project of projects) {
      const select = button('#' + project.issue + ' · ' + project.goal);
      select.addEventListener('click', () => void action(async () => {
        await checkScope();
        draw(project);
        status.textContent = 'Loaded the saved project.';
      }));
      details.append(select);
    }
  }));
  if (command.goal) goal.focus();
  else recent.focus();
}
