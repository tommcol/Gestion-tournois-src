
import { TournamentState, TournamentAction } from '../../types';
import { calculateAllStandings } from '../../utils/standingsLogic';
import { scheduleFinalMatches } from '../../utils/scheduleLogic';

export const sessionReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'NEXT_SESSION': {
      const matches = state.isFinalPhase 
        ? Object.values(state.finalMatches).flat() 
        : state.matches;
      const maxSession = Math.max(0, ...matches.map(m => m.sessionNumber || 0));
      return {
        ...state,
        currentSession: state.currentSession < maxSession ? state.currentSession + 1 : state.currentSession
      };
    }
    case 'PREVIOUS_SESSION': {
      if (state.currentSession <= 1) return state;
      return {
          ...state,
          currentSession: state.currentSession - 1
      };
    }
    case 'FINISH_POOL_STAGE': {
      // Update global timer settings based on final phase configs if provided
      let newTimerDuration = state.timerDuration;
      let newBreakDuration = state.breakDuration;
      let newNumberOfCourts = state.numberOfCourts;

      const categoriesWithFinals = state.categories.filter(c => c.finalPhaseConfig);
      if (categoriesWithFinals.length > 0) {
          const firstCat = categoriesWithFinals[0];
          if (firstCat.finalPhaseConfig.timerDuration) newTimerDuration = firstCat.finalPhaseConfig.timerDuration;
          if (firstCat.finalPhaseConfig.breakDuration) newBreakDuration = firstCat.finalPhaseConfig.breakDuration;
          if (firstCat.finalPhaseConfig.numberOfCourts) newNumberOfCourts = firstCat.finalPhaseConfig.numberOfCourts;
      }

      return {
        ...state,
        isPoolStageFinished: true,
        timerDuration: newTimerDuration,
        breakDuration: newBreakDuration,
        numberOfCourts: newNumberOfCourts
      };
    }
    case 'START_FINAL_PHASE': {
      const scheduledFinalMatches = scheduleFinalMatches(state.finalMatches, state.numberOfCourts, state.categories);
      
      return {
        ...state,
        isFinalPhase: true,
        isTournamentStarted: true,
        currentSession: 1,
        finalMatches: scheduledFinalMatches,
      };
    }
    case 'START_TOURNAMENT':
      return {
        ...state,
        isTournamentStarted: true,
        currentSession: 1,
      };
    case 'RESET_SESSIONS': {
      const newMatches = state.matches.map(m => ({
        ...m,
        sessionNumber: undefined,
        court: null,
        refereeId: null,
        scorerId: null,
        status: 'pending' as const,
        score1: null,
        score2: null
      }));
      return { 
        ...state, 
        currentSession: 1,
        isPoolStageFinished: false,
        isFinalPhase: false,
        isTournamentStarted: false,
        matches: newMatches,
        standings: calculateAllStandings(state.pools, newMatches),
      };
    }
    default:
      return state;
  }
};
