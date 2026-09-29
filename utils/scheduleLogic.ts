
import { Team, Match, Category, FinalMatch } from '../types';

export const generateSchedule = (
    matchesToSchedule: Match[], 
    allTeams: Team[], 
    numberOfCourts: number, 
    categories: Category[],
): Match[] => {
    const finishedMatchData = new Map<string, { score1: number | null; score2: number | null; refereeId: string | null; scorerId: string | null }>();
    matchesToSchedule.forEach(m => {
        if (m.status === 'finished') {
            finishedMatchData.set(m.id, { score1: m.score1, score2: m.score2, refereeId: m.refereeId, scorerId: m.scorerId });
        }
    });

    let unscheduledMatches: Match[] = matchesToSchedule.map(m => ({ 
        ...m, 
        status: 'pending', 
        court: null, 
        sessionNumber: undefined, 
        refereeId: null,
        scorerId: null,
    }));

    if (unscheduledMatches.length === 0) return [];

    const teamToCategoryMap = new Map<string, Category>();
    allTeams.forEach(t => {
        const category = categories.find(c => c.id === t.categoryId);
        if (category) teamToCategoryMap.set(t.id, category);
    });

    const totalMatches = matchesToSchedule.length;
    const estimatedSessions = Math.ceil(totalMatches / numberOfCourts) * 1.15;

    const totalMatchesToPlay = new Map<string, number>();
    const matchesPlayed = new Map<string, number>();
    const lastSessionPlayed = new Map<string, number>();

    allTeams.forEach(t => {
        matchesPlayed.set(t.id, 0);
        lastSessionPlayed.set(t.id, -100); 
    });

    matchesToSchedule.forEach(m => {
        totalMatchesToPlay.set(m.team1Id, (totalMatchesToPlay.get(m.team1Id) || 0) + 1);
        totalMatchesToPlay.set(m.team2Id, (totalMatchesToPlay.get(m.team2Id) || 0) + 1);

        if (!matchesPlayed.has(m.team1Id)) {
            matchesPlayed.set(m.team1Id, 0);
            lastSessionPlayed.set(m.team1Id, -100);
        }
        if (!matchesPlayed.has(m.team2Id)) {
            matchesPlayed.set(m.team2Id, 0);
            lastSessionPlayed.set(m.team2Id, -100);
        }
    });

    const idealIntervals = new Map<string, number>();
    totalMatchesToPlay.forEach((matches, teamId) => {
        if (matches > 0) {
            idealIntervals.set(teamId, estimatedSessions / matches);
        } else {
            idealIntervals.set(teamId, Infinity);
        }
    });

    const scheduledMatches: Match[] = [];
    let sessionNumber = 1;

    while (unscheduledMatches.length > 0) {
        let matchesScheduledThisSessionCount = 0;
        const teamsInSession = new Set<string>();

        const activeCategories = new Set<string>();
        unscheduledMatches.forEach(m => {
            const cat = teamToCategoryMap.get(m.team1Id);
            if (cat) activeCategories.add(cat.id);
        });

        const courtReservations = new Map<number, Set<string>>(); 
        categories.forEach(cat => {
            if (activeCategories.has(cat.id)) {
                cat.reservedCourtIds.forEach(courtId => {
                    if (!courtReservations.has(courtId)) courtReservations.set(courtId, new Set());
                    courtReservations.get(courtId)!.add(cat.id);
                });
            }
        });

        for (let courtId = 1; courtId <= numberOfCourts; courtId++) {
            const reservingCategoryIds = courtReservations.get(courtId);
            
            const eligibleMatches = unscheduledMatches.filter(m => {
                if (teamsInSession.has(m.team1Id) || teamsInSession.has(m.team2Id)) return false;
                const catId = teamToCategoryMap.get(m.team1Id)?.id;
                if (!catId) return false;

                if (reservingCategoryIds && reservingCategoryIds.size > 0) {
                    if (!reservingCategoryIds.has(catId)) return false;
                } else {
                    const matchCategory = categories.find(c => c.id === catId);
                    if (matchCategory && matchCategory.reservedCourtIds.length > 0 && activeCategories.has(catId)) {
                        return false;
                    }
                }
                return true;
            });

            if (eligibleMatches.length > 0) {
                let bestMatch: Match | null = null;
                let bestScore = -Infinity;

                for (const match of eligibleMatches) {
                    const t1 = match.team1Id;
                    const t2 = match.team2Id;

                    const lastPlayed1 = lastSessionPlayed.get(t1) || -100;
                    const lastPlayed2 = lastSessionPlayed.get(t2) || -100;
                    const interval1 = idealIntervals.get(t1) || Infinity;
                    const interval2 = idealIntervals.get(t2) || Infinity;

                    const retard1 = (lastPlayed1 < 0) ? 1 : ((sessionNumber - lastPlayed1) / interval1);
                    const retard2 = (lastPlayed2 < 0) ? 1 : ((sessionNumber - lastPlayed2) / interval2);

                    const quotaExpected1 = Math.round(((totalMatchesToPlay.get(t1) || 0) * sessionNumber) / estimatedSessions);
                    const quotaExpected2 = Math.round(((totalMatchesToPlay.get(t2) || 0) * sessionNumber) / estimatedSessions);

                    const ecartQuota1 = (matchesPlayed.get(t1) || 0) - quotaExpected1;
                    const ecartQuota2 = (matchesPlayed.get(t2) || 0) - quotaExpected2;

                    const reposInsuffisant = (lastPlayed1 === sessionNumber - 1) || (lastPlayed2 === sessionNumber - 1);

                    const score = (retard1 + retard2) * 100 
                                - (ecartQuota1 + ecartQuota2) * 80 
                                - (reposInsuffisant ? 200 : 0);

                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = match;
                    }
                }

                if (bestMatch) {
                    scheduledMatches.push({ ...bestMatch, court: courtId, sessionNumber });
                    teamsInSession.add(bestMatch.team1Id);
                    teamsInSession.add(bestMatch.team2Id);
                    
                    matchesPlayed.set(bestMatch.team1Id, (matchesPlayed.get(bestMatch.team1Id) || 0) + 1);
                    matchesPlayed.set(bestMatch.team2Id, (matchesPlayed.get(bestMatch.team2Id) || 0) + 1);
                    
                    lastSessionPlayed.set(bestMatch.team1Id, sessionNumber);
                    lastSessionPlayed.set(bestMatch.team2Id, sessionNumber);

                    unscheduledMatches = unscheduledMatches.filter(m => m.id !== bestMatch!.id);
                    matchesScheduledThisSessionCount++;
                }
            }
        }

        if (matchesScheduledThisSessionCount === 0) {
            if (teamsInSession.size === 0) {
                unscheduledMatches.forEach(m => scheduledMatches.push({ ...m, court: null, sessionNumber: undefined }));
                unscheduledMatches = [];
            }
        }
        sessionNumber++;
    }

    const totalSessions = sessionNumber - 1;
    const allPlayers = allTeams.flatMap(t => t.players);
    const allReferees = allPlayers.filter(p => p.roles.includes('Arbitre'));
    const allScorers = allPlayers.filter(p => p.roles.includes('Marqueur'));
    
    const playerConstraints = new Map<string, { sessionsPlaying: Set<number>, maxAssignments: number, currentAssignments: number }>();
    allPlayers.forEach(player => {
        const playerTeam = allTeams.find(t => t.players.some(p => p.id === player.id));
        const sessionsPlaying = new Set(scheduledMatches.filter(m => m.team1Id === playerTeam?.id || m.team2Id === playerTeam?.id).map(m => m.sessionNumber!));
        const availableSessions = totalSessions - sessionsPlaying.size;
        const maxAssignments = Math.floor(availableSessions * 0.3);
        playerConstraints.set(player.id, { sessionsPlaying, maxAssignments, currentAssignments: 0 });
    });

    const sessionAssignments = new Map<number, Set<string>>(); 
    for (let s = 1; s <= totalSessions; s++) {
        const busy = new Set<string>();
        scheduledMatches.filter(m => m.sessionNumber === s).forEach(m => {
            allTeams.find(t => t.id === m.team1Id)?.players.forEach(p => busy.add(p.id));
            allTeams.find(t => t.id === m.team2Id)?.players.forEach(p => busy.add(p.id));
        });
        sessionAssignments.set(s, busy);
    }

    const matchesToSort = [...scheduledMatches].sort((a,b) => (a.sessionNumber || 0) - (b.sessionNumber || 0) || (a.court || 0) - (b.court || 0));

    matchesToSort.forEach(match => {
        if (!match.sessionNumber) return;
        const s = match.sessionNumber;
        const busyInSession = sessionAssignments.get(s)!;
        const busyInPrevSession = sessionAssignments.get(s - 1);

        const validReferees = allReferees.filter(ref => {
            if (busyInSession.has(ref.id)) return false;
            if (busyInPrevSession && busyInPrevSession.has(ref.id)) return false;
            const constr = playerConstraints.get(ref.id);
            if (!constr || constr.currentAssignments >= constr.maxAssignments) return false;
            const playerTeam = allTeams.find(t => t.players.some(p => p.id === ref.id));
            return playerTeam?.poolId !== match.poolId;
        }).sort((a, b) => {
            const curA = playerConstraints.get(a.id)?.currentAssignments || 0;
            const curB = playerConstraints.get(b.id)?.currentAssignments || 0;
            return curA - curB;
        });

        if (validReferees.length > 0) {
            const referee = validReferees[0];
            match.refereeId = referee.id;
            playerConstraints.get(referee.id)!.currentAssignments++;
            busyInSession.add(referee.id);
        } else {
            match.refereeId = "Staff";
        }

        const validScorers = allScorers.filter(scorer => {
            if (busyInSession.has(scorer.id)) return false;
            if (busyInPrevSession && busyInPrevSession.has(scorer.id)) return false;
            const constr = playerConstraints.get(scorer.id);
            if (!constr || constr.currentAssignments >= constr.maxAssignments) return false;
            return true;
        }).sort((a, b) => {
            const curA = playerConstraints.get(a.id)?.currentAssignments || 0;
            const curB = playerConstraints.get(b.id)?.currentAssignments || 0;
            return curA - curB;
        });

        if (validScorers.length > 0) {
            const scorer = validScorers[0];
            match.scorerId = scorer.id;
            playerConstraints.get(scorer.id)!.currentAssignments++;
            busyInSession.add(scorer.id);
        } else {
            match.scorerId = "Staff";
        }
    });

    matchesToSort.forEach(m => {
        const original = scheduledMatches.find(sm => sm.id === m.id);
        if (original) {
            original.refereeId = m.refereeId;
            original.scorerId = m.scorerId;
        }
    });

    scheduledMatches.forEach(m => {
        if (finishedMatchData.has(m.id)) {
            m.status = 'finished';
            const originalData = finishedMatchData.get(m.id)!;
            m.score1 = originalData.score1;
            m.score2 = originalData.score2;
            m.refereeId = originalData.refereeId;
            m.scorerId = originalData.scorerId;
        }
    });

    return scheduledMatches;
};

