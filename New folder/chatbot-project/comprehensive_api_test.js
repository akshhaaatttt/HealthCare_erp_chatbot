require('dotenv').config();
const axios = require('axios');
const healthcareAPI = require('./src/services/healthcareAPI');

// Test configuration
const CHATBOT_URL = 'http://localhost:3000/chat';
const API_URL = 'http://localhost:3000';
const TEST_USER_ID = 'combined_test_' + Date.now();

class HealthcareTestSuite {
    constructor() {
        this.results = {
            authentication: { passed: 0, failed: 0, tests: [] },
            api: { passed: 0, failed: 0, tests: [] },
            chatbot: { passed: 0, failed: 0, tests: [] },
            overall: { passed: 0, failed: 0 }
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    recordTest(category, testName, passed, details = '') {
        this.results[category].tests.push({ testName, passed, details });
        if (passed) {
            this.results[category].passed++;
        } else {
            this.results[category].failed++;
        }
    }

    async testAuthentication() {
        this.log('🔐 Starting Authentication Tests', 'info');
        this.log('================================');

        try {
            // Test patient authentication
            const patientEmail = process.env.TEST_PATIENT_EMAIL;
            const patientPassword = process.env.TEST_PATIENT_PASSWORD;

            if (!patientEmail || !patientPassword) {
                this.recordTest('authentication', 'Patient Credentials Check', false, 'Missing credentials in .env');
                this.log('Missing patient credentials in .env file', 'error');
                return;
            }

            this.log(`Testing patient login: ${patientEmail}`);
            const patientResult = await healthcareAPI.authenticatePatient(patientEmail, patientPassword);
            
            if (patientResult.success) {
                this.recordTest('authentication', 'Patient Login', true, `Logged in as ${patientResult.patient.name}`);
                this.log(`Patient login successful: ${patientResult.patient.name} (ID: ${patientResult.patient.id})`, 'success');
            } else {
                this.recordTest('authentication', 'Patient Login', false, patientResult.error);
                this.log(`Patient login failed: ${patientResult.error}`, 'error');
            }

            // Test doctor authentication
            const doctorEmail = process.env.TEST_DOCTOR_EMAIL;
            const doctorPassword = process.env.TEST_DOCTOR_PASSWORD;

            if (doctorEmail && doctorPassword) {
                this.log(`Testing doctor login: ${doctorEmail}`);
                const doctorResult = await healthcareAPI.authenticateDoctor(doctorEmail, doctorPassword);
                
                if (doctorResult.success) {
                    this.recordTest('authentication', 'Doctor Login', true, `Logged in as ${doctorResult.doctor.name}`);
                    this.log(`Doctor login successful: ${doctorResult.doctor.name} (ID: ${doctorResult.doctor.id})`, 'success');
                } else {
                    this.recordTest('authentication', 'Doctor Login', false, doctorResult.error);
                    this.log(`Doctor login failed: ${doctorResult.error}`, 'error');
                }
            } else {
                this.recordTest('authentication', 'Doctor Credentials Check', false, 'Missing doctor credentials in .env');
                this.log('Doctor credentials not found in .env, skipping doctor test', 'warning');
            }

            // Test invalid credentials
            this.log('Testing invalid credentials handling');
            const invalidResult = await healthcareAPI.authenticatePatient('invalid@test.com', 'wrongpassword');
            
            if (!invalidResult.success) {
                this.recordTest('authentication', 'Invalid Credentials Rejection', true, 'Correctly rejected invalid credentials');
                this.log('Invalid credentials correctly rejected', 'success');
            } else {
                this.recordTest('authentication', 'Invalid Credentials Rejection', false, 'Should have rejected invalid credentials');
                this.log('Invalid credentials should have been rejected', 'error');
            }

        } catch (error) {
            this.recordTest('authentication', 'Authentication Test Suite', false, error.message);
            this.log(`Authentication test failed: ${error.message}`, 'error');
        }
    }

    async testAPIEndpoints() {
        this.log('\n🌐 Starting API Endpoint Tests', 'info');
        this.log('==============================');

        try {
            // Test health endpoint
            this.log('Testing health endpoint');
            const healthResponse = await axios.get(`${API_URL}/health`);
            
            if (healthResponse.status === 200 && healthResponse.data.status === 'OK') {
                this.recordTest('api', 'Health Endpoint', true, 'Server is healthy');
                this.log('Health endpoint working correctly', 'success');
            } else {
                this.recordTest('api', 'Health Endpoint', false, 'Unexpected response');
                this.log('Health endpoint returned unexpected response', 'error');
            }

            // Test chatbot endpoint
            this.log('Testing chatbot endpoint');
            const chatResponse = await axios.post(`${CHATBOT_URL}`, {
                user_id: TEST_USER_ID,
                selected_option: 'main'
            });

            if (chatResponse.status === 200 && chatResponse.data.success) {
                this.recordTest('api', 'Chatbot Endpoint', true, 'Chatbot responding correctly');
                this.log('Chatbot endpoint working correctly', 'success');
            } else {
                this.recordTest('api', 'Chatbot Endpoint', false, 'Chatbot not responding properly');
                this.log('Chatbot endpoint not responding properly', 'error');
            }

            // Test patient dashboard (if authenticated)
            const currentUser = healthcareAPI.getCurrentUser();
            if (currentUser.patient?.id) {
                this.log(`Testing patient dashboard for ID: ${currentUser.patient.id}`);
                const dashboardResult = await healthcareAPI.getPatientDashboard(currentUser.patient.id);
                
                if (dashboardResult && (dashboardResult.success !== false)) {
                    this.recordTest('api', 'Patient Dashboard', true, 'Dashboard data retrieved');
                    this.log('Patient dashboard data retrieved successfully', 'success');
                } else {
                    this.recordTest('api', 'Patient Dashboard', false, 'Failed to get dashboard data');
                    this.log('Failed to retrieve patient dashboard data', 'error');
                }

                // Test patient appointments
                this.log('Testing patient appointments');
                const appointmentsResult = await healthcareAPI.getPatientAppointments(currentUser.patient.id);
                
                if (appointmentsResult && (appointmentsResult.success !== false)) {
                    this.recordTest('api', 'Patient Appointments', true, 'Appointments data retrieved');
                    this.log('Patient appointments retrieved successfully', 'success');
                } else {
                    this.recordTest('api', 'Patient Appointments', false, 'Failed to get appointments');
                    this.log('Failed to retrieve patient appointments', 'error');
                }
            } else {
                this.recordTest('api', 'Patient Data Tests', false, 'No authenticated patient for testing');
                this.log('No authenticated patient available for data tests', 'warning');
            }

            // Test doctors list
            this.log('Testing doctors list');
            const doctorsResult = await healthcareAPI.getDoctorsList();
            
            if (doctorsResult && doctorsResult.length > 0) {
                this.recordTest('api', 'Doctors List', true, `Retrieved ${doctorsResult.length} doctors`);
                this.log(`Doctors list retrieved: ${doctorsResult.length} doctors found`, 'success');
            } else {
                this.recordTest('api', 'Doctors List', false, 'No doctors found or API error');
                this.log('Failed to retrieve doctors list or no doctors found', 'error');
            }

        } catch (error) {
            this.recordTest('api', 'API Test Suite', false, error.message);
            this.log(`API test failed: ${error.message}`, 'error');
        }
    }

    async testChatbotFlow() {
        this.log('\n🤖 Starting Chatbot Flow Tests', 'info');
        this.log('==============================');

        try {
            const testUserId = 'flow_test_' + Date.now();

            // Test main menu
            this.log('Testing main menu');
            const mainResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'main'
            });

            if (mainResponse.data.success && mainResponse.data.response.options) {
                this.recordTest('chatbot', 'Main Menu', true, `${mainResponse.data.response.options.length} options available`);
                this.log(`Main menu working: ${mainResponse.data.response.options.length} options`, 'success');
            } else {
                this.recordTest('chatbot', 'Main Menu', false, 'Main menu not responding correctly');
                this.log('Main menu not responding correctly', 'error');
            }

            // Test appointment booking
            this.log('Testing appointment booking flow');
            const appointmentResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'book_appointment'
            });

