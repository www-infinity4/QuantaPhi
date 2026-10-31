import {TINYFISH_CARDS} from './tinyfish-card-catalog.mjs';
import {GIT_APP_CARDS,gitCardRoute,gitRepoUrl} from './git-production-core.mjs';
import {HOUSING_QUICK_CARD,HOUSING_ALIASES} from './disability-housing-core.mjs';
import {HOUSING_HELP_RESOURCES,HOUSING_RESOURCE_ALIASES,housingResourceCard} from './housing-help-catalog.mjs';
const normalized=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases=Object.freeze({bk:'burger-king',burgerking:'burger-king',mcdonalds:'mcdonalds'});
export function lookupQuickCard(id){
 const git=GIT_APP_CARDS.find(stage=>stage.id===id);
 if(git)return {id:git.id,name:git.name,kind:'Development',official:gitRepoUrl(git.repo),
  feature:'GitHub production · '+git.name,description:git.role,route:gitCardRoute(git.id)};
 if(id===HOUSING_QUICK_CARD.id)return HOUSING_QUICK_CARD;
 if(typeof id==='string'&&id.startsWith('housing-help-'))return housingResourceCard({id:id.slice('housing-help-'.length)});
 if(typeof id!=='string'||!Object.hasOwn(TINYFISH_CARDS,id))return null;
 const item=TINYFISH_CARDS[id];
 try{
  const url=new URL(item.url);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  return {id:item.id,name:item.name,official:url.href,feature:'Visit '+item.name,kind:'Website',
   description:'Open the original website. Availability and services are confirmed by the provider.',
   route:'/source-quick-card.html?card='+encodeURIComponent(item.id)};
 }catch{return null}
}
export function searchQuickCards(query,{limit=4}={}){
 const q=normalized(String(query||'').slice(0,2000));if(!q)return [];
 const compact=q.replace(/ /g,''),alias=aliases[compact]||'',words=q.split(' ');
 const ranked=[];
 const housingPhrase=HOUSING_ALIASES.some(alias=>(' '+q+' ').includes(' '+normalized(alias)+' '));
 if(housingPhrase||q==='usda'||(/\b(?:disability|disabled|ssi|ssdi)\b/.test(q)&&/\b(?:home|homes|house|housing|loan)\b/.test(q)))ranked.push({card:HOUSING_QUICK_CARD,score:1100});
 for(const resource of HOUSING_HELP_RESOURCES){
  const match=(HOUSING_RESOURCE_ALIASES[resource.id]||[]).some(alias=>(' '+q+' ').includes(' '+normalized(alias)+' '));
  if(match)ranked.push({card:housingResourceCard(resource),score:1000});
 }
 for(const stage of GIT_APP_CARDS){
  const card=lookupQuickCard(stage.id),name=normalized(card.name),identity=normalized(stage.id),repo=normalized(stage.repo);
  const identityCompact=identity.replace(/ /g,''),nameCompact=name.replace(/ /g,'');
  let score=name===q?1000:nameCompact===compact?950:identity===q||identityCompact===compact?900:repo===q?880:0;
  if(!score&&q.length>=3&&(name.includes(q)||q.includes(name)||repo.includes(q)))score=500+name.length;
  if(score)ranked.push({card,score});
 }
 for(const id of Object.keys(TINYFISH_CARDS)){
  const card=lookupQuickCard(id);if(!card)continue;
  const name=normalized(card.name),nameCompact=name.replace(/ /g,''),identity=normalized(id);
  let score=id===alias?1200:name===q?1000:nameCompact===compact?950:identity===q?900:0;
  if(!score&&q.length>=3){
   if((' '+q+' ').includes(' '+name+' '))score=800+name.length;
   else if(words.every(w=>name.split(' ').includes(w)))score=500-q.length;
  }
  if(score)ranked.push({card,score});
 }
 return ranked.sort((a,b)=>b.score-a.score||a.card.name.localeCompare(b.card.name)).slice(0,Math.max(1,Math.min(8,Number(limit)||4))).map(x=>x.card);
}