export const scheduleFinalMatches = (
    finalMatchesByCategory: { [categoryId: string]: FinalMatch[] },
    numberOfCourts: number,
    categories: Category[]
): { [categoryId: string]: FinalMatch[] } => {
    const roundOrder: FinalMatch['round'][] = ['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'thirdPlace', 'final'];
    
    let allFinalMatches: { categoryId: string; match: FinalMatch }[] = [];
    Object.entries(finalMatchesByCategory).forEach(([categoryId, matches]) => {
        matches.forEach(match => {
            allFinalMatches.push({ categoryId, match: { ...match, sessionNumber: undefined, court: undefined, status: 'pending' } });
        });
    });

    if (allFinalMatches.length === 0) return {};

    let currentSession = 1;
    
    for (const round of roundOrder) {
        let matchesInRound = allFinalMatches.filter(m => m.match.round === round);
        if (matchesInRound.length === 0) continue;

        while (matchesInRound.length > 0) {
            const courtsOccupied = new Set<number>();
            const categoriesScheduledThisSession = new Set<string>();
            
            categories.forEach(cat => {
                const catMatches = matchesInRound.filter(m => m.categoryId === cat.id);
                if (catMatches.length > 0) {
                    const availableReservedCourts = cat.reservedCourtIds.filter(id => id <= numberOfCourts && !courtsOccupied.has(id));
                    for (const courtId of availableReservedCourts) {
                        const matchToSchedule = matchesInRound.find(m => m.categoryId === cat.id);
                        if (matchToSchedule) {
                            matchToSchedule.match.sessionNumber = currentSession;
                            matchToSchedule.match.court = courtId;
                            courtsOccupied.add(courtId);
                            categoriesScheduledThisSession.add(cat.id);
                            matchesInRound = matchesInRound.filter(m => m.match.id !== matchToSchedule.match.id);
                        }
                    }
                }
            });

            for (let courtId = 1; courtId <= numberOfCourts; courtId++) {
                if (!courtsOccupied.has(courtId)) {
                    if (matchesInRound.length > 0) {
                        const matchToSchedule = matchesInRound[0];
                        matchToSchedule.match.sessionNumber = currentSession;
                        matchToSchedule.match.court = courtId;
                        courtsOccupied.add(courtId);
                        matchesInRound = matchesInRound.filter(m => m.match.id !== matchToSchedule.match.id);
                    }
                }
            }

            if (courtsOccupied.size === 0) break; 
            currentSession++;
        }
    }

    const result: { [categoryId: string]: FinalMatch[] } = {};
    allFinalMatches.forEach(({ categoryId, match }) => {
        if (!result[categoryId]) result[categoryId] = [];
        result[categoryId].push(match);
    });

    return result;
};
