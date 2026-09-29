
import React, { useState, useMemo, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import { calculatePoolStandings } from '../utils/standingsLogic';
import { getAdminTeamName } from '../utils/helpers';
import { Standing } from '../types';

const StandingsDisplay: React.FC = () => {
    const { state } = useTournament();
    const { categories, teams, pools, standings } = state;
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');

    useEffect(() => {
        if(!selectedCategoryId && categories[0]) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories, selectedCategoryId]);

    const categoryPools = useMemo(() => {
        return pools.filter(p => p.id.startsWith(selectedCategoryId));
    }, [pools, selectedCategoryId]);

    const selectedCategory = useMemo(() => {
        return categories.find(c => c.id === selectedCategoryId);
    }, [categories, selectedCategoryId]);

    const getTeamName = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        return getAdminTeamName(team);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Classements des Poules</h1>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div role="tablist" className="flex items-center gap-2 flex-wrap border-b border-gray-200 dark:border-gray-700 pb-4">
                    {categories.map(category => (
                        <button
                            key={category.id}
                            role="tab"
                            aria-selected={selectedCategoryId === category.id}
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                selectedCategoryId === category.id
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span style={{ backgroundColor: category.color }} className="w-3 h-3 rounded-full flex-shrink-0"></span>
                            <span>{category.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {categoryPools.length === 0 && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-center text-gray-500 dark:text-gray-400 py-8">
                    Les poules pour cette catégorie n'ont pas encore été générées.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryPools.map((pool, index) => (
                    <div key={pool.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                            {selectedCategory?.tournamentType === 'swiss' ? 'Classement Général' : `Poule ${String.fromCharCode(65 + index)}`}
                        </h3>
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-2 py-2 w-1/3">Équipe</th>
                                    <th scope="col" className="px-1 py-2 text-center font-bold text-blue-600 dark:text-blue-400" title="Points (V=2, N=1)">Pts</th>
                                    <th scope="col" className="px-1 py-2 text-center" title="Joués">J</th>
                                    <th scope="col" className="px-1 py-2 text-center" title="Victoires">V</th>
                                    <th scope="col" className="px-1 py-2 text-center" title="Nuls">N</th>
                                    <th scope="col" className="px-1 py-2 text-center" title="Défaites">D</th>
                                    <th scope="col" className="px-1 py-2 text-center" title="Différence de points">+/-</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(standings[pool.id] || []).map((standing) => (
                                    <tr key={standing.teamId} className="border-b dark:border-gray-700">
                                        <td className="px-2 py-2 font-medium truncate max-w-[120px]" title={getTeamName(standing.teamId)}>{getTeamName(standing.teamId)}</td>
                                        <td className="px-1 py-2 text-center font-bold">{standing.points}</td>
                                        <td className="px-1 py-2 text-center">{standing.played}</td>
                                        <td className="px-1 py-2 text-center">{standing.wins}</td>
                                        <td className="px-1 py-2 text-center">{standing.draws}</td>
                                        <td className="px-1 py-2 text-center">{standing.losses}</td>
                                        <td className="px-1 py-2 text-center">{standing.pointsDifference > 0 ? `+${standing.pointsDifference}` : standing.pointsDifference}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StandingsDisplay;
