const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;
let pipelineService = null;

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png')
  });

  // Start the pipeline service
  startPipelineService();

  // Wait for service to be ready, then load the dashboard
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3034/hub');
  }, 3000);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Focus on window
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    mainWindow.focus();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'http://localhost:3034') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

function startPipelineService() {
  console.log('🚀 Starting Pipeline Service...');

  // Check if already running
  exec('lsof -i :3034', (error, stdout, stderr) => {
    if (stdout.trim()) {
      console.log('✅ Pipeline service already running');
      return;
    }

    // Start the service
    const servicePath = path.join(__dirname, '..', '..', 'dist', 'pipeline', 'pipeline-service.js');

    if (!fs.existsSync(servicePath)) {
      // Try to compile TypeScript first
      console.log('📦 Compiling TypeScript...');
      exec('npm run compile-ts', { cwd: path.join(__dirname, '..', '..') }, (compileError) => {
        if (compileError) {
          console.error('❌ TypeScript compilation failed:', compileError);
          showServiceError('Failed to compile TypeScript');
          return;
        }
        launchService(servicePath);
      });
    } else {
      launchService(servicePath);
    }
  });
}

function launchService(servicePath) {
  pipelineService = spawn('node', [servicePath], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '..', '..')
  });

  pipelineService.stdout.on('data', (data) => {
    console.log(`Pipeline Service: ${data.toString()}`);
  });

  pipelineService.stderr.on('data', (data) => {
    console.error(`Pipeline Service Error: ${data.toString()}`);
  });

  pipelineService.on('close', (code) => {
    console.log(`Pipeline service exited with code ${code}`);
  });

  pipelineService.on('error', (error) => {
    console.error('Failed to start pipeline service:', error);
    showServiceError(`Failed to start service: ${error.message}`);
  });
}

function showServiceError(message) {
  if (mainWindow) {
    dialog.showErrorBox('Service Error', message);
  }
}

function stopPipelineService() {
  if (pipelineService) {
    console.log('🛑 Stopping Pipeline Service...');
    pipelineService.kill();
    pipelineService = null;
  }
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopPipelineService();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopPipelineService();
});

// Create menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh Dashboard',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Dashboard Hub',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL('http://localhost:3034/hub');
            }
          }
        },
        {
          label: 'Pipeline Jobs',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL('http://localhost:3034/dashboard/');
            }
          }
        },
        {
          label: 'Workflows',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL('http://localhost:3034/dashboard/workflow.html');
            }
          }
        },
        {
          label: 'ML Dashboard',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL('http://localhost:3034/ml/dashboard');
            }
          }
        },
        {
          label: 'CI/CD Dashboard',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL('http://localhost:3034/cicd/dashboard');
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Dashboard',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About LSH Pipeline Dashboard',
              message: 'LSH Pipeline Dashboard',
              detail: 'A unified dashboard for monitoring and managing data pipelines between LSH and MCLI systems.\n\nBuilt with Electron and Node.js.',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'System Health',
          click: () => {
            shell.openExternal('http://localhost:3034/health/all');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create menu after app is ready
app.whenReady().then(() => {
  createMenu();
});