import { Category, Match, Pool, Team, TournamentState } from '../types';
import { getStartingBonus } from './startingBonus';

export const PAPER = { width: 297, height: 210, margin: 8, bodyHeight: 177, bodyWidth: 281, gap: 3 };
export interface RouteRow { session: number; match: string; court: string; referee: string; scorer: string; height: number }
export interface RouteCard {
  kind: 'route'; teamId: string; teamName: string; category: string; pool: string;
  referee: boolean; scorer: boolean; rows: RouteRow[]; part: number; parts: number; height: number;
}
export interface MatchCard {
  kind: 'match'; id: string; category: string; pool: string; session?: number; court: number | null;
  team1: string; team2: string; bonus1: number; bonus2: number;
}
export interface CalendarCard { kind: 'calendar'; rows: { session?: number; court: number | null; match: string; score: string }[] }
export interface PaperPage { cards: (RouteCard | MatchCard | CalendarCard)[]; columns: number }
export interface PaperDocument { title: string; pages: PaperPage[]; preparedAt: number; kind: 'routes' | 'matches' | 'calendar'; itemCount: number }
export type PaperData = Pick<TournamentState, 'categories' | 'teams' | 'pools' | 'matches'>;
export type MeasureText = (text: string) => number;
const defaultMeasure: MeasureText = text => Array.from(text).length * 6;
const poolLabel = (teamOrMatch: { poolId?: string }, pools: Pool[], category: Category) => {
  const list = pools.filter(pool => pool.id.startsWith(category.id));
  const index = list.findIndex(pool => pool.id === teamOrMatch.poolId);
  return index < 0 ? '' : category.tournamentType === 'swiss' ? 'Classement général' : `Poule ${String.fromCharCode(65 + index)}`;
};
// Le document ne dépend pas des scores reçus : seules les données imprimées du planning comptent.
export function samePaperMatches(before: Match[], after: Match[]) {
  const fields: (keyof Match)[] = ['id', 'poolId', 'round', 'team1Id', 'team2Id', 'sessionNumber', 'court', 'refereeId', 'scorerId'];
  return before === after || (before.length === after.length && before.every((match, index) => fields.every(key => match[key] === after[index][key])));
}
export function wrappedLines(text: string, width: number, measure: MeasureText = defaultMeasure): number {
  return text.split('\n').reduce((total, paragraph) => {
    let lines = 1, current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = current ? `${current} ${word}` : word;
      if (measure(next) <= width) { current = next; continue; }
      if (current) { lines++; current = ''; }
      for (const character of Array.from(word)) {
        if (current && measure(current + character) > width) { lines++; current = ''; }
        current += character;
      }
    }
    return total + lines;
  }, 0);
}
export function routeWidths(referee: boolean, scorer: boolean) {
  const roles = Number(referee) + Number(scorer);
  return roles === 2 ? [10, 34, 12, 22, 22] : roles === 1 ? [12, 42, 14, 32] : [16, 64, 20];
}
export function routeColumns(referee: boolean, scorer: boolean) { return referee && scorer ? 4 : referee || scorer ? 5 : 6; }

