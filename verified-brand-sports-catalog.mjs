/* 25 October 2026 verified public-source cards.
 * Original-brand website favicons are loaded from the official domain via
 * Google's favicon service; no synthetic brand marks or fake offers.
 * Times are historical snapshots: event links own current data thereafter.
 */
const icon=domain=>'https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=128';
const nfl=team=>'https://a.espncdn.com/i/teamlogos/nfl/500/'+team+'.png';
const mlb=id=>'https://www.mlbstatic.com/team-logos/'+id+'.svg';
const entry=(id,name,kind,category,description,official,actions,visual,extra={})=>Object.freeze({
 id,name,kind,category,description,official,actions,visual,checked:'2026-10-25',...extra
});
const actions=(...pairs)=>pairs.map(([label,url])=>({label,url}));
export const REQUESTED_PUBLIC_CARDS=Object.freeze([
 entry('packers-lions-2026','Packers at Lions · FOX','game','NFL','Week 7, Sun Oct 25, 2026 · 3:25 PM Central at Ford Field. Official game status and highlights update at the sources.','https://www.packers.com/game-day/2026/reg-week7/packers-at-lions/',actions(
  ['FOX / FOX One viewing','https://www.fox.com/sports/football/nfl/watch-packers-vs-lions-oct-25-2026'],
  ['Official game center','https://www.packers.com/game-day/2026/reg-week7/packers-at-lions/'],
  ['Lions highlights','https://www.detroitlions.com/game-day/2026/reg-week7/packers-vs-lions/']
 ),nfl('gb'),{secondaryVisual:nfl('det'),date:'2026-10-25',network:'FOX',event:'NFL'}),
 entry('fox-nfl-watch','FOX NFL · Current scores & highlights','broadcast','NFL','Current NFL scores, game schedule and FOX source headlines refresh at the official publisher. Licensed video is provided by FOX or the viewer’s eligible provider, not QuantaPhi.','https://www.foxsports.com/nfl/scores',actions(
  ['Current FOX NFL scores','https://www.foxsports.com/nfl/scores'],
  ['FOX NFL highlights','https://www.foxsports.com/nfl'],
  ['FOX One streaming','https://www.fox.com/']
 ),icon('foxsports.com'),{event:'NFL'}),
 entry('lions-interception-watch','Lions · turnover and interception watch','tracker','NFL','Watch official play-by-play and video highlights for verified takeaways. This card does not assert an interception happened.','https://www.detroitlions.com/game-day/2026/reg-week7/packers-vs-lions/',actions(
  ['Scoring and play-by-play','https://www.detroitlions.com/game-day/2026/reg-week7/packers-vs-lions/'],
  ['FOX live updates','https://www.foxsports.com/live-blog/nfl/packers-vs-lions-live-updates-score'],
  ['Highlights','https://www.nfl.com/videos/']
 ),nfl('det'),{date:'2026-10-25',event:'NFL'}),
 entry('packers-next-schedule','Green Bay · schedule and next game','schedule','NFL','After Detroit, Green Bay is scheduled to host Carolina on Thursday, Oct 29 on Prime Video; confirm schedule changes.','https://www.packers.com/schedule/',actions(
  ['Official next game','https://www.packers.com/schedule/'],
  ['Roster and lineup','https://www.packers.com/team/players-roster/'],
  ['Latest Packers video','https://www.packers.com/video/']
 ),nfl('gb'),{event:'NFL'}),
 entry('lions-next-schedule','Detroit · upcoming games','schedule','NFL','After Green Bay, Detroit is scheduled to host Minnesota on Sunday, Nov 1 on FOX; confirm schedule changes.','https://www.detroitlions.com/schedule/',actions(
  ['Official next game','https://www.detroitlions.com/schedule/'],
  ['Roster','https://www.detroitlions.com/team/players-roster/'],
  ['Video highlights','https://www.detroitlions.com/video/']
 ),nfl('det'),{event:'NFL'}),
 entry('world-series-game3-2026','World Series · Game 3','game','MLB','Brewers at Rays · Monday Oct 26, 2026, 7 PM Central · FOX / FOX One. Series snapshot: Milwaukee leads 2–0 after Oct 24.','https://www.mlb.com/postseason',actions(
  ['FOX viewing','https://www.fox.com/'],
  ['World Series game center','https://www.mlb.com/postseason'],
  ['Official pregame preview','https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup']
 ),mlb(158),{secondaryVisual:mlb(139),date:'2026-10-26',network:'FOX',event:'MLB'}),
 entry('world-series-pitchers-2026','Game 3 · pitching matchup','matchup','MLB','Expected starters in the MLB preview: Brewers LHP Robert Gasser vs Rays RHP Freddy Peralta; status may change.','https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup',actions(
  ['Pitcher breakdown','https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup'],
  ['Brewers statistics','https://www.mlb.com/brewers/stats/pitching'],
  ['Rays statistics','https://www.mlb.com/rays/stats/pitching']
 ),mlb(158),{secondaryVisual:mlb(139),event:'MLB',date:'2026-10-26'}),
 entry('world-series-lineups-2026','Game 3 · starting lineup tracker','lineup','MLB','Lineups and substitutions may change up to first pitch. Open the MLB source for confirmed batting orders.','https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup',actions(
  ['Starting lineups','https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup'],
  ['Milwaukee roster','https://www.mlb.com/brewers/roster'],
  ['Tampa Bay roster','https://www.mlb.com/rays/roster']
 ),mlb(139),{secondaryVisual:mlb(158),event:'MLB',date:'2026-10-26'}),
 entry('world-series-game2-highlights','Game 2 · Brewers comeback highlights','highlights','MLB','Official MLB game highlights: Milwaukee beat Tampa Bay 5–4 on Oct 24, with Sal Frelick and Cooper Pratt contributing key hits.','https://www.mlb.com/video/rays-vs-brewers-game-2-highlights',actions(
  ['Watch original highlights','https://www.mlb.com/video/rays-vs-brewers-game-2-highlights'],
  ['Brewers recap','https://www.mlb.com/brewers/news/key-takeaways-from-world-series-game-2-2026'],
  ['Rays recap','https://www.mlb.com/rays/news/rays-blow-4-0-lead-lose-game-2-of-2026-world-series']
 ),mlb(158),{event:'MLB',date:'2026-10-24'}),
 entry('world-series-game1-recap','Game 1 · World Series recap','recap','MLB','Milwaukee defeated Tampa Bay 3–2 on October 23. Open the official postseason page for game coverage.','https://www.mlb.com/postseason',actions(
  ['Game results','https://www.mlb.com/postseason'],
  ['Game highlights','https://www.mlb.com/video/'],
  ['World Series news','https://www.mlb.com/news']
 ),mlb(139),{event:'MLB',date:'2026-10-23'}),
 entry('world-series-future-games','World Series · games 4–7','schedule','MLB','Game 4 Oct 27. Games 5–7 are conditional; verify their status on MLB’s official postseason schedule.','https://www.mlb.com/postseason',actions(
  ['Upcoming schedule','https://www.mlb.com/postseason'],
  ['MLB video','https://www.mlb.com/video/'],
  ['FOX sports','https://www.foxsports.com/mlb']
 ),mlb(158),{secondaryVisual:mlb(139),event:'MLB'}),
 entry('hidden-valley-ranch','Hidden Valley Ranch · recipes','food','Food & recipes','Official ranch recipes, dips and product ideas. Promotions and prizes are valid only under the original terms.','https://www.hiddenvalley.com/',actions(
  ['Find recipes','https://www.hiddenvalley.com/recipe/'],
  ['Products','https://www.hiddenvalley.com/'],
  ['Official promotions','https://www.hiddenvalley.com/']
 ),icon('hiddenvalley.com')),
 entry('kohls-coupons','Kohl’s · today’s deals','coupon','Retail & coupons','Browse current genuine Kohl’s coupons and Kohl’s Cash terms; never display an unverified code as active.','https://www.kohls.com/sale-event/todays-deals.jsp',actions(
  ['Current coupons and offers','https://www.kohls.com/sale-event/todays-deals.jsp'],
  ['Shop Kohl’s','https://www.kohls.com/'],
  ['Find a store','https://www.kohls.com/stores.shtml']
 ),icon('kohls.com'),{offer:{headline:'Earn $10 Kohl’s Cash for every $50 spent',endDate:'2026-10-25',redemption:'October 26–November 1, 2026',disclaimer:'Not valid on Sephora at Kohl’s. Check the official deal page for all exclusions.'}}),
 entry('honda-vehicles','Honda · vehicle builder','vehicle','Automotive','Compare actual Honda vehicles, specifications and builder options at Honda.','https://automobiles.honda.com/vehicles',actions(
  ['Models and prices','https://automobiles.honda.com/vehicles'],
  ['Build a Honda','https://automobiles.honda.com/'],
  ['Dealers','https://automobiles.honda.com/tools/current-offers']
 ),icon('automobiles.honda.com')),
 entry('oakley-meta','Oakley Meta · smart glasses','wearable','Wearable tech','Actual Oakley Meta glasses product and privacy documentation, without reusing an advertisement or implying a Muse partnership.','https://www.oakley.com/en-us/oakley-meta-faq',actions(
  ['Oakley Meta FAQ','https://www.oakley.com/en-us/oakley-meta-faq'],
  ['Official Oakley store','https://www.oakley.com/'],
  ['How it works','https://www.oakley.com/en-us/oakley-meta-faq']
 ),icon('oakley.com')),
 entry('gmc-trucks','GMC · trucks','vehicle','Automotive','Genuine GMC truck lineup and vehicle configurations.','https://www.gmc.com/trucks',actions(
  ['All GMC trucks','https://www.gmc.com/trucks'],
  ['Inventory','https://www.gmc.com/view-inventory'],
  ['Build and price','https://www.gmc.com/']
 ),icon('gmc.com')),
 entry('gmc-sierra-2026','GMC Sierra · pickup','vehicle','Automotive','Explore Sierra pickup trims and compare features directly with GMC.','https://www.gmc.com/trucks/sierra/1500',actions(
  ['Sierra lineup','https://www.gmc.com/trucks/sierra/1500'],
  ['Compare trims','https://www.gmc.com/trucks/sierra/1500/denali'],
  ['GMC inventory','https://www.gmc.com/view-inventory']
 ),icon('gmc.com')),
 entry('gmc-denali-2026','GMC Denali · 2026','vehicle','Automotive','2026 Sierra Denali and Denali Ultimate: official trim features, inventory, and available build details.','https://www.gmc.com/trucks/sierra/1500/denali',actions(
  ['Denali original source','https://www.gmc.com/trucks/sierra/1500/denali'],
  ['Compare GMC trucks','https://www.gmc.com/trucks'],
  ['Inventory','https://www.gmc.com/view-inventory']
 ),icon('gmc.com')),
 entry('carhartt-shop','Carhartt · workwear','retail','Clothing','Browse actual workwear and original product photographs at Carhartt.','https://www.carhartt.com/',actions(
  ['Shop workwear','https://www.carhartt.com/'],
  ['New arrivals','https://www.carhartt.com/'],
  ['Original brand','https://www.carhartt.com/']
 ),icon('carhartt.com')),
 entry('des-moines-register','Des Moines Register · Iowa news','news','Iowa news','Independent source card linking to original Iowa reporting; no publisher account bypass.','https://www.desmoinesregister.com/',actions(
  ['Latest Iowa reporting','https://www.desmoinesregister.com/'],
  ['Local sports','https://www.desmoinesregister.com/sports/'],
  ['News home','https://www.desmoinesregister.com/']
 ),icon('desmoinesregister.com')),
 entry('miller-meeks-ia1','Mariannette Miller-Meeks · IA-1','civic','Iowa civics','Neutral public-office information and the representative’s official updates. No election endorsements or targeted political advertising.','https://millermeeks.house.gov/',actions(
  ['Official House office','https://millermeeks.house.gov/'],
  ['House Clerk profile','https://clerk.house.gov/members/M001215'],
  ['Congress.gov','https://www.congress.gov/']
 ),icon('millermeeks.house.gov'),{nonTargeted:true}),
 entry('zach-nunn-ia3','Zach Nunn · Iowa','civic','Iowa civics','Neutral directory entry for the member’s congressional office; the exact official route must be verified before publication.','https://nunn.house.gov/',actions(
  ['Congressional office','https://nunn.house.gov/'],
  ['Official House directory','https://www.house.gov/representatives'],
  ['Congress.gov','https://www.congress.gov/']
 ),icon('nunn.house.gov'),{nonTargeted:true}),
 entry('hurley-surfwear','Hurley · surf and sport','retail','Clothing','Surf apparel and original brand collections.','https://www.hurley.com/',actions(
  ['Hurley shop','https://www.hurley.com/'],
  ['Collections','https://www.hurley.com/'],
  ['Original website','https://www.hurley.com/']
 ),icon('hurley.com')),
 entry('colorectal-screening','Colorectal screening · compare options','health','Health education','Neutral NCI guidance about colonoscopy, FIT, stool DNA screening including Cologuard, and when positive stool results need colonoscopy. Not a diagnosis.','https://www.cancer.gov/types/colorectal/screening-fact-sheet',actions(
  ['Compare screening tests','https://www.cancer.gov/types/colorectal/screening-fact-sheet'],
  ['Screening recommendations','https://ebccp.cancercontrol.cancer.gov/recommendation.do?topicId=102265'],
  ['Discuss with a clinician','https://www.cancer.gov/types/colorectal/screening-fact-sheet']
 ),icon('cancer.gov'),{nonTargeted:true}),
 entry('burger-king-chicken-2026','Burger King · new chicken sandwiches','food','Restaurants','Burger King announced Loaded Jalapeño and Club Original Chicken Sandwich options in July 2026. Participating restaurant availability may change.','https://news.bk.com/blog-posts/burger-king-r-expands-its-iconic-original-chicken-sandwich-lineup-with-two-bold-new-flavors',actions(
  ['See new sandwiches','https://news.bk.com/blog-posts/burger-king-r-expands-its-iconic-original-chicken-sandwich-lineup-with-two-bold-new-flavors'],
  ['Official menu','https://www.bk.com/'],
  ['Find nearby restaurants','https://www.bk.com/']
 ),'https://cdn.prod.website-files.com/631b4b4e277091ef01450237/6a4bbcaef5381d4ca4bf00a4_Burger-King-Expands-Its-Iconic-Original-Chicken-Sandwich-Lineup-with-Two-Bold-New-Flavors.jpg',{heroImage:true,photoAsOf:'July 2026 promotional photograph · original Burger King newsroom'}),
 entry('royal-caribbean-cruises','Royal Caribbean · cruise explorer','travel','Travel','Compare official itineraries, ships and cruise dates; final costs and availability come from Royal Caribbean.','https://www.royalcaribbean.com/',actions(
  ['Browse cruises','https://www.royalcaribbean.com/'],
  ['Ships and itineraries','https://www.royalcaribbean.com/'],
  ['Original provider','https://www.royalcaribbean.com/']
 ),icon('royalcaribbean.com')),
 entry('kraft-mac-cheese','Kraft Mac & Cheese · recipes','food','Food & recipes','Original Kraft Mac & Cheese products and cooking ideas at Kraft Heinz.','https://www.kraftheinz.com/kraft-mac-and-cheese',actions(
  ['Original Kraft products','https://www.kraftheinz.com/kraft-mac-and-cheese'],
  ['Kraft recipes','https://www.kraftheinz.com/kraft-mac-and-cheese'],
  ['Official website','https://www.kraftheinz.com/']
 ),icon('kraftheinz.com')),
 entry('tucker-kraft-plays','Tucker Kraft · Packers highlights','player','NFL','Tucker Kraft and Green Bay Packers official plays and team updates. Do not claim an interception or score without a verified play record.','https://www.packers.com/team/players-roster/',actions(
  ['Packers roster','https://www.packers.com/team/players-roster/'],
  ['Official game center','https://www.packers.com/game-day/2026/reg-week7/packers-at-lions/'],
  ['Video highlights','https://www.packers.com/video/']
 ),nfl('gb'),{event:'NFL'}),
 entry('ai-game-announcer','AI game announcer · facts only','announcer','Sports & AI','Experimental original narration of licensed or user-provided play facts; the broadcast stream remains at the rights-holder. No voice cloning or copied broadcast audio.','https://www.nfl.com/schedules/',actions(
  ['Official NFL game center','https://www.nfl.com/schedules/'],
  ['World Series game center','https://www.mlb.com/postseason'],
  ['FOX authorized viewing','https://www.fox.com/']
 ),icon('nfl.com'),{experimental:true})
]);
export const QUEUED_REQUESTS=Object.freeze([
 {name:'Crown Royal',reason:'Alcohol-related brand: age verification, audience controls and permitted informational artwork needed before publication'},
 {name:'Bud Light',reason:'Alcohol-related brand: age verification and compliant audience controls needed before publication'},
 {name:'Petrona',reason:'Ambiguous identity: verify the exact intended company or brand and its official artwork'},
 {name:'how',reason:'User wording ambiguous: preserve keyword until intended product or site is identified'},
 {name:'Viper Google simulator',reason:'Identify the exact simulator or game and obtain its original playable widget or permitted embed'},
 {name:'Oakley Muse advertisement',reason:'Original Muse-associated advertisement and permitted creative have not been verified; Oakley Meta source card is separate'},
 {name:'Live television within the card',reason:'Licensed FOX/MLB/NFL video player and authentication required; original watch destinations are linked'},
 {name:'Live AI radio commentary',reason:'Require a licensed or permissioned low-latency play feed; do not transcribe/rebroadcast protected feeds'},
 {name:'Every major brand / 1000 cards',reason:'Catalog pipeline remains open; never fabricate merchant logos, coupon validity, inventory or partnership'}
]);
export function validBrandSportsCard(c){
 if(!c||!(/^[a-z0-9-]{4,70}$/).test(c.id||'')||!c.name||!c.description||!c.visual||!Array.isArray(c.actions)||c.actions.length!==3)return false;
 for(const href of [c.official,c.visual,c.secondaryVisual,...c.actions.map(a=>a.url)].filter(Boolean)){
  let u;try{u=new URL(href)}catch{return false}
  if(u.protocol!=='https:'||u.username||u.password)return false;
 }
 return c.actions.every(a=>typeof a.label==='string'&&a.label.length>2);
}
