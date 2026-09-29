import React, { useState, useEffect, useCallback } from 'react';
import { useTournamentContext } from '../context/TournamentContext';
import { FinalMatch } from '../types';

interface CourtViewProps {
    courtNumber: number;
}

const CourtView: React.FC<CourtViewProps> = ({ courtNumber }) => {
    const { state, dispatch, socket } = useTournamentContext();
    const { matches, teams, categories, pools, currentSession, finalMatches } = state;

    // Match en cours sur ce terrain
    // D'abord chercher un match de poule
    const poolMatch = matches.find(m =>
        m.court === courtNumber &&
        m.sessionNumber === currentSession &&
        m.status === 'pending'
    );

    // Sinon chercher un match de phase finale prêt sur ce terrain
    const finalMatch = !poolMatch
        ? Object.values(finalMatches)
            .flat()
            .find(m =>
                m.court === courtNumber &&
                m.isReady === true &&
                m.status !== 'finished'
            )
        : undefined;

    const currentMatch = poolMatch || finalMatch || null;
    const isFinalPhaseMatch = !poolMatch && !!finalMatch;

    const team1 = teams.find(t => t.id === currentMatch?.team1Id);
    const team2 = teams.find(t => t.id === currentMatch?.team2Id);

    // Bonus féminin
    const bonus1 = !team1?.womenCount ? 0 : team1.womenCount >= 2 ? 2 : 1;
    const bonus2 = !team2?.womenCount ? 0 : team2.womenCount >= 2 ? 2 : 1;

    // States locaux
    const [courtState, setCourtState] = useState<'waiting' | 'ready' | 'match' | 'end'>('waiting');
    const [score1, setScore1] = useState(bonus1);
    const [score2, setScore2] = useState(bonus2);
    const [fouls1, setFouls1] = useState(0);
    const [fouls2, setFouls2] = useState(0);
    const [chronoSec, setChronoSec] = useState(state.timerDuration || 480);
    const [chronoRunning, setChronoRunning] = useState(false);

    // Reset quand le match change
    useEffect(() => {
        setScore1(bonus1);
        setScore2(bonus2);
        setFouls1(0);
        setFouls2(0);
        setCourtState('waiting');
        setChronoSec(state.timerDuration || 480);
        setChronoRunning(false);
    }, [currentMatch?.id, bonus1, bonus2, state.timerDuration]);

    // Chrono
    useEffect(() => {
        if (!chronoRunning) return;
        const interval = setInterval(() => {
            setChronoSec(prev => {
                if (prev <= 1) {
                    setChronoRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [chronoRunning]);

    // Écouter le démarrage du chrono depuis l'admin via Socket.io
    useEffect(() => {
        const handleAudioEvent = (e: Event) => {
            const { type, payload } = (e as CustomEvent).detail;

            if (type === 'timer_start') {
                setChronoSec(payload?.timeLeft || state.timerDuration || 480);
                setChronoRunning(true);
                setCourtState('match');
            }
            if (type === 'timer_pause') {
                setChronoRunning(false);
            }
            if (type === 'timer_reset') {
                setChronoRunning(false);
                setChronoSec(state.timerDuration || 480);
                setCourtState('waiting');
            }
            if (type === 'timer_tick') {
                // Synchronisation du chrono avec l'admin
                setChronoSec(payload?.timeLeft ?? 0);
            }
        };

        window.addEventListener('tournament_audio_event', handleAudioEvent);
        return () => window.removeEventListener('tournament_audio_event', handleAudioEvent);
    }, [state.timerDuration]);

    // Envoyer signal "prêt" à l'admin
    const handleReady = () => {
        socket?.emit('court_ready', { court: courtNumber, matchId: currentMatch?.id });
        setCourtState('ready');
    };

    // Envoyer le score final
    const handleSendScore = () => {
        if (!currentMatch) return;
        if (!window.confirm(`Confirmer le score ${score1} - ${score2} ?`)) return;

        if (isFinalPhaseMatch) {
            // Match de phase finale
            const fm = finalMatch!;
            dispatch({
                type: 'UPDATE_FINAL_MATCH_SCORE',
                payload: {
                    categoryId: fm.categoryId,
                    matchId: fm.id,
                    score1,
                    score2,
                }
            });
            // Réinitialiser isReady
            dispatch({
                type: 'SET_FINAL_MATCH_READY',
                payload: {
                    categoryId: fm.categoryId,
                    matchId: fm.id,
                    isReady: false
                }
            });
        } else {
            // Match de poule (code existant)
            dispatch({
                type: 'UPDATE_MATCH_SCORE',
                payload: {
                    matchId: currentMatch.id,
                    score1,
                    score2,
                    poolId: (currentMatch as any).poolId,
                }
            });
        }

        setCourtState('end');
    };

    // Envoyer le score en temps réel à la TV
    useEffect(() => {
        if (!socket || !currentMatch || courtState !== 'match') return;
        socket.emit('live_score', {
            court: courtNumber,
            matchId: currentMatch.id,
            score1,
            score2,
            team1Name: team1?.name,
            team2Name: team2?.name,
        });
    }, [score1, score2, socket, currentMatch, courtState, courtNumber, team1?.name, team2?.name]);

    // Helpers
    const changeScore = (team: 1 | 2, delta: number) => {
        const min = team === 1 ? bonus1 : bonus2;
        if (team === 1) setScore1(prev => Math.max(min, prev + delta));
        else setScore2(prev => Math.max(min, prev + delta));
    };

    const changeFoul = (team: 1 | 2, delta: number) => {
        if (team === 1) setFouls1(prev => Math.min(13, Math.max(0, prev + delta)));
        else setFouls2(prev => Math.min(13, Math.max(0, prev + delta)));
    };

    const getFoulStyle = (n: number) => {
        if (n <= 6) return { color: 'inherit', alert: '', alertColor: '' };
        if (n <= 9) return { color: '#ea580c', alert: '2 lancers-francs', alertColor: '#ea580c' };
        return { color: '#dc2626', alert: '2 lancers-francs + possession', alertColor: '#dc2626' };
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const pool = pools.find(p => p.id === (currentMatch as any)?.poolId);
    const category = isFinalPhaseMatch ? categories.find(c => c.id === (currentMatch as FinalMatch)?.categoryId) : categories.find(c => (currentMatch as any)?.poolId?.startsWith(c.id));
    
    const roundNames: Record<FinalMatch['round'], string> = { roundOf32: '16èmes de finale', roundOf16: '8èmes de finale', quarterFinal: 'Quarts de finale', semiFinal: 'Demi-finales', thirdPlace: '3ème place', final: 'Finale' };

    // RENDU
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col font-sans max-w-[500px] mx-auto shadow-xl">
            {/* HEADER */}
            <div className="bg-blue-700 text-white p-4 flex justify-between items-center shrink-0 shadow-md">
                <div>
                    <div className="text-xs opacity-80">Session {currentSession}</div>
                    <div className="text-xl font-bold">Terrain {courtNumber}</div>
                    {isFinalPhaseMatch && (
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>
                            {roundNames[(currentMatch as FinalMatch).round] || 'Phase finale'}
                        </div>
                    )}
                </div>
                <div className={`text-3xl font-mono font-bold ${chronoSec <= 60 ? 'text-yellow-400' : 'text-white'}`}>
                    {formatTime(chronoSec)}
                </div>
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto">

                {/* PAS DE MATCH */}
                {!currentMatch && (
                    <div className="text-center py-12 text-gray-500">
                        <div className="text-lg mb-2">Aucun match prévu</div>
                        <div className="text-sm">Terrain {courtNumber} — Session {currentSession}</div>
                    </div>
                )}

                {/* EN ATTENTE */}
                {currentMatch && courtState === 'waiting' && (
                    <>
                        <div className="text-center text-sm text-gray-500 font-medium">
                            {category?.name}{pool ? ` — Poule ${pools.filter(p => p.id.startsWith(category?.id || '')).indexOf(pool) + 1}` : ''}
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center shadow-sm">
                            <div className="text-xl font-bold dark:text-gray-100">
                                {team1?.name}{bonus1 > 0 && <span className="text-orange-600 text-sm italic ml-1"> (+{bonus1})</span>}
                            </div>
                            <div className="text-sm text-gray-400 my-3 uppercase tracking-wider font-semibold">contre</div>
                            <div className="text-xl font-bold dark:text-gray-100">
                                {team2?.name}{bonus2 > 0 && <span className="text-orange-600 text-sm italic ml-1"> (+{bonus2})</span>}
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 text-center italic">
                            Cliquez quand les deux équipes sont prêtes
                        </div>
                        <button onClick={handleReady} className="p-5 bg-blue-600 text-white rounded-xl text-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                            Équipes prêtes
                        </button>
                    </>
                )}

                {/* EN ATTENTE AUTRES TERRAINS */}
                {currentMatch && courtState === 'ready' && (
                    <div className="text-center py-12 flex flex-col items-center">
                        <div className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                            Signal envoyé
                        </div>
                        <div className="text-sm text-gray-500 mb-6">
                            En attente du lancement par l'admin...
                        </div>
                        <div className="text-5xl animate-bounce">⏳</div>
                    </div>
                )}

                {/* MATCH EN COURS */}
                {currentMatch && courtState === 'match' && (
                    <div className="flex flex-col gap-3">
                        {/* SCORES */}
                        <div className="grid grid-cols-2 gap-3">
                            {[{name: team1?.name, score: score1, bonus: bonus1, fouls: fouls1, team: 1 as const},
                              {name: team2?.name, score: score2, bonus: bonus2, fouls: fouls2, team: 2 as const}]
                            .map((t, i) => (
                                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center shadow-sm">
                                    <div className="text-sm font-bold truncate dark:text-gray-100">
                                        {t.name}
                                    </div>
                                    {t.bonus > 0 && <div className="text-[10px] text-orange-600 font-bold">+{t.bonus} bonus</div>}
                                    <div className="flex items-center justify-center gap-3 my-2">
                                        <button onClick={() => changeScore(t.team, -1)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-2xl font-bold dark:text-gray-100 flex items-center justify-center shadow-sm">−</button>
                                        <span className="text-4xl font-bold min-w-[50px] dark:text-gray-100">{t.score}</span>
                                        <button onClick={() => changeScore(t.team, 1)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-2xl font-bold dark:text-gray-100 flex items-center justify-center shadow-sm">+</button>
                                    </div>
                                    <div className="text-[10px] text-gray-400">min. {t.bonus}</div>
                                </div>
                            ))}
                        </div>

                        {/* FAUTES */}
                        <div className="grid grid-cols-2 gap-3">
                            {[{name: team1?.name, fouls: fouls1, team: 1 as const},
                              {name: team2?.name, fouls: fouls2, team: 2 as const}]
                            .map((t, i) => {
                                const fs = getFoulStyle(t.fouls);
                                return (
                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center shadow-sm">
                                        <div className="text-[10px] text-gray-500 mb-2 truncate uppercase font-bold">Fautes {t.name}</div>
                                        <div className="flex items-center justify-center gap-3 mb-1">
                                            <button onClick={() => changeFoul(t.team, -1)} className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xl font-bold dark:text-gray-100 flex items-center justify-center shadow-sm">−</button>
                                            <span className="text-3xl font-bold min-w-[40px]" style={{ color: fs.color }}>{t.fouls}</span>
                                            <button onClick={() => changeFoul(t.team, 1)} className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xl font-bold dark:text-gray-100 flex items-center justify-center shadow-sm">+</button>
                                        </div>
                                        {fs.alert && <div className="text-[10px] font-bold" style={{ color: fs.alertColor }}>{fs.alert}</div>}
                                    </div>
                                );
                            })}
                        </div>

                        <button onClick={handleSendScore} className="w-full p-4 bg-green-600 text-white rounded-xl text-lg font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all">
                            Envoyer le score
                        </button>
                    </div>
                )}

                {/* FIN */}
                {courtState === 'end' && (
                    <div className="text-center py-6">
                        <div className="text-5xl mb-4">✅</div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Score envoyé</div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-4 shadow-md">
                            <div className="text-5xl font-bold text-blue-600">{score1} / {score2}</div>
                            <div className="text-xs text-gray-400 mt-2 uppercase tracking-widest font-bold">score final</div>
                        </div>
                        <div className="text-sm text-gray-500 mt-6 italic">
                            En attente du prochain match...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourtView;
