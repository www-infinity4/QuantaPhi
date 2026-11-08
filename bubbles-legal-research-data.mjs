/* Bubbles Legal Research Desk · public source catalog and local attorney prep.
 * No API, chatbot impersonation, user-data persistence, publishing or legal conclusions.
 * All linked resources are primary official sources or clearly attributed educational material.
 */
export const LEGAL_SOURCES=Object.freeze([
 {id:'play-account',authority:'Google Play Console Help',purpose:'Official developer account registration, identity requirements and the one-time $25 fee.',url:'https://support.google.com/googleplay/android-developer/answer/6112435'},
 {id:'play-testing',authority:'Google Play Console Help',purpose:'Official closed-testing and production-access requirements for qualifying personal accounts.',url:'https://support.google.com/googleplay/android-developer/answer/14151465'},
 {id:'play-policy',authority:'Google Play Developer Program',purpose:'Official AI content, intellectual-property, safety and app behavior policies.',url:'https://support.google.com/googleplay/android-developer/answer/18265346'},
 {id:'privacy-ftc',authority:'U.S. Federal Trade Commission',purpose:'Public guidance for limiting app data collection, permissions and protecting private records.',url:'https://www.ftc.gov/business-guidance/resources/mobile-health-app-developers-ftc-best-practices'},
 {id:'trademark-uspto',authority:'U.S. Patent and Trademark Office',purpose:'Federal trademark searching guidance; searching is not an attorney clearance opinion.',url:'https://www.uspto.gov/trademarks/search/federal-trademark-searching'},
 {id:'copyright-office',authority:'U.S. Copyright Office',purpose:'Official basics of copyright protection, registration and original creative works.',url:'https://www.copyright.gov/what-is-copyright/'},
 {id:'wex-contract',authority:'Cornell Legal Information Institute · Wex',purpose:'Free educational background on contracts and agreements; not personalized legal advice.',url:'https://www.law.cornell.edu/wex/contract'},
 {id:'courtlistener',authority:'Free Law Project · CourtListener',purpose:'Public case-law research resource; court decisions require jurisdiction and citation verification.',url:'https://www.courtlistener.com/'}
]);
export const LEGAL_TOPICS=Object.freeze([
 {id:'play',name:'Google Play registration and testing',question:'What documents, account ownership decisions, closed tests and verifiable approvals are required before submitting Bubbles to Google Play?',sourceIds:['play-account','play-testing','play-policy']},
 {id:'privacy',name:'Privacy, microphone and recordings',question:'How should the Bubbles app disclose and limit microphone use, recordings, cross-app permissions, data retention and account deletion?',sourceIds:['privacy-ftc','play-policy']},
 {id:'copyright',name:'Copyright and code ownership',question:'What records of original code, contributor agreements, AI-generated content and third-party licenses should an attorney review?',sourceIds:['copyright-office','wex-contract']},
 {id:'trademark',name:'Bubbles and QuantaPhi trademarks',question:'What name/logo searches, goods-and-services classifications and attorney clearance work may be appropriate?',sourceIds:['trademark-uspto']},
 {id:'contracts',name:'Hosting, model and GitHub agreements',question:'What supplier licenses, API permissions, employment/contractor IP assignments and provider terms should an attorney check?',sourceIds:['wex-contract','copyright-office']},
 {id:'cases',name:'Case-law source verification',question:'Which jurisdiction, effective dates and verified primary decisions would be required before reaching a legal conclusion?',sourceIds:['courtlistener']}
]);
const bySource=new Map(LEGAL_SOURCES.map(x=>[x.id,x]));
const byTopic=new Map(LEGAL_TOPICS.map(x=>[x.id,x]));
export function sourceForTopic(id){
 const topic=byTopic.get(id);
 return topic?topic.sourceIds.map(key=>bySource.get(key)):null;
}
export function buildAttorneyPrepPacket(input={}){
 if(!input||!Array.isArray(input.topicIds))throw Error('invalid_topics');
 const selected=[...new Set(input.topicIds)];
 if(selected.some(id=>typeof id!=='string'||!byTopic.has(id)))throw Error('invalid_topic');
 const raw=input.notes??'';
 if(typeof raw!=='string'||raw.length>2000)throw Error('notes_too_long');
 const notes=raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
 const lines=[
  'Bubbles Legal Research Desk — questions for a future licensed attorney',
  'Informational research packet only; not legal advice. No attorney-client relationship or privilege arises from this tool.',
  'Current project decision: Google Play one-time $25 registration route selected, but registration/payment not paid or verified.',
  'Attorney: lawyer not retained. Application review, trademarks, copyrights and regulatory compliance are not certified.',
  ''
 ];
 if(!selected.length)lines.push('No topics selected for review.');
 for(const [index,id] of selected.entries()){
  const topic=byTopic.get(id),sources=sourceForTopic(id);
  lines.push((index+1)+'. '+topic.name,topic.question,'Public research starting points:');
  for(const source of sources)lines.push(' - '+source.authority+': '+source.url);
  lines.push('Status: needs independent source/date verification and qualified attorney review.','');
 }
 if(notes)lines.push('Owner-supplied notes (not independently verified):',notes,'');
 lines.push('Confidentiality: Do not paste credentials, private user histories, recordings or identity numbers into public AI chats.',
  'Before signing or filing anything, verify law and facts with a licensed attorney in the relevant jurisdiction.');
 return lines.join('\n');
}
