#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {mkdirSync,readdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {buildManifest} from './line-receipts.mjs';

const HELP=`GIT · GitHub CLI line-provenance collector (no minting)
Usage:
  gh gitcoin preview --intent website [--repo OWNER/NAME]
  gh gitcoin scan --intent website --builder human [--commit HEAD] [--repo OWNER/NAME]
  gh gitcoin balance
Builder claims: human, bubbles, gpt, copilot, other-ai
Intent: website, app, repair, test, integration, data, other
No wallet balance, issuance or trading is performed by this local collector.`;
function exec(command,args){return execFileSync(command,args,{encoding:'utf8',maxBuffer:4_000_000}).trim();}
function options(args){const o={};for(let i=0;i<args.length;i+=2){const k=args[i];if(!k?.startsWith('--')||!['intent','builder','commit','repo','github-login'].includes(k.slice(2))||!args[i+1]||args[i+1].startsWith('--')||o[k.slice(2)])throw new Error('invalid_options');o[k.slice(2)]=args[i+1];}return o;}
function gitDir(){return exec('git',['rev-parse','--absolute-git-dir']);}
function repoOf(o){if(o.repo)return o.repo;try{return exec('gh',['repo','view','--json','nameWithOwner','--jq','.nameWithOwner']);}catch{throw new Error('repo_required_or_gh_auth_unavailable');}}
function loginOf(o){if(o['github-login'])return o['github-login'];try{return exec('gh',['api','user','--jq','.login']);}catch{return null;}}
function claimDir(){return path.join(gitDir(),'gitcoin','claims');}
function output(obj){process.stdout.write(JSON.stringify(obj,null,2)+'\n');}
function main(argv){
 const [command,...rest]=argv;
 if(!command||['help','-h','--help'].includes(command)){console.log(HELP);return;}
 if(command==='balance'){
  if(rest.length)throw new Error('invalid_options');
  let eligible=0,claims=0;try{for(const f of readdirSync(claimDir())){if(!/^gitcoin-[a-f0-9]{40,64}-(?:website|app|repair|test|integration|data|other)\.json$/.test(f))continue;const d=JSON.parse(readFileSync(path.join(claimDir(),f),'utf8'));if(d.status==='provisional_not_minted'){eligible+=d.summary.eligible;claims++;}}}catch(e){if(e.code!=='ENOENT')throw e;}
  output({currency:'GIT',status:'wallet_not_connected',local_commits:claims,local_eligible_candidates:eligible,verified_wallet_balance:null,note:'Local candidates are not spendable; a remote authenticated wallet and Quant AI verification are required.'});return;
 }
 if(!['scan','preview'].includes(command))throw new Error('unknown_command');
 const o=options(rest),repo=repoOf(o);
 if(!o.intent)throw new Error('intent_required');
 if(command==='preview'){
  if(o.commit||o.builder)throw new Error('preview_uses_staged_diff');
  const diff=exec('git',['diff','--cached','--no-ext-diff','--no-renames','--unified=0','--']);
  const manifest=buildManifest(diff,{repo,commit:'0'.repeat(40),intent:o.intent,builderClaim:'human',githubLoginClaim:o['github-login']||null});
  output({currency:'GIT',status:'staged_preview_only',repo,summary:manifest.summary,note:'No receipts saved. Commit your work, then run gh gitcoin scan.'});return;
 }
 const commit=exec('git',['rev-parse','--verify','--end-of-options',`${o.commit||'HEAD'}^{commit}`]);
 const diff=exec('git',['show','--format=','--root','--no-ext-diff','--no-renames','--unified=0',commit]);
 const manifest=buildManifest(diff,{repo,commit,intent:o.intent,builderClaim:o.builder||'human',githubLoginClaim:loginOf(o)});
 const dir=claimDir();mkdirSync(dir,{recursive:true,mode:0o700});
 const target=path.join(dir,`gitcoin-${commit}-${o.intent}.json`),tmp=target+`.${process.pid}.tmp`;
 writeFileSync(tmp,JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});renameSync(tmp,target);
 output(manifest);
}
// Do not create network requests or wallet entries on module import.
try{main(process.argv.slice(2));}catch(error){console.error(`gitcoin: ${error.message}`);process.exitCode=2;}
