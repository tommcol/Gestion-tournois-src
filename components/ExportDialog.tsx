
import React, { useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { TournamentState } from '../types';

interface ExportDialogProps {
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ onClose }) => {
  const { state, dispatch } = useTournament();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = async () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    const fileName = `${(state.tournamentName || 'tournoi').replace(/\s+/g, '_')}_backup_${dateStr}.json`;

    // Fenêtre Enregistrer sous (Chrome/Edge)
    if ('showSaveFilePicker' in window) {
        try {
            const fileHandle = await (window as any).showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Fichier JSON',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await fileHandle.createWritable();
            await writable.write(dataStr);
            await writable.close();
            return;
        } catch (e) {
            if ((e as Error).name === 'AbortError') return;
        }
    }

    // Fallback téléchargement classique
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (!importedData.categories || !importedData.teams) {
          throw new Error("Format de fichier invalide");
        }

        if (window.confirm("⚠️ ATTENTION : L'importation va écraser TOUTES les données actuelles. Continuer ?")) {
          dispatch({ type: 'SET_STATE', payload: importedData as TournamentState });
          alert("Importation réussie !");
          onClose();
        }
      } catch (error) {
        alert("Erreur d'importation : Le fichier est invalide.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Gestion des Données
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Il est recommandé de faire une sauvegarde CSV ou JSON avant de modifier des éléments critiques du tournoi.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={handleExportJSON}
              className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Exporter vers JSON</span>
              <span className="text-xs text-gray-500 mt-1">Sauvegarde complète du tournoi</span>
            </button>

            <button 
              onClick={handleImportClick}
              className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all"
            >
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Importer JSON</span>
              <span className="text-xs text-gray-500 mt-1">Restaurer une session précédente</span>
            </button>
          </div>
          
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-center border-t border-gray-100 dark:border-gray-700">
          <button 
            onClick={onClose}
            className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Fermer la fenêtre
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
