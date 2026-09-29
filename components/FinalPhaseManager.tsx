import React, { useState, useMemo, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import { getAllQualifiedTeams } from '../utils/standingsLogic';
import { Team, FinalMatch, Standing } from '../types';
import ManualPairingsEditor from './ManualPairingsEditor';
import ScoreDialog from './ScoreDialog';

const roundNames: Record<FinalMatch['round'], string> = {
    roundOf32: "16èmes de finale",
    roundOf16: "8èmes de finale",
    quarterFinal: "Quarts de finale",
    semiFinal: "Demi-finales",
    thirdPlace: "Petite Finale",
    final: "Finale",
};

const FinalPhaseManager: React.FC = () => {
    const { state, dispatch, socket } = useTournament();
    const { categories, teams, pools, matches, numberOfCourts, timerDuration, breakDuration, isFinalPhase, isPoolStageFinished, enableCourtView } = state;
    const [jourJView, setJourJView] = useState(false);
    const [quickScores, setQuickScores] = useState<Record<string, { s1: number, s2: number }>>({});
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
    const [generationMode, setGenerationMode] = useState<'auto' | 'manual' | 'blank'>('auto');
    const [isEditingManually, setIsEditingManually] = useState(false);
    const [editingMatch, setEditingMatch] = useState<FinalMatch | null>(null);
    const [isRankingVisible, setIsRankingVisible] = useState(false);
    const [selectedRound, setSelectedRound] = useState<FinalMatch['round'] | null>(null);
    const [readyCourts, setReadyCourts] = useState<number[]>([]);
    const [showConfig, setShowConfig] = useState(
        !selectedCategoryId || (state.finalMatches[selectedCategoryId] || []).length === 0
    );

    // Mettre à jour quand la catégorie change
    useEffect(() => {
        const hasFinalMatches = (state.finalMatches[selectedCategoryId] || []).length > 0;
        setShowConfig(!hasFinalMatches);
    }, [selectedCategoryId, state.finalMatches]);

    useEffect(() => {
        if (!socket) return;
        socket.on('court_ready_update', (data) => {
            setReadyCourts(data.readyCourts);
        });
        socket.on('courts_reset', () => setReadyCourts([]));
        return () => {
            socket.off('court_ready_update');
            socket.off('courts_reset');
        };
    }, [socket]);

    useEffect(() => {
        if (!selectedCategoryId && categories[0]) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories, selectedCategoryId]);

    useEffect(() => {
        const matchesByRound = (['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'thirdPlace', 'final'] as FinalMatch['round'][]).reduce((acc, round) => {
            const roundMatches = (state.finalMatches[selectedCategoryId] || []).filter(m => m.round === round).sort((a,b) => a.matchNumber - b.matchNumber);
            if (roundMatches.length > 0) acc[round] = roundMatches;
            return acc;
        }, {} as Record<FinalMatch['round'], FinalMatch[]>);
        
        const roundOrder = ['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'thirdPlace', 'final'] as FinalMatch['round'][];
        const activeRounds = roundOrder.filter(r => matchesByRound[r]);

        if (activeRounds.length > 0 && (!selectedRound || !activeRounds.includes(selectedRound))) {
            // Trouver le premier tour EN COURS :
            // a des équipes connues ET pas tous les scores saisis
            const currentTour = activeRounds.find(r => {
                const roundMatches = matchesByRound[r] || [];
                const hasKnownTeams = roundMatches.some(m => m.team1Id && m.team2Id);
                const notAllFinished = roundMatches.some(m => m.status !== 'finished');
                return hasKnownTeams && notAllFinished;
            });
            // Sinon : dernier tour (la finale ou le dernier généré)
            setSelectedRound(currentTour || activeRounds[activeRounds.length - 1]);
        }
    }, [state.finalMatches, selectedCategoryId]);

    const selectedCategory = useMemo(() => categories.find(c => c.id === selectedCategoryId), [categories, selectedCategoryId]);
    const finalPhaseConfig = selectedCategory?.finalPhaseConfig || { teamsPerPool: 2, totalTeams: 8 };
    
    // Effective settings: use global settings as requested by user to keep it simple
    const effectiveTimerDuration = timerDuration;
    const effectiveBreakDuration = breakDuration;
    const effectiveNumberOfCourts = numberOfCourts;

    const finalMatches = state.finalMatches[selectedCategoryId] || [];

    const handleStartFinalPhase = () => {
        if (window.confirm("Voulez-vous lancer l'affichage TV des phases finales ? Les écrans TV basculeront sur les nouveaux matchs.")) {
            dispatch({ type: 'START_FINAL_PHASE' });
        }
    };

    const getTeam = (teamId: string | null) => teams.find(t => t.id === teamId) || null;
    
    const categoryPools = useMemo(() => pools.filter(p => p.id.startsWith(selectedCategoryId)), [pools, selectedCategoryId]);

    const isSwiss = selectedCategory?.tournamentType === 'swiss';

    const { qualifiedTeams, qualificationSummary, warning } = useMemo(() => {
        if (categoryPools.length === 0 || !selectedCategory) {
            return { qualifiedTeams: [], qualificationSummary: null, warning: null };
        }
        
        // For Swiss, we take the top N teams directly from the single pool
        const effectiveTeamsPerPool = isSwiss ? finalPhaseConfig.totalTeams : finalPhaseConfig.teamsPerPool;

        const { qualified, warning: logicWarning } = getAllQualifiedTeams(
            categoryPools,
            state.standings,
            teams.filter(t => t.categoryId === selectedCategoryId),
            effectiveTeamsPerPool,
            finalPhaseConfig.totalTeams
        );

        const directCount = isSwiss 
            ? Math.min(qualified.length, finalPhaseConfig.totalTeams)
            : Math.min(categoryPools.length * finalPhaseConfig.teamsPerPool, finalPhaseConfig.totalTeams);
            
        const wildcardCount = isSwiss ? 0 : finalPhaseConfig.totalTeams - directCount;

        const summary = {
            direct: directCount,
            wildcard: Math.max(0, wildcardCount),
            total: finalPhaseConfig.totalTeams,
            teamsPerPool: effectiveTeamsPerPool,
            actualQualified: qualified.length,
        };

        return { qualifiedTeams: qualified, qualificationSummary: summary, warning: logicWarning };
    }, [categoryPools, matches, teams, finalPhaseConfig, selectedCategoryId, selectedCategory, isSwiss]);

    const finalPhaseDurationInfo = useMemo(() => {
        if (!finalPhaseConfig.totalTeams || effectiveNumberOfCourts <= 0) return { sessions: 0, duration: 0 };
        
        let totalSessions = 0;
        let currentRoundMatches = finalPhaseConfig.totalTeams / 2;
        
        // Rounds until Semis
        while (currentRoundMatches >= 2) {
            totalSessions += Math.ceil(currentRoundMatches / effectiveNumberOfCourts);
            currentRoundMatches /= 2;
        }
        
        // Final round (Final + 3rd place)
        totalSessions += Math.ceil(2 / effectiveNumberOfCourts);
        
        const duration = totalSessions > 0 
            ? (totalSessions * effectiveTimerDuration) + ((totalSessions - 1) * effectiveBreakDuration)
            : 0;
            
        return { sessions: totalSessions, duration };
    }, [finalPhaseConfig.totalTeams, effectiveNumberOfCourts, effectiveTimerDuration, effectiveBreakDuration]);

    const formatDuration = (totalSeconds: number) => {
        if (totalSeconds < 0) return "0m";
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        let result = '';
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0 || hours === 0) result += `${minutes}m`;
        return result.trim() || '0m';
    };

    const rankedQualifiedTeams = useMemo(() => {
        if (!qualifiedTeams || qualifiedTeams.length === 0) {
            return [];
        }

        const allStandings: Standing[] = [];
        categoryPools.forEach(pool => {
            const poolStandings = state.standings[pool.id] || [];
            allStandings.push(...poolStandings);
        });

        // Create a map of team ranks within their pools
        const teamRankMap = new Map<string, number>();
        categoryPools.forEach(pool => {
            const standings = state.standings[pool.id] || [];
            standings.forEach((s, index) => {
                teamRankMap.set(s.teamId, index);
            });
        });

        const qualifiedTeamIds = new Set(qualifiedTeams.map(t => t.id));
        const qualifiedStandings = allStandings.filter(s => qualifiedTeamIds.has(s.teamId));

        qualifiedStandings.sort((a, b) => {
            const rankA = teamRankMap.get(a.teamId) ?? 99;
            const rankB = teamRankMap.get(b.teamId) ?? 99;

            if (rankA !== rankB) return rankA - rankB; // Primary sort: Rank in pool
            
            if (a.points !== b.points) return b.points - a.points;
            if (a.pointsDifference !== b.pointsDifference) return b.pointsDifference - a.pointsDifference;
            if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
            if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst;
            return 0;
        });
        
        return qualifiedStandings.map(standing => {
            const team = teams.find(t => t.id === standing.teamId);
            return { ...team, ...standing };
        });

    }, [qualifiedTeams, categoryPools, state.standings, teams]);

    const getOrdinal = (n: number) => {
        if (n === 1) return '1er';
        return `${n}ème`;
    }

    const handleGenerate = () => {
        if (qualifiedTeams.length < 2) {
            alert(`Pas assez d'équipes qualifiées pour générer un tableau.`);
            return;
        }
        if (qualifiedTeams.length < finalPhaseConfig.totalTeams) {
            if (!window.confirm(`Attention : Seules ${qualifiedTeams.length} équipes sur ${finalPhaseConfig.totalTeams} requises sont qualifiées. Voulez-vous continuer avec un tableau incomplet ?`)) {
                return;
            }
        }

        // NOUVEAU : vérifier si des scores existent déjà
        const existingMatches = state.finalMatches[selectedCategoryId] || [];
        const hasScores = existingMatches.some(m => m.score1 !== null || m.score2 !== null);
        if (hasScores) {
            if (!window.confirm('Attention : des scores ont déjà été saisis pour cette catégorie. Régénérer va effacer tous ces résultats. Êtes-vous sûr ?')) {
                return;
            }
        }

        if (generationMode === 'auto') {
            dispatch({ type: 'GENERATE_FINAL_PHASE', payload: { categoryId: selectedCategoryId, qualifiedTeams, totalTeams: finalPhaseConfig.totalTeams, mode: 'auto' }});
            setIsEditingManually(false);
        } else if (generationMode === 'manual') {
            dispatch({ type: 'GENERATE_FINAL_PHASE', payload: { categoryId: selectedCategoryId, qualifiedTeams: [], totalTeams: finalPhaseConfig.totalTeams, mode: 'manual' }});
            setIsEditingManually(true);
        }
    };
    
    const handleDelete = () => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer la phase finale de cette catégorie ?')) {
            dispatch({ type: 'DELETE_FINAL_PHASE', payload: { categoryId: selectedCategoryId } });
            setIsEditingManually(false);
        }
    };

    const handleSetTvRound = (round: string) => {
        dispatch({ type: 'SET_TV_ROUND', payload: { categoryId: selectedCategoryId, round } });
    };

    const renderBracket = () => {
        const rounds: (FinalMatch['round'])[] = ['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'thirdPlace', 'final'];
        const matchesByRound = rounds.reduce((acc, round) => {
            const roundMatches = finalMatches.filter(m => m.round === round).sort((a,b) => a.matchNumber - b.matchNumber);
            if (roundMatches.length > 0) acc[round] = roundMatches;
            return acc;
        }, {} as Record<FinalMatch['round'], FinalMatch[]>);

        const roundOrder = ['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'thirdPlace', 'final'] as FinalMatch['round'][];
        const activeRounds = roundOrder.filter(r => matchesByRound[r]);
        const currentIndex = selectedRound ? activeRounds.indexOf(selectedRound) : -1;
        const nextRound = currentIndex >= 0 && currentIndex < activeRounds.length - 1
            ? activeRounds[currentIndex + 1]
            : null;
        const prevRound = currentIndex > 0
            ? activeRounds[currentIndex - 1]
            : null;

        const getTeamDisplay = (team: Team | null): string | null => {
            if (!team || !team.poolId) return team?.name || null;
            const poolIndex = categoryPools.findIndex(p => p.id === team.poolId);
            const poolLetter = poolIndex !== -1 ? String.fromCharCode(65 + poolIndex) : '';
            return `${poolLetter ? `(${poolLetter}) ` : ''}${team.name}`;
        };

        return (
            <div className="space-y-6">
                {/* Régie TV */}
                <div className="bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 rounded-xl p-4 shadow-inner">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📺</span>
                            <h3 className="font-black uppercase text-purple-900 dark:text-purple-100 tracking-tighter">Régie TV : Choix du tour à diffuser</h3>
                        </div>
                        <div className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                            LIVE SUR TV
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {activeRounds.map(round => (
                            <button
                                key={round}
                                onClick={() => handleSetTvRound(round)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-black uppercase transition-all transform active:scale-95 border-b-4 ${
                                    selectedCategory?.activeTvRound === round
                                        ? 'bg-purple-600 border-purple-800 text-white shadow-lg -translate-y-1'
                                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-purple-50'
                                }`}
                            >
                                {roundNames[round]}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-2 font-bold italic">
                        * Cliquez sur un tour pour l'afficher en plein écran sur la TV.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Onglets de navigation entre les tours */}
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-600 pb-3 items-center">
                        {activeRounds.map(round => {
                            const roundMatchesList = matchesByRound[round] || [];
                            const allDone = roundMatchesList.every(m => m.status === 'finished');
                            const inProgress = roundMatchesList.some(m => m.score1 !== null) && !allDone;
                            return (
                                <button
                                    key={round}
                                    onClick={() => setSelectedRound(round)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all border-b-4 ${
                                        selectedRound === round
                                            ? 'bg-blue-600 border-blue-800 text-white shadow'
                                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-50'
                                    }`}
                                >
                                    {roundNames[round]}
                                    {allDone && <span className="ml-2 text-green-400">✓</span>}
                                    {inProgress && <span className="ml-2 text-yellow-400">●</span>}
                                </button>
                            );
                        })}
                        <div className="flex items-center gap-2 ml-auto">
                            {prevRound && (
                                <button
                                    onClick={() => setSelectedRound(prevRound)}
                                    className="px-3 py-1.5 text-sm font-bold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    ← Tour précédent
                                </button>
                            )}
                            {nextRound && (
                                <button
                                    onClick={() => {
                                        setSelectedRound(nextRound);
                                        // Synchroniser la Régie TV sur ce tour
                                        dispatch({
                                            type: 'SET_TV_ROUND',
                                            payload: { categoryId: selectedCategoryId, round: nextRound }
                                        });
                                    }}
                                    className="px-3 py-1.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    Tour suivant →
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Matchs du tour sélectionné */}
                    {selectedRound && matchesByRound[selectedRound] && (
                        <>
                            <div className={`grid gap-4 ${
                            matchesByRound[selectedRound].length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                            matchesByRound[selectedRound].length <= 4 ? 'grid-cols-2' :
                            'grid-cols-2 lg:grid-cols-4'
                        }`}>
                            {matchesByRound[selectedRound].map(match => {
                                const team1 = getTeam(match.team1Id);
                                const team2 = getTeam(match.team2Id);
                                const team1Display = getTeamDisplay(team1);
                                const team2Display = getTeamDisplay(team2);
                                const isFinished = match.status === 'finished';

                                return (
                                    <div key={match.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 p-4 flex flex-col gap-2 ${
                                        isFinished ? 'border-green-500/30' : 'border-gray-200 dark:border-gray-700'
                                    }`}>
                                        {/* Header : numéro match + terrain */}
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-black text-gray-400 uppercase">Match {match.matchNumber}</span>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-500 font-bold">T.</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={numberOfCourts}
                                                    value={match.court ?? ''}
                                                    onChange={(e) => dispatch({
                                                        type: 'UPDATE_FINAL_MATCH_COURT',
                                                        payload: {
                                                            categoryId: selectedCategoryId,
                                                            matchId: match.id,
                                                            court: e.target.value === '' ? undefined : Number(e.target.value)
                                                        }
                                                    })}
                                                    className="w-14 text-center border rounded p-1 text-sm font-bold bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                                    placeholder="-"
                                                />
                                            </div>
                                        </div>

                                        {/* Equipe 1 */}
                                        <div className={`flex justify-between items-center p-2 rounded-lg ${
                                            match.winnerId === team1?.id ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-black' :
                                            match.winnerId && match.winnerId !== team1?.id ? 'text-red-400' :
                                            'text-white font-bold'
                                        }`}>
                                            <span className="truncate">{team1Display || 'À déterminer'}</span>
                                            <span className="font-mono ml-2 font-black text-lg">{match.score1 ?? '-'}</span>
                                        </div>

                                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>

                                        {/* Equipe 2 */}
                                        <div className={`flex justify-between items-center p-2 rounded-lg ${
                                            match.winnerId === team2?.id ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-black' :
                                            match.winnerId && match.winnerId !== team2?.id ? 'text-red-400' :
                                            'text-white font-bold'
                                        }`}>
                                            <span className="truncate">{team2Display || 'À déterminer'}</span>
                                            <span className="font-mono ml-2 font-black text-lg">{match.score2 ?? '-'}</span>
                                        </div>

                                        {enableCourtView && match.court && match.team1Id && match.team2Id && match.status !== 'finished' && (
                                            <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold mt-1 ${
                                                readyCourts.includes(match.court)
                                                    ? 'bg-green-900/30 border border-green-700 text-green-400'
                                                    : 'bg-gray-700/30 border border-gray-600 text-gray-400'
                                            }`}>
                                                <span>{match.isReady 
                                                    ? (readyCourts.includes(match.court) ? '✅ Équipes prêtes — T.' + match.court : '✅ Tablette active — T.' + match.court)
                                                    : '○ Terrain ' + match.court + ' assigné'}</span>
                                                <button
                                                    onClick={() => dispatch({
                                                        type: 'SET_FINAL_MATCH_READY',
                                                        payload: {
                                                            categoryId: selectedCategoryId,
                                                            matchId: match.id,
                                                            isReady: !match.isReady
                                                        }
                                                    })}
                                                    className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                                                        match.isReady
                                                            ? 'bg-red-800 text-red-200 hover:bg-red-700'
                                                            : 'bg-green-700 text-white hover:bg-green-600'
                                                    }`}
                                                >
                                                    {match.isReady ? 'Arrêter' : 'Démarrer'}
                                                </button>
                                            </div>
                                        )}

                                        {match.team1Id && match.team2Id && !match.court && match.status !== 'finished' && (
                                            <p className="text-xs text-center text-gray-500 mt-1">Assignez un terrain pour démarrer</p>
                                        )}

                                        {/* Bouton score */}
                                        {team1 && team2 && (
                                            <button
                                                onClick={() => setEditingMatch(match)}
                                                className={`mt-1 w-full py-2 rounded-lg text-sm font-bold transition-all ${
                                                    isFinished
                                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-blue-50'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            >
                                                {isFinished ? 'Modifier le score' : 'Saisir le score'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        </>
                    )}
                </div>
        </div>
        )
    };
    
    const team1 = editingMatch ? getTeam(editingMatch.team1Id) : null;
    const team2 = editingMatch ? getTeam(editingMatch.team2Id) : null;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <div className="shrink-0 mb-4">
                <h1 className="text-3xl font-bold mb-4">Phase Finale</h1>

                {/* ONGLETS TOUJOURS VISIBLES EN HAUT */}
                <div role="tablist" className="flex items-center gap-2 flex-wrap border-b border-gray-200 dark:border-gray-700 pb-3 flex-shrink-0">
                    <button
                        onClick={() => setJourJView(!jourJView)}
                        className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors ${
                            jourJView
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                    >
                        🏆 Phase Finale Globale
                    </button>
                    {categories.map(category => (
                        <button
                            key={category.id}
                            role="tab"
                            aria-selected={!jourJView && selectedCategoryId === category.id}
                            onClick={() => { setSelectedCategoryId(category.id); setIsEditingManually(false); setJourJView(false);}}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                                !jourJView && selectedCategoryId === category.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <span style={{ backgroundColor: category.color }} className="w-3 h-3 rounded-full flex-shrink-0"></span>
                            <span>{category.name}</span>
                            {(state.finalMatches[category.id] || []).length > 0 && (
                                <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENU SCROLLABLE */}
            <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pr-2">
                {jourJView && (
                    <div className="space-y-2">

                        {/* Indicateurs terrains prêts - même que GlobalSchedule */}
                        {enableCourtView && (
                            <div className="flex items-center gap-2 flex-wrap p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-500 uppercase">Terrains :</span>
                                {Array.from({ length: numberOfCourts }, (_, i) => i + 1).map(court => {
                                    const isReady = readyCourts.includes(court);
                                    return (
                                        <button
                                            key={court}
                                            onClick={() => {
                                                if (isReady) {
                                                    socket?.emit('court_ready_cancel', { court });
                                                } else {
                                                    socket?.emit('court_ready', { court, matchId: null, manual: true });
                                                }
                                            }}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-black ${
                                                isReady
                                                    ? 'bg-green-50 border-green-200 text-green-600'
                                                    : 'bg-transparent border-gray-200 text-gray-400'
                                            }`}
                                        >
                                            <div className={`w-2.5 h-2.5 rounded-full ${isReady ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            T{court}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Matchs groupés par tour puis par catégorie */}
                        {(['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'thirdPlace', 'final'] as FinalMatch['round'][]).map(round => {
                            const roundNames: Record<string, string> = {
                                roundOf32: '16èmes de finale', roundOf16: '8èmes de finale',
                                quarterFinal: 'Quarts de finale', semiFinal: 'Demi-finales',
                                final: 'Finale', thirdPlace: '3ème place'
                            };

                            // Tous les matchs de ce tour dans toutes les catégories
                            const allRoundMatches = categories.flatMap(cat => {
                                const catMatches = (state.finalMatches[cat.id] || [])
                                    .filter(m => m.round === round)
                                    .sort((a, b) => a.matchNumber - b.matchNumber);
                                return catMatches.map(m => ({ ...m, category: cat }));
                            });

                            if (allRoundMatches.length === 0) return null;

                            return (
                                <div key={round}>
                                    {/* Header tour */}
                                    <div className="flex items-center gap-3 py-2 px-1">
                                        <h3 className="font-black text-base text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                                            {roundNames[round]}
                                        </h3>
                                        <div className="flex-1 h-px bg-purple-200 dark:bg-purple-800" />
                                    </div>

                                    {/* Matchs */}
                                    <div className="space-y-1">
                                        {allRoundMatches.map(match => {
                                            const team1 = teams.find(t => t.id === match.team1Id);
                                            const team2 = teams.find(t => t.id === match.team2Id);
                                            const t1Name = team1?.name || 'TBD';
                                            const t2Name = team2?.name || 'TBD';
                                            const isFinished = match.status === 'finished';
                                            const qs = quickScores[match.id] || { s1: 0, s2: 0 };
                                            const courtIsReady = readyCourts.includes(match.court || -1);

                                            return (
                                                <div key={match.id} className={`bg-white dark:bg-gray-800 rounded-lg border ${
                                                    isFinished ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-gray-300 dark:border-gray-600'
                                                } p-3`}>
                                                    <div className="flex items-center gap-3">

                                                        {/* Categorie + terrain */}
                                                        <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
                                                            <div className="flex items-center gap-1">
                                                                <div style={{ backgroundColor: match.category.color }} className="w-2 h-2 rounded-full" />
                                                                <span className="text-xs font-bold text-gray-500 truncate max-w-[50px]">{match.category.name}</span>
                                                            </div>
                                                            {/* Terrain assignable */}
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={numberOfCourts}
                                                                value={match.court || ''}
                                                                placeholder="T."
                                                                disabled={isFinished}
                                                                onChange={e => dispatch({
                                                                    type: 'UPDATE_FINAL_MATCH_COURT',
                                                                    payload: {
                                                                        categoryId: match.category.id,
                                                                        matchId: match.id,
                                                                        court: e.target.value === '' ? undefined : Number(e.target.value)
                                                                    }
                                                                })}
                                                                className="w-12 text-center text-sm font-bold border rounded p-1 bg-gray-50 dark:bg-gray-700"
                                                            />
                                                            {/* Indicateur tablette */}
                                                            {enableCourtView && match.court && !isFinished && (
                                                                <div className={`w-2.5 h-2.5 rounded-full ${
                                                                    courtIsReady ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                                                                    : match.isReady ? 'bg-yellow-400'
                                                                    : 'bg-gray-300'
                                                                }`} />
                                                            )}
                                                        </div>

                                                        {/* Noms equipes */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-sm truncate">{t1Name}</span>
                                                                {isFinished && <span className="text-xs font-black text-blue-500">{match.score1}</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mb-1">vs</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm truncate">{t2Name}</span>
                                                                {isFinished && <span className="text-xs font-black text-blue-500">{match.score2}</span>}
                                                            </div>
                                                        </div>

                                                        {/* BOUTON DÉMARRER - entre les noms et le score */}
                                                        {enableCourtView && match.court && !isFinished && match.team1Id && match.team2Id && (
                                                            <button
                                                                onClick={() => dispatch({
                                                                    type: 'SET_FINAL_MATCH_READY',
                                                                    payload: {
                                                                        categoryId: match.category.id,
                                                                        matchId: match.id,
                                                                        isReady: !match.isReady
                                                                    }
                                                                })}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-colors ${
                                                                    match.isReady
                                                                        ? 'bg-green-600 text-white hover:bg-red-600'
                                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                                }`}
                                                            >
                                                                {match.isReady ? '✅ Actif' : '▶ Démarrer'}
                                                            </button>
                                                        )}

                                                        {/* Arbitre/Marqueur si oblig */}
                                                        {(match.category.isRefereeMandatory || match.category.isScorerMandatory) && !isFinished && (
                                                            <div className="flex flex-col gap-1 text-xs text-gray-400">
                                                                {match.category.isRefereeMandatory && (
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-2 h-2 rounded-full bg-red-400" />
                                                                        <span>{match.refereeId && match.refereeId !== 'Staff'
                                                                            ? (teams.find(t => t.id === match.refereeId)?.name || 'Staff')
                                                                            : 'Arbitre'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {match.category.isScorerMandatory && (
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-2 h-2 rounded-full bg-red-400" />
                                                                        <span>{match.scorerId && match.scorerId !== 'Staff'
                                                                            ? (teams.find(t => t.id === match.scorerId)?.name || 'Staff')
                                                                            : 'Marqueur'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Scores / Actions */}
                                                        {!isFinished && match.team1Id && match.team2Id ? (
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => setQuickScores(prev => ({...prev, [match.id]: { s1: Math.max(0, qs.s1 - 1), s2: qs.s2 }}))}
                                                                        className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600 font-black text-lg flex items-center justify-center hover:bg-gray-300">-</button>
                                                                    <span className="w-8 text-center font-black text-lg">{qs.s1}</span>
                                                                    <button onClick={() => setQuickScores(prev => ({...prev, [match.id]: { s1: qs.s1 + 1, s2: qs.s2 }}))}
                                                                        className="w-8 h-8 rounded bg-blue-500 text-white font-black text-lg flex items-center justify-center hover:bg-blue-600">+</button>
                                                                </div>
                                                                <span className="text-gray-400 font-bold">vs</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => setQuickScores(prev => ({...prev, [match.id]: { s1: qs.s1, s2: Math.max(0, qs.s2 - 1) }}))}
                                                                        className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600 font-black text-lg flex items-center justify-center hover:bg-gray-300">-</button>
                                                                    <span className="w-8 text-center font-black text-lg">{qs.s2}</span>
                                                                    <button onClick={() => setQuickScores(prev => ({...prev, [match.id]: { s1: qs.s1, s2: qs.s2 + 1 }}))}
                                                                        className="w-8 h-8 rounded bg-blue-500 text-white font-black text-lg flex items-center justify-center hover:bg-blue-600">+</button>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        dispatch({
                                                                            type: 'UPDATE_FINAL_MATCH_SCORE',
                                                                            payload: { categoryId: match.category.id, matchId: match.id, score1: qs.s1, score2: qs.s2 }
                                                                        });
                                                                        setQuickScores(prev => { const n = {...prev}; delete n[match.id]; return n; });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700"
                                                                >
                                                                    ✓ Valider
                                                                </button>
                                                            </div>
                                                        ) : isFinished ? (
                                                            <button
                                                                onClick={() => setEditingMatch(match)}
                                                                className="px-3 py-1.5 bg-gray-500 text-white font-bold rounded-lg text-sm hover:bg-gray-600"
                                                            >
                                                                Modifier
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {!jourJView && (
                    <>
                {/* ACCORDEON CONFIG */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 shrink-0">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors rounded-xl"
                    >
                        <span className="font-bold text-sm text-gray-700 dark:text-gray-200">
                            ⚙️ Configuration & Génération
                        </span>
                        <span className={`text-gray-400 transition-transform duration-200 ${showConfig ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {showConfig && (
                        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-600 pt-4">

                {finalPhaseDurationInfo.sessions > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">Simulation Durée Phase Finale</h3>
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Basé sur {effectiveNumberOfCourts} terrain(s)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Sessions Supplémentaires</div>
                                <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{finalPhaseDurationInfo.sessions}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Temps Additionnel</div>
                                <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatDuration(finalPhaseDurationInfo.duration)}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Terrains dédiés</label>
                        <input 
                            type="number" 
                            min="1" 
                            max={numberOfCourts}
                            value={numberOfCourts} 
                            onChange={e => dispatch({type: 'UPDATE_CONFIG', payload: { numberOfCourts: +e.target.value }})}
                            className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Durée Match (min)</label>
                        <input 
                            type="number" 
                            min="1" 
                            value={Math.floor(timerDuration / 60)} 
                            onChange={e => dispatch({type: 'UPDATE_CONFIG', payload: { timerDuration: +e.target.value * 60 }})}
                            className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Pause (min)</label>
                        <input 
                            type="number" 
                            min="0" 
                            value={Math.floor(breakDuration / 60)} 
                            onChange={e => dispatch({type: 'UPDATE_CONFIG', payload: { breakDuration: +e.target.value * 60 }})}
                            className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {!isSwiss ? (
                        <select value={finalPhaseConfig.teamsPerPool} onChange={e => dispatch({type: 'UPDATE_FINAL_CONFIG', payload: { categoryId: selectedCategoryId, config: {...finalPhaseConfig, teamsPerPool: +e.target.value}}})} className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2">
                            {[1,2,3,4].map(n => <option key={n} value={n}>{n} qualifié(s) par poule</option>)}
                        </select>
                     ) : (
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md text-sm flex items-center px-4 text-gray-600 dark:text-gray-300 italic">
                            Mode Suisse : Qualification directe par classement
                        </div>
                     )}
                     <select value={finalPhaseConfig.totalTeams} onChange={e => dispatch({type: 'UPDATE_FINAL_CONFIG', payload: { categoryId: selectedCategoryId, config: {...finalPhaseConfig, totalTeams: +e.target.value as any}}})} className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2">
                         <option value={4}>4 Équipes (Demies)</option>
                         <option value={8}>8 Équipes (Quarts)</option>
                         <option value={16}>16 Équipes (8èmes)</option>
                         <option value={32}>32 Équipes (16èmes)</option>
                     </select>
                     <select value={generationMode} onChange={e => setGenerationMode(e.target.value as any)} className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2">
                         <option value="auto">Génération Automatique</option>
                         <option value="manual">Génération Manuelle (Tableau Vierge)</option>
                     </select>
                </div>

                <div className="pt-2">
                     <button 
                        onClick={() => setIsRankingVisible(!isRankingVisible)} 
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        aria-expanded={isRankingVisible}
                    >
                        {isRankingVisible ? 'Cacher le classement' : 'Voir le classement des équipes qualifiées'}
                    </button>
                </div>
                
                {isRankingVisible && (
                    <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700/60 rounded-lg border dark:border-gray-600">
                        <h4 className="font-bold mb-2">Classement Global des Qualifiés</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Ce classement est utilisé pour générer les appariements automatiques (1er vs dernier, 2ème vs avant-dernier, etc.).
                        </p>
                        <div className="overflow-x-auto max-h-60">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                                    <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                                        <th className="p-2">#</th>
                                        <th className="p-2">Équipe</th>
                                        <th className="p-2 text-center">Poule</th>
                                        <th className="p-2 text-center" title="Victoires">V</th>
                                        <th className="p-2 text-center" title="Différence de points">+/-</th>
                                        <th className="p-2 text-center" title="Points Marqués">PM</th>
                                        <th className="p-2 text-center" title="Points Encaissés">PE</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {rankedQualifiedTeams.map((team, index) => {
                                        const poolIndex = categoryPools.findIndex(p => p.id === team.poolId);
                                        const poolLetter = poolIndex !== -1 ? String.fromCharCode(65 + poolIndex) : '?';
                                        return (
                                            <tr key={team.id}>
                                                <td className="p-2 font-bold">{index + 1}</td>
                                                <td className="p-2">{team.name}</td>
                                                <td className="p-2 text-center">{poolLetter}</td>
                                                <td className="p-2 text-center">{team.wins}</td>
                                                <td className="p-2 text-center">{team.pointsDifference > 0 ? `+${team.pointsDifference}` : team.pointsDifference}</td>
                                                <td className="p-2 text-center">{team.pointsFor}</td>
                                                <td className="p-2 text-center">{team.pointsAgainst}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                             {rankedQualifiedTeams.length === 0 && <p className="text-center p-4 text-gray-500">Aucune équipe qualifiée pour le moment.</p>}
                        </div>
                    </div>
                )}


                {qualificationSummary && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-gray-700/50 border border-blue-200 dark:border-gray-600 rounded-md text-sm">
                        <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">Résumé de la Qualification</h4>
                        <ul className="list-disc list-inside space-y-1">
                            {isSwiss ? (
                                <li>
                                    Les <span className="font-bold">{qualificationSummary.total}</span> meilleures équipes du classement général seront qualifiées.
                                </li>
                            ) : (
                                <>
                                    <li>
                                        <span className="font-bold">{qualificationSummary.direct}</span> qualifiés directs
                                        ({qualificationSummary.teamsPerPool} par poule).
                                    </li>
                                    {qualificationSummary.wildcard > 0 && (
                                        <li>
                                            <span className="font-bold">{qualificationSummary.wildcard}</span> places de repêchage pour les meilleurs
                                            suivants (ex: meilleurs {getOrdinal(qualificationSummary.teamsPerPool + 1)}s).
                                        </li>
                                    )}
                                </>
                            )}
                        </ul>
                        <p className="mt-2 pt-2 border-t border-blue-200 dark:border-gray-600 font-bold">
                            Total : {qualificationSummary.actualQualified} / {qualificationSummary.total} équipes qualifiées pour la phase finale.
                        </p>
                        {warning && (
                            <p className="mt-2 text-yellow-600 dark:text-yellow-400 font-semibold">{warning}</p>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={handleGenerate} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Générer</button>
                    <button onClick={handleDelete} className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700">Supprimer la Phase Finale</button>
                </div>
            </div>
        )}
    </div>
            
            {isEditingManually && 
                <ManualPairingsEditor 
                    categoryId={selectedCategoryId}
                    qualifiedTeams={qualifiedTeams}
                    initialMatches={finalMatches}
                    pools={categoryPools}
                    matches={matches}
                    teams={teams}
                    onSave={() => setIsEditingManually(false)}
                />
            }
            
            {finalMatches.length > 0 && !isEditingManually && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Tableau Final</h2>
                        {!isFinalPhase && (
                            <button
                                onClick={handleStartFinalPhase}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all transform hover:scale-105"
                            >
                                Démarrer l'affichage TV des phases finales
                            </button>
                        )}
                    </div>
                    {renderBracket()}
                </div>
            )}
            
            {editingMatch && team1 && team2 && (
                <ScoreDialog
                    match={editingMatch}
                    team1Name={team1.name}
                    team2Name={team2.name}
                    onClose={() => setEditingMatch(null)}
                    isFinalMatch={true}
                    categoryId={selectedCategoryId}
                    team1WomenCount={team1.womenCount}
                    team2WomenCount={team2.womenCount}
                />
            )}
            </>
            )}
            </div>
        </div>
    );
};

export default FinalPhaseManager;