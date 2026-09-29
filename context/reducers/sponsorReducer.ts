
import { TournamentState, TournamentAction } from '../../types';

export const sponsorReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'ADD_SPONSOR':
      return { ...state, sponsors: [...state.sponsors, action.payload] };
    case 'UPDATE_SPONSOR':
      return { 
        ...state, 
        sponsors: state.sponsors.map(s => s.id === action.payload.id ? action.payload : s) 
      };
    case 'DELETE_SPONSOR':
      return { 
        ...state, 
        sponsors: state.sponsors.filter(s => s.id !== action.payload) 
      };
    default:
      return state;
  }
};
