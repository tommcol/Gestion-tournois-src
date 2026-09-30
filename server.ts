import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { getPreviousSessionSnapshot } from './utils/sessionSnapshot';

const PORT = Number(process.env.PORT) || 3000;
const APP_DIR = process.env.TOURNAMENT_APP_DIR || process.cwd();
const DATA_DIR = process.env.TOURNAMENT_DATA_DIR || process.cwd();
const DATA_FILE = path.join(DATA_DIR, 'tournament_data.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

async function startServer() {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        maxHttpBufferSize: 1e8, // 100 MB
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    let persistenceQueue: Promise<void> = Promise.resolve();
    const persistTournamentState = (state: any) => {
        const serializedState = JSON.stringify(state, null, 2);
        const writeTask = persistenceQueue.then(async () => {
            await fs.promises.mkdir(DATA_DIR, { recursive: true });
            const temporaryFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
            await fs.promises.writeFile(temporaryFile, serializedState);
            await fs.promises.rename(temporaryFile, DATA_FILE);
        });
        persistenceQueue = writeTask.catch((err) => {
            console.error('Erreur sauvegarde:', err);
        });
        return writeTask;
    };

    // --- File Uploads ---
    const UPLOADS_DIR = process.env.TOURNAMENT_UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    app.post('/api/upload', express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
        let originalFileName = req.headers['x-file-name'] as string;
        if (!originalFileName) return res.status(400).send('Missing file name');
        
        let fileName = originalFileName;
        try {
            fileName = decodeURIComponent(originalFileName);
        } catch (e) {
            // Fallback if decoding fails
        }
        
        // Renommage automatique avec préfixe Date.now()
        const finalFileName = `${Date.now()}_${fileName}`;
        const filePath = path.join(UPLOADS_DIR, finalFileName);
        
        fs.writeFileSync(filePath, req.body);
        res.json({ url: `/uploads/${finalFileName}` });
    });

    app.use('/uploads', express.static(UPLOADS_DIR));

    app.get('/health', (_req, res) => {
        res.json({ ok: true });
    });

    app.post('/save', async (req, res) => {
        try {
            await persistTournamentState(req.body);
            res.json({ success: true });
        } catch (err) {
            console.error('Erreur sauvegarde:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Impossible de sauvegarder les données' 
            });
        }
    });

    // --- Persistence Logic ---
    let tournamentState: any = null;

    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            tournamentState = JSON.parse(data);
            console.log('Loaded tournament state from disk');
        } catch (e) {
            console.error('Failed to load tournament state:', e);
        }
    }

    const cleanupSnapshots = () => {
        if (!fs.existsSync(BACKUPS_DIR)) return;
        try {
            const files = fs.readdirSync(BACKUPS_DIR)
                .filter(f => f.startsWith('tournament_data_session_') && f.endsWith('.json'))
                .map(f => ({
                    name: f,
                    time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length > 5) {
                files.slice(5).forEach(f => {
                    fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
                    console.log(`Deleted old snapshot: ${f.name}`);
                });
            }
        } catch (e) {
            console.error('Failed to cleanup snapshots:', e);
        }
    };

    const saveSnapshot = (state: any, sessionNum: number) => {
        try {
            if (!fs.existsSync(BACKUPS_DIR)) {
                fs.mkdirSync(BACKUPS_DIR, { recursive: true });
            }
            const fileName = `tournament_data_session_${sessionNum}_${Date.now()}.json`;
            fs.writeFileSync(path.join(BACKUPS_DIR, fileName), JSON.stringify(state, null, 2));
            console.log(`Created snapshot for session ${sessionNum}`);
            cleanupSnapshots();
        } catch (e) {
            console.error('Failed to save snapshot:', e);
        }
    };

    // --- Socket.io Logic ---
    let courtReadyStatus: Record<number, boolean> = {};
    let liveScoresState: Record<number, any> = {}; // court -> score data

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Send initial state
        if (tournamentState) {
            socket.emit('state_update', tournamentState);
        }

        // NOUVEAU : Scores en direct existants
        const existingLiveScores = Object.values(liveScoresState);
        if (existingLiveScores.length > 0) {
            existingLiveScores.forEach(scoreData => {
                socket.emit('live_score_update', scoreData);
            });
        }

        // NOUVEAU : Terrains déjà prêts
        const readyCourts = Object.entries(courtReadyStatus)
            .filter(([, ready]) => ready)
            .map(([court]) => parseInt(court));
        if (readyCourts.length > 0) {
            socket.emit('court_ready_update', {
                court: -1, // signal initial
                readyCourts
            });
        }

        // Handle state updates from clients
        socket.on('update_state', (newState: any) => {
            // Keep the old state before replacing it. It is the snapshot of the
            // session that just ended when currentSession increases.
            const previousState = tournamentState;
            if (!tournamentState) {
                tournamentState = newState;
            } else {
                // Merger les matchs : garder les scores déjà validés du state serveur
                const mergedMatches = newState.matches.map((newMatch: any) => {
                    const existingMatch = tournamentState.matches.find((m: any) => m.id === newMatch.id);
                    // Si le match existant est déjà finished, garder le state serveur
                    if (existingMatch && existingMatch.status === 'finished' && newMatch.status !== 'finished') {
                        return existingMatch;
                    }
                    return newMatch;
                });

                // Merger les finalMatches de la même façon
                const mergedFinalMatches: Record<string, any[]> = {};
                Object.entries(newState.finalMatches || {}).forEach(([catId, catMatches]: [string, any]) => {
                    const existingCatMatches = (tournamentState.finalMatches || {})[catId] || [];
                    mergedFinalMatches[catId] = catMatches.map((newMatch: any) => {
                        const existingMatch = existingCatMatches.find((m: any) => m.id === newMatch.id);
                        if (existingMatch && existingMatch.status === 'finished' && newMatch.status !== 'finished') {
                            return existingMatch;
                        }
                        return newMatch;
                    });
                });

                tournamentState = {
                    ...newState,
                    matches: mergedMatches,
                    finalMatches: mergedFinalMatches,
                };
            }

            const sessionSnapshot = getPreviousSessionSnapshot(previousState, newState);
            if (sessionSnapshot) {
                saveSnapshot(sessionSnapshot.state, sessionSnapshot.sessionNumber);
                courtReadyStatus = {};
                liveScoresState = {};
                io.emit('courts_reset');
            }

            void persistTournamentState(tournamentState).catch((err) => {
                console.error('Erreur sauvegarde état reçu:', err);
            });
            socket.broadcast.emit('state_update', tournamentState);
        });

        // Tablette signale que les équipes sont prêtes
        socket.on('court_ready', (data: { court: number; matchId: string }) => {
            courtReadyStatus[data.court] = true;
            // Notifier l'admin
            io.emit('court_ready_update', {
                court: data.court,
                readyCourts: Object.entries(courtReadyStatus)
                    .filter(([, ready]) => ready)
                    .map(([court]) => parseInt(court))
            });
        });

        socket.on('court_ready_cancel', (data: { court: number }) => {
            delete courtReadyStatus[data.court];
            io.emit('court_ready_update', {
                court: data.court,
                readyCourts: Object.entries(courtReadyStatus)
                    .filter(([, ready]) => ready)
                    .map(([court]) => parseInt(court))
            });
        });

        // Score en temps réel pour la TV
        socket.on('live_score', (data) => {
            // Stocker le score de ce terrain
            liveScoresState[data.court] = data;
            // Broadcaster à tous
            io.emit('live_score_update', data);
        });

        // Relay timer start to courts
        socket.on('timer_start', (data) => {
            io.emit('timer_start', data);
        });

        // Handle audio events (sync)
        socket.on('play_audio', (data) => {
            // Broadcast to everyone (including sender if they need it, but usually sender plays locally first)
            // Actually, for sync, it's better to broadcast to OTHERS
            socket.broadcast.emit('audio_event', data);
        });

        // Handle music sync
        socket.on('music_command', (data) => {
            socket.broadcast.emit('music_sync', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    // --- Vite / Static Files ---
    if (process.env.NODE_ENV !== 'production') {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(APP_DIR, 'dist');
        app.use(express.static(distPath));
        // Express 5 no longer accepts the old unnamed '*' route pattern.
        app.get(/.*/, (_req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
}

startServer();
