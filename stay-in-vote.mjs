/* Stay In & Vote: actual public API counts; no simulated votes or official election calls. */
const root=document.getElementById('stayInVoteCard');
if(root){
 const API='/api/stay-in-vote';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 const header=el('div',undefined,'siv-head');
 const img=el('img');img.src='/assets/stay-in-vote-ballot.svg';img.alt='Illustration of a ballot being placed in an Infinity community ballot box';img.width=560;img.height=320;img.loading='lazy';
 const intro=el('div',undefined,'siv-intro');
 intro.append(el('small','∞ INFINITY · STAY IN & VOTE'),el('h2','Stay In & Vote'),el('p','Study choices. Cast a community vote. Compare Infinity College and Bubbles research notes without confusing them with certified election results.'));
 header.append(img,intro);root.append(header);
 const warning=el('p','Official results are determined by election authorities. QuantaPhi ballots and Infinity College selections are separate, nonbinding public opinions.','siv-disclaimer');
 root.append(warning);
 const actions=el('div',undefined,'siv-actions');
 const refresh=el('button','Refresh community votes');refresh.type='button';refresh.className='siv-button';
 const bubble=el('a','Research with Bubbles');bubble.href='/bubbles.html';bubble.className='siv-button siv-secondary';
 const official=el('a','How results become official');official.href='https://www.eac.gov/election-officials/election-results-canvass-and-certification';official.target='_blank';official.rel='noopener noreferrer';official.className='siv-source';
 actions.append(refresh,bubble,official);root.append(actions);
 const status=el('p','Checking the independent community ballot service…','siv-status');status.setAttribute('role','status');root.append(status);
 const board=el('div',undefined,'siv-board');root.append(board);
 const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}};
 const showStatus=message=>{status.textContent=message};
 async function cast(pollId,choiceId){
  refresh.disabled=true;
  try{
   const bridge=window.QuantaCloudConnection;
   if(!bridge?.authenticatedFetch)throw Error('Connect your StarQuest account to cast a community vote.');
   if(bridge.ready)await bridge.ready;
   const response=await bridge.authenticatedFetch(API+'/ballot',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({pollId,choiceId}),cache:'no-store'
   });
   const reply=await response.json().catch(()=>({}));
   if(!response.ok||reply.ok!==true)throw Error(reply.error==='signin_required'?'Sign in to your StarQuest account first.':reply.error==='slow_down'?'Too many changes. Please try later.':reply.error||'Vote not recorded.');
   showStatus('Your verified community vote was recorded. You can change it while the poll is open. This does not cast an official election ballot.');
   await load(false);
  }catch(e){showStatus('No vote recorded: '+String(e.message||'service unavailable'))}
  finally{refresh.disabled=false}
 }
 function choiceRow(poll,option){
  const item=el('div',undefined,'siv-choice');
  const name=el('span',option.label,'siv-choice-title');
  const votes=Number(option.votes)||0;
  const total=Math.max(0,Number(poll.totalVotes)||0);
  const number=el('small',votes.toLocaleString()+' community vote'+(votes===1?'':'s')+' · '+(total?Math.round(votes*100/total):0)+'%');
  const bar=el('div',undefined,'siv-bar');const fill=el('div');fill.style.width=(total?100*votes/total:0)+'%';bar.append(fill);
  const castButton=el('button','Vote for this option','siv-vote');castButton.type='button';
  castButton.addEventListener('click',()=>{void cast(poll.id,option.id)});
  item.append(name,number,bar,castButton);return item;
 }
 function editorial(poll,voice,title){
  const pick=(poll.recommendations||[]).find(x=>x.voice===voice);
  const box=el('section',undefined,'siv-editorial');box.append(el('h4',title));
  if(!pick){box.append(el('p','No reviewed selection published yet. Nothing is counted as an electoral vote.'));return box}
  const selected=(poll.options||[]).find(x=>x.id===pick.choiceId);
  box.append(el('strong',selected?.label||'Unverified selection'),el('p',pick.summary));
  const source=safeUrl(pick.evidenceUrl);
  if(source){const a=el('a','Read supporting source');a.href=source;a.target='_blank';a.rel='noopener noreferrer';box.append(a)}
  if(pick.reviewedAt)box.append(el('small','Research reviewed '+new Date(pick.reviewedAt).toLocaleDateString()));
  return box;
 }
 function paint(polls){
  board.replaceChildren();
  if(!polls.length){board.append(el('p','No open, verified community polls have been published. The site does not generate fake races or winners.'));return}
  for(const poll of polls){
   if(poll.kind!=='community'||!Array.isArray(poll.options))continue;
   const card=el('section',undefined,'siv-poll');
   card.append(el('h3',poll.title),el('p',poll.details||''),
     el('small',(Number(poll.totalVotes)||0).toLocaleString()+' verified community votes · closes '+new Date(poll.closesAt).toLocaleDateString()));
   const source=safeUrl(poll.sourceUrl);
   if(source){const link=el('a','Background source');link.href=source;link.target='_blank';link.rel='noopener noreferrer';link.className='siv-source';card.append(link)}
   const ballot=el('div',undefined,'siv-options');
   for(const option of poll.options)ballot.append(choiceRow(poll,option));
   card.append(ballot);
   const lead=poll.communityLead&&poll.options.find(x=>x.id===poll.communityLead);
   card.append(el('p',lead?'Current community lead: '+lead.label+'. This is not an official election result.':'Community tally: no unique leading choice yet.','siv-lead'));
   const separate=el('div',undefined,'siv-research');
   separate.append(editorial(poll,'infinity','Infinity College · editorial selection'),editorial(poll,'bubbles','Bubbles · source-backed research'));
   card.append(separate);
   board.append(card);
  }
 }
 async function load(announce=true){
  try{
   const response=await fetch(API,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||data.ok!==true||data.scope!=='community_nonbinding'||!Array.isArray(data.polls))throw Error('Voting API unavailable or not verified');
   paint(data.polls);
   if(announce)showStatus('Verified independent community poll counts loaded. No government result is being declared.');
  }catch(e){
   board.replaceChildren(el('p','Community voting is not live yet. The database, authenticated API and public route must be verified before ballots can be accepted.'));
   if(announce)showStatus('Live community tally unavailable; no votes have been simulated.');
  }
 }
 refresh.addEventListener('click',()=>void load());
 root.addEventListener('oracle:activate',()=>void load());
 void load();
}
