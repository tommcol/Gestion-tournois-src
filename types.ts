
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'Homme' | 'Femme';
  roles: ('Joueur' | 'Arbitre' | 'Marqueur')[];
}

export interface Team {
  id: string;
  name: string;
  categoryId: string;
  players: Player[];
  poolId?: string;
  isMix: boolean;
  womenCount?: number;
}

export interface Category {
  id:string;
  name: string;
  color: string;
  isRefereeMandatory: boolean;
  isScorerMandatory: boolean;
  isDetailedRegistration: boolean;
  reservedCourtIds: number[];
  finalPhaseConfig: FinalPhaseConfig;
  tournamentType: 'traditional' | 'swiss';
  swissMatchCount: number;
  isDoubleRoundRobin: boolean;
  activeTvRound?: string;
}

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  score1: number | null;
  score2: number | null;
  court: number | null;
  status: 'pending' | 'finished';
  poolId: string;
  round: string;
  sessionNumber?: number;
  refereeId: string | null;
  scorerId: string | null;
  isForfeit?: 'team1' | 'team2' | null;
}

export interface Pool {
  id: string;
  teams: string[];
}

export interface Standing {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number; // Points de tournoi (ex: 2 pour victoire, 1 pour nul)
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  directConfrontationWins?: number;
}

export interface FinalPhaseConfig {
  teamsPerPool: number;
  totalTeams: 8 | 16 | 32 | 4 | 0;
  timerDuration?: number;
  breakDuration?: number;
  numberOfCourts?: number;
}

export interface FinalMatch {
  id: string;
  categoryId: string;
  round: 'roundOf32' | 'roundOf16' | 'quarterFinal' | 'semiFinal' | 'final' | 'thirdPlace';
  matchNumber: number; // For ordering within a round
  team1Id: string | null;
  team2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId?: string | null;
  status: 'pending' | 'finished';
  isForfeit?: 'team1' | 'team2' | null;
  sessionNumber?: number;
  court?: number;
  refereeId?: string | null;
  scorerId?: string | null;
  sourceMatch1?: string | null; // ID of the match that provides team1
  sourceMatch2?: string | null; // ID of the match that provides team2
  isReady?: boolean; // NOUVEAU : match prêt à jouer sur tablette
}

export interface Sponsor {
  id: string;
  name: string;
  logo: string; // Base64 encoded image
}

export interface CustomSoundConfig {
    start?: string; // Base64 audio for start (whistle replacement)
    end?: string;   // Base64 audio for end (horn replacement)
    oneMinute?: string; // Base64 audio for 1 minute remaining
}

export interface TVConfig {
  showNextMatches: boolean;
  showResults: boolean;
  showStandings: boolean;
  showSponsors: boolean;
  showChronoOnTv: boolean;
  showLiveScores: boolean;
}

export interface Track {
  name: string;
  url: string;
}

export interface TournamentState {
  tournamentName: string;
  numberOfCourts: number;
  timerDuration: number; // in seconds
  breakDuration: number; // in seconds
  matchDisplayDuration: number; // in seconds
  sponsorDisplayDuration: number; // in seconds
  categories: Category[];
  teams: Team[];
  matches: Match[];
  pools: Pool[];
  finalMatches: { [categoryId: string]: FinalMatch[] };
  sponsors: Sponsor[];
  standings: { [poolId: string]: Standing[] };
  currentSession: number;
  soundConfig: CustomSoundConfig;
  tvConfig: TVConfig;
  playlist: Track[];
  isPoolStageFinished: boolean;
  isFinalPhase: boolean;
  isTournamentStarted: boolean;
  enableCourtView: boolean;
}

export type TournamentAction =
  | { type: 'SET_STATE'; payload: TournamentState }
  | { type: 'UPDATE_CONFIG'; payload: { 
      tournamentName?: string; 
      numberOfCourts?: number; 
      timerDuration?: number; 
      breakDuration?: number; 
      matchDisplayDuration?: number; 
      sponsorDisplayDuration?: number;
      enableCourtView?: boolean;
      tvConfig?: Partial<TVConfig>;
    } }
  | { type: 'UPDATE_SOUND_CONFIG'; payload: CustomSoundConfig }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY', payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_TEAM'; payload: Team }
  | { type: 'UPDATE_TEAM'; payload: Team }
  | { type: 'DELETE_TEAM'; payload: string }
  | { type: 'GENERATE_CATEGORY_POOLS_AND_MATCHES'; payload: { 
      categoryId: string, 
      teamsPerPool: number,
      tournamentType: 'traditional' | 'swiss',
      swissMatchCount: number,
      isDoubleRoundRobin: boolean
    } }
  | { type: 'RESET_CATEGORY_POOLS'; payload: { categoryId: string } }
  | { type: 'UPDATE_MATCH_SCORE'; payload: { 
      matchId: string; 
      score1: number; 
      score2: number; 
      poolId?: string;
      isForfeit?: 'team1' | 'team2' | null 
    } }
  | { type: 'UPDATE_FINAL_CONFIG'; payload: { categoryId: string; config: FinalPhaseConfig } }
  | { type: 'GENERATE_FINAL_PHASE'; payload: { categoryId: string; qualifiedTeams: Team[]; totalTeams: number; mode: 'auto' | 'manual' } }
  | { type: 'UPDATE_MANUAL_PAIRINGS'; payload: { categoryId: string; matches: FinalMatch[] } }
  | { type: 'UPDATE_FINAL_MATCH_SCORE'; payload: { 
      categoryId: string; 
      matchId: string; 
      score1: number; 
      score2: number;
      isForfeit?: 'team1' | 'team2' | null 
    } }
  | { type: 'UPDATE_FINAL_MATCH_COURT'; payload: { categoryId: string; matchId: string; court: number | undefined } }
  | { type: 'SET_FINAL_MATCH_READY'; payload: { categoryId: string; matchId: string; isReady: boolean } }
  | { type: 'DELETE_FINAL_PHASE'; payload: { categoryId: string } }
  | { type: 'ADD_SPONSOR'; payload: Sponsor }
  | { type: 'UPDATE_SPONSOR'; payload: Sponsor }
  | { type: 'DELETE_SPONSOR'; payload: string }
  | { type: 'UPDATE_PLAYLIST'; payload: Track[] }
  | { type: 'NEXT_SESSION' }
  | { type: 'PREVIOUS_SESSION' }
  | { type: 'RESET_SESSIONS' }
  | { type: 'FINISH_POOL_STAGE' }
  | { type: 'START_FINAL_PHASE' }
  | { type: 'START_TOURNAMENT' }
  | { type: 'SET_TV_ROUND'; payload: { categoryId: string; round: string } }
  | { type: 'CLEAR_DATA' }
  | { type: 'RESET_TOURNAMENT' };