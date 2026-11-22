/* Owner-submitted video review cases, separate from published Quick Cards.
 *
 * These records are reports, NOT independent findings about a person or
 * YouTube-policy violation. They do not track faces, identities, locations,
 * children, or viewing behavior. Source-controlled review notes only: no
 * runtime reporter intake, surveillance, auto-enforcement or public badges.
 *
 * A creator not appearing on camera is not itself proof of wrongdoing.
 * A request about who is filming is different from a request to stop filming.
 */
export const CREATOR_VIDEO_REVIEW_RULES=Object.freeze([
 Object.freeze({
  id:'minor-consent-and-comfort',
  guidance:'When a child is shown, review guardian consent, voluntary participation, privacy and whether anyone asked to stop filming; do not assume consent or a violation.'
 }),
 Object.freeze({
  id:'no-identification-pressure',
  guidance:'A person filming need not appear on camera merely because asked. Do not seek their private identity, track them or encourage confrontation.'
 }),
 Object.freeze({
  id:'source-evidence-required',
  guidance:'Record exact video/timestamp and only public, relevant evidence before any finding; distinguish reports, verified observations, and platform decisions.'
 }),
 Object.freeze({
  id:'no-automatic-penalties',
  guidance:'Never automatically remove, blacklist, demonetize, report or change a wallet from an unverified claim. Use platform reporting only when grounded concerns warrant it.'
 })
]);
const rawCases=[{
 caseId:'CVID-20261122-WKIVlHQRXF4',
 videoId:'WKIVlHQRXF4',
 sourceUrl:'https://www.youtube.com/watch?v=WKIVlHQRXF4',
 recordedAt:'2026-11-22',
 reportedBy:'owner',
 concernCode:'on-camera-visibility-request',
 status:'reported-unverified',
 summary:'The owner reports that the owner and a child asked the person filming to appear on camera, but the person did not appear.',
 evidence:{
  videoDirectlyReviewed:false,
  verifiedTimestamps:[],
  uploaderVerified:false,
  contextVerified:false
 },
 personIdentified:false,
 automaticSanction:false,
 publicAccusation:false,
 nextAction:'Human review of the original video if available: identify whether the exchange is present at a verifiable timestamp; separately check for any request to stop filming or consent concern. Do not infer misconduct from camera invisibility.'
}];
const safeId=/^[a-zA-Z0-9_-]{11}$/;
const allowedCodes=new Set(['on-camera-visibility-request','possible-filming-consent','minor-privacy','other-source-context']);
const allowedStatuses=new Set(['reported-unverified','evidence-reviewed','closed-no-violation','referred-to-platform']);
export function validateCreatorVideoReviewCase(row){
 if(!row||typeof row!=='object'||!safeId.test(row.videoId||''))return false;
 if(row.caseId!=='CVID-'+String(row.recordedAt||'').replaceAll('-','')+'-'+row.videoId)return false;
 if(row.sourceUrl!=='https://www.youtube.com/watch?v='+row.videoId)return false;
 if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(row.recordedAt)||!Number.isFinite(Date.parse(row.recordedAt+'T00:00:00Z')))return false;
 if(row.reportedBy!=='owner'||!allowedCodes.has(row.concernCode)||!allowedStatuses.has(row.status))return false;
 if(typeof row.summary!=='string'||row.summary.length<25||row.summary.length>500||/[<>\\u0000-\\u001f]/.test(row.summary))return false;
 if(!row.evidence||typeof row.evidence!=='object'||typeof row.evidence.videoDirectlyReviewed!=='boolean'||
  typeof row.evidence.uploaderVerified!=='boolean'||typeof row.evidence.contextVerified!=='boolean'||
  !Array.isArray(row.evidence.verifiedTimestamps)||row.evidence.verifiedTimestamps.some(n=>!Number.isInteger(n)||n<0))return false;
 if(row.status==='evidence-reviewed'&&(!row.evidence.videoDirectlyReviewed||!row.evidence.verifiedTimestamps.length))return false;
 if(row.status==='referred-to-platform'&&!row.evidence.contextVerified)return false;
 if(row.personIdentified!==false||row.automaticSanction!==false||row.publicAccusation!==false)return false;
 return typeof row.nextAction==='string'&&row.nextAction.length>30&&row.nextAction.length<1000;
}
export const CREATOR_VIDEO_REVIEW_CASES=Object.freeze(rawCases.filter(validateCreatorVideoReviewCase).map(row=>Object.freeze({
 ...row,
 evidence:Object.freeze({...row.evidence,verifiedTimestamps:Object.freeze([...row.evidence.verifiedTimestamps])})
})));
export function reviewCasesForVideo(videoId){
 if(!safeId.test(videoId||''))return Object.freeze([]);
 return Object.freeze(CREATOR_VIDEO_REVIEW_CASES.filter(row=>row.videoId===videoId));
}
