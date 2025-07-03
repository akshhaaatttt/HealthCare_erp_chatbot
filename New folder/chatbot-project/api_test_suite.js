require('dotenv').config();
const healthcareAPI = require('./src/services/healthcareAPI');

/**
 * Comprehensive Healthcare API Test Suite
 * Tests all API functionality including authentication, data retrieval, and chatbot integration
 */

class HealthcareAPITester {
    constructor() {
        this.testResults = {
            authentication: { patient: false, doctor: false },
            apiConnection: false,
            dataRetrieval: { 
                doctors: false, 
                appointments: false, 
                prescriptions: false, 
                labTests: false 
            },
            appointmentBooking: false,
            errorHandling: false
        };
        this.currentUser = null;
    }

    // Utility method for colored console output
    log(message, type = 'info') {
        const colors = {
            success: '\x1b[32m✅',
            error: '\x1b[31m❌',
            warning: '\x1b[33m⚠️',
            info: '\x1b[36mℹ️',
            reset: '\x1b[0m'
        };
        console.log(`${colors[type]} ${message}${colors.reset}`);
    }

    // Test 1: API Connection and Configuration
    async testAPIConnection() {
        this.log('\n🌐 Testing API Connection and Configuration', 'info');
        console.log('='.repeat(50));

        try {
            const headers = healthcareAPI.getHeaders();
            
            this.log(`API URL: ${healthcareAPI.baseURL}`, 'info');
            this.log(`API Key: ${healthcareAPI.apiKey ? 'Present' : 'Missing'}`, 'info');
            this.log(`Content-Type: ${headers['Content-Type']}`, 'info');
            this.log(`X-API-Key: ${headers['X-API-Key'] ? 'Present' : 'Missing'}`, 'info');

            if (healthcareAPI.apiKey && headers['Content-Type'] && headers['X-API-Key']) {
                this.testResults.apiConnection = true;
                this.log('API configuration is correct', 'success');
            } else {
                this.log('API configuration has issues', 'error');
            }

        } catch (error) {
            this.log(`API configuration error: ${error.message}`, 'error');
        }
    }

    // Test 2: Patient Authentication
    async testPatientAuthentication() {
        this.log('\n👤 Testing Patient Authentication', 'info');
        console.log('='.repeat(50));

        const email = process.env.TEST_PATIENT_EMAIL;
        const password = process.env.TEST_PATIENT_PASSWORD;

        if (!email || !password) {
            this.log('Patient credentials not found in .env file', 'error');
            return;
        }

        try {
            this.log(`Authenticating patient: ${email}`, 'info');
            
            const result = await healthcareAPI.authenticatePatient(email, password);

            if (result.success) {
                this.testResults.authentication.patient = true;
                this.currentUser = result.patient;
                this.log(`Patient login successful: ${result.patient.name}`, 'success');
                this.log(`Patient ID: ${result.patient.id}`, 'info');
                this.log(`Phone: ${result.patient.phone}`, 'info');
                this.log(`Blood Group: ${result.patient.blood_group}`, 'info');
                this.log(`Age: ${result.patient.age}`, 'info');
            } else {
                this.log(`Patient login failed: ${result.error}`, 'error');
            }

        } catch (error) {
            this.log(`Patient authentication error: ${error.message}`, 'error');
        }
    }

    // Test 3: Doctor Authentication
    async testDoctorAuthentication() {
        this.log('\n👨‍⚕️ Testing Doctor Authentication', 'info');
        console.log('='.repeat(50));

        const email = process.env.TEST_DOCTOR_EMAIL;
        const password = process.env.TEST_DOCTOR_PASSWORD;

        if (!email || !password) {
            this.log('Doctor credentials not found in .env file', 'warning');
            return;
        }

        try {
            this.log(`Authenticating doctor: ${email}`, 'info');
            
            const result = await healthcareAPI.authenticateDoctor(email, password);

            if (result.success) {
                this.testResults.authentication.doctor = true;
                this.log(`Doctor login successful: ${result.doctor.name}`, 'success');
                this.log(`Doctor ID: ${result.doctor.id}`, 'info');
                this.log(`Specialization: ${result.doctor.specialization || 'Not specified'}`, 'info');
            } else {
                this.log(`Doctor login failed: ${result.error}`, 'error');
            }

        } catch (error) {
            this.log(`Doctor authentication error: ${error.message}`, 'error');
        }
    }

