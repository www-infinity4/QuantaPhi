const {readFileSync}=require('fs');
const path=require('path');
// Verify that the Search card source contains the improvement flag
const src=readFileSync(path.join(__dirname,'..','quick-card-search.mjs'),'utf8');
if(!src.includes('search-card-improved')){
  throw new Error('Improvement flag "search-card-improved" not found in quick-card-search.mjs');
}
