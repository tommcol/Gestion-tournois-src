
import { TournamentState, TournamentAction } from '../../types';

export const teamReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.payload] };
    case 'UPDATE_TEAM':
      return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TEAM':
      return { ...state, teams: state.teams.filter(t => t.id !== action.payload) };
    default:
      return state;
  }
};
