// DentRecords Web API - IndexedDB (Offline-First) & Personal Google Drive Sync Wrapper
if (localStorage.getItem('dentrecords_drive_sync') === null && localStorage.getItem('dentledger_drive_sync') !== null) {
    localStorage.setItem('dentrecords_drive_sync', localStorage.getItem('dentledger_drive_sync'));
}
const firebaseConfig = {
  apiKey: "AIzaSyAJZ5PWscSVM_TPNWHsW67LMA0c9_UekWE",
  authDomain: "dentledger-fd246.firebaseapp.com",
  databaseURL: "https://dentledger-fd246-default-rtdb.firebaseio.com/",
  projectId: "dentledger-fd246",
  storageBucket: "dentledger-fd246.firebasestorage.app",
  messagingSenderId: "595845499959",
  appId: "1:595845499959:web:49af2c17d2bbfb80ecc3b2"
};

// Initialize Firebase (Only Auth is used for user identification/account verification)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// IndexedDB configuration
const DB_NAME = 'DentLedgerLocalDB';
const DB_VERSION = 1;
let idb = null;

// Initialize local IndexedDB database
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            const stores = ['patients', 'dental_records', 'appointments', 'billing', 'treatment_logs', 'clinic_settings'];
            stores.forEach(store => {
                if (!db.objectStoreNames.contains(store)) {
                    db.createObjectStore(store, { keyPath: 'id' });
                }
            });
            // Counters store for integer autoincrements
            if (!db.objectStoreNames.contains('counters')) {
                db.createObjectStore('counters', { keyPath: 'table' });
            }
        };
        request.onsuccess = (e) => {
            idb = e.target.result;
            console.log("[IndexedDB] Database initialized successfully.");
            resolve(idb);
        };
        request.onerror = (e) => {
            console.error("[IndexedDB] Initialisation error:", e.target.error);
            reject(e.target.error);
        };
    });
}

// Ensure IndexedDB is initialized immediately
const dbInitPromise = initIndexedDB();

