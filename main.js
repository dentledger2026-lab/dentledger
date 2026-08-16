const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// 1. ABSOLUTE FIRST STEP: Kill GPU & Hardware Acceleration
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('log-level', '3'); // SILENCE ALL NON-CRITICAL ERRORS

// Define permanent paths
const baseDataPath = app.getPath('userData').replace('session_', '');
const sessionDataPath = path.join(baseDataPath, 'sessions', 'active_session');
if (!fs.existsSync(sessionDataPath)) fs.mkdirSync(sessionDataPath, { recursive: true });
app.setPath('userData', sessionDataPath);

const oldDbPath = path.join(baseDataPath, 'dentledger.db');
const newDbPath = path.join(baseDataPath, 'dentrecords.db');
if (fs.existsSync(oldDbPath) && !fs.existsSync(newDbPath)) {
  try {
    fs.renameSync(oldDbPath, newDbPath);
    console.log("Migrated database file from dentledger.db to dentrecords.db");
  } catch (e) {
    console.error("Failed to rename database file:", e);
  }
}
global.DATABASE_PATH = newDbPath;
const investigationsDir = path.join(baseDataPath, 'investigations');
if (!fs.existsSync(investigationsDir)) fs.mkdirSync(investigationsDir, { recursive: true });

// Register investigation image protocol (Non-standard is sometimes better for direct files)
protocol.registerSchemesAsPrivileged([
  { scheme: 'dlinv', privileges: { bypassCSP: true, secure: true, supportFetchAPI: true } }
]);

