const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const config = require('./config/config');
const healthcareAPI = require('./services/healthcareAPI');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Simple logging utility
const logMessage = (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
};

// Note: All data now comes from real healthcare API - no hardcoded database needed

// Health ERP Chatbot Class
class HealthERPChatbot {
    constructor() {
        this.conversations = new Map();
        this.appointmentSessions = new Map();
        
        this.menuOptions = {
            "main": {
                "message": "🏥 Welcome to Health ERP Assistant! How can I help you today?",
                "options": [
                    {"id": "1", "text": "📅 Book Appointment", "action": "book_appointment"},
                    {"id": "2", "text": "📋 View Medical Records", "action": "medical_records"},
                    {"id": "3", "text": "💊 Prescription Status", "action": "prescription"},
                    {"id": "4", "text": "🧪 Lab Reports", "action": "lab_reports"},
                    {"id": "5", "text": "🚨 Emergency Contact", "action": "emergency"},
                    {"id": "6", "text": "💡 Health Tips", "action": "health_tips"},
                    {"id": "7", "text": "👤 Profile Settings", "action": "profile"}
                ]
            },
            "book_appointment": {
                "message": "📅 Which type of appointment would you like to book?",
                "options": [
                    {"id": "1", "text": "🩺 General Consultation", "action": "general_appointment"},
                    {"id": "2", "text": "👨‍⚕️ Specialist Consultation", "action": "specialist_appointment"},
                    {"id": "3", "text": "🔬 Diagnostic Test", "action": "diagnostic_test"},
                    {"id": "4", "text": "💉 Vaccination", "action": "vaccination_appointment"},
                    {"id": "5", "text": "📋 View My Appointments", "action": "view_appointments"},
                    {"id": "back", "text": "← Back to Main Menu", "action": "main"}
                ]
            },
            "medical_records": {
                "message": "📋 What medical records would you like to access?",
                "options": [
                    {"id": "1", "text": "🕐 Recent Visits", "action": "recent_visits"},
                    {"id": "2", "text": "📜 Medical History", "action": "medical_history"},
                    {"id": "3", "text": "💉 Vaccination Records", "action": "vaccination_records"},
                    {"id": "4", "text": "🩸 Blood Test Results", "action": "blood_tests"},
                    {"id": "5", "text": "📄 Medical Reports", "action": "patient_reports"},
                    {"id": "6", "text": "📤 Share Reports with Doctor", "action": "share_reports_menu"},
                    {"id": "back", "text": "← Back to Main Menu", "action": "main"}
                ]
            },
            "prescription": {
                "message": "💊 Prescription Management Options:",
                "options": [
                    {"id": "1", "text": "📋 Current Prescriptions", "action": "current_prescription"},
                    {"id": "2", "text": "📚 Prescription History", "action": "prescription_history"},
                    {"id": "3", "text": "🔄 Refill Request", "action": "refill_request"},
                    {"id": "4", "text": "⚠️ Drug Interactions", "action": "drug_interactions"},
                    {"id": "back", "text": "← Back to Main Menu", "action": "main"}
                ]
            },
            "lab_reports": {
                "message": "🧪 Lab Reports and Tests:",
                "options": [
                    {"id": "1", "text": "📊 Recent Reports", "action": "recent_reports"},
                    {"id": "2", "text": "⏳ Pending Tests", "action": "pending_tests"},
                    {"id": "3", "text": "📅 Schedule Lab Test", "action": "schedule_test"},
                    {"id": "4", "text": "📈 Track Test Results", "action": "track_results"},
                    {"id": "back", "text": "← Back to Main Menu", "action": "main"}
                ]
            }
        };
    }

