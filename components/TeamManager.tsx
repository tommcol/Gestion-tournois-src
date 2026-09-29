
import React, { useState, useEffect, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Team, Player } from '../types';
import AlertDialog from './AlertDialog';
import TeamRoadmapDialog from './TeamRoadmapDialog';
import { generateId } from '../utils/id';

const emptyPlayer = (): Player => ({ id: generateId(), firstName: '', lastName: '', gender: 'Homme', roles: ['Joueur'] });
const emptyTeam = (categoryId: string): Team => ({
    id: '', name: '', categoryId, players: [emptyPlayer(), emptyPlayer(), emptyPlayer()], isMix: false
});

// Sources de données pour la génération aléatoire (Banque élargie)
const firstNames = [
    "Léo", "Emma", "Lucas", "Manon", "Hugo", "Chloé", "Nathan", "Léa", "Jules", "Camille",
    "Arthur", "Sarah", "Tom", "Lola", "Louis", "Jade", "Gabriel", "Alice", "Maël", "Lina",
    "Noah", "Eva", "Adam", "Mila", "Paul", "Rose", "Liam", "Inès", "Ethan", "Zoé",
    "Sacha", "Julia", "Théo", "Lou", "Isaac", "Maya", "Victor", "Clara", "Enzo", "Agathe",
    "Mohamed", "Sofia", "Antoine", "Margaux", "Rayan", "Olivia", "Maxime", "Romane", "Axel", "Lucie"
];
const lastNames = [
    "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau",
    "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier",
    "Morel", "Girard", "Andre", "Lefevre", "Mercier", "Dupont", "Lambert", "Bonnet", "Francois", "Martinez",
    "Legrand", "Garnier", "Faure", "Rousseau", "Blanc", "Guerin", "Muller", "Henry", "Roussel", "Nicolas",
    "Perrin", "Morin", "Mathieu", "Clement", "Gauthier", "Dumont", "Lopez", "Fontaine", "Chevalier", "Robin"
];
const adjectives = [
    "Rapides", "Invincibles", "Fous", "Galactiques", "Atomiques", "Légendaires", "Sprints", "Zénith",
    "Féroces", "Brillants", "Éclatants", "Sombres", "Puissants", "Agiles", "Vaillants", "Héroïques",
    "Sauvages", "Nobles", "Vifs", "Robustes", "Inarrêtables", "Majestueux", "Intrépides", "Éternels",
    "Célestes", "Infernaux", "Mystiques", "Souverains", "Radieux", "Foudroyants", "Silencieux", "Loyaux"
];
const nouns = [
    "Phénix", "Titans", "Dragons", "Aigles", "Requins", "Loups", "Spartiates", "Vikings",
    "Panthères", "Lions", "Faucons", "Cobras", "Lynx", "Guerriers", "Chevaliers", "Samouraïs",
    "Corsaires", "Pirates", "Gardiens", "Étoiles", "Comètes", "Orages", "Volcans", "Cyclones",
    "Léopards", "Ours", "Bisons", "Condors", "Renards", "Scorpions", "Taureaux", "Béliers"
];

