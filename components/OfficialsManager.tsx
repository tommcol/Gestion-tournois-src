import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Official } from '../types';
import { generateId } from '../utils/id';
import { officialName } from '../utils/officialAssignments';
import { createOfficialRouteDocument } from '../utils/officialRoadmaps';
import { PaperDocument } from '../utils/paperDocuments';
import PaperPreview from './PaperPreview';

export default function OfficialsManager() {
  const { state, dispatch } = useTournament();
  const [editing,setEditing]=useState<Official|null>(null), [finals,setFinals]=useState(state.isFinalPhase);
  const [selected,setSelected]=useState<string[]|null>(null), [paper,setPaper]=useState<PaperDocument|null>(null), [error,setError]=useState('');
  const people=state.officials||[], selectedIds=selected??people.filter(p=>p.active).map(p=>p.id);
  const matches=finals?Object.values(state.finalMatches).flat():state.matches;
  const sessions=[...new Set(matches.map(m=>m.sessionNumber).filter((n):n is number=>!!n))].sort((a,b)=>a-b);
  const teamName=(id:string|null)=>state.teams.find(t=>t.id===id)?.name||'À déterminer';
  const prepare=()=>{try{setPaper(createOfficialRouteDocument(state,selectedIds,finals));setError('');}catch(e){setError((e as Error).message);}};
  return <div className="space-y-6">
    <h2 className="text-2xl font-bold">Gestion des Officiels</h2>
    <section className="bg-white dark:bg-gray-800 border rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between"><h3 className="text-lg font-bold">Staff et volontaires — personnes qui ne jouent pas</h3><button className="bg-blue-600 text-white rounded-lg px-4 py-2" onClick={()=>setEditing({id:'official-'+generateId(),firstName:'',lastName:'',roles:['Arbitre'],active:true,finalsReferee:false,finalsScorer:false})}>Ajouter un officiel</button></div>
      <p className="text-sm text-gray-500">Objectif : environ 70 % des sessions, avec des pauses réparties. Les joueurs gardent leur limite de 30 % des sessions sans match. Les missions non commencées sont réparties à l’enregistrement.</p>
      {editing&&<form className="border rounded-lg p-4 space-y-3" onSubmit={e=>{e.preventDefault();if(!editing.firstName.trim()||!editing.lastName.trim()){setError('Renseignez le prénom et le nom.');return;}if(!editing.roles.length){setError('Choisissez arbitre, marqueur ou les deux.');return;}dispatch({type:'UPSERT_OFFICIAL',payload:editing});setEditing(null);setError('');}}>
        <div className="flex gap-3 flex-wrap"><label>Prénom<input required maxLength={80} className="block border rounded p-2 bg-transparent" value={editing.firstName} onChange={e=>setEditing({...editing,firstName:e.target.value})}/></label><label>Nom<input required maxLength={80} className="block border rounded p-2 bg-transparent" value={editing.lastName} onChange={e=>setEditing({...editing,lastName:e.target.value})}/></label></div>
        <fieldset className="flex flex-wrap gap-4"><legend className="font-semibold">Rôles</legend>{(['Arbitre','Marqueur'] as const).map(role=><label key={role}><input type="checkbox" checked={editing.roles.includes(role)} onChange={e=>setEditing({...editing,roles:e.target.checked?[...editing.roles,role]:editing.roles.filter(r=>r!==role),...(!e.target.checked?(role==='Arbitre'?{finalsReferee:false}:{finalsScorer:false}):{})})}/> {role}</label>)}</fieldset>
        <fieldset className="flex flex-wrap gap-4"><legend className="font-semibold">Disponible pour les phases finales</legend><label><input type="checkbox" disabled={!editing.roles.includes('Arbitre')} checked={editing.finalsReferee} onChange={e=>setEditing({...editing,finalsReferee:e.target.checked})}/> Arbitrage en phases finales</label><label><input type="checkbox" disabled={!editing.roles.includes('Marqueur')} checked={editing.finalsScorer} onChange={e=>setEditing({...editing,finalsScorer:e.target.checked})}/> Marque en phases finales</label></fieldset>
        <div className="flex gap-3"><button className="bg-blue-600 text-white px-4 py-2 rounded">Enregistrer l’officiel</button><button type="button" className="border px-4 py-2 rounded" onClick={()=>setEditing(null)}>Annuler</button></div>
      </form>}
      {error&&<p role="alert" className="text-red-600">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th>À imprimer</th><th>Nom</th><th>Rôles</th><th>Phases finales</th><th>Missions affichées</th><th>Actions</th></tr></thead><tbody>{people.map(p=><tr key={p.id} className={`border-b ${p.active?'':'opacity-60'}`}><td><input type="checkbox" aria-label={`Imprimer ${p.firstName} ${p.lastName}`} checked={selectedIds.includes(p.id)} onChange={e=>setSelected(e.target.checked?[...selectedIds,p.id]:selectedIds.filter(id=>id!==p.id))}/></td><td className="py-3 font-bold">{p.firstName} {p.lastName}{!p.active&&' — Inactif'}</td><td>{p.roles.join(' / ')}</td><td>{[p.finalsReferee?'Arbitrage':'',p.finalsScorer?'Marque':''].filter(Boolean).join(' / ')||'Non'}</td><td>{matches.filter(m=>m.refereeId===p.id||m.scorerId===p.id).length}</td><td><button className="text-blue-600 mr-3" onClick={()=>setEditing({...p})}>Modifier</button><button className="underline" onClick={()=>dispatch({type:'SET_OFFICIAL_ACTIVE',payload:{id:p.id,active:!p.active}})}>{p.active?'Désactiver':'Réactiver'}</button></td></tr>)}</tbody></table></div>
      {!people.length&&<p>Aucun officiel non joueur inscrit.</p>}
    </section>
    <section className="bg-white dark:bg-gray-800 border rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3"><label>Planning <select aria-label="Planning des officiels" className="border rounded p-2 bg-transparent" value={finals?'finals':'pools'} onChange={e=>{setFinals(e.target.value==='finals');setPaper(null);}}><option value="pools">Poules</option><option value="finals">Phases finales</option></select></label><button className="border rounded px-3 py-2" onClick={()=>dispatch({type:'REASSIGN_OFFICIALS'})}>Répartir les missions à venir</button></div>
      <div className="flex flex-wrap gap-3"><button className="underline" onClick={()=>setSelected(null)}>Sélectionner tous les actifs</button><button className="underline" onClick={()=>setSelected([])}>Tout décocher</button><button disabled={!selectedIds.length||!sessions.length} className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-40" onClick={prepare}>Aperçu des feuilles de route des officiels</button></div>
      {paper&&<><p>{paper.itemCount} officiel(s) — {paper.pages.length} feuille(s), plusieurs personnes par feuille lorsque cela tient.</p><div className="flex gap-3"><button disabled={!paper.pages.length} className="bg-green-700 text-white rounded px-4 py-2 disabled:opacity-40" onClick={()=>window.print()}>Imprimer les feuilles des officiels</button><button className="underline" onClick={()=>setPaper(null)}>Fermer l’aperçu</button></div><PaperPreview paper={paper}/></>}
    </section>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">{sessions.map(session=><section key={session} className="bg-white dark:bg-gray-800 border rounded-xl overflow-hidden"><h3 className="bg-slate-800 text-white font-bold p-3">{finals?'Phases finales — ':''}Session {session}</h3><div className="p-3 space-y-3">{matches.filter(m=>m.sessionNumber===session).map(m=><div key={m.id} className="border-b pb-3"><p className="font-bold">Terrain {m.court??'à préciser'} — {teamName(m.team1Id)} / {teamName(m.team2Id)}</p><p>Arbitrage : {officialName(state,m.refereeId,'Arbitre')}</p><p>Marque : {officialName(state,m.scorerId,'Marqueur')}</p></div>)}<p className="text-sm text-gray-500">Repos : {people.filter(p=>p.active&&!matches.some(m=>m.sessionNumber===session&&(m.refereeId===p.id||m.scorerId===p.id))).map(p=>`${p.firstName} ${p.lastName}`).join(', ')||'—'}</p></div></section>)}</div>
    {!sessions.length&&<p>Générez le calendrier{finals?' et lancez les phases finales':''} pour afficher les missions.</p>}
  </div>;
}
