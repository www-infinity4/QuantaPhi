/* Native Infinity card over a verified Bubbles Meta Graph connector.
 * No provider cookies, passwords or access tokens enter this component. */
import {AccountConnections,resolveConnectorWalletToken} from './bubbles-connections.mjs';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const button=(label,onClick)=>{const b=el('button','qmeta-btn',label);b.type='button';b.addEventListener('click',onClick);return b};
const allowedLink=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
export function mountMetaSocialCard(root,card){
 const platform=card.id==='instagram'?'instagram':'facebook';
 const panel=el('section','qmeta qmeta-'+platform);
 panel.append(el('p','qmeta-kicker','INFINITY 2026® · META GRAPH API'),el('h3','',platform==='facebook'?'Facebook Pages':'Instagram Studio'));
 const status=el('p','qmeta-status','Account not connected. Only authorized Page content can appear here.');status.setAttribute('role','status');
 const controls=el('div','qmeta-controls');
 const account=el('select','qmeta-select');account.setAttribute('aria-label','Choose your Facebook Page');
 const see=button('Load actual posts',()=>void loadFeed());see.disabled=true;
 const prior=button('‹ Previous',()=>shift(-1)),next=button('Next ›',()=>shift(1));prior.disabled=next.disabled=true;
 const stream=el('div','qmeta-stream');stream.setAttribute('aria-live','polite');
 const composer=el('textarea','qmeta-compose');composer.maxLength=2000;composer.rows=3;composer.placeholder=platform==='facebook'?'Write a Facebook Page post':'Write a caption for your Instagram photo';composer.setAttribute('aria-label','Write your social post');
 const photo=el('input','qmeta-input');photo.type='url';photo.placeholder='https://quantaphi.org/your-approved-photo.jpg';photo.setAttribute('aria-label','Public QuantaPhi hosted photo URL');photo.hidden=platform!=='instagram';
 const send=button('Review & publish',()=>void publish());send.disabled=true;
 const opts=el('label','qmeta-option');const requestPublishing=el('input');requestPublishing.type='checkbox';opts.append(requestPublishing,document.createTextNode(' Request publishing permission at sign-in'));
 const connection=button('Connect with Meta',()=>void connect());connection.disabled=true;
 const refresh=button('Check connection',()=>void initialize());
 const help=el('a','qmeta-help','Meta developer app setup');help.href='https://developers.facebook.com/apps/';help.target='_blank';help.rel='noopener noreferrer';
 panel.append(status,opts,connection,refresh,account,controls,stream,composer,photo,send,help);
 controls.append(see,prior,next);
 let client=null,connectionId=null,pages=[],posts=[],position=0,grants=[];
 function clearPosts(){posts=[];position=0;stream.replaceChildren();prior.disabled=next.disabled=true;}
 function shift(delta){position=Math.max(0,Math.min(posts.length-1,position+delta));showPost();}
 function showPost(){
  stream.replaceChildren();prior.disabled=position<=0;next.disabled=position>=posts.length-1;
  const post=posts[position];if(!post){stream.append(el('p','qmeta-status','No authorized posts were returned for this account.'));return;}
  const article=el('article','qmeta-post');
  const header=el('p','qmeta-source',post.source+' · '+(post.at?new Date(post.at).toLocaleString():'Date unavailable'));article.append(header);
  if(allowedLink(post.image)){const image=el('img','qmeta-image');image.src=allowedLink(post.image);image.alt='Media from authorized '+post.source+' post';image.loading='lazy';article.append(image);}
  if(post.caption)article.append(el('p','qmeta-caption',post.caption));
  if(allowedLink(post.permalink)){const anchor=el('a','qmeta-help','View original post');anchor.href=allowedLink(post.permalink);anchor.target='_blank';anchor.rel='noopener noreferrer';article.append(anchor);}
  stream.append(article);
 }
 function updatePermissions(){
  const page=pages.find(p=>p.id===account.value);
  const read=platform==='facebook'?'pages.read':'instagram.read';
  const write=platform==='facebook'?'pages.publish':'instagram.publish';
  see.disabled=!page||!grants.includes(read)||(platform==='instagram'&&!page.instagram);
  send.disabled=!page||!grants.includes(write)||(platform==='instagram'&&!page.instagram)||(platform==='facebook'&&!page.canPublish);
 }
 async function initialize(){
  status.textContent='Checking authorized account permissions…';clearPosts();
  try{
   client=new AccountConnections({token:()=>resolveConnectorWalletToken(window)});
   if(location.pathname==='/source-quick-card.html'&&new URLSearchParams(location.search).get('card')===platform){
    client.resumePending(async error=>{if(error){status.textContent='Meta authorization could not finish. Try signing in again.';return;}await initialize();});
   }
   const [catalog,accounts]=await Promise.all([client.call('/catalog'),client.call('/accounts')]);
   const meta=catalog.providers?.find(p=>p.id==='meta');
   if(!meta?.configured){connection.disabled=true;see.disabled=true;send.disabled=true;status.textContent='Meta developer credentials and app permissions are not configured on Bubbles yet. No feed is available.';return;}
   connection.disabled=false;
   const existing=accounts.accounts?.find(p=>p.provider==='meta'&&p.status==='connected'&&p.expiresAt>Date.now()+30000);
   if(!existing){connectionId=null;status.textContent='Meta is ready for authorization. Connect the Facebook account that manages your Pages.';return;}
   connectionId=existing.id;grants=existing.grantedActions||[];
   const data=await client.call('/meta',{id:connectionId,operation:'pages'});
   pages=data.pages||[];account.replaceChildren();
   for(const page of pages){const opt=el('option','',page.name+(page.instagram?' · @'+page.instagram.username:''));opt.value=page.id;account.append(opt);}
   account.onchange=()=>{clearPosts();updatePermissions()};updatePermissions();
   connection.textContent='Reconnect / change permissions';
   status.textContent=pages.length?('Connected as '+existing.label+'. Select a Page and load actual posts.'):'Meta is connected, but no managed Facebook Pages were returned.';
  }catch{connectionId=null;connection.disabled=true;see.disabled=true;send.disabled=true;status.textContent='Could not verify a Bubbles wallet and Meta account connection. Open Account Connections to sign in.';}
 }
 async function connect(){
  const actions=platform==='facebook'?['pages.read']:['pages.read','instagram.read'];
  if(requestPublishing.checked)actions.push(platform==='facebook'?'pages.publish':'instagram.publish');
  connection.disabled=true;status.textContent='Opening official Facebook authorization…';
  try{await client.connect('meta',actions,async error=>{if(error){status.textContent='Meta authorization was not completed.';connection.disabled=false;return;}await initialize();},'/source-quick-card.html?card='+platform);}
  catch{connection.disabled=false;status.textContent='Could not start Meta authorization. Check the registered app and Bubbles session.';}
 }
 async function loadFeed(){
  if(!connectionId||!account.value)return;see.disabled=true;status.textContent='Reading attributed posts from the Meta API…';clearPosts();
  try{const d=await client.call('/meta',{id:connectionId,operation:platform+'.feed',pageId:account.value});posts=Array.isArray(d.posts)?d.posts:[];showPost();status.textContent=posts.length?posts.length+' posts from '+d.page+' · '+d.source:'No published content was returned from this Page.';}
  catch{status.textContent='Meta could not return this Page’s posts. Recheck permissions and Page access.';}
  finally{updatePermissions();}
 }
 async function publish(){
  const message=composer.value.trim();if(!message){status.textContent='Write a post before publishing.';return;}
  const page=pages.find(p=>p.id===account.value);if(!page||!connectionId)return;
  if(platform==='instagram'&&!/^https:\/\/quantaphi\.org\/.+\.(jpg|jpeg)$/i.test(photo.value.trim())){status.textContent='Instagram needs a public, approved image hosted on quantaphi.org.';return;}
  if(!window.confirm('Publish this '+platform+' post to '+page.name+'? This action will be public on Meta.'))return;
  send.disabled=true;status.textContent='Submitting only the confirmed post…';
  try{const result=await client.call('/meta',{id:connectionId,operation:platform+'.publish',pageId:page.id,message,
   ...(platform==='instagram'?{imageUrl:photo.value.trim()}:{}),confirmed:true});
   status.textContent=result.published?'Published. Meta post ID: '+result.postId:'Meta did not confirm publication.';
   if(result.published){composer.value='';void loadFeed();}
  }catch{status.textContent='Meta did not confirm publication. Check the Page and permissions before retrying to avoid duplicates.';}
  finally{updatePermissions()}
 }
 root.append(panel);void initialize();return panel;
}