export function createRouteDocument(data: PaperData, categoryId: string, selectedIds: string[], measure: MeasureText = defaultMeasure): PaperDocument {
  const category = data.categories.find(c => c.id === categoryId);
  if (!category) return { title: 'Feuilles de route', pages: [], preparedAt: Date.now(), kind: 'routes', itemCount: 0 };
  const selected = new Set(selectedIds), teams = data.teams.filter(team => team.categoryId === categoryId && selected.has(team.id));
  const referee = !!category.isRefereeMandatory, scorer = !!category.isScorerMandatory;
  const columns = routeColumns(referee, scorer), cardWidth = (PAPER.bodyWidth - (columns - 1) * PAPER.gap) / columns;
  const widths = routeWidths(referee, scorer);
  const teamMap = new Map(data.teams.map(team => [team.id, team]));
  const sessions = new Map<number, Match[]>();
  const playerNames = new Map<string, string>();
  for (const team of data.teams) for (const player of team.players || []) playerNames.set(player.id, `${player.firstName} ${player.lastName}`.trim());
  for (const match of data.matches) {
    if (!match.sessionNumber) continue;
    const list = sessions.get(match.sessionNumber) || []; list.push(match); sessions.set(match.sessionNumber, list);
  }
  const categoryTeams = data.teams.filter(team => team.categoryId === categoryId);
  const categoryTeamIds = new Set(categoryTeams.map(team => team.id));
  const categoryPlayerIds = new Set(categoryTeams.flatMap(team => (team.players || []).map(player => player.id)));
  const relevantSessions = data.matches.filter(match => categoryTeamIds.has(match.team1Id) || categoryTeamIds.has(match.team2Id) || (referee && !!match.refereeId && categoryPlayerIds.has(match.refereeId)) || (scorer && !!match.scorerId && categoryPlayerIds.has(match.scorerId))).map(match => match.sessionNumber).filter((n): n is number => !!n);
  if (!relevantSessions.length) return { title: `Feuilles de route — ${category.name}`, pages: [], preparedAt: Date.now(), kind: 'routes', itemCount: teams.length };
  const firstSession = Math.min(...relevantSessions);
  const maxSession = Math.max(0, ...relevantSessions);
  const cards: RouteCard[] = [];
  for (const team of teams) {
    const players = new Set((team.players || []).map(player => player.id));
    const rows: RouteRow[] = [];
    for (let session = firstSession; session <= maxSession; session++) {
      const matches = sessions.get(session) || [];
      const games = matches.filter(match => match.team1Id === team.id || match.team2Id === team.id);
      const duties = (field: 'refereeId' | 'scorerId') => matches.filter(match => match[field] && players.has(match[field]!)).map(match => `${playerNames.get(match[field]!) || 'Nom à préciser'}\nTerrain ${match.court ?? 'à préciser'}`).join('\n');
      const row = { session, match: games.map(match => `Contre ${teamMap.get(match.team1Id === team.id ? match.team2Id : match.team1Id)?.name || 'Équipe à préciser'}`).join('\n'), court: games.map(match => String(match.court ?? '—')).join('\n'), referee: duties('refereeId'), scorer: duties('scorerId'), height: 0 };
      const texts = [String(session), row.match || '—', row.court || '—', ...(referee ? [row.referee || '—'] : []), ...(scorer ? [row.scorer || '—'] : [])];
      row.height = Math.max(6, ...texts.map((text, index) => wrappedLines(text, Math.max(12, (cardWidth * widths[index] / 100 - 3) * 96 / 25.4), measure) * 3.3 + 2.4));
      rows.push(row);
    }
    const metadata = `${category.name} — ${poolLabel({ poolId: team.poolId || data.pools.find(p => p.teams.includes(team.id))?.id }, data.pools, category)}`;
    const titleHeight = wrappedLines(team.name, (cardWidth - 5) * 96 / 25.4, text => measure(text) * 1.35) * 4 + wrappedLines(metadata, (cardWidth - 5) * 96 / 25.4, text => measure(text) * .8) * 3 + 8;
    const overhead = titleHeight + 12;
    let partRows: RouteRow[] = [], height = overhead;
    const parts: RouteCard[] = [];
    for (const row of rows) {
      if (overhead + row.height > PAPER.bodyHeight) throw new Error(`Une mission de ${team.name} est trop longue pour une feuille. Vérifiez les affectations de cette session.`);
      if (partRows.length && height + row.height > PAPER.bodyHeight - 2) {
        parts.push({ kind: 'route', teamId: team.id, teamName: team.name, category: category.name, pool: poolLabel({ poolId: team.poolId || data.pools.find(p => p.teams.includes(team.id))?.id }, data.pools, category), referee, scorer, rows: partRows, part: parts.length + 1, parts: 0, height });
        partRows = []; height = overhead;
      }
      partRows.push(row); height += row.height;
    }
    if (partRows.length || !rows.length) parts.push({ kind: 'route', teamId: team.id, teamName: team.name, category: category.name, pool: poolLabel({ poolId: team.poolId || data.pools.find(p => p.teams.includes(team.id))?.id }, data.pools, category), referee, scorer, rows: partRows, part: parts.length + 1, parts: 0, height });
    parts.forEach(card => { card.parts = parts.length; cards.push(card); });
  }
  cards.sort((a, b) => a.part - b.part || teams.findIndex(team => team.id === a.teamId) - teams.findIndex(team => team.id === b.teamId));
  const pages: PaperPage[] = []; let current: RouteCard[] = [], usedHeight = 0;
  for (let i = 0; i < cards.length; i += columns) {
    const row = cards.slice(i, i + columns), rowHeight = Math.max(...row.map(card => card.height));
    if (current.length && usedHeight + PAPER.gap + rowHeight > PAPER.bodyHeight) { pages.push({ cards: current, columns }); current = []; usedHeight = 0; }
    if (current.length) usedHeight += PAPER.gap;
    current.push(...row); usedHeight += rowHeight;
  }
  if (current.length) pages.push({ cards: current, columns });
  return { title: `Feuilles de route — ${category.name}`, pages, preparedAt: Date.now(), kind: 'routes', itemCount: teams.length };
}

