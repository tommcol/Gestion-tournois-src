import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { soundManager } from '../assets/sounds';

const GlobalTimer: React.FC = () => {
    const { state, emitAudioEvent, dispatch, clock } = useTournament();
    const { timerDuration, soundConfig, isTournamentStarted } = state;
    const passive = new URLSearchParams(window.location.search).get('view')?.startsWith('tv') || new URLSearchParams(window.location.search).get('view') === 'court';
    const [now, setNow] = useState(Date.now());
    const current = clock?.session === state.currentSession && clock.finals === state.isFinalPhase ? clock : null;
    const isRunning = !!current && ['timer_start', 'timer_tick'].includes(current.type);
    const isPreStarting = current?.type === 'prestart_begin';
    const timeLeft = current?.type === 'timer_end' ? 0 : isRunning && current?.endsAt ? Math.max(0, Math.ceil((current.endsAt - now) / 1000)) : current?.payload?.timeLeft ?? timerDuration;
    const preStartCount = current?.endsAt ? Math.max(0, Math.ceil((current.endsAt - now) / 1000)) : 5;
    const latest = useRef({ current, state, emitAudioEvent });
    latest.current = { current, state, emitAudioEvent };
    const starting = useRef(false);
    const lastTick = useRef('');
    const endedAt = useRef<number | null>(null);
    useEffect(() => {
        const interval = setInterval(() => {
            const wallTime = Date.now(); setNow(wallTime);
            if (passive) return;
            const { current: c, state: st, emitAudioEvent: emit } = latest.current;
            if (!c) return;
            if (c.type === 'prestart_begin' && c.endsAt && c.endsAt <= wallTime && !starting.current) {
                starting.current = true;
                emit({ type: 'whistle', payload: st.soundConfig?.start });
                soundManager.playWhistle(st.soundConfig?.start).then(() => {
                    const active = latest.current.current;
                    if (active?.type === 'prestart_begin' && active.endsAt === c.endsAt) emit({ type: 'timer_start', payload: { timeLeft: st.timerDuration } });
                    starting.current = false;
                }).catch(() => { starting.current = false; });
            }
            if (!['timer_start', 'timer_tick'].includes(c.type) || !c.endsAt) return;
            const seconds = Math.max(0, Math.ceil((c.endsAt - wallTime) / 1000));
            const key = `${c.endsAt}:${seconds}`;
            if (lastTick.current === key) return;
            lastTick.current = key;
            if (!seconds) {
                if (endedAt.current !== c.endsAt) { endedAt.current = c.endsAt; emit({ type: 'timer_end' }); }
                return;
            }
            emit({ type: 'timer_tick', payload: { timeLeft: seconds } });
            if (seconds === 10) { soundManager.playAirHorn(st.soundConfig?.end); emit({ type: 'airhorn', payload: st.soundConfig?.end }); }
            else if (seconds === 60) { soundManager.playOneMinute(st.soundConfig?.oneMinute); emit({ type: 'oneMinute', payload: st.soundConfig?.oneMinute }); }
            else if (seconds % 60 === 0 && seconds !== st.timerDuration) { soundManager.playBeep(880, 0.1, 'sine', true); emit({ type: 'beep' }); }
        }, 100);
        return () => clearInterval(interval);
    }, []);
    const handleStartPause = async () => {
        if (!isTournamentStarted) {
            if (!window.confirm('Le tournoi n’est pas encore démarré. Démarrer maintenant ?')) return;
            dispatch({ type: 'START_TOURNAMENT' });
        }
        await soundManager.ensureContextState();
        if (isRunning) latest.current.emitAudioEvent({ type: 'timer_pause' });
        else if (!isPreStarting) {
            if (!current || current.type === 'timer_end' || current.type === 'timer_reset') latest.current.emitAudioEvent({ type: 'prestart_begin' });
            else latest.current.emitAudioEvent({ type: 'timer_start', payload: { timeLeft } });
        }
    };
    const handleReset = () => { starting.current = false; emitAudioEvent({ type: 'timer_reset', payload: { timeLeft: timerDuration } }); };
    const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

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