interface TeamFormProps {
    team: Team;
    onSave: (team: Team) => void;
    onCancel: () => void;
    isRefereeMandatory: boolean;
    isDetailedRegistration: boolean;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, onSave, onCancel, isRefereeMandatory, isDetailedRegistration }) => {
    const [localTeam, setLocalTeam] = useState<Team>(team);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleTeamChange = (field: keyof Team, value: any) => {
        setLocalTeam(prev => ({ ...prev, [field]: value }));
    };

    const handlePlayerChange = (playerId: string, field: keyof Player, value: any) => {
        const newPlayers = localTeam.players.map(p => p.id === playerId ? { ...p, [field]: value } : p);
        const genders = new Set(newPlayers.map(p => p.gender));
        const isMix = genders.has('Homme') && genders.has('Femme');
        setLocalTeam(prev => ({ ...prev, players: newPlayers, isMix }));
    };
    
    const handlePlayerRoleChange = (playerId: string, role: 'Arbitre' | 'Marqueur', isChecked: boolean) => {
        const newPlayers = localTeam.players.map(p => {
            if (p.id === playerId) {
                const newRoles = new Set(p.roles);
                if (isChecked) {
                    newRoles.add(role);
                } else {
                    newRoles.delete(role);
                }
                return { ...p, roles: Array.from(newRoles) };
            }
            return p;
        });
        setLocalTeam(prev => ({...prev, players: newPlayers}));
    };

    const addPlayer = () => {
        if (localTeam.players.length < 5) {
            setLocalTeam(prev => ({ ...prev, players: [...prev.players, emptyPlayer()]}));
        }
    };

    const removePlayer = (playerId: string) => {
        if (localTeam.players.length > 3) {
            const newPlayers = localTeam.players.filter(p => p.id !== playerId);
            setLocalTeam(prev => ({ ...prev, players: newPlayers }));
        }
    }
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (localTeam.players.length < 3 || localTeam.players.length > 5) {
            setValidationError("Une équipe doit avoir entre 3 et 5 joueurs.");
            return;
        }
        
        if (isRefereeMandatory) {
            const hasReferee = localTeam.players.some(p => p.roles.includes('Arbitre'));
            if (!hasReferee) {
                setValidationError("Un arbitre est obligatoire pour les équipes de cette catégorie. Veuillez assigner ce rôle à au moins un joueur.");
                return;
            }
        }

        let finalTeam = { ...localTeam, id: localTeam.id || generateId() };

        if (isDetailedRegistration) {
            // Calculer womenCount depuis les genres des joueurs
            const womenCount = finalTeam.players.filter(p => p.gender === 'Femme').length;
            finalTeam.womenCount = womenCount;
        }

        // If not detailed, anonymous players get basic names
        if (!isDetailedRegistration) {
            finalTeam.players = finalTeam.players.map((p, i) => ({
                ...p,
                firstName: p.firstName || `Joueur`,
                lastName: p.lastName || `${i + 1}`
            }));
            
            // Set womenCount to 0 if not provided when simplified
            if (finalTeam.womenCount === undefined) {
                finalTeam.womenCount = 0;
            }
        }

        onSave(finalTeam);
    }

    return (
        <>
        {validationError && <AlertDialog title="Erreur de validation" message={validationError} onClose={() => setValidationError(null)} />}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Nom de l'Équipe</label>
                <input required type="text" value={localTeam.name} onChange={e => handleTeamChange('name', e.target.value)} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2" />
            </div>

            {!isDetailedRegistration && (
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mt-4">Nombre de joueuses (Femmes)</label>
                    <input 
                        type="number" 
                        min="0"
                        max="5"
                        value={localTeam.womenCount || 0} 
                        onChange={e => handleTeamChange('womenCount', parseInt(e.target.value) || 0)} 
                        className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2" 
                    />
                </div>
            )}

            {localTeam.players.map((player, i) => (
                <div key={player.id} className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Joueur {i + 1}</h4>
                         {localTeam.players.length > 3 && (
                            <button type="button" onClick={() => removePlayer(player.id)} className="text-xs bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600">
                                Retirer
                            </button>
                        )}
                    </div>
                    
                    {isDetailedRegistration && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <input required placeholder="Prénom" type="text" value={player.firstName} onChange={e => handlePlayerChange(player.id, 'firstName', e.target.value)} className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2" />
                             <input required placeholder="Nom" type="text" value={player.lastName} onChange={e => handlePlayerChange(player.id, 'lastName', e.target.value)} className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2" />
                             <select value={player.gender} onChange={e => handlePlayerChange(player.id, 'gender', e.target.value as 'Homme' | 'Femme')} className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2">
                                <option>Homme</option>
                                <option>Femme</option>
                             </select>
                        </div>
                    )}

                     <div className="col-span-3 mt-2 flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Rôles :</span>
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={true} disabled className="rounded text-gray-400" />
                            <span className="text-sm text-gray-400 dark:text-gray-500">Joueur</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input type="checkbox"
                                checked={player.roles.includes('Arbitre')}
                                onChange={e => handlePlayerRoleChange(player.id, 'Arbitre', e.target.checked)}
                                className="rounded text-blue-500 focus:ring-blue-500" />
                            <span className="text-sm">Arbitre</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input type="checkbox"
                                checked={player.roles.includes('Marqueur')}
                                onChange={e => handlePlayerRoleChange(player.id, 'Marqueur', e.target.checked)}
                                className="rounded text-blue-500 focus:ring-blue-500" />
                            <span className="text-sm">Marqueur</span>
                        </label>
                    </div>
                </div>
            ))}
            {localTeam.players.length < 5 && (
                <div className="pt-2">
                    <button type="button" onClick={addPlayer} className="w-full text-sm bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                        Ajouter un joueur
                    </button>
                </div>
            )}
            <div className="flex justify-end space-x-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600">Annuler</button>
                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Sauvegarder l'Équipe</button>
            </div>
        </form>
        </>
    );
}