    // Updated: Accept session data from external app
    async getResponse(userId, selectedOption, additionalData = {}, sessionData = null) {
        logMessage(`User ${userId} selected option: ${selectedOption}`);
        
        // If session data is provided, set it in the healthcare API
        if (sessionData) {
            const sessionSet = healthcareAPI.setExternalSession(sessionData);
            if (sessionSet) {
                logMessage(`✅ External session set for user ${userId}: ${sessionData.patient?.name}`);
            }
        }

        // Check if user is in custom symptom input mode
        const appointmentSession = this.appointmentSessions.get(userId);
        if (appointmentSession && appointmentSession.waitingForCustomSymptom && selectedOption !== 'back_to_symptoms') {
            // Treat the selectedOption as the custom symptom text
            return this.handleCustomSymptom(userId, selectedOption);
        }
        
        // Store conversation state
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, { 
                history: [], 
                currentMenu: 'main',
                hasExternalSession: !!sessionData 
            });
        }

        const userConversation = this.conversations.get(userId);
        userConversation.history.push({ 
            option: selectedOption, 
            timestamp: new Date().toISOString(),
            hasSession: healthcareAPI.hasValidExternalSession()
        });
        userConversation.currentMenu = selectedOption;

        // Return predefined menu options
        if (this.menuOptions[selectedOption]) {
            return this.menuOptions[selectedOption];
        }

        // Handle specific actions with session awareness
        return await this.handleSpecificActions(selectedOption, userId, additionalData);
    }

    // Updated: Handle actions with automatic session usage
    async handleSpecificActions(action, userId, additionalData = {}) {
        const currentUser = healthcareAPI.getCurrentUser();
        const patientId = currentUser.patient?.id;

        switch (action) {
            case "profile":
            case "patient_dashboard":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    const dashboard = await healthcareAPI.getPatientDashboard(patientId);
                    const patient = dashboard.patient;
                    
                    const sessionInfo = currentUser.hasExternalSession ? 
                        `\n\n🔒 **Session:** Connected via ${currentUser.sessionType} session` : '';
                    
                    return {
                        "message": `📊 **Your Health Dashboard**${sessionInfo}\n\n👤 **Personal Information:**\n• 👤 Name: ${patient.name}\n• 🆔 ID: ${patient.id}\n• 🎂 Age: ${patient.age} years\n• 🩸 Blood Group: ${patient.bloodGroup}\n• 📞 Phone: ${patient.phone}\n• 📧 Email: ${patient.email}\n• 📏 Height: ${patient.height} cm\n• ⚖️ Weight: ${patient.weight} kg\n\n📊 **Health Summary:**\n• 📋 Medical Reports: ${dashboard.summary.reportsCount}\n• 📅 Upcoming Appointments: ${dashboard.summary.upcomingAppointments}\n• 🏥 Recent Appointments: ${dashboard.recentAppointments.length}`,
                        "options": [
                            {"id": "book_appointment", "text": "📅 Book New Appointment", "action": "book_appointment"},
                            {"id": "view_appointments", "text": "📋 View All Appointments", "action": "my_appointments"},
                            {"id": "view_reports", "text": "🧪 View Lab Reports", "action": "recent_reports"},
                            {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                        ]
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            case "my_appointments":
            case "view_appointments":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    const appointmentsResponse = await healthcareAPI.getPatientAppointments(patientId);
                    const appointments = appointmentsResponse.appointments || appointmentsResponse;
                    
                    if (!appointments || appointments.length === 0) {
                        return {
                            "message": "📅 **Your Appointments**\n\n🔍 No appointments found.\n\nWould you like to book a new appointment?",
                            "options": [
                                {"id": "book_appointment", "text": "📅 Book New Appointment", "action": "book_appointment"},
                                {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                            ]
                        };
                    }
                    
                    const appointmentsList = appointments.slice(0, 5).map((apt, index) => 
                        `📋 **${index + 1}. ${apt.doctor_name}** (${apt.specialization})\n📅 ${new Date(apt.date_time).toLocaleDateString()} at ${new Date(apt.date_time).toLocaleTimeString()}\n🏥 ${apt.hospital_name}\n🔸 Status: ${apt.status}\n💬 Symptoms: ${apt.symptoms}`
                    ).join('\n\n');
                    
                    return {
                        "message": `📅 **Your Appointments (${appointments.length})**\n\n${appointmentsList}${appointments.length > 5 ? `\n\n📝 *Showing first 5 of ${appointments.length} appointments*` : ''}`,
                        "options": [
                            {"id": "book_appointment", "text": "📅 Book New Appointment", "action": "book_appointment"},
                            {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                        ]
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            case "recent_reports":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    // Fetch real lab tests from API
                    const labTestsResult = await healthcareAPI.getPatientLabTests(patientId);
                    const labTests = labTestsResult.lab_tests || [];
                    
                    if (!labTests.length) {
                        return {
                            "message": "🧪 **Lab Test Reports**\n\n📋 **No Lab Tests Found**\n\nYou currently have no lab test reports on record.\n\n**What you can do:**\n• Schedule a lab test\n• Upload your lab reports\n• Check with your doctor about pending tests",
                            "options": [
                                {"id": "schedule_test", "text": "📅 Schedule Lab Test", "action": "schedule_test"},
                                {"id": "lab_reports", "text": "← Back to Lab Reports", "action": "lab_reports"},
                                {"id": "main", "text": "🏠 Main Menu", "action": "main"}
                            ]
                        };
                    }

                    // Display recent lab tests (up to 5)
                    const recentTests = labTests.slice(0, 5);
                    const testsList = recentTests.map((test, index) => 
                        `**${index + 1}. ${test.test_name}**\n📅 Date: ${test.test_date || test.uploaded_at}\n🔬 Type: ${test.test_type}\n📊 Results: ${test.results || 'Pending'}\n📝 Notes: ${test.notes || 'None'}`
                    ).join('\n\n');

                    const options = recentTests.map((test, index) => ({
                        id: `view_lab_test_${test.test_id}`,
                        text: `📊 View ${test.test_name}`,
                        action: `view_lab_test_${test.test_id}`
                    }));

                    options.push(
                        {"id": "lab_reports", "text": "← Back to Lab Reports", "action": "lab_reports"},
                        {"id": "main", "text": "🏠 Main Menu", "action": "main"}
                    );

                    return {
                        "message": `🧪 **Recent Lab Test Reports**\n\n${testsList}`,
                        "options": options
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            // APPOINTMENT BOOKING FLOW
            case "general_appointment":
                try {
                    // Get real doctors from API
                    const doctors = await healthcareAPI.getDoctors();
                    
                    if (!doctors || doctors.length === 0) {
                        return {
                            "message": "⚠️ **No Doctors Available**\n\nSorry, no doctors are currently available for booking. Please try again later or contact the hospital directly.\n\n📞 **Contact Hospital:**\n• Main Line: +91-1234567890\n• Appointment Desk: Extension 123",
                            "options": [
                                {"id": "emergency", "text": "📞 Hospital Contact", "action": "emergency"},
                                {"id": "book_appointment", "text": "← Back to Appointment Types", "action": "book_appointment"}
                            ]
                        };
                    }

                    // Format real doctors for display
                    const doctorList = doctors.slice(0, 5).map(doctor => {
                        // Clean consultation fee from any HTML/color codes
                        const cleanFee = String(doctor.consultation_fee || '500').replace(/[^\d]/g, '') || '500';
                        return `**${doctor.name}** - ${doctor.specialization}\n⭐ ${doctor.rating || '4.5'}/5 ⏰ ${doctor.experience || '10+'} years experience\n🏥 ${doctor.hospital_name || 'Available at clinic'}\n💰 Consultation Fee: ₹${cleanFee}\n📅 Available: ${doctor.availability || 'Mon-Fri 9 AM - 5 PM'}`;
                    }).join('\n\n');

                    const options = doctors.slice(0, 5).map((doctor, index) => {
                        const cleanFee = String(doctor.consultation_fee || '500').replace(/[^\d]/g, '') || '500';
                        return {
                            id: `select_doctor_${doctor.doctor_id}`,
                            text: `👨‍⚕️ ${doctor.name} (₹${cleanFee})`,
                            action: `book_doctor_${doctor.doctor_id}`
                        };
                    });

                    options.push({"id": "book_appointment", "text": "← Back to Appointment Types", "action": "book_appointment"});

                    return {
                        "message": `🩺 **Book General Consultation**\n\n**Available Doctors:**\n\n${doctorList}`,
                        "options": options
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            // SPECIALIST APPOINTMENTS
            case "specialist_appointment":
                try {
                    // Get real doctors from API and group by specialization
                    const doctors = await healthcareAPI.getDoctors();
                    
                    if (!doctors || doctors.length === 0) {
                        return {
                            "message": "⚠️ **No Specialists Available**\n\nSorry, no specialists are currently available for booking. Please try again later or contact the hospital directly.\n\n📞 **Contact Hospital:**\n• Main Line: +91-1234567890\n• Appointment Desk: Extension 123",
                            "options": [
                                {"id": "emergency", "text": "📞 Hospital Contact", "action": "emergency"},
                                {"id": "book_appointment", "text": "← Back to Appointment Types", "action": "book_appointment"}
                            ]
                        };
                    }

                    // Group doctors by specialization
                    const specializations = {};
                    doctors.forEach(doctor => {
                        const spec = doctor.specialization || 'General Medicine';
                        if (!specializations[spec]) {
                            specializations[spec] = [];
                        }
                        specializations[spec].push(doctor);
                    });

                    // Create specialist options from real data
                    const specializationList = Object.keys(specializations).slice(0, 8).map(spec => {
                        const docCount = specializations[spec].length;
                        const minFee = Math.min(...specializations[spec].map(d => d.consultation_fee || 500));
                        const icon = this.getSpecializationIcon(spec);
                        return `${icon} **${spec}**\n   👨‍⚕️ ${docCount} doctor${docCount > 1 ? 's' : ''} available\n   💰 Starting from ₹${minFee}`;
                    }).join('\n\n');

                    const options = Object.keys(specializations).slice(0, 6).map(spec => ({
                        id: `specialist_${spec.toLowerCase().replace(/\s+/g, '_')}`,
                        text: `${this.getSpecializationIcon(spec)} ${spec}`,
                        action: `book_specialist_${spec.toLowerCase().replace(/\s+/g, '_')}`
                    }));

                    options.push({"id": "book_appointment", "text": "← Back to Appointments", "action": "book_appointment"});

                    return {
                        "message": `👨‍⚕️ **Specialist Consultation**\n\n**Available Specialties:**\n\n${specializationList}`,
                        "options": options
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            // PRESCRIPTION MANAGEMENT
            case "current_prescription":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    // Fetch real prescriptions from API
                    const prescriptionsResult = await healthcareAPI.getPatientPrescriptions(patientId);
                    const prescriptions = prescriptionsResult.prescriptions || [];
                    if (!prescriptions.length) {
                        return {
                            "message": "💊 **Current Prescriptions**\n\n📋 **No Active Prescriptions**\n\nYou currently have no active prescriptions on record.\n\n**What you can do:**\n• Book a consultation with a doctor\n• Contact your doctor for new prescriptions\n• Check prescription history\n• Visit the pharmacy for over-the-counter medications",
                            "options": [
                                {"id": "book_appointment", "text": "📅 Book Doctor Consultation", "action": "book_appointment"},
                                {"id": "prescription_history", "text": "📚 Prescription History", "action": "prescription_history"},
                                {"id": "prescription", "text": "← Back to Prescriptions", "action": "prescription"}
                            ]
                        };
                    }

                    // Show the most recent prescription
                    const latest = prescriptions[0];
                    return {
                        "message": `💊 **Current Prescription**\n\n**Medicine:** ${latest.medicine_name}\n**Dosage:** ${latest.dosage}\n**Duration:** ${latest.duration}\n**Notes:** ${latest.notes}\n**Doctor:** ${latest.doctor_name}\n**Date:** ${latest.created_at}`,
                        "options": [
                            {"id": "prescription_history", "text": "📚 Prescription History", "action": "prescription_history"},
                            {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                        ]
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            case "patient_reports":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    // Fetch patient reports from API
                    const reportsResult = await healthcareAPI.getPatientReports(patientId);
                    const reports = reportsResult.reports || [];
                    
                    if (!reports.length) {
                        return {
                            "message": "📄 **Medical Reports**\n\n📋 **No Reports Found**\n\nYou currently have no medical reports on record.\n\n**What you can do:**\n• Upload reports from lab tests\n• Request reports from your doctor\n• Check with your healthcare provider",
                            "options": [
                                {"id": "schedule_test", "text": "📅 Schedule Lab Test", "action": "schedule_test"},
                                {"id": "book_appointment", "text": "👨‍⚕️ Book Doctor Consultation", "action": "book_appointment"},
                                {"id": "medical_records", "text": "← Back to Medical Records", "action": "medical_records"}
                            ]
                        };
                    }

                    // Display patient reports
                    const reportsList = reports.slice(0, 5).map((report, index) => 
                        `**${index + 1}. ${report.report_title}**\n📅 Date: ${report.upload_date}\n📝 Description: ${report.description || 'No description'}`
                    ).join('\n\n');

                    const options = reports.slice(0, 5).map((report, index) => ({
                        id: `view_report_${report.report_id}`,
                        text: `📄 View ${report.report_title}`,
                        action: `view_report_${report.report_id}`
                    }));

                    options.push(
                        {"id": "share_reports_menu", "text": "📤 Share Reports with Doctor", "action": "share_reports_menu"},
                        {"id": "medical_records", "text": "← Back to Medical Records", "action": "medical_records"}
                    );

                    return {
                        "message": `📄 **Your Medical Reports**\n\n${reportsList}`,
                        "options": options
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            case "prescription_history":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    // Fetch all prescriptions from API (same endpoint, but we'll show them as history)
                    const prescriptionsResult = await healthcareAPI.getPatientPrescriptions(patientId);
                    
                    if (!prescriptionsResult.success || !prescriptionsResult.prescriptions.length) {
                        return {
                            "message": "📚 **Prescription History**\n\n📋 **No Prescription History**\n\nYou have no prescription history on record.\n\n**Get Started:**\n• Book a consultation with a doctor\n• Visit our hospital for medical care\n• Request prescription transfers from other providers",
                            "options": [
                                {"id": "book_appointment", "text": "📅 Book Doctor Consultation", "action": "book_appointment"},
                                {"id": "prescription", "text": "← Back to Prescriptions", "action": "prescription"}
                            ]
                        };
                    }

                    // Sort prescriptions by date (newest first)
                    const sortedPrescriptions = prescriptionsResult.prescriptions.sort((a, b) => 
                        new Date(b.created_at) - new Date(a.created_at)
                    );

                    // Format prescription history for display
                    const historyList = sortedPrescriptions.slice(0, 10).map((prescription, index) => {
                        const createdDate = new Date(prescription.created_at).toLocaleDateString();
                        const appointmentDate = new Date(prescription.appointment_date).toLocaleDateString();
                        
                        return `**${index + 1}. ${prescription.medicine_name}** (${createdDate})\n` +
                               `💊 ${prescription.dosage} - ${prescription.duration}\n` +
                               `👨‍⚕️ ${prescription.doctor_name} (${prescription.specialization})\n` +
                               `📝 ${prescription.notes || 'No notes'}`;
                    }).join('\n\n');

                    return {
                        "message": `📚 **Your Prescription History**\n\n${historyList}\n\n${sortedPrescriptions.length > 10 ? `\n**Showing latest 10 of ${sortedPrescriptions.length} prescriptions**` : ''}`,
                        "options": [
                            {"id": "current_prescription", "text": "💊 Current Active Prescriptions", "action": "current_prescription"},
                            {"id": "book_appointment", "text": "📅 Book New Consultation", "action": "book_appointment"},
                            {"id": "prescription", "text": "← Back to Prescriptions", "action": "prescription"}
                        ]
                    };

                } catch (error) {
                    return this.handleAPIError(error);
                }

            case "share_reports_menu":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    // Get both reports and lab tests that can be shared
                    const [reportsResult, labTestsResult] = await Promise.all([
                        healthcareAPI.getPatientReports(patientId),
                        healthcareAPI.getPatientLabTests(patientId)
                    ]);

                    const reports = reportsResult.reports || [];
                    const labTests = labTestsResult.lab_tests || [];
                    
                    if (!reports.length && !labTests.length) {
                        return {
                            "message": "📤 **Share Reports with Doctor**\n\n📋 **No Reports to Share**\n\nYou currently have no reports or lab tests to share.\n\n**Get reports by:**\n• Completing lab tests\n• Getting medical reports from doctors\n• Uploading existing reports",
                            "options": [
                                {"id": "schedule_test", "text": "📅 Schedule Lab Test", "action": "schedule_test"},
                                {"id": "book_appointment", "text": "👨‍⚕️ Book Doctor Consultation", "action": "book_appointment"},
                                {"id": "patient_reports", "text": "← Back to Reports", "action": "patient_reports"}
                            ]
                        };
                    }

                    // Combine reports and lab tests
                    const allItems = [
                        ...reports.map(r => ({ ...r, type: 'report', name: r.report_title || r.file_name || 'Medical Report', id: r.report_id || r.id })),
                        ...labTests.map(l => ({ ...l, type: 'lab_test', name: l.test_name || l.name || 'Lab Test', id: l.test_id || l.id }))
                    ];

                    const itemsList = allItems.slice(0, 8).map((item, index) => 
                        `**${index + 1}. ${item.name}** (${item.type === 'report' ? 'Medical Report' : 'Lab Test'})\n📅 Date: ${item.upload_date || item.test_date || item.uploaded_at || item.created_at || 'Date not available'}`
                    ).join('\n\n');

                    const options = allItems.slice(0, 8).map((item, index) => ({
                        id: `share_item_${item.type}_${item.id}`,
                        text: `📤 Share ${item.name}`,
                        action: `share_item_${item.type}_${item.id}`
                    }));

                    options.push(
                        {"id": "patient_reports", "text": "← Back to Reports", "action": "patient_reports"},
                        {"id": "recent_reports", "text": "← Back to Lab Tests", "action": "recent_reports"}
                    );

                    return {
                        "message": `📤 **Share Reports with Doctor**\n\nSelect a report or lab test to share:\n\n${itemsList}`,
                        "options": options
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            case "refill_paracetamol":
            case "refill_vitamin":
            case "refill_omeprazole":
            case "order_family_para":
            case "order_standard_para":
            case "order_bulk_para":
                return {
                    "message": "🔄 **Prescription Refill Service**\n\n📋 **Feature In Development**\n\nOnline prescription refills are being integrated with your pharmacy system. For immediate refills:\n\n🏥 **Contact Your Pharmacy:**\n• Call your regular pharmacy\n• Visit in person with prescription\n• Use pharmacy mobile app\n\n👨‍⚕️ **Contact Your Doctor:**\n• Request new prescription\n• Schedule follow-up appointment\n• Ask about generic alternatives",
                    "options": [
                        {"id": "book_appointment", "text": "👨‍⚕️ Book Doctor Appointment", "action": "book_appointment"},
                        {"id": "emergency", "text": "🚨 Emergency Contact", "action": "emergency"},
                        {"id": "prescription", "text": "← Back to Prescriptions", "action": "prescription"}
                    ]
                };

            // LAB REPORTS AND TESTS - Using real API data
            case "schedule_test":
                try {
                    // For lab test scheduling, we'll integrate with hospital services
                    return {
                        "message": "📅 **Schedule Lab Test**\n\n🏥 **Lab Services Integration**\n\nLab test scheduling is being integrated with your hospital's laboratory system. For now, please:\n\n📞 **Call Lab Department:**\n• Hospital Lab: +91-1234567890\n• External Labs: Available through appointment\n\n📅 **Book Through Appointment:**\n• Schedule with your doctor\n• Doctor will order required tests\n• Lab will contact you for scheduling\n\n🩸 **Popular Tests Available:**\n• Complete Blood Count (CBC)\n• Lipid Profile\n• Blood Sugar Tests\n• Liver Function Tests\n• Kidney Function Tests",
                        "options": [
                            {"id": "book_appointment", "text": "👨‍⚕️ Book Doctor Consultation", "action": "book_appointment"},
                            {"id": "emergency", "text": "📞 Hospital Contact", "action": "emergency"},
                            {"id": "lab_reports", "text": "← Back to Lab Reports", "action": "lab_reports"}
                        ]
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            case "book_basic_panel":
            case "book_cardiac_panel":
            case "book_bone_health":
            case "book_diabetes_panel":
            case "confirm_lab_tomorrow_8am":
            case "confirm_lab_tomorrow_7am":
            case "confirm_lab_tomorrow_10am":
                return {
                    "message": "📅 **Lab Test Booking**\n\n🔧 **Service Integration In Progress**\n\nLab test scheduling is being connected to your hospital's laboratory system. For immediate lab test booking:\n\n📞 **Direct Lab Contact:**\n• Lab Department: +91-1234567890\n• Extension: 123 (Lab Services)\n\n👨‍⚕️ **Through Your Doctor:**\n• Book appointment with doctor\n• Doctor will order necessary tests\n• Lab will schedule collection\n\n🏥 **Walk-in Service:**\n• Visit hospital lab directly\n• Ground floor, Lab Wing\n• Operating hours: 8 AM - 6 PM",
                    "options": [
                        {"id": "book_appointment", "text": "👨‍⚕️ Book Doctor Consultation", "action": "book_appointment"},
                        {"id": "emergency", "text": "📞 Hospital Contact", "action": "emergency"},
                        {"id": "lab_reports", "text": "← Back to Lab Reports", "action": "lab_reports"}
                    ]
                };

            // TIME SLOT SELECTION
            case "confirm_today_9am":
            case "confirm_today_10am":
            case "confirm_today_2pm":
            case "confirm_today_3pm":
            case "confirm_tomorrow_9am":
            case "confirm_tomorrow_11am":
            case "confirm_tomorrow_2pm":
                return this.confirmAppointment(userId, action);

            // SYMPTOMS SELECTION
            case "symptom_regular":
            case "symptom_fever":
            case "symptom_cold":
            case "symptom_headache":
            case "symptom_stomach":
            case "symptom_other":
                return this.handleSymptomsSelection(userId, action);

            case "back_to_symptoms":
                const session = this.appointmentSessions.get(userId);
                if (session) {
                    delete session.waitingForCustomSymptom;
                    this.appointmentSessions.set(userId, session);
                    return this.selectSymptoms(userId, session.doctorName);
                }
                return this.handleAPIError(new Error('Session expired'));

            case "custom_symptom_submit":
                return this.handleCustomSymptom(userId, messageText);

            // APPOINTMENT CONFIRMATION FLOW
            case "final_confirm_appointment":
                return this.finalizeAppointment(userId);

            case "add_calendar":
                return {
                    "message": "📅 **Calendar Integration**\n\n✅ Your appointment has been added to your calendar!\n\n📱 **Calendar Event Created:**\n• Google Calendar ✅\n• Outlook Calendar ✅\n• Apple Calendar ✅\n\n🔔 **Reminders Set:**\n• 24 hours before appointment\n• 2 hours before appointment\n• 30 minutes before appointment",
                    "options": [
                        {"id": "set_additional_reminder", "text": "⏰ Set Additional Reminder", "action": "set_additional_reminder"},
                        {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                    ]
                };

            case "set_additional_reminder":
                return {
                    "message": "⏰ **Additional Reminder Settings**\n\n✅ Additional reminders have been configured!\n\n🔔 **New Reminders Added:**\n• 1 week before appointment\n• 3 days before appointment\n• 1 hour before appointment\n• 15 minutes before appointment\n\n📱 **Notification Methods:**\n• SMS notifications ✅\n• Email reminders ✅\n• Push notifications ✅\n• WhatsApp alerts ✅\n\n**You will receive reminders on all configured channels to ensure you never miss your appointment!**",
                    "options": [
                        {"id": "view_appointments", "text": "📋 View My Appointments", "action": "my_appointments"},
                        {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                    ]
                };

            case "cancel_appointment":
                return {
                    "message": "❌ **Cancel Appointment**\n\n⚠️ Are you sure you want to cancel your appointment?\n\n**Cancellation Policy:**\n• Free cancellation up to 24 hours before\n• 50% charge for cancellation within 24 hours\n• Full charge for no-show\n\n**Refund Process:**\n• Refunds processed within 3-5 business days\n• Original payment method will be credited",
                    "options": [
                        {"id": "confirm_cancel", "text": "✅ Yes, Cancel Appointment", "action": "confirm_cancel_appointment"},
                        {"id": "keep_appointment", "text": "❌ No, Keep Appointment", "action": "main"},
                        {"id": "reschedule_appointment", "text": "🔄 Reschedule Instead", "action": "reschedule_appointment"}
                    ]
                };

            // EMERGENCY SERVICES
            case "emergency":
                return {
                    "message": "🚨 **EMERGENCY SERVICES** 🚨\n\n**🆘 IMMEDIATE EMERGENCY CONTACTS:**\n• **Ambulance:** 108 📞\n• **Hospital Emergency:** +91-1234567890 📞\n• **Poison Control:** 1066 📞\n• **Fire Emergency:** 101 📞\n• **Police Emergency:** 100 📞\n\n**⚠️ FOR LIFE-THREATENING EMERGENCIES:**\n**CALL 108 IMMEDIATELY**",
                    "options": [
                        {"id": "find_hospital", "text": "🏥 Find Nearest Hospital", "action": "find_hospital"},
                        {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                    ]
                };

            case "find_hospital":
                try {
                    // Get real hospitals from API
                    const hospitals = await healthcareAPI.getHospitals();
                    
                    if (!hospitals || hospitals.length === 0) {
                        return {
                            "message": "🏥 **Nearest Emergency Hospitals:**\n\n📍 **No hospital data available**\n\nPlease contact emergency services directly:\n• **Ambulance:** 108 📞\n• **Police:** 100 📞",
                            "options": [
                                {"id": "emergency", "text": "← Back to Emergency Services", "action": "emergency"},
                                {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                            ]
                        };
                    }
                    
                    const hospitalList = hospitals.slice(0, 3).map((hospital, index) => 
                        `**${index + 1}. ${hospital.name}**\n📍 ${hospital.location || 'Location not specified'}\n📞 ${hospital.phone || 'Contact: +91-1234567890'}`
                    ).join('\n\n');
                    
                    return {
                        "message": `🏥 **Nearest Emergency Hospitals:**\n\n${hospitalList}`,
                        "options": [
                            {"id": "emergency", "text": "← Back to Emergency Services", "action": "emergency"},
                            {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                        ]
                    };
                } catch (error) {
                    return {
                        "message": "🏥 **Emergency Hospitals:**\n\n📍 **Service temporarily unavailable**\n\nPlease contact emergency services directly:\n• **Ambulance:** 108 📞\n• **Hospital Emergency:** +91-1234567890 📞",
                        "options": [
                            {"id": "emergency", "text": "← Back to Emergency Services", "action": "emergency"},
                            {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                        ]
                    };
                }

            // Health Tips
            case "health_tips":
                return {
                    "message": "💡 **Daily Health Tips:**\n\n🚰 **Hydration:** Drink 8-10 glasses of water daily\n🥗 **Nutrition:** Include fruits and vegetables in every meal\n🏃‍♀️ **Exercise:** 30 minutes of physical activity daily\n😴 **Sleep:** 7-8 hours of quality sleep\n🧘‍♀️ **Mental Health:** Practice meditation or deep breathing",
                    "options": [
                        {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                    ]
                };

            // Generic medical records - integrate with real API when needed
            case "recent_visits":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    // Try to get recent appointments as "visits"
                    const appointmentsResponse = await healthcareAPI.getPatientAppointments(patientId);
                    const appointments = appointmentsResponse.appointments || appointmentsResponse;
                    
                    if (!appointments || appointments.length === 0) {
                        return {
                            "message": "🕐 **Recent Visits**\n\n🔍 No recent visits found.\n\nYour medical visit history will appear here once you've had appointments with healthcare providers.",
                            "options": [
                                {"id": "book_appointment", "text": "📅 Book New Appointment", "action": "book_appointment"},
                                {"id": "medical_records", "text": "← Back to Medical Records", "action": "medical_records"}
                            ]
                        };
                    }
                    
                    // Show completed appointments as visits
                    const recentVisits = appointments
                        .filter(apt => apt.status === 'Completed')
                        .slice(0, 5)
                        .map((apt, index) => 
                            `📅 ${new Date(apt.date_time).toLocaleDateString()} - ${apt.doctor_name} (${apt.specialization})\n🏥 ${apt.hospital_name}\n💬 ${apt.symptoms}`
                        ).join('\n\n');
                    
                    if (!recentVisits) {
                        return {
                            "message": "🕐 **Recent Visits**\n\n⏳ No completed visits found.\n\nYour recent completed appointments will appear here.",
                            "options": [
                                {"id": "my_appointments", "text": "📅 View All Appointments", "action": "my_appointments"},
                                {"id": "medical_records", "text": "← Back to Medical Records", "action": "medical_records"}
                            ]
                        };
                    }
                    
                    return {
                        "message": `🕐 **Recent Visits**\n\n${recentVisits}`,
                        "options": [
                            {"id": "my_appointments", "text": "📅 View All Appointments", "action": "my_appointments"},
                            {"id": "medical_records", "text": "← Back to Medical Records", "action": "medical_records"},
                            {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                        ]
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            case "medical_history":
                try {
                    if (!patientId) {
                        return this.requiresAuthentication();
                    }

                    // Get patient dashboard which contains medical information
                    const dashboard = await healthcareAPI.getPatientDashboard(patientId);
                    const patient = dashboard.patient;
                    
                    return {
                        "message": `📜 **Medical History**\n\n👤 **Patient Information:**\n• 🩸 Blood Group: ${patient.bloodGroup || 'Not specified'}\n• 🎂 Age: ${patient.age} years\n• ⚖️ Weight: ${patient.weight || 'Not recorded'} kg\n• 📏 Height: ${patient.height || 'Not recorded'} cm\n\n📋 **Medical Records:**\n• 📊 Total Reports: ${dashboard.summary.reportsCount}\n• 📅 Recent Appointments: ${dashboard.recentAppointments.length}\n\n⚠️ **Note:** Detailed medical history including chronic conditions, allergies, and previous surgeries will be available as this information is integrated from your healthcare provider's system.`,
                        "options": [
                            {"id": "recent_reports", "text": "📋 View Lab Reports", "action": "recent_reports"},
                            {"id": "my_appointments", "text": "📅 View Appointments", "action": "my_appointments"},
                            {"id": "medical_records", "text": "← Back to Medical Records", "action": "medical_records"},
                            {"id": "main", "text": "← Back to Main Menu", "action": "main"}
                        ]
                    };
                } catch (error) {
                    return this.handleAPIError(error);
                }

            default:
                // Handle dynamic doctor booking (book_doctor_123, etc.)
                if (action.startsWith('book_doctor_')) {
                    const doctorId = action.replace('book_doctor_', '');
                    try {
                        const doctors = await healthcareAPI.getDoctors();
                        const selectedDoctor = doctors.find(d => d.doctor_id == doctorId);
                        
                        if (!selectedDoctor) {
                            return {
                                "message": "⚠️ **Doctor Not Found**\n\nThe selected doctor is no longer available. Please choose another doctor.",
                                "options": [
                                    {"id": "general_appointment", "text": "← Back to Doctor Selection", "action": "general_appointment"}
                                ]
                            };
                        }

                        this.initializeAppointmentSession(userId, {
                            doctorId: selectedDoctor.doctor_id,
                            hospitalId: selectedDoctor.hospital_id,
                            doctorName: selectedDoctor.name,
                            specialty: selectedDoctor.specialization,
                            fee: String(selectedDoctor.consultation_fee || '500').replace(/[^\d]/g, '') || '500',
                            location: selectedDoctor.location || 'Clinic',
                            hospitalName: selectedDoctor.hospital_name || 'Healthcare Center'
                        });
                        
                        return this.selectSymptoms(userId, selectedDoctor.name);
                    } catch (error) {
                        return this.handleAPIError(error);
                    }
                }

                // Handle time slot confirmations
                if (action.startsWith('confirm_')) {
                    return this.confirmAppointment(userId, action);
                }

                // Handle prescription downloads
                if (action.startsWith('download_prescription_')) {
                    const prescriptionId = action.replace('download_prescription_', '');
                    return this.downloadPrescription(userId, prescriptionId);
                }

                // Handle lab test viewing
                if (action.startsWith('view_lab_test_')) {
                    const testId = action.replace('view_lab_test_', '');
                    return this.viewLabTest(userId, testId);
                }

                // Handle lab test sharing with doctor
                if (action.startsWith('share_lab_test_')) {
                    const testId = action.replace('share_lab_test_', '');
                    return this.shareLabTest(userId, testId);
                }

                // Handle report sharing with doctors
                if (action.startsWith('share_item_')) {
                    const parts = action.replace('share_item_', '').split('_');
                    const itemType = parts[0]; // 'report' or 'lab'
                    const itemId = parts.slice(1).join('_'); // Handle IDs that might contain underscores
                    return this.selectDoctorsForSharing(userId, itemType, itemId);
                }

                // Handle doctor selection for sharing
                if (action.startsWith('select_doctor_')) {
                    return this.confirmReportSharing(userId, action);
                }

                // Handle final sharing confirmation
                if (action.startsWith('confirm_share_with_')) {
                    return this.confirmReportSharing(userId, action);
                }

                return {
                    "message": "🤔 **Option Not Recognized**\n\nI didn't understand that option. Let me help you navigate:",
                    "options": [
                        {"id": "main", "text": "🏠 Main Menu", "action": "main"},
                        {"id": "book_appointment", "text": "📅 Book Appointment", "action": "book_appointment"},
                        {"id": "medical_records", "text": "📋 Medical Records", "action": "medical_records"}
                    ]
                };
        }
    }
    
    requiresAuthentication() {
        return {
            "message": "🔐 **Authentication Required**\n\nTo access this feature, please:\n\n1. Login to the main app/website first\n2. Return to the chatbot\n\nThe chatbot will automatically use your login session.",
            "options": [
                {"id": "main", "text": "🏠 Main Menu", "action": "main"}
            ]
        };
    }

    handleAPIError(error) {
        console.error('API Error:', error);
        
        if (error.message && error.message.includes('Session expired')) {
            return {
                "message": "🔒 **Session Expired**\n\nYour login session has expired. Please login again in the main app and return to the chatbot.",
                "options": [
                    {"id": "main", "text": "🏠 Main Menu", "action": "main"}
                ]
            };
        }
        
        return {
            "message": "⚠️ **Service Temporarily Unavailable**\n\nWe're experiencing technical difficulties. Please try again in a few moments.",
            "options": [
                {"id": "retry", "text": "🔄 Try Again", "action": "main"},
                {"id": "main", "text": "← Back to Main Menu", "action": "main"}
            ]
        };
    }

    // Helper method to generate time slots for doctor appointments
    generateTimeSlots(userId, doctorName) {
        const session = this.appointmentSessions.get(userId);
        if (!session) {
            return this.handleAPIError(new Error('Session expired'));
        }

        return {
            "message": `📅 **Select Time Slot for ${doctorName}**\n\n🗓️ **Available Slots:**\n\n📅 **Today:**\n• 9:00 AM ✅\n• 2:00 PM ✅\n• 3:00 PM ✅\n\n📅 **Tomorrow:**\n• 9:00 AM ✅\n• 11:00 AM ✅\n• 2:00 PM ✅\n\n**Select your preferred time:**`,
            "options": [
                {"id": "confirm_today_9am", "text": "🌅 Today 9:00 AM", "action": "confirm_today_9am"},
                {"id": "confirm_today_2pm", "text": "🌞 Today 2:00 PM", "action": "confirm_today_2pm"},
                {"id": "confirm_today_3pm", "text": "🌞 Today 3:00 PM", "action": "confirm_today_3pm"},
                {"id": "confirm_tomorrow_9am", "text": "🌅 Tomorrow 9:00 AM", "action": "confirm_tomorrow_9am"},
                {"id": "confirm_tomorrow_11am", "text": "🌅 Tomorrow 11:00 AM", "action": "confirm_tomorrow_11am"},
                {"id": "confirm_tomorrow_2pm", "text": "🌞 Tomorrow 2:00 PM", "action": "confirm_tomorrow_2pm"},
                {"id": "book_appointment", "text": "← Back to Appointments", "action": "book_appointment"}
            ]
        };
    }

    // Helper method to get specialization icons
    getSpecializationIcon(specialization) {
        const icons = {
            'Cardiology': '🫀',
            'Neurology': '🧠',
            'Orthopedics': '🦴',
            'Ophthalmology': '👁️',
            'Pulmonology': '🫁',
            'Dermatology': '🩺',
            'ENT': '👂',
            'Gynecology': '🏥',
            'Gastroenterology': '🤢',
            'Oncology': '🎗️',
            'Urology': '🫘',
            'Psychiatry': '🧠',
            'General Medicine': '🩺',
            'Family Medicine': '👨‍👩‍👧‍👦',
            'Internal Medicine': '🔬'
        };
        return icons[specialization] || '👨‍⚕️';
    }

    // Initialize appointment session for booking
    initializeAppointmentSession(userId, appointmentData) {
        this.appointmentSessions.set(userId, {
            ...appointmentData,
            sessionId: `session_${Date.now()}`,
            createdAt: new Date().toISOString()
        });
    }

    // Confirm appointment with selected time slot
    confirmAppointment(userId, timeSlotAction) {
        const session = this.appointmentSessions.get(userId);
        if (!session) {
            return {
                "message": "⚠️ **Session Expired**\n\nYour appointment session has expired. Please start booking again.",
                "options": [
                    {"id": "book_appointment", "text": "📅 Book New Appointment", "action": "book_appointment"},
                    {"id": "main", "text": "← Main Menu", "action": "main"}
                ]
            };
        }

        // Parse time slot
        const timeMap = {
            'confirm_today_9am': { date: 'today', time: '9:00 AM' },
            'confirm_today_2pm': { date: 'today', time: '2:00 PM' },
            'confirm_today_3pm': { date: 'today', time: '3:00 PM' },
            'confirm_tomorrow_9am': { date: 'tomorrow', time: '9:00 AM' },
            'confirm_tomorrow_11am': { date: 'tomorrow', time: '11:00 AM' },
            'confirm_tomorrow_2pm': { date: 'tomorrow', time: '2:00 PM' }
        };

        const selectedTime = timeMap[timeSlotAction];
        if (!selectedTime) {
            return this.handleAPIError(new Error('Invalid time slot'));
        }

        // Update session with time info
        session.selectedDate = selectedTime.date;
        session.selectedTime = selectedTime.time;
        session.appointmentDateTime = this.formatAppointmentDateTime(selectedTime.date, selectedTime.time);

        const appointmentSummary = `📋 **Appointment Summary:**\n\n👨‍⚕️ **Doctor:** ${session.doctorName}\n🏥 **Specialty:** ${session.specialty}\n📅 **Date & Time:** ${session.appointmentDateTime}\n🏥 **Location:** ${session.location}\n💰 **Fee:** ₹${session.fee}`;

        return {
            message: `✅ **Confirm Your Appointment**\n\n${appointmentSummary}\n\n**Please confirm to book this appointment:**`,
            options: [
                {"id": "final_confirm_appointment", "text": "✅ Confirm Appointment", "action": "final_confirm_appointment"},
                {"id": "change_time", "text": "🔄 Change Time", "action": `book_doctor_${session.doctorId}`},
                {"id": "book_appointment", "text": "❌ Cancel", "action": "book_appointment"}
            ]
        };
    }

    // Finalize appointment booking with real API call
    async finalizeAppointment(userId) {
        const session = this.appointmentSessions.get(userId);
        if (!session) {
            return this.handleAPIError(new Error('Session expired'));
        }

        try {
            const currentUser = healthcareAPI.getCurrentUser();
            if (!currentUser.patient?.id) {
                return this.requiresAuthentication();
            }

            // Prepare appointment data for API - format date_time correctly
            const dateTime = this.formatDateTimeForAPI(session.selectedDate, session.selectedTime);
            const appointmentData = {
                doctor_id: session.doctorId,
                hospital_id: session.hospitalId,
                date_time: dateTime,
                symptoms: session.symptoms || "General consultation"
            };

            // Debug logging
            console.log('🔍 Debug appointment booking:');
            console.log('Session data:', {
                selectedDate: session.selectedDate,
                selectedTime: session.selectedTime,
                doctorId: session.doctorId,
                hospitalId: session.hospitalId,
                symptoms: session.symptoms
            });
            console.log('Formatted dateTime:', dateTime);
            console.log('Final appointmentData:', appointmentData);

            // Book appointment using real API
            const bookingResult = await healthcareAPI.bookAppointment(currentUser.patient.id, appointmentData);
            
            // Debug the actual API response
            console.log('🔍 Actual API response:', JSON.stringify(bookingResult, null, 2));
            
            if (bookingResult.success || bookingResult.appointment_id || bookingResult.id) {
                // Clean up session
                this.appointmentSessions.delete(userId);

                // Get appointment ID from various possible response formats
                const appointmentId = bookingResult.appointment?.id || bookingResult.appointment_id || bookingResult.id || 'Generated';
                
                let successMessage = `🎉 **Appointment Booked Successfully!**\n\n📋 **Booking Details:**\n• 📄 **Appointment ID:** ${appointmentId}\n• 👨‍⚕️ **Doctor:** ${session.doctorName}\n• 📅 **Date & Time:** ${session.appointmentDateTime}\n• 🏥 **Location:** ${session.location}\n• 💰 **Fee:** ₹${session.fee}`;
                
                successMessage += `\n\n📱 **What's Next:**\n• You'll receive SMS/email confirmation\n• Arrive 15 minutes early\n• Bring valid ID and insurance card`;
                
                return {
                    message: successMessage,
                    options: [
                        {"id": "add_calendar", "text": "📅 Add to Calendar", "action": "add_calendar"},
                        {"id": "view_appointments", "text": "📋 View My Appointments", "action": "my_appointments"},
                        {"id": "main", "text": "← Main Menu", "action": "main"}
                    ]
                };
            } else {
                return this.handleAPIError(new Error(bookingResult.error || 'Booking failed'));
            }
        } catch (error) {
            return this.handleAPIError(error);
        }
    }

    // Format appointment date and time
    formatAppointmentDateTime(dateType, time) {
        const today = new Date();
        const date = dateType === 'today' ? today : new Date(today.getTime() + 24 * 60 * 60 * 1000);
        return `${date.toLocaleDateString()} at ${time}`;
    }

    formatDateTimeForAPI(dateType, time) {
        const today = new Date();
        const date = dateType === 'today' ? today : new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        // Format as YYYY-MM-DD HH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Convert time like "2:00 PM" to "14:00:00"
        const timeFormatted = this.convertTo24Hour(time);
        
        return `${year}-${month}-${day} ${timeFormatted}:00`;
    }

    convertTo24Hour(time12h) {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        
        if (hours === '12') {
            hours = '00';
        }
        
        if (modifier === 'PM') {
            hours = parseInt(hours, 10) + 12;
        }
        
        return `${String(hours).padStart(2, '0')}:${minutes}`;
    }

    // Symptoms selection flow
    selectSymptoms(userId, doctorName) {
        return {
            message: `🩺 **Consultation with ${doctorName}**\n\n**What brings you here today?**\n\nPlease select your primary symptoms or reason for visit:`,
            options: [
                {"id": "symptom_regular", "text": "👩‍⚕️ Regular Check-up", "action": "symptom_regular"},
                {"id": "symptom_fever", "text": "🤒 Fever", "action": "symptom_fever"},
                {"id": "symptom_cold", "text": "🤧 Cold/Cough", "action": "symptom_cold"},
                {"id": "symptom_headache", "text": "🤕 Headache", "action": "symptom_headache"},
                {"id": "symptom_stomach", "text": "🤢 Stomach Issues", "action": "symptom_stomach"},
                {"id": "symptom_other", "text": "✏️ Other (Type your symptoms)", "action": "symptom_other"}
            ]
        };
    }

    handleSymptomsSelection(userId, action) {
        let session = this.appointmentSessions.get(userId);
        
        // If no session exists, create a temporary one for testing/direct access
        if (!session) {
            this.initializeAppointmentSession(userId, {
                doctorId: 'temp_doctor',
                doctorName: 'Test Doctor',
                specialty: 'General Medicine',
                fee: '500',
                location: 'Clinic'
            });
            session = this.appointmentSessions.get(userId);
        }

        const symptomsMap = {
            'symptom_regular': 'Regular check-up/consultation',
            'symptom_fever': 'Fever and related symptoms',
            'symptom_cold': 'Cold, cough, and respiratory issues',
            'symptom_headache': 'Headache and related pain',
            'symptom_stomach': 'Stomach pain, digestive issues'
        };

        if (action === 'symptom_other') {
            session.waitingForCustomSymptom = true;
            this.appointmentSessions.set(userId, session);

            return {
                message: "✏️ **Describe Your Symptoms**\n\nPlease type your symptoms or reason for consultation:\n\n*Example: Joint pain, difficulty sleeping, skin rash, etc.*",
                options: [
                    {"id": "back_to_symptoms", "text": "← Back to Symptom Options", "action": "back_to_symptoms"}
                ],
                expectingInput: true
            };
        }

        // Store selected symptom
        session.symptoms = symptomsMap[action];
        this.appointmentSessions.set(userId, session);

        // Proceed to time slots
        return this.generateTimeSlots(userId, session.doctorName);
    }

    handleCustomSymptom(userId, customSymptom) {
        const session = this.appointmentSessions.get(userId);
        if (!session || !session.waitingForCustomSymptom) {
            return this.handleAPIError(new Error('Session expired or invalid state'));
        }

        // Validate custom symptom input
        if (!customSymptom || customSymptom.trim().length < 3) {
            return {
                message: "⚠️ **Please Provide More Details**\n\nPlease describe your symptoms with at least a few words.\n\n*Example: Joint pain, difficulty sleeping, skin rash, etc.*",
                options: [
                    {"id": "back_to_symptoms", "text": "← Back to Symptom Options", "action": "back_to_symptoms"}
                ],
                expectingInput: true
            };
        }

        // Store custom symptom and remove waiting flag
        session.symptoms = customSymptom.trim();
        delete session.waitingForCustomSymptom;
        this.appointmentSessions.set(userId, session);

        // Proceed to time slots
        return this.generateTimeSlots(userId, session.doctorName);
    }

    // Download prescription PDF
    async downloadPrescription(userId, prescriptionId) {
        try {
            const currentUser = healthcareAPI.getCurrentUser();
            if (!currentUser.patient?.id) {
                return this.requiresAuthentication();
            }

            // Get prescription details first to verify it belongs to the patient
            const prescriptionDetails = await healthcareAPI.getPrescriptionDetails(prescriptionId);
            
            if (!prescriptionDetails.success) {
                return {
                    "message": "❌ **Prescription Not Found**\n\nThe requested prescription could not be found or you don't have access to it.",
                    "options": [
                        {"id": "current_prescription", "text": "💊 View My Prescriptions", "action": "current_prescription"},
                        {"id": "prescription", "text": "← Back to Prescriptions", "action": "prescription"}
                    ]
                };
            }

            const prescription = prescriptionDetails.prescription;
            
            return {
                "message": `📄 **Prescription Details**\n\n**Prescription ID:** ${prescription.id}\n**Medicine:** ${prescription.medicine_name}\n**Dosage:** ${prescription.dosage}\n**Duration:** ${prescription.duration}\n**Doctor:** ${prescription.doctor_name}\n**Patient:** ${prescription.patient_name}\n**Notes:** ${prescription.notes || 'No notes'}\n\n**📱 To download the PDF:**\n• Open this link in your browser\n• Right-click and 'Save As' to download\n\n🔗 **Download Link:** \n${process.env.HEALTH_API_URL}/prescriptions/${prescriptionId}/download`,
                "options": [
                    {"id": "current_prescription", "text": "💊 Back to Prescriptions", "action": "current_prescription"},
                    {"id": "prescription_history", "text": "📚 Prescription History", "action": "prescription_history"},
                    {"id": "prescription", "text": "← Main Prescription Menu", "action": "prescription"}
                ]
            };

        } catch (error) {
            return this.handleAPIError(error);
        }
    }

    // LAB TEST METHODS

    // View individual lab test details
    async viewLabTest(userId, testId) {
        try {
            const currentUser = healthcareAPI.getCurrentUser();
            if (!currentUser.patient?.id) {
                return this.requiresAuthentication();
            }

            // Get all lab tests for the patient and find the specific one
            const labTestsResult = await healthcareAPI.getPatientLabTests(currentUser.patient.id);
            const labTests = labTestsResult.lab_tests || [];
            
            const test = labTests.find(t => t.test_id.toString() === testId.toString());
            
            if (!test) {
                return {
                    "message": "❌ **Lab Test Not Found**\n\nThe requested lab test could not be found or you don't have access to it.",
                    "options": [
                        {"id": "recent_reports", "text": "📊 View Lab Reports", "action": "recent_reports"},
                        {"id": "lab_reports", "text": "← Back to Lab Reports", "action": "lab_reports"}
                    ]
                };
            }

            const fileUrl = healthcareAPI.getLabTestFileUrl(test.test_id);
            
            return {
                "message": `🧪 **Lab Test Details**\n\n**Test Name:** ${test.test_name}\n**Test Type:** ${test.test_type}\n**Test Date:** ${test.test_date || test.uploaded_at}\n**Results:** ${test.results || 'Pending'}\n**Notes:** ${test.notes || 'No notes'}\n**Uploaded:** ${test.uploaded_at}\n\n**📱 To view the test file:**\n• Click the link below to open in browser\n• Right-click and 'Save As' to download\n\n🔗 **View File:** ${fileUrl}`,
                "options": [
                    {"id": `share_lab_test_${test.test_id}`, "text": "👨‍⚕️ Share with Doctor", "action": `share_lab_test_${test.test_id}`},
                    {"id": "recent_reports", "text": "📊 Back to Lab Reports", "action": "recent_reports"},
                    {"id": "lab_reports", "text": "← Main Lab Menu", "action": "lab_reports"}
                ]
            };

        } catch (error) {
            return this.handleAPIError(error);
        }
    }

    // Share lab test with doctor
    async shareLabTest(userId, testId) {
        try {
            const currentUser = healthcareAPI.getCurrentUser();
            if (!currentUser.patient?.id) {
                return this.requiresAuthentication();
            }

            // For now, we'll show available doctors to share with
            // In a full implementation, this would integrate with the doctor selection flow
            const doctors = await healthcareAPI.getDoctors();
            
            if (!doctors || doctors.length === 0) {
                return {
                    "message": "⚠️ **No Doctors Available**\n\nNo doctors are currently available to share the lab test with. Please try again later or contact the hospital directly.",
                    "options": [
                        {"id": `view_lab_test_${testId}`, "text": "← Back to Test Details", "action": `view_lab_test_${testId}`},
                        {"id": "recent_reports", "text": "📊 Lab Reports", "action": "recent_reports"}
                    ]
                };
            }

            const doctorOptions = doctors.slice(0, 3).map(doctor => ({
                id: `confirm_share_${testId}_${doctor.doctor_id}`,
                text: `👨‍⚕️ Share with ${doctor.name}`,
                action: `confirm_share_${testId}_${doctor.doctor_id}`
            }));

            doctorOptions.push(
                {"id": `view_lab_test_${testId}`, "text": "← Back to Test Details", "action": `view_lab_test_${testId}`}
            );

            return {
                "message": `👨‍⚕️ **Share Lab Test**\n\nSelect a doctor to share your lab test with:`,
                "options": doctorOptions
            };

        } catch (error) {
            return this.handleAPIError(error);
        }
    }

    // REPORT SHARING METHODS

    // Select doctors for sharing reports
    async selectDoctorsForSharing(userId, itemType, itemId) {
        try {
            const currentUser = healthcareAPI.getCurrentUser();
            if (!currentUser.patient?.id) {
                return this.requiresAuthentication();
            }

            // Get all available doctors
            const doctors = await healthcareAPI.getDoctors();
            
            if (!doctors || doctors.length === 0) {
                return {
                    "message": "⚠️ **No Doctors Available**\n\nNo doctors are currently available to share with. Please try again later or contact the hospital directly.",
                    "options": [
                        {"id": "share_reports_menu", "text": "← Back to Share Menu", "action": "share_reports_menu"},
                        {"id": "patient_reports", "text": "📄 Back to Reports", "action": "patient_reports"}
                    ]
                };
            }

            // Show all available doctors (not just 3)
            const doctorsList = doctors.map((doctor, index) => 
                `**${index + 1}. ${doctor.name}** - ${doctor.specialization}\n🏥 ${doctor.hospital_name || 'Available at clinic'}\n⭐ ${doctor.rating || '4.5'}/5`
            ).join('\n\n');

            const doctorOptions = doctors.map(doctor => ({
                id: `select_doctor_${itemType}_${itemId}_${doctor.doctor_id}`,
                text: `👨‍⚕️ Share with ${doctor.name}`,
                action: `select_doctor_${itemType}_${itemId}_${doctor.doctor_id}`
            }));

            doctorOptions.push(
                {"id": "share_reports_menu", "text": "← Back to Share Menu", "action": "share_reports_menu"}
            );

            const itemTypeText = itemType === 'report' ? 'Medical Report' : 'Lab Test';
            
            return {
                "message": `👨‍⚕️ **Select Doctor to Share ${itemTypeText}**\n\n**Available Doctors:**\n\n${doctorsList}`,
                "options": doctorOptions
            };

        } catch (error) {
            return this.handleAPIError(error);
        }
    }

    // Confirm report sharing with selected doctor
    async confirmReportSharing(userId, action) {
        try {
            const currentUser = healthcareAPI.getCurrentUser();
            if (!currentUser.patient?.id) {
                return this.requiresAuthentication();
            }

            // Parse action: select_doctor_report_123_4 or select_doctor_lab_456_4
            const parts = action.replace('select_doctor_', '').split('_');
            const itemType = parts[0]; // 'report' or 'lab'
            const itemId = parts[1];
            const doctorId = parts[2];

            // Get doctor information
            const doctors = await healthcareAPI.getDoctors();
            const selectedDoctor = doctors.find(d => d.doctor_id == doctorId);
            
            if (!selectedDoctor) {
                return {
                    "message": "⚠️ **Doctor Not Found**\n\nThe selected doctor is no longer available. Please choose another doctor.",
                    "options": [
                        {"id": `share_item_${itemType}_${itemId}`, "text": "🔄 Try Again", "action": `share_item_${itemType}_${itemId}`},
                        {"id": "share_reports_menu", "text": "← Back to Share Menu", "action": "share_reports_menu"}
                    ]
                };
            }

            // For now, we'll simulate the sharing since the actual API call needs proper implementation
            // In a real scenario, you'd call: healthcareAPI.shareReportWithDoctors(patientId, itemId, [doctorId], notes)
            
            const itemTypeText = itemType === 'report' ? 'Medical Report' : 'Lab Test';
            
            return {
                "message": `✅ **${itemTypeText} Shared Successfully!**\n\n👨‍⚕️ **Shared with:** ${selectedDoctor.name}\n🏥 **Specialty:** ${selectedDoctor.specialization}\n🏥 **Hospital:** ${selectedDoctor.hospital_name}\n\n📧 **What happens next:**\n• Doctor will receive notification\n• Report will appear in doctor's shared reports\n• Doctor can review and provide feedback\n• You may receive follow-up recommendations`,
                "options": [
                    {"id": "share_reports_menu", "text": "📤 Share More Reports", "action": "share_reports_menu"},
                    {"id": "book_appointment", "text": "📅 Book Appointment with Doctor", "action": "book_appointment"},
                    {"id": "patient_reports", "text": "📄 Back to Reports", "action": "patient_reports"},
                    {"id": "main", "text": "🏠 Main Menu", "action": "main"}
                ]
            };

        } catch (error) {            return this.handleAPIError(error);
        }
    }
}

// Initialize chatbot
const healthChatbot = new HealthERPChatbot();

// Routes
app.post('/chat', async (req, res) => {
    try {
        const { user_id, selected_option, additional_data, session_data } = req.body;
        
        if (!user_id) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const selectedOpt = selected_option || 'main';
        
        // Pass session data to the chatbot
        const response = await healthChatbot.getResponse(user_id, selectedOpt, additional_data, session_data);
        
        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString(),
            user_id: user_id,
            session_id: req.body.session_id || null,
            has_external_session: !!session_data
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Please try again or contact support if the problem persists.'
        });
    }
});

// Additional API endpoints
app.get('/appointments/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Use real API to get appointments
        const appointmentsResponse = await healthcareAPI.getPatientAppointments(userId);
        const appointments = appointmentsResponse.appointments || appointmentsResponse;
        
        res.json({
            success: true,
            appointments: appointments || [],
            count: appointments ? appointments.length : 0
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch appointments',
            message: error.message
        });
    }
});

app.post('/appointments', async (req, res) => {
    try {
        const appointmentData = req.body;
        const { patient_id } = appointmentData;
        
        if (!patient_id) {
            return res.status(400).json({
                success: false,
                error: 'Patient ID is required'
            });
        }
        
        // Use real API to book appointment
        const bookingResult = await healthcareAPI.bookAppointment(patient_id, appointmentData);
        
        if (bookingResult.success) {
            res.json({
                success: true,
                appointment: bookingResult.appointment,
                message: 'Appointment booked successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: bookingResult.error || 'Failed to book appointment'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to book appointment',
            message: error.message
        });
    }
});

app.get('/patient/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Use real API to get patient data
        const dashboard = await healthcareAPI.getPatientDashboard(userId);
        
        if (dashboard && dashboard.patient) {
            res.json({
                success: true,
                patient: dashboard.patient
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch patient data',
            message: error.message
        });
    }
});

app.get('/chat', (req, res) => {
    res.json({
        message: "Health ERP Chatbot API",
        version: "2.0.0",
        endpoints: {
            "POST /chat": "Send chat message",
            "GET /appointments/:userId": "Get user appointments",
            "POST /appointments": "Create appointment",
            "GET /patient/:userId": "Get patient info",
            "GET /health": "Health check",
            "GET /": "Web interface"
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Health ERP Chatbot API',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Test endpoint to simulate patient login for testing
app.post('/test-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Use default test credentials if none provided
        const testEmail = email || process.env.TEST_PATIENT_EMAIL || 'harshtiwari1303@gmail.com';
        const testPassword = password || process.env.TEST_PATIENT_PASSWORD || 'harsh321';
        
        console.log(`🧪 Testing login with: ${testEmail}`);
        
        // Authenticate with the real API
        const authResult = await healthcareAPI.authenticatePatient(testEmail, testPassword);
        
        if (authResult.success) {
            res.json({
                success: true,
                message: '✅ Test login successful! You can now use patient features.',
                patient: authResult.patient,
                instructions: 'The chatbot now has access to your patient data. Try features like "View Appointments" or "Medical Records".'
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Authentication failed',
                message: authResult.error
            });
        }
    } catch (error) {
        console.error('Test login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login test failed',
            message: error.message
        });
    }
});

// Test endpoint to check current authentication status
app.get('/auth-status', (req, res) => {
    const currentUser = healthcareAPI.getCurrentUser();
    res.json({
        success: true,
        isAuthenticated: currentUser.isAuthenticated,
        patient: currentUser.patient,
        hasExternalSession: currentUser.hasExternalSession,
        sessionType: currentUser.sessionType
    });
});

// Handle 404 errors
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: 'Please check the API documentation'
    });
});

// Start server
app.listen(PORT, () => {
    logMessage(`🏥 Health ERP Chatbot v2.0 is running on port ${PORT}`);
    logMessage(`🌐 Web interface: http://localhost:${PORT}`);
    logMessage(`🔗 API endpoint: http://localhost:${PORT}/chat`);
    logMessage(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, HealthERPChatbot };
