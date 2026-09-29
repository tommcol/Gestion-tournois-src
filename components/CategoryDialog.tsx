
import React, { useState, useEffect } from 'react';
import { Category } from '../types';

interface CategoryDialogProps {
  category: Category | null;
  onClose: () => void;
  onSave: (categoryData: Omit<Category, 'id' | 'finalPhaseConfig'> & { id?: string }) => void;
  numberOfCourts: number;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({ category, onClose, onSave, numberOfCourts }) => {
  const [categoryForm, setCategoryForm] = useState({
      name: '',
      color: '#3498db',
      reservedCourtIds: new Set<number>(),
      isRefereeMandatory: false,
      isScorerMandatory: false,
      isDetailedRegistration: true,
  });

  useEffect(() => {
    if (category) {
      setCategoryForm({
        name: category.name,
        color: category.color,
        reservedCourtIds: new Set(category.reservedCourtIds),
        isRefereeMandatory: category.isRefereeMandatory || false,
        isScorerMandatory: category.isScorerMandatory || false,
        isDetailedRegistration: category.isDetailedRegistration ?? true,
      });
    } else {
      // For adding a new category, reset to defaults
      setCategoryForm({
        name: '',
        color: '#3498db',
        reservedCourtIds: new Set<number>(),
        isRefereeMandatory: false,
        isScorerMandatory: false,
        isDetailedRegistration: true,
      });
    }
  }, [category]);

  const handleCourtSelection = (courtId: number) => {
    setCategoryForm(prev => {
      const newReserved = new Set(prev.reservedCourtIds);
      if (newReserved.has(courtId)) {
        newReserved.delete(courtId);
      } else {
        newReserved.add(courtId);
      }
      return { ...prev, reservedCourtIds: newReserved };
    });
  };

  const handleSave = () => {
    if (categoryForm.name.trim() === '') {
        alert('Le nom de la catégorie ne peut pas être vide.');
        return;
    }
    
    // finalPhaseConfig is managed elsewhere, so we don't pass it from here.
    // A default will be added in the reducer if it's a new category.
    const payload = {
        ...categoryForm,
        reservedCourtIds: Array.from(categoryForm.reservedCourtIds),
        id: category?.id
    };

    onSave(payload as any);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">{category ? 'Modifier la Catégorie' : 'Ajouter une Nouvelle Catégorie'}</h2>
        <div className="space-y-4">
            <input
                type="text"
                placeholder="Nom de la Catégorie"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(p => ({...p, name: e.target.value}))}
                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3"
            />
            <input
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm(p => ({...p, color: e.target.value}))}
                className="mt-1 block w-full h-10"
            />
            <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="isRefereeMandatoryCheckbox"
                        checked={categoryForm.isRefereeMandatory}
                        onChange={(e) => setCategoryForm(p => ({...p, isRefereeMandatory: e.target.checked}))}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isRefereeMandatoryCheckbox" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Arbitre obligatoire dans chaque équipe
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="isScorerMandatoryCheckbox"
                        checked={categoryForm.isScorerMandatory}
                        onChange={(e) => setCategoryForm(p => ({...p, isScorerMandatory: e.target.checked}))}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isScorerMandatoryCheckbox" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Marqueur obligatoire dans chaque équipe
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="isDetailedRegistrationCheckbox"
                        checked={categoryForm.isDetailedRegistration}
                        onChange={(e) => setCategoryForm(p => ({...p, isDetailedRegistration: e.target.checked}))}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isDetailedRegistrationCheckbox" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Saisie détaillée (noms, prénoms, sexe). Si décoché, demande uniquement le nombre de joueuses.
                    </label>
                </div>
            </div>
            <div className="pt-2">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Terrains Réservés</h4>
                <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: numberOfCourts }, (_, i) => i + 1).map(courtId => (
                        <label key={courtId} className="flex items-center space-x-2 p-2 rounded-md bg-gray-100 dark:bg-gray-600">
                            <input
                                type="checkbox"
                                checked={categoryForm.reservedCourtIds.has(courtId)}
                                onChange={() => handleCourtSelection(courtId)}
                                className="rounded"
                            />
                            <span>Terrain {courtId}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
            <button onClick={onClose} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500">
                Annuler
            </button>
            <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                Sauvegarder
            </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryDialog;