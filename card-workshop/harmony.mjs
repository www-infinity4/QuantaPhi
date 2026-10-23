// Deterministic pitch-following guide; this is not a trained singing voice.
export function detectPitch(samples,sampleRate){
 let energy=0;for(const x of samples)energy+=x*x;if(Math.sqrt(energy/samples.length)<0.015)return null;
 let best=0,lag=0;
 for(let n=Math.floor(sampleRate/900);n<=Math.min(samples.length/2,Math.ceil(sampleRate/70));n++){
  let sum=0,a=0,b=0;for(let i=0;i<samples.length-n;i++){sum+=samples[i]*samples[i+n];a+=samples[i]**2;b+=samples[i+n]**2}
  const correlation=sum/Math.sqrt(a*b||1);
  if(correlation>best){best=correlation;lag=n}
  // First strong local peak avoids selecting a later integer multiple.
  if(best>0.96&&correlation<best-0.01)break;
 }
 return best>0.8&&lag?sampleRate/lag:null;
}
export const harmonyFrequency=(pitch,semitones=7)=>pitch*2**(semitones/12);