// IndexedDB Helper CRUD wrappers
function dbGetAll(storeName) {
    return dbInitPromise.then(() => {
        return new Promise((resolve, reject) => {
            const tx = idb.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

function dbGet(storeName, key) {
    return dbInitPromise.then(() => {
        return new Promise((resolve, reject) => {
            const tx = idb.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

function dbPut(storeName, value) {
    return dbInitPromise.then(() => {
        return new Promise((resolve, reject) => {
            const tx = idb.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).put(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

function dbDelete(storeName, key) {
    return dbInitPromise.then(() => {
        return new Promise((resolve, reject) => {
            const tx = idb.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

// Generate transactional auto-incrementing integer IDs
async function getNextId(table) {
    await dbInitPromise;
    return new Promise((resolve, reject) => {
        const tx = idb.transaction('counters', 'readwrite');
        const store = tx.objectStore('counters');
        const request = store.get(table);
        request.onsuccess = () => {
            const current = request.result ? request.result.value : 0;
            const next = current + 1;
            store.put({ table, value: next });
            resolve(next);
        };
        request.onerror = () => reject(request.error);
    });
}

// Export local IndexedDB as JSON string
async function exportDatabaseToJSON() {
    const backup = {
        patients: await dbGetAll('patients'),
        dental_records: await dbGetAll('dental_records'),
        appointments: await dbGetAll('appointments'),
        billing: await dbGetAll('billing'),
        treatment_logs: await dbGetAll('treatment_logs'),
        clinic_settings: await dbGetAll('clinic_settings'),
        counters: await dbGetAll('counters')
    };
    return JSON.stringify(backup, null, 2);
}

// Import JSON string into local IndexedDB
async function importDatabaseFromJSON(jsonStr) {
    const data = JSON.parse(jsonStr);
    const stores = ['patients', 'dental_records', 'appointments', 'billing', 'treatment_logs', 'clinic_settings', 'counters'];
    for (const store of stores) {
        if (data[store]) {
            await new Promise((resolve, reject) => {
                const tx = idb.transaction(store, 'readwrite');
                const os = tx.objectStore(store);
                os.clear();
                data[store].forEach(item => os.put(item));
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
    }
}

// Selected image file holder for uploads
let selectedFile = null;

// Local IndexedDB Implementation of Database queries (Satisfying window.api)
const dbAPI = {
    // Patients
    getPatients: async (search = '') => {
        const list = await dbGetAll('patients');
        if (!search) return list;
        const term = search.toLowerCase();
        return list.filter(p => 
            (p.full_name && p.full_name.toLowerCase().includes(term)) || 
            (p.contact_primary && p.contact_primary.toLowerCase().includes(term))
        );
    },
    getAllPatients: async () => {
        const list = await dbGetAll('patients');
        return list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
    getPatientById: async (id) => {
        return await dbGet('patients', parseInt(id));
    },
    addPatient: async (patient) => {
        const id = await getNextId('patients');
        const data = { 
            ...patient, 
            id, 
            age: parseInt(patient.age) || null,
            created_at: new Date().toISOString() 
        };
        await dbPut('patients', data);
        triggerDriveSync();
        return id;
    },
    updatePatient: async (id, patient) => {
        const pid = parseInt(id);
        const existing = await dbGet('patients', pid);
        if (!existing) throw new Error("Patient not found");
        const data = { 
            ...existing, 
            ...patient, 
            id: pid, 
            age: parseInt(patient.age) || null 
        };
        await dbPut('patients', data);
        triggerDriveSync();
        return { success: true };
    },
    deletePatient: async (id) => {
        const pid = parseInt(id);
        await dbDelete('patients', pid);
        
        // Cascade delete patient files inside IndexedDB
        const tables = ['dental_records', 'appointments', 'billing', 'treatment_logs'];
        for (const store of tables) {
            const list = await dbGetAll(store);
            for (const item of list) {
                if (item.patient_id === pid) {
                    await dbDelete(store, item.id);
                }
            }
        }
        triggerDriveSync();
        return { success: true };
    },

    // Dental Records
    getDentalRecord: async (patientId) => {
        const pid = parseInt(patientId);
        const list = await dbGetAll('dental_records');
        const rows = list.filter(r => r.patient_id === pid);
        if (rows.length === 0) return {};
        
        // Merge rows from oldest to newest (newest takes precedence for non-null/non-empty values)
        rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        const merged = rows.reduce((acc, row) => {
            Object.keys(row).forEach(key => {
                if (acc[key] === undefined || acc[key] === null || acc[key] === '') {
                    acc[key] = row[key];
                }
            });
            return acc;
        }, {});
        return merged;
    },
    getAllDentalRecords: async (patientId) => {
        const pid = parseInt(patientId);
        const list = await dbGetAll('dental_records');
        const val = list.filter(r => r.patient_id === pid);
        return val.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    },
    getClinicalRecords: async (patientId) => {
        return await dbAPI.getAllDentalRecords(patientId);
    },
    getTreatmentHistory: async (patientId) => {
        const pid = parseInt(patientId);
        const list = await dbGetAll('treatment_logs');
        const val = list.filter(r => r.patient_id === pid);
        return val.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    },
    saveDentalRecord: async (record) => {
        let id = record.id ? parseInt(record.id) : null;
        if (!id) {
            id = await getNextId('dental_records');
        }
        const data = { 
            ...record, 
            id, 
            patient_id: parseInt(record.patient_id),
            created_at: record.created_at || new Date().toISOString()
        };
        await dbPut('dental_records', data);
        triggerDriveSync();
        return { success: true };
    },
    updateDentalRecord: async (patientId, data) => {
        const pid = parseInt(patientId);
        const list = await dbGetAll('dental_records');
        const rows = list.filter(r => r.patient_id === pid).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        const existing = rows[0];
        
        if (existing) {
            const updated = { ...existing, ...data };
            await dbPut('dental_records', updated);
        } else {
            const newId = await getNextId('dental_records');
            const record = { 
                ...data, 
                id: newId, 
                patient_id: pid, 
                created_at: new Date().toISOString() 
            };
            await dbPut('dental_records', record);
        }
        triggerDriveSync();
        return { success: true };
    },
    deleteDentalRecord: async (id) => {
        await dbDelete('dental_records', parseInt(id));
        triggerDriveSync();
        return { success: true };
    },
    saveTreatmentDone: async (data) => {
        const id = await getNextId('treatment_logs');
        const log = {
            id,
            patient_id: parseInt(data.patient_id),
            procedure_logs: data.procedure_logs,
            created_at: new Date().toISOString()
        };
        await dbPut('treatment_logs', log);
        triggerDriveSync();
        return { success: true };
    },
    deleteTreatmentDone: async (id) => {
        await dbDelete('treatment_logs', parseInt(id));
        triggerDriveSync();
        return { success: true };
    },
    clearTreatmentLogs: async () => {
        const list = await dbGetAll('treatment_logs');
        for (const item of list) {
            await dbDelete('treatment_logs', item.id);
        }
        triggerDriveSync();
        return { success: true };
    },

    // Appointments
    getTodayAppointments: async () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const patients = await dbGetAll('patients');
        const patientsMap = {};
        patients.forEach(p => patientsMap[p.id] = p);
        
        const list = await dbGetAll('appointments');
        const todayApps = list.filter(a => {
            if (!a.appointment_date || a.status === 'Completed') return false;
            return a.appointment_date.substring(0, 10) === todayStr;
        });
        
        return todayApps.map(a => {
            const p = patientsMap[a.patient_id] || {};
            return {
                ...a,
                full_name: p.full_name || '',
                patient_name: p.full_name || '',
                contact_primary: p.contact_primary || '',
                gender: p.gender || '',
                age: p.age || ''
            };
        }).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
    },
    getAppointments: async (date) => {
        const dateStr = date; // YYYY-MM-DD
        const patients = await dbGetAll('patients');
        const patientsMap = {};
        patients.forEach(p => patientsMap[p.id] = p);
        
        const list = await dbGetAll('appointments');
        const dayApps = list.filter(a => {
            if (!a.appointment_date) return false;
            return a.appointment_date.substring(0, 10) === dateStr;
        });
        
        return dayApps.map(a => {
            const p = patientsMap[a.patient_id] || {};
            return {
                ...a,
                full_name: p.full_name || '',
                patient_name: p.full_name || '',
                contact_primary: p.contact_primary || '',
                gender: p.gender || '',
                age: p.age || ''
            };
        }).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
    },
    getTomorrowAppointments: async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString('en-CA');
        
        const patients = await dbGetAll('patients');
        const patientsMap = {};
        patients.forEach(p => patientsMap[p.id] = p);
        
        const list = await dbGetAll('appointments');
        const tomorrowApps = list.filter(a => {
            if (!a.appointment_date || a.status === 'Cancelled') return false;
            return a.appointment_date.substring(0, 10) === tomorrowStr;
        });
        
        return tomorrowApps.map(a => {
            const p = patientsMap[a.patient_id] || {};
            return {
                ...a,
                full_name: p.full_name || '',
                patient_name: p.full_name || '',
                contact_primary: p.contact_primary || '',
                gender: p.gender || '',
                age: p.age || ''
            };
        }).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
    },
    getMonthlyAppointmentCounts: async (year, month) => {
        const list = await dbGetAll('appointments');
        const counts = {};
        const monthStr = month.toString().padStart(2, '0');
        const prefix = `${year}-${monthStr}`;
        
        list.forEach(a => {
            if (!a.appointment_date || a.status === 'Cancelled') return;
            if (a.appointment_date.startsWith(prefix)) {
                const day = parseInt(a.appointment_date.substring(8, 10));
                counts[day] = (counts[day] || 0) + 1;
            }
        });
        return counts;
    },
    getNextAppointments: async (patientId) => {
        const list = await dbGetAll('appointments');
        return list
            .filter(a => a.patient_id === parseInt(patientId) && a.status === 'Scheduled')
            .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
    },
    saveAppointment: async (app) => {
        const id = await getNextId('appointments');
        const newApp = {
            id,
            patient_id: parseInt(app.patient_id),
            appointment_date: app.appointment_date,
            notes: app.notes || '',
            status: 'Scheduled',
            created_at: new Date().toISOString()
        };
        await dbPut('appointments', newApp);
        triggerDriveSync();
        return { success: true };
    },
    updateAppointmentStatus: async (id, status) => {
        const aid = parseInt(id);
        const existing = await dbGet('appointments', aid);
        if (existing) {
            existing.status = status;
            await dbPut('appointments', existing);
            triggerDriveSync();
        }
        return { success: true };
    },
    rescheduleAppointment: async (id, newDate, notes) => {
        const aid = parseInt(id);
        const existing = await dbGet('appointments', aid);
        if (existing) {
            existing.appointment_date = newDate;
            existing.notes = notes;
            existing.status = 'Scheduled';
            await dbPut('appointments', existing);
            triggerDriveSync();
        }
        return { success: true };
    },
    deleteAppointment: async (id) => {
        await dbDelete('appointments', parseInt(id));
        triggerDriveSync();
        return { success: true };
    },

    // Billing
    getBillingSummary: async (patientId) => {
        const list = await dbGetAll('billing');
        const activeBills = list.filter(b => b.patient_id === parseInt(patientId) && !b.deleted_at);
        if (activeBills.length === 0) return { total: 0, paid: 0 };
        
        activeBills.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        const total = activeBills[0].total_cost || 0;
        const paid = activeBills.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
        return { total, paid };
    },
    getPatientsFinancials: async (search = '') => {
        const patients = await dbAPI.getPatients(search);
        const billingList = await dbGetAll('billing');
        
        return patients.map(p => {
            const pBills = billingList.filter(b => b.patient_id === p.id && !b.deleted_at);
            pBills.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            
            const latest_total = pBills.length > 0 ? (pBills[0].total_cost || 0) : 0;
            const total_paid = pBills.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
            
            return {
                id: p.id,
                full_name: p.full_name,
                contact_primary: p.contact_primary,
                latest_total,
                total_paid
            };
        });
    },
    saveBilling: async (bill) => {
        const id = await getNextId('billing');
        const newBill = {
            id,
            patient_id: parseInt(bill.patient_id),
            total_cost: parseFloat(bill.total_cost) || 0,
            paid_amount: parseFloat(bill.paid_amount) || 0,
            balance_amount: parseFloat(bill.balance_amount) || 0,
            payment_mode: bill.payment_mode || '',
            treatment_name: bill.treatment_name || '',
            created_at: new Date().toISOString()
        };
        await dbPut('billing', newBill);
        triggerDriveSync();
        return { success: true };
    },
    getBillingHistory: async (patientId) => {
        const list = await dbGetAll('billing');
        return list.filter(b => b.patient_id === parseInt(patientId) && !b.deleted_at).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    },
    getDeletedBillingHistory: async (patientId) => {
        const list = await dbGetAll('billing');
        return list.filter(b => b.patient_id === parseInt(patientId) && !!b.deleted_at).sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));
    },
    deleteBillingEntry: async (id) => {
        const bid = parseInt(id);
        const existing = await dbGet('billing', bid);
        if (existing) {
            existing.deleted_at = new Date().toISOString();
            await dbPut('billing', existing);
            triggerDriveSync();
        }
        return { success: true };
    },

    // Settings
    getClinicSettings: async () => {
        const list = await dbGetAll('clinic_settings');
        const settings = {};
        list.forEach(item => {
            settings[item.key] = item.value;
        });
        return settings;
    },
    saveClinicSetting: async (key, value) => {
        await dbPut('clinic_settings', { id: key, key, value });
        triggerDriveSync();
        return { success: true };
    },

    // Dashboard Stats
    getDashboardStats: async () => {
        const patients = await dbGetAll('patients');
        const total_patients = patients.length;
        
        const todayStr = new Date().toLocaleDateString('en-CA');
        
        const apps = await dbGetAll('appointments');
        const appointments_today = apps.filter(a => a.appointment_date && a.appointment_date.startsWith(todayStr)).length;
        
        const bills = await dbGetAll('billing');
        const billing_today = bills
            .filter(b => !b.deleted_at && b.created_at && b.created_at.startsWith(todayStr))
            .reduce((sum, b) => sum + (b.paid_amount || 0), 0);
            
        return { total_patients, appointments_today, billing_today };
    }
};

// Google Drive API direct fetch integration
async function getOrCreateDriveFolder(token) {
    const searchRes = await fetch("https://www.googleapis.com/drive/v3/files?q=name='DentRecords' and mimeType='application/vnd.google-apps.folder' and trashed=false", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }
    
    // Create it
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: 'DentRecords',
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    const folder = await createRes.json();
    if (!folder.id) throw new Error("Failed to create Google Drive folder: " + JSON.stringify(folder));
    return folder.id;
}

async function getDriveFileId(token, folderId, fileName) {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }
    return null;
}

async function createDriveFile(token, folderId, fileName, content) {
    const metadata = {
        name: fileName,
        parents: [folderId]
    };
    
    const boundary = 'dentrecords_multipart_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delimiter = `\r\n--${boundary}--`;
    
    const body = delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        close_delimiter;
        
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: body
    });
    const data = await res.json();
    return data.id;
}

async function updateDriveFile(token, fileId, content) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: content
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to update Drive file (Status ${res.status}): ${errText}`);
    }
    return await res.json();
}

async function downloadDriveFile(token, fileId) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    return await res.text();
}

// Excel Upload Helpers
async function createDriveExcelFileMetadata(token, folderId, fileName) {
    const res = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: fileName,
            parents: [folderId],
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error("Failed to create Excel metadata: " + errText);
    }
    const data = await res.json();
    return data.id;
}

async function updateDriveExcelFile(token, fileId, arrayBuffer) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        body: arrayBuffer
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error("Failed to update Excel media: " + errText);
    }
    return await res.json();
}

// Base64 helper to convert data URLs to ArrayBuffer
function base64ToArrayBuffer(base64) {
    const base64Parts = base64.split(',');
    const rawBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
    const binaryString = atob(rawBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Upload standalone image file to Drive
async function uploadImageFileToDrive(token, folderId, fileName, base64Data) {
    let mimeType = "image/jpeg";
    const matches = base64Data.match(/^data:([^;]+);/);
    if (matches && matches.length > 1) {
        mimeType = matches[1];
    }

    // 1. Create file metadata in Google Drive folder
    const metadataRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: fileName,
            parents: [folderId],
            mimeType: mimeType
        })
    });
    if (!metadataRes.ok) {
        const errText = await metadataRes.text();
        throw new Error("Failed to create image metadata in Drive: " + errText);
    }
    const fileData = await metadataRes.json();
    const fileId = fileData.id;

    // 2. Upload the binary content
    const arrayBuffer = base64ToArrayBuffer(base64Data);
    const mediaRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": mimeType
        },
        body: arrayBuffer
    });
    if (!mediaRes.ok) {
        const errText = await mediaRes.text();
        throw new Error("Failed to upload image media to Drive: " + errText);
    }

    // 3. Fetch the webViewLink
    const fieldsRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const fieldsData = await fieldsRes.json();
    return fieldsData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
}

// Generate three-page Excel workbook binary buffer
function safeFormatDate(dateVal) {
    if (!dateVal) return '';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleDateString('en-GB');
    } catch (e) {
        return String(dateVal);
    }
}

// Generate three-page Excel workbook binary buffer
async function generateExcelSyncBuffer() {
    const patients = await dbGetAll('patients');
    const dentalRecords = await dbGetAll('dental_records');
    const billing = await dbGetAll('billing');
    const treatmentLogs = await dbGetAll('treatment_logs');
    const settings = await dbGetAll('clinic_settings');
    
    // Create mapping of image links by key name
    const imageLinksMap = {};
    for (const item of settings) {
        if (item && item.key && item.key.startsWith('image_link_')) {
            const imgFileName = item.key.replace('image_link_', '');
            imageLinksMap[imgFileName] = item.value;
        }
    }
    
    // Create mapping of patient records by patient_id
    const recordsMap = {};
    for (const record of (dentalRecords || [])) {
        if (record && record.patient_id) {
            const existing = recordsMap[record.patient_id];
            if (!existing || record.id > existing.id) {
                recordsMap[record.patient_id] = record;
            }
        }
    }
    
    // Helper to resolve investigation images to their Google Drive links
    const getInvestigationLinks = (record, typeId) => {
        if (!record || !record.investigations) return 'N/A';
        try {
            const invData = JSON.parse(record.investigations);
            const data = invData[typeId] || {};
            let imagesArr = [];
            if (Array.isArray(data.images)) {
                imagesArr = data.images;
            } else if (typeof data.image === 'string' && data.image) {
                imagesArr = [data.image];
            } else if (typeof data.images === 'string' && data.images) {
                imagesArr = [data.images];
            }
            
            if (imagesArr.length === 0) return 'No images';
            
            const links = imagesArr.map(img => {
                const cleanImg = img.trim();
                const driveUrl = imageLinksMap[cleanImg];
                return driveUrl ? driveUrl : `Local Cache: ${cleanImg} (Sync pending)`;
            });
            return links.join(', ');
        } catch (e) {
            return 'Error parsing';
        }
    };
    
    // Helper to resolve investigation findings
    const getInvestigationFindings = (record, typeId) => {
        if (!record || !record.investigations) return 'N/A';
        try {
            const invData = JSON.parse(record.investigations);
            return (invData[typeId] && invData[typeId].findings) ? invData[typeId].findings : 'No findings';
        } catch (e) {
            return 'Error parsing';
        }
    };
    
    // Page 1: Patient Details (Comprehensive clinical and demographic)
    const patientRows = [];
    for (const p of (patients || [])) {
        const r = recordsMap[p.id] || {};
        patientRows.push({
            "Patient ID": `DR-${p.id}`,
            "Full Name": p.full_name || '',
            "Age": p.age || '',
            "Gender": p.gender || '',
            "DOB": safeFormatDate(p.dob),
            "Primary Contact": p.contact_primary || '',
            "Alternate Contact": p.contact_alternate || '',
            "Email ID": p.email_id || '',
            "Occupation": p.occupation || '',
            "Address": p.address || '',
            
            // Clinical History & Habits
            "Chief Complaint": r.chief_complaint || '',
            "History of Present Illness": r.history_present_illness || '',
            "Medical History": r.medical_history || '',
            "Past Dental History": r.past_dental_history || '',
            "Drug History / Allergies": r.drug_history || '',
            "Family History": r.family_history || '',
            "Oral Habits": r.oral_habits || '',
            "Habits Frequency": r.adverse_habits_freq || '',
            "Habits Duration (Years)": r.adverse_habits_years || '',
            "Abnormal Habits": r.abnormal_habits || '',
            "Other Habits Details": r.habits_other || '',
            
            // Extra-Oral Examination
            "Facial Profile": r.eo_facial_profile || '',
            "Facial Form": r.eo_facial_form || '',
            "Facial Divergence": r.eo_facial_divergence || '',
            "Head Shape": r.eo_head_shape || '',
            "Lip Size": r.eo_lip_size || '',
            "Lip Posture": r.eo_lip_posture || '',
            "Lip Relation": r.eo_lip_relation || '',
            "Nasolabial Angle": r.eo_nasolabial_angle || '',
            "Mentolabial Sulcus": r.eo_mentolabial_sulcus || '',
            "Clinical FMA": r.eo_clinical_fma || '',
            "Chin Status": r.eo_chin || '',
            "General Extraoral Findings": r.extraoral_findings || '',
            
            // Functional Examination
            "Respiration": r.func_respiration || '',
            "Deglutition": r.func_deglutition || '',
            "Speech": r.func_speech || '',
            "TMJ Status": r.func_tmj || '',
            "Postural Rest": r.func_postural_rest || '',
            "Path of Closure": r.func_path_closure || '',
            "Perioral Muscle": r.func_perioral_muscle || '',
            "Other Functional Exam": r.func_other || '',
            
            // Intra-Oral Soft Tissue
            "Oral Hygiene": r.st_oral_hygiene || '',
            "Gingival Status": r.st_gingival_texture || '',
            "Frenal Attachment": r.st_frenal_attachment || '',
            "Tongue Size": r.st_tongue_size || '',
            "Tongue Shape": r.st_tongue_shape || '',
            "Tongue Posture": r.st_tongue_posture || '',
            "Tongue Movements": r.st_tongue_movements || '',
            "Oral Mucosa": r.st_oral_mucosa || '',
            "Palatal Contour": r.st_palatal_contour || '',
            "Tonsils & Adenoids": r.st_tonsils_adenoids || '',
            "General Soft Tissue findings": r.intraoral_soft_tissue || '',
            
            // Intra-Oral Hard Tissue & Occlusion
            "Molar Relation (R/L)": r.occ_molar || '',
            "Canine Relation (R/L)": r.occ_canine || '',
            "Incisal A-P": r.occ_incisal_ap || '',
            "Overjet": r.occ_overjet || '',
            "Overbite": r.occ_overbite || '',
            "Crossbite": r.occ_crossbite || '',
            "Scissorbite": r.occ_scissorbite || '',
            "Midline": r.occ_midline || '',
            "Other Occlusal / Arch details": r.occ_intra_arch || '',
            "Caries Chart (JSON Status)": r.caries_chart || '',
            
            // Investigations - Google Drive Image Links
            "IOPA Image Links (Google Drive)": getInvestigationLinks(r, 'iopa'),
            "IOPA Findings": getInvestigationFindings(r, 'iopa'),
            "OPG Image Links (Google Drive)": getInvestigationLinks(r, 'opg'),
            "OPG Findings": getInvestigationFindings(r, 'opg'),
            "Lat. Ceph Links (Google Drive)": getInvestigationLinks(r, 'lat_ceph'),
            "Lat. Ceph Findings": getInvestigationFindings(r, 'lat_ceph'),
            "Clinical Pictures (Google Drive)": getInvestigationLinks(r, 'photos'),
            "Clinical Pictures Findings": getInvestigationFindings(r, 'photos'),
            
            // Diagnosis & Treatment Strategy
            "Final Concluding Diagnosis": r.diagnosis || '',
            "Master Treatment Strategy": r.treatment_plan || '',
            "Registered Date": safeFormatDate(p.created_at)
        });
    }
    
    // Page 2: Treatment Logs (One row per patient visit procedure entry)
    const logsRows = [];
    const patientNames = {};
    for (const p of (patients || [])) {
        patientNames[p.id] = p.full_name;
    }
    
    const sortedLogs = [...(treatmentLogs || [])].sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
    });
    
    for (const log of sortedLogs) {
        logsRows.push({
            "Patient ID": `DR-${log.patient_id}`,
            "Patient Name": patientNames[log.patient_id] || 'Unknown Patient',
            "Visit Date": safeFormatDate(log.created_at),
            "Procedure / Treatment Done & Clinical Notes": log.procedure_logs || ''
        });
    }
    
    // Page 3: Billing Ledger (One row per billing invoice/transaction)
    const billingRows = [];
    const sortedBilling = [...(billing || [])].sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
    });
 
    for (const b of sortedBilling) {
        if (b.deleted_at) continue; // Skip deleted billing logs
        billingRows.push({
            "Patient ID": `DR-${b.patient_id}`,
            "Patient Name": patientNames[b.patient_id] || 'Unknown Patient',
            "Date": safeFormatDate(b.created_at),
            "Treatment Billed": b.treatment_name || '',
            "Total Cost (₹)": b.total_cost || 0,
            "Paid Amount (₹)": b.paid_amount || 0,
            "Balance Amount (₹)": b.balance_amount || 0,
            "Payment Mode": b.payment_mode || ''
        });
    }
    
    // Build Excel workbook
    const wb = XLSX.utils.book_new();
    const wsPatients = XLSX.utils.json_to_sheet(patientRows);
    const wsLogs = XLSX.utils.json_to_sheet(logsRows);
    const wsBilling = XLSX.utils.json_to_sheet(billingRows);
    
    XLSX.utils.book_append_sheet(wb, wsPatients, "Patient Details");
    XLSX.utils.book_append_sheet(wb, wsLogs, "Treatment Logs");
    XLSX.utils.book_append_sheet(wb, wsBilling, "Billing Ledger");
    
    // Write to array buffer
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

// Drive Sync Orchestration
async function uploadDataToGoogleDrive() {
    const token = localStorage.getItem('google_access_token');
    if (!token) throw new Error("Google access token not available.");
    
    let folderId = localStorage.getItem('google_folder_id');
    if (!folderId) {
        folderId = await getOrCreateDriveFolder(token);
        localStorage.setItem('google_folder_id', folderId);
    }
    
    // 1. Sync the JSON database file
    const dbJson = await exportDatabaseToJSON();
    let fileId = localStorage.getItem('google_json_file_id');
    
    if (!fileId) {
        fileId = await getDriveFileId(token, folderId, 'dentrecords_data.json');
        if (fileId) {
            localStorage.setItem('google_json_file_id', fileId);
        }
    }
    
    if (fileId) {
        try {
            await updateDriveFile(token, fileId, dbJson);
        } catch (patchErr) {
            // If the file was deleted on Drive, clear cache and create new
            if (patchErr.message && patchErr.message.includes("Status 404")) {
                localStorage.removeItem('google_json_file_id');
                const newFileId = await createDriveFile(token, folderId, 'dentrecords_data.json', dbJson);
                localStorage.setItem('google_json_file_id', newFileId);
            } else {
                throw patchErr;
            }
        }
    } else {
        const newFileId = await createDriveFile(token, folderId, 'dentrecords_data.json', dbJson);
        localStorage.setItem('google_json_file_id', newFileId);
    }

    // 2. Scan and upload all local cached clinical images to Drive
    try {
        const settings = await dbGetAll('clinic_settings');
        for (const item of settings) {
            if (item && item.key && item.key.startsWith('image_') && !item.key.startsWith('image_link_') && item.value) {
                try {
                    const imgFileName = item.key.replace('image_', '');
                    const cacheLinkKey = `image_link_${imgFileName}`;
                    
                    const cachedLink = settings.find(s => s.key === cacheLinkKey);
                    if (!cachedLink) {
                        console.log(`[Sync] Uploading clinical image to Google Drive: ${imgFileName}`);
                        let imgFileId = await getDriveFileId(token, folderId, imgFileName);
                        let driveUrl = "";
                        if (imgFileId) {
                            const fieldsRes = await fetch(`https://www.googleapis.com/drive/v3/files/${imgFileId}?fields=webViewLink`, {
                                headers: { "Authorization": `Bearer ${token}` }
                            });
                            const fieldsData = await fieldsRes.json();
                            driveUrl = fieldsData.webViewLink || `https://drive.google.com/file/d/${imgFileId}/view`;
                        } else {
                            driveUrl = await uploadImageFileToDrive(token, folderId, imgFileName, item.value);
                        }
                        
                        if (driveUrl) {
                            await dbPut('clinic_settings', { id: cacheLinkKey, key: cacheLinkKey, value: driveUrl });
                            console.log(`[Sync] Image uploaded and link cached: ${imgFileName} -> ${driveUrl}`);
                        }
                    }
                } catch (singleImageErr) {
                    console.error(`[Sync] Failed to process individual image ${item.key}:`, singleImageErr);
                }
            }
        }
    } catch (imageSyncErr) {
        console.error("[Sync] Background image sync failed:", imageSyncErr);
    }

    // 3. Sync the Excel spreadsheet report
    try {
        const excelBuffer = await generateExcelSyncBuffer();
        let excelFileId = localStorage.getItem('google_excel_file_id');
        
        if (!excelFileId) {
            excelFileId = await getDriveFileId(token, folderId, 'dentrecords_sync_report.xlsx');
            if (excelFileId) {
                localStorage.setItem('google_excel_file_id', excelFileId);
            }
        }
        
        if (excelFileId) {
            try {
                await updateDriveExcelFile(token, excelFileId, excelBuffer);
            } catch (patchErr) {
                // If Excel file deleted or access issue, recreate
                if (patchErr.message && (patchErr.message.includes("404") || patchErr.message.includes("403"))) {
                    localStorage.removeItem('google_excel_file_id');
                    const newExcelId = await createDriveExcelFileMetadata(token, folderId, 'dentrecords_sync_report.xlsx');
                    await updateDriveExcelFile(token, newExcelId, excelBuffer);
                    localStorage.setItem('google_excel_file_id', newExcelId);
                } else {
                    throw patchErr;
                }
            }
        } else {
            const newExcelId = await createDriveExcelFileMetadata(token, folderId, 'dentrecords_sync_report.xlsx');
            await updateDriveExcelFile(token, newExcelId, excelBuffer);
            localStorage.setItem('google_excel_file_id', newExcelId);
        }

        // Retrieve and cache the webViewLink of the synced Excel sheet
        const finalExcelId = localStorage.getItem('google_excel_file_id');
        if (finalExcelId) {
            const fieldsRes = await fetch(`https://www.googleapis.com/drive/v3/files/${finalExcelId}?fields=webViewLink`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (fieldsRes.ok) {
                const fieldsData = await fieldsRes.json();
                const webViewLink = fieldsData.webViewLink || `https://drive.google.com/file/d/${finalExcelId}/view`;
                await dbPut('clinic_settings', { id: 'google_excel_webview_link', key: 'google_excel_webview_link', value: webViewLink });
            }
        }
        console.log("[Sync] Excel sync report successfully updated in background.");
    } catch (excelErr) {
        console.error("[Sync] Background Excel report sync failed:", excelErr);
        throw new Error("Excel Report Sync Failed: " + excelErr.message);
    }
}

async function tryRestoreFromDrive(token) {
    try {
        const folderId = await getOrCreateDriveFolder(token);
        localStorage.setItem('google_folder_id', folderId);
        
        let fileId = await getDriveFileId(token, folderId, 'dentrecords_data.json');
        if (!fileId) {
            // Fallback: search for legacy database filename
            fileId = await getDriveFileId(token, folderId, 'dentledger_data.json');
        }
        
        if (fileId) {
            console.log("[Restore] Found cloud backup database, applying...");
            const jsonStr = await downloadDriveFile(token, fileId);
            if (jsonStr) {
                await importDatabaseFromJSON(jsonStr);
                console.log("[Restore] Successfully loaded Google Drive backup database locally.");
            }
        } else {
            console.log("[Restore] No existing cloud backup database found. Operating locally.");
        }
    } catch (e) {
        console.error("[Restore] Error restoring cloud data:", e);
    }
}

// Debounced Google Drive Backup trigger
let syncTimeout = null;
function triggerDriveSync() {
    const isSyncEnabled = localStorage.getItem('dentrecords_drive_sync') === 'true';
    const token = localStorage.getItem('google_access_token');
    if (!isSyncEnabled || !token) return;
    
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            updateSyncStatusUI(true, "Cloud Syncing...");
            await uploadDataToGoogleDrive();
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            updateSyncStatusUI(true, `Cloud Synced: ${now}`);
            
            // Sync setting update
            const nowIso = new Date().toISOString();
            const nowLocale = new Date().toLocaleString();
            await dbPut('clinic_settings', { id: 'last_sync', key: 'last_sync', value: nowIso });
            
            const syncStatusEl = document.getElementById('sync-status');
            if (syncStatusEl) syncStatusEl.innerText = `Last synced: ${nowLocale}`;
        } catch (e) {
            console.warn("[Sync] Backup failed:", e);
            if (e.message && (e.message.includes("401") || e.message.includes("token"))) {
                updateSyncStatusUI(false, "Sync Paused (Reconnect)");
            } else {
                updateSyncStatusUI(false, "Sync Error (Retry)");
            }
        }
    }, 4000); // 4 seconds delay
}

// Visual status updates on sidebar badge
function updateSyncStatusUI(active, text) {
    const badge = document.getElementById('sidebar-license-badge');
    if (!badge) return;
    
    badge.onclick = null;
    badge.style.cursor = 'default';
    
    if (active) {
        badge.innerHTML = `<i class="fas fa-cloud" style="color: #0d9488;"></i> ${text}`;
        badge.style.color = '#0d9488';
        badge.style.borderColor = 'rgba(13, 148, 136, 0.2)';
        badge.style.background = 'rgba(13, 148, 136, 0.05)';
    } else {
        badge.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #d97706;"></i> ${text}`;
        badge.style.color = '#d97706';
        badge.style.borderColor = 'rgba(217, 119, 6, 0.2)';
        badge.style.background = 'rgba(217, 119, 6, 0.05)';
        badge.style.cursor = 'pointer';
        badge.title = "Click to authenticate Google Account and resume sync";
        badge.onclick = () => window.reconnectGoogleDrive();
    }
}

// Reconnect/Link Google Drive
window.reconnectGoogleDrive = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    updateSyncStatusUI(true, "Connecting...");
    try {
        let credential;
        if (auth.currentUser) {
            const result = await auth.currentUser.reauthenticateWithPopup(provider);
            credential = result.credential;
        } else {
            const result = await auth.signInWithPopup(provider);
            credential = result.credential;
        }
        
        if (credential && credential.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
            localStorage.setItem('dentrecords_drive_sync', 'true');
            console.log("[Web API] Token successfully generated.");
            
            await uploadDataToGoogleDrive();
            updateSyncStatusUI(true, "Cloud Sync Connected");
            window.location.reload();
        }
    } catch (e) {
        console.error("Re-authentication error:", e);
        alert("Authentication failed: " + e.message);
        const token = localStorage.getItem('google_access_token');
        if (token) {
            updateSyncStatusUI(false, "Sync Paused (Reconnect)");
        } else {
            const badge = document.getElementById('sidebar-license-badge');
            if (badge) {
                badge.innerHTML = `<i class="fas fa-hdd" style="color: #64748b;"></i> Local Only (Link Drive)`;
                badge.style.color = '#64748b';
                badge.style.borderColor = 'rgba(100, 116, 139, 0.2)';
                badge.style.background = 'rgba(100, 116, 139, 0.05)';
                badge.style.cursor = 'pointer';
                badge.onclick = () => window.reconnectGoogleDrive();
            }
        }
    }
};

// Expose standard window.api to renderer
window.api = {
    invoke: async (channel, ...args) => {
        console.log(`[Web API] Invoke Channel: ${channel}`, args);
        
        if (channel === 'db-query') {
            const [method, ...methodArgs] = args;
            if (dbAPI[method]) {
                try {
                    const data = await dbAPI[method](...methodArgs);
                    return { success: true, data };
                } catch (err) {
                    console.error(`[Web API] DB Query Error in ${method}:`, err);
                    return { success: false, error: err.message };
                }
            } else {
                console.error(`[Web API] DB Method ${method} not implemented.`);
                return { success: false, error: `Method ${method} not implemented.` };
            }
        }
        
        // Licensing overrides -> Login is handled by Firebase Auth, activation check uses Auth state.
        if (channel === 'check-activation') {
            const user = auth.currentUser;
            if (user) {
                const settings = await dbAPI.getClinicSettings();
                return { activated: true, name: settings.doctor_name || user.displayName || user.email };
            }
            return { activated: false };
        }
        
        if (channel === 'get-machine-id') {
            return "WEB-LOCAL-" + (auth.currentUser ? auth.currentUser.uid.substring(0, 8) : "GUEST");
        }
        
        // Image Handling (Stored locally in Browser Cache / IndexedDB or base64)
        if (channel === 'select-image') {
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        selectedFile = file;
                        resolve(file.name); // returns the file name to trigger UI save
                    } else {
                        resolve(null);
                    }
                };
                input.click();
            });
        }
        
        if (channel === 'save-investigation-image') {
            if (!selectedFile) {
                return { success: false, error: "No image file selected." };
            }
            try {
                // Convert selected image file to base64 and store it locally inside database
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const ext = selectedFile.name.split('.').pop();
                        const fileName = `inv_${Date.now()}.${ext}`;
                        // We store images inside IndexedDB clinic settings under image keys to keep DB simple
                        await dbPut('clinic_settings', { id: `image_${fileName}`, key: `image_${fileName}`, value: reader.result });
                        selectedFile = null; // reset
                        triggerDriveSync();
                        resolve({ success: true, fileName: fileName });
                    };
                    reader.onerror = () => resolve({ success: false, error: "Error reading image file." });
                    reader.readAsDataURL(selectedFile);
                });
            } catch (err) {
                console.error("[Web API] Image conversion failed:", err);
                return { success: false, error: err.message };
            }
        }
        
        if (channel === 'get-image-base64') {
            const [fileName] = args;
            try {
                const imgData = await dbGet('clinic_settings', `image_${fileName}`);
                if (imgData && imgData.value) {
                    return { success: true, data: imgData.value };
                }
                return { success: false, error: "Image not found locally." };
            } catch (err) {
                console.error("[Web API] Base64 fetch failed:", err);
                return { success: false, error: err.message };
            }
        }

        // Folder/File Dialog mimics
        if (channel === 'select-folder') {
            return "Local Browser Storage";
        }
        
        if (channel === 'select-file') {
            return "DentRecords JSON Database Backup";
        }
        
        // Google Drive sync action
        if (channel === 'sync-to-cloud-drive') {
            try {
                await uploadDataToGoogleDrive();
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }
        
        // Local JSON export data payload
        if (channel === 'get-backup-json') {
            try {
                const dbJson = await exportDatabaseToJSON();
                return { success: true, data: dbJson };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }
        
        // Google Drive Restore action
        if (channel === 'restore-from-cloud-drive') {
            try {
                const token = localStorage.getItem('google_access_token');
                if (!token) throw new Error("Google access token missing.");
                await tryRestoreFromDrive(token);
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }
        
        if (channel === 'restore-from-cloud') {
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return resolve({ success: false, error: "No file selected" });
                    
                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                        try {
                            await importDatabaseFromJSON(evt.target.result);
                            resolve({ success: true });
                            triggerDriveSync();
                            setTimeout(() => window.location.reload(), 1000);
                        } catch (err) {
                            resolve({ success: false, error: "Invalid backup JSON file." });
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }
        
        // SMS Stub
        if (channel === 'send-sms') {
            console.log("[SMS Web STUB] Sending SMS", args);
            return { success: true };
        }
        
        if (channel === 'relaunch-app') {
            window.location.reload();
            return;
        }

        return null;
    }
};

// Automatic cloud sync pull on application load
async function syncOnStartup() {
    if (sessionStorage.getItem('startup_sync_run') === 'true') {
        console.log("[Startup Sync] Already checked in this session. Skipping to prevent loops.");
        return;
    }

    const isSyncEnabled = localStorage.getItem('dentrecords_drive_sync') === 'true';
    const token = localStorage.getItem('google_access_token');
    if (!isSyncEnabled || !token) return;
    
    // Mark as checked to prevent any loops or concurrent runs in this tab session
    sessionStorage.setItem('startup_sync_run', 'true');
    
    try {
        console.log("[Startup Sync] Verifying Cloud Sync Token...");
        const folderId = await getOrCreateDriveFolder(token);
        localStorage.setItem('google_folder_id', folderId);
        
        let fileId = await getDriveFileId(token, folderId, 'dentrecords_data.json');
        if (!fileId) {
            fileId = await getDriveFileId(token, folderId, 'dentledger_data.json');
        }
        if (fileId) {
            // Fetch cloud file metadata early
            const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const fileMeta = await fileRes.json();
            const cloudModTime = fileMeta.modifiedTime ? new Date(fileMeta.modifiedTime).getTime() : 0;

            const patients = await dbAPI.getAllPatients();
            const hasLocalData = patients && patients.length > 0;
            
            if (!hasLocalData) {
                console.log("[Startup Sync] Local database is empty. Restoring backup from Google Drive...");
                const jsonStr = await downloadDriveFile(token, fileId);
                if (jsonStr) {
                    await importDatabaseFromJSON(jsonStr);
                    if (fileMeta.modifiedTime) {
                        await dbAPI.saveClinicSetting('last_sync', fileMeta.modifiedTime);
                    }
                    console.log("[Startup Sync] Database successfully restored from cloud.");
                    window.location.reload();
                    return;
                }
            } else {
                // Fetch cloud data to check if it has records, preventing overwriting local patients
                const jsonStr = await downloadDriveFile(token, fileId);
                let cloudHasData = false;
                try {
                    const cloudData = JSON.parse(jsonStr);
                    if (cloudData.patients && cloudData.patients.length > 0) {
                        cloudHasData = true;
                    }
                } catch (e) {
                    console.warn("[Startup Sync] Error parsing cloud backup file:", e);
                }

                if (!cloudHasData) {
                    // Cloud is empty but local has data! Force upload local data to cloud.
                    console.log("[Startup Sync] Cloud backup has no records but local database has patients. Uploading local DB to Google Drive to initialize cloud...");
                    await uploadDataToGoogleDrive();
                    const nowIso = new Date().toISOString();
                    await dbAPI.saveClinicSetting('last_sync', nowIso);
                    console.log("[Startup Sync] Local database successfully uploaded to cloud.");
                } else if (fileMeta.modifiedTime) {
                    const lastSyncSetting = await dbAPI.getClinicSettings();
                    const lastSyncTime = lastSyncSetting.last_sync ? new Date(lastSyncSetting.last_sync).getTime() : 0;
                    
                    // If cloud is newer (10 seconds gap check), pull changes
                    if (cloudModTime > lastSyncTime + 10000) {
                        console.log("[Startup Sync] Google Drive backup is newer than local DB. Pulling latest cloud changes...");
                        await importDatabaseFromJSON(jsonStr);
                        // Store the cloud modification time to avoid infinite startup pulling
                        await dbAPI.saveClinicSetting('last_sync', fileMeta.modifiedTime);
                        console.log("[Startup Sync] Local database updated with latest cloud changes.");
                        window.location.reload();
                        return;
                    } else {
                        console.log("[Startup Sync] Local database is already up to date.");
                    }
                }
            }
        } else {
            console.log("[Startup Sync] No cloud backup found on Google Drive.");
        }
    } catch (err) {
        console.warn("[Startup Sync] Startup sync check failed:", err);
        // Switch sync status badge to reconnect if token unauthorized (401)
        if (err.message && (err.message.includes("401") || err.message.includes("token") || err.message.includes("credential"))) {
            updateSyncStatusUI(false, "Sync Paused (Reconnect)");
        } else {
            // Quick check if the API returns 401
            const tokenTestRes = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=1", {
                headers: { "Authorization": `Bearer ${token}` }
            }).catch(() => null);
            if (tokenTestRes && tokenTestRes.status === 401) {
                updateSyncStatusUI(false, "Sync Paused (Reconnect)");
            }
        }
    }
}

