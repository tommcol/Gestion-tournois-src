const { app, BrowserWindow } = require('electron');
const path = require('path');

// Gestion du rechargement automatique en développement
try {
  if (require('electron-squirrel-startup')) app.quit();
} catch (e) {}

let mainWindow;

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
    // En production, on charge le fichier html généré par Vite dans le dossier dist
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});