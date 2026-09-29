import React, { useMemo } from 'react';
import { Match, Team, Category, Player } from '../types';
import { useAutoFit } from '../hooks/useAutoFit';

interface NextSessionMatchesProps {
    matches: Match[];
    teams: Team[];
    categories: Category[];
    sessionNumber: number;
    getTeam: (teamId: string) => Team | undefined;
    page: number;
    showReferee: boolean;
    showScorer: boolean;
}

const NextSessionMatches: React.FC<NextSessionMatchesProps> = ({ matches, teams, categories, sessionNumber, getTeam, page, showReferee, showScorer }) => {
    const MATCHES_PER_PAGE = 4;
    const totalPages = Math.ceil(matches.length / MATCHES_PER_PAGE);

    const visibleMatches = React.useMemo(() => {
        const start = page * MATCHES_PER_PAGE;
        return matches.slice(start, start + MATCHES_PER_PAGE);
    }, [matches, page]);

    const playerInfoMap = useMemo(() => {
        const map = new Map<string, { player: Player; team: Team; category: Category }>();
        const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]));
        teams.forEach(team => {
            const category = categoryMap.get(team.categoryId);
            if (category) {
                team.players.forEach(player => {
                    map.set(player.id, { player, team, category });
                });
            }
        });
        return map;
    }, [teams, categories]);
    
    const renderOfficial = (playerId: string | null | undefined) => {
        // Si un joueur réel est assigné
        if (playerId && playerId !== 'Staff' && playerId !== '') {
            const info = playerInfoMap.get(playerId);
            if (info) {
                return (
                    <span className="font-bold text-white" style={{ fontSize: `${fontSize}px` }}>
                        {info.player.firstName} {info.player.lastName}
                    </span>
                );
            }
        }
        // Sinon toujours afficher Staff / Volontaire
        return (
            <span className="font-bold text-white" style={{ fontSize: `${fontSize}px` }}>
                Staff / Volontaire
            </span>
        );
    };

    const matchCount = visibleMatches.length || 1;

    const { containerRef, metrics } = useAutoFit(matchCount, 12); // gap-3 = 12px
    const fontSize = metrics.fontSize || 16; // default fallback

    const courtFontSize = fontSize * 2.2;   // numéro terrain
    const subFontSize = fontSize * 0.6;     // VS
    const officialFontSize = fontSize * 0.85; // arbitre/marqueur

    const columnsVisibleCount = (showReferee ? 1 : 0) + (showScorer ? 1 : 0);
    const matchColWidth = columnsVisibleCount === 2 ? 'w-[38%]' : columnsVisibleCount === 1 ? 'w-[63%]' : 'w-[88%]';
    
    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-950/40 px-6 py-4">
            {/* Header - Fixed Height 10vh */}
            <div className="h-[10vh] flex items-center justify-between border-b-4 border-blue-600 mb-2 shrink-0">
                <h1 className="text-[5vh] font-black uppercase tracking-tighter text-white">
                    Prochains Matchs <span className="text-blue-500">(Session {sessionNumber})</span>
                </h1>
                {totalPages > 1 && (
                    <div className="text-[2.5vh] text-blue-400 font-black bg-blue-900/30 px-6 py-2 rounded-full border-2 border-blue-500/50">
                        Page {page + 1} / {totalPages}
                    </div>
                )}
            </div>

            {/* Content Area - CSS Grid */}
            <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                {/* Header Row */}
                <div className="flex px-6 text-gray-500 font-black uppercase tracking-widest shrink-0" style={{ fontSize: `${subFontSize * 0.9}px` }}>
                    <div className="w-[12%] text-center">Terrain</div>
                    <div className={`${matchColWidth} px-10`}>Match</div>
                    {showReferee && <div className="w-[25%] px-4">Arbitre</div>}
                    {showScorer && <div className="w-[25%] px-4">Marqueur</div>}
                </div>
                <div 
                    ref={containerRef}
                    className="flex-1 grid gap-3 overflow-hidden min-h-0 grid-rows-dynamic"
                    style={{ '--rows': matchCount } as React.CSSProperties}
                >
                {visibleMatches.map(match => {
                    const team1 = getTeam(match.team1Id);
                    const team2 = getTeam(match.team2Id);
                    const category = team1 ? categories.find(c => c.id === team1.categoryId) : null;
                    
                    return (
                        <div key={match.id} className="bg-gray-800/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 flex items-stretch min-h-0">
                            {/* Court Number */}
                            <div 
                                className="w-[12%] flex items-center justify-center font-black text-blue-400 bg-blue-900/10 border-r border-gray-700/50"
                                style={{ fontSize: `${courtFontSize}px` }}
                            >
                                {match.court}
                            </div>

                            {/* Match Teams */}
                            <div className={`${matchColWidth} flex items-center px-6 gap-4 overflow-hidden`}>
                                {category && <div style={{ backgroundColor: category.color }} className="w-[1.2vh] h-[50%] rounded-full flex-shrink-0 shadow-lg shadow-black/50"></div>}
                                <div className="flex-1 leading-none flex flex-col justify-center overflow-hidden">
                                    <div 
                                        className="font-black text-white uppercase tracking-tight leading-none"
                                        style={{ 
                                            fontSize: `${fontSize}px`,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {team1?.name || '?'}
                                    </div>
                                    <div className="text-gray-500 font-bold" style={{ fontSize: `${subFontSize}px`, margin: '4px 0' }}>VS</div>
                                    <div 
                                        className="font-black text-white uppercase tracking-tight leading-none"
                                        style={{ 
                                            fontSize: `${fontSize}px`,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {team2?.name || '?'}
                                    </div>
                                </div>
                            </div>

                            {/* Officials */}
                            {showReferee && (
                                <div className="w-[25%] flex items-center px-3 border-l border-gray-700/30">
                                    <div className="bg-gray-900/50 w-full h-[70%] flex items-center px-4 rounded-xl border border-gray-700/30 overflow-hidden">
                                        <div className="truncate font-bold text-gray-200" style={{ fontSize: `${officialFontSize}px` }}>
                                            {renderOfficial(match.refereeId)}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {showScorer && (
                                <div className="w-[25%] flex items-center px-3 border-l border-gray-700/30">
                                    <div className="bg-gray-900/50 w-full h-[70%] flex items-center px-4 rounded-xl border border-gray-700/30 overflow-hidden">
                                        <div className="truncate font-bold text-gray-200" style={{ fontSize: `${officialFontSize}px` }}>
                                            {renderOfficial(match.scorerId)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                </div>
            </div>
        </div>
    );
};

export default NextSessionMatches;