import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, FinalMatch } from '../types';

interface ScoreDialogProps {
  match: Match | FinalMatch;
  team1Name: string;
  team2Name: string;
  onClose: () => void;
  isFinalMatch: boolean;
  categoryId?: string;
  team1WomenCount?: number;
  team2WomenCount?: number;
}

const ScoreDialog: React.FC<ScoreDialogProps> = ({ 
  match, 
  team1Name, 
  team2Name, 
  onClose, 
  isFinalMatch, 
  categoryId,
  team1WomenCount,
  team2WomenCount
}) => {
  const { dispatch } = useTournament();
  const [score1, setScore1] = useState<number | ''>(match.score1 ?? '');
  // FIX: Corrected a typo from `==` to `??` for correct state initialization. This prevents a score of 0 from being treated as an empty string.
  const [score2, setScore2] = useState<number | ''>(match.score2 ?? '');

  const bonus1 = !team1WomenCount ? 0 : team1WomenCount >= 2 ? 2 : 1;
  const bonus2 = !team2WomenCount ? 0 : team2WomenCount >= 2 ? 2 : 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (score1 === '' || score2 === '') {
      alert('Veuillez saisir les scores pour les deux équipes.');
      return;
    }

    if (Number(score1) < 0 || Number(score2) < 0) {
      alert('Le score ne peut pas être négatif.');
      return;
    }
    
    if (isFinalMatch) {
      if (Number(score1) === Number(score2)) {
        alert('Score égal impossible en phase finale 3x3. Un match doit avoir un vainqueur (prolongation ou point décisif).');
        return;
      }
      
      if (!categoryId) {
        console.error("CategoryID is required for final match score update.");
        return;
      }
      dispatch({ type: 'UPDATE_FINAL_MATCH_SCORE', payload: { categoryId, matchId: match.id, score1: +score1, score2: +score2 } });
    } else {
      dispatch({ type: 'UPDATE_MATCH_SCORE', payload: { matchId: match.id, score1: +score1, score2: +score2 } });
    }
    
    onClose();
  };

  const handleForfeit = (team: 'team1' | 'team2') => {
    if (!window.confirm(`Confirmer le forfait de ${team === 'team1' ? team1Name : team2Name} ?`)) return;
    
    const isPoolMatch = !isFinalMatch;
    
    if (isFinalMatch) {
      if (!categoryId) return;
      dispatch({
        type: 'UPDATE_FINAL_MATCH_SCORE',
        payload: {
          categoryId,
          matchId: match.id,
          score1: 0,
          score2: 0,
          isForfeit: team
        }
      });
    } else {
      dispatch({
        type: 'UPDATE_MATCH_SCORE',
        payload: {
          matchId: match.id,
          score1: 0,
          score2: 0,
          poolId: (match as Match).poolId,
          isForfeit: team
        }
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Saisir le Score</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col w-3/5">
                <span className="font-bold text-lg">{team1Name}</span>
                {bonus1 > 0 && (
                  <div className="mt-1">
                    <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 text-xs font-black px-2 py-0.5 rounded-full inline-block">
                      +{bonus1} pt{bonus1 > 1 ? 's' : ''} bonus
                    </span>
                  </div>
                )}
              </div>
              <input
                type="number"
                value={score1}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  if (val === '' || (typeof val === 'number' && val >= 0)) setScore1(val);
                }}
                className="w-1/4 p-2 text-center text-lg font-bold bg-gray-50 dark:bg-gray-700 border-2 border-black dark:border-gray-300 rounded-md shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                min={0}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col w-3/5">
                <span className="font-bold text-lg">{team2Name}</span>
                {bonus2 > 0 && (
                  <div className="mt-1">
                    <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 text-xs font-black px-2 py-0.5 rounded-full inline-block">
                      +{bonus2} pt{bonus2 > 1 ? 's' : ''} bonus
                    </span>
                  </div>
                )}
              </div>
              <input
                type="number"
                value={score2}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  if (val === '' || (typeof val === 'number' && val >= 0)) setScore2(val);
                }}
                className="w-1/4 p-2 text-center text-lg font-bold bg-gray-50 dark:bg-gray-700 border-2 border-black dark:border-gray-300 rounded-md shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                min={0}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Forfait</p>
              <div className="flex gap-2">
                  <button
                      type="button"
                      onClick={() => handleForfeit('team1')}
                      className="flex-1 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold text-sm hover:bg-red-200 border border-red-300"
                  >
                      Forfait {team1Name}
                  </button>
                  <button
                      type="button"
                      onClick={() => handleForfeit('team2')}
                      className="flex-1 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold text-sm hover:bg-red-200 border border-red-300"
                  >
                      Forfait {team2Name}
                  </button>
              </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Sauvegarder le Score
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScoreDialog;