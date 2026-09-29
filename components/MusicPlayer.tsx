
import React, { useRef, useState, useEffect } from 'react';
import { soundManager } from '../assets/sounds';
import { useTournament } from '../context/TournamentContext';

interface Track {
    name: string;
    url: string;
}

const MusicPlayer: React.FC = () => {
    const { state, dispatch, emitMusicCommand } = useTournament();
    const playlist = state.playlist || [];
    const isTvMode = window.location.search.includes('view=tv');

    const safeEmitMusicCommand = (cmd: any) => {
        if (!isTvMode) emitMusicCommand(cmd);
    };

    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(() => {
        const saved = sessionStorage.getItem('music_current_index');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [isPlaying, setIsPlaying] = useState(() => {
        return sessionStorage.getItem('music_was_playing') === 'true';
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isShuffle, setIsShuffle] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [prevVolume, setPrevVolume] = useState(0.5);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const [isMuted, setIsMuted] = useState(soundManager.getMuteState());

    useEffect(() => {
        sessionStorage.setItem('music_current_index', currentIndex.toString());
    }, [currentIndex]);

    useEffect(() => {
        sessionStorage.setItem('music_was_playing', isPlaying.toString());
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            if (audioRef.current) {
                sessionStorage.setItem('music_current_time', audioRef.current.currentTime.toString());
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [isPlaying]);

    // Initial setup
    useEffect(() => {
        if (audioRef.current) {
            soundManager.connectMusicElement(audioRef.current);
            soundManager.setMusicVolume(volume);
        }
        
        // Sync local state with SoundManager
        setIsMuted(soundManager.getMuteState());

        // Auto-clean playlist URLs if they contain localhost (legacy issue)
        const needsCleaning = playlist.some(t => t.url.includes('localhost') || t.url.includes('127.0.0.1'));
        if (needsCleaning && !isTvMode) {
            const cleaned = playlist.map(t => {
                if (t.url.includes('localhost') || t.url.includes('127.0.0.1')) {
                    const parts = t.url.split('/uploads/');
                    return { ...t, url: parts.length > 1 ? '/uploads/' + parts[1] : t.url };
                }
                return t;
            });
            dispatch({ type: 'UPDATE_PLAYLIST', payload: cleaned });
            safeEmitMusicCommand({ command: 'playlist_update', payload: { playlist: cleaned } });
        }

        const handleUnlock = () => {
            if (audioRef.current) {
                audioRef.current.play().then(() => {
                    if (isTvMode && playlist.length > 0) {
                        setIsPlaying(true);
                    } else {
                        audioRef.current?.pause();
                    }
                }).catch(e => console.warn("Unlock failed", e));
            }
            soundManager.ensureContextState().catch(e => console.warn("Unlock context failed", e));
        };

        const handleRemoteMusic = async (e: any) => {
            const { command, payload } = e.detail;
            if (command === 'play') {
                setIsPlaying(true);
                audioRef.current?.play().catch(e => console.warn("Remote play failed", e));
            } else if (command === 'pause') {
                setIsPlaying(false);
                audioRef.current?.pause();
            } else if (command === 'track_change') {
                setCurrentIndex(payload.index);
                setIsPlaying(true);
            } else if (command === 'playlist_update') {
                dispatch({ type: 'UPDATE_PLAYLIST', payload: payload.playlist });
            } else if (command === 'seek') {
                if (audioRef.current) {
                    const diff = Math.abs(audioRef.current.currentTime - payload.time);
                    if (diff > 2) { // Only sync if drift is > 2s
                        audioRef.current.currentTime = payload.time;
                    }
                }
            }
        };

        window.addEventListener('tournament_music_sync', handleRemoteMusic);
        window.addEventListener('unlock_music_player', handleUnlock);
        
        return () => {
            window.removeEventListener('tournament_music_sync', handleRemoteMusic);
            window.removeEventListener('unlock_music_player', handleUnlock);
        };
    }, [playlist, currentIndex, volume, dispatch, isTvMode]);

    // Load track when index changes
    useEffect(() => {
        if (playlist.length > 0 && audioRef.current) {
            const track = playlist[currentIndex];
            let url = track.url;
            
            // Si l'URL est absolue et contient localhost, on la rend relative pour la TV
            if (url.includes('localhost') || url.includes('127.0.0.1')) {
                const parts = url.split('/uploads/');
                if (parts.length > 1) {
                    url = '/uploads/' + parts[1];
                }
            }
            
            // Toujours s'assurer que l'URL est relative au domaine actuel
            if (url.startsWith('/')) {
                url = `${window.location.origin}${url}`;
            }
            
            audioRef.current.src = url;
            audioRef.current.load();
            
            // Restaurer la position sauvegardée si c'est le même morceau
            const savedTime = sessionStorage.getItem('music_current_time');
            if (savedTime) {
                const time = parseFloat(savedTime);
                audioRef.current.addEventListener('loadedmetadata', function onLoaded() {
                    if (audioRef.current && time < audioRef.current.duration) {
                        audioRef.current.currentTime = time;
                    }
                    audioRef.current?.removeEventListener('loadedmetadata', onLoaded);
                }, { once: true });
                // Effacer après restauration pour ne pas re-seek sur un changement de morceau volontaire
                sessionStorage.removeItem('music_current_time');
            }
            
            // Si la musique était en lecture avant le re-render, reprendre
            if (isPlaying) {
                audioRef.current.play().catch(e => console.warn('Auto-resume failed:', e));
            }
        }
    }, [currentIndex, playlist]);

    // Periodic seek sync and local time update
    useEffect(() => {
        const interval = setInterval(() => {
            if (isPlaying && audioRef.current) {
                const time = audioRef.current.currentTime;
                setCurrentTime(time);
                
                if (!isTvMode && playlist.length > 0) {
                    safeEmitMusicCommand({ command: 'seek', payload: { time } });
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, playlist, isTvMode]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setIsUploading(true);
            const newTracks: Track[] = [];
            
            for (const file of Array.from(files)) {
                try {
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'x-file-name': encodeURIComponent(file.name),
                            'Content-Type': file.type
                        },
                        body: await file.arrayBuffer()
                    });
                    
                    if (!response.ok) throw new Error('Upload failed');
                    
                    const data = await response.json();
                    // Store relative URL so it works on any device (PC or TV)
                    newTracks.push({ name: file.name, url: data.url });
                } catch (err) {
                    console.error('Upload failed for', file.name, err);
                }
            }

            if (newTracks.length > 0) {
                const updatedPlaylist = [...playlist, ...newTracks];
                dispatch({ type: 'UPDATE_PLAYLIST', payload: updatedPlaylist });
                safeEmitMusicCommand({ command: 'playlist_update', payload: { playlist: updatedPlaylist } });
                
                if (playlist.length === 0) {
                    setCurrentIndex(0);
                    setIsPlaying(true);
                    safeEmitMusicCommand({ command: 'track_change', payload: { index: 0 } });
                }
            }
            setIsUploading(false);
        }
    };

    const togglePlay = async () => {
        if (!audioRef.current || playlist.length === 0) return;

        await soundManager.ensureContextState();

        if (isPlaying) {
            audioRef.current.pause();
            safeEmitMusicCommand({ command: 'pause' });
        } else {
            audioRef.current.play();
            safeEmitMusicCommand({ command: 'play' });
        }
        setIsPlaying(!isPlaying);
    };
    
    const toggleShuffle = () => {
        setIsShuffle(!isShuffle);
    };
    
    const playTrack = (index: number) => {
        setCurrentIndex(index);
        setIsPlaying(true);
        setShowPlaylist(false);
        safeEmitMusicCommand({ command: 'track_change', payload: { index } });
    };

    const removeTrack = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        const updatedPlaylist = playlist.filter((_, i) => i !== index);
        dispatch({ type: 'UPDATE_PLAYLIST', payload: updatedPlaylist });
        safeEmitMusicCommand({ command: 'playlist_update', payload: { playlist: updatedPlaylist } });
        
        if (currentIndex === index) {
            if (updatedPlaylist.length === 0) {
                setIsPlaying(false);
            } else {
                const nextIndex = index % updatedPlaylist.length;
                setCurrentIndex(nextIndex);
                safeEmitMusicCommand({ command: 'track_change', payload: { index: nextIndex } });
            }
        } else if (currentIndex > index) {
            setCurrentIndex(prev => prev - 1);
        }
    };
    
    const playNext = () => {
        if (playlist.length === 0) return;
        
        let nextIndex;
        if (isShuffle && playlist.length > 1) {
            nextIndex = Math.floor(Math.random() * playlist.length);
            let attempts = 0;
            while (nextIndex === currentIndex && attempts < 3) {
                nextIndex = Math.floor(Math.random() * playlist.length);
                attempts++;
            }
        } else {
            nextIndex = (currentIndex + 1) % playlist.length;
        }
        
        setCurrentIndex(nextIndex);
        emitMusicCommand({ command: 'track_change', payload: { index: nextIndex } });
    };

    const playPrev = () => {
        if (playlist.length === 0) return;
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        setCurrentIndex(prevIndex);
        emitMusicCommand({ command: 'track_change', payload: { index: prevIndex } });
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        soundManager.setMusicVolume(newVolume);
    };

    const toggleMute = () => {
        const newState = soundManager.toggleMute();
        setIsMuted(newState);
    };
    
    const handleTrackEnded = () => {
        playNext();
    };

    const currentTrackName = playlist[currentIndex]?.name || "";

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative z-30"> 
            <audio 
                ref={audioRef} 
                onEnded={() => !isTvMode && playNext()}
            />
            <div className="flex items-center bg-gray-800 dark:bg-gray-700 p-1 rounded-md border border-gray-700 dark:border-gray-600 h-10">
                
                <div className="relative overflow-hidden flex-shrink-0 mx-1">
                    <input 
                        type="file" 
                        accept="audio/*" 
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        title="Ajouter des musiques (Sélection multiple)"
                        disabled={isUploading}
                    />
                    <button className={`text-gray-300 hover:text-white p-1 rounded-full ${isUploading ? 'bg-blue-600 animate-pulse' : 'bg-gray-600'}`} title="Ajouter Musiques">
                        {isUploading ? (
                             <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Bouton Playlist */}
                <button 
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className={`mx-1 p-1 rounded-full transition-colors ${showPlaylist ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
                    title="Voir la playlist"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                
                <button 
                    onClick={toggleShuffle}
                    className={`mx-1 p-1 rounded-full transition-colors ${isShuffle ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    title={isShuffle ? "Lecture aléatoire active" : "Activer la lecture aléatoire"}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                </button>

                <div className="flex items-center">
                     <button onClick={playPrev} disabled={playlist.length <= 1} className="text-gray-400 hover:text-white disabled:opacity-30 p-1">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                        </svg>
                     </button>

                    <button onClick={togglePlay} className="text-white hover:text-blue-400 mx-1 p-1" title={isPlaying ? "Pause" : "Lecture"} disabled={isLoading}>
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </button>

                    <button onClick={playNext} disabled={playlist.length <= 1} className="text-gray-400 hover:text-white disabled:opacity-30 p-1">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex flex-col w-32 ml-2 h-full justify-center">
                    <div className="text-[10px] text-gray-300 truncate w-full font-medium mb-0.5 leading-tight" title={currentTrackName}>
                        {playlist.length > 0 ? `${currentIndex + 1}/${playlist.length} ${currentTrackName} (${formatTime(currentTime)})` : 'Playlist vide...'}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={toggleMute} className={`hover:text-white focus:outline-none ${isMuted ? 'text-red-500' : 'text-gray-400'}`} title={isMuted ? "Rétablir le son" : "Couper le son"}>
                             {isMuted ? (
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                               </svg>
                            ) : (
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                               </svg>
                            )}
                        </button>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01" 
                            value={volume} 
                            onChange={handleVolumeChange}
                            className="h-1 w-full bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            title={`Volume: ${Math.round(volume * 100)}%`}
                        />
                    </div>
                </div>
            </div>

            {/* Dropdown Playlist */}
            {showPlaylist && playlist.length > 0 && (
                <div className="absolute top-full right-0 mt-1 w-64 max-h-60 bg-gray-800 border border-gray-600 rounded-md shadow-xl overflow-y-auto z-40">
                    <div className="p-2 text-xs font-bold text-gray-400 border-b border-gray-700">
                        Liste de lecture ({playlist.length})
                    </div>
                    <ul className="py-1">
                        {playlist.map((file, idx) => (
                            <li key={idx}>
                                <button 
                                    onClick={() => playTrack(idx)}
                                    className={`w-full text-left px-3 py-2 text-xs truncate hover:bg-gray-700 flex items-center justify-between group ${idx === currentIndex ? 'text-blue-400 font-semibold bg-gray-700' : 'text-gray-300'}`}
                                >
                                    <span className="truncate">{idx + 1}. {file.name}</span>
                                    {!isTvMode && (
                                        <span 
                                            onClick={(e) => removeTrack(e, idx)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                                            title="Supprimer"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default MusicPlayer;
