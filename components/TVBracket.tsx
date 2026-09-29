import React, { useMemo, useEffect } from 'react';
import { FinalMatch, Team, Category } from '../types';
import { useTournamentContext } from '../context/TournamentContext';
import { useAutoFit } from '../hooks/useAutoFit';

interface TVBracketProps {
    category: Category;
    finalMatches: FinalMatch[];
    teams: Team[];
}

const roundNames: Record<FinalMatch['round'], string> = {
    roundOf32: '16èmes de Finale',
    roundOf16: '8èmes de Finale',
    quarterFinal: 'Quarts de Finale',
    semiFinal: 'Demi-Finales',
    final: 'Finale',
    thirdPlace: '3ème Place'
};

const ROUND_ORDER: FinalMatch['round'][] = ['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'thirdPlace', 'final'];
const MATCHES_PER_PAGE = 4;

const TVBracket: React.FC<TVBracketProps> = ({ category, finalMatches, teams }) => {
    const { socket, state } = useTournamentContext();
    const getTeam = (id: string | null | undefined) => id ? teams.find(t => t.id === id) : null;

    const matchesByRound = useMemo(() => {
        const acc: Partial<Record<FinalMatch['round'], FinalMatch[]>> = {};
        ROUND_ORDER.forEach(round => {
            const roundMatches = finalMatches
                .filter(m => m.round === round && m.categoryId === category.id)
                .sort((a, b) => a.matchNumber - b.matchNumber);
            if (roundMatches.length > 0) acc[round] = roundMatches;
        });
        return acc;
    }, [finalMatches, category.id]);

    const activeRounds = ROUND_ORDER.filter(r => matchesByRound[r]);

    // Tour à afficher : celui en cours ou forcé par l'admin
    const currentRound = useMemo(() => {
        if (category.activeTvRound && matchesByRound[category.activeTvRound as FinalMatch['round']]) {
            return category.activeTvRound as FinalMatch['round'];
        }
        const inProgress = activeRounds.find(r => {
            const ms = matchesByRound[r] || [];
            return ms.some(m => m.team1Id && m.team2Id) && ms.some(m => m.status !== 'finished');
        });
        return inProgress || activeRounds[activeRounds.length - 1] || activeRounds[0];
    }, [category.activeTvRound, activeRounds, matchesByRound]);

    // Passage automatique au tour suivant
    useEffect(() => {
        if (category.activeTvRound || !currentRound) return;
        const ms = matchesByRound[currentRound] || [];
        const allFinished = ms.length > 0 && ms.every(m => m.status === 'finished');
        const currentIdx = activeRounds.indexOf(currentRound);
        if (allFinished && currentIdx < activeRounds.length - 1) {
            const next = activeRounds[currentIdx + 1];
            if ((matchesByRound[next] || []).some(m => m.team1Id && m.team2Id)) {
                socket?.emit('update_tv_round', { categoryId: category.id, round: next });
            }
        }
    }, [matchesByRound, currentRound, activeRounds, category.activeTvRound, socket]);

    // Pagination
    const currentMatches = matchesByRound[currentRound] || [];
    const [page, setPage] = React.useState(0);

    // Reset page quand le tour change
    useEffect(() => { setPage(0); }, [currentRound]);

    // Auto-pagination
    useEffect(() => {
        if (currentMatches.length <= MATCHES_PER_PAGE) return;
        const totalPages = Math.ceil(currentMatches.length / MATCHES_PER_PAGE);
        const durationMs = (state.matchDisplayDuration || 15) * 1000;
        const interval = setInterval(() => {
            setPage(prev => (prev + 1) % totalPages);
        }, durationMs);
        return () => clearInterval(interval);
    }, [currentMatches.length, state.matchDisplayDuration]);

    const totalPages = Math.ceil(currentMatches.length / MATCHES_PER_PAGE);
    const visibleMatches = currentMatches.slice(page * MATCHES_PER_PAGE, (page + 1) * MATCHES_PER_PAGE);
    const matchCount = visibleMatches.length || 1;

    const { containerRef, metrics } = useAutoFit(matchCount, 12);
    const fontSize = metrics.fontSize || 16;
    const courtFontSize = fontSize * 2.2;
    const subFontSize = fontSize * 0.6;
    const scoreFontSize = fontSize * 1.4;

    if (!currentRound) return null;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-950/40 px-6 py-4">
            {/* Header */}
            <div className="h-20 flex items-center justify-between border-b-4 border-purple-600 mb-2 shrink-0">
                <h1 className="text-5xl font-black uppercase tracking-tighter text-white">
                    {category.name} — <span className="text-purple-400">{roundNames[currentRound]}</span>
                </h1>
                {totalPages > 1 && (
                    <div className="text-2xl text-purple-400 font-black bg-purple-900/30 px-6 py-2 rounded-full border-2 border-purple-500/50">
                        Page {page + 1} / {totalPages}
                    </div>
                )}
            </div>

            {/* Colonnes header */}
            <div className="flex px-6 text-gray-500 font-black uppercase tracking-widest shrink-0" style={{ fontSize: `${subFontSize * 0.9}px` }}>
                <div className="w-[12%] text-center">Terrain</div>
                <div className="w-[63%] px-10">Match</div>
                <div className="w-[25%] text-center">Score</div>
            </div>

            {/* Matchs */}
            <div
                ref={containerRef}
                className="flex-1 grid gap-3 overflow-hidden min-h-0"
                style={{ gridTemplateRows: `repeat(${matchCount}, 1fr)` }}
            >
                {visibleMatches.map(match => {
                    const team1 = getTeam(match.team1Id);
                    const team2 = getTeam(match.team2Id);
                    const t1Name = team1?.name || 'TBD';
                    const t2Name = team2?.name || 'TBD';
                    const isFinished = match.status === 'finished';
                    const t1Wins = isFinished && (match.score1 ?? 0) > (match.score2 ?? 0);
                    const t2Wins = isFinished && (match.score2 ?? 0) > (match.score1 ?? 0);

                    return (
                        <div key={match.id} className="bg-gray-800/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 flex items-stretch min-h-0">
                            {/* Terrain */}
                            <div
                                className="w-[12%] flex items-center justify-center font-black text-purple-400 bg-purple-900/10 border-r border-gray-700/50"
                                style={{ fontSize: `${courtFontSize}px` }}
                            >
                                {match.court || '-'}
                            </div>

                            {/* Noms */}
                            <div className="w-[63%] flex items-center px-6 gap-4 overflow-hidden">
                                <div className="flex-1 leading-none flex flex-col justify-center overflow-hidden">
                                    <div
                                        className={`font-black uppercase tracking-tight leading-none ${
                                            !isFinished ? 'text-white' : t1Wins ? 'text-green-400' : 'text-red-400'
                                        }`}
                                        style={{ fontSize: `${fontSize}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {t1Name}
                                    </div>
                                    <div className="text-gray-500 font-bold" style={{ fontSize: `${subFontSize}px`, margin: '4px 0' }}>VS</div>
                                    <div
                                        className={`font-black uppercase tracking-tight leading-none ${
                                            !isFinished ? 'text-white' : t2Wins ? 'text-green-400' : 'text-red-400'
                                        }`}
                                        style={{ fontSize: `${fontSize}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {t2Name}
                                    </div>
                                </div>
                            </div>

                            {/* Score */}
                            <div
                                className="w-[25%] flex items-center justify-center font-black border-l border-gray-700/30"
                                style={{ fontSize: `${scoreFontSize}px` }}
                            >
                                {isFinished ? (
                                    <div className="flex items-center gap-4">
                                        <span className={t1Wins ? 'text-green-400' : t2Wins ? 'text-red-400' : 'text-purple-400'}>{match.score1}</span>
                                        <span className="text-gray-600">-</span>
                                        <span className={t2Wins ? 'text-green-400' : t1Wins ? 'text-red-400' : 'text-purple-400'}>{match.score2}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-500 italic" style={{ fontSize: `${fontSize * 0.6}px` }}>En attente</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TVBracket;
