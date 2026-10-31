/* Trusted original-site destinations. Register new external cards here before public execution. */
import {INFINITY_ACCEPTED_BRANDS} from './infinity-accepted-catalog.mjs';
const sources=[
 {"id":"walmart-shopping","name":"Walmart shopping","url":"https://www.walmart.com/"},
 {"id":"cardone-capital","name":"10X Westshore South · Cardone Capital","url":"https://cardonecapital.com/westshoresouth/"},
 {"id":"church-of-i-am","name":"Church of I AM · Gary Cardone","url":"https://x.com/GaryCardone"},
 {
  "id": "radio-zenith-transoceanic",
  "name": "Zenith Trans-Oceanic R-520",
  "url": "https://www.radiomuseum.org/r/zenith_trans_oceanic_r_520urr.html?language_id=2"
 },
 {
  "id": "radio-zenith-console",
  "name": "Zenith 7-S-363 Console",
  "url": "https://www.radiomuseum.org/r/zenith_7s363_7_s_363_ch5714.html"
 },
 {
  "id": "radio-philco-90",
  "name": "Philco Model 90",
  "url": "https://www.radiomuseum.org/r/philco_90.html"
 },
 {
  "id": "radio-rca-9x571",
  "name": "RCA Victor 9-X-571",
  "url": "https://www.radiomuseum.org/r/rca_9x571_9_x_571_chrc1079_rc.html?language_id=2"
 },
 {
  "id": "radio-atwater-kent-20",
  "name": "Atwater Kent Model 20",
  "url": "https://www.radiomuseum.org/forumdata/upload/atwater_kent_model_20.pdf"
 },
 {
  "id": "just-radios",
  "name": "JustRadios Tube Radio Kits",
  "url": "https://www.justradios.com/capkits.html"
 },
 {
  "id": "robinhood",
  "name": "Robinhood",
  "url": "https://robinhood.com/"
 },
 {
  "id": "chime",
  "name": "Chime Banking",
  "url": "https://www.chime.com/"
 },
 {
  "id": "x-money",
  "name": "X Money · QuantaPhi Guide",
  "url": "https://money.x.com/en"
 },
 {
  "id": "ebay",
  "name": "eBay Marketplace",
  "url": "https://www.ebay.com/"
 },
 {
  "id": "gold",
  "name": "Gold Spot Charts",
  "url": "https://www.kitco.com/price"
 },
 {
  "id": "silver",
  "name": "Silver Spot Charts",
  "url": "https://www.kitco.com/price"
 },
 {
  "id": "us-mint",
  "name": "United States Mint",
  "url": "https://www.usmint.gov/shop/"
 },
 {
  "id": "pcgs",
  "name": "PCGS CoinFacts",
  "url": "https://www.pcgs.com/coinfacts"
 },
 {
  "id": "ngc",
  "name": "NGC Coin Explorer",
  "url": "https://www.ngccoin.com/coin-explorer/"
 },
 {
  "id": "x-live-spaces",
  "name": "X Spaces",
  "url": "https://x.com/i/spaces"
 },
 {
  "id": "wikipedia",
  "name": "Wikipedia Discovery",
  "url": "https://en.wikipedia.org/wiki/Special:Random"
 },
 {
  "id": "vam-scarface",
  "name": "VAMWorld · Scarface",
  "url": "https://vamworld.com/wiki/Top_100_Morgan_VAMs"
 },
 {
  "id": "vam-hotlips",
  "name": "VAMWorld · Hot Lips",
  "url": "https://vamworld.com/wiki/Top_100_Morgan_VAMs"
 },
 {
  "id": "vam-spitting-eagle",
  "name": "VAMWorld · Spitting Eagle",
  "url": "https://vamworld.com/wiki/Top_100_Morgan_VAMs"
 },
 {
  "id": "vam-annual",
  "name": "VAMWorld Annual Studies",
  "url": "https://www.vamworld.com/wiki/John_Roberts%27_Annual_Lists"
 },
 {
  "id": "instructables",
  "name": "Instructables",
  "url": "https://www.instructables.com/"
 },
 {
  "id": "vintage-toys",
  "name": "Vintage Toys",
  "url": "https://www.ebay.com/b/Vintage-Antique-Toys/19071/bn_1862650"
 },
 {
  "id": "antique-collectibles",
  "name": "Antiques and Collectibles",
  "url": "https://www.ebay.com/b/Antiques/20081/bn_1851017"
 },
 {
  "id": "google",
  "name": "Google",
  "url": "https://www.google.com/"
 },
 {
  "id": "youtube",
  "name": "YouTube",
  "url": "https://www.youtube.com/"
 },
 {
  "id": "facebook",
  "name": "Facebook",
  "url": "https://www.facebook.com/"
 },
 {
  "id": "instagram",
  "name": "Instagram",
  "url": "https://www.instagram.com/"
 },
 {
  "id": "chatgpt",
  "name": "ChatGPT",
  "url": "https://chatgpt.com/"
 },
 {
  "id": "gemini",
  "name": "Google Gemini",
  "url": "https://gemini.google.com/"
 },
 {
  "id": "claude",
  "name": "Anthropic Claude",
  "url": "https://claude.ai/"
 },
 {
  "id": "copilot",
  "name": "GitHub Copilot",
  "url": "https://github.com/copilot"
 },
 {
  "id": "x",
  "name": "X / Grok",
  "url": "https://x.com/"
 },
 {
  "id": "reddit",
  "name": "Reddit",
  "url": "https://www.reddit.com/"
 },
 {
  "id": "tiktok",
  "name": "TikTok",
  "url": "https://www.tiktok.com/"
 },
 {
  "id": "whatsapp",
  "name": "WhatsApp",
  "url": "https://www.whatsapp.com/"
 },
 {
  "id": "bing",
  "name": "Bing",
  "url": "https://www.bing.com/"
 },
 {
  "id": "yahoo-news",
  "name": "Yahoo News",
  "url": "https://news.yahoo.com/"
 },
 {
  "id": "cnn",
  "name": "CNN",
  "url": "https://www.cnn.com/"
 },
 {
  "id": "fox-one",
  "name": "FOX One",
  "url": "https://www.fox.com/"
 },
 {
  "id": "fox-one-live-news",
  "name": "FOX One · Live News",
  "url": "https://www.fox.com/stream/fox-news"
 },
 {
  "id": "fox-news",
  "name": "Fox News",
  "url": "https://www.foxnews.com/"
 },
 {
  "id": "tv-guide",
  "name": "TV Guide",
  "url": "https://www.tvguide.com/"
 },
 {
  "id": "starmaker",
  "name": "StarMaker",
  "url": "https://www.starmakerstudios.com/en/songs"
 },
 {
  "id": "vamworld",
  "name": "VAMWorld",
  "url": "https://vamworld.com/"
 },
 {
  "id": "heritage",
  "name": "Heritage Auctions",
  "url": "https://coins.ha.com/"
 },
 {
  "id": "topps",
  "name": "Topps",
  "url": "https://www.topps.com/"
 },
 {
  "id": "beckett",
  "name": "Beckett",
  "url": "https://www.beckett.com/"
 },
 {
  "id": "christies",
  "name": "Christie’s",
  "url": "https://www.christies.com/"
 },
 {
  "id": "morrison-hotel-gallery",
  "name": "Morrison Hotel Gallery",
  "url": "https://morrisonhotelgallery.com/"
 },
 {
  "id": "rolling-stone",
  "name": "Rolling Stone",
  "url": "https://www.rollingstone.com/"
 },
 {
  "id": "coinworld",
  "name": "Coin World",
  "url": "https://www.coinworld.com/"
 },
 {
  "id": "coinage",
  "name": "COINage",
  "url": "https://www.coinagemag.com/"
 },
 {
  "id": "shoplc-premium",
  "name": "Shop LC · Premium",
  "url": "https://www.shoplc.com/collections/chairmans-collection"
 },
 {
  "id": "sonic",
  "name": "SONIC",
  "url": "https://pages-a.sonicdrivein.com/deals/"
 },
 {
  "id": "burger-king",
  "name": "Burger King",
  "url": "https://www.bk.com/"
 },
 {
  "id": "mcdonalds",
  "name": "McDonald’s",
  "url": "https://www.mcdonalds.com/us/en-us/deals.html"
 },
 {
  "id": "loc",
  "name": "Library of Congress",
  "url": "https://www.loc.gov/collections/"
 },
 {
  "id": "nasa-library",
  "name": "NASA Image Library",
  "url": "https://images.nasa.gov/"
 },
 {
  "id": "pepe-brooke",
  "url": "https://www.pepejeans.com/uk/en_gb/pd/iconic-brooke---low-rise-slim-fit-jeans-PL20506284UA.html"
 },
 {
  "id": "pepe-vapour",
  "url": "https://www.pepejeans.in/vapour-dark-blue-low-rise-tapered-jeans/PM207785J671.html"
 },
 {
  "id": "guess-g11-light",
  "url": "https://www.guess.com/en-us/guess-jeans/denim/women/jeans/g11-wide-leg-jeans-blue/W4BA0YD5CCA-GJRV.html"
 },
 {
  "id": "guess-g11-dark",
  "url": "https://www.guess.com/en-us/guess-jeans/denim/women/jeans/g11-wide-leg-jeans-blue/W5RA0YD5M42-GJHR.html"
 },
 {
  "id": "levis-501-dark",
  "url": "https://www.levi.com/US/en_US/clothing/men/jeans/straight/501-original-fit-mens-jeans/p/005013373"
 },
 {
  "id": "levis-501-medium",
  "url": "https://www.levi.com/US/en_US/clothing/men/jeans/straight/501-original-fit-mens-jeans/p/005013306"
 },
 {
  "id": "packers-lions-2026",
  "name": "Packers at Lions · FOX",
  "url": "https://www.packers.com/game-day/2026/reg-week7/packers-at-lions/"
 },
 {
  "id": "fox-nfl-watch",
  "name": "FOX NFL · Watch & highlights",
  "url": "https://www.foxsports.com/nfl"
 },
 {
  "id": "lions-interception-watch",
  "name": "Lions · turnover and interception watch",
  "url": "https://www.detroitlions.com/game-day/2026/reg-week7/packers-vs-lions/"
 },
 {
  "id": "packers-next-schedule",
  "name": "Green Bay · schedule and next game",
  "url": "https://www.packers.com/schedule/"
 },
 {
  "id": "lions-next-schedule",
  "name": "Detroit · upcoming games",
  "url": "https://www.detroitlions.com/schedule/"
 },
 {
  "id": "world-series-game3-2026",
  "name": "World Series · Game 3",
  "url": "https://www.mlb.com/postseason"
 },
 {
  "id": "world-series-pitchers-2026",
  "name": "Game 3 · pitching matchup",
  "url": "https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup"
 },
 {
  "id": "world-series-lineups-2026",
  "name": "Game 3 · starting lineup tracker",
  "url": "https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup"
 },
 {
  "id": "world-series-game2-highlights",
  "name": "Game 2 · Brewers comeback highlights",
  "url": "https://www.mlb.com/video/rays-vs-brewers-game-2-highlights"
 },
 {
  "id": "world-series-game1-recap",
  "name": "Game 1 · World Series recap",
  "url": "https://www.mlb.com/postseason"
 },
 {
  "id": "world-series-future-games",
  "name": "World Series · games 4–7",
  "url": "https://www.mlb.com/postseason"
 },
 {
  "id": "hidden-valley-ranch",
  "name": "Hidden Valley Ranch · recipes",
  "url": "https://www.hiddenvalley.com/"
 },
 {
  "id": "kohls-coupons",
  "name": "Kohl’s · today’s deals",
  "url": "https://www.kohls.com/sale-event/todays-deals.jsp"
 },
 {
  "id": "honda-vehicles",
  "name": "Honda · vehicle builder",
  "url": "https://automobiles.honda.com/vehicles"
 },
 {
  "id": "oakley-meta",
  "name": "Oakley Meta · smart glasses",
  "url": "https://www.oakley.com/en-us/oakley-meta-faq"
 },
 {
  "id": "gmc-trucks",
  "name": "GMC · trucks",
  "url": "https://www.gmc.com/trucks"
 },
 {
  "id": "gmc-sierra-2026",
  "name": "GMC Sierra · pickup",
  "url": "https://www.gmc.com/trucks/sierra/1500"
 },
 {
  "id": "gmc-denali-2026",
  "name": "GMC Denali · 2026",
  "url": "https://www.gmc.com/trucks/sierra/1500/denali"
 },
 {
  "id": "carhartt-shop",
  "name": "Carhartt · workwear",
  "url": "https://www.carhartt.com/"
 },
 {
  "id": "des-moines-register",
  "name": "Des Moines Register · Iowa news",
  "url": "https://www.desmoinesregister.com/"
 },
 {
  "id": "miller-meeks-ia1",
  "name": "Mariannette Miller-Meeks · IA-1",
  "url": "https://millermeeks.house.gov/"
 },
 {
  "id": "zach-nunn-ia3",
  "name": "Zach Nunn · Iowa",
  "url": "https://nunn.house.gov/"
 },
 {
  "id": "hurley-surfwear",
  "name": "Hurley · surf and sport",
  "url": "https://www.hurley.com/"
 },
 {
  "id": "colorectal-screening",
  "name": "Colorectal screening · compare options",
  "url": "https://www.cancer.gov/types/colorectal/screening-fact-sheet"
 },
 {
  "id": "burger-king-chicken-2026",
  "name": "Burger King · new chicken sandwiches",
  "url": "https://news.bk.com/blog-posts/burger-king-r-expands-its-iconic-original-chicken-sandwich-lineup-with-two-bold-new-flavors"
 },
 {
  "id": "royal-caribbean-cruises",
  "name": "Royal Caribbean · cruise explorer",
  "url": "https://www.royalcaribbean.com/"
 },
 {
  "id": "kraft-mac-cheese",
  "name": "Kraft Mac & Cheese · recipes",
  "url": "https://www.kraftheinz.com/kraft-mac-and-cheese"
 },
 {
  "id": "tucker-kraft-plays",
  "name": "Tucker Kraft · Packers highlights",
  "url": "https://www.packers.com/team/players-roster/"
 },
 {
  "id": "ai-game-announcer",
  "name": "AI game announcer · facts only",
  "url": "https://www.nfl.com/schedules/"
 }
];
export const TINYFISH_CARDS=Object.freeze(Object.fromEntries([...sources,...INFINITY_ACCEPTED_BRANDS.map(c=>({id:c.id,name:c.name,url:c.official,actions:c.actions}))].map(c=>[c.id,Object.freeze(c)])));
export function tinyfishCard(id){
 if(typeof id!=='string')return null;
 if(Object.hasOwn(TINYFISH_CARDS,id))return TINYFISH_CARDS[id];
 // Museum IDs come from the original collection API. The path is derived,
 // never supplied as a free-form URL by a visitor or remote page.
 const art=/^aic-([1-9][0-9]{0,8})$/.exec(id);
 return art?{id,name:'Art Institute of Chicago',url:'https://www.artic.edu/artworks/'+art[1]}:null;
}
