/* Search only actual registered source cards already in the Developer carousel.
 * Pure, bounded, case-insensitive; no network, synthetic records or HTML parsing.
 */
import {DEVELOPMENT_TOPICS} from './developer-discovery-core.mjs';
const allowedTopics=new Set(DEVELOPMENT_TOPICS.map(x=>x.id));
const normalized=value=>String(value||'').normalize('NFKD').toLowerCase()
 .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export function searchIndexedResources(entries,{topic='all',query='',offset=0,limit=8}={}){
 const safeLimit=Number.isInteger(limit)?Math.max(1,Math.min(12,limit)):8;
 const empty={items:[],total:0,offset:0,limit:safeLimit,nextOffset:null,previousOffset:null};
 if(!Array.isArray(entries)||entries.length===0)return empty;
 if(topic!=='all'&&!allowedTopics.has(topic))return empty;
 const input=String(query||'');
 if(input.length>80)return empty;
 const terms=normalized(input).split(/\s+/).filter(Boolean);
 const filtered=entries.filter(entry=>{
  const resource=entry?.resource;
  if(!resource||!Number.isSafeInteger(entry.index)||entry.index<0)return false;
  if(topic!=='all'&&resource.category!==topic)return false;
  if(!terms.length)return true;
  const haystack=normalized([resource.label,resource.description,resource.repo].filter(Boolean).join(' '));
  return terms.every(term=>haystack.includes(term));
 });
 const total=filtered.length;
 if(!total)return empty;
 const request=Number.isFinite(offset)?Math.max(0,Math.floor(offset)):0;
 const requestedPage=Math.floor(request/safeLimit)*safeLimit;
 const lastPage=Math.floor((total-1)/safeLimit)*safeLimit;
 const current=Math.min(requestedPage,lastPage);
 const result=filtered.slice(current,current+safeLimit);
 return {
  items:result,total,offset:current,limit:safeLimit,
  nextOffset:current+safeLimit<total?current+safeLimit:null,
  previousOffset:current>0?current-safeLimit:null
 };
}
