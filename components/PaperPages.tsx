import React from 'react';
import { MatchCard, PaperDocument, PaperPage, RouteCard, routeWidths } from '../utils/paperDocuments';

export function RoutePaperCard({ card }: { card: RouteCard }) {
  const widths = routeWidths(card.referee, card.scorer);
  return <section className="route-paper-card" style={{ minHeight: `${card.height}mm` }}>
    <header><small>{card.category}{card.pool ? ` — ${card.pool}` : ''}</small><h3>{card.teamName}</h3>{card.parts > 1 && <small>Partie {card.part}/{card.parts} — conserver les autres parties</small>}</header>
    <table><colgroup>{widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
      <thead><tr><th>Session</th><th>Match</th><th>Terrain</th>{card.referee && <th>Arbitrage</th>}{card.scorer && <th>Marque</th>}</tr></thead>
      <tbody>{card.rows.map(row => <tr key={row.session} style={{ height: `${row.height}mm` }}><td>{row.session}</td><td>{row.match || '—'}</td><td>{row.court || '—'}</td>{card.referee && <td>{row.referee || '—'}</td>}{card.scorer && <td>{row.scorer || '—'}</td>}</tr>)}</tbody>
    </table>
  </section>;
}
export function MatchPaperCard({ card }: { card: MatchCard }) {
  const scores = (bonus: number) => <div className="paper-score-grid">{Array.from({ length: 21 }, (_, index) => {
    const n = index + 1;
    return <span key={n} className={`paper-score-number ${n <= bonus ? 'paper-score-prechecked' : ''}`} aria-label={n <= bonus ? `Point ${n} déjà coché` : `Point ${n}`}>
      {n}{n <= bonus && <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M8 8 L92 92 M92 8 L8 92" fill="none" stroke="black" strokeWidth="8" /></svg>}
    </span>;
  })}</div>;
  const fouls = <div className="paper-fouls">{Array.from({ length: 13 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>;
  return <section className="match-paper-card">
    <header><strong>{card.category}</strong><strong>Session {card.session ?? '—'} — Terrain {card.court ?? '—'}</strong><small>{card.pool}</small></header>
    <div className="paper-match-teams"><strong>{card.team1}</strong><b>VS</b><strong>{card.team2}</strong></div>
    <div className="paper-starting-points"><span>Départ : <b>{card.bonus1}</b> point{card.bonus1 > 1 ? 's' : ''}{card.bonus1 > 0 ? ' déjà coché' + (card.bonus1 > 1 ? 's' : '') : ' d’avance'}</span><span>Départ : <b>{card.bonus2}</b> point{card.bonus2 > 1 ? 's' : ''}{card.bonus2 > 0 ? ' déjà coché' + (card.bonus2 > 1 ? 's' : '') : ' d’avance'}</span></div>
    <div className="paper-two-teams"><div><small>FAUTES D’ÉQUIPE</small>{fouls}</div><div><small>FAUTES D’ÉQUIPE</small>{fouls}</div></div>
    <div className="paper-mark-label">MARQUE</div>
    <div className="paper-two-teams"><div>{scores(card.bonus1)}</div><div>{scores(card.bonus2)}</div></div>
    <footer>SCORE FINAL : ............... × ...............</footer>
  </section>;
}
function Page({ page, paper, index, total }: { page: PaperPage; paper: PaperDocument; index: number; total: number }) {
  const matchRows = Math.max(2, Math.ceil(page.cards.length / 2));
  return <article className={`paper-page paper-${paper.kind} ${paper.kind === 'matches' && matchRows === 3 ? 'paper-match-compact' : ''}`} aria-label={`Feuille ${index + 1} sur ${total}`}>
    <header className="paper-page-title"><strong>{paper.title}</strong><span>Feuille {index + 1}/{total}</span></header>
    <div className="paper-page-body" style={{ gridTemplateColumns: `repeat(${page.columns}, minmax(0, 1fr))`, ...(paper.kind === 'matches' ? { gridAutoRows: `calc((177mm - ${(matchRows - 1) * 3}mm) / ${matchRows})` } : {}) }}>
      {page.cards.map((card, n) => card.kind === 'route' ? <RoutePaperCard key={`${card.teamId}-${card.part}`} card={card} /> : card.kind === 'match' ? <MatchPaperCard key={card.id} card={card} /> : <table key={n} className="paper-calendar"><thead><tr><th>Session</th><th>Terrain</th><th>Match</th><th>Score</th></tr></thead><tbody>{card.rows.map((row, i) => <tr key={i}><td>{row.session}</td><td>{row.court ?? '—'}</td><td>{row.match}</td><td>{row.score}</td></tr>)}</tbody></table>)}
    </div>
    <footer className="paper-page-footer">Préparé le {new Date(paper.preparedAt).toLocaleString('fr-FR')} · Découper entre les cadres si nécessaire.</footer>
  </article>;
}
export const PaperPages = React.memo(function PaperPages({ paper }: { paper: PaperDocument }) {
  return <>{paper.pages.map((page, index) => <Page key={index} page={page} paper={paper} index={index} total={paper.pages.length} />)}</>;
});
