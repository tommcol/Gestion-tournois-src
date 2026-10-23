import test from 'node:test';
import assert from 'node:assert/strict';
import { initialData } from '../data/initialData.ts';
import { reassignOfficials, officialName, missingOfficialLabel } from '../utils/officialAssignments.ts';
import { createOfficialRouteDocument } from '../utils/officialRoadmaps.ts';
import { tournamentReducer } from '../context/tournamentReducer.ts';
import { finalMatchStartIssue } from '../utils/finalMatchSafety.ts';
import { RoomEngine } from '../cloudflare/roomEngine.ts';
import { applyStatePatch } from '../utils/statePatch.ts';
const category=(id,ref=true,scorer=false)=>({...initialData.categories[0],id,name:id,isRefereeMandatory:ref,isScorerMandatory:scorer});
const staff=(id,roles=['Arbitre'])=>({id:'official-'+id,firstName:'Test',lastName:id,roles,active:true,finalsReferee:true,finalsScorer:true});
function fixture(n=10,courts=1){
  return {...structuredClone(initialData),categories:[category('c')],teams:[{id:'a',name:'A',categoryId:'c',players:[],poolId:'pool'},{id:'b',name:'B',categoryId:'c',players:[],poolId:'pool'}],matches:Array.from({length:n*courts},(_,i)=>({id:'m'+i,team1Id:'a',team2Id:'b',poolId:'pool',round:'Pool',court:i%courts+1,sessionNumber:Math.floor(i/courts)+1,status:'pending',score1:null,score2:null,refereeId:null,scorerId:null})),finalMatches:{},officials:[],isTournamentStarted:false,currentSession:1};
}
test('joueurs : 30 % des sessions sans match, repos, jamais leur poule et pas de double rôle',()=>{
  let s=fixture(12);s.categories.push(category('home'));
  const player={id:'p',firstName:'Joueur',lastName:'Test',roles:['Joueur','Arbitre','Marqueur']};
  s.teams.push({id:'home',categoryId:'home',poolId:'home-pool',name:'Home',players:[player]});
  for(const i of [0,11])s.matches[i]={...s.matches[i],team1Id:'home',poolId:'home-pool'};
  const result=reassignOfficials(s), duties=result.matches.filter(m=>m.refereeId==='p'||m.scorerId==='p');
  assert.equal(duties.length,3);
  for(const m of duties){assert.notEqual(m.poolId,'home-pool');assert.notEqual(m.team1Id,'home');assert.ok(!duties.some(other=>other.id!==m.id&&Math.abs(other.sessionNumber-m.sessionNumber)<=1));assert.ok(![1,2,11,12].includes(m.sessionNumber));}
  s=fixture(6);s.teams[0].players=[player];s.teams[0].poolId='pool';assert.equal(reassignOfficials(s).matches.filter(m=>m.refereeId==='p').length,0);
});
test('trois sessions disponibles donnent zéro mission joueur, et les catégories sans rôles restent vides',()=>{
  const s=fixture(3);s.teams.push({id:'rest',categoryId:'c',poolId:'other',name:'Rest',players:[{id:'p',roles:['Joueur','Arbitre'],firstName:'P',lastName:'P'}]});
  assert.ok(reassignOfficials(s).matches.every(m=>m.refereeId==='Staff'));
  s.categories=[category('c',false,false)];s.officials=[staff('a',['Arbitre','Marqueur'])];assert.ok(reassignOfficials(s).matches.every(m=>m.refereeId===null&&m.scorerId===null));
});
test('70 %, pauses décalées et aucun changement de terrain pendant deux sessions consécutives',()=>{
  const s=fixture(10,7);s.officials=Array.from({length:10},(_,i)=>staff(String(i)));const next=reassignOfficials(s);
  for(const p of s.officials){const duties=next.matches.filter(m=>m.refereeId===p.id);assert.ok(duties.length<=7);assert.ok(duties.length>=6);for(let i=1;i<duties.length;i++)if(duties[i].sessionNumber===duties[i-1].sessionNumber+1)assert.equal(duties[i].court,duties[i-1].court);}
  for(let n=1;n<=10;n++) {const ids=next.matches.filter(m=>m.sessionNumber===n).map(m=>m.refereeId).filter(id=>id!=='Staff');assert.equal(ids.length,new Set(ids).size);}
  const pauses=s.officials.map(p=>next.matches.filter(m=>m.refereeId===p.id).map(m=>m.sessionNumber).join(','));assert.ok(new Set(pauses).size>2);
});
test('double rôle : priorité à tous les arbitrages avant les tables, quota commun',()=>{
  const s=fixture();s.categories=[category('c',true,true)];s.officials=[staff('double',['Arbitre','Marqueur']),staff('marque',['Marqueur'])];const next=reassignOfficials(s);
  assert.equal(next.matches.filter(m=>m.refereeId==='official-double').length,7);
  assert.equal(next.matches.filter(m=>m.scorerId==='official-marque').length,7);
  assert.ok(next.matches.every(m=>m.scorerId!=='official-double'));
});
test('recalcul : scores, anciens matchs et missions actives restent intacts ; désactivation conserve les noms',()=>{
  let s=fixture();s.officials=[staff('old')];s=reassignOfficials(s);s.isTournamentStarted=true;s.currentSession=3;s.matches[0]={...s.matches[0],status:'finished',score1:9,score2:6};const before=structuredClone(s.matches.slice(0,3));
  const next=tournamentReducer(s,{type:'SET_OFFICIAL_ACTIVE',payload:{id:'official-old',active:false}});
  assert.deepEqual(next.matches.slice(0,3),before);assert.ok(next.matches.slice(3).every(m=>m.refereeId==='Staff'));assert.equal(officialName(next,'official-old','Arbitre'),'Test old');assert.equal(missingOfficialLabel('Marqueur'),'Marqueur — staff/volontaire');
});
test('phases finales : oui/non séparés, contraintes de jeu et mises à jour sans toucher aux scores',()=>{
  const s=fixture(10);s.isFinalPhase=true;s.officials=[staff('yes'),{...staff('no'),finalsReferee:false}];s.finalMatches={c:[{id:'f',categoryId:'c',round:'final',matchNumber:1,team1Id:'a',team2Id:'b',sessionNumber:1,court:1,status:'pending',score1:null,score2:null}]};
  const next=reassignOfficials(s);assert.equal(next.finalMatches.c[0].refereeId,'official-yes');assert.equal(next.finalMatches.c[0].score1,null);
  const active={...next.finalMatches.c[0],id:'g',court:2,isReady:true,team1Id:'x',team2Id:'y'};assert.match(finalMatchStartIssue({...next,teams:[],finalMatches:{c:[active]}},next.finalMatches.c[0]),/officiel/);
});
test('feuilles : plusieurs officiels, repos visibles, sélection et pagination sans perte',()=>{
  const s=fixture(60);s.officials=[staff('a'),staff('b'),staff('c')];const next=reassignOfficials(s), paper=createOfficialRouteDocument(next,['official-a','official-b']);
  assert.equal(paper.itemCount,2);assert.ok(paper.pages.length>1);const cards=paper.pages.flatMap(p=>p.cards);assert.equal(cards.filter(c=>c.id==='official-a').flatMap(c=>c.rows).length,60);assert.ok(cards.every(c=>c.height<=177));assert.ok(cards.every(c=>c.id!=='official-c'));assert.ok(cards.some(c=>c.rows.some(r=>r.role==='Repos')));assert.ok(paper.pages.every(p=>p.columns===2));
});
test('en ligne : liste et affectations partent ensemble et survivent à une restauration',()=>{
  const room=RoomEngine.create(fixture()), original=structuredClone(room.record.state);
  const result=room.handle({role:'admin'},'tournament_action',{id:'add',action:{type:'UPSERT_OFFICIAL',payload:staff('new')}});assert.equal(result.reply.status,'received');
  let replica=original;for(const m of result.messages.filter(m=>m.event==='state_patch'))replica=applyStatePatch(replica,m.args[0].patches);assert.deepEqual(replica,room.record.state);
  const restored=new RoomEngine(JSON.parse(JSON.stringify(room.record)));assert.equal(restored.record.state.officials[0].id,'official-new');assert.ok(restored.record.state.matches.some(m=>m.refereeId==='official-new'));
});

test('une personne polyvalente couvre la table pendant les pauses du marqueur, sans trou évitable',()=>{
  const s=fixture();s.categories=[category('c',true,true)];s.officials=[staff('a-double',['Arbitre','Marqueur']),staff('b-marque',['Marqueur']),staff('c-ref')];
  const next=reassignOfficials(s);
  assert.ok(next.matches.every(m=>m.refereeId!=='Staff'&&m.scorerId!=='Staff'));
  assert.ok(next.matches.slice(0,7).some(m=>m.scorerId!=='official-b-marque'));
  for(const p of s.officials)assert.ok(next.matches.filter(m=>m.refereeId===p.id||m.scorerId===p.id).length<=7);
});
