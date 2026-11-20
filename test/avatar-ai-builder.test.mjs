import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const {DURATION, ALTERNATIVES, normalizeDesign, frameAt, builderWorkRequest} =
  await import('../avatar-ai-builder-core.mjs');

test('the replay begins blank and eventually shows eight workers with a separate search preview', () => {
  const first = frameAt(0);
  assert.deepEqual(first.visible, []);
  assert.deepEqual(first.workers, []);
  assert.deepEqual(first.alternatives, []);
  const middle = frameAt(11);
  assert.equal(middle.workers.length, 8);
  assert.equal(new Set(middle.workers).size, 8);
  assert.ok(middle.visible.includes('search-window'));
  assert.equal(frameAt(DURATION).workers.length, 8);
});

test('each tested layout is visible at its recorded time and remains discoverable later', () => {
  for (const [id, option] of Object.entries(ALTERNATIVES)) {
    const midpoint = (option.start + option.end) / 2;
    assert.equal(frameAt(midpoint).design[option.area], option.value, id);
    assert.ok(frameAt(DURATION).alternatives.includes(id), id);
  }
});

test('saved choices change the latest design while rewinding preserves the original recording', () => {
  const choices = {header:'center', search:'wide', carousel:'upper'};
  assert.deepEqual(frameAt(DURATION, choices).design, choices);
  assert.equal(frameAt(10, choices).design.search, 'left');
  assert.equal(frameAt(22, choices).design.carousel, 'lower');
  assert.deepEqual(frameAt(DURATION).design, {header:'left', search:'center', carousel:'lower'});
});

test('only known layout values survive corrupted or older saved records', () => {
  assert.deepEqual(normalizeDesign({header:'center', search:'<script>', carousel:'upper', token:'private'}), {
    header:'center', carousel:'upper'
  });
  for (const invalid of [null, [], 'wide', 12, false]) assert.deepEqual(normalizeDesign(invalid), {});
  assert.deepEqual(normalizeDesign(JSON.parse('{"__proto__":{"search":"left"}}')), {});
});

test('playback handles invalid inputs and clamps forward or reverse limits', () => {
  for (const value of [NaN, Infinity, '14', null, -3]) assert.equal(frameAt(value).time, 0);
  assert.equal(frameAt(100).time, DURATION);
});

