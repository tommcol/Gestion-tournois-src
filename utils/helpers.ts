
import { Team } from '../types';

export const getAdminTeamName = (team: Team | null | undefined): string => {
    if (!team) return 'Équipe Inconnue';
    if (team.womenCount !== undefined && team.womenCount > 0) {
        const bonus = team.womenCount >= 2 ? '+2' : '+1';
        return `${team.name} ${bonus}`;
    }
    return team.name;
};

// Fisher-Yates shuffle algorithm
export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