app.whenReady().then(() => {
  // Silence the specific GPU error if it still pops up
  process.on('uncaughtException', (err) => {
    if (err.message && err.message.includes('gpu')) return;
    console.error(err);
  });

  // Handle image protocol
  protocol.handle('dlinv', async (request) => {
    try {
      const fileName = request.url.split('://')[1].split('/')[0];
      const filePath = path.resolve(path.join(investigationsDir, decodeURIComponent(fileName)));
      
      if (fs.existsSync(filePath)) {
        return net.fetch(pathToFileURL(filePath).toString());
      }
      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response('Error', { status: 500 });
    }
  });

  console.log('Main Process: Booting DentRecords...');
  console.log('Storage:', investigationsDir);

  const db = require('./src/db/database.js');
  console.log('Main Process: Database Loaded');
  console.log('Available DB Methods:', Object.keys(db).filter(k => typeof db[k] === 'function'));

  // IPC Handlers for Database
  ipcMain.handle('db-query', async (event, method, ...args) => {
    try {
      console.log(`[DB-QUERY] ${method}:`, JSON.stringify(args));
      if (db[method]) {
        const result = await db[method](...args);
        console.log(`[DB-RESULT] ${method}: SUCCESS`);
        return { success: true, data: result };
      } else {
        console.error(`[DB-QUERY] Method ${method} not found`);
        throw new Error(`Method ${method} not found in database`);
      }
    } catch (error) {
      console.error(`[DB-QUERY] ERROR in ${method}:`, error);
      return { success: false, error: error.message };
    }
  });

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1000,
      minHeight: 700,
      show: false,
      title: 'DentRecords',
      icon: path.join(__dirname, 'assets/icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#0d9488',
        symbolColor: '#ffffff',
        height: 35
      }
    });

    mainWindow.loadFile(path.join(__dirname, 'src/ui/index.html'));

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // SMS Gateway Stub
  ipcMain.handle('send-sms', async (event, { mobile, message }) => {
    console.log(`[SMS STUB] Sending to ${mobile}: ${message}`);
    return { success: true };
  });

  // PDF Export Stub
  ipcMain.handle('save-pdf', async (event, { content, fileName }) => {
    console.log(`[PDF STUB] Saving PDF: ${fileName}`);
    return { success: true };
  });

  ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('save-investigation-image', async (event, sourcePath) => {
    try {
      const fileName = `inv_${Date.now()}${path.extname(sourcePath)}`;
      const destPath = path.join(investigationsDir, fileName);
      fs.copyFileSync(sourcePath, destPath);
      return { success: true, fileName: fileName, fullPath: destPath };
    } catch (error) {
      console.error('File Save Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-image-base64', async (event, fileName) => {
    try {
      const decodedName = decodeURIComponent(fileName);
      const filePath = path.join(investigationsDir, decodedName);
      
      console.log(`[PDF-IMAGE] Request: ${fileName} -> Path: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`[PDF-IMAGE] File not found: ${filePath}`);
        return { success: false, error: 'File not found' };
      }
      
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath).substring(1).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === 'png') mimeType = 'image/png';
      if (ext === 'webp') mimeType = 'image/webp';
      if (ext === 'gif') mimeType = 'image/gif';
      
      return { 
        success: true, 
        data: `data:${mimeType};base64,${content.toString('base64')}` 
      };
    } catch (e) {
      console.error(`[PDF-IMAGE] Error:`, e);
      return { success: false, error: e.message };
    }
  });

  // File Selection Handlers
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('select-file', async (event, filters) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters || [{ name: 'Database File', extensions: ['db'] }]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('sync-to-cloud', async (event, destFolder) => {
    try {
      const db = require('./src/db/database.js');
      const dest = path.join(destFolder, 'dentrecords_backup.db');
      await db.backup(dest);
      return { success: true };
    } catch (error) {
      console.error('Sync Error (Main Process):', error);
      return { success: false, error: `Backup failed: ${error.message}` };
    }
  });

  // --- Licensing IPC ---
  let LicenseManager;
  try {
    LicenseManager = require('./src/lib/license-manager.js');
  } catch (e) {
    console.error("Critical: Failed to load LicenseManager", e);
  }

  ipcMain.handle('get-machine-id', () => {
    return LicenseManager ? LicenseManager.getMachineId() : "UNKNOWN";
  });

  ipcMain.handle('verify-license', async (event, name, key) => {
    if (!LicenseManager) return { success: false, error: "Licensing system offline." };
    return await LicenseManager.verifyLicense(name, key);
  });

  ipcMain.handle('check-activation', async () => {
    try {
      const db = require('./src/db/database.js');
      const settings = db.getClinicSettings(); // Returns object directly
      
      if (settings && settings.license_name && settings.license_key) {
        return { activated: true, name: settings.license_name };
      }
      return { activated: false };
    } catch (e) {
      console.error("Check Activation Error:", e);
      return { activated: false };
    }
  });

  ipcMain.handle('save-license', async (event, name, key) => {
    const db = require('./src/db/database.js');
    await db.saveClinicSetting('license_name', name);
    await db.saveClinicSetting('license_key', key);
    return { success: true };
  });

  ipcMain.handle('list-licenses', async () => {
    if (!LicenseManager) return {};
    return await LicenseManager.listLicenses();
  });

  ipcMain.handle('delete-license', async (event, fullPathKey) => {
    if (!LicenseManager) return { success: false, error: "Licensing system offline." };
    return await LicenseManager.deleteLicense(fullPathKey);
  });

  ipcMain.handle('create-license', async (event, name) => {
    if (!LicenseManager) return { success: false, error: "Licensing system offline." };
    return await LicenseManager.createLicense(name);
  });

  ipcMain.handle('restore-from-cloud', async (event, srcFile) => {
    try {
      const dbModule = require('./src/db/database.js');
      const dest = global.DATABASE_PATH;
      
      // 1. Close connection
      dbModule.shutdown();
      
      // 2. Overwrite file
      fs.copyFileSync(srcFile, dest);
      
      // 3. Relaunch IMMEDIATELY to prevent "Database not open" errors
      app.relaunch();
      app.exit(0);
      
      return { success: true };
    } catch (error) {
      console.error('Restore Error (Main):', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('relaunch-app', () => {
    app.relaunch();
    app.exit();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
