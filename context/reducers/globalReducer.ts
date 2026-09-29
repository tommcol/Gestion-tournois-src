
import { TournamentState, TournamentAction } from '../../types';
import { generateId } from '../../utils/id';

export const globalReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'SET_STATE': {
        const payload = action.payload;

        // Migration des catégories
        const migratedCategories = (payload.categories || []).map((cat: any) => ({
            ...cat,
            isScorerMandatory: cat.isScorerMandatory ?? false,
            isRefereeMandatory: cat.isRefereeMandatory ?? false,
            reservedCourtIds: cat.reservedCourtIds ?? [],
            tournamentType: cat.tournamentType ?? 'traditional',
            swissMatchCount: cat.swissMatchCount ?? 5,
            isDoubleRoundRobin: cat.isDoubleRoundRobin ?? false,
        }));

        // Migration des matchs de poule
        const migratedMatches = (payload.matches || []).map((m: any) => ({
            ...m,
            isForfeit: m.isForfeit ?? null,
        }));

        // Migration des standings
        const migratedStandings: Record<string, any[]> = {};
        Object.entries(payload.standings || {}).forEach(([poolId, poolStandings]: [string, any]) => {
            migratedStandings[poolId] = (poolStandings || []).map((s: any) => ({
                ...s,
                draws: s.draws ?? 0,
            }));
        });

        // Migration des matchs de phase finale
        const migratedFinalMatches: Record<string, any[]> = {};
        Object.entries(payload.finalMatches || {}).forEach(([catId, catMatches]: [string, any]) => {
            migratedFinalMatches[catId] = (catMatches || []).map((m: any) => ({
                ...m,
                isReady: m.isReady ?? false,
                isForfeit: m.isForfeit ?? null,
                court: m.court ?? undefined,
            }));
        });

        // Migration de la config
        const migratedConfig = {
            ...payload,
            enableCourtView: payload.enableCourtView ?? false,
            tvConfig: {
                ...(payload.tvConfig || {}),
                showLiveScores: payload.tvConfig?.showLiveScores ?? false,
                showNextMatches: payload.tvConfig?.showNextMatches ?? true,
                showResults: payload.tvConfig?.showResults ?? true,
                showStandings: payload.tvConfig?.showStandings ?? true,
                showSponsors: payload.tvConfig?.showSponsors ?? true,
            },
            playlist: payload.playlist || [],
        };

        return {
            ...migratedConfig,
            categories: migratedCategories,
            matches: migratedMatches,
            standings: migratedStandings,
            finalMatches: migratedFinalMatches,
        };
    }
    case 'CLEAR_DATA':
      return {
        ...state,
        teams: [],
        matches: [],
        pools: [],
        finalMatches: {},
        standings: {},
        currentSession: 1,
        isPoolStageFinished: false,
        isFinalPhase: false,
        isTournamentStarted: false,
        // Keeps categories, sponsors, config and sound config
      };
    case 'RESET_TOURNAMENT':
      const newId = generateId();
      return {
        tournamentName: 'Nouveau Tournoi',
        numberOfCourts: 6,
        timerDuration: 600,
        breakDuration: 300,
        matchDisplayDuration: 15,
        sponsorDisplayDuration: 10,
        categories: [
          { 
            id: newId, 
            name: 'Général', 
            color: '#3498db', 
            isRefereeMandatory: false, 
            isScorerMandatory: false,
            isDetailedRegistration: true,
            reservedCourtIds: [], 
            tournamentType: 'traditional',
            swissMatchCount: 4,
            isDoubleRoundRobin: false,
            finalPhaseConfig: { teamsPerPool: 2, totalTeams: 4 } 
          }
        ],
        teams: [],
        matches: [],
        pools: [],
        finalMatches: {},
        sponsors: [],
        standings: {},
        currentSession: 1,
        soundConfig: {},
        tvConfig: {
          showNextMatches: true,
          showResults: true,
          showStandings: true,
          showSponsors: true,
          showChronoOnTv: true,
          showLiveScores: false,
        },
        playlist: [],
        isPoolStageFinished: false,
        isFinalPhase: false,
        isTournamentStarted: false,
        enableCourtView: false,
      };
    case 'UPDATE_PLAYLIST':
      return {
        ...state,
        playlist: action.payload
      };
    case 'START_TOURNAMENT':
      return {
        ...state,
        isTournamentStarted: true
      };
    default:
      return state;
  }
};
