const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = global.DATABASE_PATH || path.join(__dirname, '../../dentledger.db');
const db = new Database(dbPath);
db.exec('PRAGMA foreign_keys = ON'); // Re-enable for data integrity (CASCADE etc)

function initDb() {
  // Clean up orphaned records safely
  try {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec("DELETE FROM appointments WHERE patient_id NOT IN (SELECT id FROM patients)");
    db.exec("DELETE FROM dental_records WHERE patient_id NOT IN (SELECT id FROM patients)");
    db.exec('PRAGMA foreign_keys = ON');
  } catch (e) {
    console.error("Cleanup Error:", e);
    db.exec('PRAGMA foreign_keys = ON');
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      age INTEGER,
      dob TEXT,
      gender TEXT,
      contact_primary TEXT,
      contact_alternate TEXT,
      email_id TEXT,
      address TEXT,
      occupation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dental_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      chief_complaint TEXT,
      history_present_illness TEXT,
      medical_history TEXT,
      past_dental_history TEXT,
      drug_history TEXT,
      oral_habits TEXT,
      adverse_habits_freq TEXT,
      adverse_habits_years TEXT,
      abnormal_habits TEXT,
      family_history TEXT,
      extraoral_findings TEXT,
      eo_head_shape TEXT,
      eo_facial_form TEXT,
      eo_facial_profile TEXT,
      eo_facial_divergence TEXT,
      eo_lip_size TEXT,
      eo_lip_posture TEXT,
      eo_lip_relation TEXT,
      eo_nasolabial_angle TEXT,
      eo_mentolabial_sulcus TEXT,
      eo_clinical_fma TEXT,
      eo_chin TEXT,
      intraoral_hard_tissue TEXT,
      intraoral_soft_tissue TEXT,
      intraoral_other TEXT,
      occ_incisal_ap TEXT,
      occ_overjet TEXT,
      occ_overbite TEXT,
      occ_crossbite TEXT,
      occ_scissorbite TEXT,
      occ_midline TEXT,
      occ_molar TEXT,
      occ_canine TEXT,
      occ_intra_arch TEXT,
      ia_crowding TEXT,
      ia_impaction TEXT,
      ia_position TEXT,
      ia_spacing TEXT,
      ia_diastema TEXT,
      st_oral_hygiene TEXT,
      st_gingival_texture TEXT,
      st_frenal_attachment TEXT,
      st_tongue TEXT,
      st_tongue_size TEXT,
      st_tongue_shape TEXT,
      st_tongue_posture TEXT,
      st_tongue_movements TEXT,
      st_oral_mucosa TEXT,
      st_palatal_contour TEXT,
      st_tonsils_adenoids TEXT,
      caries_chart TEXT,
      investigations TEXT,
      diagnosis TEXT,
      treatment_plan TEXT,
      treatment_done TEXT,
      next_appointment_plan TEXT,
      next_appointment_date TEXT,
      tp_aims TEXT,
      tp_phase1 TEXT,
      tp_phase2 TEXT,
      tp_phase3 TEXT,
      tp_alternative TEXT,
      tp_prognosis TEXT,
      func_respiration TEXT,
      func_deglutition TEXT,
      func_speech TEXT,
      func_postural_rest TEXT,
      func_path_closure TEXT,
      func_tmj TEXT,
      func_perioral_muscle TEXT,
      other_history TEXT,
      func_other TEXT,
      habits_other TEXT,
      diag_skeletal TEXT,
      diag_dental TEXT,
      diag_soft_tissue TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      appointment_date DATETIME,
      notes TEXT,
      status TEXT DEFAULT 'Scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS billing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      total_cost REAL,
      paid_amount REAL,
      balance_amount REAL,
      payment_mode TEXT,
      treatment_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS treatment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      procedure_logs TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clinic_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migration for all columns
  const columns = [
    'drug_history', 'adverse_habits_freq', 'adverse_habits_years', 'abnormal_habits',
    'family_history', 'investigations', 'medical_history', 'diagnosis',
    'eo_head_shape', 'eo_facial_form', 'eo_facial_profile', 'eo_facial_divergence',
    'eo_lip_size', 'eo_lip_posture', 'eo_lip_relation', 'eo_nasolabial_angle',
    'eo_mentolabial_sulcus', 'eo_clinical_fma', 'eo_chin',
    'intraoral_hard_tissue', 'intraoral_soft_tissue', 'intraoral_other',
    'st_oral_hygiene', 'st_gingival_texture', 'st_frenal_attachment', 'st_tongue',
    'st_tongue_size', 'st_tongue_shape', 'st_tongue_posture', 'st_tongue_movements',
    'st_oral_mucosa', 'st_palatal_contour', 'st_tonsils_adenoids',
    'occ_incisal_ap', 'occ_overjet', 'occ_overbite', 'occ_crossbite', 'occ_scissorbite', 'occ_midline',
    'occ_molar', 'occ_canine', 'occ_intra_arch',
    'ia_crowding', 'ia_impaction', 'ia_position', 'ia_spacing', 'ia_diastema',
    'func_respiration', 'func_deglutition', 'func_speech', 'func_postural_rest', 'func_path_closure', 'func_tmj', 'func_perioral_muscle', 'func_other',
    'treatment_plan', 'treatment_done', 'next_appointment_plan', 'next_appointment_date', 
    'tp_aims', 'tp_phase1', 'tp_phase2', 'tp_phase3', 'tp_alternative', 'tp_prognosis',
    'diag_skeletal', 'diag_dental', 'diag_soft_tissue', 'caries_chart', 'other_history', 'habits_other'
  ];
  
  columns.forEach(col => {
    try {
      db.exec(`ALTER TABLE dental_records ADD COLUMN ${col} TEXT`);
    } catch (e) {}
  });

  try {
    db.exec(`ALTER TABLE billing ADD COLUMN treatment_name TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE billing ADD COLUMN deleted_at TEXT`);
  } catch (e) {}
}

initDb();

const dbAPI = {
  shutdown: () => db.close(),

  // Patients
  getPatients: (search = '') => {
    const stmt = db.prepare('SELECT * FROM patients WHERE full_name LIKE ? OR contact_primary LIKE ? ORDER BY full_name ASC');
    return stmt.all(`%${search}%`, `%${search}%`);
  },
  getAllPatients: () => {
    return db.prepare('SELECT * FROM patients ORDER BY full_name ASC').all();
  },
  getPatientById: (id) => {
    return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  },
  addPatient: (patient) => {
    const stmt = db.prepare(`
      INSERT INTO patients (full_name, age, dob, gender, contact_primary, contact_alternate, email_id, address, occupation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(patient.full_name, patient.age, patient.dob, patient.gender, patient.contact_primary, patient.contact_alternate, patient.email_id, patient.address, patient.occupation);
    return info.lastInsertRowid;
  },
  updatePatient: (id, patient) => {
    const stmt = db.prepare(`
      UPDATE patients SET full_name = ?, age = ?, dob = ?, gender = ?, contact_primary = ?, contact_alternate = ?, email_id = ?, address = ?, occupation = ?
      WHERE id = ?
    `);
    return stmt.run(patient.full_name, patient.age, patient.dob, patient.gender, patient.contact_primary, patient.contact_alternate, patient.email_id, patient.address, patient.occupation, id);
  },
  deletePatient: (id) => {
    return db.prepare('DELETE FROM patients WHERE id = ?').run(id);
  },

  // Dental Records
  getDentalRecord: (patientId) => {
    const rows = db.prepare('SELECT * FROM dental_records WHERE patient_id = ? ORDER BY created_at DESC').all(parseInt(patientId));
    if (rows.length === 0) return {};
    
    // Merge all rows, with latest records taking precedence for non-null values
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
  getAllDentalRecords: (patientId) => {
    return db.prepare('SELECT * FROM dental_records WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
  },
  getClinicalRecords: (patientId) => {
    return module.exports.getAllDentalRecords(patientId);
  },
  getTreatmentHistory: (patientId) => {
    console.log('Fetching history for Patient ID:', patientId);
    const results = db.prepare('SELECT * FROM treatment_logs WHERE patient_id = ? ORDER BY created_at DESC').all(parseInt(patientId));
    console.log('History results count:', results.length);
    return results;
  },
  
  saveDentalRecord: (record) => {
    // Column whitelist for safety
    const validCols = [
        'patient_id', 'chief_complaint', 'history_present_illness', 'medical_history', 'past_dental_history', 
        'drug_history', 'oral_habits', 'adverse_habits_freq', 'adverse_habits_years', 'abnormal_habits', 
        'family_history', 'extraoral_findings', 'eo_head_shape', 'eo_facial_form', 'eo_facial_profile', 
        'eo_facial_divergence', 'eo_lip_size', 'eo_lip_posture', 'eo_lip_relation', 'eo_nasolabial_angle', 
        'eo_mentolabial_sulcus', 'eo_clinical_fma', 'eo_chin', 'intraoral_hard_tissue', 'intraoral_soft_tissue', 
        'intraoral_other', 'occ_incisal_ap', 'occ_overjet', 'occ_overbite', 'occ_crossbite', 'occ_scissorbite', 
        'occ_midline', 'occ_molar', 'occ_canine', 'occ_intra_arch', 'ia_crowding', 'ia_impaction', 'ia_position', 
        'ia_spacing', 'ia_diastema', 'st_oral_hygiene', 'st_gingival_texture', 'st_frenal_attachment', 'st_tongue', 
        'st_tongue_size', 'st_tongue_shape', 'st_tongue_posture', 'st_tongue_movements', 'st_oral_mucosa', 
        'st_palatal_contour', 'st_tonsils_adenoids', 'caries_chart', 'investigations', 'diagnosis', 
        'treatment_plan', 'treatment_done', 'next_appointment_plan', 'next_appointment_date', 'tp_aims', 
        'tp_phase1', 'tp_phase2', 'tp_phase3', 'tp_alternative', 'tp_prognosis', 'func_respiration', 
        'func_deglutition', 'func_speech', 'func_postural_rest', 'func_path_closure', 'func_tmj', 
        'func_perioral_muscle', 'other_history', 'func_other', 'habits_other', 'diag_skeletal', 
        'diag_dental', 'diag_soft_tissue', 'created_at'
    ];

    const keys = Object.keys(record).filter(k => validCols.includes(k));
    const cols = keys.join(', ');
    const placeholders = keys.map(k => `:${k}`).join(', ');
    
    // Create filtered record object
    const filteredRecord = {};
    keys.forEach(k => filteredRecord[k] = record[k]);
    if (record.id) filteredRecord.id = record.id;

    if (record.id) {
        const setClause = keys.map(k => `${k} = :${k}`).join(', ');
        return db.prepare(`UPDATE dental_records SET ${setClause} WHERE id = :id`).run(filteredRecord);
    } else {
        return db.prepare(`INSERT INTO dental_records (${cols}) VALUES (${placeholders})`).run(filteredRecord);
    }
  },

  updateDentalRecord: (patientId, data) => {
    const patient_id = parseInt(patientId);
    if (isNaN(patient_id)) return { success: false, error: 'Invalid Patient ID' };

    const existing = db.prepare('SELECT id FROM dental_records WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1').get(patient_id);
    
    // Only update valid columns
    const validCols = [
        'chief_complaint', 'history_present_illness', 'medical_history', 'past_dental_history', 
        'drug_history', 'oral_habits', 'adverse_habits_freq', 'adverse_habits_years', 'abnormal_habits', 
        'family_history', 'extraoral_findings', 'investigations', 'diagnosis', 'treatment_plan', 
        'treatment_done', 'next_appointment_plan', 'next_appointment_date'
    ];
    
    const filteredData = {};
    Object.keys(data).forEach(k => {
        if (validCols.includes(k) || k.startsWith('eo_') || k.startsWith('st_') || k.startsWith('occ_') || k.startsWith('ia_') || k.startsWith('func_') || k.startsWith('tp_') || k.startsWith('diag_')) {
            filteredData[k] = data[k];
        }
    });

    if (existing) {
        const keys = Object.keys(filteredData);
        if (keys.length === 0) return { success: true };
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => filteredData[k]);
        return db.prepare(`UPDATE dental_records SET ${setClause} WHERE id = ?`).run(...values, existing.id);
    } else {
        const record = { patient_id, ...filteredData, created_at: new Date().toISOString() };
        return module.exports.saveDentalRecord(record);
    }
  },

  deleteDentalRecord: (id) => {
    return db.prepare('DELETE FROM dental_records WHERE id = ?').run(id);
  },

  saveTreatmentDone: (data) => {
    console.log('Saving treatment for patient:', data.patient_id, 'Content:', data.procedure_logs);
    const stmt = db.prepare('INSERT INTO treatment_logs (patient_id, procedure_logs) VALUES (?, ?)');
    const res = stmt.run(parseInt(data.patient_id), data.procedure_logs);
    console.log('Save result:', res);
    return res;
  },

  deleteTreatmentDone: (id) => {
    return db.prepare('DELETE FROM treatment_logs WHERE id = ?').run(parseInt(id));
  },

  // Appointments
  getTodayAppointments: () => {
    return db.prepare(`
      SELECT a.*, p.full_name, p.full_name as patient_name, p.contact_primary, p.gender, p.age 
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      WHERE date(a.appointment_date) = date('now', 'localtime') 
      AND a.status != 'Completed'
      ORDER BY a.appointment_date ASC
    `).all();
  },

  getAppointments: (date) => {
    const stmt = db.prepare(`
      SELECT a.*, p.full_name, p.full_name as patient_name, p.contact_primary, p.gender, p.age 
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      WHERE date(a.appointment_date) = date(?) 
      ORDER BY a.appointment_date ASC
    `);
    return stmt.all(date);
  },

  getTomorrowAppointments: () => {
    return db.prepare(`
      SELECT a.*, p.full_name, p.full_name as patient_name, p.contact_primary, p.gender, p.age 
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      WHERE date(a.appointment_date) = date('now', '+1 day', 'localtime') 
      AND a.status != 'Cancelled'
      ORDER BY a.appointment_date ASC
    `).all();
  },

  getMonthlyAppointmentCounts: (year, month) => {
    // Returns counts per day for a specific month/year, ONLY for existing patients
    const stmt = db.prepare(`
        SELECT strftime('%d', a.appointment_date) as day, COUNT(*) as count 
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE strftime('%Y', a.appointment_date) = ? 
        AND strftime('%m', a.appointment_date) = ?
        AND a.status != 'Cancelled'
        GROUP BY day
    `);
    const results = stmt.all(year.toString(), month.toString().padStart(2, '0'));
    const counts = {};
    results.forEach(r => counts[parseInt(r.day)] = r.count);
    return counts;
  },
  getNextAppointments: (patientId) => {
    return db.prepare("SELECT * FROM appointments WHERE patient_id = ? AND status = 'Scheduled' ORDER BY appointment_date ASC").all(parseInt(patientId));
  },
  saveAppointment: (app) => {
    const stmt = db.prepare('INSERT INTO appointments (patient_id, appointment_date, notes, status) VALUES (?, ?, ?, ?)');
    return stmt.run(parseInt(app.patient_id), app.appointment_date, app.notes, 'Scheduled');
  },
  updateAppointmentStatus: (id, status) => {
    return db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, parseInt(id));
  },
  rescheduleAppointment: (id, newDate, notes) => {
    return db.prepare("UPDATE appointments SET appointment_date = ?, notes = ?, status = 'Scheduled' WHERE id = ?").run(newDate, notes, parseInt(id));
  },

  // Billing
  getBillingSummary: (patientId) => {
    const res = db.prepare(`
      SELECT 
        COALESCE((SELECT total_cost FROM billing WHERE patient_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1), 0) as total,
        COALESCE(SUM(paid_amount), 0) as paid 
      FROM billing 
      WHERE patient_id = ? AND deleted_at IS NULL
    `).get(patientId, patientId);
    return res || { total: 0, paid: 0 };
  },
  getPatientsFinancials: (search = '') => {
    const stmt = db.prepare(`
      SELECT 
        p.id, 
        p.full_name, 
        p.contact_primary,
        (SELECT total_cost FROM billing WHERE patient_id = p.id ORDER BY created_at DESC LIMIT 1) as latest_total,
        (SELECT SUM(paid_amount) FROM billing WHERE patient_id = p.id) as total_paid
      FROM patients p
      WHERE p.full_name LIKE ? OR p.contact_primary LIKE ?
    `);
    return stmt.all(`%${search}%`, `%${search}%`);
  },
  saveBilling: (bill) => {
    const stmt = db.prepare(`
      INSERT INTO billing (patient_id, total_cost, paid_amount, balance_amount, payment_mode, treatment_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(parseInt(bill.patient_id), bill.total_cost, bill.paid_amount, bill.balance_amount, bill.payment_mode, bill.treatment_name);
  },
  getBillingHistory: (patientId) => {
    return db.prepare('SELECT * FROM billing WHERE patient_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').all(parseInt(patientId));
  },
  getDeletedBillingHistory: (patientId) => {
    return db.prepare('SELECT * FROM billing WHERE patient_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC').all(parseInt(patientId));
  },
  deleteBillingEntry: (id) => {
    return db.prepare('UPDATE billing SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(parseInt(id));
  },

  // Settings
  getClinicSettings: () => {
    const rows = db.prepare('SELECT * FROM clinic_settings').all();
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  },
  saveClinicSetting: (key, value) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO clinic_settings (key, value) VALUES (?, ?)');
    return stmt.run(key, value);
  },

  // Dashboard Stats
  getDashboardStats: () => {
    const total_patients = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
    const appointments_today = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE date(appointment_date) = date('now', 'localtime')").get().count;
    const billing_today = db.prepare("SELECT SUM(paid_amount) as total FROM billing WHERE date(created_at) = date('now', 'localtime')").get().total || 0;
    return { total_patients, appointments_today, billing_today };
  },

  backup: async (destPath) => {
    return await db.backup(destPath);
  }
};

module.exports = dbAPI;
