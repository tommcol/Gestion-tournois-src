import { tvMoment, tvSettings, tvSessions } from '../utils/tournamentFlow';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTournament, useTournamentSelector, shallowEqual, useOfficialClock } from '../context/TournamentContext';
import { soundManager } from '../assets/sounds';
import NextSessionMatches from './NextSessionMatches';
import PreviousSessionResults from './PreviousSessionResults';
import TVStandings from './TVStandings';
import SponsorDisplay from './SponsorDisplay';
import TVTimer from './TVTimer';
import TVBracket from './TVBracket';
import LiveScoreTicker from './LiveScoreTicker';

interface TVDisplayProps {
    mode?: 'mixed' | 'sponsors_only';
}

const TVDisplay: React.FC = () => {
    const { state, isLoaded, socket } = useTournament();
    const clock = useOfficialClock();
    const { matches, finalMatches, isPoolStageFinished, isFinalPhase, isTournamentStarted, sponsors, currentSession, teams, categories, pools, matchDisplayDuration, sponsorDisplayDuration } = state;
    const moment = tvMoment(state, clock);
    const tvConfig = tvSettings(state, moment);
    const sessions = tvSessions(state, clock);

    const allFinalMatches = useMemo(() => {
        return Object.values(finalMatches).flat();
    }, [finalMatches]);

    // --- ÉTAT DU CYCLE D'AFFICHAGE ---
    const [viewMode, setViewMode] = useState<'matches' | 'results' | 'standings' | 'sponsor'>(isTournamentStarted ? 'matches' : 'sponsor');
    const [lastMainMode, setLastMainMode] = useState<'matches' | 'results' | 'standings'>('matches');
    const [pageIndex, setPageIndex] = useState(0);
    const [sponsorIndex, setSponsorIndex] = useState(0);
    const [audioUnlocked, setAudioUnlocked] = useState(() => {
        return sessionStorage.getItem('tv_audio_unlocked') === 'true';
    });
    const [isMuted, setIsMuted] = useState(soundManager.getMuteState());


    const unlockAudio = async () => {
        await soundManager.ensureContextState();
        // Dispatch event to unlock MusicPlayer specifically
        window.dispatchEvent(new CustomEvent('unlock_music_player'));
        sessionStorage.setItem('tv_audio_unlocked', 'true'); // NOUVEAU
        setAudioUnlocked(true);
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = soundManager.toggleMute();
        setIsMuted(newState);
    };

    // État local pour savoir si le chrono tourne (via les événements réseau)
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isPreStarting, setIsPreStarting] = useState(false);
    const [preStartSponsorIndex, setPreStartSponsorIndex] = useState(0);
    const [pauseTimeLeft, setPauseTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (pauseTimeLeft === null || pauseTimeLeft <= 0) return;
        const interval = setInterval(() => {
            setPauseTimeLeft(prev => {
                if (prev === null || prev <= 1) return null;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [pauseTimeLeft]);

    useEffect(() => {
        if (!clock || clock.session !== currentSession || clock.finals !== isFinalPhase) return;
        setIsTimerActive(['timer_start', 'timer_tick'].includes(clock.type));
        setIsPreStarting(clock.type === 'prestart_begin');
        setPauseTimeLeft(clock.type === 'timer_end' && clock.breakEndsAt ? Math.max(0, Math.ceil((clock.breakEndsAt - Date.now()) / 1000)) : null);
    }, [clock, currentSession, isFinalPhase]);

    useEffect(() => {
        if (clock?.type === 'prestart_begin' && sponsors.length) setPreStartSponsorIndex(Math.floor(Math.random() * sponsors.length));
    }, [clock?.type, clock?.endsAt]);
    useEffect(() => {
        const next = sponsors[(sponsorIndex + 1) % sponsors.length];
        if (!next) return;
        const image = new Image(); image.src = next.logo;
        void image.decode?.().catch(() => {});
    }, [sponsors, sponsorIndex]);


    useEffect(() => {
        const handleTimerEvent = (e: any) => {
            const { type } = e.detail;
            if (type === 'prestart_begin') {
                setIsPreStarting(true);
                setPauseTimeLeft(null); // Arrêter la pause quand le décompte commence
                // Choisir un sponsor aléatoire
                if (sponsors.length > 0) {
                    setPreStartSponsorIndex(Math.floor(Math.random() * sponsors.length));
                }
            }
            if (type === 'whistle') {
                setIsTimerActive(true);
            }
            if (type === 'timer_start') {
                setIsPreStarting(false);
                setIsTimerActive(true);
            }
            if (type === 'timer_pause') setIsTimerActive(false);
            if (type === 'timer_reset') setIsTimerActive(false);
            if (type === 'timer_end') {
                setIsTimerActive(false);
                // Démarrer la minuterie de pause si configurée
                const pauseSec = state.breakDuration || 0;
                if (pauseSec > 0) {
                    setPauseTimeLeft(pauseSec);
                }
            }
        };

        window.addEventListener('tournament_audio_event', handleTimerEvent);

        return () => window.removeEventListener('tournament_audio_event', handleTimerEvent);
    }, [socket, sponsors, state.breakDuration]);

    const currentSessionMatches = useMemo(() => {
        if (isFinalPhase) return Object.values(finalMatches).flat().filter(m => m.sessionNumber === currentSession);
        return matches.filter(m => m.sessionNumber === currentSession);
    }, [matches, finalMatches, isFinalPhase, currentSession]);

    // La session est considérée comme "lancée" si le chrono tourne
    const isCurrentSessionLaunched = useMemo(() => isTimerActive, [isTimerActive]);

    const isCurrentSessionFinished = useMemo(() =>
        currentSessionMatches.length > 0 && currentSessionMatches.every(m => m.status === 'finished'),
    [currentSessionMatches]);

    // Récupération des données
    const displayMatches = useTournamentSelector(current => current.isFinalPhase || current.isPoolStageFinished ? [] : current.matches.filter(m => m.sessionNumber === sessions.next).sort((a, b) => (a.court || 99) - (b.court || 99)), shallowEqual);

    const maxSession = useMemo(() => {
        const allMatches = isFinalPhase
          ? Object.values(finalMatches).flat()
          : matches;
        return Math.max(0, ...allMatches.map(m => m.sessionNumber || 0));
    }, [matches, finalMatches, isFinalPhase]);

    const resultMatches = useTournamentSelector(current => current.isFinalPhase || sessions.results <= 0 ? [] : current.matches.filter(m => m.sessionNumber === sessions.results).sort((a, b) => (a.court || 99) - (b.court || 99)), shallowEqual);
    const resultsData = useMemo(() => ({ matches: resultMatches, sessionNumber: isFinalPhase || sessions.results <= 0 ? 0 : sessions.results }), [resultMatches, isFinalPhase, sessions.results]);

    const isLastPoolSession = useMemo(() => {
        if (isPoolStageFinished || isFinalPhase) return false;
        const poolMatches = matches.filter(m => m.round === 'Pool' || m.round === 'Swiss');
        if (poolMatches.length === 0) return false;
        const maxPoolSession = Math.max(...poolMatches.map(m => m.sessionNumber || 0));
        return currentSession === maxPoolSession;
    }, [matches, currentSession, isFinalPhase]);

    // Calcul du nombre de pages pour chaque vue
    const MATCHES_PER_PAGE = 4;
    const POOLS_PER_PAGE = 6;

    const finalPhaseCategories = useMemo(() => {
        if (!isFinalPhase) return [];
        return categories.filter(cat =>
            allFinalMatches.some(m => m.categoryId === cat.id)
        );
    }, [isFinalPhase, categories, allFinalMatches]);

    const matchesPagesCount = useMemo(() => {
        if (isFinalPhase) return finalPhaseCategories.length || 1;
        return Math.ceil(displayMatches.length / MATCHES_PER_PAGE) || 1;
    }, [displayMatches.length, isFinalPhase, finalPhaseCategories.length]);

    const resultsPagesCount = useMemo(() => {
        return Math.ceil(resultsData.matches.length / MATCHES_PER_PAGE) || 1;
    }, [resultsData.matches.length]);

    const standingsPagesCount = useMemo(() => {
        let count = 0;
        categories.forEach(cat => {
            const catPools = pools.filter(p => p.id.startsWith(cat.id));
            count += Math.ceil(catPools.length / POOLS_PER_PAGE) || 1;
        });
        return count || 1;
    }, [categories, pools]);

    // Conversion en millisecondes (respect strict de la config utilisateur par SLIDE)
    const matchDurationMs = (matchDisplayDuration || 15) * 1000;
    const sponsorDurationMs = (sponsorDisplayDuration || 10) * 1000;

    const currentDurationMs = viewMode === 'sponsor' ? sponsorDurationMs : matchDurationMs;

    const isPoolStageOver = useMemo(() => {
        if (isPoolStageFinished || isFinalPhase) return true;
        const poolMatches = matches.filter(m => m.round === 'Pool' || m.round === 'Swiss');
        return poolMatches.length > 0 && poolMatches.every(m => m.status === 'finished');
    }, [matches, isFinalPhase, isPoolStageFinished]);

    const hasMatches = isTournamentStarted && (
        isFinalPhase
            ? allFinalMatches.length > 0 && tvConfig.showNextMatches
            : (!isPoolStageFinished && displayMatches.length > 0 && (tvConfig?.showNextMatches ?? true))
    );

    const hasResults = isTournamentStarted && !isFinalPhase && resultsData.matches.length > 0 && (tvConfig?.showResults ?? true);

    const hasStandings = isTournamentStarted && !isFinalPhase && pools.length > 0 && (tvConfig?.showStandings ?? true);

    const hasSponsors = sponsors.length > 0 && (tvConfig?.showSponsors ?? true);

    // --- LOGIQUE D'ALTERNANCE ---
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        const getNextMode = (currentMode: string) => {
            // Si le tournoi n'est pas démarré, on reste UNIQUEMENT sur les sponsors
            if (!isTournamentStarted) {
                return hasSponsors ? 'sponsor' : 'matches';
            }

            // Si on vient d'un mode principal et qu'on a des sponsors, on montre UN sponsor
            if (currentMode !== 'sponsor' && hasSponsors) {
                return 'sponsor';
            }

            // Sinon (on vient de sponsor ou on n'en a pas), on cherche le mode principal suivant
            const mainMode = currentMode === 'sponsor' ? lastMainMode : currentMode as 'matches' | 'results' | 'standings';

            if (mainMode === 'matches') {
                if (hasResults) return 'results';
                if (hasStandings) return 'standings';
                if (hasMatches) return 'matches';
            }
            if (mainMode === 'results') {
                if (hasStandings) return 'standings';
                if (hasMatches) return 'matches';
                if (hasResults) return 'results';
            }
            if (mainMode === 'standings') {
                if (hasMatches) return 'matches';
                if (hasResults) return 'results';
                if (hasStandings) return 'standings';
            }
            return 'matches';
        };

        const cycle = () => {
            // 1. Gérer les sous-pages d'abord
            if (viewMode === 'matches' && pageIndex < matchesPagesCount - 1) {
                setPageIndex(prev => prev + 1);
            } else if (viewMode === 'results' && pageIndex < resultsPagesCount - 1) {
                setPageIndex(prev => prev + 1);
            } else if (viewMode === 'standings' && pageIndex < standingsPagesCount - 1) {
                setPageIndex(prev => prev + 1);
            } else {
                // 2. Passer au mode suivant si plus de pages
                const nextMode = getNextMode(viewMode);

                // Sauvegarder le mode principal si on le quitte
                if (viewMode !== 'sponsor') {
                    setLastMainMode(viewMode);
                } else {
                    // Si on quitte le mode sponsor, on passe au sponsor suivant pour la prochaine fois
                    setSponsorIndex(prev => sponsors.length ? (prev + 1) % sponsors.length : 0);
                }

                setViewMode(nextMode);
                setPageIndex(0);
            }
        };

        timer = setTimeout(cycle, currentDurationMs);
        return () => { if (timer) clearTimeout(timer); };
    }, [viewMode, pageIndex, sponsorIndex, hasMatches, hasResults, hasStandings, hasSponsors, currentDurationMs, matchesPagesCount, resultsPagesCount, standingsPagesCount, sponsors.length]);

    // Une case décochée ne doit pas laisser un écran vide jusqu'au prochain cycle.
    useEffect(() => {
        const available = { matches: hasMatches, results: hasResults, standings: hasStandings, sponsor: hasSponsors };
        if (!available[viewMode]) {
            const next = hasMatches ? 'matches' : hasResults ? 'results' : hasStandings ? 'standings' : 'sponsor';
            setViewMode(next); setPageIndex(0);
        }
    }, [hasMatches, hasResults, hasStandings, hasSponsors, viewMode]);

    // Reset to matches view when session changes
    useEffect(() => {
        if (hasMatches) {
            setViewMode('matches');
            setPageIndex(0);
        }
    }, [currentSession]);

    const getTeam = useCallback((teamId: string) => teams.find(t => t.id === teamId), [teams]);

    const showReferee = true;
    const showScorer = true;

    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const targetW = 1920;
            const targetH = 1080;
            const s = Math.min(w / targetW, h / targetH);
            setScale(s);
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    if (!isLoaded) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="text-blue-400 text-2xl font-bold">Chargement...</div>
                </div>
            </div>
        );
    }

    if (!audioUnlocked) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center text-white p-8">
                <button
                    onClick={unlockAudio}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-4xl font-black py-12 px-24 rounded-3xl shadow-2xl transform transition hover:scale-105 uppercase tracking-tighter"
                >
                    Démarrer l'affichage TV
                    <div className="text-xl font-normal mt-4 opacity-80">(Active le son et la musique)</div>
                </button>
            </div>
        );
    }

    if (!hasMatches && !hasResults && !hasStandings && !hasSponsors) {
         return (
            <div className="w-screen h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center max-w-2xl p-8 bg-gray-800 rounded-lg shadow-xl">
                    <h1 className="text-4xl font-bold mb-4">Mode TV</h1>
                    <p className="text-gray-400">Aucun contenu n'est sélectionné pour l'affichage TV dans les paramètres.</p>
                </div>
            </div>
        );
    }

    return (
         <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none">
            <div
                style={{
                    width: '1920px',
                    height: '1080px',
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                }}
                className="tv-canvas bg-slate-900 text-white flex flex-col font-sans shrink-0 relative overflow-hidden shadow-2xl"
            >
                {/* ZONE PRINCIPALE (HAUT) */}
                <main className="flex-1 overflow-hidden relative">
                    <div className="w-full h-full">
                            {viewMode === 'matches' && hasMatches ? (
                                <div className="p-8 h-full">
                                    {isFinalPhase ? (
                                        <TVBracket
                                            category={finalPhaseCategories[pageIndex % finalPhaseCategories.length]}
                                            finalMatches={allFinalMatches}
                                            teams={teams}
                                        />
                                    ) : (
                                        <NextSessionMatches
                                            key={`matches-session-${isCurrentSessionLaunched ? currentSession + 1 : currentSession}`}
                                            matches={displayMatches}
                                            teams={teams}
                                            categories={categories}
                                            sessionNumber={isCurrentSessionLaunched ? currentSession + 1 : currentSession}
                                            getTeam={getTeam}
                                            page={pageIndex}
                                            showReferee={showReferee}
                                            showScorer={showScorer}
                                        />
                                    )}
                                </div>
                            ) : viewMode === 'results' && hasResults ? (
                                <div className="p-8 h-full">
                                    <PreviousSessionResults
                                        key={`results-session-${resultsData.sessionNumber}`}
                                        matches={resultsData.matches}
                                        teams={teams}
                                        categories={categories}
                                        sessionNumber={resultsData.sessionNumber}
                                        getTeam={getTeam}
                                        page={pageIndex}
                                    />
                                </div>
                            ) : viewMode === 'standings' && hasStandings ? (
                                <div className="p-8 h-full overflow-hidden">
                                    <TVStandings isFinal={isPoolStageOver} pageIndex={pageIndex} setPageIndex={setPageIndex} />
                                </div>
                            ) : viewMode === 'sponsor' && hasSponsors ? (
                                <div className="h-full">
                                    <SponsorDisplay
                                        key={`sponsor-${sponsors[sponsorIndex % sponsors.length].id}`}
                                        sponsor={sponsors[sponsorIndex % sponsors.length]}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="bg-blue-500/20 px-12 py-6 rounded-full text-2xl text-blue-400 font-bold uppercase tracking-widest border border-blue-500/30">
                                            Chargement du cycle...
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>

                    {/* OVERLAY POUR TOURNOI NON DÉMARRÉ */}
                    {!isTournamentStarted && viewMode !== 'sponsor' && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-16">
                            <div className="text-center bg-slate-800/50 p-16 rounded-3xl border border-white/10 shadow-2xl">
                                <h1 className="text-7xl font-black mb-6 tracking-tighter uppercase italic text-blue-500 leading-none">
                                    {state.tournamentName || "Tournoi Pro"}
                                </h1>
                                <div className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent w-full mb-8"></div>
                                <p className="text-3xl text-slate-300 font-medium tracking-wide">Le tournoi n'a pas encore commencé</p>
                            </div>
                        </div>
                    )}

                    {/* ICÔNE SON - Overlay haut droite */}
                    <div className="absolute top-4 right-4 z-50">
                        <button
                            onClick={toggleMute}
                            className={`p-3 rounded-full border transition-all ${
                                isMuted
                                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                    : 'bg-black/30 border-white/10 text-white/30 hover:text-white/60'
                            }`}
                            title={isMuted ? 'Réactiver le son' : 'Couper le son'}
                        >
                            {isMuted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {isPreStarting && tvConfig.showStartSponsor && (
                        <div className="tv-prestart absolute inset-0 z-40 flex flex-col items-center justify-center"
                            style={{ background: 'rgba(2,6,23,0.97)' }}
                        >
                            {/* Session */}
                            <div className="text-7xl font-black text-white uppercase tracking-wider mb-6">
                                Session {currentSession}
                            </div>

                            {/* Phrase partenaire */}
                            <div className="text-4xl text-slate-400 font-semibold mb-10 text-center">
                                Avec notre partenaire
                            </div>

                            {/* Logo sponsor aléatoire */}
                            {sponsors.length > 0 && sponsors[preStartSponsorIndex] && (
                                <div className="bg-white rounded-3xl p-8 max-w-[800px] max-h-[350px] flex items-center justify-center shadow-2xl">
                                    <img
                                        src={sponsors[preStartSponsorIndex].logo}
                                        alt={sponsors[preStartSponsorIndex].name}
                                        className="max-w-full max-h-[280px] object-contain"
                                    />
                                </div>
                            )}

                            {/* Si pas de sponsor */}
                            {sponsors.length === 0 && (
                                <div className="text-5xl text-blue-400 font-black">
                                    S.R.C Basket 🏀
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* PIED DE PAGE TV (BAS) */}
                <footer className="h-[108px] bg-black border-t border-white/5 flex items-center overflow-hidden shrink-0 relative shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                    {/* CHRONOMÈTRE BLOQUÉ À GAUCHE */}
                    {tvConfig.showChronoOnTv && <div className="tv-clock w-[288px] h-full bg-blue-700 flex flex-col items-center justify-center border-r border-blue-500/50 shadow-[10px_0_25px_rgba(0,0,0,0.4)] z-20 shrink-0">
                        <div className="text-xs uppercase font-black tracking-[0.3em] text-blue-200 mb-0.5 opacity-80">Chrono</div>
                        <TVTimer />
                    </div>}

                    {/* SCORES EN DIRECT DÉFILANTS (MARQUEE) */}
                    <LiveScoreTicker showLiveScores={tvConfig.showLiveScores ?? false} poolsOver={moment === 'poolsOver'} pauseTimeLeft={pauseTimeLeft} tournamentName={state.tournamentName} />

                    {/* BOUTON MUTE / INFOS */}
                    <div className="w-[160px] shrink-0 h-full flex items-center justify-center px-4 border-l border-white/5 bg-black/50 z-20">
                        <div className="flex flex-col items-center justify-center h-full">
                            {isFinalPhase ? (
                                <>
                                    <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">
                                        PHASES
                                    </div>
                                    <div className="text-xl font-black text-purple-300 leading-none uppercase">
                                        FINALES
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">
                                        SESSION
                                    </div>
                                    <div className="text-4xl font-black text-white leading-none">
                                        {currentSession}
                                    </div>
                                </>
                            )}
                            <div className="text-[9px] text-slate-600 font-bold tracking-widest uppercase mt-1">V 2.5</div>
                        </div>
                    </div>
                </footer>
            </div>
         </div>
    );
};

export default TVDisplay;

