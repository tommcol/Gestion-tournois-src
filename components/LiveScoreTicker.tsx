import React, { useSyncExternalStore } from 'react';
import { liveScoresChannel } from '../services/liveScoresChannel';
import { createLiveScoreStore, LiveScore } from '../utils/liveScores';

const LiveScoreItem = React.memo(function LiveScoreItem({ score }: { score: LiveScore }) {
    return (
<div className="flex items-center gap-4 shrink-0">
                                                <div className="flex flex-col items-start">
                                                    <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 uppercase leading-none mb-1">Terrain</span>
                                                    <span className="text-2xl font-black text-white leading-none">{score.court}</span>
                                                </div>
                                                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                                    <span className="text-xl font-bold text-slate-100 max-w-[200px] truncate">{score.team1Name}</span>
                                                    <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-md border border-white/10 ring-1 ring-white/5">
                                                        <span className="text-3xl font-mono font-black text-blue-400 leading-none">{score.score1}</span>
                                                        <span className="text-lg text-slate-600 font-bold">:</span>
                                                        <span className="text-3xl font-mono font-black text-blue-400 leading-none">{score.score2}</span>
                                                    </div>
                                                    <span className="text-xl font-bold text-slate-100 max-w-[200px] truncate">{score.team2Name}</span>
                                                </div>
                                            </div>
    );
});
interface Props {
    showLiveScores: boolean; poolsOver: boolean; pauseTimeLeft: number | null; tournamentName: string;
    channel?: ReturnType<typeof createLiveScoreStore>;
}
function LiveScoreTicker({ showLiveScores, poolsOver, pauseTimeLeft, tournamentName, channel = liveScoresChannel }: Props) {
    const liveScores = useSyncExternalStore(channel.subscribe, channel.getSnapshot, channel.getSnapshot);
    const formatPause = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    return (
                    <div className="flex-1 h-full relative overflow-hidden flex items-center bg-[#020617] group">
                        {!poolsOver && pauseTimeLeft !== null && pauseTimeLeft > 0 ? (
                            // Minuterie de pause
                            <div className="flex-1 flex items-center justify-center gap-4">
                                <span className="text-xl text-amber-400 font-black">
                                    ⏸ Pause
                                </span>
                                <span className="text-2xl text-white font-black font-mono">
                                    {formatPause(pauseTimeLeft)}
                                </span>
                                <span className="text-base text-slate-400">
                                    — Prochain match dans {formatPause(pauseTimeLeft)}
                                </span>
                            </div>
                        ) : liveScores.length > 0 && showLiveScores ? (
                            <div
                                className="marquee-content animate-marquee"
                                style={{ '--marquee-duration': `${Math.max(15, liveScores.length * 6)}s` } as any}
                            >
                                {Array.from({ length: 2 }).map((_, copyIdx) => (
                                    <div key={`copy-${copyIdx}`} className="flex items-center gap-16 pr-16 shrink-0">
                                        {liveScores.map((s, idx) => (
                                            <LiveScoreItem key={s.court} score={s} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-black text-white/10 tracking-[1.5em] uppercase pointer-events-none">
                                    {tournamentName || "Tournoi Pro"} — Affichage Officiel
                                </span>
                            </div>
                        )}
                    </div>

    );
}
export default React.memo(LiveScoreTicker);
