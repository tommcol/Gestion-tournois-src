import { Team } from '../types';
// Le nombre renseigné est prioritaire. Les anciennes équipes sans ce champ utilisent leur liste de joueuses.
export function getStartingBonus(team?: Team | null): number {
  if (!team) return 0;
  const count = typeof team.womenCount === 'number' && Number.isFinite(team.womenCount) && team.womenCount >= 0
    ? team.womenCount : (team.players || []).filter(player => player.gender === 'Femme').length;
  return Math.min(2, Math.max(0, Math.floor(count)));
}
