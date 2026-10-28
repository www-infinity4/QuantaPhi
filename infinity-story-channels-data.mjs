/* Infinity Reader channels — original stories plus licensed source discovery.
 * Fiction seeds are original QuantaPhi editorial fiction, NOT television scripts.
 * Historical seeds are brief QuantaPhi summaries linked to independently identified sources.
 */
const fiction=(id,title,paragraphs)=>({id,title,body:paragraphs,kind:'original',license:'Original QuantaPhi fiction'});
const facts=(id,title,source,paragraphs)=>({id,title,body:paragraphs,source,kind:'editorial',license:'QuantaPhi original summary · read and verify source'});
export const READER_CHANNELS=Object.freeze([
{
 id:'mystery',mount:'infinityReaderMystery',title:'Tales of Mystery & Suspense',subtitle:'Doors, detectives, unsolved riddles and quiet dread',icon:'⌕',color:'#763742',accent:'#ffd09a',
 mode:'books',terms:['mystery detective suspense','ghost stories','Sherlock Holmes','Gothic mystery','Wilkie Collins','Edgar Allan Poe','detective stories','strange tales','Arthur Conan Doyle','haunted house'],
 seeds:[
 fiction('mystery-01','The Key That Rang Twice',[
 'The key arrived in a plain envelope with no return address. Ada recognized the dent in its brass shoulder. Her father had carried it for years, even though he insisted that no lock in the house would accept it.',
 'At midnight the telephone rang. The caller said nothing. Behind the silence Ada heard a second telephone ringing, farther away, as though someone were calling from the end of a very long hallway. The key warmed in her palm.',
 'She tried the attic door. It opened onto a staircase she had never seen. At the bottom was a room containing only one table, one chair and a ringing telephone. On the table sat an envelope addressed in her own handwriting.',
 'Ada answered the telephone. A voice identical to hers said, “Whatever you do, leave the key where you found it.” Then the other Ada hung up. The ringing continued from somewhere upstairs.']),
 fiction('mystery-02','Passenger Without a Ticket',[
 'Every Thursday the last train stopped at Wicklow Junction, although the station had been abandoned for seventeen years. The conductor said the timetable was wrong. The driver said the signal was green. Neither ever looked toward the waiting room.',
 'One wet Thursday a young journalist stepped off with a camera. There was no platform light, yet a small orange square glowed behind the waiting-room glass. Inside sat a woman in a blue coat, holding a paper ticket with tomorrow’s date.',
 '“You are early,” she told him. Outside, the train began to depart. He chased it, but through every window he saw only himself seated where he had been a moment before.',
 'He returned to the waiting room. The woman had vanished. On the bench lay a second ticket, carrying his name and the words: RETURN TRIP.']),
 fiction('mystery-03','The Portrait in the Inventory',[
 'An estate appraiser photographed every object in the old boardinghouse. He recorded cracked mirrors, worn books and eleven portraits. At home, his inventory contained twelve photographs.',
 'The extra portrait showed a man facing away from the painter. Its frame was identical to the others, but the wall behind it was not. The wallpaper pattern matched a room that had been sealed before the appraiser was born.',
 'He opened the building at sunrise and counted eleven portraits again. The sealed room was empty except for a pale rectangle on the wall. He placed his camera on a tripod and took one photograph.',
 'When he checked the image, twelve portraits hung in the corridor. In the new one, a man held a camera and faced away from the painter.']),
 ]
},
{
 id:'twilight',mount:'infinityReaderTwilight',title:'Twilight Zone',subtitle:'An unofficial anthology of original speculative fiction',icon:'◐',color:'#302d60',accent:'#e7d0ff',
 mode:'books',terms:['science fiction short stories','H G Wells','time travel science fiction','future fiction','alternate realities science fiction','weird fiction','fantasy stories','speculative fiction','strange visitor','time paradox'],
 disclaimer:'Independent original fiction. Not affiliated with, adapted from, or endorsed by the television series or its rights holders.',
 seeds:[
 fiction('twilight-01','Tomorrow’s Missing Hour',[
 'At 1:59 every afternoon, the clock in the municipal building paused for sixty seconds. Nobody complained. It had done so for thirty years, and the town was always proud of being exactly one minute late.',
 'A visiting engineer replaced the clock. The next afternoon arrived without its missing minute. Shopkeepers lost their place in conversations. Cars reached intersections before their drivers made decisions. A child remembered a birthday party that had never happened.',
 'The engineer studied the old mechanism. Inside was a tiny handwritten instruction: “This minute belongs to tomorrow.”',
 'He reinstalled the clock. As the second hand hesitated, everyone in town felt the familiar relief of having one quiet minute in which their choices could catch up with them.']),
 fiction('twilight-02','The Exit Interview',[
 'Mara received a notice inviting her to an exit interview. The address was her apartment, and the appointment began at the moment she opened the letter.',
 'On the other side of her kitchen table sat a woman who looked like her at eighty. The older woman asked a single question: “Would you choose this life again if you knew every consequence?”',
 'Mara looked around at the dishes, her unfinished paintings and the unopened travel brochure. She could not answer without thinking of the days that had been hard and the days that had surprised her.',
 '“You have until tomorrow,” said the visitor, rising. “That is what I wanted when I was your age.” When Mara looked down, the appointment card now read: ENTRANCE INTERVIEW.']),
 fiction('twilight-03','A World Without the Color Blue',[
 'On Monday, blue disappeared. The sea turned silver, the sky looked pale and every blue shirt became a shade of gray. Scientists filled television studios with theories. Painters sat before empty canvases.',
 'One person in the city could still see the vanished color: a small girl who had spent the previous Sunday painting a picture of a door. She told her mother that blue had not gone away. It had simply moved somewhere people were not looking.',
 'The girl opened a drawer. Her painting showed a doorway glowing with a color nobody else could name. She walked through before anyone could stop her.',
 'On Tuesday, blue returned. In every painting shop, a new color appeared on the shelves. Its label was blank, and nobody could agree what it looked like.']),
 ]
},
{
 id:'tech',mount:'infinityReaderTech',title:'Tech History',subtitle:'The surprising moments that built our digital world',icon:'⌘',color:'#173c53',accent:'#aaf3f1',
 mode:'wiki',terms:['history of computer hardware','history of computing','early electronic computer','history of internet','computer science pioneers','invention of transistor','video game history','early computer networks','microprocessor history','computer programming history','space age technology','history of electronic communication'],
 seeds:[
 facts('tech-01','The Internet’s First Two Letters','https://www.lk.cs.ucla.edu/internet_first_words.html',[
 'On October 29, 1969, a UCLA computer was supposed to send the word LOGIN to a machine at Stanford Research Institute. Researcher Charley Kline typed, while Bill Duvall waited at the other end.',
 'The machines successfully exchanged L and O. Then the system failed. Those two letters became the first message sent over the ARPANET link. Roughly an hour later the full login worked.',
 'The event is a reminder that infrastructure now used by billions began with fragile equipment and people checking progress one letter at a time. The source includes the original laboratory log.'
 ]),
 facts('tech-02','A Transistor Changes the Scale of Technology','https://en.wikipedia.org/wiki/Transistor',[
 'In 1947, Bell Laboratories researchers demonstrated a transistor capable of amplifying an electrical signal. It offered a path toward replacing many bulky vacuum-tube functions with devices that could become smaller, cooler and more reliable.',
 'The early transistor was not yet a modern microchip. Development continued through new materials, mass-production methods and integrated circuits. Each generation made electronic systems more practical for ordinary people.',
 'This is a history of gradual engineering advances, not a single machine appearing overnight. Follow the source for the inventors, competing designs and the consequences for communications and computing.'
 ])
 ]
},
{
 id:'fame',mount:'infinityReaderFame',title:'Touts of Fame',subtitle:'Hidden achievements, unforgettable careers and the road to recognition',icon:'✦',color:'#6d3d13',accent:'#fff1a3',
 mode:'wiki',terms:['history of entertainment pioneers','women inventors biography','early jazz musicians','pioneers of cinema','civil rights performers','history of public recognition','famous explorers biography','early aviation pioneers','recording music innovators','forgotten scientists biography','theater pioneers','women in sports history'],
 seeds:[
 facts('fame-01','Sister Rosetta Tharpe and the Electric Stage','https://en.wikipedia.org/wiki/Sister_Rosetta_Tharpe',[
 'Long before rock music became a mass-market label, Sister Rosetta Tharpe combined gospel performance with bold electric-guitar playing. Her style connected church audiences, popular recordings and musicians who followed.',
 'Her musicianship did not fit comfortably into the categories many promoters wanted. That tension is part of the story: people can transform a field while the industry struggles to recognize where their work belongs.',
 'Later generations returned to her recordings and performance footage to understand how powerful her influence had been. This reader opens the documented biography and performance history.'
 ]),
 facts('fame-02','Hedy Lamarr: More Than a Movie Star','https://en.wikipedia.org/wiki/Hedy_Lamarr',[
 'Hedy Lamarr became famous through cinema, but her interests stretched well beyond the screen. During the Second World War she worked with composer George Antheil on a frequency-hopping communications concept.',
 'The idea was patented but not deployed in the manner they originally imagined. It is often discussed as part of the longer history of spread-spectrum communication; the specific technological connections require careful historical context.',
 'Her story raises a larger question: how many people are celebrated for the most visible part of their talent while other work remains overlooked?'
 ])
 ]
},
{
 id:'sports',mount:'infinityReaderSports',title:'Sports Almanac',subtitle:'Legends, pivotal plays, record books and forgotten games',icon:'★',color:'#12543b',accent:'#c2ffd7',
 mode:'wiki',terms:['history of baseball','sports world records history','Olympic Games records','famous sports rivalries','basketball historical games','soccer history records','tennis grand slam history','history of cycling records','ice hockey historic games','athletics world records','women sports pioneers','history of American football'],
 seeds:[
 facts('sports-01','The Mile That Broke Four Minutes','https://www.guinnessworldrecords.com/world-records/first-person-to-run-a-mile-in-less-than-four-minutes',[
 'On May 6, 1954, Roger Bannister ran a mile in 3 minutes 59.4 seconds at Oxford. The result broke a barrier that had fascinated runners and spectators for years.',
 'The achievement depended on preparation, pace-setting and a finishing effort, not a sudden change in human biology. Other athletes soon broke the four-minute mark too, turning a rare milestone into a new target.',
 'The almanac remembers both the record and the conditions that made it possible. The linked record source provides the date, location and official time.'
 ]),
 facts('sports-02','The 1951 Pennant’s Final Swing','https://en.wikipedia.org/wiki/Shot_Heard_%27Round_the_World_(baseball)',[
 'On October 3, 1951, Bobby Thomson of the New York Giants hit a ninth-inning home run against the Brooklyn Dodgers to win the National League pennant.',
 'The moment endured because the teams were fierce rivals, the race had tightened dramatically and the decisive swing came when the season was nearly gone. Radio and newspaper accounts helped carry the moment into baseball folklore.',
 'A great sports story is a play plus its stakes. Follow the historical source for the teams, box score and the era around the famous home run.'
 ])
 ]
},
{
 id:'cosmic',mount:'infinityReaderCosmic',title:'Beyond the Signal',subtitle:'Cosmic mysteries and original adventures beyond the map',icon:'✺',color:'#203968',accent:'#bfe4ff',
 mode:'books',terms:['astronomy science fiction','space travel stories','space exploration fiction','cosmic horror','planetary romance','science fiction galaxy','futuristic adventures','alien worlds fiction','inventions space science fiction','journey to the moon'],
 seeds:[
 fiction('cosmic-01','The Ocean Beneath the Static',[
 'A research vessel orbiting a frozen moon received a radio signal that sounded like surf breaking on a beach. The moon had no open water. Its surface temperature was far below freezing, and every instrument said the world was silent.',
 'The crew lowered a probe into a crack in the ice. At two kilometers, the signal grew louder. At three, a pattern emerged: seven waves, a pause and seven more. A mathematician noticed that the pauses matched the duration of the ship’s own transmissions.',
 'The crew sent a simple greeting. For one full hour nothing answered. Then the probe transmitted the sound of a door opening.',
 'Deep below the ice, something had learned that the people in orbit were listening.']),
 fiction('cosmic-02','The Fifth Moon',[
 'A planetary survey counted four moons around the gas giant Orpheus. The published map showed four pale circles, four orbits and four names chosen by a committee. A fifth moon appeared only in photographs made during eclipses.',
 'Every time the observatory tried to photograph it directly, the telescope recorded empty space. Yet its shadow crossed the clouds on schedule, and the spacecraft quietly adjusted their trajectories to avoid an object nobody could see.',
 'A junior technician discovered the fifth moon did not orbit Orpheus at all. The planet seemed to orbit the moon by a fraction of a fraction.',
 'She wrote the finding in her logbook, then looked out of the window. For the first time, she saw a small dark circle blocking the stars.']),
 fiction('cosmic-03','The Vacuum Orchard',[
 'The oldest station at the edge of the system had no crops, no greenhouse and no crew. Still, every passing ship reported a smell of citrus when it crossed the station’s radio beam.',
 'An engineer traced the signal to a locked laboratory. Inside were a dozen glass jars, each containing an ordinary-looking seed suspended in magnetic fields. The equipment was older than the station’s current owners.',
 'One jar carried a note: “Plant only where there is nothing.” The engineer held it against the window, where black space stretched beyond the station.',
 'The seed pushed a fine white root through the glass. Outside, against the starless dark, a leaf unfolded.'])
 ]
}
]);
export const CHANNEL_IDS=Object.freeze(READER_CHANNELS.map(x=>x.id));
export function channelById(id){return READER_CHANNELS.find(x=>x.id===id)||null}
