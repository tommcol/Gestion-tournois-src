import React from 'react';
import { Match, Team, Category } from '../types';
import { getAdminTeamName } from '../utils/helpers';
export interface QuickScore { s1: number; s2: number }
interface Props {
    match: Match; team1: Team | null | undefined; team2: Team | null | undefined;
    category: Category | null | undefined; poolDisplayName: string; isPast: boolean; quickScore: QuickScore;
    renderOfficial: (id: string | null, role?: 'Arbitre' | 'Marqueur') => React.ReactNode;
    handleQuickScore: (id: string, team: 1 | 2, delta: number) => void;
    handleQuickValidate: (match: Match, score: QuickScore) => void;
    setEditingMatch: (match: Match) => void;
}
function ScheduleMatchRow({ match, team1, team2, category, poolDisplayName, isPast, quickScore, renderOfficial, handleQuickScore, handleQuickValidate, setEditingMatch }: Props) {
    return (
                                    <tr className={`border-b dark:border-gray-700 ${isPast ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-3 font-medium">
                                        <div className="flex items-center gap-2">
                                            {category && <span style={{ backgroundColor: category.color }} className="w-3 h-3 rounded-full flex-shrink-0" title={category.name}></span>}
                                            <span>{poolDisplayName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{getAdminTeamName(team1) || 'Inconnu'}</td>
                                    <td className="px-4 py-3">{getAdminTeamName(team2) || 'Inconnu'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">
                                        <div className="flex flex-col items-center">
                                            <span>{match.status === 'finished' ? `${match.score1} - ${match.score2}` : 'vs'}</span>
                                            {match.isForfeit && (
                                                <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1 rounded font-black mt-1">FORFAIT</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">{match.court || '-'}</td>
                                    <td className="px-4 py-3 text-xs">{renderOfficial((match as Match).refereeId || null, 'Arbitre')}</td>
                                    <td className="px-4 py-3 text-xs">{renderOfficial((match as Match).scorerId || null, 'Marqueur')}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            {match.status === 'pending' ? (
                                                <div className="flex flex-col items-center gap-2 py-2">
                                                    <div className="flex items-center gap-3">
                                                        {/* Equipe 1 */}
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleQuickScore(match.id, 1, -1)}
                                                                className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-xl font-black text-xl hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                                                            >-</button>
                                                            <span className="w-12 text-center font-black text-3xl tabular-nums">{quickScore.s1}</span>
                                                            <button
                                                                onClick={() => handleQuickScore(match.id, 1, 1)}
                                                                className="w-10 h-10 bg-blue-500 text-white rounded-xl font-black text-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-blue-500/20"
                                                            >+</button>
                                                        </div>

                                                        <span className="font-black text-gray-400 px-1">VS</span>

                                                        {/* Equipe 2 */}
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleQuickScore(match.id, 2, -1)}
                                                                className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-xl font-black text-xl hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                                                            >-</button>
                                                            <span className="w-12 text-center font-black text-3xl tabular-nums">{quickScore.s2}</span>
                                                            <button
                                                                onClick={() => handleQuickScore(match.id, 2, 1)}
                                                                className="w-10 h-10 bg-blue-500 text-white rounded-xl font-black text-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-blue-500/20"
                                                            >+</button>
                                                        </div>

                                                        <button
                                                            onClick={() => handleQuickValidate(match, quickScore)}
                                                            className="ml-4 px-5 py-2.5 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"
                                                        >
                                                            <span>✓</span>
                                                            <span>Valider</span>
                                                        </button>
                                                    </div>

                                                    {/* Option to use full dialog even for pending matches */}
                                                    <button
                                                        onClick={() => setEditingMatch(match)}
                                                        className="text-[10px] text-gray-400 hover:text-gray-600 uppercase font-bold tracking-tighter"
                                                    >
                                                        Saisie complexe
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingMatch(match)}
                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-bold text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-600"
                                                >
                                                    <span>✏️</span>
                                                    <span>Modifier</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    </tr>
    );
}
export default React.memo(ScheduleMatchRow);

