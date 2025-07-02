const axios = require('axios');
const config = require('../config/config');

class HealthcareAPIService {
    constructor() {
        this.baseURL = 'http://10.11.27.76:5000/api';
        this.apiKey = config.HEALTH_API_KEY;
        this.token = config.HEALTH_API_TOKEN;
        this.timeout = 10000;
        this.currentPatient = null;
        this.currentDoctor = null;
        this.sessionCookies = null;
        this.externalSession = null; // Store external app session
        
        console.log('🔑 API Key loaded:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT FOUND');
        
        this.api = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            withCredentials: true
        });
        
        this.setupAuthentication();
    }
    
    setupAuthentication() {
        if (this.apiKey) {
            this.api.defaults.headers.common['X-API-Key'] = this.apiKey;
            console.log('✅ X-API-Key header set successfully');
        } else {
            console.error('❌ API Key not found in config');
        }
        
        if (this.token && this.token !== 'your_bearer_token_here') {
            this.api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
            console.log('✅ Bearer token set successfully');
        }
    }

    // Get headers for API requests
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        
        if (this.token && this.token !== 'your_bearer_token_here') {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Patient Authentication - Updated for your API response format
    async authenticatePatient(email, password) {
        try {
            console.log('🔐 Authenticating patient with email:', email);
            const response = await this.api.post('/patient/signin', {
                email: email,
                password: password
            });
            
            if (response.data.success) {
                // Store patient information from your API response
                this.currentPatient = {
                    id: response.data.patient_id,
                    name: response.data.name,
                    email: response.data.email,
                    dob: response.data.dob,
                    phone: response.data.phone,
                    blood_group: response.data.blood_group,
                    age: response.data.age,
                    height: response.data.height,
                    weight: response.data.weight
                };
                
                // Store cookies if they exist (for session management)
                if (response.headers['set-cookie']) {
                    this.sessionCookies = response.headers['set-cookie'];
                    console.log('🍪 Session cookies stored');
                }
                
                console.log('✅ Patient authenticated successfully:', this.currentPatient.name);
                return {
                    success: true,
                    patient: this.currentPatient
                };
            }
            
            return {
                success: false,
                error: response.data.message || 'Authentication failed'
            };
        } catch (error) {
            console.error('❌ Patient authentication failed:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.error || error.response?.data?.message || error.message
            };
        }
    }

    // Doctor Authentication (similar pattern)
    async authenticateDoctor(email, password) {
        try {
            console.log('🔐 Authenticating doctor with email:', email);
            const response = await this.api.post('/doctor/signin', {
                email: email,
                password: password
            });
            
            if (response.data.success) {
                this.currentDoctor = {
                    id: response.data.doctor_id,
                    name: response.data.name,
                    email: response.data.email,
                    specialization: response.data.specialization,
                    hospital_id: response.data.hospital_id,
                    phone: response.data.phone
                };
                
                if (response.headers['set-cookie']) {
                    this.sessionCookies = response.headers['set-cookie'];
                }
                
                console.log('✅ Doctor authenticated successfully:', this.currentDoctor.name);
                return {
                    success: true,
                    doctor: this.currentDoctor
                };
            }
            
            return {
                success: false,
                error: response.data.message || 'Authentication failed'
            };
        } catch (error) {
            console.error('❌ Doctor authentication failed:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.error || error.response?.data?.message || error.message
            };
        }
    }

    // NEW: Set external session from your app/website
    setExternalSession(sessionData) {
        const { patient, sessionToken, cookies, authType } = sessionData;
        
        if (patient) {
            this.currentPatient = {
                id: patient.patient_id || patient.id,
                name: patient.name,
                email: patient.email,
                dob: patient.dob,
                phone: patient.phone,
                blood_group: patient.blood_group,
                age: patient.age,
                height: patient.height,
                weight: patient.weight
            };
        }
        
        // Store session information
        this.externalSession = {
            token: sessionToken,
            cookies: cookies,
            authType: authType || 'session',
            authenticated: true,
            timestamp: new Date().toISOString()
        };
        
        // Update session cookies if provided
        if (cookies) {
            this.sessionCookies = Array.isArray(cookies) ? cookies : [cookies];
        }
        
        console.log('✅ External session set for patient:', this.currentPatient?.name);
        return true;
    }

    // NEW: Check if external session is valid
    hasValidExternalSession() {
        if (!this.externalSession || !this.currentPatient) {
            return false;
        }
        
        // Check if session is not older than 24 hours
        const sessionAge = Date.now() - new Date(this.externalSession.timestamp).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        return sessionAge < maxAge;
    }

    // Updated: Get authenticated headers with external session support
    getAuthenticatedHeaders() {
        const headers = {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
        };
        
        // Priority: External session > Internal session cookies
        if (this.externalSession?.token) {
            // If external session has a token, use it
            headers['Authorization'] = `Bearer ${this.externalSession.token}`;
        } else if (this.externalSession?.cookies) {
            // If external session has cookies, use them
            headers['Cookie'] = Array.isArray(this.externalSession.cookies) 
                ? this.externalSession.cookies.join('; ') 
                : this.externalSession.cookies;
        } else if (this.sessionCookies) {
            // Fallback to internal session cookies
            headers['Cookie'] = this.sessionCookies.join('; ');
        }
        
        return headers;
    }

    // Updated: Patient Dashboard with external session support
    async getPatientDashboard(patientId = null, email = null, password = null) {
        try {
            // Check if we have valid external session first
            if (!this.hasValidExternalSession() && !this.currentPatient && email && password) {
                const authResult = await this.authenticatePatient(email, password);
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            if (!this.currentPatient) {
                throw new Error('Patient authentication required. Please provide session or login credentials.');
            }

            const actualPatientId = patientId || this.currentPatient.id;
            
            console.log(`📊 Getting dashboard for patient: ${this.currentPatient.name} (ID: ${actualPatientId}) [External Session: ${this.hasValidExternalSession()}]`);
            
            const response = await this.api.get(`/patient/${actualPatientId}/dashboard`, {
                headers: this.getAuthenticatedHeaders()
            });
            
            if (response.data.success) {
                return this.formatPatientDashboard(response.data);
            }
            
            throw new Error('Failed to retrieve patient dashboard');
        } catch (error) {
            console.error('❌ Patient dashboard error:', error.response?.data);
            
            if (error.response?.status === 401) {
                // Clear both internal and external sessions on auth failure
                this.clearAuthentication();
                throw new Error('Session expired. Please login again.');
            }
            
            if (error.response?.status === 404) {
                throw new Error(`Patient not found (ID: ${patientId || this.currentPatient.id}).`);
            }
            
            throw new Error(`Failed to fetch patient dashboard: ${error.message}`);
        }
    }

    // Format dashboard data according to your API response
    formatPatientDashboard(data) {
        const { patient, recent_appointments, reports_count, upcoming_appointments_count } = data;
        
        return {
            patient: {
                id: patient.patient_id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                phone: patient.phone,
                email: patient.email,
                bloodGroup: patient.blood_group,
                address: patient.address,
                dob: patient.dob,
                height: patient.height,
                weight: patient.weight,
                aadhaarUuid: patient.aadhaar_uuid,
                registrationDate: patient.registration_date
            },
            summary: {
                reportsCount: reports_count,
                upcomingAppointments: upcoming_appointments_count
            },
            recentAppointments: recent_appointments.map(apt => ({
                id: apt.appointment_id,
                dateTime: apt.date_time,
                symptoms: apt.symptoms,
                status: apt.status,
                doctorName: apt.doctor_name,
                specialization: apt.specialization,
                hospitalName: apt.hospital_name
            }))
        };
    }

    // Updated Patient Appointments with external session support
    async getPatientAppointments(patientId, email = null, password = null) {
        try {
            if (!this.hasValidExternalSession() && !this.currentPatient && email && password) {
                const authResult = await this.authenticatePatient(email, password);
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            if (!this.currentPatient) {
                throw new Error('Patient authentication required.');
            }

            const response = await this.api.get(`/patient/${patientId}/appointments`, {
                headers: this.getAuthenticatedHeaders()
            });
            
            return response.data;
        } catch (error) {
            console.error('Error fetching patient appointments:', error.response?.data);
            
            if (error.response?.status === 401) {
                this.clearAuthentication();
                throw new Error('Session expired. Please login again.');
            }
            
            throw error;
        }
    }

    // Updated: Patient Reports with external session support
    async getPatientReports(patientId, email = null, password = null) {
        try {
            if (!this.hasValidExternalSession() && !this.currentPatient && email && password) {
                const authResult = await this.authenticatePatient(email, password);
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            if (!this.currentPatient) {
                throw new Error('Patient authentication required.');
            }

            const response = await this.api.get(`/patient/${patientId}/reports`, {
                headers: this.getAuthenticatedHeaders()
            });
            
            return response.data;
        } catch (error) {
            console.error('Error fetching patient reports:', error.response?.data);
            
            if (error.response?.status === 401) {
                this.clearAuthentication();
                throw new Error('Session expired. Please login again.');
            }
            
            if (error.response?.status === 500) {
                console.warn('⚠️ Server-side bug in reports endpoint');
                return {
                    success: false,
                    error: 'Reports service temporarily unavailable',
                    reports: [],
                    serverBug: true
                };
            }
            
            throw error;
        }
    }

    // Updated: Book appointment with external session support
    async bookAppointment(patientId, appointmentData) {
        try {
            if (!this.currentPatient) {
                throw new Error('Patient authentication required to book appointment.');
            }

            const response = await this.api.post(`/patient/${patientId}/appointments`, appointmentData, {
                headers: this.getAuthenticatedHeaders()
            });
            
            return response.data;
        } catch (error) {
            console.error('❌ Error booking appointment:', error.response?.data);
            
            if (error.response?.status === 401) {
                this.clearAuthentication();
                throw new Error('Session expired. Please login again.');
            }
            
            throw new Error(`Failed to book appointment: ${error.response?.data?.error || error.message}`);
        }
    }

    // Get appointment details
    async getAppointmentDetails(appointmentId) {
        try {
            const response = await this.api.get(`/appointment/${appointmentId}`, {
                headers: this.getAuthenticatedHeaders()
            });
            
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching appointment details:', error.response?.data);
            throw new Error(`Failed to fetch appointment details: ${error.response?.data?.error || error.message}`);
        }
    }

    // Update appointment status
    async updateAppointmentStatus(appointmentId, status) {
        try {
            const response = await this.api.put(`/appointment/${appointmentId}`, { status }, {
                headers: this.getAuthenticatedHeaders()
            });
            
            return response.data;
        } catch (error) {
            console.error('❌ Error updating appointment status:', error.response?.data);
            throw new Error(`Failed to update appointment status: ${error.response?.data?.error || error.message}`);
        }
    }

    // Get doctor appointments with filters
    async getDoctorAppointments(doctorId, status = 'all') {
        try {
            if (!this.currentDoctor) {
                throw new Error('Doctor authentication required.');
            }

            const params = status !== 'all' ? { status } : {};
            const response = await this.api.get(`/doctor/${doctorId}/appointments`, { 
                params,
                headers: this.getAuthenticatedHeaders()
            });
            
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching doctor appointments:', error.response?.data);
            throw new Error(`Failed to fetch doctor appointments: ${error.response?.data?.error || error.message}`);
        }
    }

    // Clear authentication
    clearAuthentication() {
        this.currentPatient = null;
        this.currentDoctor = null;
        this.sessionCookies = null;
        this.externalSession = null;
        console.log('🔄 All authentication cleared (including external session)');
    }

    // Updated: Get current user info with session status
    getCurrentUser() {
        return {
            patient: this.currentPatient,
            doctor: this.currentDoctor,
            isAuthenticated: !!(this.currentPatient || this.currentDoctor),
            hasExternalSession: this.hasValidExternalSession(),
            sessionType: this.externalSession ? 'external' : 'internal'
        };
    }

    // Test API connection
    async testConnection() {
        try {
            console.log('🧪 Testing connection to:', this.baseURL);
            const response = await this.api.get('/hospitals');
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getHospitals() {
        try {
            const response = await this.api.get('/hospitals');
            return response.data.hospitals || response.data;
        } catch (error) {
            throw error;
        }
    }

    async getDoctors(hospitalId = null) {
        try {
            const params = hospitalId ? { hospital_id: hospitalId } : {};
            const response = await this.api.get('/doctors', { params });
            return response.data.doctors || response.data;
        } catch (error) {
            throw error;
        }
    }

    // Doctor Dashboard
    async getDoctorDashboard(doctorId = null, email = null, password = null) {
        try {
            if (!this.currentDoctor && email && password) {
                const authResult = await this.authenticateDoctor(email, password);
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            if (!this.currentDoctor) {
                throw new Error('Doctor authentication required.');
            }

            const actualDoctorId = doctorId || this.currentDoctor.id;
            
            console.log(`👨‍⚕️ Getting dashboard for doctor: ${this.currentDoctor.name} (ID: ${actualDoctorId})`);
            
            const response = await this.api.get(`/doctor/${actualDoctorId}/dashboard`, {
                headers: this.getAuthenticatedHeaders()
            });
            
            if (response.data.success) {
                return this.formatDoctorDashboard(response.data);
            }
            
            throw new Error('Failed to retrieve doctor dashboard');
        } catch (error) {
            console.error('❌ Doctor dashboard error:', error.response?.data);
            
            if (error.response?.status === 401) {
                this.currentDoctor = null;
                this.sessionCookies = null;
                throw new Error('Session expired. Please login again.');
            }
            
            throw new Error(`Failed to fetch doctor dashboard: ${error.message}`);
        }
    }

    // Format doctor dashboard data
    formatDoctorDashboard(data) {
        const { doctor, today_appointments, upcoming_appointments, statistics } = data;
        
        return {
            doctor: {
                id: doctor.doctor_id,
                name: doctor.name,
                email: doctor.email,
                specialization: doctor.specialization,
                hospitalName: doctor.hospital_name,
                phone: doctor.phone,
                hospitalId: doctor.hospital_id,
                registrationDate: doctor.registration_date
            },
            todayAppointments: (today_appointments || []).map(apt => ({
                id: apt.appointment_id,
                dateTime: apt.date_time,
                symptoms: apt.symptoms,
                status: apt.status,
                patientName: apt.patient_name,
                patientPhone: apt.patient_phone,
                patientAge: apt.patient_age,
                patientGender: apt.patient_gender
            })),
            upcomingAppointments: upcoming_appointments || [],
            statistics: {
                todayCount: statistics?.today_count || 0,
                upcomingCount: statistics?.upcoming_count || 0,
                totalPatients: statistics?.total_patients || 0,
                completedCount: statistics?.completed_count || 0
            }
        };
    }

    // PRESCRIPTION METHODS
    
    // Get patient prescriptions
    async getPatientPrescriptions(patientId) {
        try {
            const response = await axios.get(`${this.baseURL}/patient/${patientId}/prescriptions`, {
                headers: this.getHeaders(),
                timeout: this.timeout
            });

            console.log('✅ Patient prescriptions fetched successfully');
            // Some APIs may not return a top-level success property
            return {
                prescriptions: response.data.prescriptions || []
            };
        } catch (error) {
            console.error('❌ Error fetching patient prescriptions:', error.response?.data || error.message);
            return { prescriptions: [] };
        }
    }

    // Get specific prescription details
    async getPrescriptionDetails(prescriptionId) {
        try {
            const response = await axios.get(`${this.baseURL}/prescriptions/${prescriptionId}`, {
                headers: this.getHeaders(),
                timeout: this.timeout
            });

            console.log('✅ Prescription details fetched successfully');
            return {
                success: true,
                prescription: response.data.prescription
            };
        } catch (error) {
            console.error('❌ Error fetching prescription details:', error.response?.data || error.message);
            throw new Error(`Failed to fetch prescription details: ${error.response?.data?.error || error.message}`);
        }
    }

    // Download prescription PDF
    async downloadPrescriptionPDF(prescriptionId) {
        try {
            const response = await axios.get(`${this.baseURL}/prescriptions/${prescriptionId}/download`, {
                headers: this.getHeaders(),
                responseType: 'blob',
                timeout: this.timeout
            });

            console.log('✅ Prescription PDF downloaded successfully');
            return {
                success: true,
                pdfData: response.data,
                contentType: response.headers['content-type']
            };
        } catch (error) {
            console.error('❌ Error downloading prescription PDF:', error.response?.data || error.message);
            throw new Error(`Failed to download prescription PDF: ${error.response?.data?.error || error.message}`);
        }
    }

    // Create prescription (for doctors)
    async createPrescription(prescriptionData) {
        try {
            const response = await axios.post(`${this.baseURL}/prescriptions`, prescriptionData, {
                headers: this.getHeaders(),
                timeout: this.timeout
            });

            console.log('✅ Prescription created successfully');
            return {
                success: true,
                prescription_id: response.data.prescription_id,
                message: response.data.message
            };
        } catch (error) {
            console.error('❌ Error creating prescription:', error.response?.data || error.message);
            throw new Error(`Failed to create prescription: ${error.response?.data?.error || error.message}`);
        }
    }

    // LAB TEST MANAGEMENT METHODS

    // Get patient lab tests
    async getPatientLabTests(patientId) {
        try {
            const response = await axios.get(`${this.baseURL}/patient/${patientId}/lab-tests`, {
                headers: this.getHeaders(),
                timeout: this.timeout
            });

            console.log('✅ Patient lab tests fetched successfully');
            return {
                lab_tests: response.data.lab_tests || []
            };
        } catch (error) {
            console.error('❌ Error fetching patient lab tests:', error.response?.data || error.message);
            return { lab_tests: [] };
        }
    }

    // Upload lab test (for file upload functionality)
    async uploadLabTest(patientId, formData) {
        try {
            const response = await axios.post(`${this.baseURL}/patient/${patientId}/lab-tests`, formData, {
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'multipart/form-data'
                },
                timeout: this.timeout
            });

            console.log('✅ Lab test uploaded successfully');
            return {
                success: true,
                test_id: response.data.test_id,
                file_path: response.data.file_path,
                message: response.data.message
            };
        } catch (error) {
            console.error('❌ Error uploading lab test:', error.response?.data || error.message);
            throw new Error(`Failed to upload lab test: ${error.response?.data?.error || error.message}`);
        }
    }

    // Get lab test file URL
    getLabTestFileUrl(testId) {
        return `${this.baseURL}/lab-tests/${testId}/file`;
    }

    // Share lab test with doctor
    async shareLabTestWithDoctor(patientId, testId, doctorId, notes = '') {
        try {
            const response = await axios.post(`${this.baseURL}/patient/${patientId}/lab-tests/${testId}/share`, {
                doctor_id: doctorId,
                notes: notes
            }, {
                headers: this.getHeaders(),
                timeout: this.timeout
            });

            console.log('✅ Lab test shared with doctor successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error sharing lab test with doctor:', error.response?.data || error.message);
            throw new Error(`Failed to share lab test: ${error.response?.data?.error || error.message}`);
        }
    }

    // REPORT SHARING METHODS

    // Get patient reports
    async getPatientReports(patientId) {
        try {
            const response = await axios.get(`${this.baseURL}/patient/${patientId}/reports`, {
                headers: this.getHeaders(),
                timeout: this.timeout
            });

            console.log('✅ Patient reports fetched successfully');
            return {
                reports: response.data.reports || []
            };
        } catch (error) {
            console.error('❌ Error fetching patient reports:', error.response?.data || error.message);
            return { reports: [] };
        }
    }

    // Share report with doctors - Fixed to use axios directly like other working endpoints
    async shareReportWithDoctors(patientId, reportId, doctorIds, notes = '') {
        try {
            console.log(`� Sharing report ${reportId} with doctors: ${doctorIds.join(', ')}`);
            
            const response = await axios.post(`${this.baseURL}/patient/${patientId}/reports/${reportId}/share`, {
                doctor_ids: doctorIds,
                notes: notes
            }, {
                headers: this.getHeaders(),
                timeout: this.timeout
            });

            console.log('✅ Report shared with doctors successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error sharing report:', error.response?.data || error.message);
            throw new Error(`Failed to share report: ${error.response?.data?.error || error.message}`);
        }
    }
}

module.exports = new HealthcareAPIService();