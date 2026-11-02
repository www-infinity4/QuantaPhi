/* Canonical Oracle department catalog. 21+ is never part of Mixed or ordinary feeds.
 * All categories are navigation scopes, not claims of live inventory or paid ads. */
(function(root){
'use strict';
const DEPARTMENTS=Object.freeze([
 ['mixed','Mixed · All ages'],['restaurants','Food · Restaurants'],['groceries','Food · Groceries'],['snacks','Food · Snacks & drinks'],
 ['fashion','Shopping · Fashion'],['department-stores','Shopping · Department stores'],
 ['auctions','Shopping · Auctions & collectibles'],['home','Shopping · Home & furniture'],
 ['electronics','Shopping · Electronics'],['toys','Shopping · Toys & hobbies'],
 ['gifts','Shopping · Gifts'],['automotive','Shopping · Automotive'],
 ['television','Entertainment · Television'],['movies','Entertainment · Movies'],
 ['music','Entertainment · Music & radio'],['games','Entertainment · Games'],
 ['sports','Entertainment · Sports'],['books','Entertainment · Books'],
 ['travel','Travel · Attractions'],['lodging','Travel · Hotels'],
 ['business','Services · Local businesses'],['health','Services · Health & wellness'],
 ['education','Services · Education'],['ai','Tools · AI & builders'],
 ['science','Tools · Science & research'],['news','Media · News'],['adult','21+ · Separate restricted section']
].map(([id,label])=>Object.freeze({id,label})));
const TERMS=Object.freeze({
 restaurants:['restaurant','dining','cuisine','eatery','bistro'],
 groceries:['grocer','walmart','food market','supermarket'],snacks:['snack','candy','gum','beverage','soda','pepsi'],
 fashion:['fashion','levi','jeans','clothing','apparel','shoes','guess','lingerie'],
 'department-stores':['department store','walmart','target','retail'],
 auctions:['auction','ebay','heritage','mercari','etsy','collectible','vintage','coin'],
 home:['furniture','decor','home','houseware','appliance'],
 electronics:['electronics','computer','phone','laptop'],
 toys:['toy','hobby','lego','puzzle'],
 gifts:['gift','greeting','jewelry'],
 automotive:['automotive','motor oil','auto parts','car','vehicle'],
 television:['television','fox','tv channel','kyou','live tv'],
 movies:['movie','cinema','film','halloween'],
 music:['music','radio','song','starmaker','media star'],
 games:['gaming','game','nintendo','fortnite','arcade'],
 sports:['sports','nba','mlb','baseball','football'],
 books:['book','reader','story','library','fiction'],
 travel:['travel','tourism','attraction','vacation','mountain','museum'],
 lodging:['hotel','motel','lodging','resort'],
 business:['business directory','local business','restaurant','retail','storefront'],
 health:['health','medical','wellness','fitness'],
 education:['education','school','learn','student','scholastic'],
 ai:['ai ','bubbles','zeus','gpt','builder','copilot','code phi'],
 science:['science','research','physics','nasa','asteroid'],
 news:['news','trending','journalism','headline']
});
function textOf(entry){
 return [entry?.id,entry?.feedId,entry?.title,entry?.category,
  entry?.node?.dataset?.sourceCategory,entry?.node?.dataset?.sourceName,entry?.node?.dataset?.ageRestricted]
 .filter(x=>typeof x==='string').join(' ').toLowerCase();
}
function isRestricted(entry){
 if(entry?.node?.dataset?.ageRestricted==='true')return true;
 return /21\+|22\+|adult|cannabis|dispensar|weedmaps|bruce.?banner|playboy|ammunition|firearms|gun shop|vape|tobacco|nicotine/.test(textOf(entry));
}
function matches(entry,department='mixed'){
 if(!DEPARTMENTS.some(x=>x.id===department))return false;
 if(department==='adult')return isRestricted(entry);
 if(isRestricted(entry))return false;
 if(department==='mixed')return true;
 return (TERMS[department]||[]).some(term=>textOf(entry).includes(term));
}
root.OracleDepartments=Object.freeze({DEPARTMENTS,isRestricted,matches});
})(window);
