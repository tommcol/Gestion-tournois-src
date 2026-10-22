import { getStartingBonus } from './startingBonus';

import { Team } from '../types';

export const getAdminTeamName = (team: Team | null | undefined): string => {
    if (!team) return 'Équipe Inconnue';
    if (getStartingBonus(team) > 0) {
        const bonus = `+${getStartingBonus(team)}`;
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

