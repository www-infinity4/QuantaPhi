/**
 * Pure user-choice routing for the owner-authenticated Claude Steward.
 * Choosing a model is an intent selector, never a permission grant or tool receipt.
 */
const FIX=/^(?:(?:please|hey|okay|ok)[,\s]+)?(?:(?:claude|bubbles)[,\s]+)?(?:fix|repair)\s+(?:bubbles|yourself)[.!]?$/i;
export function routeClaudeTurn(selectedModel,text,hasAttachments=false){
  if(selectedModel!=='claude')return null;
  const message=String(text||'').trim();
  if(hasAttachments)return {mode:'unsupported_image',prompt:null};
  if(!message)return {mode:'empty',prompt:null};
  if(FIX.test(message))return {
    mode:'fix',
    prompt:'Fix yourself. Find what Bubbles is getting wrong and prepare the fix.'
  };
  return {mode:'chat',prompt:message.slice(0,2400)};
}

/**
 * Claude is an optional verified conversation engine beneath the Bubbles UI.
 * Bubbles keeps its original signed work/voice/image/quick-card routes;
 * no model response can bypass those tools or assert completion.
 */
// Optional Claude assistance must never intercept Bubbles' original
// voice/search/weather/news/GitHub/Quick Card/wallet/owner-work paths.
// Their authenticated Bubbles tools, not Claude prose, issue real receipts.
const TOOL_TARGET=/\b(?:weather|forecast|temperature|news|headlines|search|browse|google|sources?|citations?|github|repos?|repositor(?:y|ies)|readme|commits?|tickets?|robot brain|tools?|skills?|capabilit(?:y|ies)|quick cards?|radio|music|video|wallet|coins?|quants?|balance|payments?|checkout|images?|photos?|screen|microphone|voice|termux|python|claude|gemini|gpt|email|webpages?|url|resonance|inductance|capacitance)\b/i;
const TOOL_VERB=/^(?:(?:please|hey|bubbles)[,\s]+)*(?:open|play|run|check|look up|fetch|inspect|show|list|read|send|share|collect|create|build|fix|repair|deploy|merge|update|delete|install|publish|record|transcribe|calculate|connect|search)\b/i;
export function shouldUseClaudeAssistance({selectedModel,ownerVerified,providerPresent,ownerEnabled,
 embedded,hasAttachments,toolWork,request}={}){
 return selectedModel==='bubbles'&&ownerVerified===true&&providerPresent===true&&ownerEnabled===true
  &&embedded!==true&&hasAttachments!==true&&toolWork!==true
  &&typeof request==='string'&&Boolean(request.trim())
  &&!TOOL_TARGET.test(request)&&!TOOL_VERB.test(request);
}
