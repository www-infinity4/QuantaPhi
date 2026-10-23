export async function saveSourceProposal(record){
 const bridge=window.QuantaCloudConnection||window.StarQuestCloudLedger;
 if(!bridge?.authenticatedFetch)throw Error('Sign in to save the source compensation ledger');
 const response=await bridge.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/source-ledger',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(record)});
 const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Source ledger save failed');return data.entry;
}
