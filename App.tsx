
import React, { useState, useCallback, useEffect } from 'react';
import TournamentConfig from './components/TournamentConfig';
import TeamManager from './components/TeamManager';
import PoolsDisplay from './components/PoolsDisplay';
import GlobalSchedule from './components/GlobalSchedule';
import StandingsDisplay from './components/StandingsDisplay';
import FinalPhaseManager from './components/FinalPhaseManager';
import GlobalTimer from './components/GlobalTimer';
import HelpGuide from './components/HelpGuide';
import MusicPlayer from './components/MusicPlayer';
import { useTournament } from './context/TournamentContext';
import TVDisplay from './components/TVDisplay';
import TeamRoadmaps from './components/TeamRoadmaps';
import OfficialsManager from './components/OfficialsManager';
import CourtView from './components/CourtView';

type View = 'config' | 'teams' | 'pools' | 'schedule' | 'standings' | 'finals' | 'roadmaps' | 'officials' | 'help';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(() => {
    const saved = sessionStorage.getItem('admin_active_view') as View | null;
    return saved || 'config';
  });
  
  const handleSetActiveView = (view: View) => {
    sessionStorage.setItem('admin_active_view', view);
    setActiveView(view);
  };
  const { state, isPreviewMode } = useTournament();
  const { tournamentName } = state;
  
  // Gestion du mode TV et Court
  const [isTvMode, setIsTvMode] = useState(false);
  const [isCourtMode, setIsCourtMode] = useState(false);
  const [courtNumber, setCourtNumber] = useState(0);
  const [isMutedUrl, setIsMutedUrl] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const muteParam = params.get('mute');
    const courtParam = params.get('court');
    
    if (viewParam === 'tv' || viewParam === 'tv_sponsors') {
      setIsTvMode(true);
      if (muteParam === 'true') {
        setIsMutedUrl(true);
      }
    } else if (viewParam === 'court') {
      const cNum = parseInt(courtParam || '0');
      if (cNum > 0) {
        setIsCourtMode(true);
        setCourtNumber(cNum);
      }
    }
  }, []);
  
  const openTvMode = (muted: boolean = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'tv');
    if (muted) {
      url.searchParams.set('mute', 'true');
    }
    window.open(url.toString(), '_blank');
  };

  const renderView = useCallback(() => {
    switch (activeView) {
      case 'config':
        return <TournamentConfig />;
      case 'teams':
        return <TeamManager />;
      case 'pools':
        return <PoolsDisplay />;
      case 'schedule':
        return <GlobalSchedule />;
      case 'standings':
        return <StandingsDisplay />;
      case 'finals':
        return <FinalPhaseManager />;
      case 'roadmaps':
        return <TeamRoadmaps />;
      case 'officials':
        return <OfficialsManager />;
      case 'help':
        return <HelpGuide />;
      default:
        return <TournamentConfig />;
    }
  }, [activeView]);

  const NavItem: React.FC<{ view: View; label: string, children?: React.ReactNode }> = ({ view, label, children }) => (
    <button
      onClick={() => handleSetActiveView(view)}
      className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${
        activeView === view
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {children}
      {label}
    </button>
  );
  
  if (isTvMode) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black">
        {isPreviewMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-amber-950 font-bold px-4 py-1.5 rounded-full text-xs shadow-xl pointer-events-none border border-amber-300/50">
            Mode aperçu : données sur ce navigateur uniquement ; tablettes et TV non synchronisées
          </div>
        )}
        <TVDisplay />
        {/* "Leurres" pour le son et la musique : supprimés si mode muet activé */}
        {!isMutedUrl && (
          <div className="fixed bottom-0 right-0 opacity-0 pointer-events-none" style={{ width: '1px', height: '1px' }}>
            <MusicPlayer />
            <GlobalTimer />
          </div>
        )}
      </div>
    );
  }

  if (isCourtMode) {
    if (!state.enableCourtView) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
          <div className="text-xl font-bold mb-2">Vue tablette non activée</div>
          <div className="text-sm text-gray-500">Activez cette option dans la configuration du tournoi.</div>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-screen">
        {isPreviewMode && (
          <div className="bg-amber-500/95 text-amber-950 font-bold px-4 py-1.5 text-xs sm:text-sm flex items-center justify-center gap-2 text-center shrink-0 z-30 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Mode aperçu : données sur ce navigateur uniquement ; tablettes et TV non synchronisées</span>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <CourtView courtNumber={courtNumber} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-vestiaire flex flex-col h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      {isPreviewMode && (
        <div className="bg-amber-500/95 text-amber-950 font-bold px-4 py-1.5 text-xs sm:text-sm flex items-center justify-center gap-2 text-center shrink-0 z-30 shadow-md border-b border-amber-600/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Mode aperçu : données sur ce navigateur uniquement ; tablettes et TV non synchronisées</span>
        </div>
      )}
      <header className="bg-gray-900 text-white p-2 shadow-lg z-20 flex justify-between items-center shrink-0">
         {/* Left Section: Title and Mode Button - Can truncate */}
         <div className="flex items-center gap-3 pl-2 flex-1 min-w-0">
            <div className="text-xl font-bold hidden lg:block truncate">
              {tournamentName || 'Tournoi'}
            </div>
            <div className="flex space-x-2">
                <button
                  onClick={() => openTvMode(false)}
                  className="bg-purple-600 text-white py-1.5 px-4 rounded-md hover:bg-purple-700 text-sm font-bold whitespace-nowrap flex-shrink-0 shadow-lg flex items-center gap-2"
                  title="Ouvrir l'affichage TV (Avec Son)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2-2V5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Lancer la TV
                </button>
                <button
                  onClick={() => openTvMode(true)}
                  className="bg-gray-700 text-white py-1.5 px-4 rounded-md hover:bg-gray-600 text-sm font-bold whitespace-nowrap flex-shrink-0 shadow-lg flex items-center gap-2 border border-gray-600"
                  title="Ouvrir l'affichage TV (Sans Son)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  TV (Muet)
                </button>
            </div>
         </div>
         
         {/* Right Section: Music & Timer - Fixed width / No overflow hidden here */}
         <div className="flex items-center gap-3 px-2 flex-shrink-0">
             <div className="h-6 w-px bg-gray-700 mx-1"></div>
             <MusicPlayer />
             <GlobalTimer />
         </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 hidden md:flex">
          <nav className="flex flex-col space-y-2 flex-grow">
            <NavItem view="config" label="Configuration" />
            <NavItem view="teams" label="Équipes" />
            <NavItem view="pools" label="Organisation" />
            <NavItem view="schedule" label="Calendrier Global" />
            <NavItem view="standings" label="Classement" />
            <NavItem view="finals" label="Phase Finale" />
            <NavItem view="roadmaps" label="Feuilles de Route">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </NavItem>
            <NavItem view="officials" label="Arbitre / Marqueur">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </NavItem>
            <NavItem view="help" label="Aide">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </NavItem>
          </nav>
          <div className="text-xs text-gray-500 mt-auto pt-4 border-t border-gray-700">
            Version 2.1.0-tv-fix
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
