
import { TournamentState, TournamentAction } from '../../types';

export const configReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'UPDATE_CONFIG': {
      const { tvConfig, ...otherConfig } = action.payload;
      if (tvConfig) {
        return { 
          ...state, 
          ...otherConfig, 
          tvConfig: { ...state.tvConfig, ...tvConfig } 
        };
      }
      return { ...state, ...otherConfig };
    }
    case 'UPDATE_SOUND_CONFIG':
      return { ...state, soundConfig: { ...state.soundConfig, ...action.payload } };
    default:
      return state;
  }
};
