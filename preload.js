const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    let validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  invoke: (channel, ...args) => {
    let validChannels = [
      'db-query', 'get-config', 'save-pdf', 'send-sms', 'select-image', 
      'save-investigation-image', 'get-investigation-path',
      'select-folder', 'select-file', 'sync-to-cloud', 'restore-from-cloud',
      'check-activation', 'verify-license', 'get-machine-id', 'save-license', 'relaunch-app',
      'list-licenses', 'delete-license', 'create-license'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  }
});
