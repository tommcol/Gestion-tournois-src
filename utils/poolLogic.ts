
import { Team, Pool, Match } from '../types';
import { generateId } from './id';
import { shuffleArray } from './helpers';

export const generatePools = (teams: Team[], teamsPerPool: number, categoryId: string): { pools: Pool[], updatedTeams: Team[] } => {
  const shuffledTeams = shuffleArray(teams);
  const numPools = Math.ceil(shuffledTeams.length / teamsPerPool);
  const pools: Pool[] = [];
  const updatedTeams: Team[] = [];

  for (let i = 0; i < numPools; i++) {
    const poolId = `${categoryId}-pool-${i + 1}`;
    const poolTeams = shuffledTeams.slice(i * teamsPerPool, (i + 1) * teamsPerPool);
    pools.push({ id: poolId, teams: poolTeams.map(t => t.id) });
    poolTeams.forEach(team => {
        updatedTeams.push({...team, poolId});
    });
  }

  return { pools, updatedTeams };
};

export const generateMatchesForPools = (pools: Pool[], allTeams: Team[]): Match[] => {
  let matches: Match[] = [];
  pools.forEach(pool => {
    const teamIds = pool.teams;
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        matches.push({
          id: generateId(),
          team1Id: teamIds[i],
          team2Id: teamIds[j],
          score1: null,
          score2: null,
          court: null,
          status: 'pending',
          poolId: pool.id,
          round: 'Pool',
          refereeId: null,
          scorerId: null,
        });
      }
    }
  });
  return matches;
};

export const generateSwissMatches = (teams: Team[], matchCount: number, poolId: string): Match[] => {
    const matches: Match[] = [];
    const teamIds = teams.map(t => t.id);
    const n = teamIds.length;
    
    if (n < 2) return [];

    // Circle Method for scheduling
    const effectiveTeams = n % 2 === 0 ? [...teamIds] : [...teamIds, "BYE"];
    const numEffective = effectiveTeams.length;
    const totalPossibleRounds = numEffective - 1;
    
    const rotation = [...effectiveTeams];
    const fixed = rotation.shift()!;
    const allPossibleRounds: [string, string][][] = [];

    for (let r = 0; r < totalPossibleRounds; r++) {
        const roundMatches: [string, string][] = [];
        roundMatches.push([fixed, rotation[0]]);
        for (let i = 1; i < numEffective / 2; i++) {
            roundMatches.push([rotation[i], rotation[numEffective - 1 - i]]);
        }
        allPossibleRounds.push(roundMatches);
        rotation.push(rotation.shift()!);
    }

    const teamMatchCount = new Map<string, number>();
    teamIds.forEach(id => teamMatchCount.set(id, 0));

    for (const round of allPossibleRounds) {
        for (const [t1, t2] of round) {
            if (t1 !== "BYE" && t2 !== "BYE") {
                if ((teamMatchCount.get(t1) || 0) < matchCount && (teamMatchCount.get(t2) || 0) < matchCount) {
                    matches.push({
                        id: generateId(),
                        team1Id: t1,
                        team2Id: t2,
                        score1: null,
                        score2: null,
                        court: null,
                        status: 'pending',
                        poolId: poolId,
                        round: 'Swiss',
                        refereeId: null,
                        scorerId: null,
                    });
                    teamMatchCount.set(t1, (teamMatchCount.get(t1) || 0) + 1);
                    teamMatchCount.set(t2, (teamMatchCount.get(t2) || 0) + 1);
                }
            }
        }
        // If we reached the goal for everyone, stop
        if (Array.from(teamMatchCount.values()).every(count => count >= matchCount)) {
            break;
        }
    }

    return matches;
};
