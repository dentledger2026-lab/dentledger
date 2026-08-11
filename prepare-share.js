const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Running this via Electron ensures we hit the correct folders
app.whenReady().then(() => {
    try {
        const userDataPath = path.join(app.getPath('appData'), 'clinic-app');
        const dbPath = path.join(userDataPath, 'dentledger.db');
        const investigationsDir = path.join(userDataPath, 'investigations');

        console.log("--- 🧹 DENTLEDGER CLEANING UTILITY ---");

        // 1. Delete Database (Clears Patients, Billing, and License)
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log("✅ Database Removed: All patient data and license info cleared.");
        } else {
            console.log("ℹ️ Database was already empty.");
        }

        // 2. Clear Investigation Images
        if (fs.existsSync(investigationsDir)) {
            const files = fs.readdirSync(investigationsDir);
            for (const file of files) {
                fs.unlinkSync(path.join(investigationsDir, file));
            }
            console.log(`✅ Cleared ${files.length} investigation images.`);
        }

        // 3. Clear sessions folder if it exists
        const sessionsPath = path.join(userDataPath, 'sessions');
        if (fs.existsSync(sessionsPath)) {
            fs.rmSync(sessionsPath, { recursive: true, force: true });
            console.log("✅ Session cache cleared.");
        }

        console.log("\n🚀 THE APP IS NOW CLEAN AND READY TO SHARE.");
        console.log("Your friend will see a fresh app asking for activation.");
        
        app.exit(0);
    } catch (error) {
        console.error("❌ Cleaning failed:", error.message);
        app.exit(1);
    }
});
