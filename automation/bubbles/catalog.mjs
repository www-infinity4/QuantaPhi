/** Consented capability manifest. Readiness is NOT execution evidence. */
export const AUTOMATIONS=Object.freeze({
 screen_audio_capture:{title:'Android screen and microphone capture',adapter:'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/ScreenCaptureService.java',requirements:['owner','mediaProjection','mic','foreground']},
 voice_filter:{title:'Microphone speech plausibility gate',adapter:'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/SpeechTranscriptGate.java',requirements:['owner','mic']},
 screen_context:{title:'On-demand foreground screen context',adapter:'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BrainLearningService.java',requirements:['owner','accessibility','foreground','requestNow']},
 ai_session_bridge:{title:'Consented existing ChatGPT/Gemini browser session',adapter:'workers/bubbles-cloud-browser/chatgpt-bridge.mjs',requirements:['owner','bridgeGrant','providerSession']},
 history_import:{title:'Owner-selected ChatGPT/Gemini history import',adapter:'automation/bubbles/history-export.mjs',requirements:['owner','localFileSelected','privateStorage']},
 ticket_executor:{title:'Authenticated color-agent ticket handoff',adapter:'automation/bubbles/ticket-webhook.mjs',requirements:['owner','verifiedWebhook','signedLease']},
 repo_memory_sync:{title:'Source-linked repo memory staging',adapter:'automation/bubbles/repo-memory.mjs',requirements:['owner','verifiedSource','approvedRepo']},
 pr_live_pusher:{title:'Reviewed exact-head PR and release eligibility',adapter:'automation/bubbles/release.mjs',requirements:['owner','exactHead','passingCI','independentReview','releaseApproval']},
 dialer_switchboard:{title:'Signed SIP dialer challenge and WebRTC handoff',adapter:'automation/bubbles/dialer.mjs',requirements:['owner','verifiedSipEvent','ownerChallenge','sessionConsent']},
 wallet_session_watchdog:{title:'Read-only session and wallet health',adapter:'automation/bubbles/session-watchdog.mjs',requirements:['owner']}
});
export function planAutomation(id,permissions={}){
 const entry=Object.hasOwn(AUTOMATIONS,id)?AUTOMATIONS[id]:null;
 if(!entry)throw Error('unknown_automation');
 const missing=entry.requirements.filter(key=>permissions[key]!==true);
 const status=missing.length===0?({
  screen_audio_capture:'ready_for_device',voice_filter:'ready_for_local',screen_context:'ready_for_device',
  ai_session_bridge:'ready_for_existing_bridge',history_import:'ready_for_local',
  ticket_executor:'ready_for_existing_runner',repo_memory_sync:'ready_to_stage',
  pr_live_pusher:'eligible_for_guarded_release',dialer_switchboard:'ready_for_switchboard',
  wallet_session_watchdog:'read_only_check'
 })[id]:
 id==='ai_session_bridge'&&missing.includes('bridgeGrant')?'grant_required':
 id==='screen_audio_capture'||id==='screen_context'?'consent_required':
 id==='history_import'?'local_file_and_storage_required':
 id==='ticket_executor'?'signed_owner_execution_required':
 id==='pr_live_pusher'?'review_and_release_required':
 id==='dialer_switchboard'?'signed_challenge_required':'permission_required';
 return Object.freeze({id,title:entry.title,adapter:entry.adapter,status,missing,
  executed:false,mergeVerified:false,deploymentVerified:false,deviceVerified:false});
}
