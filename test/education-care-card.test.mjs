import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EDUCATION_CARE_PHOTOS,educationCarePhotos,nextEducationCareIndex} from '../education-care-gallery.mjs';

test('schools, daycare and babysitting have credited non-person demo photos',()=>{
 const categories=['schools','daycare','babysitting'];
 for(const category of categories)assert.ok(educationCarePhotos(category).length>=1,category);
 assert.ok(EDUCATION_CARE_PHOTOS.length>=4);
 assert.ok(EDUCATION_CARE_PHOTOS.every(p=>p.licenseUrl.startsWith('https://creativecommons.org/')&&p.creditUrl.startsWith('https://commons.wikimedia.org/wiki/File:')));
 assert.ok(EDUCATION_CARE_PHOTOS.every(p=>p.imageUrl.startsWith('https://commons.wikimedia.org/wiki/Special:FilePath/')));
 assert.ok(EDUCATION_CARE_PHOTOS.every(p=>p.identifiableChildren===false&&p.rightsStatus==='published-commons-license'));
 assert.ok(EDUCATION_CARE_PHOTOS.every(p=>p.attribution&&p.alt&&p.title));
 assert.equal(educationCarePhotos('other').length,0);
});

test('manual photo navigation wraps, never skips an item',()=>{
 assert.equal(nextEducationCareIndex(0,4,1),1);
 assert.equal(nextEducationCareIndex(3,4,1),0);
 assert.equal(nextEducationCareIndex(0,4,-1),3);
 assert.equal(nextEducationCareIndex(0,0,1),0);
});

test('homepage mounts one school-care source card inside the existing Oracle viewer, not the restricted adult catalog',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const oracle=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 assert.match(html,/id="educationCareQuickCard"/);
 assert.match(html,/school-care-quick-card\.mjs/);
 assert.match(html,/school-care-quick-card\.css/);
 assert.match(oracle,/\['educationCareQuickCard','Schools, daycare & babysitting · Photo gallery'\]/);
 assert.match(oracle,/educationCareQuickCard:\['education-care-photos','Education & Care'/);
 const source=readFileSync(new URL('../school-care-quick-card.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/fetch\s*\(|localStorage|sessionStorage|document\.cookie|adultVideo|21\+|geolocation|upload|sendBeacon|<iframe/i);
 assert.match(source,/48/);
});
