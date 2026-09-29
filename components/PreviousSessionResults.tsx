import React, { useMemo } from 'react';
import { Match, Team, Category } from '../types';
import { useAutoFit } from '../hooks/useAutoFit';

interface PreviousSessionResultsProps {
    matches: Match[];
    teams: Team[];
    categories: Category[];
    sessionNumber: number;
    getTeam: (teamId: string) => Team | undefined;
    page: number;
}

const PreviousSessionResults: React.FC<PreviousSessionResultsProps> = ({ matches, teams, categories, sessionNumber, getTeam, page }) => {
    const MATCHES_PER_PAGE = 4;
    const totalPages = Math.ceil(matches.length / MATCHES_PER_PAGE);

    const visibleMatches = React.useMemo(() => {
        const start = page * MATCHES_PER_PAGE;
        return matches.slice(start, start + MATCHES_PER_PAGE);
    }, [matches, page]);

    const matchCount = visibleMatches.length || 1;

    const { containerRef, metrics } = useAutoFit(matchCount, 12); // gap-3 = 12px
    const fontSize = metrics.fontSize || 16; // default fallback

    const courtFontSize = fontSize * 2.2;   // numéro terrain
    const subFontSize = fontSize * 0.6;     // VS
    
    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-950/40 px-6 py-4">
            {/* Header - Fixed Height 80px */}
            <div className="h-20 flex items-center justify-between border-b-4 border-blue-600 mb-2 shrink-0">
                <h1 className="text-5xl font-black uppercase tracking-tighter text-white">
                    Résultats <span className="text-blue-500">(Session {sessionNumber})</span>
                </h1>
                {totalPages > 1 && (
                    <div className="text-2xl text-blue-400 font-black bg-blue-900/30 px-6 py-2 rounded-full border-2 border-blue-500/50">
                        Page {page + 1} / {totalPages}
                    </div>
                )}
            </div>

            {/* Content Area - CSS Grid */}
            <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                {/* Header Row */}
                <div className="flex px-6 text-gray-500 font-black uppercase tracking-widest shrink-0" style={{ fontSize: `${subFontSize * 0.9}px` }}>
                    <div className="w-[12%] text-center">Terrain</div>
                    <div className="w-[63%] px-10">Match</div>
                    <div className="w-[25%] text-center px-4">Score</div>
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
                    
                    const isFinished = match.score1 !== undefined && match.score2 !== undefined && match.score1 !== null;
                    const team1Wins = isFinished && match.score1! > match.score2!;
                    const team2Wins = isFinished && match.score2! > match.score1!;
                    
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
                            <div className={`w-[63%] flex items-center px-6 gap-4 overflow-hidden`}>
                                {category && <div style={{ backgroundColor: category.color }} className="w-2.5 h-[50%] rounded-full flex-shrink-0 shadow-lg shadow-black/50"></div>}
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

                            {/* Score - remplace la colonne arbitre */}
                            <div 
                                className="w-[25%] flex items-center justify-center font-black border-l border-gray-700/30"
                                style={{ fontSize: `${fontSize * 1.4}px` }}
                            >
                                {isFinished ? (
                                    <div className="flex items-center gap-3">
                                        <span className={team1Wins ? 'text-green-400' : team2Wins ? 'text-red-400' : 'text-blue-400'}>
                                            {match.score1}
                                        </span>
                                        <span className="text-gray-600 text-base">-</span>
                                        <span className={team2Wins ? 'text-green-400' : team1Wins ? 'text-red-400' : 'text-blue-400'}>
                                            {match.score2}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-gray-500 italic" style={{ fontSize: `${fontSize * 0.6}px` }}>En cours</span>
                                )}
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>
        </div>
    );
};

export default PreviousSessionResults;
