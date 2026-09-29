
import React, { useState, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Sponsor } from '../types';
import AlertDialog from './AlertDialog';
import { generateId } from '../utils/id';

const SponsorManager: React.FC = () => {
    const { state, dispatch } = useTournament();
    const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
    const [sponsorLogo, setSponsorLogo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // CAS 1 : Mode ÉDITION (Modification d'un seul sponsor)
        if (editingSponsor) {
            const file = files[0];
            if (file.size > 2 * 1024 * 1024) {
                setError("Le fichier est trop volumineux (Max 2 Mo).");
                return;
            }
            try {
                const base64 = await readFileAsDataURL(file);
                setSponsorLogo(base64);
            } catch (e) {
                setError("Erreur lors de la lecture du fichier.");
            }
            return;
        }

        // CAS 2 : Mode AJOUT (Sélection multiple possible)
        const newSponsors: Sponsor[] = [];
        let errorCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > 2 * 1024 * 1024) {
                errorCount++;
                continue;
            }

            try {
                const base64 = await readFileAsDataURL(file);
                // On utilise le nom du fichier (sans l'extension) comme nom de sponsor par défaut
                const nameFromFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                
                dispatch({ 
                    type: 'ADD_SPONSOR', 
                    payload: {
                        id: generateId(),
                        name: nameFromFileName,
                        logo: base64
                    }
                });
            } catch (e) {
                console.error("Erreur lecture fichier", file.name, e);
                errorCount++;
            }
        }

        if (errorCount > 0) {
            setError(`${errorCount} fichier(s) n'ont pas pu être ajoutés (trop volumineux ou erreur de lecture).`);
        }

        // Reset de l'input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    const handleEdit = (sponsor: Sponsor) => {
        setEditingSponsor(sponsor);
        setSponsorLogo(sponsor.logo);
    };

    const handleCancel = () => {
        setEditingSponsor(null);
        setSponsorLogo(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveEdit = () => {
        if (!editingSponsor || !sponsorLogo) return;

        const sponsorData = { 
            id: editingSponsor.id,
            name: editingSponsor.name, // On garde le nom existant
            logo: sponsorLogo 
        };
        
        dispatch({ type: 'UPDATE_SPONSOR', payload: sponsorData });
        handleCancel();
    };
    
    const handleDelete = (id: string) => {
        if(window.confirm("Êtes-vous sûr de vouloir supprimer ce sponsor ?")) {
            dispatch({ type: 'DELETE_SPONSOR', payload: id });
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            {error && <AlertDialog title="Information" message={error} onClose={() => setError(null)} />}
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Gestion des Sponsors</h2>
            
            <div className="border-b dark:border-gray-700 pb-4 mb-4 space-y-3">
                <h3 className="text-lg font-semibold">
                    {editingSponsor ? `Modifier le logo : ${editingSponsor.name}` : "Ajouter des sponsors"}
                </h3>
                
                {!editingSponsor && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Astuce : Vous pouvez sélectionner plusieurs images à la fois. Elles seront ajoutées automatiquement.
                    </p>
                )}

                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        {editingSponsor ? "Nouveau Logo" : "Sélectionner les logos (PNG, JPG, WEBP)"}
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple={!editingSponsor} // Activation de la sélection multiple seulement si pas en édition
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        onChange={handleFileChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    
                    {/* Aperçu uniquement en mode édition */}
                    {editingSponsor && sponsorLogo && (
                        <div className="mt-4">
                            <p className="text-xs text-gray-500 mb-1">Aperçu du nouveau logo :</p>
                            <img src={sponsorLogo} alt="Aperçu" className="h-20 w-auto object-contain border dark:border-gray-600 rounded-md p-1 bg-gray-50 dark:bg-gray-700" />
                        </div>
                    )}
                </div>

                {/* Les boutons ne s'affichent que si on est en mode édition */}
                {editingSponsor && (
                    <div className="flex justify-end space-x-2 mt-2">
                        <button onClick={handleCancel} className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600">Annuler</button>
                        <button onClick={handleSaveEdit} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Sauvegarder la modification</button>
                    </div>
                )}
            </div>

            <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                {state.sponsors.map((sponsor, index) => (
                    <li key={sponsor.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                                <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{sponsor.name}</span>
                        </div>
                        <div className="space-x-2 flex-shrink-0">
                             <button onClick={() => handleEdit(sponsor)} className="text-sm bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600">Modifier</button>
                             <button onClick={() => handleDelete(sponsor.id)} className="text-sm bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700">Supprimer</button>
                        </div>
                    </li>
                ))}
                {state.sponsors.length === 0 && (
                    <li className="text-center text-gray-500 dark:text-gray-400 py-4 italic">
                        Aucun sponsor. Importez des images pour commencer.
                    </li>
                )}
            </ul>
        </div>
    );
};

export default SponsorManager;