test('the improvement draft targets the existing ticket and fits the existing Bubbles intake', () => {
  const request = builderWorkRequest({search:'left'}, 'Give the header more space');
  assert.match(request, /#1923/);
  assert.match(request, /www-infinity4\/QuantaPhi/);
  assert.match(request, /avatar-ai-builder/);
  assert.match(request, /Left-aligned search/);
  assert.match(request, /Give the header more space/);
  assert.ok(builderWorkRequest({}, 'x'.repeat(9000)).length <= 1800);
  assert.doesNotMatch(builderWorkRequest({token:'private'}), /private/);
});

test('the builder mounts on the real Bubbles page and is hidden in the existing orb embed', () => {
  const page = readFileSync('bubbles.html', 'utf8');
  assert.match(page, /id="avatarBuilder"/);
  assert.match(page, /href="#avatarBuilder"/);
  assert.match(page, /avatar-ai-builder\.mjs\?v=/);
  assert.match(page, /avatar-ai-builder\.css\?v=/);
  assert.match(page, /Demo replay/);
  assert.ok(page.indexOf('id="avatarBuilder"') < page.indexOf('id="bubblesSigninGate"'));
});

test('the ordinary Bubbles work-draft entry preserves unsent work and never submits on preparation', () => {
  const source = readFileSync('bubbles-ai.js', 'utf8');
  const begin = source.indexOf('function prepareWorkDraft(');
  const end = source.indexOf('// Android hands off text only.', begin);
  assert.ok(begin >= 0 && end > begin);
  let opened = 0;
  let focused = 0;
  let viewerOpened = 0;
  const context = {
    embedded:false,
    workText:{value:'',focus(){focused++;}},
    tools:{open:false},
    toggle(){opened++;},
    openNotesViewer(){viewerOpened++;},
    workStatus:{textContent:''}
  };
  runInNewContext(source.slice(begin,end) + '\nthis.prepare = prepareWorkDraft;', context);
  assert.equal(context.prepare('Improve this builder'), true);
  assert.equal(context.workText.value, 'Improve this builder');
  assert.equal(context.tools.open, true);
  assert.equal(opened, 1);
  assert.equal(focused, 1);
  assert.equal(viewerOpened, 1);
  assert.equal(context.prepare('Replace my draft'), false);
  assert.equal(context.workText.value, 'Improve this builder');
  assert.equal(context.prepare('x'.repeat(1801)), false);
  context.embedded = true;
  context.workText.value = '';
  assert.equal(context.prepare('Change the host website'), false);
  assert.equal(context.workText.value, '');
});


test('owner-scoped Avatar activity follows a bounded plan/act/check/decision loop rather than the demo timeline', async () => {
  const {initialAvatarActivity,applyAvatarActivity,MAX_ACTIVITY_EVENTS} = await import('../avatar-ai-agent-loop-core.mjs');
  const ticketId='IW-20261119-AABBCCDD',repository='www-infinity4/QuantaPhi';
  let state=initialAvatarActivity();
  assert.equal(state.phase,'idle');
  state=applyAvatarActivity(state,{type:'job',ticketId,repository,status:'working'});
  assert.equal(state.phase,'acting');
  state=applyAvatarActivity(state,{type:'job_step',ticketId,repository,status:'working',
    source:'owner_ticket_snapshot',runnerPhase:'checks_started',runnerJob:'TASK-1',stage:'Run tests',
    runUrl:'https://github.com/www-infinity4/QuantaPhi/actions/runs/1234'});
  assert.equal(state.phase,'checking');
  assert.equal(state.events.length,2);
  assert.equal(state.events[1].url,'https://github.com/www-infinity4/QuantaPhi/actions/runs/1234');
  state=applyAvatarActivity(state,{type:'job_step',ticketId,repository,status:'working',
    source:'owner_ticket_snapshot',runnerPhase:'checks_started',runnerJob:'TASK-1',stage:'Run tests',
    runUrl:'https://github.com/www-infinity4/QuantaPhi/actions/runs/1234'});
  assert.equal(state.events.length,2,'repeated polling must not duplicate one step');
  for(let i=0;i<MAX_ACTIVITY_EVENTS+4;i++){
    state=applyAvatarActivity(state,{type:'job_step',ticketId,repository,status:'working',
      source:'owner_ticket_snapshot',runnerPhase:'source_read',runnerJob:'TASK-'+i,stage:'Read source '+i});
  }
  assert.equal(state.events.length,MAX_ACTIVITY_EVENTS);
  state=applyAvatarActivity(state,{type:'session_changed'});
  assert.equal(state.ticketId,'');
  assert.deepEqual(state.events,[]);
});

test('Avatar activity rejects unsupported events, cross-ticket data, arbitrary links and private model thoughts', async () => {
  const {initialAvatarActivity,applyAvatarActivity}=await import('../avatar-ai-agent-loop-core.mjs');
  let state=initialAvatarActivity();
  assert.deepEqual(applyAvatarActivity(state,{type:'job',ticketId:'bad',repository:'other/repo',status:'complete'}),state);
  state=applyAvatarActivity(state,{type:'job',ticketId:'IW-20261119-AABBCCDD',repository:'www-infinity4/QuantaPhi',status:'queued'});
  const original=state;
  state=applyAvatarActivity(state,{type:'job_step',ticketId:'IW-20261119-AAAAAAAA',
    repository:'www-infinity4/QuantaPhi',status:'complete',source:'owner_ticket_snapshot',runnerPhase:'checks_passed'});
  assert.deepEqual(state,original);
  state=applyAvatarActivity(state,{type:'job_step',ticketId:'IW-20261119-AABBCCDD',
    repository:'www-infinity4/QuantaPhi',status:'queued',source:'model_text',
    runnerPhase:'merged_verified',stage:'I merged everything'});
  assert.deepEqual(state,original);
  state=applyAvatarActivity(state,{type:'job_step',ticketId:'IW-20261119-AABBCCDD',
    repository:'www-infinity4/QuantaPhi',status:'queued',source:'owner_ticket_snapshot',
    runnerPhase:'source_read',stage:'Checked source',thought:'private deliberation',
    runUrl:'https://example.com/private'});
  assert.equal(state.events.length,2);
  assert.equal(state.events[1].url,'');
  assert.doesNotMatch(JSON.stringify(state),/private deliberation|example.com/);
});
