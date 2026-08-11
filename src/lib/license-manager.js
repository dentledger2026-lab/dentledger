const firebase = require('firebase/compat/app');
require('firebase/compat/database');
const crypto = require('crypto');
const os = require('os');

const firebaseConfig = {
  apiKey: "AIzaSyAJZ5PWscSVM_TPNWHsW67LMA0c9_UekWE",
  authDomain: "dentledger-fd246.firebaseapp.com",
  databaseURL: "https://dentledger-fd246-default-rtdb.firebaseio.com/",
  projectId: "dentledger-fd246",
  storageBucket: "dentledger-fd246.firebasestorage.app",
  messagingSenderId: "595845499959",
  appId: "1:595845499959:web:49af2c17d2bbfb80ecc3b2"
};

// Initialize Firebase safely
let db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase Init Error:", e);
}

const LicenseManager = {
    // Generate a unique ID for this computer
    getMachineId: () => {
        try {
            const interfaces = os.networkInterfaces();
            for (const name in interfaces) {
                for (const iface of interfaces[name]) {
                    if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                        return crypto.createHash('sha256').update(iface.mac + os.hostname()).digest('hex').substring(0, 12).toUpperCase();
                    }
                }
            }
        } catch (e) {
            console.error("Machine ID Error:", e);
        }
        return os.hostname().toUpperCase();
    },

    // Check if a license key is valid in Firebase
    verifyLicense: async (name, key) => {
        if (!db) return { success: false, error: "Cloud system not initialized." };
        
        try {
            // New way: Search by license_key field
            const snapshot = await db.ref('licenses')
                .orderByChild('license_key')
                .equalTo(key)
                .once('value');
            
            if (snapshot.exists()) {
                const results = snapshot.val();
                const fullPathKey = Object.keys(results)[0];
                const data = results[fullPathKey];
                const machineId = LicenseManager.getMachineId();

                // 1. Check if name matches
                if (data.owner_name.toLowerCase() !== name.toLowerCase()) {
                    return { success: false, error: "License name does not match record." };
                }

                // 2. Check if key is active
                if (data.status !== 'active') {
                    return { success: false, error: "This license has been disabled." };
                }

                // 3. Optional: Bind or update device ID
                if (!data.deviceId) {
                    await db.ref(`licenses/${fullPathKey}`).update({ deviceId: machineId });
                }

                return { success: true, data: data };
            } else {
                // Fallback for old keys that might still be there as direct keys
                const oldSnapshot = await db.ref(`licenses/${key}`).once('value');
                if (oldSnapshot.exists()) {
                    const data = oldSnapshot.val();
                    if (data.owner_name.toLowerCase() === name.toLowerCase()) {
                        return { success: true, data: data };
                    }
                }
                return { success: false, error: "Invalid license key." };
            }
        } catch (error) {
            console.error("Firebase Auth Error:", error);
            return { success: false, error: "Connection error. Check your internet." };
        }
    },

    // Create a new license (Master Admin function)
    createLicense: async (name) => {
        console.log(`Attempting to create license for: ${name}`);
        if (!db) return { success: false, error: "Cloud system not initialized." };
        try {
            const shortKey = "DL-" + crypto.randomBytes(4).toString('hex').toUpperCase() + "-" + crypto.randomBytes(4).toString('hex').toUpperCase();
            
            // Firebase keys cannot contain ".", "#", "$", "[", or "]"
            const sanitizedName = name.replace(/[.#$\[\]]/g, '_');
            const fullPathKey = `${sanitizedName} - ${shortKey}`;
            
            console.log(`Generating key: ${shortKey} with DB key: ${fullPathKey}`);
            await db.ref('licenses/' + fullPathKey).set({
                owner_name: name, // Keep original name in the data
                license_key: shortKey,
                status: 'active',
                deviceId: null,
                createdAt: new Date().toISOString()
            });
            console.log("License successfully saved to Firebase");
            return { success: true, key: shortKey };
        } catch (e) {
            console.error("Create License Error:", e);
            return { success: false, error: e.message };
        }
    },

    // List all licenses (Master Admin function)
    listLicenses: async () => {
        if (!db) return {};
        try {
            const snapshot = await db.ref('licenses').once('value');
            return snapshot.exists() ? snapshot.val() : {};
        } catch (e) {
            console.error("List Licenses Error:", e);
            return {};
        }
    },

    // Delete/Revoke a license (Master Admin function)
    deleteLicense: async (fullPathKey) => {
        if (!db) return { success: false, error: "Cloud system not initialized." };
        try {
            await db.ref(`licenses/${fullPathKey}`).remove();
            return { success: true };
        } catch (e) {
            console.error("Delete License Error:", e);
            return { success: false, error: e.message };
        }
    }
};

module.exports = LicenseManager;
