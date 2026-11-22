/* Avatar AI real-activity projection, separate from the deterministic design demo.
 * Accepts bounded lifecycle notices from the existing owner-authenticated
 * Bubbles ticket poll. It does NOT execute jobs, expose private reasoning,
 * persist owner history, authenticate anyone, or certify a release.
 */
export const MAX_ACTIVITY_EVENTS = 24;
const TICKET = /^IW-[0-9]{8}-[A-Z0-9]{8}$/;
const REPOSITORY = /^www-infinity4\/[A-Za-z0-9_.-]{1,80}$/;
const STATUS = new Set(['queued','ready','working','blocked','committed_unverified','merged_verified','deployed_verified','complete','completed','superseded']);
const PHASES = Object.freeze({
  queued:'planning',ready:'planning',working:'acting',blocked:'blocked',
  committed_unverified:'checking',merged_verified:'release',
  deployed_verified:'release',complete:'review',completed:'review',superseded:'blocked',
  discovery_started:'planning',planning_started:'planning',red_reasoned:'planning',
  orange_reasoned:'planning',blue_reasoned:'planning',source_read:'planning',
  patch_started:'acting',patch_prepared:'acting',review_started:'checking',
  checks_started:'checking',checks_passed:'checking',arbitration_started:'review',
  publication_started:'release',pr_opened:'review',attempt_failed:'blocked'
});
const RUNNER_PHASES = new Set(Object.keys(PHASES).filter(name=>name.includes('_')&&!STATUS.has(name)));
const SUMMARY = {
  idle:'No owner work activity has been received for this chat.',
  planning:'The existing Brain is preparing or reading a job.',
  acting:'The existing Brain reports work in progress. A source patch is not yet a verified release.',
  checking:'The existing Brain reports checks or review activity. Follow the linked receipt.',
  review:'The existing Brain reports a review or completion stage. Confirm the actual GitHub evidence.',
  release:'The existing Brain reports a publication stage. Production and Android still need separate verification.',
  blocked:'The existing Brain reports a blocker. Inspect the recorded job before retrying.'
};
const clean = (value,limit=120)=>typeof value==='string'
  ?value.replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit):'';
function evidenceUrl(value,repository) {
  try{
    const url = new URL(value);
    if(url.origin!=='https://github.com'||url.username||url.password||url.search||url.hash)return '';
    if(![repository,'www-infinity4/Moltnook'].some(repo=>url.pathname.startsWith('/'+repo+'/')))return '';
    return /^\/(?:www-infinity4\/[^/]+)\/(?:actions\/runs\/[0-9]+|pull\/[0-9]+|commit\/[0-9a-f]{7,40})$/.test(url.pathname)?url.href:'';
  }catch{return ''}
}
export function initialAvatarActivity(){
  return {ticketId:'',repository:'',status:'unverified',phase:'idle',speech:SUMMARY.idle,events:[]};
}
function append(state,notice){
  if(state.events.some(event=>event.key===notice.key))return state;
  const events=[...state.events,notice].slice(-MAX_ACTIVITY_EVENTS);
  const phase=notice.phase;
  return {...state,phase,speech:SUMMARY[phase],events};
}
export function applyAvatarActivity(previous,event){
  const state=previous&&Array.isArray(previous.events)?previous:initialAvatarActivity();
  if(event?.type==='session_changed')return initialAvatarActivity();
  if(!event||!TICKET.test(event.ticketId||'')||!REPOSITORY.test(event.repository||''))return state;
  if(event.type==='job'){
    if(!STATUS.has(event.status))return state;
    const current=state.ticketId===event.ticketId&&state.repository===event.repository
      ?state:{...initialAvatarActivity(),ticketId:event.ticketId,repository:event.repository};
    if(current.status===event.status)return current;
    const phase=PHASES[event.status];
    const notice={key:'job:'+event.status,stage:'Ticket '+event.status.replaceAll('_',' '),
      phase,status:event.status,url:evidenceUrl(event.url,event.repository),source:'owner_ticket_observation'};
    return append({...current,status:event.status},notice);
  }
  // Step events are projected only after an owner-bound work ticket was
  // observed. A new chat, another ticket or model text must not attach itself.
  if(event.type!=='job_step'||event.ticketId!==state.ticketId||
    event.repository!==state.repository||event.source!=='owner_ticket_snapshot'||
    !STATUS.has(event.status)||!RUNNER_PHASES.has(event.runnerPhase))return state;
  const stage=clean(event.stage);
  if(!stage)return state;
  const step=clean(event.runnerJob,48);
  const url=evidenceUrl(event.runUrl,event.repository);
  const key=['step',step,event.runnerPhase,stage,url].join(':');
  return append(state,{key,stage,phase:PHASES[event.runnerPhase],
    status:event.status,url,source:'owner_ticket_snapshot'});
}
