import { validScore } from './tournamentFlow';
export interface LiveScore {
  court: number; matchId?: string; categoryId?: string;
  team1Name: string; team2Name: string; score1: number; score2: number;
}
// Un message live ne contient ni résultat validé, ni classement, ni état du tournoi.
export function readLiveScore(data: any): LiveScore | null {
  if (!Number.isInteger(data?.court) || data.court < 1 || !validScore(data.score1, data.score2) || typeof data.team1Name !== 'string' || typeof data.team2Name !== 'string') return null;
  return { court: data.court, matchId: typeof data.matchId === 'string' ? data.matchId : undefined,
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : undefined,
    team1Name: data.team1Name.slice(0, 200), team2Name: data.team2Name.slice(0, 200), score1: data.score1, score2: data.score2 };
}
export function createLiveScoreStore() {
  let scores: LiveScore[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    getSnapshot: () => scores,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    receive(data: unknown) {
      const score = readLiveScore(data); if (!score) return;
      const index = scores.findIndex(previous => previous.court === score.court);
      const previous = scores[index];
      if (previous && Object.keys(score).every(key => Object.is(previous[key as keyof LiveScore], score[key as keyof LiveScore]))) return;
      scores = index < 0 ? [...scores, score] : scores.map((previous, n) => n === index ? score : previous);
      notify();
    },
    clear() { if (!scores.length) return; scores = []; notify(); },
  };
}
