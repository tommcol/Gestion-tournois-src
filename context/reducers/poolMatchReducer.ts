
import { TournamentState, TournamentAction, Pool } from '../../types';
import { generatePools, generateMatchesForPools, generateSwissMatches } from '../../utils/poolLogic';
import { generateSchedule } from '../../utils/scheduleLogic';
import { calculateAllStandings } from '../../utils/standingsLogic';
import { generateId } from '../../utils/id';

export const poolMatchReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'GENERATE_CATEGORY_POOLS_AND_MATCHES': {
      const { categoryId, teamsPerPool, tournamentType, swissMatchCount, isDoubleRoundRobin } = action.payload;
      const categoryTeams = state.teams.filter(t => t.categoryId === categoryId);
      
      if (categoryTeams.length === 0) return state;

      let newPools: Pool[] = [];
      let updatedTeamsForCategory = [];
      let newMatchesForCategory: any[] = [];

      if (tournamentType === 'swiss') {
          const poolId = `${categoryId}-swiss-pool`;
          newPools = [{ id: poolId, teams: categoryTeams.map(t => t.id) }];
          updatedTeamsForCategory = categoryTeams.map(t => ({ ...t, poolId }));
          newMatchesForCategory = generateSwissMatches(categoryTeams, swissMatchCount, poolId);
      } else {
          const { pools, updatedTeams: catUpdatedTeams } = generatePools(categoryTeams, teamsPerPool, categoryId);
          newPools = pools;
          updatedTeamsForCategory = catUpdatedTeams;
          newMatchesForCategory = generateMatchesForPools(newPools, updatedTeamsForCategory);

          if (isDoubleRoundRobin) {
              const returnMatches = newMatchesForCategory.map(m => ({
                  ...m,
                  id: generateId(),
              }));
              newMatchesForCategory = [...newMatchesForCategory, ...returnMatches];
          }
      }

      const remainingPools = state.pools.filter(p => !p.id.startsWith(categoryId));
      const remainingMatches = state.matches.filter(m => !m.poolId.startsWith(categoryId));
      
      const allTeamsWithPools = state.teams.map(t => updatedTeamsForCategory.find(ut => ut.id === t.id) || t);
      const allMatchesToSchedule = [...remainingMatches, ...newMatchesForCategory];
      const scheduledMatches = generateSchedule(allMatchesToSchedule, allTeamsWithPools, state.numberOfCourts, state.categories);

      // Update category config in state
      const updatedCategories = state.categories.map(c => 
          c.id === categoryId ? { ...c, tournamentType, swissMatchCount, isDoubleRoundRobin } : c
      );

      return {
        ...state,
        categories: updatedCategories,
        pools: [...remainingPools, ...newPools],
        teams: allTeamsWithPools,
        matches: scheduledMatches,
        standings: calculateAllStandings([...remainingPools, ...newPools], scheduledMatches),
      };
    }
    case 'RESET_CATEGORY_POOLS': {
      const { categoryId } = action.payload;
      const remainingPools = state.pools.filter(p => !p.id.startsWith(categoryId));
      const remainingMatches = state.matches.filter(m => !m.poolId.startsWith(categoryId));

      const updatedTeams = state.teams.map(t => {
        if (t.categoryId === categoryId) {
          const newTeam = { ...t };
          delete newTeam.poolId;
          return newTeam;
        }
        return t;
      });

      const scheduledMatches = generateSchedule(remainingMatches, updatedTeams, state.numberOfCourts, state.categories);

      return {
        ...state,
        pools: remainingPools,
        matches: scheduledMatches,
        teams: updatedTeams,
        standings: calculateAllStandings(remainingPools, scheduledMatches),
      };
    }
    case 'UPDATE_MATCH_SCORE': {
      const { matchId, score1, score2, isForfeit } = action.payload;
      const newMatches = state.matches.map(m =>
        m.id === matchId
          ? { ...m, score1, score2, isForfeit, status: 'finished' as const }
          : m
      );
      return {
        ...state,
        matches: newMatches,
        standings: calculateAllStandings(state.pools, newMatches),
      };
    }
    default:
      return state;
  }
};