// Global Firebase auth state listener
auth.onAuthStateChanged(async (user) => {
    console.log("[Web API] Auth State Changed:", user ? user.email : "Guest");
    
    const gate = document.getElementById('activation-gate');
    if (gate) {
        if (user) {
            gate.style.display = 'none';
        } else {
            gate.style.display = 'flex';
            // Reset fields
            document.getElementById('signin-email').value = '';
            document.getElementById('signin-password').value = '';
            document.getElementById('web-auth-status').innerText = '';
        }
    }
    
    // Trigger Router initialization or refresh if it exists
    if (window.router) {
        await window.router.init();
        
        // Auto-update profile info in sidebar
        if (user) {
            let settings = await dbAPI.getClinicSettings();
            
            // If settings don't exist yet, populate default from firebase auth user profile
            if (!settings.doctor_name) {
                await dbAPI.saveClinicSetting('clinic_name', "Smile Clinic");
                await dbAPI.saveClinicSetting('doctor_name', user.displayName || "Dr. Admin");
                await dbAPI.saveClinicSetting('clinic_phone', "");
                await dbAPI.saveClinicSetting('sync_email', user.email);
                await dbAPI.saveClinicSetting('wa_country', "91");
                settings = await dbAPI.getClinicSettings();
            }
            
            const drNameEl = document.getElementById('sidebar-dr-name');
            const drIconEl = document.getElementById('sidebar-dr-icon');
            
            const docName = settings.doctor_name || "Doctor Portal";
            if (drNameEl) drNameEl.innerText = docName;
            
            if (drIconEl) {
                const initials = docName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                drIconEl.innerText = initials || "DR";
            }
            
            // Set sync status badge visual based on authentication configuration
            const isSyncEnabled = localStorage.getItem('dentrecords_drive_sync') === 'true';
            const driveToken = localStorage.getItem('google_access_token');
            if (isSyncEnabled && driveToken) {
                updateSyncStatusUI(true, "Cloud Sync Connected");
                syncOnStartup();
            } else if (driveToken) {
                updateSyncStatusUI(false, "Sync Paused (Reconnect)");
            } else {
                const badge = document.getElementById('sidebar-license-badge');
                if (badge) {
                    badge.innerHTML = `<i class="fas fa-hdd" style="color: #64748b;"></i> Local Only (Link Drive)`;
                    badge.style.color = '#64748b';
                    badge.style.borderColor = 'rgba(100, 116, 139, 0.2)';
                    badge.style.background = 'rgba(100, 116, 139, 0.05)';
                    badge.style.cursor = 'pointer';
                    badge.onclick = () => window.reconnectGoogleDrive();
                }
            }
        }
    }
});

