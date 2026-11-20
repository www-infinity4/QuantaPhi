/* Education & Care photographic Quick Card, issue #1993.
 * Only source-licensed Commons images with no identifiable minors enter this public demo.
 * User example photos are visual references, NOT assets to upload or publish. */
export const EDUCATION_CARE_PHOTOS=Object.freeze([
 Object.freeze({
  id:'school-classroom',category:'schools',title:'Elementary classroom',
  alt:'Neatly arranged desks and learning displays in an elementary classroom',
  imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/Elementary_Classroom.jpg?width=960',
  creditUrl:'https://commons.wikimedia.org/wiki/File:Elementary_Classroom.jpg',
  attribution:'Sydney.lorraine5',license:'CC BY-SA 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
  rightsStatus:'published-commons-license',identifiableChildren:false
 }),
 Object.freeze({
  id:'preschool-room',category:'daycare',title:'Preschool activity room',
  alt:'Preschool classroom arranged with small tables, learning stations and play materials',
  imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/Preschool_Classroom.jpg?width=960',
  creditUrl:'https://commons.wikimedia.org/wiki/File:Preschool_Classroom.jpg',
  attribution:'Gammon-m',license:'CC BY-SA 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
  rightsStatus:'published-commons-license',identifiableChildren:false
 }),
 Object.freeze({
  id:'early-learning-room',category:'daycare',title:'Early learning environment',
  alt:'Small classroom with yellow walls, child-sized furniture and activity toys',
  imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/Early_Learning_Environment.jpg?width=960',
  creditUrl:'https://commons.wikimedia.org/wiki/File:Early_Learning_Environment.jpg',
  attribution:'Trickymac',license:'CC BY-SA 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
  rightsStatus:'published-commons-license',identifiableChildren:false
 }),
 Object.freeze({
  id:'baby-toys',category:'babysitting',title:'Babysitting activity materials',
  alt:'Assortment of colorful baby books, stacking toys and play materials',
  imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/Baby_toys.jpg?width=960',
  creditUrl:'https://commons.wikimedia.org/wiki/File:Baby_toys.jpg',
  attribution:'Mvolz',license:'CC0 1.0',
  licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
  rightsStatus:'published-commons-license',identifiableChildren:false
 })
]);
export function educationCarePhotos(category='all'){
 if(category==='all')return EDUCATION_CARE_PHOTOS;
 return ['schools','daycare','babysitting'].includes(category)
  ?EDUCATION_CARE_PHOTOS.filter(p=>p.category===category):[];
}
export function nextEducationCareIndex(index,length,step){
 return length?((index+step)%length+length)%length:0;
}

