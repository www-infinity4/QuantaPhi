// Actual Brain entry points, not imported ChatGPT plugins or granted permissions.
// Every execution still requires its own signed authenticated receipt.
export const AGENT_SKILLS=Object.freeze([
 {id:'conversation-work-audit',agent:'red-bubbles',route:'POST /owner/conversation',module:'conversation-work-audit.mjs',mode:'read-only',gate:'verified_owner_session'},
 {id:'repository-discovery',agent:'yellow-jacket',route:'repository-router.mjs',module:'repository-router.mjs',mode:'read-only',gate:'source_receipt'},
 {id:'backlog-triage',agent:'blueberry',route:'autopilot-triage.mjs',module:'autopilot-triage.mjs',mode:'read-only',gate:'owner_partition'},
 {id:'scheduled-owner-jobs',agent:'purple-pearl',route:'POST /work/clock',module:'owner-task-clock.mjs',mode:'approved-job-only',gate:'existing_owner_approval'},
 {id:'signed-repository-writer',agent:'greenbeans',route:'POST /runner/claim',module:'worker.js',mode:'signed-runner',gate:'OIDC_and_repository_lease'},
 {id:'independent-commit-review',agent:'pink-panther',route:'source-review.mjs',module:'source-review.mjs',mode:'verification',gate:'pinned_source_and_CI_receipts'},
 {id:'verified-result-ledger',agent:'black-box',route:'POST /runner/result',module:'worker.js',mode:'receipt-only',gate:'signed_lease_and_commit_validation'}
]);
