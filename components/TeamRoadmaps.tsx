import React, { useEffect, useMemo, useState } from 'react';
import { useTournamentFields, useTournamentSelector, useTournamentStateReader } from '../context/TournamentContext';
import { createCalendarDocument, createMatchDocument, createRouteDocument, PaperDocument, roadmapExportRows, samePaperMatches } from '../utils/paperDocuments';
import PaperPreview from './PaperPreview';

function textMeasure() {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return (text: string) => Array.from(text).length * 6;
  context.font = '10px Arial';
  return (text: string) => context.measureText(text).width;
}
const TeamRoadmaps: React.FC = () => {
  const { categories, teams, pools } = useTournamentFields('categories', 'teams', 'pools');
  const matches = useTournamentSelector(state => state.matches, samePaperMatches);
  const readState = useTournamentStateReader();
  const [section, setSection] = useState<'routes' | 'matches'>('routes');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [selections, setSelections] = useState<Record<string, string[] | undefined>>({});
  const [mode, setMode] = useState<'session' | 'terrain'>('session');
  const [session, setSession] = useState(1), [court, setCourt] = useState(1);
  const [perPage, setPerPage] = useState<4 | 6>(6);
  const [paper, setPaper] = useState<PaperDocument | null>(null);
  const [message, setMessage] = useState('');
  const categoryTeams = useMemo(() => teams.filter(team => team.categoryId === categoryId), [teams, categoryId]);
  const ids = selections[categoryId] ?? categoryTeams.map(team => team.id);
  const selectedIds = ids.filter(id => categoryTeams.some(team => team.id === id));
  const category = categories.find(item => item.id === categoryId);
  const sessions = useMemo(() => Array.from(new Set(matches.map(match => match.sessionNumber).filter((n): n is number => !!n))).sort((a, b) => a - b), [matches]);
  const courts = useMemo(() => Array.from(new Set(matches.map(match => match.court).filter((n): n is number => !!n))).sort((a, b) => a - b), [matches]);
  useEffect(() => { if (!categories.some(item => item.id === categoryId)) setCategoryId(categories[0]?.id || ''); }, [categories, categoryId]);
  useEffect(() => { if (!sessions.includes(session)) setSession(sessions[0] || 1); }, [sessions, session]);
  useEffect(() => { if (!courts.includes(court)) setCourt(courts[0] || 1); }, [courts, court]);
  // Les scores seuls ne remplacent pas matches : aucune préparation cachée à chaque résultat.
  useEffect(() => { setPaper(null); setMessage(''); }, [categories, teams, pools, matches, section, categoryId, selections, mode, session, court, perPage]);
  const data = { categories, teams, pools, matches };
  const prepare = (kind: 'routes' | 'matches' | 'calendar' = section) => {
    try {
      const result = kind === 'routes' ? createRouteDocument(data, categoryId, selectedIds, textMeasure()) : kind === 'matches' ? createMatchDocument(data, mode, mode === 'session' ? session : court, perPage, textMeasure()) : createCalendarDocument(readState(), categoryId);
      setPaper(result); setMessage(result.pages.length ? '' : 'Aucune feuille à préparer avec ces choix.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Impossible de préparer les feuilles.'); }
  };
  const exportRows = () => roadmapExportRows(createRouteDocument(data, categoryId, selectedIds, textMeasure()));
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx'), workbook = XLSX.utils.book_new(), rows = exportRows();
      const sheet = XLSX.utils.aoa_to_sheet(rows); sheet['!cols'] = [{ wch: 12 }, { wch: 34 }, { wch: 12 }, { wch: 32 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(workbook, sheet, (category?.name || 'Équipes').replace(/[\\/?*\[\]:]/g, '-').slice(0, 31));
      XLSX.writeFile(workbook, `Feuilles_Route_${(category?.name || 'Équipes').replace(/\s+/g, '_')}.xlsx`);
    } catch { setMessage('L’export Excel n’a pas abouti. Réessayez depuis cette page.'); }
  };
  const copySheets = async () => {
    try { await navigator.clipboard.writeText(exportRows().map(row => row.map(cell => cell.replace(/[\t\n\r]/g, ' ')).join('\t')).join('\n')); setMessage('Copié : vous pouvez coller les feuilles dans Google Sheets.'); }
    catch { setMessage('La copie n’est pas autorisée par ce navigateur. Utilisez l’export Excel.'); }
  };
  const print = async () => { await document.fonts.ready; window.print(); };
  const changeTeam = (id: string, checked: boolean) => setSelections(previous => ({ ...previous, [categoryId]: checked ? [...new Set([...selectedIds, id])] : selectedIds.filter(value => value !== id) }));
  const button = 'px-4 py-2 rounded-lg border font-semibold text-sm disabled:opacity-40';
  return <div className="space-y-5">
    <h1 className="text-3xl font-bold">Feuilles de Route et de Match</h1>
    <div role="tablist" aria-label="Documents à imprimer" className="flex flex-wrap gap-3">
      <button role="tab" aria-selected={section === 'routes'} onClick={() => setSection('routes')} className={`${button} ${section === 'routes' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}>Feuilles de route des équipes</button>
      <button role="tab" aria-selected={section === 'matches'} onClick={() => setSection('matches')} className={`${button} ${section === 'matches' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}>Feuilles de match</button>
    </div>
    {section === 'routes' ? <>
      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-3">
        <h2 className="text-lg font-bold">1. Choisir la catégorie</h2>
        <label className="flex items-center gap-3">Catégorie<select aria-label="Catégorie des feuilles de route" value={categoryId} onChange={event => setCategoryId(event.target.value)} className="border rounded-lg p-2 dark:bg-gray-700">{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <p className="text-sm text-gray-500 dark:text-gray-400">Plusieurs équipes par feuille A4 paysage. {category?.isRefereeMandatory ? 'Colonne Arbitrage incluse. ' : ''}{category?.isScorerMandatory ? 'Colonne Marque incluse.' : ''}{!category?.isRefereeMandatory && !category?.isScorerMandatory ? 'Uniquement les matchs et leurs terrains.' : ''}</p>
      </section>
      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">2. Choisir les équipes à imprimer</h2><span className="text-sm">{selectedIds.length} / {categoryTeams.length} équipes</span></div>
        <div className="flex gap-2"><button onClick={() => setSelections(previous => ({ ...previous, [categoryId]: undefined }))} className={button}>Toutes les équipes</button><button onClick={() => setSelections(previous => ({ ...previous, [categoryId]: [] }))} className={button}>Tout décocher</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{categoryTeams.map(team => <label key={team.id} className="flex items-center gap-2 p-2 border rounded-lg"><input type="checkbox" checked={selectedIds.includes(team.id)} onChange={event => changeTeam(team.id, event.target.checked)} />{team.name}</label>)}</div>
        {!categoryTeams.length && <p>Aucune équipe dans cette catégorie.</p>}
      </section>
      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-3">
        <h2 className="text-lg font-bold">3. Préparer les pages</h2><p className="text-sm text-gray-500 dark:text-gray-400">Les feuilles sont regroupées pour économiser le papier. Les noms complets et les éventuelles missions restent visibles.</p>
        <button disabled={!selectedIds.length || !matches.length} onClick={() => prepare('routes')} className={`${button} bg-blue-600 text-white`}>Préparer l’aperçu des feuilles de route</button>
        <details><summary className="cursor-pointer text-sm font-semibold">Autres exports</summary><div className="flex flex-wrap gap-2 mt-3"><button disabled={!selectedIds.length} onClick={exportExcel} className={button}>Exporter Excel</button><button disabled={!selectedIds.length} onClick={copySheets} className={button}>Copier pour Sheets</button><button disabled={!categoryTeams.length} onClick={() => prepare('calendar')} className={button}>Calendrier de la catégorie</button></div></details>
      </section>
    </> : <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-4">
      <h2 className="text-lg font-bold">Préparer les feuilles de match</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Les matchs de la session ou du terrain choisi, toutes catégories concernées. Les points de départ viennent des joueuses renseignées dans Équipes ; une catégorie mixte ne donne pas automatiquement un bonus à toutes ses équipes.</p>
      <div className="flex flex-wrap items-center gap-3">
        <label>Imprimer <select aria-label="Regrouper les feuilles de match" value={mode} onChange={event => setMode(event.target.value as 'session' | 'terrain')} className="border rounded-lg p-2 dark:bg-gray-700"><option value="session">Par session</option><option value="terrain">Par terrain</option></select></label>
        {mode === 'session' ? <label>Session <select aria-label="Session des feuilles de match" value={session} onChange={event => setSession(Number(event.target.value))} className="border rounded-lg p-2 dark:bg-gray-700">{sessions.map(n => <option key={n} value={n}>Session {n}</option>)}</select></label> : <label>Terrain <select aria-label="Terrain des feuilles de match" value={court} onChange={event => setCourt(Number(event.target.value))} className="border rounded-lg p-2 dark:bg-gray-700">{courts.map(n => <option key={n} value={n}>Terrain {n}</option>)}</select></label>}
        <label>Mise en page <select aria-label="Matchs par feuille" value={perPage} onChange={event => setPerPage(Number(event.target.value) as 4 | 6)} className="border rounded-lg p-2 dark:bg-gray-700"><option value={6}>Jusqu’à 6 matchs par feuille — économique</option><option value={4}>4 matchs par feuille — plus grand</option></select></label>
      </div>
      <p className="text-sm">Les cases déjà cochées portent une croix noire, visible sans impression des fonds colorés.</p>
      <button disabled={!matches.length} onClick={() => prepare('matches')} className={`${button} bg-blue-600 text-white`}>Préparer l’aperçu des feuilles de match</button>
    </section>}
    {message && <p role="status" className="p-3 rounded-lg border bg-white dark:bg-gray-800">{message}</p>}
    {paper && paper.pages.length > 0 && <section className="space-y-3" aria-label="Aperçu avant impression">
      <div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-xl font-bold">{paper.title}</h2><p>{paper.itemCount} {paper.kind === 'routes' ? 'équipe(s)' : 'match(s)'} · <strong>{paper.pages.length} feuille{paper.pages.length > 1 ? 's' : ''} A4 paysage</strong></p></div><button onClick={print} className={`${button} bg-green-600 text-white`}>Imprimer {paper.pages.length} feuille{paper.pages.length > 1 ? 's' : ''}</button></div>
      <PaperPreview paper={paper} />
    </section>}
  </div>;
};
export default TeamRoadmaps;
