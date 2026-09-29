
import { TournamentState, TournamentAction } from '../../types';
import { calculateAllStandings } from '../../utils/standingsLogic';

export const categoryReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'SET_TV_ROUND':
      return {
        ...state,
        categories: state.categories.map(c => 
          c.id === action.payload.categoryId 
            ? { ...c, activeTvRound: action.payload.round } 
            : c
        )
      };
    case 'DELETE_CATEGORY': {
      const categoryIdToDelete = action.payload;
      const newCategories = state.categories.filter(c => c.id !== categoryIdToDelete);
      const newTeams = state.teams.filter(t => t.categoryId !== categoryIdToDelete);
      const newPools = state.pools.filter(p => !p.id.startsWith(categoryIdToDelete));
      const newMatches = state.matches.filter(m => !m.poolId.startsWith(categoryIdToDelete));
      const newFinalMatches = { ...state.finalMatches };
      delete newFinalMatches[categoryIdToDelete];

      return {
        ...state,
        categories: newCategories,
        teams: newTeams,
        pools: newPools,
        matches: newMatches,
        finalMatches: newFinalMatches,
        standings: calculateAllStandings(newPools, newMatches),
      };
    }
    default:
      return state;
  }
};
