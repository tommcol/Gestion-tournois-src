
import React, { useState, useMemo, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import ScoreDialog from './ScoreDialog';
import { Match, FinalMatch, Category, Player, Team } from '../types';
import { getAdminTeamName } from '../utils/helpers';

const GlobalSchedule: React.FC = () => {
  const { state, dispatch, socket } = useTournament();
  const { categories, teams, matches, pools, currentSession: currentSessionState, isPoolStageFinished, isTournamentStarted, numberOfCourts } = state;
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [readyCourts, setReadyCourts] = useState<number[]>([]);
  const [showTVControls, setShowTVControls] = useState(false);
  const [showAllReadyPopup, setShowAllReadyPopup] = useState(false);

  useEffect(() => {
      if (readyCourts.length > 0 && readyCourts.length >= state.numberOfCourts) {
          setShowAllReadyPopup(true);
          // Disparaît automatiquement après 8 secondes
          const timeout = setTimeout(() => setShowAllReadyPopup(false), 8000);
          return () => clearTimeout(timeout);
      }
  }, [readyCourts.length, state.numberOfCourts]);

  useEffect(() => {
      if (!socket) return;
      socket.on('court_ready_update', (data) => {
          setReadyCourts(data.readyCourts);
      });
      socket.on('courts_reset', () => setReadyCourts([]));
      return () => {
          socket.off('court_ready_update');
          socket.off('courts_reset');
      };
  }, [socket]);

  // A) State for quick scores
  const [quickScores, setQuickScores] = useState<Record<string, { s1: number, s2: number }>>({});

  const getQuickScore = (matchId: string) => quickScores[matchId] || { s1: 0, s2: 0 };

  const handleQuickScore = (matchId: string, team: 1 | 2, delta: number) => {
    setQuickScores(prev => {
        const current = prev[matchId] || { s1: 0, s2: 0 };
        return {
            ...prev,
            [matchId]: {
                s1: team === 1 ? Math.max(0, current.s1 + delta) : current.s1,
                s2: team === 2 ? Math.max(0, current.s2 + delta) : current.s2,
            }
        };
    });
  };

  const handleQuickValidate = (match: Match) => {
    const qs = getQuickScore(match.id);
    dispatch({ type: 'UPDATE_MATCH_SCORE', payload: { matchId: match.id, score1: qs.s1, score2: qs.s2 } });
    setQuickScores(prev => { 
        const next = { ...prev }; 
        delete next[match.id]; 
        return next; 
    });
  };

  const currentSession = useMemo(() => {
    // Utiliser la session active du contrôle, pas la plus petite session pending
    return currentSessionState ?? null;
  }, [currentSessionState]);

  const getTeam = (teamId: string) => teams.find(t => t.id === teamId);

  const playerInfoMap = useMemo(() => {
    const map = new Map<string, { player: Player; team: Team; category: Category }>();
    const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]));
    teams.forEach(team => {
        const category = categoryMap.get(team.categoryId);
        if (category) {
            team.players.forEach(player => {
                map.set(player.id, { player, team, category });
            });
        }
    });
    return map;
  }, [teams, categories]);

  const renderOfficial = (playerId: string | null) => {
    if (!playerId) return '-';
    if (playerId === 'Staff') {
        return (
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0 bg-red-500"></span>
                <span className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wider text-[10px]">Staff</span>
            </div>
        );
    }
    const info = playerInfoMap.get(playerId);
    if (!info) return 'Inconnu';

    const { player, team, category } = info;
    return (
        <div className="flex items-center gap-2">
            <span style={{ backgroundColor: category.color }} className="w-3 h-3 rounded-full flex-shrink-0" title={category.name}></span>
            <span>{player.firstName} {player.lastName.charAt(0)}. <span className="text-gray-500 dark:text-gray-400">({team.name})</span></span>
        </div>
    );
  };
  
  const getCategoryForTeam = (teamId: string): Category | undefined => {
    const team = getTeam(teamId);
    if (!team) return undefined;
    return categories.find(c => c.id === team.categoryId);
  };

  const matchesBySession = useMemo(() => {
    const allMatches = matches.filter(m => m.round === 'Pool' || m.round === 'Swiss');

    const grouped: Record<string, Match[]> = {};
    for (const match of allMatches) {
        const sessionKey = match.sessionNumber?.toString() || 'unscheduled';
        if (!grouped[sessionKey]) {
            grouped[sessionKey] = [];
        }
        grouped[sessionKey].push(match);
    }

    Object.values(grouped).forEach(sessionMatches => {
        sessionMatches.sort((a, b) => (a.court || 99) - (b.court || 99));
    });

    return Object.entries(grouped).sort((a, b) => {
        const keyA = a[0];
        const keyB = b[0];
        if (keyA === 'unscheduled') return 1;
        if (keyB === 'unscheduled') return -1;
        return Number(keyA) - Number(keyB);
    });
  }, [matches]);

  const hasBeenScheduled = useMemo(() => {
      return matches.some(m => m.sessionNumber);
  }, [matches]);

  const team1 = editingMatch?.team1Id ? getTeam(editingMatch.team1Id) : null;
  const team2 = editingMatch?.team2Id ? getTeam(editingMatch.team2Id) : null;
  
  const handleNextSession = () => {
      dispatch({ type: 'NEXT_SESSION' });
  };
  
  const handleResetSessions = () => {
      if(window.confirm("Êtes-vous sûr de vouloir réinitialiser complètement le calendrier ? Tous les matchs seront déprogrammés et les scores effacés.")) {
          dispatch({ type: 'RESET_SESSIONS' });
      }
  };

  const handleStartTournament = () => {
      dispatch({ type: 'START_TOURNAMENT' });
  };

  const maxSession = useMemo(() => {
      return Math.max(0, ...matches.map(m => m.sessionNumber || 0));
  }, [matches]);

  // B) HEURE DE FIN ESTIMÉE
  const estimatedEndTime = useMemo(() => {
    if (!isTournamentStarted || !currentSessionState || !maxSession) return null;
    
    const sessionsRemaining = maxSession - currentSessionState + 1;
    const sessionDurationSeconds = (state.timerDuration || 600) + (state.breakDuration || 60);
    const totalSecondsRemaining = sessionsRemaining * sessionDurationSeconds;
    
    const now = new Date();
    const endTime = new Date(now.getTime() + totalSecondsRemaining * 1000);
    
    return endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }, [currentSessionState, maxSession, state.timerDuration, state.breakDuration, isTournamentStarted]);

  const handleFinishPoolStage = () => {
      if (window.confirm("Voulez-vous clôturer la phase de poules ? Le chronomètre sera mis à jour pour les finales, mais l'affichage TV restera sur les classements de poules.")) {
          dispatch({ type: 'FINISH_POOL_STAGE' });
      }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Calendrier Global des Matchs</h1>
        <div className="flex items-center gap-4">
            <button
                onClick={() => setShowTVControls(!showTVControls)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold transition-all ${
                    showTVControls
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                }`}
            >
                📺 Contrôle TV
            </button>
            {isPoolStageFinished && (
                <span className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-4 py-2 rounded-full font-bold uppercase tracking-widest text-sm border-2 border-green-300 dark:border-green-700">
                    Phase de poules terminée
                </span>
            )}
        </div>
      </div>

      {showTVControls && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-sm text-blue-700 dark:text-blue-300 mb-3">📺 Contenu de l'affichage TV</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                      { key: 'showNextMatches', label: 'Prochains matchs', icon: '🗓️' },
                      { key: 'showResults', label: 'Résultats', icon: '🏅' },
                      { key: 'showStandings', label: 'Classements', icon: '📊' },
                      { key: 'showSponsors', label: 'Sponsors', icon: '🏢' },
                      { key: 'showLiveScores', label: 'Scores en direct', icon: '🔴', disabled: !state.enableCourtView },
                  ].map(item => (
                      <button
                          key={item.key}
                          disabled={item.disabled}
                          onClick={() => {
                              if (item.disabled) return;
                              const newTvConfig = {
                                  ...state.tvConfig,
                                  [item.key]: !(state.tvConfig?.[item.key as keyof typeof state.tvConfig] ?? true)
                              };
                              dispatch({ type: 'UPDATE_CONFIG', payload: { tvConfig: newTvConfig } });
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
                              item.disabled
                                  ? 'opacity-30 cursor-not-allowed bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-400'
                                  : (state.tvConfig?.[item.key as keyof typeof state.tvConfig] ?? true)
                                      ? 'bg-green-100 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-300'
                                      : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500'
                          }`}
                      >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="ml-auto">
                              {(state.tvConfig?.[item.key as keyof typeof state.tvConfig] ?? true) && !item.disabled ? '✅' : '❌'}
                          </span>
                      </button>
                  ))}
              </div>
          </div>
      )}

       {hasBeenScheduled && (
        <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 pb-4 pt-2 -mx-4 px-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-2 border-blue-500/20">
            <h3 className="text-lg font-semibold mb-2">Contrôle des Sessions</h3>
            <div className="flex items-center gap-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
              <div className="flex-grow flex items-center gap-6">
                <div>
                  Session en cours: <span className="font-bold text-xl">{currentSessionState}</span> / {maxSession}
                </div>

                {hasBeenScheduled && numberOfCourts > 0 && (
                  <div className="flex items-center gap-3 px-3 py-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-xs font-bold text-gray-500 uppercase">Terrains :</span>
                    <div className="flex gap-2">
                        {Array.from({ length: numberOfCourts }, (_, i) => i + 1).map(court => {
                          const isReady = readyCourts.includes(court);
                          return (
                            <button
                                key={court}
                                onClick={() => {
                                    if (isReady) {
                                        // Dévalider le terrain
                                        setReadyCourts(prev => prev.filter(c => c !== court));
                                        socket?.emit('court_ready_cancel', { court });
                                    } else {
                                        // Valider le terrain manuellement
                                        setReadyCourts(prev => [...prev, court]);
                                        socket?.emit('court_ready', { court, matchId: null, manual: true });
                                    }
                                }}
                                title={isReady ? `Annuler terrain ${court}` : `Valider terrain ${court} manuellement`}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all cursor-pointer ${
                                    isReady 
                                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-600 dark:text-green-400' 
                                        : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-400'
                                }`}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full ${isReady ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                              <span className="text-[10px] font-black uppercase">T{court}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {estimatedEndTime && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <span className="text-purple-600 dark:text-purple-400 text-sm">Fin estimée :</span>
                    <span className="font-black text-purple-700 dark:text-purple-300 text-lg">{estimatedEndTime}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                  {!isTournamentStarted && maxSession > 0 && (
                      <button
                          onClick={handleStartTournament}
                          className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-bold shadow-lg transform transition hover:scale-105"
                      >
                          Démarrer le Tournoi
                      </button>
                  )}
                  {isTournamentStarted && !isPoolStageFinished && currentSessionState >= maxSession && maxSession > 0 && (
                      <button
                          onClick={handleFinishPoolStage}
                          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-bold shadow-lg transform transition hover:scale-105"
                      >
                          Terminer la phase de poules
                      </button>
                  )}
                  {isTournamentStarted && (
                      <div className="flex gap-2">
                          {currentSessionState > 1 && (
                              <button
                                  onClick={() => {
                                      if (window.confirm(`Revenir à la session ${currentSessionState - 1} ? Les scores de la session ${currentSessionState} ne seront pas effacés.`)) {
                                          dispatch({ type: 'PREVIOUS_SESSION' });
                                      }
                                  }}
                                  className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 font-bold"
                              >
                                  ← Session précédente
                              </button>
                          )}
                          <button
                              onClick={handleNextSession}
                              disabled={currentSessionState >= maxSession}
                              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                              Lancer la Session Suivante
                          </button>
                      </div>
                  )}
                  <button
                  onClick={handleResetSessions}
                  className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                  >
                  Réinitialiser
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        {hasBeenScheduled ? (
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th scope="col" className="px-4 py-3">Poule</th>
                    <th scope="col" className="px-4 py-3">Équipe 1</th>
                    <th scope="col" className="px-4 py-3">Équipe 2</th>
                    <th scope="col" className="px-4 py-3 text-center">Score</th>
                    <th scope="col" className="px-4 py-3 text-center">Terrain</th>
                    <th scope="col" className="px-4 py-3">Arbitre</th>
                    <th scope="col" className="px-4 py-3">Marqueur</th>
                    <th scope="col" className="px-4 py-3 text-center">Actions</th>
                </tr>
                </thead>
                <tbody>
                {matchesBySession.length > 0 ? (
                    matchesBySession.map(([sessionKey, sessionMatches]) => {
                        const sessionNum = sessionKey === 'unscheduled' ? -1 : Number(sessionKey);
                        const isPast = currentSession !== null && sessionNum !== -1 && sessionNum < currentSession;
                        const isCurrent = currentSession !== null && sessionNum !== -1 && sessionNum === currentSession;
                        const isNext = currentSession !== null && sessionNum !== -1 && sessionNum > currentSession;

                        return (
                            <React.Fragment key={`session-${sessionKey}`}>
                                <tr className={`${isCurrent ? 'bg-blue-100 dark:bg-blue-900/50' : isPast ? 'bg-gray-50 dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                <td colSpan={8} className="px-4 py-2">
                                    <div 
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm mb-2 ${
                                            isCurrent
                                                ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                                                : isPast ? 'bg-gray-200 dark:bg-gray-700 text-gray-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}
                                    >
                                        <span>{sessionKey === 'unscheduled' ? 'Non Planifié' : `Session ${sessionKey}`}</span>
                                        {isCurrent && (
                                            <span className="animate-pulse text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full font-black">
                                                EN COURS
                                            </span>
                                        )}
                                        {isPast && <span className="ml-2 text-[10px] uppercase font-bold opacity-70">Terminée</span>}
                                    </div>
                                </td>
                                </tr>
                                {sessionMatches.map(match => {
                                const team1 = match.team1Id ? getTeam(match.team1Id) : null;
                                const team2 = match.team2Id ? getTeam(match.team2Id) : null;
                                const category = match.team1Id ? getCategoryForTeam(match.team1Id) : null;

                                let poolDisplayName = '?';
                                if (category) {
                                    if (category.tournamentType === 'swiss') {
                                        poolDisplayName = 'Général';
                                    } else {
                                        const categoryPools = pools
                                            .filter(p => p.id.startsWith(category.id))
                                            .sort((a, b) => a.id.localeCompare(b.id));
                                        const poolIndex = categoryPools.findIndex(p => p.id === (match as Match).poolId);
                                        if (poolIndex !== -1) {
                                            poolDisplayName = String.fromCharCode(65 + poolIndex);
                                        }
                                    }
                                }

                                return (
                                    <tr key={match.id} className={`border-b dark:border-gray-700 ${isPast ? 'opacity-50' : ''}`}>
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
                                    <td className="px-4 py-3 text-xs">{renderOfficial((match as Match).refereeId || null)}</td>
                                    <td className="px-4 py-3 text-xs">{renderOfficial((match as Match).scorerId || null)}</td>
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
                                                            <span className="w-12 text-center font-black text-3xl tabular-nums">{getQuickScore(match.id).s1}</span>
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
                                                            <span className="w-12 text-center font-black text-3xl tabular-nums">{getQuickScore(match.id).s2}</span>
                                                            <button
                                                                onClick={() => handleQuickScore(match.id, 2, 1)}
                                                                className="w-10 h-10 bg-blue-500 text-white rounded-xl font-black text-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-blue-500/20"
                                                            >+</button>
                                                        </div>

                                                        <button
                                                            onClick={() => handleQuickValidate(match)}
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
                                })}
                            </React.Fragment>
                        )
                    })
                ) : (
                    <tr>
                        <td colSpan={8} className="text-center text-gray-500 dark:text-gray-400 py-8">
                            Aucun match généré pour le moment.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        ): (
            <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Le calendrier est vide.</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Générez les poules et les matchs depuis l'onglet 'Poules' pour peupler le calendrier.</p>
            </div>
        )}
      </div>

      {editingMatch && team1 && team2 && (
        <ScoreDialog
          match={editingMatch}
          team1Name={team1.name}
          team2Name={team2.name}
          onClose={() => setEditingMatch(null)}
          isFinalMatch={false}
          team1WomenCount={team1.womenCount}
          team2WomenCount={team2.womenCount}
        />
      )}

      {showAllReadyPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-green-400 p-8 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="text-5xl">🟢</div>
                  <div className="text-xl font-black text-gray-900 dark:text-white text-center">
                      Tous les terrains sont prêts !
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Vous pouvez lancer le chrono
                  </div>
                  <button
                      onClick={() => setShowAllReadyPopup(false)}
                      className="mt-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
                  >
                      OK
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default GlobalSchedule;
