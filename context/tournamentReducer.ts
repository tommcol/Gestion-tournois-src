import { TournamentState, TournamentAction } from '../types';
import { configReducer } from './reducers/configReducer';
import { categoryReducer } from './reducers/categoryReducer';
import { teamReducer } from './reducers/teamReducer';
import { poolMatchReducer } from './reducers/poolMatchReducer';
import { finalPhaseReducer } from './reducers/finalPhaseReducer';
import { sponsorReducer } from './reducers/sponsorReducer';
import { sessionReducer } from './reducers/sessionReducer';
import { globalReducer } from './reducers/globalReducer';

export const tournamentReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  // Try each sub-reducer. If a sub-reducer handles the action, it returns a new state.
  // Otherwise, it returns the original state.
  
  let newState = globalReducer(state, action);
  if (newState !== state) return newState;

  newState = configReducer(state, action);
  if (newState !== state) return newState;

  newState = categoryReducer(state, action);
  if (newState !== state) return newState;

  newState = teamReducer(state, action);
  if (newState !== state) return newState;

  newState = poolMatchReducer(state, action);
  if (newState !== state) return newState;

  newState = finalPhaseReducer(state, action);
  if (newState !== state) return newState;

  newState = sponsorReducer(state, action);
  if (newState !== state) return newState;

  newState = sessionReducer(state, action);
  if (newState !== state) return newState;

  return state;
};

