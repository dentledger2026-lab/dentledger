const firebase = require('firebase/compat/app');
require('firebase/compat/database');
const crypto = require('crypto');

// YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAJZ5PWscSVM_TPNWHsW67LMA0c9_UekWE",
  authDomain: "dentledger-fd246.firebaseapp.com",
  databaseURL: "https://dentledger-fd246-default-rtdb.firebaseio.com/",
  projectId: "dentledger-fd246",
  storageBucket: "dentledger-fd246.firebasestorage.app",
  messagingSenderId: "595845499959",
  appId: "1:595845499959:web:49af2c17d2bbfb80ecc3b2"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

async function generateKey(ownerName) {
    // Create a random unique key
    const key = "DL-" + crypto.randomBytes(4).toString('hex').toUpperCase() + "-" + crypto.randomBytes(4).toString('hex').toUpperCase();
    
    console.log(`-----------------------------------`);
    console.log(`Generating License for: ${ownerName}`);
    console.log(`New Key: ${key}`);
    console.log(`-----------------------------------`);

    try {
        await db.ref('licenses/' + key).set({
            owner_name: ownerName,
            status: 'active',
            deviceId: null, // Will be bound on first use
            createdAt: new Date().toISOString()
        });
        console.log("Success! Key is now active in Firebase.");
        process.exit(0);
    } catch (e) {
        console.error("Error saving to Firebase:", e);
        process.exit(1);
    }
}

const name = process.argv[2];
if (!name) {
    console.log("Usage: node keygen.js 'Friend Name'");
    process.exit(1);
}

generateKey(name);
