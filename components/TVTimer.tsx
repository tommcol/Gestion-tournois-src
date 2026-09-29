
import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';

const TVTimer: React.FC = () => {
    const { state } = useTournament();
    const { timerDuration } = state;
    
    const [timeLeft, setTimeLeft] = useState(timerDuration);
    const [isRunning, setIsRunning] = useState(false);
    const [isPreStarting, setIsPreStarting] = useState(false);
    const [preStartCount, setPreStartCount] = useState(5);

    const timerRef = useRef<number | null>(null);
    const preStartRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isRunning && !isPreStarting) {
            setTimeLeft(timerDuration);
        }
    }, [timerDuration, isRunning, isPreStarting]);

    useEffect(() => {
        const handleRemoteAudio = (e: any) => {
            const { type, payload } = e.detail;
            
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
                setIsPreStarting(false);
                setPreStartCount(0);
            }
        };

        window.addEventListener('tournament_audio_event', handleRemoteAudio);
        return () => window.removeEventListener('tournament_audio_event', handleRemoteAudio);
    }, [timerDuration]);

    useEffect(() => {
        if (isRunning) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 0) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        setIsRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning]);

    useEffect(() => {
        if (isPreStarting) {
            preStartRef.current = window.setInterval(() => {
                setPreStartCount(prev => {
                    if (prev <= 1) {
                        if (preStartRef.current) clearInterval(preStartRef.current);
                        setIsPreStarting(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (preStartRef.current) clearInterval(preStartRef.current);
        }
    }, [isPreStarting]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    let colorClass = "text-white";
    if (isPreStarting) colorClass = "text-orange-400 animate-pulse";
    else if (timeLeft <= 10 && timeLeft > 0) colorClass = "text-red-400 animate-pulse";
    else if (timeLeft === 0) colorClass = "text-red-500 font-black";

    return (
        <div className={`text-[4.5vh] font-mono font-bold leading-none translate-y-[0.2vh] tracking-tight ${colorClass}`}>
            {isPreStarting ? `-${preStartCount}s` : formatTime(timeLeft)}
        </div>
    );
};

export default TVTimer;
