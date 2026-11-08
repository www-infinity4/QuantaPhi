/* Owner-directed editorial copy. It describes initiatives, not independently
 * verified title, live balances, accepted coin value or integrations. */
export const OWNER_SYSTEMS=Object.freeze([
 {id:'quantaphi',name:'QuantaPhi.org',summary:'A connected site for original Quick Cards, creator tools, media, discovery, and development projects.'},
 {id:'bubbles',name:'Bubbles GPT Brain',summary:'A coordinated build assistant designed to research, write source changes, test, review, and provide actual work receipts.'},
 {id:'search',name:'Infinity Phi & Omni Search',summary:'Complementary discovery models: Infinity Phi narrows a question toward the best direct card; Omni explores related concepts and weighted connections.'},
 {id:'unified-wallet',name:'Unified Wallet',summary:'One wallet view for multiple separate project ledgers; cash, rewards and draft coin balances must not be conflated.'},
 {id:'star-coin',name:'Star Coins',summary:'An internal content engagement and creator attribution ledger concept, with distinct viewer activity and creator reward rules.'},
 {id:'quants',name:'Quants',summary:'Project-defined accounting units for paid or metered services; any spend or payout requires an implemented, verified ledger.'},
 {id:'infinity-omni-tokens',name:'Infinity & Omni Tokens',summary:'Proposed tokens for the wider site and discovery ecosystem; utility, issuance and balances require independent verification.'},
 {id:'provenance',name:'GIT Coin, Bubble Bits & GPT Coin',summary:'Separate concepts for code provenance and genuine assistant work iterations, not interchangeable with cash or Star Coins.'}
]);
export const OWNER_PHOTO='/assets/gpt-art/gpt-owner-engineer.webp';
export function ownerCardReady({imageLoaded,rights}={}){return imageLoaded===true&&rights==='owner-approved'}
export function sanitizeOwnerPhoto(value){return value===OWNER_PHOTO?value:''}
export function ownerCtaUrl(){return '/website-viewer.html?site=chatgpt'}
