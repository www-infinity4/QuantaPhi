// One explicitly configured HTTPS authority for the entire signed writer run.
// Never retry an uncertain claim against another authority.
export function brainRunnerOrigin(env=process.env){
 const value=env.BRAIN_RUNNER_ORIGIN||'https://infinity-brain-clock.marvaseater.workers.dev';
 const invalid=()=>Error('brain_runner_origin_invalid');
 if(typeof value!=='string'||!/^https:\/\/[^/?#\\\s]+\/?$/i.test(value))throw invalid();
 let url;try{url=new URL(value);}catch{throw invalid();}
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw invalid();
 return url.origin;
}
