import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterFor, pickNextShowcase, canShowcaseAdvance} from '../shopphi-showcase-core.mjs';
import {contextFor,chooseCompanions} from '../shop-phi-switchboard.mjs';

test('cookout, movie night and kitchen form an ordered contextual shopping story',()=>{
 assert.equal(chapterFor('Oscar Mayer hot dogs and charcoal grills'),'cookout');
 assert.equal(chapterFor('Picnic table and outdoor barbecue'),'cookout');
 assert.equal(chapterFor('Popcorn, DVD player, couch and family movie'),'movie-night');
 assert.equal(chapterFor('Stove, recipe and kitchen appliances'),'kitchen');
 assert.equal(chapterFor('Starrett precision micrometers'),'tools');
 assert.equal(chapterFor('Art studios discover museum originals'),null);
});

test('showcase finishes its current shopping theme before moving to the next one',()=>{
 const cards=[
  {id:'picnic',title:'Picnic tables',photo:true},
  {id:'charcoal',title:'Charcoal barbecue grills',photo:true},
  {id:'movie',title:'Movies, candy and popcorn',photo:true},
  {id:'stove',title:'Stoves and kitchen appliances',photo:true},
  {id:'museum',title:'Art studios discover museum originals',photo:true},
  {id:'no-image',title:'Outdoor barbecue',photo:false}
 ];
 assert.equal(pickNextShowcase(cards,'picnic',new Set(['picnic']))?.id,'charcoal');
 assert.equal(pickNextShowcase(cards,'charcoal',new Set(['picnic','charcoal']))?.id,'movie');
 assert.equal(pickNextShowcase(cards,'movie',new Set(['picnic','charcoal','movie']))?.id,'stove');
 assert.equal(pickNextShowcase(cards,'stove',new Set(['picnic','charcoal','movie','stove'])),null);
});

test('no automatic card changes while interacting, paused, playing or in reduced motion',()=>{
 const ready={visible:true,hidden:false,paused:false,reducedMotion:false,focused:false,playing:false,editing:false,recencyMs:80000};
 assert.equal(canShowcaseAdvance(ready),true);
 for(const field of ['hidden','paused','reducedMotion','focused','playing','editing']){
  assert.equal(canShowcaseAdvance({...ready,[field]:true}),false,field);
 }
 assert.equal(canShowcaseAdvance({...ready,visible:false}),false);
 assert.equal(canShowcaseAdvance({...ready,recencyMs:5000}),false);
});

test('contextual companions never route a stroller to an art museum',()=>{
 const hero={id:'maclaren',title:'Maclaren',category:'Strollers',description:'Strollers, baby bags and related accessories'};
 const bad={id:'museum',title:'Art studios discover museum originals',description:'Independent source card related to this card',url:'https://museum.example',type:'website-card',sourceId:'museum'};
 const good={id:'stroller',title:'Stroller accessories and covers',description:'Accessories for strollers',url:'https://strollers.example',type:'website-card',sourceId:'stroller',image:'https://strollers.example/a.jpg'};
 assert.deepEqual(chooseCompanions(hero,[bad,good]).map(x=>x.id),['stroller']);
 assert.equal(contextFor({title:'Charcoal grills and picnic tables'}).id,'cookout');
 assert.equal(contextFor({title:'Popcorn and family movies'}).id,'movie-night');
 assert.equal(contextFor({title:'Stoves and new kitchen appliances'}).id,'kitchen');
});
