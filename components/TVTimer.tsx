import React, { useState, useEffect } from 'react';
import { useTournament, useOfficialClock } from '../context/TournamentContext';

export default function TVTimer() {
  const { state } = useTournament();
  const clock = useOfficialClock();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const relevant = clock?.session === state.currentSession && clock.finals === state.isFinalPhase;
  const running = relevant && ['timer_start', 'timer_tick'].includes(clock.type);
  const remaining = relevant && clock.type === 'timer_end' ? 0 : running && clock.endsAt ? Math.max(0, Math.ceil((clock.endsAt - now) / 1000)) : relevant ? clock.payload?.timeLeft ?? state.timerDuration : state.timerDuration;
  return <div className={`text-5xl font-mono font-black leading-none tracking-tight ${remaining <= 10 ? 'text-red-400' : 'text-white'}`}>{relevant && clock.type === 'prestart_begin' ? 'Prêts…' : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`}</div>;
}
