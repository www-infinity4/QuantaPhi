// Repository-verified Infinity Git family. Gitcoin is deliberately last.
// This registry names existing repos, not claims of deployed sites or live services.
export const GIT_PRODUCTION_CHAIN=Object.freeze([
 {id:'copilot',name:'GitHub Copilot',repo:null,role:'Request a build and receive a reviewable GitHub PR.',mode:'build'},
 {id:'gitpal',name:'Gitpal',repo:'Gitpal',role:'Reconcile the original request with the PR and identify unfinished work.',mode:'requirements'},
 {id:'gitpin',name:'Gitpin',repo:'Gitpin',role:'Inspect exact changed paths and preserve source evidence.',mode:'files'},
 {id:'gitpro',name:'Gitpro',repo:'Gitpro',role:'Refine code, inspect review gates and merge an approved PR.',mode:'merge'},
 {id:'gitflow',name:'Gitflow',repo:'Gitflow',role:'Trace changes and workflow progression; avoid unverified execution claims.',mode:'files'},
 {id:'gitmap',name:'Gitmap',repo:'Gitmap',role:'Map changed components and dependencies.',mode:'files'},
 {id:'gitpub',name:'Gitpub',repo:'Gitpub',role:'Publish only after deployment authorization and verified readback.',mode:'files'},
 {id:'git-stream',name:'Git-Stream',repo:'Git-Stream',role:'Inspect event and PR conversations for follow-up.',mode:'files'},
 {id:'gitcoin',name:'Gitcoin',repo:'Gitcoin',role:'Review merged code-line evidence after production; wallet minting is separate.',mode:'merged'}
].map((x,index)=>Object.freeze({...x,order:index+1})));
export const GIT_OTHER_CARDS=Object.freeze([
 {id:'git',name:'git · Deployment',repo:'git',role:'Standalone automated deployment repository.',mode:'files'},
 {id:'gitdad',name:'Gitdad',repo:'Gitdad',role:'Standalone local family signal utility; not a production gate.',mode:'files'},
 {id:'gitpal-alt',name:'Gitpal- · Alternate',repo:'Gitpal-',role:'Alternate Gitpal repository; inspect before migrating changes.',mode:'files'},
 {id:'gitpal-clone',name:'Clone-of-Gitpal',repo:'Clone-of-Gitpal',role:'Gitpal clone; inspect its changes before reusing.',mode:'files'}
].map(x=>Object.freeze({...x,order:null})));
export const GIT_APP_CARDS=Object.freeze([...GIT_PRODUCTION_CHAIN.filter(x=>x.repo),...GIT_OTHER_CARDS]);
export const gitRepoUrl=repo=>'https://github.com/www-infinity4/'+encodeURIComponent(repo);
export function gitCardRoute(id,repository='',prNumber=0){
 const params=new URLSearchParams({card:'source-'+id});
 if(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))params.set('repo',repository);
 if(Number.isSafeInteger(prNumber)&&prNumber>0)params.set('pr',String(prNumber));
 return '/?'+params.toString();
}
export function nextGitStage(id){
 const index=GIT_PRODUCTION_CHAIN.findIndex(x=>x.id===id);
 return index>=0&&index+1<GIT_PRODUCTION_CHAIN.length?GIT_PRODUCTION_CHAIN[index+1]:null;
}
export function mergedLinePreview(evidence){
 const merges=Array.isArray(evidence?.merges)?evidence.merges:[];
 const valid=merges.filter(m=>Number.isSafeInteger(m.number)&&m.number>0&&
   /^[a-f0-9]{40}$/.test(m.mergeCommitSha||'')&&
   Number.isSafeInteger(m.eligibleAddedLines)&&m.eligibleAddedLines>=0);
 const unique=new Map(valid.map(m=>[m.mergeCommitSha+':'+m.number,m]));
 const total=[...unique.values()].reduce((n,m)=>n+m.eligibleAddedLines,0);
 return {total,merges:unique.size,partial:Boolean(evidence?.partial),gitsMinted:null,
  note:'Read-only sample of verified merged code additions, not an Infinity wallet balance or minted Gits.'};
}