            if (appointmentResponse.data.success && appointmentResponse.data.response.options) {
                this.recordTest('chatbot', 'Appointment Booking', true, 'Appointment booking menu accessible');
                this.log('Appointment booking flow accessible', 'success');
            } else {
                this.recordTest('chatbot', 'Appointment Booking', false, 'Appointment booking not working');
                this.log('Appointment booking flow not working', 'error');
            }

            // Test medical records
            this.log('Testing medical records');
            const recordsResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'medical_records'
            });

            if (recordsResponse.data.success) {
                this.recordTest('chatbot', 'Medical Records', true, 'Medical records accessible');
                this.log('Medical records flow accessible', 'success');
            } else {
                this.recordTest('chatbot', 'Medical Records', false, 'Medical records not working');
                this.log('Medical records flow not working', 'error');
            }

            // Test symptoms input functionality
            this.log('Testing custom symptoms input');
            const symptomsResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'symptom_other'
            });

            if (symptomsResponse.data.success && symptomsResponse.data.response.expectingInput) {
                this.recordTest('chatbot', 'Custom Symptoms Input', true, 'Text input functionality working');
                this.log('Custom symptoms input functionality working', 'success');
                
                // Test symptom submission
                const customSymptomResponse = await axios.post(CHATBOT_URL, {
                    user_id: testUserId,
                    selected_option: 'Joint pain and stiffness'
                });

                if (customSymptomResponse.data.success) {
                    this.recordTest('chatbot', 'Symptom Submission', true, 'Custom symptom processing working');
                    this.log('Custom symptom submission working', 'success');
                } else {
                    this.recordTest('chatbot', 'Symptom Submission', false, 'Custom symptom processing failed');
                    this.log('Custom symptom submission failed', 'error');
                }
            } else {
                this.recordTest('chatbot', 'Custom Symptoms Input', false, 'Text input functionality not working');
                this.log('Custom symptoms input functionality not working', 'error');
            }

            // Test calendar and reminder functions
            this.log('Testing calendar and reminder functions');
            const calendarResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'add_calendar'
            });

            if (calendarResponse.data.success) {
                this.recordTest('chatbot', 'Calendar Function', true, 'Calendar integration working');
                this.log('Calendar function working', 'success');

                // Test reminder function
                const reminderResponse = await axios.post(CHATBOT_URL, {
                    user_id: testUserId,
                    selected_option: 'set_additional_reminder'
                });

                if (reminderResponse.data.success) {
                    this.recordTest('chatbot', 'Reminder Function', true, 'Reminder functionality working');
                    this.log('Reminder function working', 'success');
                } else {
                    this.recordTest('chatbot', 'Reminder Function', false, 'Reminder functionality failed');
                    this.log('Reminder function failed', 'error');
                }
            } else {
                this.recordTest('chatbot', 'Calendar Function', false, 'Calendar integration failed');
                this.log('Calendar function failed', 'error');
            }

        } catch (error) {
            this.recordTest('chatbot', 'Chatbot Flow Test', false, error.message);
            this.log(`Chatbot flow test failed: ${error.message}`, 'error');
        }
    }

    generateReport() {
        this.log('\n📊 COMPREHENSIVE TEST REPORT', 'info');
        this.log('============================');

        // Calculate overall stats
        this.results.overall.passed = this.results.authentication.passed + this.results.api.passed + this.results.chatbot.passed;
        this.results.overall.failed = this.results.authentication.failed + this.results.api.failed + this.results.chatbot.failed;
        const totalTests = this.results.overall.passed + this.results.overall.failed;
        const successRate = totalTests > 0 ? ((this.results.overall.passed / totalTests) * 100).toFixed(1) : 0;

        console.log('\n🎯 OVERALL RESULTS:');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${this.results.overall.passed} ✅`);
        console.log(`Failed: ${this.results.overall.failed} ❌`);
        console.log(`Success Rate: ${successRate}%`);

        console.log('\n📋 DETAILED RESULTS:');
        
        ['authentication', 'api', 'chatbot'].forEach(category => {
            const cat = this.results[category];
            console.log(`\n${category.toUpperCase()}:`);
            console.log(`  Passed: ${cat.passed}, Failed: ${cat.failed}`);
            
            cat.tests.forEach(test => {
                const status = test.passed ? '✅' : '❌';
                const details = test.details ? ` - ${test.details}` : '';
                console.log(`  ${status} ${test.testName}${details}`);
            });
        });

        if (this.results.overall.failed > 0) {
            console.log('\n💡 TROUBLESHOOTING TIPS:');
            console.log('========================');
            console.log('1. Ensure the server is running: node src/bot.js');
            console.log('2. Check .env file has correct credentials');
            console.log('3. Verify API server connectivity (http://10.11.27.76:5000)');
            console.log('4. Check network connectivity and firewall settings');
            console.log('5. Review server logs for errors');
        }

        console.log('\n🏁 Test completed successfully!');
        return successRate >= 80; // Consider 80%+ success rate as passing
    }

    async runAllTests() {
        this.log('🚀 Starting Comprehensive Healthcare API Test Suite', 'info');
        this.log('==================================================');

        await this.testAuthentication();
        await this.testAPIEndpoints();
        await this.testChatbotFlow();
        
        return this.generateReport();
    }
}

// Main execution
async function runTests() {
    try {
        const testSuite = new HealthcareTestSuite();
        const success = await testSuite.runAllTests();
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Test suite failed to run:', error.message);
        process.exit(1);
    }
}

// Run tests if called directly
if (require.main === module) {
    runTests();
}

module.exports = { HealthcareTestSuite, runTests };