// Auth form switching and submissions
window.switchLoginTab = (tab) => {
    const tabSignin = document.getElementById('tab-signin');
    const tabSignup = document.getElementById('tab-signup');
    const formSignin = document.getElementById('form-signin');
    const formSignup = document.getElementById('form-signup');
    const status = document.getElementById('web-auth-status');
    
    if (status) status.innerText = '';
    
    if (tab === 'signin') {
        if (tabSignin) tabSignin.classList.add('active');
        if (tabSignup) tabSignup.classList.remove('active');
        if (formSignin) formSignin.style.display = 'block';
        if (formSignup) formSignup.style.display = 'none';
    } else {
        if (tabSignup) tabSignup.classList.add('active');
        if (tabSignin) tabSignin.classList.remove('active');
        if (formSignup) formSignup.style.display = 'block';
        if (formSignin) formSignin.style.display = 'none';
    }
};

window.handleGoogleSignIn = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    const status = document.getElementById('web-auth-status');
    if (status) {
        status.innerText = "Connecting to Google...";
        status.style.color = "var(--primary)";
    }
    
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const credential = result.credential;
        
        // Save the Google Access Token in localStorage
        if (credential && credential.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
            localStorage.setItem('dentrecords_drive_sync', 'true');
        }
        
        // Check if database settings already exist for this user in IndexedDB!
        await dbInitPromise;
        let clinicSettings = await dbAPI.getClinicSettings();
        if (!clinicSettings.doctor_name) {
            await dbAPI.saveClinicSetting('clinic_name', "My Clinic");
            await dbAPI.saveClinicSetting('doctor_name', user.displayName || "Doctor");
            await dbAPI.saveClinicSetting('clinic_phone', "");
            await dbAPI.saveClinicSetting('sync_email', user.email);
            await dbAPI.saveClinicSetting('wa_country', "91");
        }
        
        // Auto restore from Google Drive if a backup file exists
        if (credential && credential.accessToken) {
            await tryRestoreFromDrive(credential.accessToken);
        }
        
        if (status) {
            status.innerText = "Success! Loading application...";
            status.style.color = "#22c55e";
        }
        setTimeout(() => {
            const gate = document.getElementById('activation-gate');
            if (gate) gate.style.display = 'none';
        }, 1000);
    } catch (err) {
        if (status) {
            status.innerText = err.message || "Google Sign-In failed.";
            status.style.color = "#ef4444";
        }
    }
};

