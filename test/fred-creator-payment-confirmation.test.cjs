const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('fred-spaces-radio.js','utf8');
const begin=src.indexOf('function payoutCaption(data){'),end=src.indexOf('function rememberEpisode(e){',begin);
assert.ok(begin>=0&&end>begin,'payment receipt caption must be present');
const script=src.slice(begin,end)+'\npayoutCaption';
const caption=vm.runInNewContext(script);
test('a confirmed creator receipt includes the Fred beneficiary and reference',()=>{
 const text=caption({charged:1,creatorPaid:true,recipient:'fred-krueger',receiptReference:'attempt-123'});
 assert.match(text,/credited to Fred/);assert.match(text,/confirmed/);
});
test('a debit with no creator receipt is never presented as successful payment',()=>{
 for(const receipt of [{charged:1},{charged:1,creatorPaid:true,recipient:'wrong-account',receiptReference:'x'},{charged:1,creatorPaid:true,recipient:'fred-krueger'}]){
  const text=caption(receipt);assert.match(text,/NOT verified/);assert.doesNotMatch(text,/credited to Fred/);
 }
});
test('owner preview and idempotent revisits never claim creator payout',()=>{
 assert.match(caption({ownerPreview:true,charged:0}),/no StarCoin deducted/);
 assert.match(caption({charged:0}),/no new charge/);
});
test('paid Fred actions still use only the authenticated ledger endpoint, not synthetic browser mints',()=>{
 assert.match(src,/ledger\("\/v1\/spaces\/unlock","POST"/);
 assert.match(src,/payoutCaption\(data\)/);
 assert.doesNotMatch(src,/1 StarCoin paid to the QuantaPhi Media Star platform/);
});