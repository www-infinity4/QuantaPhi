const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('fred-spaces-radio.js','utf8');
const begin=src.indexOf('function payoutCaption(data){'),end=src.indexOf('function rememberEpisode(e){',begin);
assert.ok(begin>=0&&end>begin,'payment receipt caption must be present');
const script=src.slice(begin,end)+'\npayoutCaption';
const caption=vm.runInNewContext(script);

test('only a paired owner payout receipt permits a confirmed QuantaPhi owner StarCoin credit caption',()=>{
 const text=caption({charged:1,creatorPaid:true,ownerPaid:true,recipient:'platform-owner',receiptReference:'attempt-123'});
 assert.match(text,/QuantaPhi platform.owner wallet/i);
 assert.match(text,/confirmed/i);
 assert.doesNotMatch(text,/credited to Fred/i);
});
test('charged without verified owner receipt is always a discrepancy, not a successful payout',()=>{
 for(const receipt of [
  {charged:1},
  {charged:1,creatorPaid:true,recipient:'fred-krueger',receiptReference:'x'},
  {charged:1,creatorPaid:true,recipient:'platform-owner',receiptReference:'x'},
  {charged:1,creatorPaid:true,ownerPaid:true,recipient:'platform-owner'}
 ]){
  const text=caption(receipt);assert.match(text,/NOT verified/);assert.doesNotMatch(text,/credited to/i);
 }
});
test('owner preview and idempotent revisits never claim payouts or debit listeners',()=>{
 assert.match(caption({ownerPreview:true,charged:0}),/no StarCoin deducted/);
 assert.match(caption({charged:0}),/no new charge/);
});
test('checkout disclosure says the curated-link fee credits QuantaPhi owner, not Fred royalty',()=>{
 assert.match(src,/Spend 1 full StarCoin to reveal/);
 assert.match(src,/QuantaPhi platform.owner/i);
 assert.doesNotMatch(src,/StarCoin goes to Fred.s verified account/i);
 assert.doesNotMatch(src,/Pay Fred 1 full StarCoin/i);
});
