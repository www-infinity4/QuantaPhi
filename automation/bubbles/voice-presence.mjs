/** Lightweight energy prefilter, NOT a trained human-voice or speaker classifier.
 * Pair with the Android recognizer and direct wake-name intent before dispatch.
 * Designed for monotonic audio frame input; no microphone is opened here.
 */
export function createSpeechCandidateGate({threshold=.08,minVoicedFrames=4,quietResetFrames=15}={}){
 if(!(threshold>0&&threshold<=1)||!Number.isInteger(minVoicedFrames)||minVoicedFrames<2||
    !Number.isInteger(quietResetFrames)||quietResetFrames<2)throw Error('invalid_voice_configuration');
 let frames=0,quiet=0,last='',lastAt=0;
 function observe(samples){
  if(!samples||typeof samples.length!=='number'||samples.length<2||samples.length>32768)return false;
  let sum=0;
  for(const value of samples){if(!Number.isFinite(value)||Math.abs(value)>1)return false;sum+=value*value;}
  const active=Math.sqrt(sum/samples.length)>=threshold;
  if(active){frames=Math.min(2000,frames+1);quiet=0;}
  else if(++quiet>=quietResetFrames)frames=0;
  return frames>=minVoicedFrames;
 }
 function acceptTranscript(raw,{directed=false,now=Date.now()}={}){
  if(!directed||frames<minVoicedFrames||typeof raw!=='string')return false;
  const normalized=raw.replace(/\s+/g,' ').trim().toLowerCase();
  if(normalized.length<4||normalized.length>1800||!Number.isFinite(now))return false;
  if(last===normalized&&now-lastAt<3000)return false;
  last=normalized;lastAt=now;frames=0;quiet=0;return true;
 }
 return Object.freeze({observe,acceptTranscript,reset(){frames=0;quiet=0;last='';lastAt=0;}});
}
