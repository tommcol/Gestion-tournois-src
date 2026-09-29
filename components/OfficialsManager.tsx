
import React, { useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, Player, Team, Category } from '../types';

const OfficialsManager: React.FC = () => {
  const { state } = useTournament();
  const { matches, teams, categories } = state;

  const playerInfoMap = useMemo(() => {
    const map = new Map<string, { player: Player; team: Team; category: Category }>();
    categories.forEach(cat => {
      teams.filter(t => t.categoryId === cat.id).forEach(team => {
        team.players.forEach(p => {
          map.set(p.id, { player: p, team, category: cat });
        });
      });
    });
    return map;
  }, [teams, categories]);

  const assignmentsPerSession = useMemo(() => {
    const sessions: Record<number, { refs: string[], scorers: string[] }> = {};
    
    matches.forEach(m => {
      const s = m.sessionNumber || 0;
      if (!sessions[s]) sessions[s] = { refs: [], scorers: [] };
      if (m.refereeId) sessions[s].refs.push(m.refereeId);
      if (m.scorerId) sessions[s].scorers.push(m.scorerId);
    });

    return sessions;
  }, [matches]);

  const sortedSessions = useMemo(() => {
    return Object.keys(assignmentsPerSession).map(Number).sort((a, b) => a - b);
  }, [assignmentsPerSession]);

  const renderOfficial = (id: string) => {
    if (id === 'Staff') return <span className="font-bold text-red-600">STAFF</span>;
    const info = playerInfoMap.get(id);
    if (!info) return <span className="text-gray-400">Inconnu ({id})</span>;
    return (
      <div className="flex flex-col">
        <span className="font-bold text-sm">{info.player.firstName} {info.player.lastName}</span>
        <span className="text-[10px] text-gray-500 truncate max-w-[120px]" title={info.team.name}>{info.team.name}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Officiels</h2>
        <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
          Suivi des rotations d'arbitrage
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedSessions.map(session => (
          <div key={session} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-900 text-white p-3 flex justify-between items-center">
              <h3 className="font-bold">Session {session}</h3>
              <span className="text-[10px] uppercase tracking-widest opacity-70">{matches.filter(m => m.sessionNumber === session).length} Matchs</span>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                   <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                   Arbitres
                </h4>
                <div className="space-y-2">
                  {assignmentsPerSession[session].refs.length > 0 ? (
                    assignmentsPerSession[session].refs.map((id, idx) => (
                      <div key={`ref-${session}-${idx}`} className="p-2 bg-blue-50 dark:bg-blue-900/10 rounded border border-blue-100 dark:border-blue-800/20">
                        {renderOfficial(id)}
                      </div>
                    ))
                  ) : <p className="text-xs text-gray-400 italic">Aucun arbitre assigné</p>}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                   <div className="w-1 h-3 bg-green-500 rounded-full"></div>
                   Marqueurs
                </h4>
                <div className="space-y-2">
                  {assignmentsPerSession[session].scorers.length > 0 ? (
                    assignmentsPerSession[session].scorers.map((id, idx) => (
                      <div key={`scorer-${session}-${idx}`} className="p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-100 dark:border-green-800/20">
                        {renderOfficial(id)}
                      </div>
                    ))
                  ) : <p className="text-xs text-gray-400 italic">Aucun marqueur assigné</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedSessions.length === 0 && (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl text-center shadow-lg">
          <p className="text-gray-400 italic">Générez un calendrier pour voir les assignations d'officiels.</p>
        </div>
      )}
    </div>
  );
};

export default OfficialsManager;
