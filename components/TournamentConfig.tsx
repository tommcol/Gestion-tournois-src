
import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Category, TournamentState } from '../types';
import CategoryDialog from './CategoryDialog';
import SponsorManager from './SponsorManager';
import ExportDialog from './ExportDialog';
import { generateId } from '../utils/id';

const TournamentConfig: React.FC = () => {
  const { state, dispatch } = useTournament();
  const { soundConfig } = state;
  const [tournamentName, setTournamentName] = useState(state.tournamentName);
  const [numberOfCourts, setNumberOfCourts] = useState(state.numberOfCourts);
  const [timerDuration, setTimerDuration] = useState(state.timerDuration / 60); // Store in minutes for UI
  const [breakDuration, setBreakDuration] = useState(state.breakDuration / 60); // Store in minutes for UI
  const [matchDisplayDuration, setMatchDisplayDuration] = useState(state.matchDisplayDuration);
  const [sponsorDisplayDuration, setSponsorDisplayDuration] = useState(state.sponsorDisplayDuration);
  const [enableCourtView, setEnableCourtView] = useState(state.enableCourtView ?? false);
  const [tvConfig, setTvConfig] = useState(state.tvConfig || {
    showNextMatches: true,
    showResults: true,
    showStandings: true,
    showSponsors: true,
    showLiveScores: false,
  });
  
  const [dialogOpenFor, setDialogOpenFor] = useState<Category | 'new' | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [soundFileNames, setSoundFileNames] = useState<{
      start?: string;
      end?: string;
      oneMinute?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openSections, setOpenSections] = useState({
      general: true,
      categories: true,
      advanced: false,
      advancedTv: true,
      advancedSounds: false,
      advancedSponsors: false,
      advancedCourts: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
      setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SectionHeader = ({ icon, title, sectionKey, badge }: { icon: string; title: string; sectionKey: keyof typeof openSections; badge?: string }) => (
      <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
          <span className="text-xl">{icon}</span>
          <span className="flex-1 font-bold text-gray-900 dark:text-white">{title}</span>
          {badge && <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded font-bold">{badge}</span>}
          <span className={`text-gray-400 transition-transform duration-200 ${openSections[sectionKey] ? 'rotate-180' : ''}`}>▼</span>
      </button>
  );

  // Update local state when global state changes (e.g. after a reset)
  useEffect(() => {
      setTournamentName(state.tournamentName);
      setNumberOfCourts(state.numberOfCourts);
      setTimerDuration(state.timerDuration / 60);
      setBreakDuration(state.breakDuration / 60);
      setMatchDisplayDuration(state.matchDisplayDuration);
      setSponsorDisplayDuration(state.sponsorDisplayDuration);
      setEnableCourtView(state.enableCourtView ?? false);
      if (state.tvConfig) {
          setTvConfig(state.tvConfig);
      }
  }, [state]);

  const handleSaveConfig = () => {
    // Validations
    if (!tournamentName || tournamentName.trim() === '') {
        alert('Le nom du tournoi ne peut pas être vide.');
        return;
    }
    if (numberOfCourts < 1) {
        alert('Le nombre de terrains doit être au moins 1.');
        return;
    }
    if (timerDuration < 1) {
        alert('La durée du match doit être au moins 1 minute.');
        return;
    }
    if (breakDuration < 0) {
        alert('La durée de pause ne peut pas être négative.');
        return;
    }

    dispatch({
      type: 'UPDATE_CONFIG',
      payload: { 
        tournamentName, 
        numberOfCourts,
        timerDuration: timerDuration * 60, // Convert back to seconds
        breakDuration: breakDuration * 60, // Convert back to seconds
        matchDisplayDuration,
        sponsorDisplayDuration,
        enableCourtView,
        tvConfig,
      },
    });
    alert('Configuration sauvegardée !');
  };

  const handleSaveCategory = (categoryData: Omit<Category, 'id' | 'finalPhaseConfig'> & { id?: string }) => {
      const { id, ...data } = categoryData;
      
      if (id) {
        const existingCategory = state.categories.find(c => c.id === id);
        if (existingCategory) {
            dispatch({ type: 'UPDATE_CATEGORY', payload: { ...existingCategory, ...data } });
        }
      } else {
        dispatch({ 
            type: 'ADD_CATEGORY', 
            payload: { 
                ...data, 
                id: generateId(),
                finalPhaseConfig: { teamsPerPool: 2, totalTeams: 4 } // Valeur par défaut
            } 
        });
      }
      setDialogOpenFor(null);
  }
  
  const handleCloseDialog = () => {
      setDialogOpenFor(null);
  }

  const handleSoundUpload = (type: 'start' | 'end' | 'oneMinute', event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) { // 1MB limit
              alert("Le fichier audio est trop volumineux (max 1 Mo).");
              return;
          }
          // NOUVEAU : sauvegarder le nom
          setSoundFileNames(prev => ({ ...prev, [type]: file.name }));
          
          const reader = new FileReader();
          reader.onloadend = () => {
              dispatch({ type: 'UPDATE_SOUND_CONFIG', payload: { [type]: reader.result as string } });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSoundReset = (type: 'start' | 'end' | 'oneMinute') => {
      setSoundFileNames(prev => ({ ...prev, [type]: undefined }));
      dispatch({ type: 'UPDATE_SOUND_CONFIG', payload: { [type]: undefined } });
  };

  // --- Export / Import Logic ---

  const handleNewTournament = () => {
      if (window.confirm("ATTENTION : Cette action va supprimer les équipes, les matchs et les résultats. Les catégories, les sponsors, les sons et la musique seront CONSERVÉS. Êtes-vous sûr de vouloir réinitialiser le tournoi ?")) {
          dispatch({ type: 'CLEAR_DATA' });
          alert("Données du tournoi réinitialisées.");
      }
  };

  return (
    <>
      <style>{`
        .toggle-checkbox:checked { right: 0; border-color: #3b82f6; }
        .toggle-checkbox:checked + .toggle-label { background-color: #3b82f6; }
      `}</style>
      <div className="space-y-4 max-w-4xl mx-auto">

        {/* SECTION 1 - INFORMATIONS GÉNÉRALES */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader icon="🏗️" title="Informations générales" sectionKey="general" />
            {openSections.general && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Nom du Tournoi</label>
                      <input
                        type="text"
                        value={tournamentName}
                        onChange={(e) => setTournamentName(e.target.value)}
                        className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Nombre de Terrains</label>
                      <input
                        type="number"
                        min="1"
                        value={numberOfCourts}
                        onChange={(e) => setNumberOfCourts(Number(e.target.value))}
                        className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Durée du Match (minutes)</label>
                            <input
                                type="number"
                                min="1"
                                value={timerDuration}
                                onChange={(e) => setTimerDuration(Number(e.target.value))}
                                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Temps de Pause (minutes)</label>
                            <input
                                type="number"
                                min="0"
                                value={breakDuration}
                                onChange={(e) => setBreakDuration(Number(e.target.value))}
                                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* SECTION 2 - CATÉGORIES & TERRAINS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader icon="🏷️" title="Catégories & Terrains" sectionKey="categories" />
            {openSections.categories && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {/* Liste des catégories avec affichage des terrains réservés */}
                    {state.categories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                            <div style={{ backgroundColor: cat.color }} className="w-4 h-4 rounded-full flex-shrink-0" />
                            <div className="flex-1">
                                <div className="font-bold text-sm">{cat.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {cat.reservedCourtIds.length > 0
                                        ? `Terrains réservés : ${cat.reservedCourtIds.join(', ')}`
                                        : 'Pas de terrain réservé'}
                                    {cat.isRefereeMandatory && ' • Arbitre'}
                                    {cat.isScorerMandatory && ' • Marqueur'}
                                </div>
                            </div>
                            <button
                                onClick={() => setDialogOpenFor(cat)}
                                className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-bold hover:bg-blue-200"
                            >
                                Modifier
                            </button>
                            <button
                                onClick={() => dispatch({ type: 'DELETE_CATEGORY', payload: cat.id })}
                                className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded font-bold hover:bg-red-200"
                            >
                                Supprimer
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setDialogOpenFor('new')}
                        className="w-full mt-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 font-bold text-sm transition-colors"
                    >
                        + Ajouter une catégorie
                    </button>
                </div>
            )}
        </div>

        {/* SECTION 3 - PARAMÈTRES AVANCÉS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader icon="⚙️" title="Paramètres avancés" sectionKey="advanced" badge="Optionnel" />
            {openSections.advanced && (
                <div className="border-t border-gray-100 dark:border-gray-700">

                    {/* 3a - Affichage TV */}
                    <div className="border-b border-gray-100 dark:border-gray-700">
                        <SectionHeader icon="📺" title="Affichage TV" sectionKey="advancedTv" />
                        {openSections.advancedTv && (
                            <div className="px-6 pb-4 pt-2 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Durée affichage matchs TV (sec)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={matchDisplayDuration}
                                      onChange={(e) => setMatchDisplayDuration(Number(e.target.value))}
                                      className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Durée affichage sponsors TV (sec)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={sponsorDisplayDuration}
                                      onChange={(e) => setSponsorDisplayDuration(Number(e.target.value))}
                                      className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                  <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                      <input 
                                          type="checkbox" 
                                          checked={tvConfig?.showNextMatches ?? true}
                                          onChange={(e) => setTvConfig(prev => ({ ...prev, showNextMatches: e.target.checked }))}
                                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-medium">Prochains Matchs</span>
                                  </label>
                                  <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                      <input 
                                          type="checkbox" 
                                          checked={tvConfig?.showResults ?? true}
                                          onChange={(e) => setTvConfig(prev => ({ ...prev, showResults: e.target.checked }))}
                                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-medium">Résultats Précédents</span>
                                  </label>
                                  <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                      <input 
                                          type="checkbox" 
                                          checked={tvConfig?.showStandings ?? true}
                                          onChange={(e) => setTvConfig(prev => ({ ...prev, showStandings: e.target.checked }))}
                                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-medium">Classements</span>
                                  </label>
                                  <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                      <input 
                                          type="checkbox" 
                                          checked={tvConfig?.showSponsors ?? true}
                                          onChange={(e) => setTvConfig(prev => ({ ...prev, showSponsors: e.target.checked }))}
                                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-medium">Sponsors</span>
                                  </label>
                                  <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                      <input 
                                          type="checkbox" 
                                          checked={tvConfig?.showChronoOnTv ?? true}
                                          onChange={(e) => setTvConfig(prev => ({ ...prev, showChronoOnTv: e.target.checked }))}
                                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-medium">Afficher Chrono</span>
                                  </label>
                                  <div className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors ${
                                      !enableCourtView ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
                                  }`}>
                                      <input 
                                          type="checkbox" 
                                          id="showLiveScores"
                                          checked={tvConfig?.showLiveScores ?? false}
                                          disabled={!enableCourtView}
                                          onChange={(e) => {
                                              if (!enableCourtView) return;
                                              setTvConfig(prev => ({ ...prev, showLiveScores: e.target.checked }));
                                          }}
                                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                          style={{ cursor: enableCourtView ? 'pointer' : 'not-allowed' }}
                                      />
                                      <div>
                                          <label 
                                              htmlFor="showLiveScores" 
                                              className="font-bold text-sm"
                                              style={{ cursor: enableCourtView ? 'pointer' : 'not-allowed' }}
                                          >
                                              Scores en Direct
                                          </label>
                                          {!enableCourtView && (
                                              <p className="text-[10px] text-gray-400 mt-0.5">
                                                  Activez d'abord les tablettes terrain (en dessous).
                                              </p>
                                          )}
                                      </div>
                                  </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3b - Sons */}
                    <div className="border-b border-gray-100 dark:border-gray-700">
                        <SectionHeader icon="🔔" title="Sons personnalisés" sectionKey="advancedSounds" />
                        {openSections.advancedSounds && (
                            <div className="px-6 pb-4 pt-2 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Sifflet de Départ</label>
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-sm rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 border-0">
                                            Choisir un fichier
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                onChange={(e) => handleSoundUpload('start', e)}
                                            />
                                        </label>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {soundFileNames.start || 'Aucun fichier choisi'}
                                        </span>
                                        {soundConfig?.start && (
                                            <button onClick={() => handleSoundReset('start')} className="text-xs text-red-600 hover:underline ml-auto">
                                                Réinitialiser
                                            </button>
                                        )}
                                    </div>
                                    {soundConfig?.start && <p className="text-xs text-green-600 mt-1">Son personnalisé actif</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Alerte 1 Minute (Optionnel)</label>
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-sm rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 border-0">
                                            Choisir un fichier
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                onChange={(e) => handleSoundUpload('oneMinute', e)}
                                            />
                                        </label>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {soundFileNames.oneMinute || 'Aucun fichier choisi'}
                                        </span>
                                        {soundConfig?.oneMinute && (
                                            <button onClick={() => handleSoundReset('oneMinute')} className="text-xs text-red-600 hover:underline ml-auto">
                                                Réinitialiser
                                            </button>
                                        )}
                                    </div>
                                    {soundConfig?.oneMinute && <p className="text-xs text-green-600 mt-1">Son personnalisé actif</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Corne de Fin</label>
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-sm rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 border-0">
                                            Choisir un fichier
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                onChange={(e) => handleSoundUpload('end', e)}
                                            />
                                        </label>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {soundFileNames.end || 'Aucun fichier choisi'}
                                        </span>
                                        {soundConfig?.end && (
                                            <button onClick={() => handleSoundReset('end')} className="text-xs text-red-600 hover:underline ml-auto">
                                                Réinitialiser
                                            </button>
                                        )}
                                    </div>
                                    {soundConfig?.end && <p className="text-xs text-green-600 mt-1">Son personnalisé actif</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3c - Sponsors */}
                    <div className="border-b border-gray-100 dark:border-gray-700">
                        <SectionHeader icon="🏢" title="Sponsors" sectionKey="advancedSponsors" />
                        {openSections.advancedSponsors && (
                            <div className="px-6 pb-4 pt-2">
                                <SponsorManager />
                            </div>
                        )}
                    </div>

                    {/* 3d - Tablettes terrain */}
                    <div>
                        <SectionHeader icon="📱" title="Tablettes terrain" sectionKey="advancedCourts" />
                        {openSections.advancedCourts && (
                            <div className="px-6 pb-4 pt-2">
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <input
                                    type="checkbox"
                                    id="enableCourtView"
                                    checked={enableCourtView}
                                    onChange={(e) => setEnableCourtView(e.target.checked)}
                                    className="w-5 h-5 cursor-pointer accent-blue-600"
                                  />
                                  <div>
                                    <label htmlFor="enableCourtView" className="font-bold text-sm cursor-pointer dark:text-gray-200">
                                      Activer les tablettes terrain
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      Permet l'accès à la feuille de marque sur tablette via ?view=court&court=N.
                                    </p>
                                  </div>
                                </div>
                                {enableCourtView && (
                                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <h3 className="font-bold text-sm text-blue-700 dark:text-blue-300 mb-3">
                                            Feuilles de marque — Liens d'accès
                                        </h3>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                                            Ouvrez ces liens sur chaque tablette terrain et mettez-les en favori.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {Array.from({ length: state.numberOfCourts }, (_, i) => i + 1).map(court => (
                                                <button
                                                    key={court}
                                                    onClick={() => window.open(`${window.location.origin}?view=court&court=${court}`, '_blank')}
                                                    className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm font-bold text-blue-700 dark:text-blue-300 transition-colors"
                                                >
                                                    <span>Terrain {court}</span>
                                                    <span className="text-xs font-normal text-blue-400">
                                                        ?view=court&court={court}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>

        {/* Bouton Sauvegarder - après tous les paramètres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <button
                onClick={handleSaveConfig}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-base transition-colors"
            >
                💾 Sauvegarder tous les paramètres
            </button>
        </div>

        {/* Backup & Restore and Danger Zone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-indigo-500">
                <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-200">Export & Import</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Exportez ou importez les données du tournoi (équipes, matchs, réglages).
                </p>
                <button 
                    onClick={() => setIsExportDialogOpen(true)}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold shadow-md transition-transform hover:scale-[1.01]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Menu d'Export / Import
                </button>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 shadow-sm border-l-4 border-l-red-500">
                <h2 className="text-xl font-bold mb-2 text-red-800 dark:text-red-200">Zone de Danger</h2>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                    Supprime les matchs et équipes. Catégories, sponsors et paramètres sont conservés.
                </p>
                <button 
                    onClick={handleNewTournament}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-bold flex items-center justify-center gap-2 shadow-md transition-all transform hover:scale-[1.02]"
                >
                    CRÉER UN NOUVEAU TOURNOI
                </button>
            </div>
        </div>
      </div>
      {dialogOpenFor !== null && (
        <CategoryDialog 
            category={dialogOpenFor === 'new' ? null : dialogOpenFor}
            onClose={handleCloseDialog}
            onSave={handleSaveCategory}
            numberOfCourts={numberOfCourts}
        />
      )}
      {isExportDialogOpen && (
        <ExportDialog onClose={() => setIsExportDialogOpen(false)} />
      )}
    </>
  );
};

export default TournamentConfig;