window.handleWebSignIn = async (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const status = document.getElementById('web-auth-status');
    const btn = document.getElementById('btn-signin-submit');
    
    if (status) {
        status.innerText = "Signing in...";
        status.style.color = "var(--primary)";
    }
    if (btn) btn.disabled = true;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Email/Password login runs in Local Only mode unless they connect their Drive later
        localStorage.removeItem('google_access_token');
        localStorage.setItem('dentrecords_drive_sync', 'false');
        
        if (status) {
            status.innerText = "Success! Loading application...";
            status.style.color = "#22c55e";
        }
        setTimeout(() => {
            const gate = document.getElementById('activation-gate');
            if (gate) gate.style.display = 'none';
        }, 1000);
    } catch (err) {
        if (status) {
            status.innerText = err.message || "Failed to sign in.";
            status.style.color = "#ef4444";
        }
        if (btn) btn.disabled = false;
    }
};

window.handleWebSignUp = async (e) => {
    e.preventDefault();
    const clinic = document.getElementById('signup-clinic').value.trim();
    const doctor = document.getElementById('signup-doctor').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const status = document.getElementById('web-auth-status');
    const btn = document.getElementById('btn-signup-submit');
    
    if (password.length < 6) {
        if (status) {
            status.innerText = "Password must be at least 6 characters.";
            status.style.color = "#ef4444";
        }
        return;
    }
    
    if (status) {
        status.innerText = "Creating account...";
        status.style.color = "var(--primary)";
    }
    if (btn) btn.disabled = true;
    
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;
        
        // Initialize default user settings in IndexedDB
        await dbInitPromise;
        await dbAPI.saveClinicSetting('clinic_name', clinic);
        await dbAPI.saveClinicSetting('doctor_name', doctor);
        await dbAPI.saveClinicSetting('clinic_phone', "");
        await dbAPI.saveClinicSetting('sync_email', email);
        await dbAPI.saveClinicSetting('wa_country', "91");
        
        // Update Firebase Auth user display name
        await user.updateProfile({ displayName: doctor });
        
        // Email/Password login runs in Local Only mode initially
        localStorage.removeItem('google_access_token');
        localStorage.setItem('dentrecords_drive_sync', 'false');
        
        if (status) {
            status.innerText = "Success! Creating portal...";
            status.style.color = "#22c55e";
        }
        setTimeout(() => {
            const gate = document.getElementById('activation-gate');
            if (gate) gate.style.display = 'none';
        }, 1000);
    } catch (err) {
        if (status) {
            status.innerText = err.message || "Failed to create account.";
            status.style.color = "#ef4444";
        }
        if (btn) btn.disabled = false;
    }
};

