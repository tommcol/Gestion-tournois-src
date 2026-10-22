import { createLiveScoreStore } from '../utils/liveScores';
// Cache séparé du tournoi officiel, y compris pour les messages reçus avant le montage de la TV.
export const liveScoresChannel = createLiveScoreStore();
