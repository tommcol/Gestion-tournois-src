
import React, { useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Team, Match } from '../types';

interface TeamRoadmapDialogProps {
  teamId: string;
  onClose: () => void;
}

const TeamRoadmapDialog: React.FC<TeamRoadmapDialogProps> = ({ teamId, onClose }) => {
  const { state } = useTournament();
  const { matches, teams, categories } = state;

  const team = useMemo(() => teams.find(t => t.id === teamId), [teams, teamId]);
  const category = useMemo(() => team ? categories.find(c => c.id === team.categoryId) : null, [team, categories]);

  const teamMatches = useMemo(() => {
    return matches.filter(m => m.team1Id === teamId || m.team2Id === teamId)
      .sort((a, b) => (a.sessionNumber || 0) - (b.sessionNumber || 0));
  }, [matches, teamId]);

  if (!team) return null;

  const getOpponent = (match: Match) => {
    const opponentId = match.team1Id === teamId ? match.team2Id : match.team1Id;
    return teams.find(t => t.id === opponentId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Feuille de Route : {team.name}
            </h2>
            {category && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest text-white" style={{ backgroundColor: category.color }}>
                {category.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/10">
          <div className="space-y-4">
            {teamMatches.length > 0 ? (
              teamMatches.map((match, idx) => {
                const opponent = getOpponent(match);
                const isWinner = match.status === 'finished' && (
                  (match.team1Id === teamId && (match.score1 || 0) > (match.score2 || 0)) ||
                  (match.team2Id === teamId && (match.score2 || 0) > (match.score1 || 0))
                );
                const isDraw = match.status === 'finished' && match.score1 === match.score2;

                return (
                  <div key={match.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:border-blue-500 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-400">SESSION</span>
                        <span className="text-sm font-black">{match.sessionNumber || '?'}</span>
                      </div>
                      
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase">Terrain {match.court || '?'}</div>
                        <div className="font-bold flex items-center gap-2">
                          <span className="text-gray-400">vs</span>
                          <span className="text-gray-900 dark:text-white uppercase">{opponent?.name || 'Inconnu'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {match.status === 'finished' ? (
                          <div className="flex flex-col items-end">
                            <span className={`text-lg font-black mono ${isWinner ? 'text-green-600' : isDraw ? 'text-blue-600' : 'text-red-500'}`}>
                              {match.team1Id === teamId ? match.score1 : match.score2} - {match.team1Id === teamId ? match.score2 : match.score1}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isWinner ? 'text-green-500' : isDraw ? 'text-blue-500' : 'text-red-400'}`}>
                              {isWinner ? 'Victoire' : isDraw ? 'Égalité' : 'Défaite'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold italic text-gray-400 uppercase tracking-widest">En attente</span>
                        )}
                      </div>
                      
                      <div className="hidden group-hover:block transition-all">
                        <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 font-medium">Aucun match programmé pour le moment.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-b-2xl">
          <div className="flex justify-between items-center px-4">
             <div className="flex gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                    <span className="text-xs font-bold text-gray-600 uppercase">
                      {teamMatches.filter(m => {
                        const isW = m.status === 'finished' && (
                            (m.team1Id === teamId && (m.score1 || 0) > (m.score2 || 0)) ||
                            (m.team2Id === teamId && (m.score2 || 0) > (m.score1 || 0))
                          );
                        return isW;
                      }).length} Victoires
                    </span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                    <span className="text-xs font-bold text-gray-600 uppercase">
                      {teamMatches.filter(m => m.status === 'finished' && m.score1 === m.score2).length} Égalités
                    </span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                    <span className="text-xs font-bold text-gray-600 uppercase">
                      {teamMatches.filter(m => {
                        const isL = m.status === 'finished' && (
                            (m.team1Id === teamId && (m.score1 || 0) < (m.score2 || 0)) ||
                            (m.team2Id === teamId && (m.score2 || 0) < (m.score1 || 0))
                          );
                        return isL;
                      }).length} Défaites
                    </span>
                 </div>
             </div>
             <button 
               onClick={onClose}
               className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition-all shadow-lg active:scale-95"
             >
               Fermer
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamRoadmapDialog;