    // Test 4: Doctors List Retrieval
    async testDoctorsRetrieval() {
        this.log('\n👨‍⚕️ Testing Doctors List Retrieval', 'info');
        console.log('='.repeat(50));

        try {
            const doctors = await healthcareAPI.getDoctorsList();

            if (doctors && doctors.length > 0) {
                this.testResults.dataRetrieval.doctors = true;
                this.log(`Retrieved ${doctors.length} doctors`, 'success');
                
                // Show first few doctors
                doctors.slice(0, 3).forEach((doctor, index) => {
                    this.log(`${index + 1}. ${doctor.name} - ${doctor.specialization} (₹${doctor.consultation_fee})`, 'info');
                });
            } else {
                this.log('No doctors found or retrieval failed', 'error');
            }

        } catch (error) {
            this.log(`Doctors retrieval error: ${error.message}`, 'error');
        }
    }

    // Test 5: Patient Data Retrieval (if patient is authenticated)
    async testPatientDataRetrieval() {
        if (!this.currentUser) {
            this.log('\n⚠️ Skipping patient data tests - no authenticated patient', 'warning');
            return;
        }

        this.log('\n📊 Testing Patient Data Retrieval', 'info');
        console.log('='.repeat(50));

        const patientId = this.currentUser.id;

        // Test appointments
        try {
            this.log('Fetching patient appointments...', 'info');
            const appointments = await healthcareAPI.getPatientAppointments(patientId);
            
            if (appointments) {
                this.testResults.dataRetrieval.appointments = true;
                const appointmentsList = appointments.appointments || appointments;
                this.log(`Retrieved ${appointmentsList.length || 0} appointments`, 'success');
            }
        } catch (error) {
            this.log(`Appointments retrieval error: ${error.message}`, 'error');
        }

        // Test prescriptions
        try {
            this.log('Fetching patient prescriptions...', 'info');
            const prescriptions = await healthcareAPI.getPatientPrescriptions(patientId);
            
            if (prescriptions) {
                this.testResults.dataRetrieval.prescriptions = true;
                const prescriptionsList = prescriptions.prescriptions || prescriptions;
                this.log(`Retrieved ${prescriptionsList.length || 0} prescriptions`, 'success');
            }
        } catch (error) {
            this.log(`Prescriptions retrieval error: ${error.message}`, 'error');
        }

        // Test lab tests
        try {
            this.log('Fetching patient lab tests...', 'info');
            const labTests = await healthcareAPI.getPatientLabTests(patientId);
            
            if (labTests) {
                this.testResults.dataRetrieval.labTests = true;
                const labTestsList = labTests.lab_tests || labTests;
                this.log(`Retrieved ${labTestsList.length || 0} lab tests`, 'success');
            }
        } catch (error) {
            this.log(`Lab tests retrieval error: ${error.message}`, 'error');
        }
    }

    // Test 6: Error Handling
    async testErrorHandling() {
        this.log('\n🚫 Testing Error Handling', 'info');
        console.log('='.repeat(50));

        try {
            // Test invalid credentials
            this.log('Testing invalid patient credentials...', 'info');
            const invalidResult = await healthcareAPI.authenticatePatient('invalid@email.com', 'wrongpassword');
            
            if (!invalidResult.success) {
                this.testResults.errorHandling = true;
                this.log('Invalid credentials correctly rejected', 'success');
            } else {
                this.log('Invalid credentials should have been rejected', 'error');
            }

        } catch (error) {
            this.log(`Error handling test failed: ${error.message}`, 'error');
        }
    }

    // Test 7: Appointment Booking (if patient is authenticated)
    async testAppointmentBooking() {
        if (!this.currentUser) {
            this.log('\n⚠️ Skipping appointment booking test - no authenticated patient', 'warning');
            return;
        }

        this.log('\n📅 Testing Appointment Booking', 'info');
        console.log('='.repeat(50));

        try {
            // Get doctors list first
            const doctors = await healthcareAPI.getDoctorsList();
            
            if (doctors && doctors.length > 0) {
                const testDoctor = doctors[0];
                
                // Create test appointment data
                const appointmentData = {
                    doctor_id: testDoctor.doctor_id,
                    hospital_id: testDoctor.hospital_id || 1,
                    date_time: '2025-07-03 14:00:00',
                    symptoms: 'Test appointment - API testing'
                };

                this.log(`Testing appointment booking with Dr. ${testDoctor.name}...`, 'info');
                
                const bookingResult = await healthcareAPI.bookAppointment(this.currentUser.id, appointmentData);
                
                if (bookingResult.success || bookingResult.appointment_id) {
                    this.testResults.appointmentBooking = true;
                    this.log('Appointment booking successful', 'success');
                    this.log(`Appointment ID: ${bookingResult.appointment_id || bookingResult.id || 'Generated'}`, 'info');
                } else {
                    this.log(`Appointment booking failed: ${bookingResult.error || 'Unknown error'}`, 'error');
                }
            } else {
                this.log('No doctors available for booking test', 'warning');
            }

        } catch (error) {
            this.log(`Appointment booking error: ${error.message}`, 'error');
        }
    }

