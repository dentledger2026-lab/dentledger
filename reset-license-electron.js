const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// We use app.whenReady() because we are running in an Electron environment
app.whenReady().then(() => {
    try {
        // Force Electron to look in the clinic-app folder instead of the default "Electron" folder
        const userDataPath = path.join(app.getPath('appData'), 'clinic-app');
        const dbPath = path.join(userDataPath, 'dentledger.db');

        console.log(`📡 Searching for database at: ${dbPath}`);
        if (!fs.existsSync(dbPath)) {
            console.error(`❌ Error: Database not found at ${dbPath}`);
            app.exit(1);
            return;
        }

        console.log(`📡 Connecting to database at: ${dbPath}`);
        const db = new Database(dbPath);
        
        // Clear the license settings
        const info = db.prepare("DELETE FROM clinic_settings WHERE key IN ('license_name', 'license_key')").run();
        
        if (info.changes > 0) {
            console.log("✅ Success: License information has been removed.");
            console.log("Next time you start the app, you will be prompted for a new license.");
        } else {
            console.log("ℹ️ No active license found. The app is already deactivated.");
        }
        
        db.close();
        app.exit(0);
    } catch (error) {
        console.error("❌ Error resetting license:", error.message);
        app.exit(1);
    }
});
