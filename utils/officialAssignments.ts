import { Category, FinalMatch, Match, Official, Player, Team, TournamentState } from '../types';

export type OfficialRole = 'Arbitre' | 'Marqueur';
export const missingOfficialLabel = (role: OfficialRole) => `${role} — staff/volontaire`;
const playerNameCache = new WeakMap<Team[], Map<string,string>>();
export function officialName(state: Pick<TournamentState, 'teams' | 'officials'>, id: string | null | undefined, role: OfficialRole): string {
  if (!id) return '—';
  if (id === 'Staff') return missingOfficialLabel(role);
  const external = state.officials?.find(o => o.id === id);
  if (external) return `${external.firstName} ${external.lastName}`.trim();
  let names=playerNameCache.get(state.teams);
  if (!names) { names=new Map(state.teams.flatMap(t=>t.players.map(p=>[p.id,`${p.firstName} ${p.lastName}`.trim()] as const))); playerNameCache.set(state.teams,names); }
  return names.get(id) || missingOfficialLabel(role);
}
type Person = { id: string; team?: Team; person: Official | Player; external: boolean; quota: number; used: number };
type Slot = { match: Match | FinalMatch; category?: Category; final: boolean; order: number; playing: Set<string>; frozen: boolean };

// Only official assignments change here. Courts, sessions, scores and standings stay intact.
export function reassignOfficials(state: TournamentState): TournamentState {
  const poolCount = Math.max(0, ...state.matches.map(m => m.sessionNumber || 0));
  const finals = Object.values(state.finalMatches).flat();
  const teamMap = new Map(state.teams.map(t => [t.id, t]));
  const finalMap = new Map(finals.map(m => [m.id, m]));
  const possibleTeams = (m: FinalMatch, seen = new Set<string>()): string[] => {
    if (seen.has(m.id)) return []; seen.add(m.id);
    return ([1,2] as const).flatMap(side => {
      const known = side===1?m.team1Id:m.team2Id;
      if (known) return [known];
      const sourceId=side===1?m.sourceMatch1:m.sourceMatch2;
      const source=sourceId&&finalMap.get(sourceId);
      return source?possibleTeams(source,seen):[];
    });
  };
  const slots: Slot[] = [
    ...state.matches.filter(m => m.sessionNumber).map(match => ({ match, category: state.categories.find(c => c.id === teamMap.get(match.team1Id)?.categoryId), final: false, order: match.sessionNumber!, playing: new Set([match.team1Id, match.team2Id]), frozen: match.status === 'finished' || state.isTournamentStarted && (state.isFinalPhase || match.sessionNumber! <= state.currentSession) })),
    ...finals.filter(m => m.sessionNumber).map(match => ({ match, category: state.categories.find(c => c.id === match.categoryId), final: true, order: poolCount + match.sessionNumber!, playing: new Set(match.team1Id && match.team2Id ? [match.team1Id, match.team2Id] : possibleTeams(match)), frozen: match.status === 'finished' || !!match.isReady })),
  ].sort((a,b) => a.order - b.order || (a.match.court || 0) - (b.match.court || 0) || a.match.id.localeCompare(b.match.id));
  const sessions = [...new Set(slots.map(s => s.order))];
  if (!sessions.length) return state;
  const playingSessions = new Map<string,Set<number>>();
  for (const s of slots) for (const id of s.playing) { if (!playingSessions.has(id)) playingSessions.set(id,new Set()); playingSessions.get(id)!.add(s.order); }
  const people: Person[] = [
    ...state.teams.flatMap(team => team.players.map(person => ({ id: person.id, person, team, external: false, quota: Math.floor((sessions.length - (playingSessions.get(team.id)?.size || 0)) * .3), used: 0 }))),
    ...(state.officials || []).filter(person => person.active).map(person => ({ id: person.id, person, external: true, quota: Math.round(sessions.length * .7), used: 0 })),
  ];
  const personMap = new Map(people.map(p => [p.id,p]));
  const busy = new Map<number,Set<string>>(sessions.map(order => [order, new Set<string>()]));
  const worked = new Map<number, Map<string, number | null | undefined>>();
  for (const s of slots) for (const id of s.playing) for (const p of teamMap.get(id)?.players || []) busy.get(s.order)!.add(p.id);
  const reserve = (s: Slot, id: string | null | undefined) => {
    if (!id || id === 'Staff') return;
    busy.get(s.order)!.add(id);
    const p = personMap.get(id); if (p) p.used++;
    if (!worked.has(s.order)) worked.set(s.order, new Map());
    worked.get(s.order)!.set(id, s.match.court);
  };
  for (const s of slots.filter(s => s.frozen)) { reserve(s, s.match.refereeId); reserve(s, s.match.scorerId); }
  const changes = new Map<string, Match | FinalMatch>();
  const allowed = (p: Person, s: Slot, role: OfficialRole) => {
    if (!p.person.roles.includes(role) || p.used >= p.quota || busy.get(s.order)!.has(p.id)) return false;
    if (s.final && !(role === 'Arbitre' ? p.person.finalsReferee : p.person.finalsScorer)) return false;
    const previousCourt = worked.get(s.order-1)?.get(p.id);
    if (p.external && previousCourt !== undefined && previousCourt !== s.match.court) return false;
    if (!p.external) {
      if (busy.get(s.order-1)?.has(p.id) || busy.get(s.order+1)?.has(p.id)) return false;
      const ownPool = p.team?.poolId || (state.pools || []).find(pool => pool.teams.includes(p.team!.id))?.id || state.matches.find(m => m.team1Id === p.team?.id || m.team2Id === p.team?.id)?.poolId;
      if (role === 'Arbitre' && !s.final && ownPool === (s.match as Match).poolId) return false;
    }
    return true;
  };
  for (const order of sessions) {
    const here = slots.filter(s => s.order === order && !s.frozen);
    // Every court receives its referee before any dual-role person is used at the table.
    for (const role of ['Arbitre','Marqueur'] as const) for (const s of here) {
      const field = role === 'Arbitre' ? 'refereeId' : 'scorerId';
      const mandatory = role === 'Arbitre' ? s.category?.isRefereeMandatory : s.category?.isScorerMandatory;
      const candidates = mandatory && s.match.court ? people.filter(p => allowed(p,s,role)) : [];
      candidates.sort((a,b) => {
        // Prefer scorer-only volunteers for the table, preserving scarce referees.
        const scarce = (p: Person) => role === 'Marqueur' && p.person.roles.includes('Arbitre') ? 1 : 0;
        const continuity = (p: Person) => p.external && worked.get(order-1)?.get(p.id) === s.match.court ? -1 : 0;
        return scarce(a)-scarce(b) || a.used/Math.max(1,a.quota)-b.used/Math.max(1,b.quota) || continuity(a)-continuity(b) || a.id.localeCompare(b.id);
      });
      const chosen = candidates[0];
      const id = mandatory ? chosen?.id || 'Staff' : null;
      const base = changes.get(s.match.id) || s.match;
      if (base[field] !== id) changes.set(s.match.id, { ...base, [field]: id });
      if (chosen) reserve(s,chosen.id);
    }
  }
  if (!changes.size) return state;
  const matches = state.matches.some(m => changes.has(m.id)) ? state.matches.map(m => (changes.get(m.id) || m) as Match) : state.matches;
  let finalMatches = state.finalMatches;
  for (const [categoryId, list] of Object.entries(state.finalMatches)) if (list.some(m => changes.has(m.id))) {
    if (finalMatches === state.finalMatches) finalMatches = { ...finalMatches };
    finalMatches[categoryId] = list.map(m => (changes.get(m.id) || m) as FinalMatch);
  }
  return { ...state, matches, finalMatches };
}

export function assignPoolOfficials(matches: Match[], teams: Team[], categories: Category[]): Match[] {
  return reassignOfficials({ matches, teams, categories, finalMatches: {}, currentSession: 1, isTournamentStarted: false } as TournamentState).matches;
}
