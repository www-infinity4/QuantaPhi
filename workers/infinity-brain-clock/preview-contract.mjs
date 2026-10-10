export const previewFiles=['robot-directions.js','robot-directions.css','quanta-agent-iterations.js','quanta-agent-iterations.css'];
export function validatePreview(p){
 if(!p||!/^www-infinity4\/[\w.-]+$/.test(p.repository||'')||!['source_preview','committed_unverified','deployed_verified'].includes(p.status)||
 !/^[a-f0-9]{40}$/.test(p.baseSha||'')||!/^[a-f0-9]{40}$/.test(p.commitSha||'')||p.baseSha===p.commitSha||
 !Array.isArray(p.paths)||!p.paths.length||p.paths.length>12||p.paths.some(x=>typeof x!=='string'||x.startsWith('/')||x.includes('..')||x.includes('\\')||/^(?:\.git|\.env|\.github)(?:[.\/]|$)/.test(x))||
 typeof p.summary!=='string'||p.summary.length>500)throw Error('preview_metadata_rejected');
 for(const side of ['before','after'])if(typeof p[side]!=='string'||p[side].length>60000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p[side]))throw Error('preview_image_rejected');
 return p;
}
