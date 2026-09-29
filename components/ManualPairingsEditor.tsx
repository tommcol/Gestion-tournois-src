
import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Team, FinalMatch, Pool, Match, Standing } from '../types';

interface PoolRankingsProps {
    pools: Pool[];
    standings: { [poolId: string]: Standing[] };
    teams: Team[];
    assignedTeamIds: Set<string>;
}

const PoolRankings: React.FC<PoolRankingsProps> = ({ pools, standings, teams, assignedTeamIds }) => {
    const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'N/A';
    
    return (
        <div className="w-1/3 pr-4 space-y-4">
            <h3 className="text-xl font-bold">Équipes Disponibles</h3>
            {pools.map((pool, index) => {
                const poolStandings = standings[pool.id] || [];
                const availableTeams = poolStandings.filter(s => teams.some(t => t.id === s.teamId));
                if (availableTeams.length === 0) return null;

                return (
                    <div key={pool.id} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                        <h4 className="font-semibold mb-2">Poule {String.fromCharCode(65 + index)}</h4>
                        <ul className="space-y-1 text-sm">
                            {availableTeams.map((standing, rank) => {
                                const team = teams.find(t => t.id === standing.teamId);
                                if (!team) return null;
                                const isAssigned = assignedTeamIds.has(team.id);
                                return (
                                    <li key={team.id} className={`p-1 rounded ${isAssigned ? 'bg-green-200 dark:bg-green-800 line-through text-gray-500' : ''}`}>
                                        {rank + 1}. {getTeamName(team.id)} (V:{standing.wins}, +/-:{standing.pointsDifference})
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )
            })}
        </div>
    );
};

interface ManualPairingsEditorProps {
    categoryId: string;
    qualifiedTeams: Team[];
    initialMatches: FinalMatch[];
    pools: Pool[];
    matches: Match[];
    teams: Team[];
    onSave: () => void;
}

const ManualPairingsEditor: React.FC<ManualPairingsEditorProps> = ({ categoryId, qualifiedTeams, initialMatches, pools, matches, teams, onSave }) => {
    const { state, dispatch } = useTournament();
    const [pairings, setPairings] = useState<FinalMatch[]>(initialMatches);

    const assignedTeamIds = useMemo(() => {
        const ids = new Set<string>();
        pairings.forEach(p => {
            if (p.team1Id) ids.add(p.team1Id);
            if (p.team2Id) ids.add(p.team2Id);
        });
        return ids;
    }, [pairings]);
    
    const unassignedTeams = qualifiedTeams.filter(t => !assignedTeamIds.has(t.id));

    const handleTeamSelect = (matchId: string, teamPosition: 'team1Id' | 'team2Id', teamId: string) => {
        setPairings(prev => prev.map(match => {
            if (match.id === matchId) {
                return { ...match, [teamPosition]: teamId === 'none' ? null : teamId };
            }
            return match;
        }));
    };

    const handleSaveChanges = () => {
        dispatch({ type: 'UPDATE_MANUAL_PAIRINGS', payload: { categoryId, matches: pairings } });
        onSave();
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Éditeur d'Appariements Manuels</h2>
            <div className="flex">
                <PoolRankings pools={pools} standings={state.standings} teams={teams} assignedTeamIds={assignedTeamIds} />

                <div className="w-2/3">
                    <div className="space-y-3">
                        {pairings.map((match, index) => (
                            <div key={match.id} className="grid grid-cols-11 gap-2 items-center bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <span className="col-span-1 text-sm font-semibold">M{index + 1}</span>
                                <TeamSelector 
                                    className="col-span-4"
                                    currentTeamId={match.team1Id}
                                    unassignedTeams={unassignedTeams}
                                    onSelect={(teamId) => handleTeamSelect(match.id, 'team1Id', teamId)}
                                />
                                <span className="col-span-1 text-center">vs</span>
                                <TeamSelector
                                    className="col-span-4"
                                    currentTeamId={match.team2Id}
                                    unassignedTeams={unassignedTeams}
                                    onSelect={(teamId) => handleTeamSelect(match.id, 'team2Id', teamId)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={handleSaveChanges} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Sauvegarder les Appariements</button>
            </div>
        </div>
    );
};

interface TeamSelectorProps {
    currentTeamId: string | null;
    unassignedTeams: Team[];
    onSelect: (teamId: string) => void;
    className?: string;
}

const TeamSelector: React.FC<TeamSelectorProps> = ({ currentTeamId, unassignedTeams, onSelect, className }) => {
    const { state: { teams } } = useTournament();
    const currentTeam = currentTeamId ? teams.find(t => t.id === currentTeamId) : null;

    return (
        <select value={currentTeamId || 'none'} onChange={e => onSelect(e.target.value)} className={`bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md p-2 ${className}`}>
            <option value="none">-- Sélectionner une Équipe --</option>
            {currentTeam && <option value={currentTeam.id}>{currentTeam.name}</option>}
            {unassignedTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
            ))}
        </select>
    );
};

export default ManualPairingsEditor;
