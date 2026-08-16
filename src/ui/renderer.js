var api = window.api;

class Router {
    constructor() {
        this.currentView = 'dashboard';
        this.init();
        this.initToast();
    }

    async init() {
        const activation = await api.invoke('check-activation');
        if (!activation.activated) {
            this.showActivationGate();
            return;
        }

        // --- MASTER ADMIN CHECK ---
        if (activation.name === 'Harish kanna') {
            const adminNav = document.getElementById('nav-admin');
            if (adminNav) adminNav.classList.remove('nav-hidden');
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.navigate(view);
            };
        });

        this.updateSidebarProfile();

        const quickAddBtn = document.getElementById('btn-add-patient-quick');
        if (quickAddBtn) {
            quickAddBtn.onclick = () => this.showPatientModal();
        }

        const notifyBtn = document.getElementById('btn-notifications');
        if (notifyBtn) {
            notifyBtn.onclick = () => this.navigate('reminders');
        }

        this.navigate('dashboard');
    }

    async showActivationGate() {
        const gate = document.getElementById('activation-gate');
        const hwidSpan = document.getElementById('display-hwid');
        const btn = document.getElementById('btn-activate');
        const status = document.getElementById('activation-status');
        
        gate.style.display = 'flex';
        const hwid = await api.invoke('get-machine-id');
        hwidSpan.innerText = hwid;

        btn.onclick = async () => {
            const name = document.getElementById('license-name').value.trim();
            const key = document.getElementById('license-key').value.trim();

            if (!name || !key) {
                status.innerText = "Please fill all fields.";
                status.style.color = "#ef4444";
                return;
            }

            status.innerText = "Verifying license...";
            status.style.color = "#3b82f6";
            btn.disabled = true;

            const result = await api.invoke('verify-license', name, key);
            if (result.success) {
                status.innerText = "License Activated! Starting app...";
                status.style.color = "#22c55e";
                await api.invoke('save-license', name, key);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                status.innerText = result.error || "Activation failed.";
                status.style.color = "#ef4444";
                btn.disabled = false;
            }
        };
    }

    initToast() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type} show`;
        toast.innerHTML = `<div class="toast-message">${message}</div>`;
        container.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3000);
    }

    async navigate(view) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === view);
        });
        
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = '<div style="display:flex;justify-content:center;padding:100px;"><div class="loading-spinner"></div></div>';
        
        try {
            this.currentView = view;
            if (view === 'dashboard') await this.renderDashboard();
            else if (view === 'patients') await this.renderPatients();
            else if (view === 'treatment_log') await this.renderTreatmentLog();
            else if (view === 'billing') await this.renderBilling();
            else if (view === 'calendar') await this.renderCalendar();
            else if (view === 'reminders') await this.renderReminders();
            else if (view === 'settings') await this.renderSettings();
            else if (view === 'admin' || view === 'governance') await this.renderAdmin();
        } catch (e) { 
            console.error(e); 
            mainContent.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--error);">Error loading ${view}</div>`;
        }
    }

    showPatientModal() {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.style.display = 'flex';
        modalContainer.className = 'modal-backdrop-premium';
        modalContainer.innerHTML = `
            <div class="modal-content-premium fade-in-up">
                <div class="modal-header-premium">
                    <div class="header-title-group">
                        <div class="icon-box-primary">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <div>
                            <h3>New Patient Registration</h3>
                            <p>Enter patient details to create a new clinical record</p>
                        </div>
                    </div>
                    <button class="modal-close-btn" onclick="window.router.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body-premium">
                    <form id="new-patient-form" class="premium-form">
                        <div class="form-section">
                            <h4 class="section-title"><i class="fas fa-id-card"></i> Personal Information</h4>
                            <div class="form-grid">
                                <div class="form-group span-2">
                                    <label>Full Name</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-user"></i>
                                        <input type="text" id="p-name" placeholder="e.g. John Doe" class="premium-input" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Gender</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-venus-mars"></i>
                                        <select id="p-gender" class="premium-input">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group" style="position: relative;">
                                    <label>Date of Birth</label>
                                    <div id="dob-display-tab" style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 5px 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                                        <input type="text" id="display-dob-text" placeholder="DD-MM-YYYY" 
                                               oninput="window.router.handleDateInput(this, 'p-dob', 'dob')"
                                               style="background: transparent; border: none; font-weight: 700; color: #1e293b; font-size: 0.95rem; width: 100%; outline: none;">
                                        <i class="fas fa-calendar-alt" onclick="window.router.toggleDOBCalendar()" style="color: #0ea5e9; padding: 5px;"></i>
                                    </div>
                                    
                                    <!-- Custom DOB Calendar -->
                                    <div id="dob-calendar-container" style="display: none; background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 15px; margin-top: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: absolute; width: 100%; z-index: 100;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                                            <button type="button" onclick="event.stopPropagation(); window.router.changeDOBCalendarMonth(-1)" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 10px; color: #64748b; cursor: pointer;"><i class="fas fa-chevron-left"></i></button>
                                            <div style="display: flex; gap: 5px;">
                                                <span id="dob-calendar-month-btn" onclick="event.stopPropagation(); window.router.showDOBMonthSelector()" style="font-weight: 800; color: #1e293b; font-size: 0.85rem; cursor: pointer; padding: 4px; border-radius: 6px;"></span>
                                                <span id="dob-calendar-year-btn" onclick="event.stopPropagation(); window.router.showDOBYearSelector()" style="font-weight: 800; color: #1e293b; font-size: 0.85rem; cursor: pointer; padding: 4px; border-radius: 6px;"></span>
                                            </div>
                                            <button type="button" onclick="event.stopPropagation(); window.router.changeDOBCalendarMonth(1)" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 10px; color: #64748b; cursor: pointer;"><i class="fas fa-chevron-right"></i></button>
                                        </div>
                                        
                                        <div id="dob-calendar-main-view">
                                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 8px;">
                                                ${['S','M','T','W','T','F','S'].map(d => `<span style="font-size: 0.6rem; font-weight: 800; color: #94a3b8;">${d}</span>`).join('')}
                                            </div>
                                            <div id="dob-calendar-days-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;"></div>
                                        </div>

                                        <div id="dob-month-selector" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                                            ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => `
                                                <div onclick="event.stopPropagation(); window.router.jumpToDOBMonth(${i})" style="padding: 8px; text-align: center; background: #f8fafc; border-radius: 8px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">${m}</div>
                                            `).join('')}
                                        </div>

                                        <div id="dob-year-selector" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 150px; overflow-y: auto;">
                                            ${Array.from({length: 2080 - 1937 + 1}).map((_, i) => {
                                                const y = 2080 - i;
                                                return `<div onclick="event.stopPropagation(); window.router.jumpToDOBYear(${y})" style="padding: 8px; text-align: center; background: #f8fafc; border-radius: 8px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">${y}</div>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                    <input type="hidden" id="p-dob">
                                </div>
                                <div class="form-group">
                                    <label>Age</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-hourglass-half"></i>
                                        <input type="number" id="p-age" placeholder="Age" class="premium-input" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Occupation</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-briefcase"></i>
                                        <input type="text" id="p-occupation" placeholder="e.g. Software Engineer" class="premium-input">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h4 class="section-title"><i class="fas fa-phone-alt"></i> Contact Details</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Phone Number</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-mobile-alt"></i>
                                        <input type="tel" id="p-phone" placeholder="+91 XXXXX XXXXX" class="premium-input" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Email ID</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="p-email" placeholder="john.doe@example.com" class="premium-input">
                                    </div>
                                </div>
                                <div class="form-group span-2">
                                    <label>Residential Address</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-map-marker-alt" style="top: 15px;"></i>
                                        <textarea id="p-address" placeholder="Enter full address here..." class="premium-input" rows="2"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer-premium">
                    <button class="btn btn-secondary-outline" onclick="window.router.closeModal()">Discard</button>
                    <button class="btn btn-primary-premium" onclick="window.router.savePatient()">
                        <i class="fas fa-check"></i> Register Patient
                    </button>
                </div>
            </div>
        `;

        // Age calculation logic
        const dobInput = document.getElementById('p-dob');
        const ageInput = document.getElementById('p-age');
        
        dobInput.onchange = () => {
            if (dobInput.value) {
                ageInput.value = this.calculateAge(dobInput.value);
            }
        };

        // Initialize custom calendar
        this.renderDOBCalendar();
    }

    openModal(title, content, maxWidth = '600px') {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;
        
        modalContainer.style.display = 'flex';
        modalContainer.className = 'modal-backdrop-premium';
        modalContainer.innerHTML = `
            <div class="modal-content-premium fade-in-up" style="max-width: ${maxWidth};">
                <div class="modal-header-premium" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; border: none;">
                    <div class="header-title-group">
                        <div class="icon-box-primary" style="background: rgba(255,255,255,0.2); color: white;">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div>
                            <h3 style="color: white;">${title}</h3>
                        </div>
                    </div>
                    <button class="modal-close-btn" onclick="window.router.closeModal()" style="color: white; background: rgba(255,255,255,0.1);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body-premium" style="padding: 25px;">
                    ${content}
                </div>
            </div>
        `;
    }

    closeModal() {
        document.getElementById('modal-container').style.display = 'none';
    }

    calculateAge(dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    async savePatient() {
        const patient = {
            full_name: document.getElementById('p-name').value,
            gender: document.getElementById('p-gender').value,
            dob: document.getElementById('p-dob').value,
            age: parseInt(document.getElementById('p-age').value),
            occupation: document.getElementById('p-occupation').value,
            contact_primary: document.getElementById('p-phone').value,
            email_id: document.getElementById('p-email').value,
            address: document.getElementById('p-address').value
        };

        if (!patient.full_name || !patient.dob || !patient.contact_primary) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }

        try {
            const res = await api.invoke('db-query', 'addPatient', patient);
            if (res) {
                this.showToast('Patient registered successfully!');
                this.closeModal();
                if (this.currentView === 'patients') this.renderPatients();
                else if (this.currentView === 'dashboard') this.renderDashboard();
            }
        } catch (e) {
            console.error(e);
            this.showToast('Failed to save patient', 'error');
        }
    }

    async renderDashboard() {
        // 1. Show Skeleton Instantly
        document.getElementById('view-title').innerText = 'Dashboard';
        document.getElementById('view-subtitle').innerText = 'Clinical Overview';

        document.getElementById('main-content').innerHTML = `
            <div class="dashboard-view fade-in">
                <!-- Stats Cards Skeleton -->
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div class="stat-card-premium"><div class="stat-details"><h3>Total Patients</h3><div class="value" id="stat-total">...</div></div></div>
                    <div class="stat-card-premium"><div class="stat-details"><h3>Today's Visits</h3><div class="value" id="stat-visits">...</div></div></div>
                    <div class="stat-card-premium"><div class="stat-details"><h3>Revenue Today</h3><div class="value" id="stat-revenue">...</div></div></div>
                </div>

                <div class="premium-card">
                    <div class="card-header-premium" style="background: white; border-bottom: 1px solid #f1f5f9; padding: 25px 30px; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="color: #1e293b; font-weight: 800; font-size: 1.25rem; margin: 0;">
                            <i class="fas fa-clock" style="color: #6366f1;"></i> Today's Clinical Schedule
                        </h3>
                        <div style="font-weight: 700; color: #6366f1; font-size: 0.95rem; background: #f5f3ff; padding: 8px 18px; border-radius: 12px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-calendar-day"></i>
                            ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    <div id="dashboard-schedule-container" style="padding: 30px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p style="margin-top: 15px;">Retrieving today's schedule...</p>
                    </div>
                </div>
            </div>
        `;

        // 2. Clear stats while fetching
        document.getElementById('stat-total').innerText = '...';
        document.getElementById('stat-visits').innerText = '...';
        document.getElementById('stat-revenue').innerText = '...';

        // 3. Fetch Data in Background
        try {
            const statsRes = await api.invoke('db-query', 'getDashboardStats');
            const stats = statsRes.success ? statsRes.data : { total_patients: 0, appointments_today: 0, billing_today: 0 };
            
            const appTodayRes = await api.invoke('db-query', 'getTodayAppointments');
            const appointments = appTodayRes.success ? appTodayRes.data : [];

            // 4. Update Stats with Safety
            document.getElementById('stat-total').innerText = stats.total_patients || 0;
            document.getElementById('stat-visits').innerText = appointments ? appointments.length : 0;
            const revenue = stats.billing_today || 0;
            document.getElementById('stat-revenue').innerText = `₹${revenue.toLocaleString()}`;

            // 4. Update Schedule Table
            const container = document.getElementById('dashboard-schedule-container');
            if (appointments.length === 0) {
                container.innerHTML = `
                    <div style="padding: 50px 0;">
                        <i class="fas fa-calendar-check fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                        <h4 style="color: #1e293b; font-weight: 700;">No appointments for today</h4>
                    </div>
                `;
            } else {
                container.style.textAlign = 'left';
                container.style.padding = '0';
                container.innerHTML = `
                    <div class="table-container-premium" style="padding: 0 30px 30px;">
                        <table class="premium-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Patient Name</th><th>Timing</th><th>Contact</th><th>Treatment</th><th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${appointments.map(a => {
                                    const pId = a.patient_id || '0';
                                    const pName = a.patient_name || 'Unknown Patient';
                                    const time = a.appointment_date ? new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                    return `
                                        <tr>
                                            <td style="font-weight: 800; color: #6366f1;">DL-${pId}</td>
                                            <td style="font-weight: 700; color: #1e293b; cursor: pointer;" onclick="window.router.viewPatient(${pId})">${pName}</td>
                                            <td><span class="badge-time">${time}</span></td>
                                            <td style="color: #64748b; font-weight: 600;">${a.contact_primary || 'No Contact'}</td>
                                            <td style="max-width: 200px; font-size: 0.85rem;">${a.notes || '--'}</td>
                                        <td>
                                            <div style="display: flex; gap: 8px;">
                                                <button onclick="window.router.markAppDone(${a.id})" class="btn-action-success" title="Mark as Completed"><i class="fas fa-check"></i></button>
                                                <button onclick="window.router.openRescheduleModal(${a.id}, \`${a.notes}\`, ${a.patient_id})" class="btn-action-danger" title="Reschedule Appointment"><i class="fas fa-calendar-alt"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        } catch (e) {
            console.error("Dashboard Load Error:", e);
        }
    }

    async markAppDone(id) {
        try {
            await api.invoke('db-query', 'updateAppointmentStatus', id, 'Completed');
            this.showToast('Appointment marked as completed!', 'success');
            this.renderDashboard(); // Refresh
        } catch (e) {
            this.showToast('Error updating status', 'error');
        }
    }

    openRescheduleModal(id, notes, patientId) {
        this.currentPatientId = patientId; 
        
        const modal = document.createElement('div');
        modal.id = 'reschedule-modal-overlay';
        modal.className = 'modal-backdrop-premium';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content-premium fade-in-up" style="max-width: 450px; padding: 0; border-radius: 25px; overflow: hidden;">
                <div class="modal-header-premium" style="background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); padding: 20px 25px; color: white; display: flex; justify-content: space-between; align-items: center; border: none;">
                    <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: white;"><i class="fas fa-calendar-alt"></i> Reschedule Visit</h3>
                    <button class="modal-close-btn" onclick="window.router.closeRescheduleModal()" style="color: white; background: rgba(255,255,255,0.1); border-radius: 8px; width: 32px; height: 32px; border: none; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding: 30px; background: white;">
                    <div class="form-group" style="position: relative; margin-bottom: 20px;">
                        <label style="font-weight: 700; color: #1e293b; font-size: 0.85rem; margin-bottom: 8px; display: block;">New Appointment Date</label>
                        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 5px 15px; display: flex; justify-content: space-between; align-items: center;">
                            <input type="text" id="display-date-text" placeholder="DD-MM-YYYY"
                                   oninput="window.router.handleDateInput(this, 'reschedule-app-date', 'app')"
                                   style="background: transparent; border: none; font-weight: 700; color: #1e293b; font-size: 0.95rem; width: 100%; outline: none;">
                            <i class="fas fa-calendar-alt" onclick="window.router.toggleCalendar()" style="color: #f43f5e; padding: 5px; cursor: pointer;"></i>
                        </div>
                        <input type="hidden" id="reschedule-app-date">
                        
                        <div id="custom-calendar-container" style="display: none; background: white; border: 1px solid #e2e8f0; border-radius: 15px; padding: 15px; margin-top: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: absolute; width: 100%; z-index: 100;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <button type="button" onclick="event.stopPropagation(); window.router.changeCalendarMonth(-1)" style="background: #f1f5f9; border: none; width: 25px; height: 25px; border-radius: 5px; cursor: pointer;"><i class="fas fa-chevron-left"></i></button>
                                <div style="display: flex; gap: 5px; font-weight: 800; font-size: 0.8rem; color: #1e293b;">
                                    <span id="calendar-month-btn"></span>
                                    <span id="calendar-year-btn"></span>
                                </div>
                                <button type="button" onclick="event.stopPropagation(); window.router.changeCalendarMonth(1)" style="background: #f1f5f9; border: none; width: 25px; height: 25px; border-radius: 5px; cursor: pointer;"><i class="fas fa-chevron-right"></i></button>
                            </div>
                            <div id="calendar-days-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;"></div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 25px;">
                        <label style="font-weight: 700; color: #1e293b; font-size: 0.85rem; margin-bottom: 8px; display: block;">Updated Treatment Notes</label>
                        <textarea id="reschedule-notes" class="premium-input" rows="3" style="font-size: 0.9rem; border-radius: 12px; padding: 12px;">${notes || ''}</textarea>
                    </div>

                    <button class="btn btn-primary-premium" onclick="window.router.processReschedule(${id})" style="width: 100%; padding: 15px; border-radius: 15px; background: #e11d48; font-weight: 800; font-size: 1rem; color: white; border: none; cursor: pointer; box-shadow: 0 10px 20px rgba(225, 29, 72, 0.2);">
                        <i class="fas fa-sync-alt"></i> Confirm Reschedule
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.renderCalendarGrid('reschedule-app-date');
    }

    closeRescheduleModal() {
        const modal = document.getElementById('reschedule-modal-overlay');
        if (modal) modal.remove();
    }

    async processReschedule(id) {
        const dateInput = document.getElementById('reschedule-app-date');
        const date = dateInput ? dateInput.value : '';
        const notes = document.getElementById('reschedule-notes').value;

        if (!date) return this.showToast('Please select a new date', 'warning');

        try {
            const fullDateTime = `${date}T09:00:00`;
            const res = await api.invoke('db-query', 'rescheduleAppointment', id, fullDateTime, notes);
            
            if (res.success) {
                this.showToast('Appointment rescheduled successfully!', 'success');
                this.closeRescheduleModal();
                
                // Refresh current view
                if (this.currentView === 'calendar') this.renderCalendar();
                else if (this.currentView === 'dashboard') this.renderDashboard();
                else if (this.currentView === 'patients' && this.currentPatientId) this.viewPatient(this.currentPatientId);
            } else {
                this.showToast('Failed to reschedule: ' + (res.error || 'Unknown error'), 'error');
            }
        } catch (e) {
            console.error(e);
            this.showToast('Error rescheduling appointment', 'error');
        }
    }

    async renderPatients() {
        const res = await api.invoke('db-query', 'getAllPatients', []);
        const patients = res.success ? res.data : [];

        document.getElementById('view-title').innerText = 'Patient Registry';
        document.getElementById('view-subtitle').innerText = 'Manage clinical records';
        
        document.getElementById('main-content').innerHTML = `
            <div class="patients-view fade-in">
                <div class="registry-controls">
                    <div class="search-box-premium">
                        <i class="fas fa-search"></i>
                        <input type="text" id="patient-search" placeholder="Search by name or phone..." class="premium-input">
                    </div>
                </div>

                <div class="premium-card">
                    <div class="table-container-premium">
                        <table class="premium-table" id="patients-table">
                            <thead>
                                <tr>
                                    <th style="text-align: center; width: 10%;">ID</th>
                                    <th style="text-align: center; width: 25%;">Patient Name</th>
                                    <th style="text-align: center; width: 15%;">Gender/Age</th>
                                    <th style="text-align: center; width: 20%;">Primary Contact</th>
                                    <th style="text-align: center; width: 15%;">Action</th>
                                    <th style="text-align: center; width: 15%;">Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${patients.map(p => `
                                    <tr>
                                        <td style="text-align: center;"><span class="id-cell">DL-${p.id}</span></td>
                                        <td style="text-align: center;"><strong>${p.full_name}</strong></td>
                                        <td style="text-align: center;">${p.gender} / ${p.age} yrs</td>
                                        <td style="text-align: center;">${p.contact_primary}</td>
                                        <td style="text-align: center;">
                                            <button class="btn btn-sm btn-primary-premium" onclick="window.router.viewPatient(${p.id})">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                        </td>
                                        <td style="text-align: center;">
                                            <button class="btn btn-sm btn-danger-outline" onclick="window.router.deletePatient(${p.id}, '${p.full_name}')" style="padding: 10px;">
                                                <i class="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Search logic
        const searchInput = document.getElementById('patient-search');
        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#patients-table tbody tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        };
    }

    async deletePatient(id, name) {
        this.showConfirmModal(
            'Delete Patient Record?',
            `Are you sure you want to delete <strong>${name}</strong>? This will permanently remove all associated clinical and billing records. This action cannot be undone.`,
            async () => {
                try {
                    const res = await api.invoke('db-query', 'deletePatient', id);
                    if (res.success) {
                        this.showToast('Patient record purged successfully', 'success');
                        if (this.currentView === 'patients') this.renderPatients();
                        else if (this.currentView === 'dashboard') this.renderDashboard();
                    } else {
                        this.showToast('Error deleting patient', 'error');
                    }
                } catch (e) {
                    console.error(e);
                    this.showToast('System failure during deletion', 'error');
                }
            }
        );
    }

    showConfirmModal(title, message, onConfirm) {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.style.display = 'flex';
        modalContainer.className = 'modal-backdrop-premium';
        modalContainer.innerHTML = `
            <div class="modal-content-premium confirmation-modal fade-in-up">
                <div class="modal-body-premium" style="padding: 50px 40px; text-align: center;">
                    <div class="warning-icon-box" style="color: #ef4444 !important; background: #fef2f2 !important;">
                        <i class="fas fa-exclamation-triangle" style="color: #ef4444 !important;"></i>
                    </div>
                    <h3 class="confirm-title">${title}</h3>
                    <p class="confirm-message">${message}</p>
                    <div class="confirm-actions" style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                        <button id="confirm-destructive-btn" class="btn btn-danger-premium" style="width: 100%; color: #ef4444 !important; font-weight: 900 !important; justify-content: center;">
                            <i class="fas fa-trash-alt" style="color: #ef4444 !important;"></i> Confirm Delete
                        </button>
                        <button class="btn btn-text" style="color: #64748b; font-weight: 600;" onclick="window.router.closeModal()">Keep Record</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('confirm-destructive-btn').onclick = () => {
            onConfirm();
            this.closeModal();
        };
    }

    async showEditPatientModal(id) {
        const res = await api.invoke('db-query', 'getPatientById', id);
        const p = res.success ? res.data : null;
        if (!p) return;

        const modalContainer = document.getElementById('modal-container');
        modalContainer.style.display = 'flex';
        modalContainer.className = 'modal-backdrop-premium';
        modalContainer.innerHTML = `
            <div class="modal-content-premium fade-in-up" style="max-width: 800px; border-radius: 20px; overflow: hidden;">
                <div class="modal-header-premium" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 20px 30px; border-bottom: none;">
                    <div class="header-title-group" style="display: flex; align-items: center; gap: 15px;">
                        <div class="icon-box-primary" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            <i class="fas fa-user-edit"></i>
                        </div>
                        <div>
                            <h2 style="color: white; font-weight: 800; font-size: 1.3rem; margin: 0;">Update Patient Profile</h2>
                            <p style="color: rgba(255,255,255,0.8); font-weight: 500; margin: 2px 0 0 0; font-size: 0.8rem;">Modifying clinical record for DL-${p.id}</p>
                        </div>
                    </div>
                    <button class="modal-close-btn" onclick="window.router.closeModal()" style="color: white; background: rgba(255,255,255,0.1); border-radius: 10px; width: 36px; height: 36px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body-premium" style="padding: 25px 30px; background: #ffffff;">
                    <form id="edit-patient-form" class="premium-form">
                        <div class="form-section">
                            <h4 class="section-title" style="margin-bottom: 15px;">
                                <i class="fas fa-id-card"></i> Personal Information
                            </h4>
                            <div class="form-grid">
                                <div class="form-group span-2">
                                    <label>Full Name</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-user"></i>
                                        <input type="text" id="edit-name" class="premium-input" value="${p.full_name}" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Date of Birth</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-calendar-alt"></i>
                                        <input type="date" id="edit-dob" class="premium-input" value="${p.dob}" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Gender</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-venus-mars"></i>
                                        <select id="edit-gender" class="premium-input" style="appearance: none;" required>
                                            <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
                                            <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
                                            <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Occupation</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-briefcase"></i>
                                        <input type="text" id="edit-occupation" class="premium-input" value="${p.occupation || ''}">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h4 class="section-title" style="margin-bottom: 15px;">
                                <i class="fas fa-phone-alt"></i> Contact Details
                            </h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Primary Phone</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-phone"></i>
                                        <input type="tel" id="edit-phone" class="premium-input" value="${p.contact_primary}" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Alternate Contact</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-mobile-alt"></i>
                                        <input type="tel" id="edit-phone-alt" class="premium-input" value="${p.contact_alternate || ''}">
                                    </div>
                                </div>
                                <div class="form-group span-2">
                                    <label>Email Address</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="edit-email" class="premium-input" value="${p.email_id || ''}">
                                    </div>
                                </div>
                                <div class="form-group span-2">
                                    <label>Home Address</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-map-marker-alt" style="top: 15px;"></i>
                                        <textarea id="edit-address" class="premium-input" rows="2">${p.address}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="modal-footer-premium" style="margin-top: 20px; padding-top: 20px;">
                            <button type="button" class="btn btn-secondary-outline" onclick="window.router.closeModal()">Discard</button>
                            <button type="submit" class="btn btn-primary-premium">
                                <i class="fas fa-check"></i> Save Profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('edit-patient-form').onsubmit = (e) => {
            e.preventDefault();
            this.updatePatient(id);
        };
    }

    async updatePatient(id) {
        const dobInput = document.getElementById('edit-dob');
        const dobValue = dobInput.value;
        if (!dobValue) return;

        const dob = new Date(dobValue);
        const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));

        const patientData = {
            full_name: document.getElementById('edit-name').value,
            dob: dobValue,
            age: age,
            gender: document.getElementById('edit-gender').value,
            address: document.getElementById('edit-address').value,
            occupation: document.getElementById('edit-occupation').value,
            contact_primary: document.getElementById('edit-phone').value,
            contact_alternate: document.getElementById('edit-phone-alt').value,
            email_id: document.getElementById('edit-email').value
        };

        try {
            // Note: passing id and patientData as separate arguments to match database.js updatePatient(id, patient)
            const res = await api.invoke('db-query', 'updatePatient', id, patientData);
            if (res.success) {
                this.showToast('Patient record updated successfully');
                this.closeModal();
                this.viewPatient(id); // Refresh the view
            } else {
                this.showToast('Failed to update patient', 'error');
            }
        } catch (e) {
            console.error(e);
            this.showToast('System error during update', 'error');
        }
    }

    async viewPatient(id, mode = 'read') {
        const res = await api.invoke('db-query', 'getPatientById', id);
        const p = res.success ? res.data : null;
        if (!p) return;

        // Fetch latest dental record if available
        const recordRes = await api.invoke('db-query', 'getDentalRecord', id);
        const record = recordRes.success ? recordRes.data : {};
        
        // Fetch billing summary for the snapshot
        const billingRes = await api.invoke('db-query', 'getBillingSummary', id);
        const billing = billingRes.success ? billingRes.data : { total: 0, paid: 0 };

        this.currentPatientId = id;
        this.currentRecord = record;
        this.caseMode = mode;

        document.getElementById('view-title').innerText = 'Clinical Case Sheet';
        document.getElementById('view-subtitle').innerText = `Patient ID: DL-${p.id}`;
        
        document.getElementById('main-content').innerHTML = `
            <style>
                .investigation-row:hover {
                    border-color: var(--primary) !important;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.05) !important;
                    transform: translateY(-2px);
                }

                .inv-findings-input:focus {
                    background: white !important;
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1) !important;
                    outline: none;
                }

                .radiograph-thumb:hover img {
                    opacity: 1 !important;
                    transform: scale(1.05);
                    transition: all 0.3s ease;
                }
            </style>
            <div class="clinical-hub-view fade-in">
                
                <!-- 1. Patient Details Mini Card (First) -->
                <div class="premium-card" style="padding: 25px; margin-bottom: 20px; display: flex; gap: 20px; align-items: center; background: white; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    <div class="avatar-sm" style="width: 60px; height: 60px; background: #e0f2fe; color: #0369a1; font-size: 1.5rem; font-weight: 800; border-radius: 18px; display: flex; align-items: center; justify-content: center;">
                        ${p.full_name.charAt(0)}
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; gap: 15px; align-items: baseline;">
                            <h3 style="margin: 0; font-weight: 800; color: #0f172a;">${p.full_name}</h3>
                            <span style="font-size: 0.85rem; color: #64748b; font-weight: 600;">DL-${p.id}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: #64748b; margin-top: 4px;">
                            ${p.age} yrs • ${p.gender} • ${p.contact_primary}
                        </div>
                    </div>
                    <button class="btn btn-text" onclick="window.router.showEditPatientModal(${p.id})" style="color: #64748b;">
                        <i class="fas fa-user-gear"></i> Edit Profile
                    </button>
                </div>

                <!-- 2. Financial Snapshot Bar (Second) -->
                <div class="billing-snapshot-bar" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 18px 30px; border-radius: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; color: white; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.2);">
                    <div style="display: flex; gap: 40px;">
                        <div class="billing-stat-item">
                            <span style="font-size: 0.7rem; font-weight: 700; opacity: 0.8; display: block; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Total Case Value</span>
                            <span style="font-size: 1.5rem; font-weight: 800;">₹${billing.total.toLocaleString()}</span>
                        </div>
                        <div class="billing-stat-item">
                            <span style="font-size: 0.7rem; font-weight: 700; opacity: 0.8; display: block; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Amount Paid</span>
                            <span style="font-size: 1.5rem; font-weight: 800; color: #4ade80;">₹${billing.paid.toLocaleString()}</span>
                        </div>
                        <div class="billing-stat-item">
                            <span style="font-size: 0.7rem; font-weight: 700; opacity: 0.8; display: block; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Balance Due</span>
                            <span style="font-size: 1.5rem; font-weight: 800; color: #f87171;">₹${(billing.total - billing.paid).toLocaleString()}</span>
                        </div>
                    </div>
                    <button class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; font-weight: 700; padding: 10px 20px; font-size: 0.85rem;" onclick="window.router.showBillingModal(${p.id})">
                        <i class="fas fa-file-invoice-dollar" style="margin-right: 8px;"></i> Manage Ledger
                    </button>
                </div>

                <!-- 3. Header: Clinical Case Sheet (Third) -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px;">
                    <div>
                        <h2 style="font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.5px;">Clinical Case Sheet</h2>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-secondary-outline" onclick="window.router.generateFullReport(${p.id})" style="padding: 10px 20px; border-radius: 12px; border-color: #f87171; color: #ef4444;">
                            <i class="fas fa-file-pdf"></i> Case Sheet
                        </button>
                        ${mode === 'read' ? `
                            <button class="btn btn-primary-premium" onclick="window.router.viewPatient(${p.id}, 'edit')" style="padding: 10px 20px; border-radius: 12px;">
                                <i class="fas fa-edit"></i> Edit Case Details
                            </button>
                        ` : `
                            <button class="btn btn-secondary-outline" onclick="window.router.viewPatient(${p.id}, 'read')" style="padding: 10px 20px; border-radius: 12px;">
                                <i class="fas fa-eye"></i> View Mode
                            </button>
                            <button class="btn btn-primary-premium" onclick="window.router.saveCaseRecord(${p.id})" style="padding: 10px 20px; border-radius: 12px;">
                                <i class="fas fa-check"></i> Save Changes
                            </button>
                        `}
                    </div>
                </div>

                <!-- 4. Clinical Navigation Buttons (Below Header) -->
                <div class="clinical-nav-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px;">
                    <button class="clinical-btn active" data-tab="history" onclick="window.router.switchClinicalTab('history')">
                        <i class="fas fa-history"></i> History
                    </button>
                    <button class="clinical-btn" data-tab="habits" onclick="window.router.switchClinicalTab('habits')">
                        <i class="fas fa-smoking"></i> Habits
                    </button>
                    <button class="clinical-btn" data-tab="extra-oral" onclick="window.router.switchClinicalTab('extra-oral')">
                        <i class="fas fa-face-smile"></i> Extra Oral Examination
                    </button>
                    <button class="clinical-btn" data-tab="functional" onclick="window.router.switchClinicalTab('functional')">
                        <i class="fas fa-lungs"></i> Functional Examination
                    </button>
                    <button class="clinical-btn" data-tab="hard-tissue" onclick="window.router.switchClinicalTab('hard-tissue')">
                        <i class="fas fa-tooth"></i> Hard Tissue
                    </button>
                    <button class="clinical-btn" data-tab="soft-tissue" onclick="window.router.switchClinicalTab('soft-tissue')">
                        <i class="fas fa-grin-tongue"></i> Soft Tissue
                    </button>
                    <button class="clinical-btn" data-tab="diagnosis" onclick="window.router.switchClinicalTab('diagnosis')">
                        <i class="fas fa-stethoscope"></i> Diagnosis
                    </button>
                    <button class="clinical-btn" data-tab="treatment-plan" onclick="window.router.switchClinicalTab('treatment-plan')">
                        <i class="fas fa-file-medical"></i> Treatment Plan
                    </button>
                </div>

                <!-- Dynamic Content Area -->
                <div id="clinical-content-area" class="fade-in">
                    <div style="padding: 50px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p style="margin-top: 15px;">Loading clinical records...</p>
                    </div>
                </div>
            </div>
        `;

        // Automatically trigger the first tab render
        setTimeout(() => this.switchClinicalTab('history'), 50);
    }

    async switchClinicalTab(tab) {
        // 1. Auto-save current tab data before switching
        if (this.caseMode === 'edit' && this.currentPatientId) {
            await this.saveCaseRecordInternal(this.currentPatientId, true);
        }

        // Update active state
        document.querySelectorAll('.clinical-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
        });

        const contentArea = document.getElementById('clinical-content-area');
        contentArea.innerHTML = await this.renderClinicalModule(tab, this.caseMode || 'read');
    }

    async renderClinicalModule(tab, mode) {
        const record = this.currentRecord || {};
        const patientId = this.currentPatientId;
        
        if (!patientId) {
            console.error("No current patient ID found in Clinical Module");
            return '<div style="padding:20px; color:red;">Error: Patient ID lost. Please re-open the patient.</div>';
        }
        
        if (tab === 'history') {
            const fields = [
                { id: 'chief_complaint', label: 'Chief Complaint' },
                { id: 'history_present_illness', label: 'History of Presenting Illness' },
                { id: 'medical_history', label: 'Medical History' },
                { id: 'past_dental_history', label: 'Dental History' },
                { id: 'drug_history', label: 'Drug History' },
                { id: 'family_history', label: 'Family History' },
                { id: 'other_history', label: 'Other History' }
            ];

            if (mode === 'read') {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-history"></i> Patient History Summary</h3>
                        </div>
                        <div style="padding: 25px; display: grid; gap: 20px;">
                            ${fields.map(f => `
                                <div class="read-field">
                                    <span class="label">${f.label}</span>
                                    <div class="value-box" style="min-height: 50px; line-height: 1.6; white-space: pre-wrap;">${record[f.id] || '<span style="color:#94a3b8; font-style:italic;">No data recorded</span>'}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-edit"></i> Edit History Details</h3>
                        </div>
                        <div style="padding: 25px;">
                            <form id="edit-case-form" style="display: grid; gap: 20px;">
                                ${fields.map(f => `
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-chevron-right" style="font-size: 0.7rem; color: var(--primary);"></i> ${f.label}
                                        </label>
                                        <textarea class="premium-input clinical-field" name="${f.id}" rows="3" placeholder="Enter ${f.label.toLowerCase()}..." 
                                                  oninput="window.router.autoSaveCaseRecord(${patientId})">${record[f.id] || ''}</textarea>
                                    </div>
                                `).join('')}
                            </form>
                        </div>
                    </div>
                `;
            }
        }

        if (tab === 'habits') {
            const fields = [
                { id: 'oral_habits', label: 'Habit Type', placeholder: 'e.g. Smoking, Tobacco Chewing, etc.' },
                { id: 'adverse_habits_freq', label: 'Frequency', placeholder: 'e.g. 5 times a day' },
                { id: 'adverse_habits_years', label: 'Duration (Years)', placeholder: 'e.g. 10 years' }
            ];

            if (mode === 'read') {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-smoking"></i> Habits Assessment</h3>
                        </div>
                        <div style="padding: 25px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                                ${fields.map(f => `
                                    <div class="read-field">
                                        <span class="label">${f.label}</span>
                                        <div class="value-box">${record[f.id] || '<span style="color:#94a3b8; font-style:italic;">None</span>'}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="read-field">
                                <span class="label">Abnormal Habits</span>
                                <div class="value-box" style="min-height: 50px;">${record.abnormal_habits || '<span style="color:#94a3b8; font-style:italic;">None recorded</span>'}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-edit"></i> Edit Habits</h3>
                        </div>
                        <div style="padding: 25px;">
                            <form id="edit-case-form">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px;">
                                    ${fields.map(f => `
                                        <div class="form-group" style="margin: 0;">
                                            <label style="font-weight: 700; color: #1e293b;">${f.label}</label>
                                            <input type="text" class="premium-input clinical-field" name="${f.id}" value="${record[f.id] || ''}" placeholder="${f.placeholder}" 
                                                   oninput="window.router.autoSaveCaseRecord(${patientId})">
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label style="font-weight: 700; color: #1e293b;">Abnormal Habits</label>
                                    <textarea class="premium-input clinical-field" name="abnormal_habits" rows="3" placeholder="e.g. Thumb sucking, Tongue thrusting, Mouth breathing..." 
                                              oninput="window.router.autoSaveCaseRecord(${patientId})">${record.abnormal_habits || ''}</textarea>
                                </div>
                                <div class="form-group" style="margin-top: 15px;">
                                    <label style="font-weight: 700; color: #1e293b;">Other Habits/Notes</label>
                                    <textarea class="premium-input clinical-field" name="habits_other" rows="2" placeholder="Any other habit findings..." 
                                              oninput="window.router.autoSaveCaseRecord(${patientId})">${record.habits_other || ''}</textarea>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            }
        }

        if (tab === 'extra-oral') {
            const fields = [
                { id: 'eo_head_shape', label: 'Shape of Head', type: 'select', options: ['Mesocephalic', 'Dolichocephalic', 'Brachycephalic'] },
                { id: 'eo_facial_form', label: 'Facial Form', type: 'select', options: ['Oval', 'Square', 'Tapering', 'Square-Tapering'] },
                { id: 'eo_facial_profile', label: 'Facial Profile', type: 'select', options: ['Straight', 'Convex', 'Concave'] },
                { id: 'eo_facial_divergence', label: 'Facial Divergence', type: 'select', options: ['Straight', 'Anteriorly Divergent', 'Posteriorly Divergent'] },
                { id: 'eo_lip_size', label: 'Lip Size', type: 'text', placeholder: 'e.g. Normal, Short' },
                { id: 'eo_lip_posture', label: 'Lip Posture', type: 'select', options: ['Competent', 'Incompetent', 'Potentially Competent'] },
                { id: 'eo_lip_relation', label: 'Lip Relation', type: 'text', placeholder: 'e.g. E-Line relation' },
                { id: 'eo_nasolabial_angle', label: 'Nasolabial Angle', type: 'select', options: ['Normal', 'Acute', 'Obtuse'] },
                { id: 'eo_mentolabial_sulcus', label: 'Mentolabial Sulcus', type: 'select', options: ['Normal', 'Deep', 'Shallow'] },
                { id: 'eo_clinical_fma', label: 'Clinical FMA', type: 'select', options: ['Average', 'High', 'Low'] },
                { id: 'eo_chin', label: 'Chin', type: 'select', options: ['Average', 'Prominent', 'Receding'] }
            ];

            if (mode === 'read') {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-face-smile"></i> Extra Oral Examination Summary</h3>
                        </div>
                        <div style="padding: 25px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                                ${fields.map(f => `
                                    <div class="read-field">
                                        <span class="label">${f.label}</span>
                                        <div class="value-box">${record[f.id] || '<span style="color:#94a3b8; font-style:italic;">Not recorded</span>'}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="read-field" style="margin-top: 15px;">
                                <span class="label">Other Extra-Oral Findings</span>
                                <div class="value-box" style="min-height: 50px;">${record.extraoral_findings || '<span style="color:#94a3b8; font-style:italic;">None recorded</span>'}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-edit"></i> Edit Extra Oral Examination</h3>
                        </div>
                        <div style="padding: 25px;">
                            <form id="edit-case-form">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
                                    ${fields.map(f => `
                                        <div class="form-group" style="margin: 0;">
                                            <label style="font-weight: 700; color: #1e293b;">${f.label}</label>
                                            ${f.type === 'select' ? `
                                                <select class="premium-input clinical-field" name="${f.id}" oninput="window.router.autoSaveCaseRecord(${patientId})">
                                                    <option value="">Select ${f.label}...</option>
                                                    ${f.options.map(opt => `<option value="${opt}" ${record[f.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                                                </select>
                                            ` : `
                                                <input type="text" class="premium-input clinical-field" name="${f.id}" value="${record[f.id] || ''}" placeholder="${f.placeholder}" 
                                                       oninput="window.router.autoSaveCaseRecord(${patientId})">
                                            `}
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label style="font-weight: 700; color: #1e293b;">Other Findings</label>
                                    <textarea class="premium-input clinical-field" name="extraoral_findings" rows="3" placeholder="Enter other extra-oral findings..." 
                                               oninput="window.router.autoSaveCaseRecord(${patientId})">${record.extraoral_findings || ''}</textarea>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            }
        }

        if (tab === 'functional') {
            const fields = [
                { id: 'func_respiration', label: 'Respiration', type: 'select', options: ['Nasal', 'Mouth', 'Mixed'] },
                { id: 'func_deglutition', label: 'Deglutition', type: 'select', options: ['Normal', 'Tongue Thrust', 'Infantile'] },
                { id: 'func_speech', label: 'Speech', type: 'select', options: ['Normal', 'Defective', 'Lisping'] },
                { id: 'func_postural_rest', label: 'Postural Rest Position', type: 'text', placeholder: 'Enter observations...' },
                { id: 'func_path_closure', label: 'Path of Closure', type: 'select', options: ['Normal', 'Deviation', 'Deflection'] },
                { id: 'func_tmj', label: 'TMJ Status', type: 'select', options: ['Normal', 'Clicking', 'Pain', 'Crepitus', 'Deviation'] },
                { id: 'func_perioral_muscle', label: 'Perioral Muscle Activity', type: 'select', options: ['Normal', 'Hyperactive', 'Hypotonic'] }
            ];

            if (mode === 'read') {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-lungs"></i> Functional Examination Summary</h3>
                        </div>
                        <div style="padding: 25px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                                ${fields.map(f => `
                                    <div class="read-field">
                                        <span class="label">${f.label}</span>
                                        <div class="value-box">${record[f.id] || '<span style="color:#94a3b8; font-style:italic;">Not recorded</span>'}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="read-field" style="margin-top: 15px;">
                                <span class="label">Other Functional Findings</span>
                                <div class="value-box" style="min-height: 50px;">${record.func_other || '<span style="color:#94a3b8; font-style:italic;">None recorded</span>'}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-edit"></i> Edit Functional Examination</h3>
                        </div>
                        <div style="padding: 25px;">
                            <form id="edit-case-form">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
                                    ${fields.map(f => `
                                        <div class="form-group" style="margin: 0;">
                                            <label style="font-weight: 700; color: #1e293b;">${f.label}</label>
                                            ${f.type === 'select' ? `
                                                <select class="premium-input clinical-field" name="${f.id}" oninput="window.router.autoSaveCaseRecord(${patientId})">
                                                    <option value="">Select ${f.label}...</option>
                                                    ${f.options.map(opt => `<option value="${opt}" ${record[f.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                                                </select>
                                            ` : `
                                                <input type="text" class="premium-input clinical-field" name="${f.id}" value="${record[f.id] || ''}" placeholder="${f.placeholder}" 
                                                       oninput="window.router.autoSaveCaseRecord(${patientId})">
                                            `}
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label style="font-weight: 700; color: #1e293b;">Other Findings</label>
                                    <textarea class="premium-input clinical-field" name="func_other" rows="3" placeholder="Enter other functional findings..." 
                                              oninput="window.router.autoSaveCaseRecord(${patientId})">${record.func_other || ''}</textarea>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            }
        }

        if (tab === 'hard-tissue') {
            const occFields = [
                { id: 'occ_molar', label: 'Molar Relation', type: 'select', options: ['Class I', 'Class II Div 1', 'Class II Div 2', 'Class III'] },
                { id: 'occ_canine', label: 'Canine Relation', type: 'select', options: ['Class I', 'Class II', 'Class III'] },
                { id: 'occ_incisal_ap', label: 'Incisal A-P', type: 'select', options: ['Class I', 'Class II', 'Class III', 'Edge-to-Edge'] },
                { id: 'occ_overjet', label: 'Overjet (mm)', type: 'text', placeholder: 'e.g. 2mm' },
                { id: 'occ_overbite', label: 'Overbite (mm)', type: 'text', placeholder: 'e.g. 10%' },
                { id: 'occ_midline', label: 'Midline Shift', type: 'text', placeholder: 'e.g. 2mm Right' },
                { id: 'occ_crossbite', label: 'Crossbite', type: 'text', placeholder: 'e.g. Upper Left' },
                { id: 'occ_scissorbite', label: 'Scissorbite', type: 'text', placeholder: 'e.g. None' }
            ];

            const archFields = [
                { id: 'ia_crowding', label: 'Crowding', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
                { id: 'ia_spacing', label: 'Spacing', type: 'select', options: ['None', 'Generalized', 'Localized'] },
                { id: 'ia_diastema', label: 'Diastema', type: 'text', placeholder: 'e.g. Midline 2mm' },
                { id: 'ia_impaction', label: 'Impactions', type: 'text', placeholder: 'e.g. 18, 28' },
                { id: 'ia_position', label: 'Tooth Positions', type: 'text', placeholder: 'e.g. 12 Rotated' }
            ];

            if (mode === 'read') {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-tooth"></i> Hard Tissue & Occlusion Summary</h3>
                        </div>
                        <div style="padding: 25px;">
                            <!-- 1. Tooth Chart (Read Mode) -->
                            <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--primary); margin-bottom: 20px;">Dental Status Chart</h4>
                            <div id="tooth-chart-read" style="margin-bottom: 35px; background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #e2e8f0;">
                                ${this.renderToothChart(record.caries_chart, 'read', patientId)}
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                                <div>
                                    <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--primary); margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Occlusal Relation</h4>
                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                                        ${occFields.map(f => `
                                            <div class="read-field">
                                                <span class="label">${f.label}</span>
                                                <div class="value-box">${record[f.id] || '--'}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <div>
                                    <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--primary); margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Intra-Arch Findings</h4>
                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                                        ${archFields.map(f => `
                                            <div class="read-field">
                                                <span class="label">${f.label}</span>
                                                <div class="value-box">${record[f.id] || '--'}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>

                            <div class="read-field" style="margin-top: 25px;">
                                <span class="label">Other Hard Tissue Findings</span>
                                <div class="value-box" style="min-height: 50px;">${record.intraoral_hard_tissue || 'No other findings recorded'}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-edit"></i> Edit Hard Tissue</h3>
                        </div>
                        <div style="padding: 25px;">
                            <!-- 1. Tooth Chart (Edit Mode) -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--primary); margin: 0;">Update Tooth Status</h4>
                                <div style="display: flex; gap: 10px; font-size: 0.7rem; color: #64748b; font-weight: 700;">
                                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; background: #ef4444; border-radius: 2px;"></span> Decayed</span>
                                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; background: #3b82f6; border-radius: 2px;"></span> Missing</span>
                                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; background: #22c55e; border-radius: 2px;"></span> Filled</span>
                                </div>
                            </div>
                            <div id="tooth-chart-edit" style="margin-bottom: 35px; background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #e2e8f0;">
                                ${this.renderToothChart(record.caries_chart, 'edit', patientId)}
                            </div>

                            <form id="edit-case-form">
                                <input type="hidden" name="caries_chart" id="caries-chart-data" class="clinical-field" value='${record.caries_chart || "{}"}'>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                                    <div>
                                        <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--primary); margin-bottom: 15px;">Occlusal Relation</h4>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                                            ${occFields.map(f => `
                                                <div class="form-group" style="margin: 0;">
                                                    <label style="font-weight: 700; color: #1e293b; font-size: 0.8rem;">${f.label}</label>
                                                    ${f.type === 'select' ? `
                                                        <select class="premium-input clinical-field" name="${f.id}" style="padding: 8px; font-size: 0.85rem;" oninput="window.router.autoSaveCaseRecord(${patientId})">
                                                            <option value="">--</option>
                                                            ${f.options.map(opt => `<option value="${opt}" ${record[f.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                                                        </select>
                                                    ` : `
                                                        <input type="text" class="premium-input clinical-field" name="${f.id}" value="${record[f.id] || ''}" placeholder="${f.placeholder}" style="padding: 8px; font-size: 0.85rem;" 
                                                               oninput="window.router.autoSaveCaseRecord(${patientId})">
                                                    `}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--primary); margin-bottom: 15px;">Intra-Arch Findings</h4>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                                            ${archFields.map(f => `
                                                <div class="form-group" style="margin: 0;">
                                                    <label style="font-weight: 700; color: #1e293b; font-size: 0.8rem;">${f.label}</label>
                                                    ${f.type === 'select' ? `
                                                        <select class="premium-input clinical-field" name="${f.id}" style="padding: 8px; font-size: 0.85rem;">
                                                            <option value="">--</option>
                                                            ${f.options.map(opt => `<option value="${opt}" ${record[f.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                                                        </select>
                                                    ` : `
                                                        <input type="text" class="premium-input clinical-field" name="${f.id}" value="${record[f.id] || ''}" placeholder="${f.placeholder}" style="padding: 8px; font-size: 0.85rem;">
                                                    `}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group" style="margin-top: 20px;">
                                    <label style="font-weight: 700; color: #1e293b;">Other Hard Tissue Findings</label>
                                    <textarea class="premium-input clinical-field" name="intraoral_hard_tissue" rows="3" placeholder="Enter any other observations..." 
                                              oninput="window.router.autoSaveCaseRecord(${patientId})">${record.intraoral_hard_tissue || ''}</textarea>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            }
        }

        if (tab === 'soft-tissue') {
            const fields = [
                { id: 'st_oral_hygiene', label: 'Oral Hygiene', type: 'select', options: ['Good', 'Fair', 'Poor'] },
                { id: 'st_gingival_texture', label: 'Gingival Status', type: 'text', placeholder: 'e.g. Normal, Inflamed' },
                { id: 'st_frenal_attachment', label: 'Frenal Attachment', type: 'select', options: ['Normal', 'High', 'Low', 'Thick'] },
                { id: 'st_tongue_size', label: 'Tongue Size', type: 'select', options: ['Normal', 'Large (Macroglossia)', 'Small'] },
                { id: 'st_tongue_shape', label: 'Tongue Shape', type: 'text', placeholder: 'e.g. Normal, Crenated' },
                { id: 'st_tongue_posture', label: 'Tongue Posture', type: 'select', options: ['Normal', 'Low', 'High', 'Protrusive'] },
                { id: 'st_tongue_movements', label: 'Tongue Movements', type: 'select', options: ['Normal', 'Restricted', 'Ankyloglossia'] },
                { id: 'st_oral_mucosa', label: 'Oral Mucosa', type: 'text', placeholder: 'e.g. Normal, Pale, Ulcers' },
                { id: 'st_palatal_contour', label: 'Palatal Contour', type: 'select', options: ['Normal', 'High Arched', 'Flat', 'Narrow'] },
                { id: 'st_tonsils_adenoids', label: 'Tonsils & Adenoids', type: 'select', options: ['Normal', 'Enlarged Grade 1', 'Enlarged Grade 2', 'Enlarged Grade 3'] },
                { id: 'periodontal_status', label: 'Periodontal Status', type: 'text', placeholder: 'e.g. Normal, Pockets, Recession' }
            ];

            if (mode === 'read') {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-leaf"></i> Soft Tissue Examination Summary</h3>
                        </div>
                        <div style="padding: 25px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                                ${fields.map(f => `
                                    <div class="read-field">
                                        <span class="label">${f.label}</span>
                                        <div class="value-box">${record[f.id] || '<span style="color:#94a3b8; font-style:italic;">Not recorded</span>'}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="read-field" style="margin-top: 20px;">
                                <span class="label">Other Soft Tissue Findings</span>
                                <div class="value-box" style="min-height: 50px;">${record.intraoral_soft_tissue || 'No other findings recorded'}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-edit"></i> Edit Soft Tissue Examination</h3>
                        </div>
                        <div style="padding: 25px;">
                            <form id="edit-case-form">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                                    ${fields.map(f => `
                                        <div class="form-group" style="margin: 0;">
                                            <label style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">${f.label}</label>
                                            ${f.type === 'select' ? `
                                                <select class="premium-input clinical-field" name="${f.id}" style="padding: 10px;" oninput="window.router.autoSaveCaseRecord(${patientId})">
                                                    <option value="">-- Select --</option>
                                                    ${f.options.map(opt => `<option value="${opt}" ${record[f.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                                                </select>
                                            ` : `
                                                <input type="text" class="premium-input clinical-field" name="${f.id}" value="${record[f.id] || ''}" placeholder="${f.placeholder}" style="padding: 10px;" 
                                                       oninput="window.router.autoSaveCaseRecord(${patientId})">
                                            `}
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label style="font-weight: 700; color: #1e293b;">Other Soft Tissue Findings</label>
                                    <textarea class="premium-input clinical-field" name="intraoral_soft_tissue" rows="3" placeholder="Enter any other observations..." 
                                              oninput="window.router.autoSaveCaseRecord(${patientId})">${record.intraoral_soft_tissue || ''}</textarea>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            }
        }

        if (tab === 'diagnosis') {
            const investigationTypes = [
                { id: 'iopa', label: 'IOPA', icon: 'fa-tooth', color: '#0ea5e9' },
                { id: 'opg', label: 'OPG', icon: 'fa-panorama', color: '#10b981' },
                { id: 'lat_ceph', label: 'Lat. Ceph', icon: 'fa-head-side-mask', color: '#8b5cf6' },
                { id: 'photos', label: 'Clinical Pictures', icon: 'fa-camera-retro', color: '#f59e0b' }
            ];

            let invData = {};
            try {
                invData = record.investigations ? JSON.parse(record.investigations) : {};
            } catch(e) {
                invData = {};
            }

            if (mode === 'read') {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);">
                            <h3><i class="fas fa-microscope"></i> Clinical Investigations & Findings</h3>
                        </div>
                        <div style="padding: 25px; background: #fdfdfd;">
                            <div style="display: grid; gap: 20px; margin-bottom: 30px;">
                                ${investigationTypes.map(type => {
                                    const data = invData[type.id] || {};
                                    const images = data.images || (data.image ? [data.image] : []);
                                    if (images.length === 0 && !data.findings) return '';
                                    return `
                                        <div style="display: flex; gap: 20px; background: white; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 15px;">
                                            <div style="width: 200px; flex-shrink: 0;">
                                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                                    <div style="width: 24px; height: 24px; border-radius: 6px; background: ${type.color}15; display: flex; align-items: center; justify-content: center; color: ${type.color};">
                                                        <i class="fas ${type.icon}" style="font-size: 0.75rem;"></i>
                                                    </div>
                                                    <span style="font-weight: 800; color: #1e293b; font-size: 0.85rem;">${type.label} (${images.length})</span>
                                                </div>
                                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                                    ${images.map(img => `
                                                        <div class="radiograph-thumb" onclick="window.router.openRadiograph('${img}')" 
                                                             style="width: 100%; height: 70px; background: #000; border-radius: 8px; overflow: hidden; cursor: zoom-in; border: 2px solid #f1f5f9;">
                                                            <img src="dlinv://${img}" style="width: 100%; height: 100%; object-fit: cover;">
                                                        </div>
                                                    `).join('')}
                                                    ${images.length === 0 ? '<div style="grid-column: span 2; height: 70px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.6rem; border: 1px dashed #e2e8f0;">No Images</div>' : ''}
                                                </div>
                                            </div>
                                            <div style="flex: 1; display: flex; flex-direction: column;">
                                                <span style="font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Clinical Findings</span>
                                                <div class="value-box" style="background: #f8fafc; border: 1px solid #e2e8f0; flex: 1; min-height: 80px; padding: 15px; font-size: 0.9rem; border-radius: 12px; color: #334155; white-space: pre-wrap;">${data.findings || '<span style="color:#94a3b8; font-style:italic;">No findings recorded.</span>'}</div>
                                            </div>
                                        </div>
                                    `;
                                }).join('') || '<div style="text-align: center; padding: 40px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 16px; border: 1px dashed #e2e8f0;">No clinical investigations recorded for this patient.</div>'}
                            </div>
                            
                            <div style="border-top: 2px solid #f1f5f9; padding-top: 25px;">
                                <div class="read-field">
                                    <span class="label" style="color: #0d9488; font-size: 0.85rem; margin-bottom: 10px; display: block;"><i class="fas fa-file-medical"></i> Final Summary / Diagnosis</span>
                                    <div class="value-box" style="min-height: 120px; line-height: 1.8; background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 16px; font-weight: 500; color: #115e59;">${record.diagnosis || '<span style="color:#94a3b8; font-style:italic;">Comprehensive diagnosis summary not yet entered.</span>'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="premium-card clinical-module-card">
                        <div class="card-header-premium">
                            <h3><i class="fas fa-edit"></i> Digital Investigation Dashboard</h3>
                        </div>
                        <div style="padding: 25px; background: #fdfdfd;">
                            <div style="margin-bottom: 30px;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                                    <span style="font-weight: 800; color: #1e293b; font-size: 1rem;">Investigations Repository</span>
                                    <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
                                </div>
                                <input type="hidden" name="investigations" id="investigations-json" class="clinical-field" value='${record.investigations || "{}"}'>
                                
                                <div style="display: grid; gap: 20px;">
                                    ${investigationTypes.map(type => {
                                        const data = invData[type.id] || {};
                                        return `
                                            <div class="investigation-row" data-type="${type.id}" 
                                                 style="display: flex; gap: 25px; align-items: flex-start; background: white; padding: 20px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: all 0.3s ease;">
                                                <div style="width: 200px; flex-shrink: 0;">
                                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                                        <i class="fas ${type.icon}" style="color: ${type.color}; font-size: 0.8rem;"></i>
                                                        <span style="font-weight: 700; color: #334155; font-size: 0.85rem;">${type.label}</span>
                                                    </div>
                                                    
                                                    <div id="thumb-${type.id}" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
                                                        ${(data.images || (data.image ? [data.image] : [])).map((img, idx) => `
                                                            <div style="width: 100%; height: 70px; background: #000; border-radius: 8px; overflow: hidden; position: relative; border: 2px solid ${type.color};">
                                                                <img src="dlinv://${img}" onclick="window.router.openRadiograph('${img}')" style="width: 100%; height: 100%; object-fit: cover; cursor: zoom-in;">
                                                                <div onclick="window.router.clearInvImage('${type.id}', ${idx})" style="position: absolute; top: 2px; right: 2px; background: #ef4444; color: white; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; cursor: pointer; border: 1px solid white;"><i class="fas fa-times"></i></div>
                                                            </div>
                                                        `).join('')}
                                                        <div onclick="window.router.uploadInvImage('${type.id}')" style="width: 100%; height: 70px; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; color: #cbd5e1; cursor: pointer; transition: all 0.2s;">
                                                            <i class="fas fa-plus"></i>
                                                        </div>
                                                    </div>
                                                    
                                                    <button type="button" onclick="window.router.uploadInvImage('${type.id}')" 
                                                            class="premium-button" 
                                                            style="width: 100%; padding: 8px; font-size: 0.7rem; background: ${type.color}; color: white; border-radius: 8px; font-weight: 700;">
                                                        <i class="fas fa-upload"></i> Add New Image
                                                    </button>
                                                </div>
                                                
                                                <div style="flex: 1; display: flex; flex-direction: column;">
                                                    <label style="font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Interpretation & Findings</label>
                                                    <textarea class="premium-input inv-findings-input" 
                                                              data-type="${type.id}" 
                                                              rows="5" 
                                                              placeholder="Describe clinical observations for ${type.label}..." 
                                                              style="font-size: 0.9rem; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fdfdfd; transition: all 0.2s ease;" 
                                                              oninput="window.router.autoSaveInvestigations(${patientId})">${data.findings || ''}</textarea>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 10px; margin: 30px 0 20px;">
                                <span style="font-weight: 800; color: #1e293b; font-size: 1rem;">Clinical Assessment Summary</span>
                                <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
                            </div>

                            <form id="edit-case-form">
                                <div class="form-group" style="margin: 0;">
                                    <textarea class="premium-input clinical-field" 
                                              name="diagnosis" 
                                              rows="6" 
                                              placeholder="Document the complete concluding diagnostic statement..." 
                                              style="font-size: 1rem; border-radius: 16px; border: 1px solid #e2e8f0; background: #fdfdfd; padding: 20px; line-height: 1.6;"
                                              oninput="window.router.autoSaveInvestigations(${patientId})">${record.diagnosis || ''}</textarea>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            }
        }

        if (tab === 'treatment-plan') {
            // Fetch dynamic data
            const historyRes = await api.invoke('db-query', 'getTreatmentHistory', patientId);
            const history = historyRes.success ? historyRes.data : [];
            
            const appointmentsRes = await api.invoke('db-query', 'getNextAppointments', patientId);
            const appointments = appointmentsRes.success ? appointmentsRes.data : [];

            return `
                <div style="display: flex; flex-direction: column; gap: 25px;">
                    <!-- Top: Overall Treatment Plan -->
                    <div class="premium-card">
                        <div class="card-header-premium" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">
                            <h3><i class="fas fa-project-diagram"></i> Overall Treatment Plan (Master Strategy)</h3>
                        </div>
                        <div style="padding: 20px;">
                            <div class="form-group" style="margin-bottom: 15px;">
                                <textarea id="master-treatment-plan" class="premium-input" rows="3" placeholder="Outline the primary treatment goals and strategy for this patient...">${record.treatment_plan || ''}</textarea>
                            </div>
                            <div style="display: flex; justify-content: flex-end;">
                                <button class="btn btn-primary-premium" style="padding: 10px 25px; border-radius: 12px; background: #4f46e5;" onclick="window.router.saveMasterPlan(${patientId})">
                                    <i class="fas fa-check-circle"></i> Update Master Strategy
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; align-items: start;">
                        <!-- Left: Treatment Progress -->
                        <div class="premium-card">
                            <div class="card-header-premium" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                <h3><i class="fas fa-notes-medical"></i> Treatment Done Today</h3>
                            </div>
                            <div style="padding: 20px;">
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <textarea id="treatment-done-text" class="premium-input" rows="4" placeholder="Enter details of treatment performed today..."></textarea>
                                </div>
                                <button class="btn btn-primary-premium" style="width: 100%; border-radius: 12px; padding: 12px;" onclick="window.router.addTreatmentProgress(${patientId})">
                                    <i class="fas fa-save"></i> Save Treatment Entry
                                </button>

                                <div style="margin-top: 25px;">
                                    <h4 style="font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-history"></i> Treatment History
                                    </h4>
                                    <div style="display: grid; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px;">
                                        ${history.length === 0 ? '<p style="text-align:center; color:#94a3b8; padding: 20px; font-style:italic;">No history recorded</p>' : history.map(h => `
                                            <div class="history-item-premium" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px; position: relative; transition: all 0.2s;">
                                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                                    <span style="font-size: 0.7rem; font-weight: 800; color: #10b981; background: #ecfdf5; padding: 4px 10px; border-radius: 20px;">
                                                        <i class="far fa-calendar-alt"></i> ${new Date(h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <button class="btn-icon-danger" onclick="window.router.deleteTreatmentProgress(${h.id}, ${patientId})" style="padding: 5px; opacity: 0.6; cursor:pointer; background:none; border:none; color:#ef4444;">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                                <div style="font-size: 0.9rem; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">${h.procedure_logs}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Next Appointment -->
                        <div class="premium-card">
                            <div class="card-header-premium" style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);">
                                <h3><i class="fas fa-calendar-plus"></i> Next Scheduled Appointment</h3>
                            </div>
                            <div style="padding: 20px;">
                                <div class="scheduling-container" style="display: flex; flex-direction: column; gap: 20px;">
                                    <!-- Date Section -->
                                    <div class="form-group" style="margin: 0; position: relative;">
                                        <label style="font-weight: 700; color: #1e293b; font-size: 0.8rem; margin-bottom: 10px; display: block;">Select Appointment Date</label>
                                    <div id="date-display-tab" style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 15px; padding: 5px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                                        <input type="text" id="display-date-text" placeholder="DD-MM-YYYY"
                                               oninput="window.router.handleDateInput(this, 'selected-app-date', 'app')"
                                               style="background: transparent; border: none; font-weight: 800; color: #1e293b; font-size: 1.1rem; letter-spacing: 1px; width: 100%; outline: none;">
                                        <i class="fas fa-calendar-alt" onclick="window.router.toggleCalendar()" style="color: #0ea5e9; font-size: 1.2rem; padding: 7px;"></i>
                                    </div>
                                        
                                        <!-- Custom Calendar Widget (Hidden by default) -->
                                        <div id="custom-calendar-container" style="display: none; background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 15px; margin-top: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: absolute; width: 100%; z-index: 100;">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                                            <button type="button" onclick="event.stopPropagation(); window.router.changeCalendarMonth(-1)" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 10px; color: #64748b; cursor: pointer;"><i class="fas fa-chevron-left"></i></button>
                                            <div style="display: flex; gap: 5px;">
                                                <span id="calendar-month-btn" onclick="event.stopPropagation(); window.router.showMonthSelector()" style="font-weight: 800; color: #1e293b; font-size: 0.95rem; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.2s;"></span>
                                                <span id="calendar-year-btn" onclick="event.stopPropagation(); window.router.showYearSelector()" style="font-weight: 800; color: #1e293b; font-size: 0.95rem; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.2s;"></span>
                                            </div>
                                            <button type="button" onclick="event.stopPropagation(); window.router.changeCalendarMonth(1)" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 10px; color: #64748b; cursor: pointer;"><i class="fas fa-chevron-right"></i></button>
                                        </div>
                                        
                                        <div id="calendar-main-view">
                                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 8px;">
                                                ${['S','M','T','W','T','F','S'].map(d => `<span style="font-size: 0.65rem; font-weight: 800; color: #94a3b8;">${d}</span>`).join('')}
                                            </div>
                                            <div id="calendar-days-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;"></div>
                                        </div>

                                        <!-- Selection Overlays -->
                                        <div id="month-selector-grid" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 10px;">
                                            ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => `
                                                <div class="selector-pill" onclick="event.stopPropagation(); window.router.jumpToMonth(${i})" style="padding: 10px; text-align: center; background: #f8fafc; border-radius: 10px; font-weight: 700; font-size: 0.8rem; cursor: pointer; color: #475569;">${m}</div>
                                            `).join('')}
                                        </div>

                                        <div id="year-selector-grid" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 10px; max-height: 200px; overflow-y: auto;">
                                            ${Array.from({length: 2081 - 2020}).map((_, i) => {
                                                const y = 2020 + i;
                                                return `<div class="selector-pill" onclick="event.stopPropagation(); window.router.jumpToYear(${y})" style="padding: 10px; text-align: center; background: #f8fafc; border-radius: 10px; font-weight: 700; font-size: 0.8rem; cursor: pointer; color: #475569;">${y}</div>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                        <input type="hidden" id="selected-app-date">
                                    </div>

                                    <!-- Time Section -->
                                    <div class="form-group" style="margin: 0; position: relative;">
                                        <label style="font-weight: 700; color: #1e293b; font-size: 0.8rem; margin-bottom: 10px; display: block;">Select Appointment Time</label>
                                        <div id="time-display-tab" onclick="window.router.toggleTimePicker()" style="background: #f0f9ff; border: 2px solid #dbeafe; border-radius: 15px; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s; margin-bottom: 5px;">
                                            <span id="display-time-text" style="font-weight: 800; color: #0ea5e9; font-size: 1.1rem; letter-spacing: 1px;">00:00 --</span>
                                            <i class="fas fa-clock" style="color: #0ea5e9; font-size: 1.2rem;"></i>
                                        </div>
                                        
                                        <!-- Time Picker (Hidden by default) -->
                                        <div id="custom-time-container" style="display: none; background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: absolute; width: 100%; z-index: 99;">
                                            <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px;">
                                                <!-- AM/PM Toggle -->
                                                <div style="display: flex; background: #f1f5f9; padding: 4px; border-radius: 12px; flex: 1;">
                                                    <button type="button" class="ampm-btn active" id="btn-am" onclick="event.stopPropagation(); window.router.selectAMPM('AM')" style="flex: 1; border: none; padding: 8px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: all 0.2s; background: #0ea5e9; color: white;">AM</button>
                                                    <button type="button" class="ampm-btn" id="btn-pm" onclick="event.stopPropagation(); window.router.selectAMPM('PM')" style="flex: 1; border: none; padding: 8px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: all 0.2s; background: transparent; color: #64748b;">PM</button>
                                                </div>
                                            </div>
                                            
                                            <div id="time-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                                ${['09', '10', '11', '12', '01', '02', '03', '04', '05', '06', '07', '08'].map(h => `
                                                    <div class="time-pill" onclick="event.stopPropagation(); window.router.selectScheduleTime(this, '${h}')"
                                                         style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; text-align: center; font-size: 0.8rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s;">
                                                        ${h}:00
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                        <input type="hidden" id="selected-app-hour" value="09">
                                        <input type="hidden" id="selected-app-ampm" value="AM">
                                    </div>

                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-weight: 700; color: #1e293b; font-size: 0.8rem; margin-bottom: 8px; display: block;">Treatment Plan for Visit</label>
                                        <textarea id="next-app-notes" class="premium-input" rows="2" placeholder="What is planned for the next visit?"></textarea>
                                    </div>
                                </div>
                                <script>
                                    setTimeout(() => window.router.renderCalendarGrid(), 100);
                                </script>
                                </div>
                                <button class="btn btn-primary-premium" style="width: 100%; border-radius: 12px; padding: 12px; background: #2563eb;" onclick="window.router.addNextAppointment(${patientId})">
                                    <i class="fas fa-calendar-check"></i> Schedule Appointment
                                </button>

                                <div style="margin-top: 25px;">
                                    <h4 style="font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-calendar-alt"></i> Upcoming Visits
                                    </h4>
                                    <div style="display: grid; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px;">
                                        ${appointments.length === 0 ? '<p style="text-align:center; color:#94a3b8; padding: 20px; font-style:italic;">No upcoming appointments</p>' : appointments.map(a => `
                                            <div style="background: #f0f9ff; border: 1px solid #dbeafe; border-radius: 16px; padding: 15px; position: relative;">
                                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                                    <span style="font-size: 0.7rem; font-weight: 800; color: #2563eb; background: #eff6ff; padding: 4px 10px; border-radius: 20px;">
                                                        <i class="far fa-clock"></i> ${new Date(a.appointment_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <div style="display: flex; gap: 5px;">
                                                        <button class="btn-icon-primary" onclick="window.router.editAppointment(${a.id}, '${a.appointment_date}', \`${a.notes}\`, ${patientId})" style="padding: 5px; opacity: 0.6; cursor:pointer; background:none; border:none; color:#2563eb;">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button class="btn-icon-danger" onclick="window.router.deleteNextAppointment(${a.id}, ${patientId})" style="padding: 5px; opacity: 0.6; cursor:pointer; background:none; border:none; color:#ef4444;">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style="font-size: 0.9rem; color: #1e3a8a; font-weight: 500; line-height: 1.4;">${a.notes || 'No plan details'}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Final closing logic
        const title = tab.replace('-', ' ').toUpperCase();
        return `
            <div class="premium-card clinical-module-card">
                <div class="card-header-premium">
                    <h3><i class="fas fa-file-invoice"></i> ${title}</h3>
                </div>
                <div style="padding: 30px; text-align: center; color: #94a3b8;">
                    <i class="fas fa-folder-open fa-3x" style="margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>Details for <strong>${title}</strong> will be added next.</p>
                </div>
            </div>
        `;
    }

    renderProfileTab(p) {
        return `
            <div class="profile-tab-content">
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px;">
                    <div class="premium-card" style="padding: 30px; border-radius: 20px;">
                        <h4 class="read-card-title" style="border-bottom-color: #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                            <i class="fas fa-phone" style="background: #eff6ff; color: #3b82f6; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 10px;"></i> 
                            Contact Information
                        </h4>
                        <div class="read-field">
                            <span class="label">Phone Number</span>
                            <div class="value-box">${p.contact_primary}</div>
                        </div>
                        <div class="read-field">
                            <span class="label">Alternate Contact</span>
                            <div class="value-box">${p.contact_alternate || 'Not provided'}</div>
                        </div>
                        <div class="read-field">
                            <span class="label">Email Address</span>
                            <div class="value-box">${p.email_id || 'Not provided'}</div>
                        </div>
                        <div class="read-field">
                            <span class="label">Home Address</span>
                            <div class="value-box" style="height: auto; min-height: 80px; line-height: 1.6;">${p.address || 'No address on file'}</div>
                        </div>
                    </div>

                    <div class="premium-card" style="padding: 30px; border-radius: 20px;">
                        <h4 class="read-card-title" style="border-bottom-color: #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                            <i class="fas fa-user-tag" style="background: #fef2f2; color: #ef4444; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 10px;"></i> 
                            Personal Details
                        </h4>
                        <div class="read-field">
                            <span class="label">Occupation</span>
                            <div class="value-box">${p.occupation || 'Not specified'}</div>
                        </div>
                        <div class="read-field">
                            <span class="label">Date of Birth</span>
                            <div class="value-box">${new Date(p.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                        <div class="read-field">
                            <span class="label">Registration Date</span>
                            <div class="value-box">${new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async switchPatientTab(tab, id) {
        // Update active tab UI
        document.querySelectorAll('.read-tab').forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-tab') === tab);
        });

        const content = document.getElementById('patient-tab-content');
        content.innerHTML = '<div style="text-align:center;padding:100px;"><i class="fas fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i><p style="margin-top:15px; font-weight:600; color:#64748b;">Loading Module...</p></div>';

        const res = await api.invoke('db-query', 'getPatientById', id);
        const p = res.success ? res.data : null;
        if (!p) return;

        if (tab === 'profile') {
            content.innerHTML = this.renderProfileTab(p);
        } else {
            content.innerHTML = `
                <div class="premium-card fade-in" style="padding: 100px; text-align: center; color: var(--text-muted); border-radius: 24px; background: #ffffff;">
                    <div style="width: 100px; height: 100px; background: #f8fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                        <i class="fas fa-tools fa-3x" style="color: #cbd5e1;"></i>
                    </div>
                    <h3 style="color: #1e293b; font-weight: 800; font-size: 1.5rem; margin-bottom: 10px;">${tab.toUpperCase()} Module</h3>
                    <p style="max-width: 400px; margin: 0 auto;">This clinical module is currently under reconstruction to integrate with the new patient database.</p>
                </div>
            `;
        }
    }

    autoSaveCaseRecord(patientId) {
        if (this.caseSaveTimeout) clearTimeout(this.caseSaveTimeout);
        this.caseSaveTimeout = setTimeout(() => {
            this.saveCaseRecordInternal(patientId, true);
        }, 1000); // 1s debounce
    }

    async saveCaseRecord(patientId) {
        await this.saveCaseRecordInternal(patientId, false);
    }

    async saveCaseRecordInternal(patientId, isAuto = false) {
        const form = document.getElementById('edit-case-form');
        if (!form) return;

        const data = { ...this.currentRecord, patient_id: patientId };
        
        // Collect data from all clinical-field inputs in current tab
        form.querySelectorAll('.clinical-field').forEach(field => {
            data[field.name] = field.value;
        });

        // Update currentRecord state so switching tabs keeps memory
        this.currentRecord = { ...data };

        try {
            const res = await api.invoke('db-query', 'saveDentalRecord', data);
            if (res.success || res > 0) {
                if (!isAuto) {
                    this.showToast('Clinical History saved successfully!', 'success');
                    this.viewPatient(patientId, 'read');
                }
            } else {
                if (!isAuto) this.showToast('Error saving record', 'error');
            }
        } catch (e) {
            console.error("Save Case Record Error:", e);
            if (!isAuto) this.showToast('Failed to save record', 'error');
        }
    }

    async addTreatmentProgress(patientId) {
        const text = document.getElementById('treatment-done-text').value;
        if (!text) return this.showToast('Please enter treatment details', 'warning');

        try {
            const res = await api.invoke('db-query', 'saveTreatmentDone', { patient_id: patientId, procedure_logs: text });
            console.log('Save Treatment Result:', res);
            if (res.success) {
                this.showToast('Treatment log saved!', 'success');
                this.switchClinicalTab('treatment-plan');
            }
        } catch (e) {
            this.showToast('Error saving treatment', 'error');
        }
    }

    async deleteTreatmentProgress(id, patientId) {
        this.showConfirmModal('Delete Treatment Log?', 'Are you sure you want to remove this entry?', async () => {
            try {
                await api.invoke('db-query', 'deleteTreatmentDone', id);
                this.showToast('Entry deleted', 'success');
                if (document.getElementById('clinical-content-area')) {
                    this.switchClinicalTab('treatment-plan');
                } else {
                    this.switchPatientTab('treatment-plan', patientId);
                }
            } catch (e) {
                this.showToast('Error deleting entry', 'error');
            }
        });
    }

    async addNextAppointment(patientId) {
        const date = document.getElementById('selected-app-date').value;
        const hour = document.getElementById('selected-app-hour').value;
        const ampm = document.getElementById('selected-app-ampm').value;
        const notes = document.getElementById('next-app-notes').value;

        if (!date || !hour || !ampm) return this.showToast('Please select both date and time', 'warning');

        // Convert 12h to 24h for database
        let h = parseInt(hour);
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        
        const fullDateTime = `${date}T${String(h).padStart(2, '0')}:00:00`;

        try {
            const res = await api.invoke('db-query', 'saveAppointment', { patient_id: patientId, appointment_date: fullDateTime, notes: notes });
            if (res.success || res > 0) {
                this.showToast('Appointment scheduled!', 'success');
                if (document.getElementById('clinical-content-area')) {
                    this.switchClinicalTab('treatment-plan');
                } else {
                    this.switchPatientTab('treatment-plan', patientId);
                }
            }
        } catch (e) {
            this.showToast('Error scheduling appointment', 'error');
        }
    }

    renderCalendarGrid(targetId = 'selected-app-date') {
        this.currentCalendarTargetId = targetId;
        const grid = document.getElementById('calendar-days-grid');
        const monthBtn = document.getElementById('calendar-month-btn');
        const yearBtn = document.getElementById('calendar-year-btn');
        if (!grid || !monthBtn || !yearBtn) return;

        if (!this.calendarViewDate) this.calendarViewDate = new Date();
        const date = this.calendarViewDate;
        const year = date.getFullYear();
        const month = date.getMonth();

        monthBtn.innerText = new Date(year, month).toLocaleString('default', { month: 'long' });
        yearBtn.innerText = year;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        grid.innerHTML = '';

        // Empty cells for first week
        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div></div>`;
        }

        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            
            grid.innerHTML += `
                <div class="calendar-day" onclick="event.stopPropagation(); window.router.selectScheduleDate(this, '${fullDate}', '${this.currentCalendarTargetId}')" 
                     style="height: 35px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; border-radius: 10px; cursor: pointer; transition: all 0.2s; 
                            ${isToday ? 'color: #3b82f6; border: 2px solid #dbeafe;' : 'color: #475569;'}">
                    ${d}
                </div>
            `;
        }
    }

    showMonthSelector() {
        document.getElementById('calendar-main-view').style.display = 'none';
        document.getElementById('year-selector-grid').style.display = 'none';
        document.getElementById('month-selector-grid').style.display = 'grid';
    }

    showYearSelector() {
        document.getElementById('calendar-main-view').style.display = 'none';
        document.getElementById('month-selector-grid').style.display = 'none';
        document.getElementById('year-selector-grid').style.display = 'grid';
    }

    jumpToMonth(month) {
        if (!this.calendarViewDate) this.calendarViewDate = new Date();
        this.calendarViewDate.setMonth(month);
        this.resetCalendarView();
    }

    jumpToYear(year) {
        if (!this.calendarViewDate) this.calendarViewDate = new Date();
        this.calendarViewDate.setFullYear(year);
        this.resetCalendarView();
    }

    resetCalendarView() {
        document.getElementById('month-selector-grid').style.display = 'none';
        document.getElementById('year-selector-grid').style.display = 'none';
        document.getElementById('calendar-main-view').style.display = 'block';
        this.renderCalendarGrid();
    }

    changeCalendarMonth(offset) {
        if (!this.calendarViewDate) this.calendarViewDate = new Date();
        this.calendarViewDate.setMonth(this.calendarViewDate.getMonth() + offset);
        this.renderCalendarGrid();
    }

    selectScheduleDate(el, date, targetId = 'selected-app-date') {
        document.querySelectorAll('.calendar-day').forEach(p => {
            p.style.background = 'none';
            p.style.color = '#475569';
            // Retain today's styling
            const today = new Date();
            const d = parseInt(p.innerText);
            const isToday = !isNaN(d) && today.getDate() === d && today.getMonth() === this.calendarViewDate.getMonth() && today.getFullYear() === this.calendarViewDate.getFullYear();
            if (isToday) {
                p.style.color = '#3b82f6';
                p.style.border = '2px solid #dbeafe';
            } else {
                p.style.border = 'none';
            }
        });
        
        el.style.background = '#6366f1';
        el.style.color = 'white';
        el.style.border = 'none';
        
        // Update Display Text
        const [year, month, day] = date.split('-');
        const displayField = document.getElementById('display-date-text');
        if (displayField) {
            displayField.style.color = '#1e293b';
        }
        
        const target = document.getElementById(targetId);
        if (target) target.value = date;

        this.toggleCalendar(false);
    }

    toggleCalendar(force) {
        const container = document.getElementById('custom-calendar-container');
        if (!container) return;
        const isHidden = container.style.display === 'none';
        container.style.display = (force !== undefined ? force : isHidden) ? 'block' : 'none';
    }

    toggleTimePicker(force) {
        const container = document.getElementById('custom-time-container');
        if (!container) return;
        const isHidden = container.style.display === 'none';
        container.style.display = (force !== undefined ? force : isHidden) ? 'block' : 'none';
    }

    selectScheduleTime(el, hour) {
        document.querySelectorAll('.time-pill').forEach(p => {
            p.style.background = '#f8fafc';
            p.style.color = '#475569';
            p.style.borderColor = '#e2e8f0';
        });
        el.style.background = '#0ea5e9';
        el.style.color = 'white';
        el.style.borderColor = '#0284c7';
        
        document.getElementById('selected-app-hour').value = hour;
        this.updateTimeDisplay();
        
        // Auto-hide time picker after selection
        this.toggleTimePicker(false);
    }

    selectAMPM(val) {
        document.querySelectorAll('.ampm-btn').forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.color = '#64748b';
        });
        const activeBtn = document.getElementById(`btn-${val.toLowerCase()}`);
        activeBtn.style.background = '#0ea5e9';
        activeBtn.style.color = 'white';
        
        document.getElementById('selected-app-ampm').value = val;
        this.updateTimeDisplay();
    }

    updateTimeDisplay() {
        const hour = document.getElementById('selected-app-hour').value;
        const ampm = document.getElementById('selected-app-ampm').value;
        document.getElementById('display-time-text').innerText = `${hour}:00 ${ampm}`;
    }

    async deleteNextAppointment(id, patientId) {
        this.showConfirmModal('Cancel Appointment?', 'Are you sure you want to cancel this appointment?', async () => {
            try {
                await api.invoke('db-query', 'deleteAppointment', id);
                this.showToast('Appointment cancelled', 'success');
                this.switchClinicalTab('treatment-plan');
            } catch (e) {
                this.showToast('Error deleting appointment', 'error');
            }
        });
    }

    async editAppointment(id, dateStr, notes, patientId) {
        try {
            // Parse ISO date: 2026-05-04T09:00:00
            const [datePart, timePart] = dateStr.split('T');
            const [y, m, d] = datePart.split('-');
            const [hourStr] = timePart.split(':');
            
            let h = parseInt(hourStr);
            let ampm = 'AM';
            if (h >= 12) {
                ampm = 'PM';
                if (h > 12) h -= 12;
            }
            if (h === 0) h = 12;
            
            const displayHour = String(h).padStart(2, '0');

            // Update UI Fields
            document.getElementById('selected-app-date').value = datePart;
            document.getElementById('display-date-text').value = `${d}-${m}-${y}`;
            document.getElementById('selected-app-hour').value = displayHour;
            document.getElementById('selected-app-ampm').value = ampm;
            document.getElementById('next-app-notes').value = notes || '';

            // Update Time Display
            this.updateTimeDisplay();
            
            // Sync Calendar Grid
            this.calendarViewDate = new Date(dateStr);
            this.renderCalendarGrid();

            this.showToast('Appointment details loaded for editing', 'info');
            
            // Scroll to the scheduler
            document.querySelector('.scheduling-container').scrollIntoView({ behavior: 'smooth' });

            // Delete the old one so the "save" acts as an update
            await api.invoke('db-query', 'deleteAppointment', id);
        } catch (e) {
            console.error("Edit failed:", e);
            this.showToast('Error loading appointment details', 'error');
        }
    }

    async saveMasterPlan(patientId) {
        const text = document.getElementById('master-treatment-plan').value;
        const data = { ...this.currentRecord, patient_id: patientId, treatment_plan: text };

        try {
            const res = await api.invoke('db-query', 'saveDentalRecord', data);
            if (res.success || res > 0) {
                this.showToast('Master Treatment Strategy updated!', 'success');
                this.currentRecord.treatment_plan = text; // Update local state
                this.switchClinicalTab('treatment-plan');
            }
        } catch (e) {
            this.showToast('Error updating strategy', 'error');
        }
    }

    async showBillingModal(id) {
        this.navigate('billing');
    }

    renderToothChart(dataJson, mode, patientId) {
        const data = dataJson ? JSON.parse(dataJson) : {};
        const quadrants = [
            { id: 'UR', label: 'Upper Right', range: [18, 17, 16, 15, 14, 13, 12, 11], display: [8, 7, 6, 5, 4, 3, 2, 1] },
            { id: 'UL', label: 'Upper Left', range: [21, 22, 23, 24, 25, 26, 27, 28], display: [1, 2, 3, 4, 5, 6, 7, 8] },
            { id: 'LR', label: 'Lower Right', range: [48, 47, 46, 45, 44, 43, 42, 41], display: [8, 7, 6, 5, 4, 3, 2, 1] },
            { id: 'LL', label: 'Lower Left', range: [31, 32, 33, 34, 35, 36, 37, 38], display: [1, 2, 3, 4, 5, 6, 7, 8] }
        ];

        const states = [
            { id: 'decayed', label: 'Decayed', icon: 'fa-circle', color: '#ef4444' },
            { id: 'missing', label: 'Missing', icon: 'fa-times', color: '#3b82f6' },
            { id: 'filled', label: 'Filled', icon: 'fa-fill-drip', color: '#22c55e' },
            { id: 'top', label: 'Tender on Percussion (TOP)', icon: 'fa-exclamation-triangle', color: '#f59e0b' },
            { id: 'ellis', label: 'Ellis Class', icon: 'fa-crutch', color: '#ec4899' },
            { id: 'mobility', label: 'Mobility', icon: 'fa-arrows-alt-h', color: '#f59e0b' },
            { id: 'impaction', label: 'Impaction', icon: 'fa-level-down-alt', color: '#06b6d4' }
        ];

        return `
            <div style="display: flex; gap: 15px; align-items: center; justify-content: flex-start; flex-wrap: nowrap; padding: 10px; overflow-x: auto;">
                <!-- Zsigmondy Chart (Left) -->
                <div class="tooth-chart-zsigmondy" style="display: grid; grid-template-columns: auto auto; grid-template-rows: auto auto; gap: 0; background: #cbd5e1; border: 2px solid #94a3b8; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); min-width: 600px;">
                    ${quadrants.map((q, idx) => `
                        <div class="quadrant" style="display: flex; gap: 3px; background: white; padding: 10px; 
                             ${idx % 2 === 0 ? 'border-right: 2px solid #94a3b8;' : ''} 
                             ${idx < 2 ? 'border-bottom: 2px solid #94a3b8;' : ''}
                             ${q.id.includes('R') ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
                            ${q.range.map((num, i) => {
                                const statuses = Array.isArray(data[num]) ? data[num] : (data[num] ? [data[num]] : []);
                                let indicators = '';
                                
                                if (statuses.includes('missing')) indicators += '<i class="fas fa-times" style="font-size: 1.1rem; position: absolute; color: #3b82f6; z-index: 5;"></i>';
                                if (statuses.includes('decayed')) indicators += '<div title="Decayed" style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; position: absolute; top: 2px; right: 2px; z-index: 5; border: 1px solid white;"></div>';
                                if (statuses.includes('top')) indicators += '<div title="Tender on Percussion" style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; position: absolute; top: 2px; left: 2px; z-index: 5; border: 1px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.4rem; font-weight: 900;">!</div>';
                                if (statuses.includes('mobility')) indicators += '<div title="Mobility" style="width: 70%; height: 2px; background: #f59e0b; position: absolute; bottom: 5px; border-radius: 10px; z-index: 4;"></div>';
                                if (statuses.includes('ellis')) indicators += '<div title="Ellis Class" style="width: 70%; height: 2px; background: #ec4899; position: absolute; bottom: 2px; border-radius: 10px; z-index: 4;"></div>';
                                if (statuses.includes('filled')) indicators += '<i class="fas fa-fill-drip" style="font-size: 0.6rem; position: absolute; top: 2px; right: 2px; color: #16a34a; z-index: 5;"></i>';
                                if (statuses.includes('impaction')) indicators += '<i class="fas fa-level-down-alt" style="font-size: 0.6rem; position: absolute; bottom: 2px; right: 2px; color: #0891b2; z-index: 5;"></i>';
                                
                                const isFilled = statuses.includes('filled');
                                const isImpaction = statuses.includes('impaction');

                                return `
                                    <div class="tooth-box ${statuses.join(' ')}" 
                                         ${mode === 'edit' ? `onclick="window.router.showToothModal(${num}, event, ${patientId})"` : ''}
                                         style="width: 32px; height: 42px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; position: relative; cursor: ${mode === 'edit' ? 'pointer' : 'default'}; border-radius: 4px; 
                                                background: ${isFilled ? '#f0fdf4' : (isImpaction ? '#ecfeff' : 'white')};
                                                border-color: ${isFilled ? '#22c55e' : (isImpaction ? '#06b6d4' : '#e2e8f0')};
                                                box-shadow: ${isFilled ? 'inset 0 0 5px rgba(34, 197, 94, 0.1)' : (isImpaction ? 'inset 0 0 5px rgba(6, 182, 212, 0.1)' : 'none')};">
                                        <span style="font-size: 0.8rem; font-weight: 700; color: #334155; position: relative; z-index: 2;">${q.display[i]}</span>
                                        ${indicators}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `).join('')}
                </div>

                <!-- Legend (Right) -->
                <div class="tooth-chart-legend" style="background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; min-width: 180px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="font-size: 0.65rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-info-circle"></i> Status Key
                    </div>
                    <div style="display: grid; gap: 6px;">
                        ${states.map(s => `
                            <div style="display: flex; align-items: center; gap: 10px; padding: 2px;">
                                <div style="width: 22px; height: 22px; border-radius: 6px; background: white; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                    <i class="fas ${s.icon}" style="color: ${s.color}; font-size: 0.7rem;"></i>
                                </div>
                                <span style="font-size: 0.72rem; font-weight: 700; color: #475569;">${s.label}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <!-- Tooth Modal Placeholder -->
            <div id="tooth-modal-container"></div>
        `;
    }

    showToothModal(num, event, patientId) {
        event.stopPropagation();
        const input = document.getElementById('caries-chart-data');
        const currentData = JSON.parse(input.value || '{}');
        const currentStatuses = Array.isArray(currentData[num]) ? currentData[num] : (currentData[num] ? [currentData[num]] : []);

        const container = document.getElementById('tooth-modal-container');
        const states = [
            { id: 'decayed', label: 'Decayed', icon: 'fa-circle', color: '#ef4444' },
            { id: 'missing', label: 'Missing', icon: 'fa-times', color: '#3b82f6' },
            { id: 'filled', label: 'Filled', icon: 'fa-fill-drip', color: '#22c55e' },
            { id: 'top', label: 'Tender on Percussion (TOP)', icon: 'fa-exclamation-triangle', color: '#f59e0b' },
            { id: 'ellis', label: 'Ellis Class', icon: 'fa-crutch', color: '#ec4899' },
            { id: 'mobility', label: 'Mobility', icon: 'fa-arrows-alt-h', color: '#f59e0b' },
            { id: 'impaction', label: 'Impaction', icon: 'fa-level-down-alt', color: '#06b6d4' }
        ];

        container.innerHTML = `
            <div id="tooth-modal-overlay" onclick="window.router.closeToothModal()" style="position: fixed; top:0; left:0; width:100%; height:100%; z-index: 1000; background: rgba(0,0,0,0.1);">
                <div onclick="event.stopPropagation()" style="position: absolute; top: ${Math.min(event.clientY, window.innerHeight - 350)}px; left: ${Math.min(event.clientX, window.innerWidth - 250)}px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 5px; min-width: 220px; border: 1px solid #e2e8f0; animation: scaleIn 0.15s ease-out;">
                    <div style="padding: 10px 15px; border-bottom: 1px solid #f1f5f9; font-weight: 800; font-size: 0.75rem; color: var(--primary); text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
                        <span>Tooth ${num} Status</span>
                        <i class="fas fa-times" onclick="window.router.closeToothModal()" style="cursor:pointer; opacity:0.5;"></i>
                    </div>
                    <div style="max-height: 300px; overflow-y: auto; padding: 5px;">
                        ${states.map(s => {
                            const active = currentStatuses.includes(s.id);
                            return `
                                <div class="tooth-option ${active ? 'active' : ''}" onclick="window.router.updateToothStatus(${num}, '${s.id}', ${patientId})" 
                                     style="padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border-radius: 8px; transition: all 0.2s; background: ${active ? '#f1f5f9' : 'transparent'}; margin-bottom: 2px;">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <i class="fas ${s.icon}" style="color: ${s.color}; width: 18px; font-size: 0.9rem;"></i>
                                        <span style="font-size: 0.85rem; font-weight: ${active ? '700' : '600'}; color: #1e293b;">${s.label}</span>
                                    </div>
                                    ${active ? '<i class="fas fa-check-circle" style="color: var(--primary); font-size: 0.9rem;"></i>' : '<div style="width:16px;"></div>'}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div style="padding: 10px; border-top: 1px solid #f1f5f9;">
                        <button onclick="window.router.closeToothModal()" class="premium-button" style="width: 100%; padding: 8px; font-size: 0.75rem; background: var(--primary);">Done</button>
                    </div>
                </div>
            </div>
        `;
    }

    closeToothModal() {
        const container = document.getElementById('tooth-modal-container');
        if (container) container.innerHTML = '';
    }

    async uploadInvImage(typeId) {
        if (!this.currentPatientId) {
            this.showToast('Error', 'Please select a patient first');
            return;
        }

        console.log('Starting upload for:', typeId, 'Patient:', this.currentPatientId);
        const sourcePath = await api.invoke('select-image');
        if (!sourcePath) return;

        const result = await api.invoke('save-investigation-image', sourcePath);
        if (result.success) {
            // Get current investigations from state or DOM
            let invData = {};
            try {
                const input = document.getElementById('investigations-json');
                const rawValue = input ? input.value : (this.currentRecord.investigations || "{}");
                invData = JSON.parse(rawValue);
            } catch(e) { 
                invData = {}; 
            }

            if (!invData[typeId]) invData[typeId] = {};
            if (!invData[typeId].images) {
                invData[typeId].images = invData[typeId].image ? [invData[typeId].image] : [];
                delete invData[typeId].image;
            }
            
            invData[typeId].images.push(result.fileName);
            
            // Save to DB immediately
            await api.invoke('db-query', 'updateDentalRecord', this.currentPatientId, {
                investigations: JSON.stringify(invData)
            });

            // Update local memory
            if (this.currentRecord) {
                this.currentRecord.investigations = JSON.stringify(invData);
            }
            
            this.showToast('Success', 'Image added to gallery');
            
            // Re-render
            this.switchClinicalTab('diagnosis');
        }
    }

    async clearInvImage(typeId, index) {
        const input = document.getElementById('investigations-json');
        let data = JSON.parse(input.value || "{}");
        
        if (data[typeId] && data[typeId].images) {
            data[typeId].images.splice(index, 1);
        } else if (data[typeId] && data[typeId].image) {
            delete data[typeId].image;
        }
        
        const finalJson = JSON.stringify(data);
        
        // Save to DB immediately
        await api.invoke('db-query', 'updateDentalRecord', this.currentPatientId, {
            investigations: finalJson
        });

        if (this.currentRecord) {
            this.currentRecord.investigations = finalJson;
        }
        
        // Re-render
        this.switchClinicalTab('diagnosis');
    }

    updateInvJson() {
        const input = document.getElementById('investigations-json');
        let data = JSON.parse(input.value || "{}");
        
        document.querySelectorAll('.inv-findings-input').forEach(textarea => {
            const type = textarea.getAttribute('data-type');
            if (!data[type]) data[type] = {};
            data[type].findings = textarea.value;
        });
        
        input.value = JSON.stringify(data);
    }

    async generateFullReport(patientId) {
        this.showToast('Generating Case Sheet...', 'info');
        
        // Open window immediately to avoid popup blockers
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            this.showToast('Popup blocked! Please allow popups for this app.', 'error');
            return;
        }

        try {
            // 1. Fetch All Data
            const patientRes = await api.invoke('db-query', 'getPatientById', patientId);
            const p = patientRes.success ? patientRes.data : null;
            if (!p) throw new Error('Patient not found');

            const recordRes = await api.invoke('db-query', 'getDentalRecord', patientId);
            const record = recordRes.success ? recordRes.data : {};

            const logsRes = await api.invoke('db-query', 'getTreatmentHistory', patientId);
            const logs = logsRes.success ? logsRes.data : [];

            const billingRes = await api.invoke('db-query', 'getBillingHistory', patientId);
            const billing = billingRes.success ? billingRes.data : [];

            const appRes = await api.invoke('db-query', 'getNextAppointments', patientId);
            const nextAppointments = appRes.success ? appRes.data : [];

            const settingsRes = await api.invoke('db-query', 'getClinicSettings');
            const s = settingsRes.success ? settingsRes.data : {};

            const clinicName = s.clinic_name || 'DentRecords Clinical Hub';
            const drName = s.doctor_name ? `Dr. ${s.doctor_name}` : 'DentRecords Practitioner';
            const clinicPhone = s.clinic_phone || '';

            // Generate Tooth Chart HTML for PDF
            const toothChartHtml = this.renderToothChart(record.caries_chart, 'read', patientId);

            // Process Investigations for PDF (Fetch base64 for images)
            let investigationsHtml = '';
            try {
                const invData = (record && record.investigations) ? JSON.parse(record.investigations) : {};
                const invTypes = [
                    { id: 'iopa', label: 'IOPA' },
                    { id: 'opg', label: 'OPG' },
                    { id: 'lat_ceph', label: 'Lat. Ceph' },
                    { id: 'photos', label: 'Clinical Pictures' }
                ];

                if (invData && typeof invData === 'object') {
                    for (const type of invTypes) {
                        const data = invData[type.id] || {};
                        let imagesArr = [];
                        if (Array.isArray(data.images)) {
                            imagesArr = data.images;
                        } else if (data.image && typeof data.image === 'string') {
                            imagesArr = [data.image];
                        } else if (data.images && typeof data.images === 'string') {
                            imagesArr = [data.images];
                        }

                        if (imagesArr.length === 0 && !data.findings) continue;

                        let imagesHtml = '';
                        for (const img of imagesArr) {
                            if (!img || typeof img !== 'string') continue;
                            try {
                                const b64 = await api.invoke('get-image-base64', img);
                                if (b64 && b64.success) {
                                    imagesHtml += `<img src="${b64.data}" style="width: 140px; height: 110px; object-fit: cover; border-radius: 8px; margin: 5px; border: 1px solid #e2e8f0; background: #000;">`;
                                } else {
                                    // Fallback to dlinv protocol if base64 fails
                                    imagesHtml += `<img src="dlinv://${img}" style="width: 140px; height: 110px; object-fit: cover; border-radius: 8px; margin: 5px; border: 1px solid #e2e8f0; background: #000;">`;
                                }
                            } catch (e) {
                                console.error("Error fetching investigation image:", img, e);
                                imagesHtml += `<img src="dlinv://${img}" style="width: 140px; height: 110px; object-fit: cover; border-radius: 8px; margin: 5px; border: 1px solid #e2e8f0; background: #000;">`;
                            }
                        }

                        investigationsHtml += `
                            <div class="info-box full-width" style="margin-bottom: 15px;">
                                <label style="color: var(--primary); font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">${type.label} INVESTIGATION</label>
                                <div style="display: flex; flex-wrap: wrap; gap: 10px;">${imagesHtml}</div>
                                <div class="value" style="margin-top: 10px; background: #f8fafc; padding: 10px; border-radius: 8px;">${data.findings || 'No specific findings recorded.'}</div>
                            </div>
                        `;
                    }
                }
            } catch (e) {
                console.error("Error processing investigations:", e);
                investigationsHtml = '<div class="info-box full-width"><p style="color: #94a3b8; font-style: italic;">No investigations recorded or error parsing data.</p></div>';
            }

            if (!investigationsHtml) {
                investigationsHtml = '<div class="info-box full-width"><p style="color: #94a3b8; font-style: italic;">No clinical investigations recorded for this patient.</p></div>';
            }

            // Define Field Groups for thorough reporting
            const historyFields = [
                { id: 'chief_complaint', label: 'Chief Complaint', full: true },
                { id: 'history_present_illness', label: 'History of Present Illness' },
                { id: 'medical_history', label: 'Medical History' },
                { id: 'past_dental_history', label: 'Past Dental History' },
                { id: 'drug_history', label: 'Drug History / Allergies' },
                { id: 'family_history', label: 'Family History' },
                { id: 'oral_habits', label: 'Oral Habits' },
                { id: 'adverse_habits_freq', label: 'Adverse Habits Frequency' },
                { id: 'adverse_habits_years', label: 'Habit Duration (Years)' },
                { id: 'other_history', label: 'Other Clinical History', full: true }
            ];

            const eoFields = [
                { id: 'eo_facial_profile', label: 'Facial Profile' },
                { id: 'eo_facial_form', label: 'Facial Form' },
                { id: 'eo_facial_divergence', label: 'Facial Divergence' },
                { id: 'eo_lip_relation', label: 'Lip Relation' },
                { id: 'eo_lip_posture', label: 'Lip Posture' },
                { id: 'eo_nasolabial_angle', label: 'Nasolabial Angle' },
                { id: 'eo_mentolabial_sulcus', label: 'Mentolabial Sulcus' },
                { id: 'eo_chin', label: 'Chin Status' },
                { id: 'extraoral_findings', label: 'General Extra-oral', full: true }
            ];

            const funcFields = [
                { id: 'func_respiration', label: 'Respiration' },
                { id: 'func_deglutition', label: 'Deglutition' },
                { id: 'func_speech', label: 'Speech' },
                { id: 'func_tmj', label: 'TMJ Status' },
                { id: 'func_postural_rest', label: 'Postural Rest' },
                { id: 'func_path_closure', label: 'Path of Closure' },
                { id: 'func_other', label: 'Other Functional', full: true }
            ];

            const stFields = [
                { id: 'st_oral_hygiene', label: 'Oral Hygiene' },
                { id: 'st_gingival_texture', label: 'Gingival Status' },
                { id: 'st_oral_mucosa', label: 'Oral Mucosa' },
                { id: 'st_tongue_size', label: 'Tongue Size' },
                { id: 'st_tongue_shape', label: 'Tongue Shape' },
                { id: 'st_palatal_contour', label: 'Palatal Contour' },
                { id: 'st_tonsils_adenoids', label: 'Tonsils & Adenoids' },
                { id: 'intraoral_soft_tissue', label: 'General Soft Tissue', full: true }
            ];

            const renderFieldGrid = (fieldList) => {
                return fieldList.map(f => `
                    <div class="info-box ${f.full ? 'full-width' : ''}">
                        <label>${f.label}</label>
                        <div class="value">${record[f.id] || '<span style="color:#94a3b8; font-style:italic;">Not recorded</span>'}</div>
                    </div>
                `).join('');
            };

            // 2. Prepare HTML for Printing
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Clinical Case Sheet - ${p.full_name}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
                        body { background: white; color: #1e293b; padding: 30px; line-height: 1.4; font-size: 13px; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
                            .page-break { page-break-before: always; }
                        }
                        .header { border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .clinic-info h1 { color: #0d9488; font-size: 1.6rem; font-weight: 800; margin-bottom: 2px; }
                        .clinic-info p { color: #64748b; font-size: 0.85rem; font-weight: 600; }
                        
                        .patient-banner { background: #f8fafc; border-radius: 12px; padding: 15px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; border: 1px solid #e2e8f0; }
                        .stat label { display: block; font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
                        .stat span { font-weight: 700; font-size: 0.85rem; color: #1e293b; }
                        
                        .section-title { font-size: 0.9rem; font-weight: 800; color: #0d9488; border-left: 4px solid #0d9488; padding-left: 10px; margin: 25px 0 10px; text-transform: uppercase; letter-spacing: 0.8px; background: #f0fdfa; padding-top: 6px; padding-bottom: 6px; }
                        
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                        .info-box { background: white; border: 1px solid #f1f5f9; padding: 10px; border-radius: 10px; }
                        .info-box label { display: block; font-size: 0.65rem; color: #64748b; font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; text-transform: uppercase; }
                        .info-box .value { font-size: 0.85rem; line-height: 1.5; color: #334155; white-space: pre-wrap; }
                        
                        .full-width { grid-column: span 2; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
                        th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
                        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.8rem; }
                        
                        .tooth-chart-zsigmondy { zoom: 0.75; margin: 0 auto; }
                        .tooth-chart-legend { display: none; }
                        
                        .footer { margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; color: #94a3b8; font-size: 0.7rem; }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 100;">
                        <button onclick="window.print()" style="background: #0d9488; color: white; border: none; padding: 12px 25px; border-radius: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 20px rgba(13,148,136,0.3);">
                            <i class="fas fa-print"></i> Print / Save PDF
                        </button>
                    </div>

                    <div class="header">
                        <div class="clinic-info">
                            <h1>${clinicName}</h1>
                            <p>${drName}</p>
                            <p>${clinicPhone}</p>
                        </div>
                        <div style="text-align: right;">
                            <h2 style="font-weight: 800; color: #1e293b; font-size: 1.1rem;">CLINICAL CASE SHEET</h2>
                            <p style="color: #94a3b8; font-size: 0.75rem; font-weight: 700;">DATE: ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="patient-banner">
                        <div class="stat"><label>Patient ID</label><span>DL-${p.id}</span></div>
                        <div class="stat"><label>Name</label><span>${p.full_name}</span></div>
                        <div class="stat"><label>Gender / Age</label><span>${p.gender} / ${p.age} Yrs</span></div>
                        <div class="stat"><label>Contact</label><span>${p.contact_primary}</span></div>
                        <div class="stat"><label>Occupation</label><span>${p.occupation || 'N/A'}</span></div>
                        <div class="stat"><label>DOB</label><span>${new Date(p.dob).toLocaleDateString()}</span></div>
                        <div class="stat" style="grid-column: span 2;"><label>Address</label><span>${p.address || 'N/A'}</span></div>
                    </div>

                    <div class="section-title">1. Clinical History & Habits</div>
                    <div class="info-grid">
                        ${renderFieldGrid(historyFields)}
                    </div>

                    <div class="section-title">2. Extra-Oral Examination</div>
                    <div class="info-grid">
                        ${renderFieldGrid(eoFields)}
                    </div>

                    <div class="page-break"></div>

                    <div class="section-title">3. Functional Examination</div>
                    <div class="info-grid">
                        ${renderFieldGrid(funcFields)}
                    </div>

                    <div class="section-title">4. Intra-Oral Examination (Soft Tissue)</div>
                    <div class="info-grid">
                        ${renderFieldGrid(stFields)}
                    </div>

                    <div class="section-title">5. Intra-Oral Examination (Hard Tissue & Occlusion)</div>
                    <div style="margin-bottom: 20px; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <label style="font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase;">Zsigmondy Dental Status Chart</label>
                            <div style="display: flex; gap: 10px; font-size: 0.6rem; font-weight: 700; color: #64748b; flex-wrap: wrap; justify-content: flex-end; max-width: 70%;">
                                <span style="display: flex; align-items: center; gap: 3px;"><span style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span> Decayed</span>
                                <span style="display: flex; align-items: center; gap: 3px;"><i class="fas fa-times" style="color: #3b82f6; font-size: 0.7rem;"></i> Missing</span>
                                <span style="display: flex; align-items: center; gap: 3px;"><i class="fas fa-fill-drip" style="color: #16a34a; font-size: 0.7rem;"></i> Filled</span>
                                <span style="display: flex; align-items: center; gap: 3px;"><span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; color: white; font-size: 0.4rem; display: flex; align-items: center; justify-content: center; font-weight: 900;">!</span> TOP</span>
                                <span style="display: flex; align-items: center; gap: 3px;"><span style="width: 12px; height: 2px; background: #ec4899;"></span> Ellis</span>
                                <span style="display: flex; align-items: center; gap: 3px;"><span style="width: 12px; height: 2px; background: #f59e0b;"></span> Mobility</span>
                                <span style="display: flex; align-items: center; gap: 3px;"><i class="fas fa-level-down-alt" style="color: #0891b2; font-size: 0.7rem;"></i> Impaction</span>
                            </div>
                        </div>
                        <div style="text-align: center;">
                            ${toothChartHtml}
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-box"><label>Molar Relation (R/L)</label><div class="value">${record.occ_molar || '--'}</div></div>
                        <div class="info-box"><label>Canine Relation (R/L)</label><div class="value">${record.occ_canine || '--'}</div></div>
                        <div class="info-box"><label>Incisal A-P</label><div class="value">${record.occ_incisal_ap || '--'}</div></div>
                        <div class="info-box"><label>Overjet / Overbite</label><div class="value">${record.occ_overjet || '--'} / ${record.occ_overbite || '--'}</div></div>
                        <div class="info-box"><label>Crossbite / Midline</label><div class="value">${record.occ_crossbite || '--'} / ${record.occ_midline || '--'}</div></div>
                        <div class="info-box"><label>Scissorbite</label><div class="value">${record.occ_scissorbite || '--'}</div></div>
                    </div>

                    <div class="page-break"></div>

                    <div class="section-title">6. Investigations & Findings</div>
                    <div style="display: grid; gap: 15px;">
                        ${investigationsHtml}
                    </div>

                    <div class="section-title">7. Clinical Diagnosis Summary</div>
                    <div class="info-grid">
                        <div class="info-box full-width" style="background: #f0fdfa; border-color: #ccfbf1;">
                            <label style="color: #0d9488;">Final Concluding Diagnosis</label>
                            <div class="value" style="font-weight: 700; color: #115e59; font-size: 1rem;">${record.diagnosis || 'Pending final assessment'}</div>
                        </div>
                    </div>

                    <div class="section-title">8. Treatment Plan & Strategy</div>
                    <div class="info-grid">
                        <div class="info-box full-width" style="border-left: 4px solid #0d9488;">
                            <label>Master Treatment Strategy & Goals</label>
                            <div class="value" style="font-weight: 500; font-size: 0.95rem;">${record.treatment_plan || 'Pending formulation'}</div>
                        </div>
                    </div>

                    <div class="section-title">9. Treatment Progress Logs</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 15%;">Date</th>
                                <th style="width: 85%;">Procedure Log & Clinical Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.length > 0 ? logs.map(log => `
                                <tr>
                                    <td style="font-weight: 700; color: #64748b;">${new Date(log.created_at).toLocaleDateString()}</td>
                                    <td style="line-height: 1.6; white-space: pre-wrap;">${log.procedure_logs}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="2" style="text-align:center; padding: 30px; color: #94a3b8;">No treatment entries found.</td></tr>'}
                        </tbody>
                    </table>

                    <div class="section-title">10. Upcoming Appointments</div>
                    ${nextAppointments.length > 0 ? nextAppointments.map(app => `
                        <div class="info-box" style="margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-weight: 800; color: #0d9488; font-size: 0.85rem;">
                                    <i class="far fa-calendar-check"></i> ${new Date(app.appointment_date).toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div class="value">${app.notes || 'Routine follow-up.'}</div>
                        </div>
                    `).join('') : '<p style="font-size: 0.8rem; color: #94a3b8; padding: 10px;">No upcoming appointments scheduled.</p>'}

                    <div class="page-break"></div>
                    <div class="section-title">11. Financial Summary</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Total Cost</th>
                                <th>Paid</th>
                                <th>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${billing.length > 0 ? billing.map(b => `
                                <tr>
                                    <td>${new Date(b.created_at).toLocaleDateString()}</td>
                                    <td style="font-weight: 700;">${b.treatment_name}</td>
                                    <td>₹${b.total_cost.toLocaleString()}</td>
                                    <td style="color: #16a34a; font-weight: 700;">₹${b.paid_amount.toLocaleString()}</td>
                                    <td style="color: #e11d48; font-weight: 700;">₹${b.balance_amount.toLocaleString()}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align:center; padding: 30px; color: #94a3b8;">No billing records found.</td></tr>'}
                        </tbody>
                    </table>

                    <div class="footer">
                        <p>This is a computer-generated clinical document from ${clinicName}.</p>
                        <p style="margin-top: 5px;">Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                </body>
                </html>
            `;
            printWindow.document.write(html);
            printWindow.document.close();

        } catch (e) {
            console.error("Report Generation Error:", e);
            if (printWindow) {
                printWindow.document.write(`<h3>Error generating report</h3><p>${e.message}</p>`);
                printWindow.document.close();
            }
            this.showToast('Error generating report: ' + e.message, 'error');
        }
    }

    autoSaveInvestigations(patientId) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveInvestigations(patientId, true);
        }, 1000); // 1 second debounce
    }

    async saveInvestigations(patientId, isAuto = false) {
        const jsonInput = document.getElementById('investigations-json');
        if (!jsonInput) return;
        
        // Sync JSON with current textareas before saving
        this.updateInvJson();
        
        const investigations = jsonInput.value;
        const diagnosisArea = document.querySelector('textarea[name="diagnosis"]');
        const diagnosis = diagnosisArea ? diagnosisArea.value : '';
        
        const result = await api.invoke('db-query', 'updateDentalRecord', patientId, {
            investigations: investigations,
            diagnosis: diagnosis
        });
        
        if (result.success) {
            // Keep memory consistent
            if (this.currentRecord) {
                this.currentRecord.investigations = investigations;
                this.currentRecord.diagnosis = diagnosis;
            }
            if (!isAuto) this.showToast('Success', 'Digital record updated!');
        } else {
            console.error('Auto-save failed:', result.error);
        }
    }

    openRadiograph(fileName) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: default; animation: fadeIn 0.3s ease;';
        
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = 'position: absolute; top: 60px; right: 40px; color: white; font-size: 2.2rem; cursor: pointer; z-index: 10001; text-shadow: 0 4px 15px rgba(0,0,0,0.8); transition: all 0.2s ease; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); border-radius: 50%;';
        closeBtn.onmouseover = () => closeBtn.style.transform = 'scale(1.1)';
        closeBtn.onmouseout = () => closeBtn.style.transform = 'scale(1)';
        closeBtn.onclick = (e) => { e.stopPropagation(); overlay.remove(); };

        const img = document.createElement('img');
        img.src = `dlinv://${fileName}`;
        img.style.cssText = 'max-width: 90%; max-height: 80%; border-radius: 16px; box-shadow: 0 30px 100px rgba(0,0,0,1); border: 4px solid #475569; transition: transform 0.3s ease; cursor: zoom-out;';
        img.onclick = () => overlay.remove();

        const label = document.createElement('div');
        label.innerText = 'Click anywhere to close';
        label.style.cssText = 'color: #94a3b8; margin-top: 30px; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; background: rgba(255,255,255,0.05); padding: 8px 20px; border-radius: 20px;';
        
        overlay.appendChild(closeBtn);
        overlay.appendChild(img);
        overlay.appendChild(label);
        document.body.appendChild(overlay);
    }

    updateToothStatus(num, status, patientId) {
        const input = document.getElementById('caries-chart-data');
        if (!input) return;
        
        const data = JSON.parse(input.value || '{}');
        let statuses = Array.isArray(data[num]) ? data[num] : (data[num] ? [data[num]] : []);
        
        // Toggle status
        if (statuses.includes(status)) {
            statuses = statuses.filter(s => s !== status);
        } else {
            statuses.push(status);
        }
        
        data[num] = statuses;
        input.value = JSON.stringify(data);
        
        // Update visual chart
        const container = document.getElementById('tooth-chart-edit');
        if (container) {
            container.innerHTML = this.renderToothChart(input.value, 'edit', patientId);
        }
        
        // Re-render modal to show updated checks
        this.showToothModal(num, { clientX: parseInt(document.getElementById('tooth-modal-overlay').children[0].style.left), clientY: parseInt(document.getElementById('tooth-modal-overlay').children[0].style.top), stopPropagation: () => {} }, patientId);

        // Auto-save
        this.autoSaveCaseRecord(patientId);
    }

    // DOB Calendar Methods
    renderDOBCalendar() {
        const grid = document.getElementById('dob-calendar-days-grid');
        const monthBtn = document.getElementById('dob-calendar-month-btn');
        const yearBtn = document.getElementById('dob-calendar-year-btn');
        if (!grid || !monthBtn || !yearBtn) return;

        if (!this.dobViewDate) this.dobViewDate = new Date();
        const date = this.dobViewDate;
        const year = date.getFullYear();
        const month = date.getMonth();

        monthBtn.innerText = new Date(year, month).toLocaleString('default', { month: 'short' });
        yearBtn.innerText = year;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        grid.innerHTML = '';
        for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            grid.innerHTML += `<div class="calendar-day" onclick="event.stopPropagation(); window.router.selectDOB(this, '${fullDate}')" style="height: 30px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; border-radius: 8px; cursor: pointer;">${d}</div>`;
        }
    }

    toggleDOBCalendar(force) {
        const container = document.getElementById('dob-calendar-container');
        if (!container) return;
        const isHidden = container.style.display === 'none';
        container.style.display = (force !== undefined ? force : isHidden) ? 'block' : 'none';
    }

    showDOBMonthSelector() {
        document.getElementById('dob-calendar-main-view').style.display = 'none';
        document.getElementById('dob-year-selector').style.display = 'none';
        document.getElementById('dob-month-selector').style.display = 'grid';
    }

    showDOBYearSelector() {
        document.getElementById('dob-calendar-main-view').style.display = 'none';
        document.getElementById('dob-month-selector').style.display = 'none';
        document.getElementById('dob-year-selector').style.display = 'grid';
    }

    jumpToDOBMonth(m) {
        this.dobViewDate.setMonth(m);
        this.resetDOBView();
    }

    jumpToDOBYear(y) {
        this.dobViewDate.setFullYear(y);
        this.resetDOBView();
    }

    resetDOBView() {
        document.getElementById('dob-month-selector').style.display = 'none';
        document.getElementById('dob-year-selector').style.display = 'none';
        document.getElementById('dob-calendar-main-view').style.display = 'block';
        this.renderDOBCalendar();
    }

    changeDOBCalendarMonth(offset) {
        this.dobViewDate.setMonth(this.dobViewDate.getMonth() + offset);
        this.renderDOBCalendar();
    }

    selectDOB(el, date) {
        document.querySelectorAll('#dob-calendar-days-grid .calendar-day').forEach(p => p.style.background = 'none');
        el.style.background = '#3b82f6';
        el.style.color = 'white';
        
        const [year, month, day] = date.split('-');
        const dobText = document.getElementById('display-dob-text');
        if (dobText) {
            dobText.value = `${day}-${month}-${year}`;
            dobText.style.color = '#1e293b';
        }
        document.getElementById('p-dob').value = date;

        // Auto-calculate age
        const ageInput = document.getElementById('p-age');
        if (ageInput) {
            ageInput.value = this.calculateAge(date);
        }

        this.toggleDOBCalendar(false);
    }
    handleDateInput(el, hiddenId, type) {
        let val = el.value.replace(/\D/g, '');
        if (val.length > 8) val = val.substring(0, 8);
        
        let formatted = '';
        if (val.length > 0) formatted += val.substring(0, 2);
        if (val.length > 2) formatted += '-' + val.substring(2, 4);
        if (val.length > 4) formatted += '-' + val.substring(4, 8);
        
        el.value = formatted;

        if (val.length === 8) {
            const d = val.substring(0, 2);
            const m = val.substring(2, 4);
            const y = val.substring(4, 8);
            const isoDate = `${y}-${m}-${d}`;
            
            // Validate date
            const dateObj = new Date(isoDate);
            if (!isNaN(dateObj.getTime())) {
                document.getElementById(hiddenId).value = isoDate;
                if (type === 'dob') {
                    this.dobViewDate = dateObj;
                    this.renderDOBCalendar();
                    const ageInput = document.getElementById('p-age');
                    if (ageInput) ageInput.value = this.calculateAge(isoDate);
                } else if (type === 'app') {
                    this.calendarViewDate = dateObj;
                    this.renderCalendarGrid();
                } else if (type === 'main-app') {
                    this.mainScheduleViewDate = dateObj;
                    this.renderMainScheduleCalendar();
                }
            }
        }
    }
    // ==========================================
    // 1. MASTER BILLING HUB
    // ==========================================
    async renderBilling() {
        document.getElementById('view-title').innerText = 'Billing Hub';
        document.getElementById('view-subtitle').innerText = 'Select a patient to manage bills and payments';

        document.getElementById('main-content').innerHTML = `
            <div class="billing-view fade-in">
                <!-- Search & Filter Header -->
                <div class="premium-card" style="margin-bottom: 25px; padding: 20px;">
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <div class="input-with-icon" style="flex: 1;">
                            <i class="fas fa-search"></i>
                            <input type="text" id="billing-patient-search" placeholder="Search patients by name, ID or phone..." class="premium-input" 
                                   oninput="window.router.searchPatientsForBilling(this.value)">
                        </div>
                        <div class="filter-group" style="display: flex; gap: 10px;">
                            <button class="btn btn-icon-secondary" title="Refresh List" onclick="window.router.renderBilling()"><i class="fas fa-sync"></i></button>
                        </div>
                    </div>
                </div>

                <div class="premium-card">
                    <div class="card-header-premium" style="background: white; border-bottom: 1px solid #f1f5f9; padding: 20px 25px;">
                        <h3 style="color: #1e293b; font-weight: 800; font-size: 1.1rem; margin: 0;">Patient Billing Directory</h3>
                    </div>
                    <div class="table-container-premium">
                        <table class="premium-table">
                            <thead>
                                <tr>
                                    <th style="text-align: center; width: 10%;">ID</th>
                                    <th style="text-align: center; width: 30%;">Patient Name</th>
                                    <th style="text-align: center; width: 20%;">Gender/Age</th>
                                    <th style="text-align: center; width: 25%;">Primary Contact</th>
                                    <th style="text-align: center; width: 15%;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="billing-directory-body">
                                <tr>
                                    <td colspan="5" style="text-align: center; padding: 50px; color: #94a3b8;">
                                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                                        <p style="margin-top: 15px;">Loading directory...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.searchPatientsForBilling('');
    }

    async searchPatientsForBilling(query) {
        try {
            const res = await api.invoke('db-query', 'getPatients', query);
            const patients = res.success ? res.data : [];
            const tbody = document.getElementById('billing-directory-body');
            
            if (!tbody) return;

            if (patients.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">No patients found matching "${query}"</td></tr>`;
                return;
            }

            tbody.innerHTML = patients.map(p => {
                return `
                    <tr>
                        <td style="text-align: center;"><span class="id-cell">DL-${p.id}</span></td>
                        <td style="text-align: center;"><strong>${p.full_name}</strong></td>
                        <td style="text-align: center;">${p.gender} / ${p.age} yrs</td>
                        <td style="text-align: center;">${p.contact_primary}</td>
                        <td style="text-align: center;">
                            <button onclick="window.router.openPatientBilling(${p.id}, '${p.full_name.replace(/'/g, "\\'")}')" class="btn btn-sm btn-primary-premium">
                                <i class="fas fa-file-invoice-dollar"></i> Bill
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            console.error(e);
        }
    }

    async openPatientBilling(patientId, patientName) {
        document.getElementById('view-title').innerText = 'Patient Billing';
        document.getElementById('view-subtitle').innerText = `Financial Records for ${patientName}`;

        document.getElementById('main-content').innerHTML = `
            <div class="billing-detail-view fade-in">
                <!-- Header with Back Button and Top Right Button -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <button class="btn btn-secondary-outline" onclick="window.router.renderBilling()">
                        <i class="fas fa-arrow-left"></i> Back to Directory
                    </button>
                    <button class="btn btn-primary-premium" id="btn-create-bill" onclick="window.router.openNewTransactionModal(${patientId}, '${patientName.replace(/'/g, "\\'")}')">
                        <i class="fas fa-plus"></i> New Transaction
                    </button>
                </div>

                <div class="premium-card">
                    <div class="card-header-premium" style="background: white; border-bottom: 1px solid #f1f5f9; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="color: #1e293b; font-weight: 800; font-size: 1.1rem; margin: 0;">Payment History</h3>
                        <button class="btn btn-secondary-outline" style="border:none; color:#94a3b8; font-size: 0.85rem; font-weight: 700;" title="View Deleted Transactions" 
                                onclick="window.router.openDeletedBillingHistory(${patientId}, \`${patientName.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                            <i class="fas fa-history" style="margin-right: 5px;"></i> Audit Log
                        </button>
                    </div>
                    <div class="table-container-premium">
                        <table class="premium-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Treatment/Description</th>
                                    <th>Total Cost</th>
                                    <th>Paid Amount</th>
                                    <th>Balance</th>
                                    <th style="text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="payment-history-body">
                                <tr>
                                    <td colspan="6" style="text-align: center; padding: 50px; color: #94a3b8;">
                                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                                        <p style="margin-top: 15px;">Loading history...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        try {
            const res = await api.invoke('db-query', 'getBillingHistory', patientId);
            const history = res.success ? res.data : [];
            const tbody = document.getElementById('payment-history-body');

            if (!tbody) return;

            if (history.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">No payment history found for this patient.</td></tr>`;
                return;
            }

            // Calculate cumulative paid amount per treatment (or just running total)
            // To be safe and logical, let's calculate a running total of ALL payments for this patient's billing session
            const sortedHistory = [...history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            let runningPaid = 0;
            const historyWithCumulative = sortedHistory.map((b, index) => {
                runningPaid += b.paid_amount;
                // Clean the treatment name by removing repetitive "Payment:" prefixes
                let cleanName = (b.treatment_name || 'Treatment').replace(/^(Payment:\s*)+/i, '');
                return { ...b, treatment_name: cleanName, cumulativePaid: runningPaid, installmentIndex: index };
            }).reverse(); // Show newest first

            tbody.innerHTML = historyWithCumulative.map(b => {
                const date = new Date(b.created_at).toLocaleDateString();
                const balanceColor = b.balance_amount > 0 ? '#e11d48' : '#16a34a';
                
                // Show badge for installments (anything after the first entry)
                const installmentBadge = b.installmentIndex > 0 
                    ? `<span style="background: #f1f5f9; color: #475569; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; margin-left: 8px; border: 1px solid #e2e8f0; font-weight: 800;">In-${b.installmentIndex}</span>` 
                    : '';

                return `
                    <tr>
                        <td style="font-weight: 600; color: #64748b;">${date}</td>
                        <td style="font-weight: 700; color: #1e293b; display: flex; align-items: center;">
                            ${b.treatment_name} ${installmentBadge}
                        </td>
                        <td style="font-weight: 700; color: #1e293b;">₹${b.total_cost.toLocaleString()}</td>
                        <td style="font-weight: 700; color: #16a34a;">₹${b.cumulativePaid.toLocaleString()}</td>
                        <td style="font-weight: 800; color: ${balanceColor};">₹${b.balance_amount.toLocaleString()}</td>
                        <td style="text-align: center;">
                            <div style="display: flex; gap: 8px; justify-content: center;">
                                <button class="btn btn-icon-secondary" title="Edit/Update Payment" onclick="window.router.openEditTransactionModal(${b.id}, ${patientId}, '${patientName.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-icon-secondary" style="color: #ef4444; background: #fee2e2; border-color: #fecaca;" title="Delete Entry" onclick="window.router.deleteBillingEntry(${b.id}, ${patientId}, '${patientName.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            console.error(e);
        }
    }

    async deleteBillingEntry(id, patientId, patientName) {
        this.showConfirmModal('Delete Transaction?', 'Are you sure you want to delete this billing entry? This cannot be undone.', async () => {
            try {
                const res = await api.invoke('db-query', 'deleteBillingEntry', id);
                if (res.success) {
                    this.showToast('Transaction deleted', 'success');
                    this.openPatientBilling(patientId, patientName);
                } else {
                    this.showToast('Failed to delete: ' + res.error, 'error');
                }
            } catch (e) {
                console.error(e);
                this.showToast('Error deleting transaction', 'error');
            }
        });
    }

    openNewTransactionModal(patientId, patientName) {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.style.display = 'flex';
        modalContainer.className = 'modal-backdrop-premium';
        modalContainer.innerHTML = `
            <div class="modal-content-premium fade-in-up" style="max-width: 500px;">
                <div class="modal-header-premium" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; border: none;">
                    <div class="header-title-group">
                        <div class="icon-box-primary" style="background: rgba(255,255,255,0.2); color: white;">
                            <i class="fas fa-file-invoice"></i>
                        </div>
                        <div>
                            <h3 style="color: white;">New Transaction</h3>
                            <p style="color: rgba(255,255,255,0.8);">Record payment for ${patientName}</p>
                        </div>
                    </div>
                    <button class="modal-close-btn" onclick="window.router.closeModal()" style="color: white; background: rgba(255,255,255,0.1);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body-premium" style="padding: 25px;">
                    <div class="premium-form">
                        <div class="form-group">
                            <label style="font-weight: 700; color: #1e293b;">Treatment Name / Description</label>
                            <input type="text" id="bill-treatment-name" class="premium-input" placeholder="e.g., Root Canal, Extraction...">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="form-group">
                                <label style="font-weight: 700; color: #1e293b;">Total Treatment Cost</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-rupee-sign"></i>
                                    <input type="number" id="bill-total-cost" class="premium-input" placeholder="0" 
                                           oninput="window.router.calculateBillingBalance()">
                                </div>
                            </div>
                            <div class="form-group">
                                <label style="font-weight: 700; color: #1e293b;">Amount Paid</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-rupee-sign"></i>
                                    <input type="number" id="bill-paid-amount" class="premium-input" placeholder="0" 
                                           oninput="window.router.calculateBillingBalance()">
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 700; color: #1e293b;">Remaining Balance to Pay</label>
                            <div class="input-with-icon">
                                <i class="fas fa-calculator" style="color: #64748b;"></i>
                                <input type="number" id="bill-balance" class="premium-input" placeholder="0" readonly 
                                       style="background: #f1f5f9; cursor: not-allowed; font-weight: 800; color: #e11d48;">
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 700; color: #1e293b;">Payment Mode</label>
                            <select id="bill-payment-mode" class="premium-input">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI / GPay / PhonePe</option>
                                <option value="Card">Credit / Debit Card</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer-premium" style="padding: 20px 30px;">
                    <button class="btn btn-secondary-outline" onclick="window.router.closeModal()">Cancel</button>
                    <button class="btn btn-primary-premium" onclick="window.router.saveNewTransaction(${patientId}, '${patientName.replace(/'/g, "\\'")}')" style="background: #0d9488;">
                        <i class="fas fa-save"></i> Save Transaction
                    </button>
                </div>
            </div>
        `;
    }
    
    async saveNewTransaction(patientId, patientName) {
        console.log('Saving New Transaction for:', patientId, patientName);
        const treatmentName = document.getElementById('bill-treatment-name').value;
        const totalCost = parseFloat(document.getElementById('bill-total-cost').value) || 0;
        const paidAmount = parseFloat(document.getElementById('bill-paid-amount').value) || 0;
        const balanceAmount = parseFloat(document.getElementById('bill-balance').value) || 0;
        const paymentMode = document.getElementById('bill-payment-mode').value;

        const data = {
            patient_id: patientId,
            treatment_name: treatmentName,
            total_cost: totalCost,
            paid_amount: paidAmount,
            balance_amount: balanceAmount,
            payment_mode: paymentMode
        };
        console.log('Transaction Data:', data);

        if (!treatmentName) return this.showToast('Please enter treatment name', 'warning');
        if (totalCost <= 0) return this.showToast('Please enter total cost', 'warning');

        try {
            const res = await api.invoke('db-query', 'saveBilling', data);
            console.log('Save Result:', res);

            if (res.success) {
                this.showToast('Transaction saved successfully', 'success');
                this.closeModal();
                this.openPatientBilling(patientId, patientName);
            } else {
                this.showToast('Failed to save: ' + res.error, 'error');
            }
        } catch (e) {
            console.error('Save Error:', e);
            this.showToast('Error saving transaction', 'error');
        }
    }

    calculateBillingBalance() {
        const total = parseFloat(document.getElementById('bill-total-cost').value) || 0;
        const paid = parseFloat(document.getElementById('bill-paid-amount').value) || 0;
        const balance = total - paid;
        const balanceEl = document.getElementById('bill-balance');
        if (balanceEl) {
            balanceEl.value = balance;
            balanceEl.style.color = balance > 0 ? '#e11d48' : '#16a34a';
        }
    }

    async openEditTransactionModal(billId, patientId, patientName) {
        try {
            // Fetch the current billing summary to get the MOST RECENT total_cost and the TOTAL paid so far
            const summaryRes = await api.invoke('db-query', 'getBillingSummary', patientId);
            const summary = summaryRes.success ? summaryRes.data : { total: 0, paid: 0 };
            
            // Also fetch the specific treatment name from the record we clicked
            const historyRes = await api.invoke('db-query', 'getBillingHistory', patientId);
            const currentBill = historyRes.success ? historyRes.data.find(b => b.id === billId) : null;
            
            if (!currentBill) return this.showToast('Transaction details not found', 'error');

            const modalContainer = document.getElementById('modal-container');
            modalContainer.style.display = 'flex';
            modalContainer.className = 'modal-backdrop-premium';
            modalContainer.innerHTML = `
                <div class="modal-content-premium fade-in-up" style="max-width: 500px;">
                    <div class="modal-header-premium" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none;">
                        <div class="header-title-group">
                            <div class="icon-box-primary" style="background: rgba(255,255,255,0.2); color: white;">
                                <i class="fas fa-edit"></i>
                            </div>
                            <div>
                                <h3 style="color: white;">Add Payment</h3>
                                <p style="color: rgba(255,255,255,0.8);">Record new payment for ${currentBill.treatment_name}</p>
                            </div>
                        </div>
                        <button class="modal-close-btn" onclick="window.router.closeModal()" style="color: white; background: rgba(255,255,255,0.1);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-premium" style="padding: 25px;">
                        <div class="premium-form">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div class="info-stat">
                                    <label style="display: block; font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Total Billed</label>
                                    <div style="font-size: 1.1rem; font-weight: 800; color: #1e293b;">₹${summary.total.toLocaleString()}</div>
                                </div>
                                <div class="info-stat">
                                    <label style="display: block; font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Total Paid So Far</label>
                                    <div style="font-size: 1.1rem; font-weight: 800; color: #16a34a;">₹${summary.paid.toLocaleString()}</div>
                                </div>
                            </div>

                            <input type="hidden" id="edit-bill-total-cost" value="${summary.total}">
                            <input type="hidden" id="edit-bill-existing-paid" value="${summary.paid}">
                            <input type="hidden" id="edit-bill-treatment-name" value="${currentBill.treatment_name}">

                            <div class="form-group">
                                <label style="font-weight: 700; color: #1e293b;">Additional Payment Amount</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-plus-circle" style="color: #f59e0b;"></i>
                                    <input type="number" id="edit-bill-new-payment" class="premium-input" placeholder="0" 
                                           oninput="window.router.calculateEditBalance()">
                                </div>
                            </div>

                            <div class="form-group">
                                <label style="font-weight: 700; color: #1e293b;">New Remaining Balance</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-calculator" style="color: #64748b;"></i>
                                    <input type="number" id="edit-bill-balance-preview" class="premium-input" value="${summary.total - summary.paid}" readonly 
                                           style="background: #f1f5f9; cursor: not-allowed; font-weight: 800; color: #e11d48;">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer-premium" style="padding: 20px 30px;">
                        <button class="btn btn-secondary-outline" onclick="window.router.closeModal()">Cancel</button>
                        <button class="btn btn-primary-premium" onclick="window.router.updateTransaction(${billId}, ${patientId}, '${patientName.replace(/'/g, "\\'")}')" style="background: #f59e0b;">
                            <i class="fas fa-save"></i> Save Payment
                        </button>
                    </div>
                </div>
            `;
        } catch (e) {
            console.error(e);
            this.showToast('Error loading payment details', 'error');
        }
    }

    calculateEditBalance() {
        const total = parseFloat(document.getElementById('edit-bill-total-cost').value) || 0;
        const existing = parseFloat(document.getElementById('edit-bill-existing-paid').value) || 0;
        const additional = parseFloat(document.getElementById('edit-bill-new-payment').value) || 0;
        
        const newBalance = total - (existing + additional);
        const balanceEl = document.getElementById('edit-bill-balance-preview');
        if (balanceEl) {
            balanceEl.value = newBalance;
            balanceEl.style.color = newBalance > 0 ? '#e11d48' : '#16a34a';
        }
    }

    async openDeletedBillingHistory(patientId, patientName) {
        try {
            const res = await api.invoke('db-query', 'getDeletedBillingHistory', patientId);
            const deletedLogs = res.success ? res.data : [];
            
            const content = `
                <div style="padding: 10px;">
                    <div style="background: #fff1f2; border: 1px solid #fecaca; padding: 15px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                        <div style="width: 45px; height: 45px; background: #ffe4e6; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #e11d48; font-size: 1.2rem;">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div>
                            <h4 style="color: #9f1239; margin: 0; font-weight: 800;">Billing Audit Log</h4>
                            <p style="color: #be123c; margin: 5px 0 0; font-size: 0.85rem;">Reviewing deleted payments for ${patientName}. This log is permanent and cannot be altered.</p>
                        </div>
                    </div>
                    
                    <div class="table-container-premium" style="max-height: 400px; overflow-y: auto;">
                        <table class="premium-table">
                            <thead style="position: sticky; top: 0; z-index: 10;">
                                <tr>
                                    <th>Created On</th>
                                    <th>Deleted On</th>
                                    <th>Treatment</th>
                                    <th>Amount Paid</th>
                                    <th>Mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${deletedLogs.length > 0 ? deletedLogs.map(log => `
                                    <tr>
                                        <td>${new Date(log.created_at).toLocaleDateString()}</td>
                                        <td style="color: #e11d48; font-weight: 700; font-size: 0.8rem;">${new Date(log.deleted_at).toLocaleString()}</td>
                                        <td style="font-weight: 800;">${log.treatment_name}</td>
                                        <td style="color: #1e293b; font-weight: 700;">₹${log.paid_amount.toLocaleString()}</td>
                                        <td><span class="status-badge" style="background: #f1f5f9; color: #475569; font-size: 0.7rem;">${log.payment_mode || 'Cash'}</span></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">No deleted records found.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            this.openModal('Deleted Billing History', content);
        } catch (e) {
            console.error(e);
            this.showToast('Error loading audit log', 'error');
        }
    }

    async updateTransaction(billId, patientId, patientName) {
        console.log('Updating Transaction for:', patientId, 'Bill:', billId);
        const originalTreatmentName = document.getElementById('edit-bill-treatment-name').value;
        const totalCost = parseFloat(document.getElementById('edit-bill-total-cost').value) || 0;
        const additionalPaid = parseFloat(document.getElementById('edit-bill-new-payment').value) || 0;
        const newBalance = parseFloat(document.getElementById('edit-bill-balance-preview').value) || 0;

        if (additionalPaid <= 0) return this.showToast('Please enter a payment amount', 'warning');

        const cleanName = originalTreatmentName.replace(/^(Payment:\s*)+/i, '');
        
        const data = {
            patient_id: patientId,
            treatment_name: cleanName,
            total_cost: totalCost,
            paid_amount: additionalPaid,
            balance_amount: newBalance,
            payment_mode: 'Cash',
            transaction_details: `Installment for ${cleanName}`
        };
        console.log('Update Transaction Data:', data);

        try {
            const res = await api.invoke('db-query', 'saveBilling', data);
            console.log('Update Result:', res);

            if (res.success) {
                this.showToast('Payment recorded successfully', 'success');
                this.closeModal();
                this.openPatientBilling(patientId, patientName);
            } else {
                this.showToast('Failed to record payment: ' + res.error, 'error');
            }
        } catch (e) {
            console.error('Update Error:', e);
            this.showToast('Error saving payment', 'error');
        }
    }

    // ==========================================
    // 2. MASTER APPOINTMENT SCHEDULE
    // ==========================================
    async renderCalendar() {
        document.getElementById('view-title').innerText = 'Appointments';
        document.getElementById('view-subtitle').innerText = 'Manage patient visits and schedule';

        if (!this.calendarViewDate) this.calendarViewDate = new Date();
        const year = this.calendarViewDate.getFullYear();
        const month = this.calendarViewDate.getMonth();

        document.getElementById('main-content').innerHTML = `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                <button class="btn btn-primary-premium" id="btn-schedule-appointment-main" onclick="window.router.openMainScheduleModal()" style="padding: 12px 25px; border-radius: 14px; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);">
                    <i class="fas fa-plus-circle"></i> Schedule Appointment
                </button>
            </div>
            <div class="calendar-master-view fade-in" style="display: grid; grid-template-columns: 1fr 350px; gap: 25px; height: calc(100vh - 240px);">
                <!-- Left: Large Appointment Grid -->
                <div class="premium-card" style="padding: 25px; display: flex; flex-direction: column; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <i class="fas fa-calendar-alt" style="color: #6366f1; font-size: 1.2rem;"></i>
                            <div style="display: flex; gap: 5px;">
                                <span id="master-calendar-month-btn" onclick="window.router.showMasterMonthSelector()" style="font-weight: 800; color: #1e293b; font-size: 1.1rem; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.2s; background: #f8fafc;">
                                    ${new Date(year, month).toLocaleString('default', { month: 'long' })}
                                </span>
                                <span id="master-calendar-year-btn" onclick="window.router.showMasterYearSelector()" style="font-weight: 800; color: #1e293b; font-size: 1.1rem; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.2s; background: #f8fafc;">
                                    ${year}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-icon-secondary" onclick="window.router.changeMasterCalendar(-1)"><i class="fas fa-chevron-left"></i></button>
                            <button class="btn btn-icon-secondary" onclick="window.router.changeMasterCalendar(1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>

                    <!-- Master Month Selector -->
                    <div id="master-month-selector" style="display: none; position: absolute; top: 80px; left: 25px; right: 25px; background: white; z-index: 100; padding: 20px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => `
                            <div onclick="window.router.jumpToMasterMonth(${i})" style="padding: 15px; text-align: center; background: #f8fafc; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer;">${m}</div>
                        `).join('')}
                    </div>

                    <!-- Master Year Selector -->
                    <div id="master-year-selector" style="display: none; position: absolute; top: 80px; left: 25px; right: 25px; background: white; z-index: 100; padding: 20px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; grid-template-columns: repeat(4, 1fr); gap: 10px; max-height: 300px; overflow-y: auto;">
                        ${Array.from({length: 2081 - 2020}).map((_, i) => {
                            const y = 2020 + i;
                            return `<div onclick="window.router.jumpToMasterYear(${y})" style="padding: 12px; text-align: center; background: #f8fafc; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer;">${y}</div>`;
                        }).join('')}
                    </div>
                    
                    <div id="master-calendar-main-view" style="display: block;">
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: 800; font-size: 0.75rem; color: #94a3b8; margin-bottom: 15px;">
                            <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                        </div>
                        <div id="master-calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;">
                            <!-- JS injected grid -->
                        </div>
                    </div>
                </div>

                <!-- Right: Daily Detail Panel -->
                <div class="premium-card" style="padding: 25px;">
                    <div id="calendar-day-details">
                        <div style="text-align: center; padding: 50px 20px; color: #94a3b8;">
                            <i class="fas fa-mouse-pointer fa-2x" style="margin-bottom: 15px; opacity: 0.5;"></i>
                            <p style="font-size: 0.9rem; font-weight: 600;">Click a date to view<br>scheduled patients</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.renderMasterCalendarGrid();
    }

    async renderMasterCalendarGrid() {
        const grid = document.getElementById('master-calendar-grid');
        if (!grid) return;

        const date = this.calendarViewDate;
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        // Fetch counts for heatmap heatmap
        // Fetch counts for heatmap
        const res = await api.invoke('db-query', 'getMonthlyAppointmentCounts', year, month + 1); // SQL uses 1-12
        const countsMap = res.success ? res.data : {};

        grid.innerHTML = '';
        for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div style="background: #f8fafc; border-radius: 12px; opacity: 0.3;"></div>`;
        
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            const count = countsMap[d] || 0;
            
            let heatmapStyle = 'background: white;';
            let countLabelColor = '#94a3b8';
            if (count > 0) {
                if (count <= 15) {
                    heatmapStyle = 'background: #f0fdf4; border-color: #86efac;'; // Green
                    countLabelColor = '#16a34a';
                } else if (count <= 25) {
                    heatmapStyle = 'background: #fff7ed; border-color: #fdba74;'; // Orange
                    countLabelColor = '#ea580c';
                } else {
                    heatmapStyle = 'background: #fef2f2; border-color: #fca5a5;'; // Red
                    countLabelColor = '#dc2626';
                }
            }

            grid.innerHTML += `
                <div class="master-calendar-day" onclick="window.router.viewDayDetails(${year}, ${month}, ${d})" 
                     style="${heatmapStyle} border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; cursor: pointer; transition: all 0.2s; 
                            ${isToday ? 'border-color: #6366f1; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center; pointer-events: none;">
                        <span style="font-weight: 800; font-size: 1rem; color: ${isToday ? '#6366f1' : '#1e293b'}; pointer-events: none;">${d}</span>
                        ${count > 0 ? `<span style="font-size: 0.7rem; font-weight: 700; color: ${countLabelColor}; pointer-events: none;">${count}</span>` : ''}
                    </div>
                </div>
            `;
        }
    }

    changeMasterCalendar(offset) {
        if (!this.calendarViewDate) this.calendarViewDate = new Date();
        this.calendarViewDate.setMonth(this.calendarViewDate.getMonth() + offset);
        this.renderCalendar();
    }

    showMasterMonthSelector() {
        document.getElementById('master-calendar-main-view').style.display = 'none';
        document.getElementById('master-year-selector').style.display = 'none';
        document.getElementById('master-month-selector').style.display = 'grid';
    }

    showMasterYearSelector() {
        document.getElementById('master-calendar-main-view').style.display = 'none';
        document.getElementById('master-month-selector').style.display = 'none';
        document.getElementById('master-year-selector').style.display = 'grid';
    }

    jumpToMasterMonth(m) {
        this.calendarViewDate.setMonth(m);
        this.renderCalendar();
    }

    jumpToMasterYear(y) {
        this.calendarViewDate.setFullYear(y);
        this.renderCalendar();
    }

    async viewDayDetails(y, m, d) {
        const fullDate = `${y}-${String(m+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const res = await api.invoke('db-query', 'getAppointments', fullDate);
        const apps = res.success ? res.data : [];

        const detailArea = document.getElementById('calendar-day-details');
        detailArea.innerHTML = `
            <h4 style="font-weight: 800; color: #1e293b; margin-bottom: 20px; font-size: 1rem;">
                Schedule: ${d} ${new Date(y, m).toLocaleString('default', { month: 'long' })}
            </h4>
            <div style="display: grid; gap: 12px;">
                ${apps.length > 0 ? apps.map(a => `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 15px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: #e0f2fe; color: #0369a1; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
                            ${a.patient_name.charAt(0)}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">${a.patient_name}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">${new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                `).join('') : '<p style="color: #94a3b8; font-size: 0.9rem; text-align: center; padding: 20px;">No appointments</p>'}
            </div>
        `;
    }

    // ==========================================
    // 3. CLINIC SETTINGS
    // ==========================================
    renderSettings() {
        document.getElementById('view-title').innerText = 'System Settings';
        document.getElementById('view-subtitle').innerText = 'Configure practice parameters';

        document.getElementById('main-content').innerHTML = `
            <div class="settings-view fade-in" style="max-width: 800px; margin: 0 auto;">
                <div class="premium-card" style="padding: 35px; border-radius: 25px;">
                    <div style="margin-bottom: 35px; padding-bottom: 25px; border-bottom: 1px solid #f1f5f9;">
                        <h4 style="font-weight: 800; color: #1e293b; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-hospital" style="color: #6366f1;"></i> Clinic Information
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="form-group">
                                <label style="font-weight: 700; font-size: 0.8rem; color: #64748b;">Clinic Name</label>
                                <input type="text" class="premium-input" value="DentRecords Dental Care" style="background: #f8fafc; border-color: #e2e8f0;">
                            </div>
                            <div class="form-group">
                                <label style="font-weight: 700; font-size: 0.8rem; color: #64748b;">Contact Primary</label>
                                <input type="text" class="premium-input" value="+91 98765 43210" style="background: #f8fafc; border-color: #e2e8f0;">
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 35px; padding-bottom: 25px; border-bottom: 1px solid #f1f5f9;">
                        <h4 style="font-weight: 800; color: #1e293b; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-database" style="color: #f59e0b;"></i> Data Management
                        </h4>
                        <div style="display: flex; gap: 15px;">
                            <button class="btn btn-secondary-outline" style="padding: 12px 20px; border-radius: 12px; font-weight: 700;">
                                <i class="fas fa-download"></i> Export Database
                            </button>
                            <button class="btn btn-danger-outline" style="padding: 12px 20px; border-radius: 12px; font-weight: 700; border-color: #fee2e2; color: #ef4444;" onclick="window.router.clearLogs()">
                                <i class="fas fa-trash-alt"></i> Purge All Logs
                            </button>
                        </div>
                    </div>

                    <div style="text-align: center; color: #94a3b8; font-size: 0.8rem;">
                        <p>DentRecords Clinical Hub v1.0.4</p>
                        <p style="margin-top: 5px;">Powered by DentRecords Engine & Electron</p>
                    </div>
                </div>
            </div>
        `;
    }

    async clearLogs() {
        this.showConfirmModal('Purge All Logs?', 'This will permanently delete all clinical logs and history while keeping patient profiles. Continue?', async () => {
            await api.invoke('db-query', 'clearTreatmentLogs');
            this.showToast('Clinical logs cleared successfully', 'success');
        });
    }

    openMainScheduleModal() {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.style.display = 'flex';
        modalContainer.className = 'modal-backdrop-premium';
        modalContainer.innerHTML = `
            <div class="modal-content-premium fade-in-up" style="max-width: 500px;">
                <div class="modal-header-premium" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none;">
                    <div class="header-title-group">
                        <div class="icon-box-primary" style="background: rgba(255,255,255,0.2); color: white;">
                            <i class="fas fa-calendar-plus"></i>
                        </div>
                        <div>
                            <h3 style="color: white;">Schedule New Appointment</h3>
                            <p style="color: rgba(255,255,255,0.8);">Select patient and set appointment details</p>
                        </div>
                    </div>
                    <button class="modal-close-btn" onclick="window.router.closeModal()" style="color: white; background: rgba(255,255,255,0.1);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body-premium" style="padding: 25px;">
                    <div class="premium-form">
                        <!-- Patient Search -->
                        <div class="form-group" style="position: relative;">
                            <label style="font-weight: 700; color: #1e293b;">Select Patient</label>
                            <div class="input-with-icon">
                                <i class="fas fa-search"></i>
                                <input type="text" id="schedule-patient-search" placeholder="Search by name or phone..." class="premium-input" 
                                       oninput="window.router.searchPatientsForSchedule(this.value)" 
                                       onfocus="window.router.searchPatientsForSchedule(this.value)"
                                       autocomplete="off">
                            </div>
                            <div id="schedule-patient-results" style="display: none; position: absolute; width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 5px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 1000; max-height: 200px; overflow-y: auto;">
                                <!-- Results injected here -->
                            </div>
                            <input type="hidden" id="schedule-selected-patient-id">
                            <div id="selected-patient-display" style="display: none; margin-top: 10px; background: #f0f9ff; padding: 10px 15px; border-radius: 10px; border: 1px solid #bae6fd; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-user-check" style="color: #0ea5e9;"></i>
                                    <span id="selected-patient-name" style="font-weight: 700; color: #0369a1;"></span>
                                </div>
                                <i class="fas fa-times-circle" onclick="window.router.clearSelectedPatientForSchedule()" style="color: #94a3b8; cursor: pointer;"></i>
                            </div>
                        </div>

                        <!-- Date Selection -->
                        <div class="form-group" style="position: relative;">
                            <label style="font-weight: 700; color: #1e293b;">Appointment Date</label>
                            <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 5px 15px; display: flex; justify-content: space-between; align-items: center;">
                                <input type="text" id="display-schedule-date-text" placeholder="DD-MM-YYYY" 
                                       oninput="window.router.handleDateInput(this, 'schedule-app-date', 'main-app')"
                                       style="background: transparent; border: none; font-weight: 700; color: #1e293b; font-size: 0.95rem; width: 100%; outline: none;">
                                <i class="fas fa-calendar-alt" onclick="window.router.toggleMainScheduleCalendar()" style="color: #6366f1; padding: 5px; cursor: pointer;"></i>
                            </div>
                            
                            <!-- Custom Calendar -->
                            <div id="main-schedule-calendar-container" style="display: none; background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 15px; margin-top: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: absolute; width: 100%; z-index: 100;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                                    <button type="button" onclick="event.stopPropagation(); window.router.changeMainScheduleCalendarMonth(-1)" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 10px; color: #64748b; cursor: pointer;"><i class="fas fa-chevron-left"></i></button>
                                    <div style="display: flex; gap: 5px;">
                                        <span id="main-schedule-calendar-month-btn" onclick="event.stopPropagation(); window.router.showMainScheduleMonthSelector()" style="font-weight: 800; color: #1e293b; font-size: 0.85rem; cursor: pointer; padding: 4px; border-radius: 6px;"></span>
                                        <span id="main-schedule-calendar-year-btn" onclick="event.stopPropagation(); window.router.showMainScheduleYearSelector()" style="font-weight: 800; color: #1e293b; font-size: 0.85rem; cursor: pointer; padding: 4px; border-radius: 6px;"></span>
                                    </div>
                                    <button type="button" onclick="event.stopPropagation(); window.router.changeMainScheduleCalendarMonth(1)" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 10px; color: #64748b; cursor: pointer;"><i class="fas fa-chevron-right"></i></button>
                                </div>
                                
                                <div id="main-schedule-calendar-main-view">
                                    <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 8px;">
                                        ${['S','M','T','W','T','F','S'].map(d => `<span style="font-size: 0.6rem; font-weight: 800; color: #94a3b8;">${d}</span>`).join('')}
                                    </div>
                                    <div id="main-schedule-calendar-days-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;"></div>
                                </div>

                                <div id="main-schedule-month-selector" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                                    ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => `
                                        <div onclick="event.stopPropagation(); window.router.jumpToMainScheduleMonth(${i})" style="padding: 8px; text-align: center; background: #f8fafc; border-radius: 8px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">${m}</div>
                                    `).join('')}
                                </div>

                                <div id="main-schedule-year-selector" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 150px; overflow-y: auto;">
                                    ${Array.from({length: 2081 - 2020}).map((_, i) => {
                                        const y = 2020 + i;
                                        return `<div onclick="event.stopPropagation(); window.router.jumpToMainScheduleYear(${y})" style="padding: 8px; text-align: center; background: #f8fafc; border-radius: 8px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">${y}</div>`;
                                    }).join('')}
                                </div>
                            </div>
                            <input type="hidden" id="schedule-app-date">
                        </div>

                        <!-- Treatment Plan -->
                        <div class="form-group">
                            <label style="font-weight: 700; color: #1e293b;">Treatment Notes / Plan</label>
                            <textarea id="schedule-treatment-plan" class="premium-input" rows="3" placeholder="Describe the planned procedure..."></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer-premium" style="padding: 20px 30px;">
                    <button class="btn btn-secondary-outline" onclick="window.router.closeModal()">Discard</button>
                    <button class="btn btn-primary-premium" onclick="window.router.saveMainSchedule()" style="background: #4f46e5;">
                        <i class="fas fa-check"></i> Confirm Schedule
                    </button>
                </div>
            </div>
        `;

        this.mainScheduleViewDate = new Date();
        this.renderMainScheduleCalendar();
    }

    async searchPatientsForSchedule(query) {
        const resultsDiv = document.getElementById('schedule-patient-results');
        
        try {
            // If query is empty, get all patients (limited to 50 for performance)
            const res = await api.invoke('db-query', query ? 'getPatients' : 'getAllPatients', query);
            const patients = res.success ? res.data : [];
            
            if (patients.length === 0) {
                resultsDiv.innerHTML = '<div style="padding: 10px; color: #94a3b8; font-size: 0.85rem; text-align: center;">No patients found</div>';
            } else {
                resultsDiv.innerHTML = patients.map(p => `
                    <div onclick="window.router.selectPatientForSchedule(${p.id}, '${p.full_name}')" 
                         style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">
                        <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">${p.full_name}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">${p.contact_primary} | DL-${p.id}</div>
                    </div>
                `).join('');
                
                // Highlight on hover
                resultsDiv.querySelectorAll('div').forEach(el => {
                    el.onmouseover = () => el.style.background = '#f8fafc';
                    el.onmouseout = () => el.style.background = 'transparent';
                });
            }
            resultsDiv.style.display = 'block';
        } catch (e) {
            console.error(e);
        }
    }

    selectPatientForSchedule(id, name) {
        document.getElementById('schedule-selected-patient-id').value = id;
        document.getElementById('selected-patient-name').innerText = name;
        document.getElementById('selected-patient-display').style.display = 'flex';
        document.getElementById('schedule-patient-results').style.display = 'none';
        document.getElementById('schedule-patient-search').value = '';
    }

    clearSelectedPatientForSchedule() {
        document.getElementById('schedule-selected-patient-id').value = '';
        document.getElementById('selected-patient-display').style.display = 'none';
    }

    renderMainScheduleCalendar() {
        const grid = document.getElementById('main-schedule-calendar-days-grid');
        const monthBtn = document.getElementById('main-schedule-calendar-month-btn');
        const yearBtn = document.getElementById('main-schedule-calendar-year-btn');
        if (!grid || !monthBtn || !yearBtn) return;

        const date = this.mainScheduleViewDate;
        const year = date.getFullYear();
        const month = date.getMonth();

        monthBtn.innerText = new Date(year, month).toLocaleString('default', { month: 'short' });
        yearBtn.innerText = year;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        grid.innerHTML = '';
        for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            grid.innerHTML += `
                <div class="calendar-day" onclick="event.stopPropagation(); window.router.selectMainScheduleDate(this, '${fullDate}')" 
                     style="height: 30px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; border-radius: 8px; cursor: pointer;
                            ${isToday ? 'color: #6366f1; border: 1px solid #e0e7ff;' : ''}">
                    ${d}
                </div>`;
        }
    }

    toggleMainScheduleCalendar(force) {
        const container = document.getElementById('main-schedule-calendar-container');
        if (!container) return;
        const isHidden = container.style.display === 'none';
        container.style.display = (force !== undefined ? force : isHidden) ? 'block' : 'none';
    }

    showMainScheduleMonthSelector() {
        document.getElementById('main-schedule-calendar-main-view').style.display = 'none';
        document.getElementById('main-schedule-year-selector').style.display = 'none';
        document.getElementById('main-schedule-month-selector').style.display = 'grid';
    }

    showMainScheduleYearSelector() {
        document.getElementById('main-schedule-calendar-main-view').style.display = 'none';
        document.getElementById('main-schedule-month-selector').style.display = 'none';
        document.getElementById('main-schedule-year-selector').style.display = 'grid';
    }

    jumpToMainScheduleMonth(m) {
        this.mainScheduleViewDate.setMonth(m);
        this.resetMainScheduleCalendarView();
    }

    jumpToMainScheduleYear(y) {
        this.mainScheduleViewDate.setFullYear(y);
        this.resetMainScheduleCalendarView();
    }

    resetMainScheduleCalendarView() {
        document.getElementById('main-schedule-month-selector').style.display = 'none';
        document.getElementById('main-schedule-year-selector').style.display = 'none';
        document.getElementById('main-schedule-calendar-main-view').style.display = 'block';
        this.renderMainScheduleCalendar();
    }

    changeMainScheduleCalendarMonth(offset) {
        this.mainScheduleViewDate.setMonth(this.mainScheduleViewDate.getMonth() + offset);
        this.renderMainScheduleCalendar();
    }

    selectMainScheduleDate(el, date) {
        document.querySelectorAll('#main-schedule-calendar-days-grid .calendar-day').forEach(p => p.style.background = 'none');
        el.style.background = '#6366f1';
        el.style.color = 'white';
        
        const [year, month, day] = date.split('-');
        document.getElementById('display-schedule-date-text').value = `${day}-${month}-${year}`;
        document.getElementById('schedule-app-date').value = date;

        this.toggleMainScheduleCalendar(false);
    }

    async saveMainSchedule() {
        const patientId = document.getElementById('schedule-selected-patient-id').value;
        const date = document.getElementById('schedule-app-date').value;
        const notes = document.getElementById('schedule-treatment-plan').value;

        if (!patientId) return this.showToast('Please select a patient', 'warning');
        if (!date) return this.showToast('Please select a date', 'warning');

        // Set a default time (e.g., 09:00:00) as we're not using a time picker here for simplicity
        const fullDateTime = `${date}T09:00:00`;

        try {
            const res = await api.invoke('db-query', 'saveAppointment', { 
                patient_id: patientId, 
                appointment_date: fullDateTime, 
                notes: notes 
            });
            
            if (res.success) {
                this.showToast('Appointment scheduled successfully!', 'success');
                this.closeModal();
                if (this.currentView === 'calendar') this.renderCalendar();
                else if (this.currentView === 'dashboard') this.renderDashboard();
            } else {
                this.showToast('Failed to schedule: ' + (res.error || 'Unknown error'), 'error');
            }
        } catch (e) {
            console.error(e);
            this.showToast('Error scheduling appointment', 'error');
        }
    }

    async renderSettings() {
        document.getElementById('view-title').innerText = 'Settings';
        document.getElementById('view-subtitle').innerText = 'Application Configuration & Backup';

        const mainContent = document.getElementById('main-content');
        
        try {
            const settingsRes = await api.invoke('db-query', 'getClinicSettings');
            const s = settingsRes.success ? settingsRes.data : {};

            mainContent.innerHTML = `
                <div class="settings-view fade-in">
                    <!-- Top Section: Clinic Profile -->
                    <div class="premium-card" style="margin-bottom: 30px;">
                        <div class="card-header-premium" style="background: white; border-bottom: 1px solid #f1f5f9; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="color: #1e293b; font-weight: 800; font-size: 1.1rem; margin: 0;">
                                <i class="fas fa-hospital-user" style="color: #0d9488; margin-right: 10px;"></i>
                                Clinic Profile
                            </h3>
                            <button class="btn btn-primary-premium" onclick="window.router.saveClinicProfile()" style="background: #0d9488; padding: 8px 20px;">
                                <i class="fas fa-save"></i> Save Profile
                            </button>
                        </div>
                        <div style="padding: 25px;">
                            <div class="premium-form" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                                <div class="form-group">
                                    <label style="font-weight: 700; color: #1e293b;">Clinic Name</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-clinic-medical"></i>
                                        <input type="text" id="setting-clinic-name" class="premium-input" placeholder="e.g. DentRecords Dental" value="${s.clinic_name || ''}">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label style="font-weight: 700; color: #1e293b;">Doctor Name</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-user-md"></i>
                                        <input type="text" id="setting-doctor-name" class="premium-input" placeholder="e.g. Dr. John Smith" value="${s.doctor_name || ''}">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label style="font-weight: 700; color: #1e293b;">Clinic Contact Number</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-phone-alt"></i>
                                        <input type="text" id="setting-clinic-phone" class="premium-input" placeholder="e.g. +91 9876543210" value="${s.clinic_phone || ''}">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label style="font-weight: 700; color: #1e293b;">WhatsApp Country Code</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-globe"></i>
                                        <input type="text" id="setting-wa-country" class="premium-input" placeholder="91" value="${s.wa_country || '91'}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Section: Backup & App Info -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <!-- Backup & Sync Card -->
                        <div class="premium-card">
                            <div class="card-header-premium" style="background: white; border-bottom: 1px solid #f1f5f9; padding: 20px 25px;">
                                <h3 style="color: #1e293b; font-weight: 800; font-size: 1.1rem; margin: 0;">
                                    <i class="fas fa-cloud-upload-alt" style="color: #3b82f6; margin-right: 10px;"></i>
                                    Backup & Cloud Sync
                                </h3>
                            </div>
                            <div style="padding: 25px;">
                                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">
                                    Securely back up your clinic database to Google Drive to prevent data loss.
                                </p>
                                
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label style="font-weight: 700; color: #1e293b; display: block; margin-bottom: 8px;">Sync Email Address</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="sync-email" class="premium-input" placeholder="your-email@gmail.com" value="${s.sync_email || ''}">
                                    </div>
                                </div>

                                <div class="form-group" style="margin-bottom: 25px;">
                                    <label style="font-weight: 700; color: #1e293b; display: block; margin-bottom: 8px;">Google Drive Sync Folder</label>
                                    <div style="display: flex; gap: 10px;">
                                        <input type="text" id="sync-folder-path" class="premium-input" readonly placeholder="Click Link Folder to select..." value="${s.sync_folder || ''}" style="background: #f8fafc; font-size: 0.75rem;">
                                        <button class="btn btn-secondary-outline" onclick="window.router.linkCloudFolder()" style="white-space: nowrap; padding: 8px 15px;">
                                            Link Folder
                                        </button>
                                    </div>
                                </div>

                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <div style="display: flex; gap: 12px;">
                                        <button class="btn btn-primary-premium" onclick="window.router.syncToCloud()" style="background: #0d9488; flex: 1;">
                                            <i class="fas fa-sync"></i> Sync Now
                                        </button>
                                        <button class="btn btn-secondary-outline" onclick="window.router.restoreFromCloud()" style="flex: 1; border-color: #f59e0b; color: #d97706;">
                                            <i class="fas fa-cloud-download-alt"></i> Restore from Cloud
                                        </button>
                                    </div>
                                    <button class="btn btn-secondary-outline" onclick="window.router.exportLocalBackup()" style="width: 100%;">
                                        <i class="fas fa-download"></i> Manual Local Backup
                                    </button>
                                </div>

                                <div id="sync-status" style="margin-top: 15px; font-size: 0.8rem; color: #94a3b8; font-weight: 600;">
                                    Last synced: ${s.last_sync || 'Never'}
                                </div>
                            </div>
                        </div>

                        <!-- App Info Card -->
                        <div class="premium-card">
                            <div class="card-header-premium" style="background: white; border-bottom: 1px solid #f1f5f9; padding: 20px 25px;">
                                <h3 style="color: #1e293b; font-weight: 800; font-size: 1.1rem; margin: 0;">
                                    <i class="fas fa-info-circle" style="color: #64748b; margin-right: 10px;"></i>
                                    Application Information
                                </h3>
                            </div>
                            <div style="padding: 25px;">
                                <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                                    <span style="color: #64748b; font-weight: 600;">Version</span>
                                    <span style="color: #1e293b; font-weight: 800;">1.2.0-stable</span>
                                </div>
                                <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                                    <span style="color: #64748b; font-weight: 600;">Database Engine</span>
                                    <span style="color: #1e293b; font-weight: 800;">SQLite 3 (Local)</span>
                                </div>
                                <div class="info-row" style="display: flex; justify-content: space-between;">
                                    <span style="color: #64748b; font-weight: 600;">Storage Location</span>
                                    <span style="color: #0d9488; font-weight: 800; font-size: 0.8rem;">Internal App Data</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- App Installation Guide Card -->
                    <div class="premium-card" style="margin-top: 30px;">
                        <div class="card-header-premium" style="background: white; border-bottom: 1px solid #f1f5f9; padding: 20px 25px;">
                            <h3 style="color: #1e293b; font-weight: 800; font-size: 1.1rem; margin: 0;">
                                <i class="fas fa-mobile-alt" style="color: #0d9488; margin-right: 10px;"></i>
                                Install DentRecords as App (Laptop & Mobile)
                            </h3>
                        </div>
                        <div style="padding: 25px;">
                            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">
                                DentRecords is a Progressive Web App (PWA). You can install it on your devices to run it as a dedicated application with offline access.
                            </p>
                            <div class="pwa-instructions-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div style="background: #f8fafc; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                    <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 10px; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-desktop" style="color: #0d9488;"></i> Laptop & Desktop
                                    </h4>
                                    <ol style="margin-left: 20px; padding: 0; color: #64748b; font-size: 0.85rem; line-height: 1.6;">
                                        <li>Open DentRecords in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.</li>
                                        <li>Click the <strong>Install Icon</strong> (<i class="fas fa-download"></i>) in the address bar.</li>
                                        <li>Or, open the browser menu (<i class="fas fa-ellipsis-v"></i>) and select <strong>"Install DentRecords..."</strong>.</li>
                                    </ol>
                                </div>
                                <div style="background: #f8fafc; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                    <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 10px; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-mobile-alt" style="color: #0d9488;"></i> Android & iPhone Mobile
                                    </h4>
                                    <ol style="margin-left: 20px; padding: 0; color: #64748b; font-size: 0.85rem; line-height: 1.6;">
                                        <li>Open the web app URL on your phone's default browser.</li>
                                        <li><strong>Android (Chrome):</strong> Tap the install prompt at the bottom of the screen, or select <strong>Add to Home screen</strong> from the menu.</li>
                                        <li><strong>iOS (Safari):</strong> Tap the <strong>Share</strong> button (<i class="fas fa-share-square"></i>) and choose <strong>"Add to Home Screen"</strong>.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Auto-save all settings on change
            const settingsToAutoSave = [
                { id: 'sync-email', key: 'sync_email', label: 'Sync email' },
                { id: 'setting-clinic-name', key: 'clinic_name', label: 'Clinic name' },
                { id: 'setting-doctor-name', key: 'doctor_name', label: 'Doctor name' },
                { id: 'setting-clinic-phone', key: 'clinic_phone', label: 'Clinic contact' },
                { id: 'setting-wa-country', key: 'wa_country', label: 'WhatsApp code' }
            ];

            settingsToAutoSave.forEach(setting => {
                const el = document.getElementById(setting.id);
                if (el) {
                    el.onchange = async () => {
                        try {
                            await api.invoke('db-query', 'saveClinicSetting', setting.key, el.value);
                            this.showToast(`${setting.label} saved successfully!`, 'success');
                            if (setting.key === 'doctor_name') this.updateSidebarProfile();
                        } catch (err) {
                            console.error(`Auto-save error for ${setting.key}:`, err);
                        }
                    };
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    async saveClinicProfile() {
        const clinicName = document.getElementById('setting-clinic-name').value;
        const doctorName = document.getElementById('setting-doctor-name').value;
        const clinicPhone = document.getElementById('setting-clinic-phone').value;
        const syncEmail = document.getElementById('sync-email').value;
        const waCountry = document.getElementById('setting-wa-country').value;
        const syncFolder = document.getElementById('sync-folder-path').value;

        try {
            await api.invoke('db-query', 'saveClinicSetting', 'clinic_name', clinicName);
            await api.invoke('db-query', 'saveClinicSetting', 'doctor_name', doctorName);
            await api.invoke('db-query', 'saveClinicSetting', 'clinic_phone', clinicPhone);
            await api.invoke('db-query', 'saveClinicSetting', 'sync_email', syncEmail);
            await api.invoke('db-query', 'saveClinicSetting', 'wa_country', waCountry);
            await api.invoke('db-query', 'saveClinicSetting', 'sync_folder', syncFolder);
            
            this.updateSidebarProfile();
            this.showToast('Clinic Profile updated successfully!', 'success');
        } catch (e) {
            console.error(e);
            this.showToast('Error saving profile', 'error');
        }
    }

    async updateSidebarProfile() {
        try {
            const settingsRes = await api.invoke('db-query', 'getClinicSettings');
            const s = settingsRes.success ? settingsRes.data : {};
            
            const drName = s.doctor_name || 'Admin Portal';
            const iconText = s.doctor_name 
                ? s.doctor_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) 
                : 'DR';
            
            const nameEl = document.getElementById('sidebar-dr-name');
            const iconEl = document.getElementById('sidebar-dr-icon');
            const licenseEl = document.getElementById('sidebar-license-name');
            
            if (nameEl) nameEl.innerText = s.doctor_name ? `Dr. ${s.doctor_name}` : 'Admin Portal';
            if (iconEl) iconEl.innerText = iconText;
            if (licenseEl) licenseEl.innerText = s.license_name || 'Unregistered';
        } catch (e) {
            console.error(e);
        }
    }

    async renderAdmin() {
        try {
            const mainContent = document.getElementById('main-content');
            if (!mainContent) {
                console.error('main-content div not found!');
                return;
            }
            
            // Task 4: Duplicate ID prevention (clearing container if it already exists in DOM)
            const oldList = document.getElementById('license-list-container');
            if (oldList) oldList.innerHTML = '';

            mainContent.innerHTML = `
                <div class="fade-in admin-view">
                    <div class="admin-header">
                        <div>
                            <h1 class="admin-title">
                                <i class="fas fa-user-shield"></i>
                                Master Admin Console
                            </h1>
                            <p class="admin-subtitle">Manage cloud licenses and global access control</p>
                        </div>
                    </div>

                    <div class="admin-grid">
                        <!-- Create Card -->
                        <div class="premium-card admin-card-fixed-height">
                            <div class="admin-card-header">
                                <h3>Create New License</h3>
                            </div>
                            <div class="admin-card-body">
                                <div class="admin-form-group">
                                    <label class="admin-label">License Owner Name</label>
                                    <input type="text" id="new-license-name" class="premium-input" placeholder="e.g. Dr. Ramesh Kumar">
                                    <div id="license-name-error" class="admin-input-error hidden">Please enter a license owner name.</div>
                                </div>
                                <button id="create-license-btn" class="btn btn-primary-premium btn-full-width">
                                    <i class="fas fa-key"></i> Generate License Key
                                </button>
                            </div>
                        </div>

                        <!-- List Card -->
                        <div class="premium-card">
                            <div class="admin-card-header">
                                <h3>Active Cloud Licenses</h3>
                            </div>
                            <div class="admin-table-container" id="license-list-container">
                                <div class="admin-loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Syncing with cloud database...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Task 2: Unsafe onclick removal - Event-based listener attachment
            const createBtn = document.getElementById('create-license-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    const nameInput = document.getElementById('new-license-name');
                    const errorMsg = document.getElementById('license-name-error');
                    
                    // Task 3: Input validation before creation
                    if (!nameInput.value.trim()) {
                        errorMsg.classList.remove('hidden');
                        nameInput.classList.add('input-error');
                        return;
                    }
                    
                    errorMsg.classList.add('hidden');
                    nameInput.classList.remove('input-error');
                    this.createLicense();
                });
            }

            this.loadLicenseList();
        } catch (err) {
            console.error('renderAdmin failed:', err);
            const mc = document.getElementById('main-content');
            if (mc) {
                mc.innerHTML = '<p style="color:red;padding:20px;">Render failed: ' + err.message + '</p>';
            }
        }
    }

    async loadLicenseList() {
        const container = document.getElementById('license-list-container');
        
        try {
            const licenses = await api.invoke('list-licenses');
            
            if (!licenses || Object.keys(licenses).length === 0) {
                container.innerHTML = '<div class="admin-empty-state">No active licenses found.</div>';
                return;
            }

            let html = `
                <table class="admin-table">
                    <thead>
                        <tr class="admin-table-tr-head">
                            <th class="admin-table-th">Owner Name</th>
                            <th class="admin-table-th">Serial Key</th>
                            <th class="admin-table-th">Status</th>
                            <th class="admin-table-th">Device Bound</th>
                            <th class="admin-table-th text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const [key, data] of Object.entries(licenses)) {
                html += `
                    <tr class="admin-table-tr">
                        <td class="admin-table-td admin-table-owner">${data.owner_name}</td>
                        <td class="admin-table-td admin-table-key">${key}</td>
                        <td class="admin-table-td">
                            <span class="badge-${data.status === 'active' ? 'active' : 'inactive'}">
                                ${data.status.toUpperCase()}
                            </span>
                        </td>
                        <td class="admin-table-td admin-table-device">${data.deviceId || 'Unbound'}</td>
                        <td class="admin-table-td text-right">
                            <button class="btn-delete-license" data-key="${key}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }

            html += `</tbody></table>`;
            container.innerHTML = html;

            // Attach listeners to delete buttons
            container.querySelectorAll('.btn-delete-license').forEach(btn => {
                btn.addEventListener('click', () => this.deleteLicense(btn.getAttribute('data-key')));
            });

        } catch (error) {
            // Task 7: Proper error state handling
            console.error('License load error:', error);
            container.innerHTML = `
                <div class="admin-error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to sync with cloud database. Please check your internet connection.</p>
                    <button class="btn btn-secondary-outline" onclick="window.router.loadLicenseList()">
                        <i class="fas fa-sync"></i> Retry Sync
                    </button>
                </div>
            `;
        }
    }

    async createLicense() {
        const nameInput = document.getElementById('new-license-name');
        const name = nameInput.value.trim();
        
        // Final sanity check (validation is also done in the caller)
        if (!name) return;

        const result = await api.invoke('create-license', name);
        if (result.success) {
            this.showToast('License Created!', 'success');
            nameInput.value = '';
            this.loadLicenseList();
        } else {
            this.showToast('Failed: ' + (result.error || 'Unknown error'), 'error');
        }
    }

    async deleteLicense(key) {
        if (!confirm('Are you sure you want to permanently revoke this license?')) return;
        const result = await api.invoke('delete-license', key);
        if (result.success) {
            this.showToast('License Revoked!', 'success');
            this.loadLicenseList();
        }
    }

    async linkCloudFolder() {
        const folderPath = await api.invoke('select-folder');
        if (folderPath) {
            const pathInput = document.getElementById('sync-folder-path');
            if (pathInput) pathInput.value = folderPath;
            
            try {
                await api.invoke('db-query', 'saveClinicSetting', 'sync_folder', folderPath);
                this.showToast('Sync folder linked and saved!', 'success');
            } catch (err) {
                console.error('Folder save error:', err);
                this.showToast('Linked, but failed to save setting', 'error');
            }
        }
    }

    async syncToCloud() {
        const isSyncEnabled = localStorage.getItem('dentrecords_drive_sync') === 'true';
        if (!isSyncEnabled) {
            return this.showToast('Please link your Google Drive first (click the badge in the bottom-left sidebar)', 'warning');
        }
        
        this.showToast('Syncing to Google Drive...', 'info');
        
        const result = await api.invoke('sync-to-cloud-drive');
        if (result && result.success) {
            const now = new Date().toLocaleString('en-GB', { 
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            await api.invoke('db-query', 'saveClinicSetting', 'last_sync', now);
            
            const statusEl = document.getElementById('sync-status');
            if (statusEl) statusEl.innerHTML = `Last synced: ${now}`;
            
            this.showToast('Backup synced to Google Drive!', 'success');
        } else {
            console.error('Sync failed:', result ? result.error : 'Unknown error');
            this.showToast('Sync Error: ' + (result ? result.error : 'Unknown error'), 'error');
        }
    }

    async restoreFromCloud() {
        const isSyncEnabled = localStorage.getItem('dentrecords_drive_sync') === 'true';
        if (!isSyncEnabled) {
            return this.showToast('Please link your Google Drive first (click the badge in the bottom-left sidebar)', 'warning');
        }

        this.showConfirmModal('Restore Database?', 'This will overwrite all current local data with records from your Google Drive backup. Are you sure?', async () => {
            this.showToast('Restoring database from Google Drive...', 'info');
            const result = await api.invoke('restore-from-cloud-drive');
            if (result && result.success) {
                this.showToast('Database restored successfully! Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showToast('Restore failed: ' + (result ? result.error : 'Unknown error'), 'error');
            }
        });
    }

    async exportLocalBackup() {
        this.showToast('Preparing local database backup...', 'info');
        try {
            const result = await api.invoke('get-backup-json');
            if (result && result.success) {
                const blob = new Blob([result.data], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `dentrecords_backup_${new Date().toLocaleDateString('en-CA')}.json`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                this.showToast('Backup downloaded successfully!', 'success');
            } else {
                this.showToast('Backup failed: ' + (result ? result.error : 'Unknown error'), 'error');
            }
        } catch (e) {
            console.error('Backup download error:', e);
            this.showToast('Backup download failed', 'error');
        }
    }

    async renderTreatmentLog() {
        document.getElementById('view-title').innerText = 'Daily Treatment Done';
        document.getElementById('view-subtitle').innerText = 'Record patient procedures and book follow-up appointments instantly';

        const mainContent = document.getElementById('main-content');
        this.selectedQuickTxPatient = null;
        
        mainContent.innerHTML = `
            <style>
            .switch-slider {
                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 24px;
            }
            .switch-slider:before {
                position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .3s; border-radius: 50%;
            }
            input:checked + .switch-slider {
                background-color: #0d9488;
            }
            input:checked + .switch-slider:before {
                transform: translateX(20px);
            }
            .tx-search-item {
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                cursor: pointer;
                font-size: 0.9rem;
                color: #334155;
                font-weight: 500;
                transition: background 0.2s;
            }
            .tx-search-item:hover {
                background: #f1f5f9;
            }
            .tx-search-item:last-child {
                border-bottom: none;
            }
            </style>
            
            <div class="billing-detail-view fade-in" style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 30px; align-items: start;">
                <!-- Left Column: Search and Select Patient -->
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="premium-card" style="padding: 25px; overflow: visible;">
                        <h4 style="font-weight: 800; color: #1e293b; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 1.1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                            <i class="fas fa-search" style="color: var(--primary);"></i> 1. Search Patient
                        </h4>
                        <div class="form-group" style="position: relative; margin-bottom: 0;">
                            <label style="font-weight: 700; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 8px;">Enter Name, Phone, or Patient ID</label>
                            <div class="input-with-icon">
                                <i class="fas fa-user" style="color: #94a3b8; left: 15px; position: absolute; top: 12px;"></i>
                                <input type="text" id="quick-tx-search" placeholder="Type to search..." class="premium-input" style="width: 100%; padding-left: 40px;" oninput="window.router.handleQuickTxSearch(this.value)" autocomplete="off">
                            </div>
                            <div id="quick-tx-results" style="position: absolute; width: 100%; top: 78px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 100; max-height: 250px; overflow-y: auto; display: none;"></div>
                        </div>
                    </div>
                    
                    <!-- Selected Patient Information Card -->
                    <div class="premium-card" style="padding: 25px;" id="quick-tx-patient-info-card">
                        <div id="quick-tx-patient-info" style="text-align: center; min-height: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <i class="fas fa-user-circle" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 15px; display: block;"></i>
                            <span style="color: #64748b; font-size: 0.9rem; font-weight: 600;">No patient selected yet.<br><span style="font-weight: 500; font-size: 0.8rem; color: #94a3b8;">Search above to load the record.</span></span>
                        </div>
                    </div>
                    
                    <!-- Past Treatment History Card -->
                    <div class="premium-card" style="padding: 25px; display: none;" id="quick-tx-history-card">
                        <h4 style="font-weight: 800; color: #1e293b; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
                            <i class="fas fa-history" style="color: #f59e0b;"></i> Past Treatment History
                        </h4>
                        <div id="quick-tx-history-list" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
                            <!-- Dynamically populated logs -->
                        </div>
                    </div>
                </div>
                
                <!-- Right Column: Record Treatment & Next Visit -->
                <div class="premium-card" style="padding: 25px; opacity: 0.5; pointer-events: none; transition: opacity 0.3s;" id="quick-tx-form-container">
                    <h4 style="font-weight: 800; color: #1e293b; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 1.1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                        <i class="fas fa-file-medical" style="color: #0ea5e9;"></i> 2. Record Treatment & Appointments
                    </h4>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="font-weight: 700; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 8px;">Treatment / Procedure Done Today <span style="color: #ef4444;">*</span></label>
                        <textarea id="quick-tx-done" class="premium-textarea" placeholder="Describe the treatment done today (e.g. Scaling completed, started RCT on tooth 46, cavity prep completed...)" rows="4" style="width: 100%; border-radius: 10px; padding: 12px; border: 1px solid #cbd5e1; font-family: inherit; font-size: 0.9rem;"></textarea>
                    </div>
                    
                    <div style="border-top: 1px dashed #e2e8f0; margin: 20px 0; padding-top: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <label style="font-weight: 700; font-size: 0.9rem; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-calendar-plus" style="color: #10b981;"></i> Schedule Next Appointment?
                            </label>
                            <label class="switch" style="position: relative; display: inline-block; width: 44px; height: 24px; margin: 0;">
                                <input type="checkbox" id="quick-tx-schedule-toggle" onchange="window.router.toggleQuickTxAppointment(this.checked)" style="opacity: 0; width: 0; height: 0;">
                                <span class="switch-slider"></span>
                            </label>
                        </div>
                        
                        <div id="quick-tx-appointment-inputs" style="display: none; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label style="font-weight: 700; font-size: 0.8rem; color: #475569; display: block; margin-bottom: 6px;">Next Date</label>
                                <input type="date" id="quick-tx-next-date" class="premium-input" style="width: 100%;">
                            </div>
                            <div class="form-group">
                                <label style="font-weight: 700; font-size: 0.8rem; color: #475569; display: block; margin-bottom: 6px;">Next Time</label>
                                <input type="time" id="quick-tx-next-time" class="premium-input" style="width: 100%;">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label style="font-weight: 700; font-size: 0.8rem; color: #475569; display: block; margin-bottom: 6px;">Appointment Notes</label>
                                <input type="text" id="quick-tx-next-notes" placeholder="e.g. RCT Sitting 2 / Crown prep / Ortho check" class="premium-input" style="width: 100%;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 25px;">
                        <button class="btn btn-primary-premium" id="quick-tx-save-btn" onclick="window.router.saveQuickVisitLog()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700;">
                            <i class="fas fa-save"></i> Save Visit Record
                        </button>
                    </div>
                </div>
            </div>
        `;

        try {
            const res = await api.invoke('db-query', 'getAllPatients');
            this.allQuickTxPatients = res.success ? res.data : [];
        } catch (e) {
            console.error(e);
            this.showToast('Failed to fetch patients list', 'error');
        }
    }

    handleQuickTxSearch(query) {
        const resultsEl = document.getElementById('quick-tx-results');
        if (!query.trim()) {
            resultsEl.style.display = 'none';
            return;
        }

        const cleanQ = query.toLowerCase().trim();
        const filtered = this.allQuickTxPatients.filter(p => 
            (p.full_name && p.full_name.toLowerCase().includes(cleanQ)) ||
            (p.contact_primary && p.contact_primary.includes(cleanQ)) ||
            (`DR-${p.id}`.toLowerCase().includes(cleanQ)) ||
            (String(p.id).includes(cleanQ))
        );

        if (filtered.length === 0) {
            resultsEl.innerHTML = `<div style="padding: 15px; text-align: center; color: #64748b; font-size: 0.9rem;">No matching patients found.</div>`;
        } else {
            resultsEl.innerHTML = filtered.map(p => `
                <div class="tx-search-item" onclick="window.router.selectQuickTxPatient(${p.id})">
                    <span style="font-weight: 700; color: var(--primary);">DR-${p.id}</span> - ${p.full_name} 
                    <span style="color: #64748b; font-size: 0.8rem; margin-left: 8px;">(${p.contact_primary || 'No phone'})</span>
                </div>
            `).join('');
        }
        resultsEl.style.display = 'block';
    }

    async selectQuickTxPatient(patientId) {
        const patient = this.allQuickTxPatients.find(p => p.id === patientId);
        if (!patient) return;

        this.selectedQuickTxPatient = patient;
        
        // Hide dropdown
        document.getElementById('quick-tx-results').style.display = 'none';
        document.getElementById('quick-tx-search').value = `DR-${patient.id} - ${patient.full_name}`;

        // Populate patient info card
        const infoEl = document.getElementById('quick-tx-patient-info');
        infoEl.style.alignItems = 'stretch';
        infoEl.style.textAlign = 'left';
        infoEl.innerHTML = `
            <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                <div style="width: 45px; height: 45px; background: rgba(13, 148, 136, 0.1); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700;">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <h5 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #1e293b;">${patient.full_name}</h5>
                    <span style="color: var(--primary); font-size: 0.85rem; font-weight: 700;">Patient ID: DR-${patient.id}</span>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; font-size: 0.9rem; color: #475569;">
                <div><strong>Age:</strong> ${patient.age || 'N/A'} yrs</div>
                <div><strong>Gender:</strong> ${patient.gender || 'N/A'}</div>
                <div style="grid-column: span 2;">
                    <strong>Phone:</strong> <i class="fas fa-phone-alt" style="color: #94a3b8; font-size: 0.8rem; margin: 0 4px;"></i> ${patient.contact_primary || 'No phone'}
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary-outline" onclick="window.router.viewPatientCaseSheet(${patient.id})" style="flex: 1; padding: 8px; font-size: 0.8rem; font-weight: 700;">
                    <i class="fas fa-folder-open"></i> Open Case Sheet
                </button>
            </div>
        `;

        // Fetch and display past treatment history
        try {
            const historyRes = await api.invoke('db-query', 'getTreatmentHistory', patientId);
            const history = historyRes.success ? historyRes.data : [];
            const historyCard = document.getElementById('quick-tx-history-card');
            const historyList = document.getElementById('quick-tx-history-list');
            
            if (history.length === 0) {
                historyList.innerHTML = `<div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 0.85rem;">No past treatment logs found for this patient.</div>`;
            } else {
                historyList.innerHTML = history.map(h => {
                    const dateStr = h.created_at ? new Date(h.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';
                    return `
                        <div style="background: #f8fafc; border-left: 4px solid var(--primary); padding: 12px 15px; border-radius: 0 10px 10px 0; border: 1px solid #e2e8f0; border-left-width: 4px;">
                            <div style="font-size: 0.75rem; font-weight: 800; color: #64748b; margin-bottom: 6px; display: flex; justify-content: space-between;">
                                <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
                            </div>
                            <div style="font-size: 0.85rem; color: #334155; line-height: 1.4; white-space: pre-wrap; font-weight: 500;">${h.procedure_logs || 'No notes entered.'}</div>
                        </div>
                    `;
                }).join('');
            }
            historyCard.style.display = 'block';
        } catch (e) {
            console.error("Failed to load treatment history:", e);
        }

        // Enable form container
        const form = document.getElementById('quick-tx-form-container');
        form.style.opacity = '1';
        form.style.pointerEvents = 'auto';
    }

    async viewPatientCaseSheet(patientId) {
        this.currentPatientId = patientId;
        await this.navigate('patients');
        this.showPatientHistoryDetail(patientId);
    }

    toggleQuickTxAppointment(checked) {
        const inputsEl = document.getElementById('quick-tx-appointment-inputs');
        inputsEl.style.display = checked ? 'grid' : 'none';
        if (checked) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('quick-tx-next-date').value = tomorrow.toLocaleDateString('en-CA');
            document.getElementById('quick-tx-next-time').value = '10:00';
        }
    }

    async saveQuickVisitLog() {
        if (!this.selectedQuickTxPatient) {
            this.showToast('Please search and select a patient first!', 'error');
            return;
        }

        const procedure = document.getElementById('quick-tx-done').value.trim();
        if (!procedure) {
            this.showToast('Please describe the treatment done today!', 'warning');
            document.getElementById('quick-tx-done').focus();
            return;
        }

        const btn = document.getElementById('quick-tx-save-btn');
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Saving...`;

        try {
            await api.invoke('db-query', 'saveTreatmentDone', {
                patient_id: this.selectedQuickTxPatient.id,
                procedure_logs: procedure
            });

            const scheduleChecked = document.getElementById('quick-tx-schedule-toggle').checked;
            if (scheduleChecked) {
                const nextDate = document.getElementById('quick-tx-next-date').value;
                const nextTime = document.getElementById('quick-tx-next-time').value;
                const nextNotes = document.getElementById('quick-tx-next-notes').value.trim();

                if (!nextDate || !nextTime) {
                    this.showToast('Treatment saved, but please select date and time for next appointment!', 'warning');
                } else {
                    await api.invoke('db-query', 'saveAppointment', {
                        patient_id: this.selectedQuickTxPatient.id,
                        appointment_date: `${nextDate}T${nextTime}:00`,
                        notes: nextNotes
                    });
                }
            }

            this.showToast('Visit record saved successfully!', 'success');
            await this.renderTreatmentLog();
        } catch (e) {
            console.error(e);
            this.showToast('Failed to save visit record: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-save"></i> Save Visit Record`;
        }
    }

    async renderReminders() {
        document.getElementById('view-title').innerText = 'Reminders';
        document.getElementById('view-subtitle').innerText = 'Patients Scheduled for Tomorrow';

        const mainContent = document.getElementById('main-content');
        
        try {
            const res = await api.invoke('db-query', 'getTomorrowAppointments');
            const appointments = res.success ? res.data : [];
            this.currentReminderList = appointments; // Store for queue

            mainContent.innerHTML = `
                <div class="billing-detail-view fade-in">
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                        ${appointments.length > 0 ? `
                            <button class="btn btn-primary-premium" onclick="window.router.startReminderQueue()" style="background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); border: none;">
                                <i class="fab fa-whatsapp"></i> Send All Reminders
                            </button>
                        ` : ''}
                    </div>

                    <div class="premium-card">
                        <div class="card-header-premium" style="background: white; border-bottom: 1px solid #f1f5f9; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="color: #1e293b; font-weight: 800; font-size: 1.1rem; margin: 0;">Tomorrow's Appointments List</h3>
                            <div class="badge" style="background: #0d9488; color: white; padding: 6px 12px; border-radius: 8px;">
                                ${appointments.length} Scheduled
                            </div>
                        </div>
                        <div class="table-container-premium">
                            <table class="premium-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Patient Name</th>
                                        <th>Gender/Age</th>
                                        <th>Phone Number</th>
                                        <th style="text-align: center;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${appointments.length === 0 ? `
                                        <tr>
                                            <td colspan="5" style="text-align: center; padding: 100px 40px; color: #94a3b8;">
                                                <div style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;">
                                                    <i class="fas fa-calendar-check"></i>
                                                </div>
                                                <p style="font-weight: 600; font-size: 1.1rem;">All clear!</p>
                                                <p>No appointments scheduled for tomorrow.</p>
                                            </td>
                                        </tr>
                                    ` : appointments.map(a => {
                                        const time = new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        return `
                                            <tr>
                                                <td style="font-weight: 800; color: #0d9488;">${time}</td>
                                                <td style="font-weight: 700; color: #1e293b;">${a.full_name}</td>
                                                <td style="font-weight: 600; color: #64748b;">${a.gender} / ${a.age} yrs</td>
                                                <td style="font-weight: 700; color: #1e293b;">${a.contact_primary}</td>
                                                <td style="text-align: center;">
                                                    <div style="display: flex; gap: 8px; justify-content: center;">
                                                        <button class="btn btn-icon-secondary" style="color: #25d366; background: #dcf8c6; border-color: #c7e5b4;" title="Send WhatsApp Reminder" 
                                                                onclick="window.router.sendWhatsAppReminder('${a.full_name}', '${a.contact_primary}', '${time}')">
                                                            <i class="fab fa-whatsapp"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            console.error(e);
        }
    }

    startReminderQueue() {
        if (!this.currentReminderList || this.currentReminderList.length === 0) return;
        this.currentQueueIndex = 0;
        this.renderRemindersQueue();
    }

    renderRemindersQueue() {
        const index = this.currentQueueIndex;
        const total = this.currentReminderList.length;
        const patient = this.currentReminderList[index];
        const time = new Date(patient.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const modalContainer = document.getElementById('modal-container');
        modalContainer.style.display = 'flex';
        modalContainer.className = 'modal-backdrop-premium';
        modalContainer.innerHTML = `
            <div class="modal-content-premium fade-in-up" style="max-width: 450px; position: relative; padding: 0;">
                <!-- Navigation Arrows -->
                ${index > 0 ? `
                    <button onclick="window.router.prevInQueue()" style="position: absolute; left: -60px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: 2px solid white; color: white; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; backdrop-filter: blur(10px); transition: all 0.2s;">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                ` : ''}
                
                ${index < total - 1 ? `
                    <button onclick="window.router.nextInQueue()" style="position: absolute; right: -60px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: 2px solid white; color: white; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; backdrop-filter: blur(10px); transition: all 0.2s;">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}

                <div class="modal-header-premium" style="background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); color: white; border: none; border-radius: 20px 20px 0 0;">
                    <div class="header-title-group">
                        <div class="icon-box-primary" style="background: rgba(255,255,255,0.2); color: white;">
                            <i class="fab fa-whatsapp"></i>
                        </div>
                        <div>
                            <h3 style="color: white;">WhatsApp Queue</h3>
                            <p style="color: rgba(255,255,255,0.8);">Patient ${index + 1} of ${total}</p>
                        </div>
                    </div>
                    <button class="modal-close-btn" onclick="window.router.closeModal()" style="color: white; background: rgba(255,255,255,0.1);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body-premium" style="padding: 30px; text-align: center;">
                    <div style="width: 80px; height: 80px; background: #f0fdf4; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2rem; border: 2px solid #dcfce7;">
                        <i class="fas fa-user"></i>
                    </div>
                    <h2 style="color: #1e293b; margin-bottom: 5px;">${patient.full_name}</h2>
                    <p style="color: #64748b; font-weight: 600; margin-bottom: 25px;">Appointment at ${time}</p>
                    
                    <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: left; margin-bottom: 25px;">
                        <label style="font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; display: block;">Message Preview</label>
                        <p style="font-size: 0.9rem; color: #475569; line-height: 1.5; margin: 0;">
                            Hi ${patient.full_name}, this is a reminder for your appointment tomorrow at ${time}...
                        </p>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-primary-premium" onclick="window.router.sendWhatsAppReminder('${patient.full_name}', '${patient.contact_primary}', '${time}', true)" style="background: #25d366; flex: 1.5; height: 48px; border-radius: 14px; font-weight: 800;">
                            <i class="fab fa-whatsapp"></i> Send & Next
                        </button>
                        <button class="btn btn-secondary-outline" onclick="window.router.nextInQueue()" style="flex: 1; height: 48px; border-radius: 14px; font-weight: 700;">
                            ${index === total - 1 ? 'Finish' : 'Skip'}
                        </button>
                    </div>
                </div>
                <div style="height: 8px; background: #f1f5f9; width: 100%; position: relative; border-radius: 0 0 20px 20px; overflow: hidden;">
                    <div style="height: 100%; background: #25d366; width: ${((index + 1) / total) * 100}%; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>
        `;
    }

    prevInQueue() {
        if (this.currentQueueIndex > 0) {
            this.currentQueueIndex--;
            this.renderRemindersQueue();
        }
    }

    nextInQueue() {
        if (this.currentQueueIndex < this.currentReminderList.length - 1) {
            this.currentQueueIndex++;
            this.renderRemindersQueue();
        } else {
            this.closeModal();
            this.showToast('All reminders processed!', 'success');
        }
    }

    async sendWhatsAppReminder(patientName, phone, time, autoNext = false) {
        // Fetch country code from settings
        const settingsRes = await api.invoke('db-query', 'getClinicSettings');
        const s = settingsRes.success ? settingsRes.data : {};
        const countryCode = s.wa_country || '91';

        // Clean phone number (remove spaces, dashes, etc.)
        let cleanPhone = phone.replace(/\D/g, '');
        
        // Remove leading zero if present (common in India)
        if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }

        // If it's a 10-digit number, add the country code
        const finalPhone = cleanPhone.length === 10 ? countryCode + cleanPhone : cleanPhone;
        
        const message = encodeURIComponent(`Hi ${patientName}, this is a reminder for your appointment at DentRecords Clinic tomorrow at ${time}. Please confirm if you will be attending. Thank you!`);
        const whatsappUrl = `https://wa.me/${finalPhone}?text=${message}`;
        
        // Open in new window
        window.open(whatsappUrl, '_blank');
        this.showToast('Opening WhatsApp...', 'info');

        // Auto-advance logic
        if (autoNext) {
            setTimeout(() => {
                this.nextInQueue();
            }, 1000); // Small delay so the user sees the toast
        }
    }

}

window.router = new Router();