export function createMatchDocument(data: PaperData, mode: 'session' | 'terrain', selected: number, perPage: 4 | 6, measure: MeasureText = defaultMeasure): PaperDocument {
  const teams = new Map(data.teams.map(team => [team.id, team]));
  const matches = data.matches.filter(match => mode === 'session' ? match.sessionNumber === selected : match.court === selected).sort((a, b) => mode === 'session' ? (a.court ?? 0) - (b.court ?? 0) : (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0));
  const cards: MatchCard[] = matches.map(match => {
    const team1 = teams.get(match.team1Id), team2 = teams.get(match.team2Id);
    const category = data.categories.find(c => c.id === team1?.categoryId) || data.categories.find(c => match.poolId.startsWith(c.id));
    return { kind: 'match', id: match.id, category: category?.name || 'Catégorie à préciser', pool: category ? poolLabel(match, data.pools, category) : '', session: match.sessionNumber, court: match.court, team1: team1?.name || 'Équipe à préciser', team2: team2?.name || 'Équipe à préciser', bonus1: getStartingBonus(team1), bonus2: getStartingBonus(team2) };
  });
  const pages: PaperPage[] = [];
  const capacity = Math.min(4, perPage);
  for (let i = 0; i < cards.length; i += capacity) pages.push({ cards: cards.slice(i, i + capacity), columns: 2 });
  return { title: `Feuilles de match — ${mode === 'session' ? 'Session' : 'Terrain'} ${selected}`, pages, preparedAt: Date.now(), kind: 'matches', itemCount: cards.length };
}
export function createCalendarDocument(data: PaperData, categoryId: string): PaperDocument {
  const category = data.categories.find(c => c.id === categoryId), teams = new Map(data.teams.map(team => [team.id, team]));
  const matches = data.matches.filter(match => match.sessionNumber && teams.get(match.team1Id)?.categoryId === categoryId).sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0) || (a.court ?? 0) - (b.court ?? 0));
  const pages: PaperPage[] = [];
  for (let i = 0; i < matches.length; i += 20) pages.push({ columns: 1, cards: [{ kind: 'calendar', rows: matches.slice(i, i + 20).map(match => ({ session: match.sessionNumber, court: match.court, match: `${teams.get(match.team1Id)?.name || '?'} contre ${teams.get(match.team2Id)?.name || '?'}`, score: match.score1 === null ? '' : `${match.score1} – ${match.score2}` })) }] });
  return { title: `Calendrier — ${category?.name || ''}`, pages, preparedAt: Date.now(), kind: 'calendar', itemCount: matches.length };
}
export function roadmapExportRows(document: PaperDocument) {
  const rows: string[][] = [];
  for (const page of document.pages) for (const card of page.cards) {
    if (card.kind !== 'route') continue;
    rows.push([`${card.teamName} — ${card.category} — ${card.pool}${card.parts > 1 ? ` — Partie ${card.part}/${card.parts}` : ''}`]);
    rows.push(['Session', 'Match', 'Terrain', ...(card.referee ? ['Arbitrage'] : []), ...(card.scorer ? ['Marque'] : [])]);
    for (const row of card.rows) rows.push([String(row.session), row.match, row.court, ...(card.referee ? [row.referee.replace(/\n/g, ' · ')] : []), ...(card.scorer ? [row.scorer.replace(/\n/g, ' · ')] : [])]);
    rows.push([]);
  }
  return rows;
}
