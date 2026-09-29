
import { Team, Pool, Match, Standing } from '../types';

export const calculatePoolStandings = (pool: Pool, matches: Match[]): Standing[] => {
  const standings: { [teamId: string]: Standing } = {};

  pool.teams.forEach(teamId => {
    standings[teamId] = {
      teamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0, 
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDifference: 0,
    };
  });

  // Track games played excluding forfeits for the average calculation
  const playedForAverage: { [teamId: string]: number } = {};
  pool.teams.forEach(teamId => { playedForAverage[teamId] = 0; });

  const poolMatches = matches.filter(m => m.poolId === pool.id && m.status === 'finished');

  poolMatches.forEach(match => {
    const { team1Id, team2Id, score1, score2, isForfeit } = match;
    if (score1 === null || score2 === null) return;

    if (standings[team1Id] && standings[team2Id]) {
      standings[team1Id].played++;
      standings[team2Id].played++;

      if (!isForfeit) {
          standings[team1Id].pointsFor += score1;
          standings[team1Id].pointsAgainst += score2;
          standings[team2Id].pointsFor += score2;
          standings[team2Id].pointsAgainst += score1;
          
          playedForAverage[team1Id]++;
          playedForAverage[team2Id]++;
      }

      const isForfeit1 = isForfeit === 'team1';
      const isForfeit2 = isForfeit === 'team2';

      if (isForfeit1) {
          standings[team1Id].points += 0;
          standings[team2Id].points += 3;
          standings[team1Id].losses += 1;
          standings[team2Id].wins += 1;
      } else if (isForfeit2) {
          standings[team2Id].points += 0;
          standings[team1Id].points += 3;
          standings[team2Id].losses += 1;
          standings[team1Id].wins += 1;
      } else if (score1 > score2) {
        standings[team1Id].wins++;
        standings[team1Id].points += 3; 
        standings[team2Id].losses++;
        standings[team2Id].points += 1; 
      } else if (score2 > score1) {
        standings[team2Id].wins++;
        standings[team2Id].points += 3;
        standings[team1Id].losses++;
        standings[team1Id].points += 1; 
      } else {
        standings[team1Id].draws++;
        standings[team1Id].points += 2; 
        standings[team2Id].draws++;
        standings[team2Id].points += 2;
      }
    }
  });

  Object.values(standings).forEach(s => {
    s.pointsDifference = s.pointsFor - s.pointsAgainst;
  });

  const sortedStandings = Object.values(standings).sort((a, b) => {
    // 1. Points totaux
    if (b.points !== a.points) return b.points - a.points;

    // 2. Nombre de victoires
    if (b.wins !== a.wins) return b.wins - a.wins;

    // 3. Points marqués (hors forfaits)
    const aPointsFor = matches
        .filter(m => m.status === 'finished' && !m.isForfeit &&
            (m.team1Id === a.teamId || m.team2Id === a.teamId))
        .reduce((sum, m) => sum + (m.team1Id === a.teamId
            ? (m.score1 ?? 0)
            : (m.score2 ?? 0)), 0);

    const bPointsFor = matches
        .filter(m => m.status === 'finished' && !m.isForfeit &&
            (m.team1Id === b.teamId || m.team2Id === b.teamId))
        .reduce((sum, m) => sum + (m.team1Id === b.teamId
            ? (m.score1 ?? 0)
            : (m.score2 ?? 0)), 0);

    if (bPointsFor !== aPointsFor) return bPointsFor - aPointsFor;

    // 4. Points encaissés (hors forfaits) - moins c'est mieux
    const aPointsAgainst = matches
        .filter(m => m.status === 'finished' && !m.isForfeit &&
            (m.team1Id === a.teamId || m.team2Id === a.teamId))
        .reduce((sum, m) => sum + (m.team1Id === a.teamId
            ? (m.score2 ?? 0)
            : (m.score1 ?? 0)), 0);

    const bPointsAgainst = matches
        .filter(m => m.status === 'finished' && !m.isForfeit &&
            (m.team1Id === b.teamId || m.team2Id === b.teamId))
        .reduce((sum, m) => sum + (m.team1Id === b.teamId
            ? (m.score2 ?? 0)
            : (m.score1 ?? 0)), 0);

    return aPointsAgainst - bPointsAgainst;
  });

  return sortedStandings;
};

export const calculateAllStandings = (pools: Pool[], matches: Match[]): { [poolId: string]: Standing[] } => {
  const allStandings: { [poolId: string]: Standing[] } = {};
  pools.forEach(pool => {
    allStandings[pool.id] = calculatePoolStandings(pool, matches);
  });
  return allStandings;
};

export const getAllQualifiedTeams = (
    pools: Pool[], 
    allStandingsMap: { [poolId: string]: Standing[] }, 
    teams: Team[], 
    teamsPerPool: number, 
    totalTeamsInFinals: number
): { qualified: Team[], warning?: string } => {
    if (pools.length === 0) {
        return { qualified: [] };
    }

    const allStandings: Standing[] = [];
    const directlyQualifiedTeamIds = new Set<string>();

    pools.forEach(pool => {
        const standings = allStandingsMap[pool.id] || [];
        allStandings.push(...standings);
        
        standings.slice(0, teamsPerPool).forEach(s => {
            directlyQualifiedTeamIds.add(s.teamId);
        });
    });

    const directlyQualifiedTeams = teams.filter(t => directlyQualifiedTeamIds.has(t.id));

    if (directlyQualifiedTeams.length > totalTeamsInFinals) {
        const warningMessage = `Configuration invalide : ${directlyQualifiedTeams.length} équipes sont qualifiées pour une phase finale à ${totalTeamsInFinals} places. Seules les ${totalTeamsInFinals} meilleures équipes qualifiées directement seront conservées en fonction de leurs résultats.`;
        
        const directStandings = allStandings.filter(s => directlyQualifiedTeamIds.has(s.teamId));
        directStandings.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points; 
            if (a.pointsDifference !== b.pointsDifference) return b.pointsDifference - a.pointsDifference;
            if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
            if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst; 
            return 0;
        });

        const topDirectTeamIds = new Set(directStandings.slice(0, totalTeamsInFinals).map(s => s.teamId));
        return { 
            qualified: teams.filter(t => topDirectTeamIds.has(t.id)),
            warning: warningMessage,
        };
    }

    const numberOfWildcardsNeeded = totalTeamsInFinals - directlyQualifiedTeams.length;

    if (numberOfWildcardsNeeded <= 0) {
        return { qualified: directlyQualifiedTeams };
    }

    const wildcardCandidates = allStandings.filter(s => !directlyQualifiedTeamIds.has(s.teamId));
    
    wildcardCandidates.sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points; 
        if (a.pointsDifference !== b.pointsDifference) return b.pointsDifference - a.pointsDifference;
        if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
        if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst;
        return 0;
    });

    const wildcardTeamIds = wildcardCandidates.slice(0, numberOfWildcardsNeeded).map(s => s.teamId);
    
    let warningMessage: string | undefined = undefined;
    if (wildcardTeamIds.length < numberOfWildcardsNeeded) {
        warningMessage = `Attention : Pas assez d'équipes pour remplir toutes les places de repêchage. ${wildcardTeamIds.length} sur ${numberOfWildcardsNeeded} places ont été pourvues.`;
    }

    const wildcardTeams = teams.filter(t => wildcardTeamIds.includes(t.id));
    
    return { 
        qualified: [...directlyQualifiedTeams, ...wildcardTeams],
        warning: warningMessage,
    };
};
