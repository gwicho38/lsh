const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Dashboard specific APIs
  navigateTo: (url) => ipcRenderer.invoke('navigate-to', url),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  restartService: () => ipcRenderer.invoke('restart-service'),

  // Window controls
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),

  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),

  // Platform info
  platform: process.platform,

  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Add custom CSS for Electron-specific styling
document.addEventListener('DOMContentLoaded', () => {
  // Add Electron class to body for styling
  document.body.classList.add('electron-app');

  // Add custom styles for better desktop integration
  const style = document.createElement('style');
  style.textContent = `
    .electron-app {
      user-select: none;
      -webkit-user-select: none;
    }

    .electron-app .navbar {
      -webkit-app-region: drag;
      padding-top: 8px !important;
    }

    .electron-app .navbar-links a {
      -webkit-app-region: no-drag;
    }

    .electron-app button {
      -webkit-app-region: no-drag;
    }

    .electron-app input, .electron-app textarea, .electron-app select {
      -webkit-app-region: no-drag;
    }

    .electron-app a {
      -webkit-app-region: no-drag;
    }

    /* macOS specific styling */
    @media (platform: mac) {
      .electron-app .navbar {
        padding-top: 32px !important;
      }
    }
  `;
  document.head.appendChild(style);
});