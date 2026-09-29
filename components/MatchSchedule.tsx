
import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, Category, Team } from '../types';
import { getAdminTeamName } from '../utils/helpers';
import ScoreDialog from './ScoreDialog';

const MatchSchedule: React.FC = () => {
  const { state } = useTournament();
  const { matches, teams, categories, currentSession } = state;
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCourt, setFilterCourt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getTeam = (id: string) => teams.find(t => t.id === id);
  const getCategory = (id: string) => categories.find(c => c.id === id);

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      const team1 = getTeam(match.team1Id);
      if (!team1) return false;
      
      if (filterCategory !== 'all' && team1.categoryId !== filterCategory) return false;
      if (filterCourt !== 'all' && match.court?.toString() !== filterCourt) return false;
      if (filterStatus !== 'all' && match.status !== filterStatus) return false;
      
      return true;
    }).sort((a, b) => {
      if (a.sessionNumber !== b.sessionNumber) return (a.sessionNumber || 0) - (b.sessionNumber || 0);
      return (a.court || 99) - (b.court || 99);
    });
  }, [matches, teams, filterCategory, filterCourt, filterStatus]);

  const courtsList = useMemo(() => {
    const courts = new Set<number>();
    matches.forEach(m => { if (m.court) courts.add(m.court); });
    return Array.from(courts).sort((a, b) => a - b);
  }, [matches]);

  const team1 = editingMatch?.team1Id ? getTeam(editingMatch.team1Id) : null;
  const team2 = editingMatch?.team2Id ? getTeam(editingMatch.team2Id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Gestionnaire de Calendrier
        </h2>
        
        <div className="flex flex-wrap gap-2">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-800"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <select 
            value={filterCourt} 
            onChange={(e) => setFilterCourt(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-800"
          >
            <option value="all">Tous les terrains</option>
            {courtsList.map(c => <option key={c} value={c}>Terrain {c}</option>)}
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-800"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="finished">Terminés</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">Session / Terrain</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Équipe 1</th>
                <th className="px-6 py-4">Équipe 2</th>
                <th className="px-6 py-4 text-center">Résultat</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredMatches.map(match => {
                const t1 = getTeam(match.team1Id);
                const t2 = getTeam(match.team2Id);
                const cat = t1 ? getCategory(t1.categoryId) : null;
                const isCurrent = match.sessionNumber === currentSession;

                return (
                  <tr key={match.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isCurrent ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                          Session {match.sessionNumber || '?'}
                        </span>
                        <span className="text-xs text-gray-400">Terrain {match.court || 'Non assigné'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cat && (
                        <span style={{ color: cat.color }} className="text-xs font-bold uppercase tracking-wide">
                          {cat.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {getAdminTeamName(t1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {getAdminTeamName(t2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {match.status === 'finished' ? (
                        <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-black mono">
                          {match.score1} - {match.score2}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-bold italic uppercase tracking-widest">En attente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setEditingMatch(match)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-xs uppercase tracking-wider"
                      >
                        {match.status === 'finished' ? 'Modifier' : 'Saisir'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMatches.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Aucun match ne correspond aux filtres sélectionnés.</p>
            </div>
          )}
        </div>
      </div>

      {editingMatch && team1 && team2 && (
        <ScoreDialog 
          match={editingMatch}
          team1Name={team1.name}
          team2Name={team2.name}
          onClose={() => setEditingMatch(null)}
          isFinalMatch={false}
        />
      )}
    </div>
  );
};

export default MatchSchedule;
