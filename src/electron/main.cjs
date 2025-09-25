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

    // Inject navigation bar into every page
    injectNavigationBar();
  });

  // Re-inject navigation bar after each navigation
  mainWindow.webContents.on('did-finish-load', () => {
    injectNavigationBar();
  });

  // Handle external links - only deny if trying to open in new window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const parsedUrl = new URL(url);

    // Allow localhost navigation within the same window, open external links in browser
    if (parsedUrl.hostname === 'localhost' && parsedUrl.port === '3034') {
      mainWindow.loadURL(url);
      return { action: 'deny' };
    } else {
      shell.openExternal(url);
      return { action: 'deny' };
    }
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation - allow localhost:3034, prevent external
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation within our localhost dashboard
    if (parsedUrl.hostname === 'localhost' && parsedUrl.port === '3034') {
      // Allow the navigation to proceed within the app
      return;
    } else {
      // Prevent navigation and open external links in browser
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

function injectNavigationBar() {
  if (!mainWindow) return;

  const navigationBarScript = `
    (function() {
      // Remove existing navigation bar if it exists
      const existingNav = document.getElementById('electron-nav-bar');
      if (existingNav) {
        existingNav.remove();
      }

      // Create navigation bar
      const navBar = document.createElement('div');
      navBar.id = 'electron-nav-bar';
      navBar.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 50px;
        background: linear-gradient(135deg, #1e293b, #334155);
        border-bottom: 1px solid #475569;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 16px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
      \`;

      // Navigation buttons
      const backBtn = document.createElement('button');
      backBtn.innerHTML = '← Back';
      backBtn.style.cssText = \`
        background: rgba(55, 65, 81, 0.8);
        border: none;
        color: #e5e7eb;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s ease;
      \`;
      backBtn.onmouseover = () => backBtn.style.background = 'rgba(75, 85, 99, 0.9)';
      backBtn.onmouseout = () => backBtn.style.background = 'rgba(55, 65, 81, 0.8)';
      backBtn.onclick = () => history.back();

      const forwardBtn = document.createElement('button');
      forwardBtn.innerHTML = 'Forward →';
      forwardBtn.style.cssText = backBtn.style.cssText;
      forwardBtn.onmouseover = backBtn.onmouseover;
      forwardBtn.onmouseout = backBtn.onmouseout;
      forwardBtn.onclick = () => history.forward();

      // Current page indicator
      const pageIndicator = document.createElement('div');
      pageIndicator.style.cssText = \`
        flex: 1;
        text-align: center;
        color: #f1f5f9;
        font-size: 14px;
        font-weight: 500;
      \`;

      // Determine current page name
      const path = window.location.pathname;
      let pageName = 'Dashboard Hub';
      if (path.includes('/dashboard/workflow')) {
        pageName = '⚙️ Workflows';
      } else if (path.includes('/dashboard/')) {
        pageName = '📊 Pipeline Jobs';
      } else if (path.includes('/cicd/dashboard')) {
        pageName = '🔧 CI/CD Pipeline';
      } else if (path.includes('/ml/dashboard')) {
        pageName = '🤖 ML Dashboard';
      } else if (path.includes('/health')) {
        pageName = '💗 System Health';
      }
      pageIndicator.textContent = pageName;

      // Quick nav buttons
      const quickNavContainer = document.createElement('div');
      quickNavContainer.style.cssText = \`
        display: flex;
        gap: 8px;
      \`;

      const navItems = [
        { label: '🏠', url: '/hub', title: 'Hub' },
        { label: '📊', url: '/dashboard/', title: 'Pipeline' },
        { label: '⚙️', url: '/dashboard/workflow.html', title: 'Workflows' },
        { label: '🤖', url: '/ml/dashboard', title: 'ML Dashboard' },
        { label: '🔧', url: '/cicd/dashboard', title: 'CI/CD' },
        { label: '💗', url: '/health/all', title: 'Health' }
      ];

      navItems.forEach(item => {
        const btn = document.createElement('button');
        btn.innerHTML = item.label;
        btn.title = item.title;
        btn.style.cssText = \`
          background: rgba(55, 65, 81, 0.6);
          border: none;
          color: #e5e7eb;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        \`;

        // Highlight current page
        if (window.location.pathname === item.url ||
            (item.url === '/hub' && window.location.pathname === '/') ||
            (item.url === '/dashboard/' && window.location.pathname.includes('/dashboard/') && !window.location.pathname.includes('workflow'))) {
          btn.style.background = 'rgba(59, 130, 246, 0.8)';
          btn.style.color = '#ffffff';
        }

        btn.onmouseover = () => {
          if (!btn.style.background.includes('59, 130, 246')) {
            btn.style.background = 'rgba(75, 85, 99, 0.8)';
          }
        };
        btn.onmouseout = () => {
          if (!btn.style.background.includes('59, 130, 246')) {
            btn.style.background = 'rgba(55, 65, 81, 0.6)';
          }
        };
        btn.onclick = () => window.location.href = item.url;

        quickNavContainer.appendChild(btn);
      });

      // Assemble navigation bar
      navBar.appendChild(backBtn);
      navBar.appendChild(forwardBtn);
      navBar.appendChild(pageIndicator);
      navBar.appendChild(quickNavContainer);

      // Add to page
      document.body.insertBefore(navBar, document.body.firstChild);

      // Adjust body padding to accommodate nav bar
      if (!document.body.style.paddingTop || document.body.style.paddingTop === '0px') {
        document.body.style.paddingTop = '50px';
      }
    })();
  `;

  mainWindow.webContents.executeJavaScript(navigationBarScript).catch(err => {
    console.error('Failed to inject navigation bar:', err);
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
            if (mainWindow) {
              mainWindow.loadURL('http://localhost:3034/health/all');
            }
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