window.handleWebSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
        try {
            await auth.signOut();
            localStorage.removeItem('google_access_token');
            localStorage.setItem('dentrecords_drive_sync', 'false');
            window.location.reload();
        } catch (e) {
            console.error("Sign out failed:", e);
        }
    }
};

window.handleForgotPassword = async (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    const status = document.getElementById('web-auth-status');
    
    if (!email) {
        if (status) {
            status.innerText = "Please enter your email address in the Sign In form first.";
            status.style.color = "#ef4444";
        }
        return;
    }
    
    if (status) {
        status.innerText = "Sending reset link...";
        status.style.color = "var(--primary)";
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        if (status) {
            status.innerText = `Reset email sent! Please check ${email}`;
            status.style.color = "#22c55e";
        }
    } catch (err) {
        if (status) {
            status.innerText = err.message || "Failed to send reset email.";
            status.style.color = "#ef4444";
        }
    }
};

// Image Cache & Interceptor (dlinv://)
async function handleImageElement(img) {
    const src = img.getAttribute('src');
    if (src && src.startsWith('dlinv://')) {
        const fileName = src.split('dlinv://')[1];
        if (!fileName) return;
        
        // Temporary placeholder loading state
        img.setAttribute('src', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f1f5f9"/><text x="50" y="55" font-family="sans-serif" font-size="8" fill="%2394a3b8" text-anchor="middle">Loading image...</text></svg>');
        
        const imgData = await dbGet('clinic_settings', `image_${fileName}`);
        if (imgData && imgData.value) {
            img.setAttribute('src', imgData.value);
        } else {
            // Error visual
            img.setAttribute('src', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fee2e2"/><text x="50" y="55" font-family="sans-serif" font-size="8" fill="%23ef4444" text-anchor="middle">Load Failed</text></svg>');
        }
    }
}

// Start MutationObserver to catch dlinv:// images
function initImageInterceptor() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'IMG') {
                        handleImageElement(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('img').forEach(handleImageElement);
                    }
                });
            } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                if (mutation.target.tagName === 'IMG') {
                    handleImageElement(mutation.target);
                }
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });
    
    // Scan existing
    document.querySelectorAll('img').forEach(handleImageElement);
}

// Mobile sidebar interactions
function initMobileLayout() {
    const toggleBtn = document.getElementById('mobile-sidebar-toggle');
    const sidebar = document.getElementById('sidebar-nav');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (toggleBtn && sidebar && overlay) {
        const toggleSidebar = () => {
            const isOpen = sidebar.classList.contains('mobile-open');
            if (isOpen) {
                sidebar.classList.remove('mobile-open');
                overlay.style.display = 'none';
            } else {
                sidebar.classList.add('mobile-open');
                overlay.style.display = 'block';
            }
        };
        
        toggleBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
        
        // Hide sidebar when selecting a link on mobile
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.remove('mobile-open');
                    overlay.style.display = 'none';
                }
            });
        });
    }
}

// Kick off interactions on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
    initImageInterceptor();
    initMobileLayout();
});
