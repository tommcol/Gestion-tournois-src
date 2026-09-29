import React, { useMemo, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Standing } from '../types';

interface TVStandingsProps {
    isFinal?: boolean;
    pageIndex: number;
    setPageIndex?: (index: number) => void;
}

const TVStandings: React.FC<TVStandingsProps> = ({ isFinal, pageIndex, setPageIndex }) => {
    const { state } = useTournament();
    const { categories, teams, pools, standings, isPoolStageFinished } = state;

    const ZONE_UTILE_PX = 820;

    // Calculate all possible pages (Category + Pool Page) to display
    const allPages = useMemo(() => {
        const pages: { categoryIndex: number; poolPage: number; totalPoolPages: number }[] = [];
        categories.forEach((cat, catIdx) => {
            const catPools = pools.filter(p => p.id.startsWith(cat.id));
            const maxTeams = Math.max(1, ...catPools.map(p => {
                const s = standings[p.id] || [];
                if (s.length > 0) return s.length;
                return ((p as any).teamIds || p.teams || []).length;
            }));
            const poolsPerPage = maxTeams >= 5 ? 2 : 4;
            const totalPages = Math.ceil(catPools.length / poolsPerPage) || 1;
            for (let p = 0; p < totalPages; p++) {
                pages.push({ categoryIndex: catIdx, poolPage: p, totalPoolPages: totalPages });
            }
        });
        return pages;
    }, [categories, pools, standings]);

    useEffect(() => {
        // Si le pageIndex actuel dépasse le nombre de pages, revenir au début
        if (pageIndex >= allPages.length && setPageIndex) {
            setPageIndex(0);
        }
    }, [allPages.length, pageIndex, setPageIndex]);

    const { categoryIndex, poolPage, totalPoolPages } = useMemo(() => {
        return allPages[pageIndex % (allPages.length || 1)] || { categoryIndex: 0, poolPage: 0, totalPoolPages: 1 };
    }, [allPages, pageIndex]);

    const currentCategory = categories[categoryIndex];

    const categoryPools = useMemo(() => {
        if (!currentCategory) return [];
        return pools.filter(p => p.id.startsWith(currentCategory.id));
    }, [pools, currentCategory]);

    const POOLS_PER_PAGE = useMemo(() => {
        const maxTeams = Math.max(1, ...categoryPools.map(p => {
            const s = standings[p.id] || [];
            if (s.length > 0) return s.length;
            return ((p as any).teamIds || p.teams || []).length;
        }));
        return maxTeams >= 5 ? 2 : 4;
    }, [categoryPools, standings]);

    const visiblePools = useMemo(() => {
        const start = poolPage * POOLS_PER_PAGE;
        return categoryPools.slice(start, start + POOLS_PER_PAGE);
    }, [categoryPools, poolPage, POOLS_PER_PAGE]);

    const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Équipe Inconnue';

    // Retourne les standings d'une poule, ou un classement initial si vide
    const getPoolStandings = (poolId: string) => {
        const existing = standings[poolId] || [];
        if (existing.length > 0) return existing;
        
        // Standings vides : construire depuis les équipes de la poule
        const pool = pools.find(p => p.id === poolId);
        if (!pool) return [];
        return ((pool as any).teamIds || pool.teams || []).map((teamId: string) => ({
            teamId,
            points: 0,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointsDifference: 0,
        }));
    };

    const isSuisseTournament = currentCategory?.tournamentType === 'swiss';

    const maxTeamsInPool = useMemo(() => {
        if (visiblePools.length === 0) return 1;
        return Math.max(1, ...visiblePools.map(pool => {
            const s = standings[pool.id] || [];
            if (s.length > 0) return s.length;
            // Avant le début : compter les équipes dans la poule
            const p = pools.find(pp => pp.id === pool.id);
            return ((p as any)?.teamIds || p?.teams || []).length;
        }));
    }, [visiblePools, standings, pools]);

    const displayMode = useMemo(() => {
        if (visiblePools.length <= 1) return 'single';
        if (maxTeamsInPool >= 5) return 'two-tall';
        return 'grid-2x2';
    }, [visiblePools.length, maxTeamsInPool]);

    const fontSize = useMemo(() => {
        let nbLignes: number;
        let facteur: number;
        
        if (displayMode === 'single') {
            const teamCount = visiblePools[0] ? getPoolStandings(visiblePools[0].id).length : 1;
            const effectiveCount = teamCount > 10 ? Math.ceil(teamCount / 2) : teamCount;
            nbLignes = effectiveCount + 2;
            facteur = 0.60;
        } else if (displayMode === 'two-tall') {
            nbLignes = maxTeamsInPool + 2;
            facteur = 0.60;
        } else {
            // grid-2x2 : 2 poules empilées, facteur réduit
            nbLignes = (maxTeamsInPool + 2) * 2;
            facteur = 0.52; // réduit pour éviter le débordement
        }
        
        const hauteurParLigne = ZONE_UTILE_PX / nbLignes;
        const size = hauteurParLigne * facteur;
        return Math.min(42, Math.max(13, size));
    }, [maxTeamsInPool, displayMode, visiblePools, standings]);

    const rowPadding = `${Math.max(1, fontSize * 0.12).toFixed(1)}px 0`;

    if (!currentCategory) return null;

    const renderStandingsTable = (poolStandings: Standing[], startIndex: number = 0) => (
        <table className="w-full text-left">
            <thead>
                <tr 
                    className="text-gray-400 uppercase tracking-wider border-b border-gray-700/30"
                    style={{ fontSize: `${Math.round(fontSize * 0.78)}px` }}
                >
                    <th style={{ padding: rowPadding }} className="font-black w-[60%]">Equipe</th>
                    <th style={{ padding: rowPadding }} className="text-center font-black text-blue-400 w-[20%]">Pts</th>
                    <th style={{ padding: rowPadding }} className="text-center font-black w-[20%]">+/-</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/20">
                {poolStandings.map((standing, idx) => {
                    const absoluteIdx = startIndex + idx;
                    return (
                        <tr
                            key={standing.teamId}
                            style={{ fontSize: `${fontSize}px` }}
                            className={absoluteIdx < 2 ? 'text-yellow-400 font-bold' : 'text-white'}
                        >
                            <td style={{ padding: rowPadding }} className="truncate">
                                {absoluteIdx + 1}. {getTeamName(standing.teamId)}
                            </td>
                            <td style={{ padding: rowPadding }} className="text-center font-black">
                                {standing.points}
                            </td>
                            <td style={{ padding: rowPadding }} className="text-center font-mono">
                                {standing.pointsDifference > 0 ? `+${standing.pointsDifference}` : standing.pointsDifference}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-950/40 px-6 py-4">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div
                        className="w-4 h-8 rounded-full"
                        style={{ backgroundColor: currentCategory.color }}
                    ></div>
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
                        Classement {isPoolStageFinished ? 'Final' : ''} : {currentCategory.name}
                    </h2>
                </div>
                {categories.length > 1 && (
                    <div className="text-xl text-gray-400 font-bold flex gap-4">
                        <span>Catégorie {categoryIndex + 1} / {categories.length}</span>
                        {totalPoolPages > 1 && (
                            <span className="text-blue-400">Page {poolPage + 1} / {totalPoolPages}</span>
                        )}
                    </div>
                )}
            </div>

            {categoryPools.length === 0 ? (
                <div className="flex-1 flex items-center justify-center min-h-0">
                    <p className="text-2xl text-gray-500 italic">Aucun classement disponible pour le moment</p>
                </div>
            ) : displayMode === 'single' ? (
                // UNE SEULE POULE (Suisse ou unique)
                <div className="flex-1 bg-gray-800/50 border border-gray-700 rounded-2xl p-3 flex flex-col overflow-hidden">
                    <h3 className="font-bold text-blue-400 border-b border-gray-700 pb-1 mb-1 flex-shrink-0"
                        style={{ fontSize: `${Math.round(fontSize * 1.2)}px` }}>
                        {isSuisseTournament ? 'Classement Général' : `Poule ${String.fromCharCode(65 + categoryPools.findIndex(p => p.id === visiblePools[0]?.id))}`}
                    </h3>
                    {(() => {
                        const allS = getPoolStandings(visiblePools[0]?.id || '');
                        if (allS.length > 10) {
                            const half = Math.ceil(allS.length / 2);
                            return (
                                <div className="grid grid-cols-2 gap-4 overflow-hidden">
                                    <div className="overflow-hidden">{renderStandingsTable(allS.slice(0, half), 0)}</div>
                                    <div className="overflow-hidden">{renderStandingsTable(allS.slice(half), half)}</div>
                                </div>
                            );
                        }
                        return <div className="overflow-hidden">{renderStandingsTable(allS, 0)}</div>;
                    })()}
                </div>
            ) : displayMode === 'two-tall' ? (
                // 2 POULES CÔTE À CÔTE EN PLEINE HAUTEUR (≥ 5 équipes)
                <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
                    {visiblePools.map((pool) => {
                        const poolIndex = categoryPools.findIndex(p => p.id === pool.id);
                        return (
                            <div key={pool.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-3 flex flex-col overflow-hidden">
                                <h3 className="font-bold text-blue-400 border-b border-gray-700 pb-1 mb-1 flex-shrink-0"
                                    style={{ fontSize: `${Math.round(fontSize * 1.2)}px` }}>
                                    Poule {String.fromCharCode(65 + poolIndex)}
                                </h3>
                                <div className="overflow-hidden">
                                    {renderStandingsTable(getPoolStandings(pool.id), 0)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // GRILLE 2×2 (≤ 4 équipes par poule)
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 overflow-hidden">
                    {visiblePools.map((pool) => {
                        const poolIndex = categoryPools.findIndex(p => p.id === pool.id);
                        return (
                            <div key={pool.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-3 flex flex-col overflow-hidden">
                                <h3 className="font-bold text-blue-400 border-b border-gray-700 pb-1 mb-1 flex-shrink-0"
                                    style={{ fontSize: `${Math.round(fontSize * 1.2)}px` }}>
                                    Poule {String.fromCharCode(65 + poolIndex)}
                                </h3>
                                <div className="overflow-hidden">
                                    {renderStandingsTable(getPoolStandings(pool.id), 0)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TVStandings;
