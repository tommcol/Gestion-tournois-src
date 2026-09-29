
import { TournamentState, Category, Team, Player } from '../types';
import { generateId } from '../utils/id';

// --- DATA SOURCES FOR REALISTIC GENERATION ---

const femaleFirstNames = ["Léa", "Manon", "Chloé", "Emma", "Camille", "Marie", "Lucie", "Juliette", "Sarah", "Inès"];
const maleFirstNames = ["Lucas", "Hugo", "Louis", "Gabriel", "Arthur", "Jules", "Raphaël", "Léo", "Adam", "Nathan"];
const lastNames = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau"];

const teamNames = ["Les Zéphyrs", "Team Vortex", "Smash Fusion", "Les Comètes", "Alchimie Sportive", "Double Impact", "Équipe Synergie", "Les Phénix", "Les Titans", "Spartiates", "Aigles Noirs", "Tsunami", "Le Mur d'Acier", "Dragons de Fer", "Rhinos", "Les Gladiateurs", "Les Faucons", "Impact Stellaire", "Les Scorpions", "L'Étoile Filante", "Les Panthères", "Les Requins", "Les Condors", "La Foudre", "Guerriers de l'Ombre", "Les Centurions", "Orbite Chaotique", "Les Cobras", "Tempête de Feu", "Les Vikings"];

const NUM_COURTS = 6;

// --- UTILITY FUNCTIONS FOR DATA GENERATION ---

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateRealisticPlayers = (count: number, gender: 'male' | 'female' | 'mix'): Player[] => {
    const players: Player[] = [];
    for (let i = 0; i < count; i++) {
        let playerGender: 'Homme' | 'Femme';
        if (gender === 'mix') {
            // Simple logic for mixed teams: try to balance genders
            playerGender = i < Math.floor(count / 2) ? 'Femme' : 'Homme';
        } else {
            playerGender = gender === 'female' ? 'Femme' : 'Homme';
        }
        
        const firstName = playerGender === 'Femme' ? getRandomItem(femaleFirstNames) : getRandomItem(maleFirstNames);
        const lastName = getRandomItem(lastNames);
        
        const roles: Player['roles'] = ['Joueur'];
        if (Math.random() < 0.02) roles.push('Arbitre');
        if (Math.random() < 0.02) roles.push('Marqueur');

        const player: Player = {
            id: generateId(),
            firstName,
            lastName,
            gender: playerGender,
            roles,
        };
        players.push(player);
    }
    // Shuffle to randomize gender order in mixed teams
    return players.sort(() => Math.random() - 0.5);
};


const generateRealisticTeams = (count: number, categoryId: string, gender: 'male' | 'female' | 'mix', namePool: string[]): Team[] => {
    const teams: Team[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < count; i++) {
        const playerCount = Math.random() > 0.5 ? 3 : 4; // Teams of 3 or 4
        const players = generateRealisticPlayers(playerCount, gender);
        
        const genders = new Set(players.map(p => p.gender));
        const isMixed = genders.has('Homme') && genders.has('Femme');

        let teamName = getRandomItem(namePool);
        while(usedNames.has(teamName)) {
            teamName = getRandomItem(namePool);
        }
        usedNames.add(teamName);

        teams.push({
            id: generateId(),
            name: teamName,
            categoryId: categoryId,
            players: players,
            isMix: isMixed,
        });
    }
    return teams;
};

// --- CATEGORY & DATA SETUP ---

// 1. Categories
const debutantCategory: Category = { 
    id: generateId(), 
    name: 'Débutant Mixte', 
    color: '#27ae60', 
    isRefereeMandatory: false, 
    isScorerMandatory: false,
    isDetailedRegistration: true,
    reservedCourtIds: [1, 2], 
    finalPhaseConfig: { teamsPerPool: 2, totalTeams: 4 },
    tournamentType: 'traditional',
    swissMatchCount: 4,
    isDoubleRoundRobin: false
};
const intermediaireCategory: Category = { 
    id: generateId(), 
    name: 'Intermédiaire Mixte', 
    color: '#f39c12', 
    isRefereeMandatory: false, 
    isScorerMandatory: false,
    isDetailedRegistration: true,
    reservedCourtIds: [], 
    finalPhaseConfig: { teamsPerPool: 2, totalTeams: 8 },
    tournamentType: 'traditional',
    swissMatchCount: 4,
    isDoubleRoundRobin: false
};
const avanceCategory: Category = { 
    id: generateId(), 
    name: 'Avancé Mixte', 
    color: '#c0392b', 
    isRefereeMandatory: true, 
    isScorerMandatory: false,
    isDetailedRegistration: true,
    reservedCourtIds: [], 
    finalPhaseConfig: { teamsPerPool: 1, totalTeams: 8 },
    tournamentType: 'traditional',
    swissMatchCount: 4,
    isDoubleRoundRobin: false
};
const categories: Category[] = [debutantCategory, intermediaireCategory, avanceCategory];

const catDebutId = categories[0].id;
const catInterId = categories[1].id;
const catAvanId = categories[2].id;


// 2. Teams
const debutantTeams = generateRealisticTeams(16, catDebutId, 'mix', teamNames);
const intermediaireTeams = generateRealisticTeams(12, catInterId, 'mix', teamNames);
const avanceTeams = generateRealisticTeams(18, catAvanId, 'mix', teamNames);
const allTeams = [...debutantTeams, ...intermediaireTeams, ...avanceTeams];

// POOLS AND MATCHES ARE NOT GENERATED ON INITIAL LOAD.
// The user must generate them from the "PoolsDisplay" component.

// --- FINAL STATE EXPORT ---

export const initialData: TournamentState = {
  tournamentName: 'Grand Tournoi Mixte 2024',
  numberOfCourts: NUM_COURTS,
  timerDuration: 10 * 60, // 10 minutes in seconds
  breakDuration: 5 * 60, // 5 minutes in seconds
  matchDisplayDuration: 15, // in seconds
  sponsorDisplayDuration: 10, // in seconds
  categories,
  teams: allTeams,
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