    // Generate comprehensive test report
    generateReport() {
        this.log('\n📋 COMPREHENSIVE TEST REPORT', 'info');
        console.log('='.repeat(60));

        const results = this.testResults;
        
        this.log(`API Connection: ${results.apiConnection ? 'PASS' : 'FAIL'}`, 
                 results.apiConnection ? 'success' : 'error');
        
        this.log(`Patient Authentication: ${results.authentication.patient ? 'PASS' : 'FAIL'}`, 
                 results.authentication.patient ? 'success' : 'error');
        
        this.log(`Doctor Authentication: ${results.authentication.doctor ? 'PASS' : 'FAIL'}`, 
                 results.authentication.doctor ? 'success' : 'error');
        
        this.log(`Doctors Retrieval: ${results.dataRetrieval.doctors ? 'PASS' : 'FAIL'}`, 
                 results.dataRetrieval.doctors ? 'success' : 'error');
        
        this.log(`Appointments Retrieval: ${results.dataRetrieval.appointments ? 'PASS' : 'FAIL'}`, 
                 results.dataRetrieval.appointments ? 'success' : 'error');
        
        this.log(`Prescriptions Retrieval: ${results.dataRetrieval.prescriptions ? 'PASS' : 'FAIL'}`, 
                 results.dataRetrieval.prescriptions ? 'success' : 'error');
        
        this.log(`Lab Tests Retrieval: ${results.dataRetrieval.labTests ? 'PASS' : 'FAIL'}`, 
                 results.dataRetrieval.labTests ? 'success' : 'error');
        
        this.log(`Appointment Booking: ${results.appointmentBooking ? 'PASS' : 'FAIL'}`, 
                 results.appointmentBooking ? 'success' : 'error');
        
        this.log(`Error Handling: ${results.errorHandling ? 'PASS' : 'FAIL'}`, 
                 results.errorHandling ? 'success' : 'error');

        // Calculate overall score
        const totalTests = Object.values(results.authentication).length + 
                          Object.values(results.dataRetrieval).length + 
                          [results.apiConnection, results.appointmentBooking, results.errorHandling].length;
        
        const passedTests = Object.values(results.authentication).filter(Boolean).length +
                           Object.values(results.dataRetrieval).filter(Boolean).length +
                           [results.apiConnection, results.appointmentBooking, results.errorHandling].filter(Boolean).length;

        const score = Math.round((passedTests / totalTests) * 100);

        console.log('\n' + '='.repeat(60));
        this.log(`OVERALL SCORE: ${passedTests}/${totalTests} tests passed (${score}%)`, 
                 score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error');

        if (score < 100) {
            this.log('\n💡 Troubleshooting Tips:', 'info');
            console.log('1. Ensure API server is running on http://10.11.28.161:5000');
            console.log('2. Check .env file for correct credentials');
            console.log('3. Verify network connectivity');
            console.log('4. Check API server logs for errors');
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 HEALTHCARE API COMPREHENSIVE TEST SUITE');
        console.log('='.repeat(70));
        console.log(`Started at: ${new Date().toLocaleString()}`);

        await this.testAPIConnection();
        await this.testPatientAuthentication();
        await this.testDoctorAuthentication();
        await this.testDoctorsRetrieval();
        await this.testPatientDataRetrieval();
        await this.testAppointmentBooking();
        await this.testErrorHandling();
        
        this.generateReport();
        
        console.log(`\nCompleted at: ${new Date().toLocaleString()}`);
    }
}

// Run the comprehensive test suite
async function runTests() {
    try {
        const tester = new HealthcareAPITester();
        await tester.runAllTests();
    } catch (error) {
        console.error('\n❌ Test suite failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Execute tests if run directly
if (require.main === module) {
    runTests();
}

module.exports = HealthcareAPITester;
