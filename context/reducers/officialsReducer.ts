import { TournamentAction, TournamentState } from '../../types';
export function officialsReducer(state: TournamentState, action: TournamentAction): TournamentState {
  if (action.type === 'UPSERT_OFFICIAL') {
    const o = action.payload;
    if (!o.id.startsWith('official-') || !o.firstName.trim() || !o.lastName.trim() || !o.roles.length || o.roles.some(r => !['Arbitre','Marqueur'].includes(r))) return state;
    const official = { ...o, firstName: o.firstName.trim(), lastName: o.lastName.trim(), finalsReferee: !!o.finalsReferee && o.roles.includes('Arbitre'), finalsScorer: !!o.finalsScorer && o.roles.includes('Marqueur') };
    return { ...state, officials: [...(state.officials || []).filter(p => p.id !== o.id), official] };
  }
  if (action.type === 'SET_OFFICIAL_ACTIVE') return { ...state, officials: (state.officials || []).map(o => o.id === action.payload.id ? { ...o, active: action.payload.active } : o) };
  return state;
}
