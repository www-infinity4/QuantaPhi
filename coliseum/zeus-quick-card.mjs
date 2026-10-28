import {mountCardActions} from '../quanta-card-actions.mjs';
const root=document.getElementById('coliseumZeusActions');
if(root)mountCardActions(root,{
 id:'coliseum-zeus',name:'Infinity Zeus 6.2',kind:'Collaborative building',
 feature:'Build in the Coliseum. Ideas, jousts, project branches, and Greek-god editions.',
 route:'/coliseum/',category:'Build',official:'https://quantaphi.org/coliseum/'
},{showSearch:false});
