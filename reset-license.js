const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Attempt to find the database in the standard Electron userData path for this app
const appName = 'clinic-app';
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', appName, 'dentrecords.db');

if (!fs.existsSync(dbPath)) {
    console.error(`Error: Database not found at ${dbPath}`);
    process.exit(1);
}

console.log(`Connecting to database at: ${dbPath}`);

try {
    const db = new Database(dbPath);
    
    // Clear the license settings
    const info = db.prepare("DELETE FROM clinic_settings WHERE key IN ('license_name', 'license_key')").run();
    
    if (info.changes > 0) {
        console.log("✅ Success: License information has been removed.");
        console.log("Next time you start the app, you will be prompted for a new license.");
    } else {
        console.log("ℹ️ No active license found in the database. The app should already be in de-activated state.");
    }
    
    db.close();
} catch (error) {
    console.error("❌ Error resetting license:", error.message);
    process.exit(1);
}
