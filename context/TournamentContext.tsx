
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

const saveTournamentState = async (newState: TournamentState) => {
    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newState)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            alert('⚠️ ERREUR : Impossible de sauvegarder les données du tournoi. Vérifiez l\'espace disque.');
        }
    } catch (error) {
        alert('⚠️ ERREUR : Le serveur ne répond pas. Les données ne sont pas sauvegardées.');
        console.error('Save error:', error);
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
  socket: Socket | null;
} | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const lastReceivedStateRef = useRef<string>('');
  const isUpdatingFromSocket = useRef<boolean>(false);

  // Initialize Socket.io
  useEffect(() => {
    // In production, we connect to the same host. In dev, we might need to specify the port if not using the proxy.
    const socket = io();
    socketRef.current = socket;

    socket.on('state_update', (newState: TournamentState) => {
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

    // Fallback si le serveur n'a pas de state
    socket.on('connect', () => {
      console.log('Connected to server');
      // If we already have local state (e.g. from a previous session or just edited), 
      // and the server hasn't sent anything yet, we should push our state to the server
      // instead of waiting for a potentially empty state.
      setTimeout(async () => {
        setIsLoaded(prev => {
          if (!prev) {
            // NOUVEAU : Essayer de récupérer depuis IndexedDB
            loadFromIndexedDB().then(savedState => {
              if (savedState) {
                console.log('Récupération depuis IndexedDB après crash');
                dispatch({ type: 'SET_STATE', payload: savedState });
                // Pousser vers le serveur pour resynchroniser
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

    socket.on('audio_event', (data) => {
      // Dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('tournament_audio_event', { detail: data }));
    });

    socket.on('music_sync', (data) => {
      window.dispatchEvent(new CustomEvent('tournament_music_sync', { detail: data }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Broadcast state changes to server
  useEffect(() => {
    if (!isLoaded || isUpdatingFromSocket.current || !socketRef.current) return;
    
    const currentStateString = JSON.stringify(state);
    if (currentStateString === lastReceivedStateRef.current) return;

    socketRef.current.emit('update_state', state);
    saveTournamentState(state);
    
    // NOUVEAU : Sauvegarde IndexedDB en parallèle (filet de sécurité)
    saveToIndexedDB(state).catch(err => {
        console.warn('IndexedDB save failed:', err);
    });
    
    lastReceivedStateRef.current = currentStateString;
  }, [state, isLoaded]);

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
