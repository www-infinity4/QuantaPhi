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
export function shouldUseClaudeAssistance({selectedModel,ownerVerified,providerPresent,
 embedded,hasAttachments,toolWork,request}={}){
 return selectedModel==='bubbles'&&ownerVerified===true&&providerPresent===true
  &&embedded!==true&&hasAttachments!==true&&toolWork!==true
  &&typeof request==='string'&&Boolean(request.trim());
}
