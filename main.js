const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Iniciar el servidor Express local
const server = require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: 'WA Automator - Desktop',
    // Opcional: icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Cargar la dirección del servidor local Express
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Configurar el menú superior para permitir Copiar/Pegar y herramientas básicas
function setMenu() {
  const template = [
    {
      label: 'Editar',
      submenu: [
        { label: 'Deshacer', role: 'undo' },
        { label: 'Rehacer', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectall' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', role: 'reload' },
        { label: 'Forzar Recargar', role: 'forcereload' },
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Herramientas de desarrollo', role: 'toggleDevTools' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('ready', () => {
  setMenu();
  createWindow();
});

app.on('window-all-closed', function () {
  // En Electron, es común salir de la app cuando se cierran todas las ventanas
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
