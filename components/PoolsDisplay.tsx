
import React, { useState, useMemo, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match } from '../types';
import { getAdminTeamName } from '../utils/helpers';

const PoolsDisplay: React.FC = () => {
    const { state, dispatch } = useTournament();
    const { categories, teams, pools, matches, timerDuration, breakDuration } = state;
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
    const [teamsPerPool, setTeamsPerPool] = useState(4);
    const [tournamentType, setTournamentType] = useState<'traditional' | 'swiss'>('traditional');
    const [swissMatchCount, setSwissMatchCount] = useState(4);
    const [isDoubleRoundRobin, setIsDoubleRoundRobin] = useState(false);
    
    const categoryTeamsCount = useMemo(() => {
        return teams.filter(t => t.categoryId === selectedCategoryId).length;
    }, [teams, selectedCategoryId]);

    const categoryPools = useMemo(() => {
        return pools.filter(p => p.id.startsWith(selectedCategoryId));
    }, [pools, selectedCategoryId]);

    useEffect(() => {
        if(!selectedCategoryId && categories[0]) {
            setSelectedCategoryId(categories[0].id);
        }
        const cat = categories.find(c => c.id === selectedCategoryId);
        if (cat) {
            setTournamentType(cat.tournamentType || 'traditional');
            let initialMatchCount = cat.swissMatchCount || 4;
            
            // If teams count is odd, swiss match count MUST be even
            if (categoryTeamsCount % 2 !== 0 && initialMatchCount % 2 !== 0) {
                initialMatchCount = Math.max(2, initialMatchCount - 1);
            }
            
            setSwissMatchCount(initialMatchCount);
            setIsDoubleRoundRobin(cat.isDoubleRoundRobin || false);
        }
    }, [categories, selectedCategoryId, categoryTeamsCount]);

    const swissMatchOptions = useMemo(() => {
        const isEvenTeams = categoryTeamsCount % 2 === 0;
        if (isEvenTeams) {
            // Even teams: can have 2, 3, 4, 5, 6, 7, 8, 9, 10 matches
            return [2, 3, 4, 5, 6, 7, 8, 9, 10];
        } else {
            // Odd teams: MUST have even number of matches (2, 4, 6, 8, 10)
            return [2, 4, 6, 8, 10];
        }
    }, [categoryTeamsCount]);

    const simulation = useMemo(() => {
        const totalTeams = categoryTeamsCount;

        if (totalTeams < 2) {
            return { numberOfPools: 0, totalMatches: 0, matchesPerTeam: '0' };
        }

        if (tournamentType === 'swiss') {
            const totalMatches = Math.floor((totalTeams * swissMatchCount) / 2);
            return {
                numberOfPools: 1,
                totalMatches,
                matchesPerTeam: `${swissMatchCount}`
            };
        }

        if (teamsPerPool < 2 || !Number.isInteger(teamsPerPool)) {
            return { numberOfPools: 0, totalMatches: 0, matchesPerTeam: '0' };
        }

        const numberOfFullPools = Math.floor(totalTeams / teamsPerPool);
        const sizeOfLastPool = totalTeams % teamsPerPool;
        const multiplier = isDoubleRoundRobin ? 2 : 1;

        if (sizeOfLastPool === 0) { // All pools are full
            const numberOfPools = totalTeams / teamsPerPool;
            const matchesPerPool = (teamsPerPool * (teamsPerPool - 1) / 2) * multiplier;
            const totalMatches = numberOfPools * matchesPerPool;
            const matchesPerTeam = (teamsPerPool - 1) * multiplier;
            return {
                numberOfPools,
                totalMatches,
                matchesPerTeam: `${matchesPerTeam}`
            };
        } else { // There's one smaller pool at the end
            const numberOfPools = numberOfFullPools + 1;
            const matchesInFullPools = numberOfFullPools * (teamsPerPool * (teamsPerPool - 1) / 2) * multiplier;
            const matchesInLastPool = sizeOfLastPool > 1 ? (sizeOfLastPool * (sizeOfLastPool - 1) / 2) * multiplier : 0;
            const totalMatches = matchesInFullPools + matchesInLastPool;

            const matchesPerTeamInFullPool = (teamsPerPool - 1) * multiplier;
            const matchesPerTeamInLastPool = sizeOfLastPool > 1 ? (sizeOfLastPool - 1) * multiplier : 0;

            const minMatches = Math.min(matchesPerTeamInFullPool, matchesPerTeamInLastPool);
            const maxMatches = Math.max(matchesPerTeamInFullPool, matchesPerTeamInLastPool);

            const matchesPerTeam = minMatches === maxMatches ? `${minMatches}` : `${minMatches} à ${maxMatches}`;

            return {
                numberOfPools,
                totalMatches,
                matchesPerTeam
            };
        }
    }, [categoryTeamsCount, teamsPerPool, tournamentType, swissMatchCount, isDoubleRoundRobin]);

    const globalSessionsInfo = useMemo(() => {
        const poolMatches = matches.filter(m => m.round === 'Pool' || m.round === 'Swiss');
        const sessionNumbers = new Set(poolMatches.map(m => m.sessionNumber).filter((n): n is number => n !== undefined));
        const count = sessionNumbers.size;
        
        if (count === 0) return { count: 0, duration: 0 };
        
        const totalMatchTime = count * timerDuration;
        const totalBreakTime = Math.max(0, count - 1) * breakDuration;
        return { count, duration: totalMatchTime + totalBreakTime };
    }, [matches, timerDuration, breakDuration]);

    const formatDuration = (totalSeconds: number) => {
        if (totalSeconds < 0) return "0m";
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        let result = '';
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0 || hours === 0) result += `${minutes}m`;
        return result.trim() || '0m';
    };

    const getTeamName = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        return getAdminTeamName(team);
    };

    const getPoolName = (poolId: string | undefined) => {
        if (!poolId) return '-';
        if (poolId.includes('swiss')) return 'Général';
        
        const poolIndex = categoryPools.findIndex(p => p.id === poolId);
        if (poolIndex !== -1) {
            return String.fromCharCode(65 + poolIndex);
        }

        const parts = poolId.split('_');
        return parts.length > 1 ? parts[parts.length - 1] : poolId;
    };

    const handleGeneratePools = () => {
        if (teams.filter(t => t.categoryId === selectedCategoryId).length < 2) {
            alert("Pas assez d'équipes dans cette catégorie pour générer les poules.");
            return;
        }
        if (tournamentType === 'traditional' && teamsPerPool < 2) {
            alert("Le nombre d'équipes par poule doit être d'au moins 2.");
            return;
        }
        if (tournamentType === 'swiss' && (categoryTeamsCount % 2 !== 0) && (swissMatchCount % 2 !== 0)) {
            alert("Avec un nombre impair d'équipes, le nombre de matchs par équipe doit être pair pour que tout le monde joue le même nombre de matchs.");
            return;
        }

        const categoryPoolIds = new Set(categoryPools.map(p => p.id));
        const categoryMatchesList = matches.filter(m => m.poolId && categoryPoolIds.has(m.poolId));
        const hasScores = categoryMatchesList.some(m => m.score1 !== null || m.score2 !== null);
        
        if (hasScores) {
            const categoryName = categories.find(c => c.id === selectedCategoryId)?.name || '';
            if (!window.confirm(`Attention : des scores ont déjà été saisis pour la catégorie "${categoryName}". Régénérer va effacer tous ces résultats. Êtes-vous sûr ?`)) {
                return;
            }
        }

        dispatch({ 
            type: 'GENERATE_CATEGORY_POOLS_AND_MATCHES', 
            payload: { 
                categoryId: selectedCategoryId, 
                teamsPerPool,
                tournamentType,
                swissMatchCount,
                isDoubleRoundRobin
            } 
        });
    };

    const handleResetPools = () => {
        const categoryName = categories.find(c => c.id === selectedCategoryId)?.name || '';
        if (window.confirm(`Êtes-vous sûr de vouloir réinitialiser les poules et les matchs pour la catégorie "${categoryName}" ? Cette action est irréversible.`)) {
            dispatch({ type: 'RESET_CATEGORY_POOLS', payload: { categoryId: selectedCategoryId } });
        }
    };

    const categoryMatches = useMemo(() => {
        const categoryPoolIds = new Set(categoryPools.map(p => p.id));
        return matches.filter(m => m.poolId && categoryPoolIds.has(m.poolId)).sort((a,b) => {
            const sessionA = a.sessionNumber || 999;
            const sessionB = b.sessionNumber || 999;
            if (sessionA !== sessionB) return sessionA - sessionB;
            return a.id.localeCompare(b.id);
        });
    }, [matches, categoryPools]);

    const handleStartTournament = () => {
        if (window.confirm("Êtes-vous prêt à diffuser le tournoi sur la TV ? Cela affichera les poules et les matchs à la place des sponsors.")) {
            dispatch({ type: 'START_TOURNAMENT' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold">Organisation du Tournoi</h1>
                {!state.isTournamentStarted && (
                    <button 
                        onClick={handleStartTournament}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        <span className="text-xl">🚀</span> Diffuser le tournoi sur la TV
                    </button>
                )}
                {state.isTournamentStarted && (
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border border-green-200 dark:border-green-800">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Tournoi en cours de diffusion
                    </div>
                )}
            </div>
            
            {globalSessionsInfo.count > 0 && (
                <div className="bg-blue-50 dark:bg-gray-700/50 border border-blue-200 dark:border-gray-600 rounded-md p-4">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Simulation de la Durée Globale</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-600 shadow-sm">
                                <label htmlFor="timerDuration" className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Match (min):</label>
                                <input 
                                    id="timerDuration"
                                    type="number" 
                                    min="1"
                                    value={timerDuration / 60}
                                    onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { timerDuration: Number(e.target.value) * 60 } })}
                                    className="w-16 p-1 text-sm border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-center font-bold"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-600 shadow-sm">
                                <label htmlFor="breakDuration" className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pause (min):</label>
                                <input 
                                    id="breakDuration"
                                    type="number" 
                                    min="0"
                                    value={breakDuration / 60}
                                    onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { breakDuration: Number(e.target.value) * 60 } })}
                                    className="w-16 p-1 text-sm border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-center font-bold"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-gray-500 dark:text-gray-400">Sessions Planifiées (Total)</div>
                            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{globalSessionsInfo.count}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 dark:text-gray-400">Durée Estimée Totale</div>
                            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{formatDuration(globalSessionsInfo.duration)}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                        <div role="tablist" className="flex items-center gap-2 flex-wrap">
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    role="tab"
                                    aria-selected={selectedCategoryId === category.id}
                                    onClick={() => setSelectedCategoryId(category.id)}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                        selectedCategoryId === category.id
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span style={{ backgroundColor: category.color }} className="w-3 h-3 rounded-full flex-shrink-0"></span>
                                    <span>{category.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-300 flex-shrink-0 ml-4">
                            {categoryTeamsCount} {categoryTeamsCount === 1 ? 'équipe' : 'équipes'}
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                <button
                                    onClick={() => setTournamentType('traditional')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                        tournamentType === 'traditional'
                                            ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    Traditionnel (Poules)
                                </button>
                                <button
                                    onClick={() => setTournamentType('swiss')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                        tournamentType === 'swiss'
                                            ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    Système Suisse
                                </button>
                            </div>

                            {tournamentType === 'traditional' ? (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="teams-per-pool-input" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                            Équipes par poule:
                                        </label>
                                        <input
                                            id="teams-per-pool-input"
                                            type="number"
                                            min="2"
                                            value={teamsPerPool}
                                            onChange={(e) => setTeamsPerPool(parseInt(e.target.value, 10) || 2)}
                                            className="w-16 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1 px-2 text-center"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isDoubleRoundRobin}
                                            onChange={(e) => setIsDoubleRoundRobin(e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Aller-Retour</span>
                                    </label>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <label htmlFor="swiss-match-count" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                        Matchs par équipe:
                                    </label>
                                    <select
                                        id="swiss-match-count"
                                        value={swissMatchCount}
                                        onChange={(e) => setSwissMatchCount(parseInt(e.target.value, 10))}
                                        className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1 px-2"
                                    >
                                        {swissMatchOptions.map(n => (
                                            <option key={n} value={n}>{n} matchs</option>
                                        ))}
                                    </select>
                                    {categoryTeamsCount % 2 !== 0 && (
                                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                            (Nb impair d'équipes : repos tournant)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                {categoryPools.length > 0 && (
                                    <button onClick={handleResetPools} className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 text-sm font-medium">Réinitialiser</button>
                                )}
                                <button onClick={handleGeneratePools} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium">
                                    {categoryPools.length > 0 ? 'Régénérer le Planning' : 'Générer le Planning'}
                                </button>
                            </div>
                            
                            {categoryTeamsCount > 1 && (
                                <div className="p-2 px-4 bg-blue-50 dark:bg-gray-700/50 border border-blue-200 dark:border-gray-600 rounded-md flex gap-6 items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Poules</span>
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{simulation.numberOfPools}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Matchs Totaux</span>
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{simulation.totalMatches}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Matchs / Équipe</span>
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{simulation.matchesPerTeam}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {categoryPools.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Le planning pour cette catégorie n'a pas encore été généré.</p>}

                {tournamentType === 'traditional' && categoryPools.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {categoryPools.map((pool, index) => (
                            <div key={pool.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center justify-between">
                                    <span>Poule {getPoolName(pool.id)}</span>
                                    <span className="text-xs font-normal text-gray-400">{pool.teams.length} équipes</span>
                                </h4>
                                <ul className="space-y-1">
                                    {pool.teams.map(teamId => (
                                        <li key={teamId} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                            <span className="truncate">{getTeamName(teamId)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {categoryMatches.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Liste des Matchs Générés</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-600">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Session</th>
                                        <th scope="col" className="px-4 py-3">Poule</th>
                                        <th scope="col" className="px-4 py-3">Match</th>
                                        <th scope="col" className="px-4 py-3">Terrain</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {categoryMatches.map((match) => (
                                        <tr key={match.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                {match.sessionNumber ? `Session ${match.sessionNumber}` : 'Non planifié'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-semibold">
                                                    {getPoolName(match.poolId)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{getTeamName(match.team1Id)}</span>
                                                    <span className="text-gray-400">vs</span>
                                                    <span className="font-semibold">{getTeamName(match.team2Id)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {match.court ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                        Terrain {match.court}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default PoolsDisplay;
