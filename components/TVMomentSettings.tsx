import React, { useState } from 'react';
import { useTournament, useOfficialClock } from '../context/TournamentContext';
import { TVMoment, TVMomentConfig } from '../types';
import { tvMoment, tvSettings } from '../utils/tournamentFlow';

const labels: Record<TVMoment, string> = { welcome: 'Accueil des joueurs', beforeFirst: 'Avant le premier match', playing: 'Matchs en cours', break: 'Entre deux sessions', lastSession: 'Dernière session', poolsOver: 'Fin des poules', finals: 'Phases finales' };
const fields: [keyof TVMomentConfig, string][] = [['showNextMatches', 'Matchs'], ['showResults', 'Résultats'], ['showStandings', 'Classements'], ['showSponsors', 'Sponsors dans le défilement'], ['showStartSponsor', 'Sponsor au lancement du chrono'], ['showChronoOnTv', 'Chronomètre'], ['showLiveScores', 'Scores des tablettes en direct']];
export default function TVMomentSettings({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useTournament();
  const clock = useOfficialClock();
  const [open, setOpen] = useState(!compact);
  const [selected, setSelected] = useState<TVMoment | null>(null);
  const current = tvMoment(state, clock);
  const moment = selected || current;
  const config = tvSettings(state, moment);
  return <section className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 my-3">
    <button type="button" className="font-bold" onClick={() => setOpen(!open)} aria-expanded={open}>📺 Réglages TV {open ? '▾' : '▸'}</button>
    {open && <div className="space-y-3 mt-3">
      <p className="text-sm">En ce moment : {labels[current]}. Les choix sont enregistrés immédiatement.</p>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={state.tvConfig.showSponsors} onChange={e => dispatch({ type: 'UPDATE_CONFIG', payload: { tvConfig: { showSponsors: e.target.checked } } })} />Autoriser les sponsors (tous les moments)</label>
      <select aria-label="Moment du tournoi" value={selected || ''} onChange={e => setSelected((e.target.value || null) as TVMoment | null)} className="p-2 rounded border dark:bg-gray-700">
        <option value="">Moment actuel (automatique)</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <div className="flex flex-wrap gap-4">{fields.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config[key]} onChange={e => dispatch({ type: 'UPDATE_CONFIG', payload: { tvMoments: { ...state.tvMoments, [moment]: { ...config, [key]: e.target.checked } } } })} />{label}</label>)}</div>
      <button type="button" className="text-sm underline" onClick={() => { const updated = { ...state.tvMoments }; delete updated[moment]; dispatch({ type: 'UPDATE_CONFIG', payload: { tvMoments: updated } }); }}>Rétablir les choix automatiques pour ce moment</button>
    </div>}
  </section>;
}
