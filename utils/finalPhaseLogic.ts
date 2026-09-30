
import { Team, Pool, FinalMatch, Category, Standing } from '../types';
import { generateId } from './id';

export const createEmptyPairings = (totalTeams: number, categoryId: string): FinalMatch[] => {
    const matches: FinalMatch[] = [];
    const rounds: { [key: number]: 'semiFinal' | 'quarterFinal' | 'roundOf16' | 'roundOf32' } = { 4: 'semiFinal', 8: 'quarterFinal', 16: 'roundOf16', 32: 'roundOf32' };
    const roundName = rounds[totalTeams as keyof typeof rounds];
    if (!roundName) return [];
    
    const numMatches = totalTeams / 2;
    for (let i = 0; i < numMatches; i++) {
        matches.push({
            id: generateId(),
            categoryId,
            round: roundName,
            matchNumber: i + 1,
            team1Id: null,
            team2Id: null,
            score1: null,
            score2: null,
            status: 'pending',
        });
    }
    return matches;
};

export const getNextRound = (current: FinalMatch['round']): FinalMatch['round'] | null => {
    const roundProgression: Partial<Record<FinalMatch['round'], FinalMatch['round']>> = {
        'roundOf32': 'roundOf16',
        'roundOf16': 'quarterFinal',
        'quarterFinal': 'semiFinal',
        'semiFinal': 'final',
    };
    return roundProgression[current] || null;
};

export const generateBracket = (initialRoundMatches: FinalMatch[], categoryId: string): FinalMatch[] => {
    let allMatches = [...initialRoundMatches];
    let currentRound = initialRoundMatches;

    while(currentRound.length > 1) {
        const nextRoundName = getNextRound(currentRound[0].round);
        if(!nextRoundName) break;

        const nextRoundMatches: FinalMatch[] = [];
        for (let i = 0; i < currentRound.length; i += 2) {
            const match1 = currentRound[i];
            const match2 = currentRound[i+1];
            nextRoundMatches.push({
                id: generateId(),
                categoryId,
                round: nextRoundName,
                matchNumber: (i/2) + 1,
                team1Id: null,
                team2Id: null,
                score1: null,
                score2: null,
                status: 'pending',
                sourceMatch1: match1.id,
                sourceMatch2: match2.id,
            });
        }
        allMatches.push(...nextRoundMatches);
        currentRound = nextRoundMatches;
    }
    
    const semiFinals = allMatches
        .filter(match => match.round === 'semiFinal')
        .sort((a, b) => a.matchNumber - b.matchNumber);

    if (semiFinals.length === 2 && !allMatches.some(match => match.round === 'thirdPlace')) {
      // The third-place match is played by the two semi-final losers.
      const [semi1, semi2] = semiFinals;
      allMatches.push({
        id: generateId(),
        categoryId,
        round: 'thirdPlace',
        matchNumber: 1,
        team1Id: null,
        team2Id: null,
        score1: null,
        score2: null,
        status: 'pending',
        sourceMatch1: semi1.id,
        sourceMatch2: semi2.id,
      });
    }

    return allMatches;
};

export const generateAutoPairings = (
    qualifiedTeams: Team[],
    totalTeams: number,
    allPools: Pool[],
    allStandingsMap: { [poolId: string]: Standing[] },
    categoryId: string
): FinalMatch[] => {
    const allStandings: Standing[] = [];
    const relevantPoolIds = new Set(qualifiedTeams.map(t => t.poolId));
    const relevantPools = allPools.filter(p => relevantPoolIds.has(p.id));

    relevantPools.forEach(pool => {
        const standings = allStandingsMap[pool.id] || [];
        allStandings.push(...standings);
    });

    const qualifiedTeamIds = new Set(qualifiedTeams.map(t => t.id));
    const qualifiedStandings = allStandings.filter(s => qualifiedTeamIds.has(s.teamId));

    const teamRankMap = new Map<string, number>();
    relevantPools.forEach(pool => {
        const standings = allStandingsMap[pool.id] || [];
        standings.forEach((s, index) => {
            teamRankMap.set(s.teamId, index);
        });
    });

    qualifiedStandings.sort((a, b) => {
        const rankA = teamRankMap.get(a.teamId) ?? 99;
        const rankB = teamRankMap.get(b.teamId) ?? 99;
        if (rankA !== rankB) return rankA - rankB; 
        if (a.points !== b.points) return b.points - a.points; 
        if (a.pointsDifference !== b.pointsDifference) return b.pointsDifference - a.pointsDifference;
        if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
        if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst;
        return 0; 
    });
    
    const rankedTeams: (Team | null)[] = qualifiedStandings.map(standing => 
        qualifiedTeams.find(team => team.id === standing.teamId) || null
    ).filter(Boolean); 
    
    if (rankedTeams.length < totalTeams) {
        for(let i = rankedTeams.length; i < totalTeams; i++) {
            rankedTeams.push(null);
        }
    }

    const pairings: FinalMatch[] = [];
    const rounds: { [key: number]: 'semiFinal' | 'quarterFinal' | 'roundOf16' | 'roundOf32' } = { 4: 'semiFinal', 8: 'quarterFinal', 16: 'roundOf16', 32: 'roundOf32' };
    const roundName = rounds[totalTeams as keyof typeof rounds];
    if (!roundName) return [];

    let seedOrder = [1, 2];
    while (seedOrder.length < totalTeams) {
        const nextRound = [];
        const currentSize = seedOrder.length;
        const sum = currentSize * 2 + 1;
        for (let i = 0; i < currentSize; i++) {
            nextRound.push(seedOrder[i]);
            nextRound.push(sum - seedOrder[i]);
        }
        seedOrder = nextRound;
    }

    const numMatches = totalTeams / 2;

    for (let i = 0; i < numMatches; i++) {
        const seed1 = seedOrder[i * 2];
        const seed2 = seedOrder[i * 2 + 1];
        const team1 = rankedTeams[seed1 - 1] || null;
        const team2 = rankedTeams[seed2 - 1] || null;

        pairings.push({
            id: generateId(),
            categoryId,
            round: roundName,
            matchNumber: i + 1,
            team1Id: team1?.id || null,
            team2Id: team2?.id || null,
            score1: null,
            score2: null,
            status: 'pending',
        });
    }

    return generateBracket(pairings, categoryId);
};

export const updateWinnerInFinals = (matches: FinalMatch[], updatedMatchId: string): FinalMatch[] => {
    const updatedMatches = [...matches];
    const finishedMatch = updatedMatches.find(m => m.id === updatedMatchId);
    if (!finishedMatch || !finishedMatch.winnerId) return matches;

    for (const match of updatedMatches) {
        if (match.sourceMatch1 === finishedMatch.id) {
            match.team1Id = finishedMatch.winnerId;
        }
        if (match.sourceMatch2 === finishedMatch.id) {
            match.team2Id = finishedMatch.winnerId;
        }
        
        if (match.round === 'thirdPlace') {
            const semi1 = updatedMatches.find(m => m.id === match.sourceMatch1);
            const semi2 = updatedMatches.find(m => m.id === match.sourceMatch2);
            if (semi1?.winnerId && semi2?.winnerId) {
                const loser1 = semi1.team1Id === semi1.winnerId ? semi1.team2Id : semi1.team1Id;
                const loser2 = semi2.team1Id === semi2.winnerId ? semi2.team2Id : semi2.team1Id;
                match.team1Id = loser1;
                match.team2Id = loser2;
            }
        }
    }

    return updatedMatches;
};
