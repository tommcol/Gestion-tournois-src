import { scheduleFinalMatches } from '../utils/scheduleLogic';
import { officialsReducer } from './reducers/officialsReducer';
import { reassignOfficials } from '../utils/officialAssignments';
import { TournamentState, TournamentAction } from '../types';
import { configReducer } from './reducers/configReducer';
import { categoryReducer } from './reducers/categoryReducer';
import { teamReducer } from './reducers/teamReducer';
import { poolMatchReducer } from './reducers/poolMatchReducer';
import { finalPhaseReducer } from './reducers/finalPhaseReducer';
import { sponsorReducer } from './reducers/sponsorReducer';
import { sessionReducer } from './reducers/sessionReducer';
import { globalReducer } from './reducers/globalReducer';

const reduceTournament = (state: TournamentState, action: TournamentAction): TournamentState => {
  // Try each sub-reducer. If a sub-reducer handles the action, it returns a new state.
  // Otherwise, it returns the original state.
  
  let newState = officialsReducer(state, action);
  if (newState !== state) return newState;
  newState = globalReducer(state, action);
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



const officialActions = new Set(['UPSERT_OFFICIAL','SET_OFFICIAL_ACTIVE','REASSIGN_OFFICIALS','GENERATE_CATEGORY_POOLS_AND_MATCHES','RESET_CATEGORY_POOLS','ADD_TEAM','UPDATE_TEAM','DELETE_TEAM','UPDATE_CATEGORY','DELETE_CATEGORY','START_FINAL_PHASE','UPDATE_FINAL_MATCH_SCORE','UPDATE_FINAL_MATCH_COURT','GENERATE_FINAL_PHASE','UPDATE_MANUAL_PAIRINGS','DELETE_FINAL_PHASE']);
export const tournamentReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  let next = reduceTournament(state, action);
  if (next.isFinalPhase && ['GENERATE_FINAL_PHASE','UPDATE_MANUAL_PAIRINGS'].includes(action.type)) next = { ...next, finalMatches: scheduleFinalMatches(next.finalMatches,next.numberOfCourts,next.categories) };
  return officialActions.has(action.type) ? reassignOfficials(next) : next;
};
