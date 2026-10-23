
import { validScore } from '../../utils/tournamentFlow';
import { finalMatchStartIssue } from '../../utils/finalMatchSafety';
import { TournamentState, TournamentAction, FinalMatch } from '../../types';
import { generateAutoPairings, createEmptyPairings, generateBracket, updateWinnerInFinals } from '../../utils/finalPhaseLogic';

export const finalPhaseReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'UPDATE_FINAL_CONFIG': {
      const { categoryId, config } = action.payload;
      return {
        ...state,
        categories: state.categories.map(c => c.id === categoryId ? { ...c, finalPhaseConfig: config } : c),
      };
    }
    case 'GENERATE_FINAL_PHASE': {
      const { categoryId, qualifiedTeams, totalTeams, mode } = action.payload;
      let newMatchesForCategory: FinalMatch[] = [];
      if(mode === 'auto') {
        newMatchesForCategory = generateAutoPairings(
          qualifiedTeams, 
          totalTeams,
          state.pools,
          state.standings,
          categoryId
        );
      } else {
        newMatchesForCategory = createEmptyPairings(totalTeams, categoryId);
      }
      return { 
        ...state, 
        finalMatches: {
          ...state.finalMatches,
          [categoryId]: newMatchesForCategory
        } 
      };
    }
    case 'UPDATE_MANUAL_PAIRINGS': {
      const { categoryId, matches } = action.payload;
      const completeBracket = generateBracket(matches, categoryId);
      return { 
        ...state,
        finalMatches: {
          ...state.finalMatches,
          [categoryId]: completeBracket
        }
      };
    }
    case 'DELETE_FINAL_PHASE': {
      const { categoryId } = action.payload;
      const newFinalMatches = { ...state.finalMatches };
      delete newFinalMatches[categoryId];
      return { ...state, finalMatches: newFinalMatches };
    }
    case 'UPDATE_FINAL_MATCH_COURT': {
      const { categoryId, matchId, court } = action.payload;
      const categoryMatches = state.finalMatches[categoryId] || [];

      const target = categoryMatches.find(m => m.id === matchId);
      if (!target || (court !== undefined && (!Number.isInteger(court) || court < 1 || court > state.numberOfCourts))) return state;
      // Un match actif reste sur son terrain jusqu'à son arrêt ou sa validation.
      if (target.isReady && target.status !== 'finished' && court !== target.court) return state;

      let updatedFinalMatches = categoryMatches.map(m => {
        if (m.id === matchId) {
          return { ...m, court };
        }
        return m;
      });
      
      return { 
        ...state,
        finalMatches: {
          ...state.finalMatches,
          [categoryId]: updatedFinalMatches
        }
      };
    }
    case 'SET_FINAL_MATCH_READY': {
      const { categoryId, matchId, isReady } = action.payload;
      const target = state.finalMatches[categoryId]?.find(m => m.id === matchId);
      if (!target || (isReady && finalMatchStartIssue(state, target))) return state;
      return {
          ...state,
          finalMatches: {
              ...state.finalMatches,
              [categoryId]: (state.finalMatches[categoryId] || []).map(m =>
                  m.id === matchId ? { ...m, isReady } : m
              )
          }
      };
    }
    case 'UPDATE_FINAL_MATCH_SCORE': {
      const { categoryId, matchId, score1, score2, isForfeit } = action.payload;
      if (!validScore(score1, score2) || (!isForfeit && score1 === score2)) return state;
      const target = state.finalMatches[categoryId]?.find(m => m.id === matchId);
      if (!target?.team1Id || !target.team2Id) return state;
      const categoryMatches = state.finalMatches[categoryId] || [];

      let updatedFinalMatches = categoryMatches.map(m => {
        if (m.id === matchId) {
          const winnerId = isForfeit 
            ? (isForfeit === 'team1' ? m.team2Id : m.team1Id)
            : (score1 > score2 ? m.team1Id : m.team2Id);
          return { ...m, score1, score2, isForfeit: isForfeit ?? null, winnerId, isOvertime: false, isReady: false, status: 'finished' as const };
        }
        return m;
      });
      
      updatedFinalMatches = updateWinnerInFinals(updatedFinalMatches, matchId);
      
      return { 
        ...state,
        finalMatches: {
          ...state.finalMatches,
          [categoryId]: updatedFinalMatches
        }
      };
    }
    default:
      return state;
  }
};

