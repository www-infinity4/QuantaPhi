'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {infer}=require('../phi-image-language.js');

test('ordinary poster request prints title and slogan verbatim without advanced options',()=>{
 const description='Design a mosaic poster for Oracle AI Studio - Mosaic with the phrase "The Intelligence Architecture Solution".';
 const result=infer(description,'Poster');
 assert.equal(result.source,'inferred');
 assert.equal(result.text,'Oracle AI Studio - Mosaic\nThe Intelligence Architecture Solution');
 assert.ok(result.text.split('\n').every(line=>description.includes(line)),'each printed line must come from user request');
});
test('the actual capitalization and punctuation never get respelled by a text model',()=>{
 const request='Poster for Oracle AI Studio - Mosaic with the slogan "The intelligence Architecture Solution"';
 assert.equal(infer(request,'Poster').text,'Oracle AI Studio - Mosaic\nThe intelligence Architecture Solution');
});
test('a single standalone brand-style design name can be the exact title',()=>{
 assert.equal(infer('Oracle AI Studio - Mosaic','Image').text,'Oracle AI Studio - Mosaic');
 assert.equal(infer('RadioShack','Image').text,'');
});
test('labeled title and tagline work even with no extra user controls',()=>{
 const request='Title: Oracle AI Studio - Mosaic\nTagline: The Intelligence Architecture Solution';
 assert.equal(infer(request,'Poster').text,'Oracle AI Studio - Mosaic\nThe Intelligence Architecture Solution');
});
test('ordinary scene descriptions never cause random automatic captions',()=>{
 for(const request of [
  'Draw a cherry tree in Iowa after the rain.',
  'Illustrate a scientist reading a book in a library.',
  'Mosaic stones surround a central blue sphere with luminous edges.',
  'A store sign beside a desert road, evening sunlight.'
 ])assert.equal(infer(request,'Image').text,'',request);
});
test('explicit requests for no words override title detection',()=>{
 const request='Make a poster for Oracle AI Studio - Mosaic without any text';
 assert.equal(infer(request,'Poster').text,'');
});
test('optional exact manual wording overrides inference, or can be disabled in UI',()=>{
 const chosen=infer('Poster for Oracle AI Studio','Poster','My Exact, Case-Sensitive Words!');
 assert.equal(chosen.text,'My Exact, Case-Sensitive Words!');
 assert.equal(chosen.source,'advanced');
});
test('long wording is never silently chopped or sent to compositor unverified',()=>{
 const title='This extremely long headline '.repeat(6);
 assert.equal(infer('Poster for ABC','Poster',title).error,'exact_words_too_long');
});

test('quoted slogans work with the single quotes common on phone keyboards',()=>{
 const request="Create a poster for Oracle AI Studio - Mosaic with the phrase 'The Intelligence Architecture Solution'";
 assert.equal(infer(request,'Poster').text,'Oracle AI Studio - Mosaic\nThe Intelligence Architecture Solution');
});
test('a customer can ask for exact sign words without entering an advanced lettering field',()=>{
 assert.equal(infer('Draw a storefront sign that says OPEN on a blue wall','Image').text,'OPEN');
});
