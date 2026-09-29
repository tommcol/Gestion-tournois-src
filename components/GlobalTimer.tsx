
import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { soundManager } from '../assets/sounds';

const GlobalTimer: React.FC = () => {
    const { state, emitAudioEvent, dispatch } = useTournament();
    const { timerDuration, soundConfig, isTournamentStarted } = state;
    
    const isTvMode = window.location.search.includes('view=tv');
    
    const safeEmitAudioEvent = (event: any) => {
        if (!isTvMode) emitAudioEventRef.current(event);
    };

    const [timeLeft, setTimeLeft] = useState(timerDuration);
    const [isRunning, setIsRunning] = useState(false);
    
    // États pour le décompte de départ (5 secondes)
    const [isPreStarting, setIsPreStarting] = useState(false);
    const [preStartCount, setPreStartCount] = useState(5);

    const timerRef = useRef<number | null>(null);
    const preStartRef = useRef<number | null>(null);

    const soundConfigRef = useRef(soundConfig);
    const emitAudioEventRef = useRef(emitAudioEvent);
    const timerDurationRef = useRef(timerDuration);

    // Maintenir les refs à jour sans déclencher de re-render
    useEffect(() => { soundConfigRef.current = soundConfig; }, [soundConfig]);
    useEffect(() => { emitAudioEventRef.current = emitAudioEvent; }, [emitAudioEvent]);
    useEffect(() => { timerDurationRef.current = timerDuration; }, [timerDuration]);

    // Listen for remote audio events
    useEffect(() => {
        const handleRemoteAudio = (e: any) => {
            // SEULE LA TV RÉAGIT AUX ÉVÉNEMENTS RÉSEAU POUR ÉVITER LES DOUBLONS SUR LE PC
            if (!isTvMode) return;

            const { type, payload } = e.detail;
            console.log(`TV Sound Event Received: ${type}`);
            
            if (type === 'timer_start') {
                setIsRunning(true);
                setTimeLeft(payload.timeLeft);
            } else if (type === 'timer_tick') {
                setTimeLeft(payload.timeLeft);
            } else if (type === 'timer_pause') {
                setIsRunning(false);
            } else if (type === 'timer_reset') {
                setIsRunning(false);
                setIsPreStarting(false);
                setTimeLeft(timerDuration);
                setPreStartCount(5);
            } else if (type === 'prestart_begin') {
                setIsPreStarting(true);
                setPreStartCount(5);
            } else if (type === 'whistle') {
                // On TV, we only update the pre-start state, NO SOUND
                setIsPreStarting(false);
                setPreStartCount(0);
            }
        };

        window.addEventListener('tournament_audio_event', handleRemoteAudio);
        return () => window.removeEventListener('tournament_audio_event', handleRemoteAudio);
    }, [isTvMode, soundConfig, timerDuration]);

    // Logique du timer principal
    useEffect(() => {
        if (isRunning && !isTvMode) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    const newTime = prev - 1;

                    if (!isTvMode) {
                        safeEmitAudioEvent({ type: 'timer_tick', payload: { timeLeft: newTime } });
                    }

                    // Corne de fin à 10 secondes de la fin
                    if (newTime === 10 && !isTvMode) {
                        soundManager.playAirHorn(soundConfigRef.current?.end);
                        safeEmitAudioEvent({ type: 'airhorn', payload: soundConfigRef.current?.end });
                    }

                    // Gestion des bips chaque minute
                    if (newTime > 0 && newTime % 60 === 0 && newTime !== timerDuration && !isTvMode) {
                        // Annonce spécifique à 1 minute (60 secondes)
                        if (newTime === 60) {
                            soundManager.playOneMinute(soundConfigRef.current?.oneMinute);
                            safeEmitAudioEvent({ type: 'oneMinute', payload: soundConfigRef.current?.oneMinute });
                        } else if (newTime !== 10) { 
                             // Bip simple pour les autres minutes
                            soundManager.playBeep(880, 0.1, 'sine', true);
                            safeEmitAudioEvent({ type: 'beep' });
                        }
                    }

                    // Fin du temps
                    if (newTime <= 0) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        setIsRunning(false);
                        safeEmitAudioEvent({ type: 'timer_end' });
                        // Remettre à la durée initiale après 2 secondes
                        // pour laisser voir le 00:00 puis revenir à l'état prêt
                        setTimeout(() => {
                            setTimeLeft(timerDurationRef.current);
                        }, 2000);
                        return 0;
                    }
                    
                    return newTime;
                });
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, timerDuration, isTvMode]);

    // Logique du décompte de départ (Pre-start)
    useEffect(() => {
        if (isPreStarting) {
            preStartRef.current = window.setInterval(() => {
                setPreStartCount(prev => {
                    const newCount = prev - 1;
                    
                    if (newCount === 0) {
                        if (preStartRef.current) clearInterval(preStartRef.current);
                        setIsPreStarting(false);
                        
                        if (!isTvMode) {
                            // On envoie l'ordre à la TV IMMÉDIATEMENT
                            safeEmitAudioEvent({ type: 'whistle', payload: soundConfigRef.current?.start });
                            
                            // On joue localement et on attend la fin du son pour démarrer le chrono
                            soundManager.playWhistle(soundConfigRef.current?.start).then(() => {
                                setIsRunning(true); 
                                safeEmitAudioEvent({ type: 'timer_start', payload: { timeLeft } });
                            });
                        }
                    }
                    return newCount;
                });
            }, 1000);
        }

        return () => {
             if (preStartRef.current) clearInterval(preStartRef.current);
        }
    }, [isPreStarting, isTvMode]);

    const prevDurationRef = useRef(timerDuration);

    // Synchronisation si la durée change dans la config (seulement si pas en cours)
    useEffect(() => {
        // Ne réinitialiser que si la durée a vraiment changé dans la config
        if (timerDuration !== prevDurationRef.current) {
            prevDurationRef.current = timerDuration;
            if (!isRunning && !isPreStarting) {
                setTimeLeft(timerDuration);
            }
        }
    }, [timerDuration, isRunning, isPreStarting]);

    const handleStartPause = async () => {
        if (!isTournamentStarted) {
            const confirmStart = window.confirm(
                'Le tournoi n\'est pas encore démarré. Démarrer maintenant ?'
            );
            if (!confirmStart) return;
            dispatch({ type: 'START_TOURNAMENT' });
            // Petit délai pour laisser le state se propager avant de lancer le chrono
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        await soundManager.ensureContextState();

        if (timeLeft <= 0) return;

        if (isRunning) {
            setIsRunning(false);
            safeEmitAudioEvent({ type: 'timer_pause' });
        } else {
            if (timeLeft === timerDuration && !isPreStarting) {
                setPreStartCount(5);
                setIsPreStarting(true);
                safeEmitAudioEvent({ type: 'prestart_begin' });
            } else if (!isPreStarting) {
                // Démarrage immédiat (sans pré-start)
                if (!isTvMode) {
                    safeEmitAudioEvent({ type: 'whistle', payload: soundConfig?.start });
                    soundManager.playWhistle(soundConfig?.start).then(() => {
                        setIsRunning(true);
                        safeEmitAudioEvent({ type: 'timer_start', payload: { timeLeft } });
                    });
                }
            }
        }
    };
    
    const handleReset = () => {
        setIsRunning(false);
        setIsPreStarting(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (preStartRef.current) clearInterval(preStartRef.current);
        
        setTimeLeft(timerDuration);
        setPreStartCount(5);
        safeEmitAudioEvent({ type: 'timer_reset' });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Couleur du texte change selon l'état mais toujours blanc par défaut
    let timeColorClass = "text-white";
    if (isPreStarting) timeColorClass = "text-orange-500 animate-pulse";
    else if (timeLeft <= 10) timeColorClass = "text-red-600 animate-pulse"; 
    
    return (
        <div className="flex items-center space-x-4">
            <div className={`text-4xl font-mono font-bold w-32 text-center transition-colors duration-300 ${timeColorClass}`} aria-live="polite">
                {isPreStarting ? `-${preStartCount}s` : formatTime(timeLeft)}
            </div>
            <div className="flex flex-col space-y-1">
                <button
                    onClick={handleStartPause}
                    disabled={isPreStarting}
                    aria-label={isRunning ? 'Mettre en pause' : 'Démarrer'}
                    className={`w-24 py-1 px-2 rounded-md text-sm font-semibold transition-colors ${
                        isPreStarting
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : isRunning 
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                    {isRunning ? 'Pause' : isPreStarting ? 'Prêt...' : 'Start'}
                </button>
                <button
                    onClick={handleReset}
                    aria-label="Réinitialiser"
                    className="py-1 px-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default GlobalTimer;