const TeamManager: React.FC = () => {
    const { state, dispatch } = useTournament();
    const { categories, teams } = state;
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
    const [viewingRoadmapId, setViewingRoadmapId] = useState<string | null>(null);
    
    useEffect(() => {
        const categoryExists = categories.some(c => c.id === selectedCategoryId);
        if (!categoryExists && categories.length > 0) {
            setSelectedCategoryId(categories[0].id);
        } else if (categories.length === 0) {
            setSelectedCategoryId('');
        } else if (!selectedCategoryId && categories.length > 0) {
             setSelectedCategoryId(categories[0].id);
        }
    }, [categories, selectedCategoryId]);
    
    const selectedCategory = useMemo(() => {
        return categories.find(c => c.id === selectedCategoryId);
    }, [categories, selectedCategoryId]);

    const isRefereeMandatoryForCategory = selectedCategory?.isRefereeMandatory ?? false;
    
    const handleSaveTeam = (team: Team) => {
        if(teams.find(t => t.id === team.id)) {
            dispatch({ type: 'UPDATE_TEAM', payload: team });
        } else {
            dispatch({ type: 'ADD_TEAM', payload: team });
        }
        setEditingTeam(null);
    }
    
    const handleDelete = (teamId: string) => {
        if(window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) {
            dispatch({ type: 'DELETE_TEAM', payload: teamId });
        }
    }

    const handleDeleteCategory = () => {
        if (!selectedCategory) return;
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${selectedCategory.name}" ?\n\n⚠️ Cela supprimera toutes les équipes, poules et matchs associés à cette catégorie.`)) {
            dispatch({ type: 'DELETE_CATEGORY', payload: selectedCategoryId });
        }
    }

    // Fonction de génération automatique pour le test
    const handleAutoGenerateTeams = (count: number) => {
        if (!selectedCategoryId) return;
        
        // Find if this is one of the first two categories to disable officials
        const categoryIndex = categories.findIndex(c => c.id === selectedCategoryId);
        const shouldHaveNoOfficials = categoryIndex >= 0 && categoryIndex < 2;

        let refereesAssigned = 0;
        let scorersAssigned = 0;
        const TARGET_OFFICIALS = shouldHaveNoOfficials ? 0 : 2;

        for (let i = 0; i < count; i++) {
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            // Use a random suffix or check for uniqueness to avoid "Team 1" repetition
            const randomSuffix = Math.floor(Math.random() * 99) + 1;
            let teamName = `${adj} ${noun} ${randomSuffix}`;
            
            // Basic check to avoid duplicate in the current batch or existing teams
            let attempts = 0;
            while (teams.some(t => t.name === teamName) && attempts < 10) {
                const newSuffix = Math.floor(Math.random() * 999) + 1;
                teamName = `${adj} ${noun} ${newSuffix}`;
                attempts++;
            }
            
            const numPlayers = Math.floor(Math.random() * 2) + 3; // 3 ou 4 joueurs
            const players: Player[] = [];
            
            for (let j = 0; j < numPlayers; j++) {
                const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
                const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
                const gender = Math.random() > 0.5 ? 'Homme' : 'Femme';
                const roles: Player['roles'] = ['Joueur'];
                
                // Assign exactly 4 referees and 4 scorers across all teams of the category
                if (refereesAssigned < TARGET_OFFICIALS) {
                    roles.push('Arbitre');
                    refereesAssigned++;
                } else if (scorersAssigned < TARGET_OFFICIALS) {
                    roles.push('Marqueur');
                    scorersAssigned++;
                }

                players.push({
                    id: generateId(),
                    firstName: fn,
                    lastName: ln,
                    gender,
                    roles
                });
            }

            const genders = new Set(players.map(p => p.gender));
            const isMix = genders.has('Homme') && genders.has('Femme');
            const womenCount = players.filter(p => p.gender === 'Femme').length;

            dispatch({
                type: 'ADD_TEAM',
                payload: {
                    id: generateId(),
                    name: teamName,
                    categoryId: selectedCategoryId,
                    players,
                    isMix,
                    womenCount
                }
            });
        }
    };

    const categoryTeams = teams.filter(t => t.categoryId === selectedCategoryId);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Gestion des Équipes</h1>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4 gap-4">
                     <div role="tablist" className="flex items-center gap-2 flex-wrap">
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
                                <span>{category.name} ({teams.filter(t => t.categoryId === category.id).length})</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap gap-2 justify-center">
                        {selectedCategory && (
                            <>
                                <button 
                                    onClick={() => handleAutoGenerateTeams(1)} 
                                    className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-sm font-medium shadow-sm transition-all"
                                    title="Générer 1 équipe avec joueurs pour tester rapidement"
                                >
                                    Remplir (1 équipe)
                                </button>
                                <button onClick={handleDeleteCategory} className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 text-sm font-medium">
                                    Supprimer Cat.
                                </button>
                            </>
                        )}
                        <button onClick={() => setEditingTeam(emptyTeam(selectedCategoryId))} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm font-medium">
                            Ajouter une Équipe
                        </button>
                    </div>
                </div>
                
                {editingTeam && !editingTeam.id && (
                    <div className="mt-4 mb-6">
                        <TeamForm 
                            team={editingTeam} 
                            onSave={handleSaveTeam} 
                            onCancel={() => setEditingTeam(null)} 
                            isRefereeMandatory={isRefereeMandatoryForCategory} 
                            isDetailedRegistration={selectedCategory?.isDetailedRegistration ?? true}
                        />
                    </div>
                )}

                <ul className="space-y-3 mt-4">
                    {categoryTeams.map(team => (
                        <React.Fragment key={team.id}>
                            {editingTeam?.id === team.id ? (
                                <li className="mt-4 mb-6">
                                    <TeamForm 
                                        team={editingTeam} 
                                        onSave={handleSaveTeam} 
                                        onCancel={() => setEditingTeam(null)} 
                                        isRefereeMandatory={isRefereeMandatoryForCategory} 
                                        isDetailedRegistration={selectedCategory?.isDetailedRegistration ?? true}
                                    />
                                </li>
                            ) : (
                                <li className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md gap-4">
                                    <div className="flex-grow">
                                        <p className="font-semibold">
                                            {team.name} 
                                            {team.womenCount !== undefined && team.womenCount > 0 && (
                                                <span className="ml-1 text-pink-600 dark:text-pink-400">
                                                    +{team.womenCount >= 2 ? 2 : 1}
                                                </span>
                                            )}
                                            <span className="text-xs font-normal ml-2">{team.isMix ? '(Mixte)' : ''}</span>
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {team.players.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center space-x-2">
                                        <button onClick={() => setViewingRoadmapId(team.id)} className="bg-indigo-500 text-white py-1 px-3 rounded hover:bg-indigo-600 text-sm">Roadmap</button>
                                        <button onClick={() => setEditingTeam(team)} className="bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600 text-sm">Modifier</button>
                                        <button onClick={() => handleDelete(team.id)} className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 text-sm">Supprimer</button>
                                    </div>
                                </li>
                            )}
                        </React.Fragment>
                    ))}
                </ul>
                {categoryTeams.length === 0 && !editingTeam && <p className="text-center text-gray-500 dark:text-gray-400 py-4">Aucune équipe dans cette catégorie pour le moment. Cliquez sur "Remplir" pour tester.</p>}
            </div>
            {viewingRoadmapId && (
                <TeamRoadmapDialog teamId={viewingRoadmapId} onClose={() => setViewingRoadmapId(null)} />
            )}
        </div>
    )
};

export default TeamManager;
