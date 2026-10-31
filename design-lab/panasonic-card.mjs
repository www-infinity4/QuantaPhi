/* Power Chain source component: Panasonic public-index discovery only.
 * No provider sign-in, product-feed entitlement, checkout or inferred prices.
 */
import {BROKER} from './power-chain-core.mjs';
export const PANASONIC_SOURCE=Object.freeze({id:'panasonic',host:'panasonic.com',official:'https://www.panasonic.com/',authority:'read-public-index',limit:8});
const trim=(s,max)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,max);
export function planPanasonicSearch(query){
 const intent=trim(query,90);
 if(intent.length<3)throw new Error('Enter at least three characters to search Panasonic products.');
 return Object.freeze({source:PANASONIC_SOURCE.id,intent,limit:PANASONIC_SOURCE.limit,authority:'read-public-index',purchaseAuthority:false,brokerUrl:BROKER+'?'+new URLSearchParams({q:'site:panasonic.com '+intent,format:'json',categories:'general',safesearch:'1'})});
}
export function verifiedPanasonicResult(row){
 try{
  const url=new URL(String(row?.url??''));
  if(url.protocol!=='https:'||url.username||url.password||url.port||!(url.hostname==='panasonic.com'||url.hostname.endsWith('.panasonic.com')))return null;
  const title=trim(row?.title,140);
  if(!title)return null;
  url.hash='';
  return Object.freeze({title,url:url.href,description:trim(row?.content??row?.snippet??row?.description,220),source:'Panasonic domain · public index'});
 }catch{return null;}
}
export async function searchPanasonic(query,{fetcher=fetch,signal}={}){
 const plan=planPanasonicSearch(query);
 const response=await fetcher(plan.brokerUrl,{method:'GET',cache:'no-store',credentials:'omit',signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('Public search temporarily unavailable (HTTP '+response.status+').');
 const data=await response.json();
 if(!Array.isArray(data?.results))throw new Error('Public search returned an invalid response.');
 const seen=new Set(),results=[];
 for(const row of data.results.slice(0,35)){
  const item=verifiedPanasonicResult(row);
  if(!item||seen.has(item.url))continue;
  seen.add(item.url);results.push(item);
  if(results.length===plan.limit)break;
 }
 return Object.freeze({query:plan.intent,checked:1,source:'panasonic.com',results,found:results.length,verifiedAt:new Date().toISOString(),execution:'public-web-index',purchaseAuthority:false});
}
