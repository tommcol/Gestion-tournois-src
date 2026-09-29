
import React, { createContext, useReducer, useContext, useEffect, ReactNode, useRef, useState } from 'react';
import { TournamentState, TournamentAction, Team, FinalMatch } from '../types';
import { initialData } from '../data/initialData';
import { generatePools, generateMatchesForPools } from '../utils/poolLogic';
import { updateWinnerInFinals, generateAutoPairings, createEmptyPairings } from '../utils/finalPhaseLogic';
import { generateSchedule } from '../utils/scheduleLogic';
import { calculateAllStandings } from '../utils/standingsLogic';
import { io, Socket } from 'socket.io-client';
import { saveTournamentState as saveToIndexedDB, loadTournamentState as loadFromIndexedDB } from '../utils/db';

import { configReducer } from './reducers/configReducer';
import { categoryReducer } from './reducers/categoryReducer';
import { teamReducer } from './reducers/teamReducer';
import { poolMatchReducer } from './reducers/poolMatchReducer';
import { finalPhaseReducer } from './reducers/finalPhaseReducer';
import { sponsorReducer } from './reducers/sponsorReducer';
import { sessionReducer } from './reducers/sessionReducer';
import { globalReducer } from './reducers/globalReducer';

const STORAGE_KEY = 'tournament_preview_state';

const loadLocalOrInitialData = async (): Promise<TournamentState> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('LocalStorage read error:', e);
    }

    try {
        const fromIdb = await loadFromIndexedDB();
        if (fromIdb) return fromIdb;
    } catch (e) {
        console.warn('IndexedDB read error:', e);
    }

    return initialData;
};

const saveTournamentState = async (newState: TournamentState) => {
    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newState)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            console.warn('⚠️ Impossible de sauvegarder les données sur le serveur.');
        }
    } catch (error) {
        console.warn('Save error (serveur non joignable):', error);
    }
};

const initialState: TournamentState = initialData;

const tournamentReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  // Try each sub-reducer. If a sub-reducer handles the action, it returns a new state.
  // Otherwise, it returns the original state.
  
  let newState = globalReducer(state, action);
  if (newState !== state) return newState;

  newState = configReducer(state, action);
  if (newState !== state) return newState;

  newState = categoryReducer(state, action);
  if (newState !== state) return newState;

  newState = teamReducer(state, action);
  if (newState !== state) return newState;

  newState = poolMatchReducer(state, action);
  if (newState !== state) return newState;

  newState = finalPhaseReducer(state, action);
  if (newState !== state) return newState;

  newState = sponsorReducer(state, action);
  if (newState !== state) return newState;

  newState = sessionReducer(state, action);
  if (newState !== state) return newState;

  return state;
};

const TournamentContext = createContext<{ 
  state: TournamentState; 
  dispatch: React.Dispatch<TournamentAction>;
  emitAudioEvent: (data: any) => void;
  emitMusicCommand: (data: any) => void;
  isLoaded: boolean;
  isPreviewMode: boolean;
  socket: Socket | null;
} | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const lastReceivedStateRef = useRef<string>('');
  const isUpdatingFromSocket = useRef<boolean>(false);

  // Initialize Socket.io and Preview Mode fallback
  useEffect(() => {
    let hasLoaded = false;
    let fallbackTimer: any = null;

    // Si aucun serveur n'est joignable sous 1.2s, on démarre en Mode Aperçu
    fallbackTimer = setTimeout(async () => {
      if (!hasLoaded) {
        console.warn('Mode aperçu activé : serveur non joignable');
        const localData = await loadLocalOrInitialData();
        hasLoaded = true;
        dispatch({ type: 'SET_STATE', payload: localData });
        setIsPreviewMode(true);
        setIsLoaded(true);
      }
    }, 1200);

    const socket = io({
      timeout: 3000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect_error', async (err) => {
      console.warn('Serveur non joignable (connect_error):', err.message);
      if (!hasLoaded) {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        const localData = await loadLocalOrInitialData();
        hasLoaded = true;
        dispatch({ type: 'SET_STATE', payload: localData });
        setIsPreviewMode(true);
        setIsLoaded(true);
      }
    });

    socket.on('connect', () => {
      console.log('Connecté au serveur du PC (réseau local)');
      if (fallbackTimer) clearTimeout(fallbackTimer);
      setIsPreviewMode(false);

      setTimeout(async () => {
        setIsLoaded(prev => {
          if (!prev) {
            hasLoaded = true;
            loadFromIndexedDB().then(savedState => {
              if (savedState) {
                console.log('Récupération depuis IndexedDB après crash');
                dispatch({ type: 'SET_STATE', payload: savedState });
                socket.emit('update_state', savedState);
              } else {
                console.log('Aucune donnée locale, démarrage à vide');
                socket.emit('update_state', state);
              }
            }).catch(() => {
              socket.emit('update_state', state);
            });
            return true;
          }
          return prev;
        });
      }, 2000);
    });

    socket.on('state_update', (newState: TournamentState) => {
      hasLoaded = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      setIsPreviewMode(false);
      const stateString = JSON.stringify(newState);
      if (stateString !== lastReceivedStateRef.current) {
        lastReceivedStateRef.current = stateString;
        isUpdatingFromSocket.current = true;
        dispatch({ type: 'SET_STATE', payload: newState });
        setIsLoaded(true);
        setTimeout(() => {
          isUpdatingFromSocket.current = false;
        }, 100);
      }
    });

    socket.on('audio_event', (data) => {
      window.dispatchEvent(new CustomEvent('tournament_audio_event', { detail: data }));
    });

    socket.on('music_sync', (data) => {
      window.dispatchEvent(new CustomEvent('tournament_music_sync', { detail: data }));
    });

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      socket.disconnect();
    };
  }, []);

  // Broadcast state changes to server or save locally in preview mode
  useEffect(() => {
    if (!isLoaded || isUpdatingFromSocket.current) return;
    
    const currentStateString = JSON.stringify(state);
    if (currentStateString === lastReceivedStateRef.current) return;

    if (isPreviewMode || !socketRef.current?.connected) {
      // Mode aperçu : enregistre les changements dans ce navigateur uniquement
      try {
        localStorage.setItem(STORAGE_KEY, currentStateString);
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
      saveToIndexedDB(state).catch(err => {
        console.warn('IndexedDB save failed:', err);
      });
    } else {
      // Réseau local : quand le serveur du PC est joignable, conserve le fonctionnement actuel
      socketRef.current.emit('update_state', state);
      saveTournamentState(state);
      
      saveToIndexedDB(state).catch(err => {
        console.warn('IndexedDB save failed:', err);
      });
      try {
        localStorage.setItem(STORAGE_KEY, currentStateString);
      } catch (e) {}
    }
    
    lastReceivedStateRef.current = currentStateString;
  }, [state, isLoaded, isPreviewMode]);

  const emitAudioEvent = (data: any) => {
    socketRef.current?.emit('play_audio', data);
  };

  const emitMusicCommand = (data: any) => {
    socketRef.current?.emit('music_command', data);
  };
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <TournamentContext.Provider value={{ 
      state, 
      dispatch, 
      emitAudioEvent, 
      emitMusicCommand, 
      isLoaded,
      isPreviewMode,
      socket: socketRef.current 
    }}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};

export const useTournamentContext = useTournament;
