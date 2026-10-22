import React from 'react';
import { useTournament } from '../context/TournamentContext';

export default function OrganizerNotifications() {
  const { state, socket } = useTournament();
  const overtime = Object.values(state.finalMatches).flat().filter(m => m.isOvertime && m.status !== 'finished');
  const conflicts = state.courtConflicts || [];
  if (!overtime.length && !conflicts.length) return null;
  return <aside className="p-3 bg-amber-100 text-amber-950 max-h-52 overflow-y-auto shrink-0" aria-live="polite">
    {overtime.map(m => <p key={m.id} className="font-bold">⏱ Prolongation — {state.categories.find(c => c.id === m.categoryId)?.name}, terrain {m.court} : {state.teams.find(t => t.id === m.team1Id)?.name} / {state.teams.find(t => t.id === m.team2Id)?.name}</p>)}
    {conflicts.map(c => {
      const match = c.submission.categoryId ? state.finalMatches[c.submission.categoryId]?.find(m => m.id === c.submission.matchId) : state.matches.find(m => m.id === c.submission.matchId);
      return <div key={c.id} className="border border-amber-400 rounded-lg p-3 my-2"><p className="font-bold">Deux scores différents — terrain {c.submission.court} : {c.submission.team1Name} / {c.submission.team2Name}</p><p>PC : {match?.score1 ?? c.score1} – {match?.score2 ?? c.score2}. Tablette : {c.submission.score1} – {c.submission.score2}.</p><div className="flex gap-3 mt-2">{[false, true].map(useTablet => <button key={String(useTablet)} className="bg-white border rounded px-3 py-2 font-bold" onClick={() => { if (window.confirm(useTablet ? 'Remplacer le score du PC par celui de la tablette ?' : 'Confirmer le score actuellement enregistré sur le PC ?')) socket?.emit('court_resolve', { id: c.id, useTablet }); }}>{useTablet ? 'Garder le score tablette' : 'Garder le score PC'}</button>)}</div></div>;
    })}
  </aside>;
}
