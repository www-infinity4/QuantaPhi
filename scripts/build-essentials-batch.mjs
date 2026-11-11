/* Offline review gate for <=120 independently sourced, editorial OTC cards.
 * This CLI does not search the internet, approve medical claims, or publish.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {prepareEssentialsBatch} from '../essentials-card-batch.mjs';
const source=process.argv[2];
const destination=process.argv[3]||'data/essentials-reviewed.json';
if(!source){console.error('Usage: node scripts/build-essentials-batch.mjs reviewed-input.json [reviewed-output.json]');process.exitCode=2;}
else{
 try{
  const sourceRows=JSON.parse(await readFile(source,'utf8'));
  if(!Array.isArray(sourceRows)||!sourceRows.length)throw Error('Input must contain at least one reviewed card');
  const result=prepareEssentialsBatch(sourceRows,{limit:120});
  if(result.held.length){
   const reasons=result.held.map(row=>(row.id||'unknown')+': '+row.reason).join('; ');
   throw Error(result.held.length+' cards held for review: '+reasons);
  }
  if(!result.cards.length)throw Error('No eligible reviewed cards');
  await writeFile(destination,JSON.stringify(result.cards,null,2)+'\n','utf8');
  console.log('Prepared '+result.cards.length+' reviewed cards at '+destination+'. Not published.');
 }catch(error){console.error(String(error?.message||error));process.exitCode=1;}
}