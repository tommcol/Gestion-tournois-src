const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

// Gestion du rechargement automatique en développement
try {
  if (require('electron-squirrel-startup')) app.quit();
} catch (e) {}

let mainWindow;
let serverProcess = null;

function waitForLocalServer(timeoutMs = 20000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let settled = false;
    let retryTimer;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(retryTimer);
      if (error) reject(error);
      else resolve();
    };

    const check = () => {
      const request = http.get('http://127.0.0.1:3000/health', (response) => {
        response.resume();
        if (response.statusCode === 200) {
          finish();
          return;
        }
        retry();
      });

      request.setTimeout(1000, () => request.destroy());
      request.on('error', retry);
    };

    const retry = () => {
      if (settled) return;
      if (Date.now() - startedAt >= timeoutMs) {
        finish(new Error('Le serveur local ne répond pas.'));
        return;
      }
      retryTimer = setTimeout(check, 300);
    };

    serverProcess.once('error', finish);
    serverProcess.once('exit', (code) => {
      finish(new Error(`Le serveur local s'est arrêté avant de démarrer (code ${code}).`));
    });
    check();
  });
}

function startPackagedServer() {
  const appResourcesDir = path.join(process.resourcesPath, 'app.asar.unpacked');
  const serverEntry = path.join(appResourcesDir, 'server-build', 'server.cjs');

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: app.getPath('userData'),
    windowsHide: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: '3000',
      TOURNAMENT_APP_DIR: appResourcesDir,
      TOURNAMENT_DATA_DIR: app.getPath('userData'),
      TOURNAMENT_UPLOADS_DIR: path.join(app.getPath('userData'), 'uploads')
    }
  });

  return waitForLocalServer();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Tournament Manager Pro",
    icon: path.join(__dirname, 'assets/icon.png'), // Optionnel
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Important pour permettre aux iframes ou scripts de fonctionner correctement
      webSecurity: true 
    }
  });

  // Configuration pour l'ouverture de nouvelles fenêtres (ex: Mode TV)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        },
        autoHideMenuBar: true,
        title: "Mode TV - Tournament Manager Pro"
      }
    };
  });

  // Détection : Sommes-nous en développement ou en production (.exe) ?
  // app.isPackaged est vrai si l'app est compilée en exe
  if (app.isPackaged) {
    // Charger la page depuis le serveur pour que les sauvegardes et Socket.IO fonctionnent.
    mainWindow.loadURL('http://127.0.0.1:3000');
  } else {
    // En développement, on charge le serveur Vite
    mainWindow.loadURL('http://localhost:5173');
    // Ouvrir les outils de développement au démarrage en mode dev
    // mainWindow.webContents.openDevTools(); 
  }

  // Enlever le menu par défaut (Fichier, Édition, etc.)
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (app.isPackaged) await startPackagedServer();
  createWindow();

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
}).catch((error) => {
  console.error('Impossible de démarrer le serveur local :', error);
  require('electron').dialog.showErrorBox(
    'Démarrage impossible',
    'Le serveur local du tournoi n’a pas démarré. Fermez les autres applications utilisant le port 3000 puis réessayez.'
  );
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
