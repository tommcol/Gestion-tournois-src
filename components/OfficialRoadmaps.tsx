import React, { useState } from 'react';
import { useTournamentFields } from '../context/TournamentContext';
import { createOfficialRouteDocument } from '../utils/officialRoadmaps';
import { PaperDocument } from '../utils/paperDocuments';
import PaperPreview from './PaperPreview';

export default function OfficialRoadmaps() {
  const state=useTournamentFields('officials','teams','matches','finalMatches','isFinalPhase');
  const [selected,setSelected]=useState<string[]|null>(null),[finals,setFinals]=useState(state.isFinalPhase),[paper,setPaper]=useState<PaperDocument|null>(null),[error,setError]=useState('');
  const people=state.officials||[], ids=selected??people.filter(p=>p.active).map(p=>p.id);
  const prepare=()=>{try{const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(context)context.font='10px Arial';const result=createOfficialRouteDocument(state,ids,finals,context?text=>context.measureText(text).width:undefined);setPaper(result);setError(result.pages.length?'':'Aucun planning à imprimer. Générez le calendrier ou lancez les phases finales.');}catch(e){setError((e as Error).message);}};
  return <section className="bg-white dark:bg-gray-800 border rounded-xl p-4 space-y-4">
    <h2 className="text-xl font-bold">Feuilles de route des officiels non joueurs</h2>
    <p>Choisissez les personnes à imprimer. Plusieurs personnes sont regroupées sur chaque feuille ; les pauses portent la mention « Repos ».</p>
    <label>Planning <select aria-label="Planning à imprimer pour les officiels" value={finals?'finals':'pools'} className="border rounded p-2 bg-transparent" onChange={e=>{setFinals(e.target.value==='finals');setPaper(null);}}><option value="pools">Poules</option><option value="finals">Phases finales</option></select></label>
    <div className="flex gap-3"><button className="underline" onClick={()=>{setSelected(null);setPaper(null);}}>Tous les actifs</button><button className="underline" onClick={()=>{setSelected([]);setPaper(null);}}>Tout décocher</button></div>
    <div className="flex flex-wrap gap-3">{people.map(p=><label key={p.id} className="border rounded p-2"><input type="checkbox" checked={ids.includes(p.id)} onChange={e=>{setSelected(e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id));setPaper(null);}}/> {p.firstName} {p.lastName}{!p.active&&' — Inactif'}</label>)}</div>
    {!people.length&&<p>Ajoutez les personnes dans « Arbitre / Marqueur ».</p>}
    <button disabled={!ids.length} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-40" onClick={prepare}>Préparer l’aperçu des officiels</button>
    {error&&<p role="status">{error}</p>}
    {paper&&paper.pages.length>0&&<><p>{paper.itemCount} officiel(s) — <strong>{paper.pages.length} feuille(s) A4 paysage</strong></p><button className="bg-green-700 text-white px-4 py-2 rounded" onClick={async()=>{await document.fonts.ready;window.print();}}>Imprimer les feuilles de route des officiels</button><PaperPreview paper={paper}/></>}
  </section>;
}
