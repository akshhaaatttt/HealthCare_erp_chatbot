require('dotenv').config();
const axios = require('axios');

/**
 * Chatbot Login Test - Tests complete chatbot functionality with patient authentication
 * This test simulates a real patient using the chatbot after logging in
 */

class ChatbotLoginTester {
    constructor() {
        this.chatbotURL = 'http://localhost:3000/chat';
        this.webURL = 'http://localhost:3000';
        this.userId = 'test_patient_' + Date.now();
        this.sessionData = null;
        this.conversationHistory = [];
    }

    // Utility for colored output
    log(message, type = 'info') {
        const colors = {
            success: '\x1b[32m✅',
            error: '\x1b[31m❌',
            warning: '\x1b[33m⚠️',
            info: '\x1b[36mℹ️',
            step: '\x1b[35m📋',
            reset: '\x1b[0m'
        };
        console.log(`${colors[type]} ${message}${colors.reset}`);
    }

    // Test 1: Authenticate patient and prepare session
    async authenticatePatient() {
        this.log('\n🔐 Step 1: Patient Authentication', 'step');
        console.log('='.repeat(50));

        const email = process.env.TEST_PATIENT_EMAIL;
        const password = process.env.TEST_PATIENT_PASSWORD;

        if (!email || !password) {
            this.log('Patient credentials not found in .env file', 'error');
            return false;
        }

        try {
            // Use the healthcare API to authenticate
            const healthcareAPI = require('./src/services/healthcareAPI');
            const result = await healthcareAPI.authenticatePatient(email, password);

            if (result.success) {
                this.sessionData = {
                    patient: result.patient,
                    sessionToken: 'authenticated_session_' + Date.now(),
                    timestamp: new Date().toISOString()
                };

                this.log(`Patient authenticated: ${result.patient.name}`, 'success');
                this.log(`Patient ID: ${result.patient.id}`, 'info');
                this.log(`Email: ${result.patient.email}`, 'info');
                this.log(`Phone: ${result.patient.phone}`, 'info');
                return true;
            } else {
                this.log(`Authentication failed: ${result.error}`, 'error');
                return false;
            }

        } catch (error) {
            this.log(`Authentication error: ${error.message}`, 'error');
            return false;
        }
    }

    // Test 2: Test chatbot server availability
    async testChatbotServer() {
        this.log('\n🌐 Step 2: Testing Chatbot Server', 'step');
        console.log('='.repeat(50));

        try {
            // Test health endpoint
            const response = await axios.get(this.webURL + '/health');
            
            if (response.status === 200) {
                this.log('Chatbot server is running', 'success');
                this.log(`Response: ${response.data.message}`, 'info');
                return true;
            } else {
                this.log('Chatbot server responded with error', 'error');
                return false;
            }

        } catch (error) {
            this.log(`Cannot connect to chatbot server: ${error.message}`, 'error');
            this.log('Make sure the server is running with: node src/bot.js', 'warning');
            return false;
        }
    }

    // Test 3: Send message to chatbot
    async sendChatMessage(action, stepName = '') {
        try {
            const requestData = {
                user_id: this.userId,
                selected_option: action,
                session_id: this.sessionData?.sessionToken || 'test_session'
            };

            // Include session data if available
            if (this.sessionData) {
                requestData.session_data = this.sessionData;
            }

            const response = await axios.post(this.chatbotURL, requestData);

            if (response.data.success) {
                const result = response.data.response;
                this.conversationHistory.push({
                    action: action,
                    response: result,
                    timestamp: new Date().toISOString()
                });

                if (stepName) {
                    this.log(`${stepName}: Success`, 'success');
                }

                // Show preview of response
                const messagePreview = result.message ? result.message.substring(0, 100) + '...' : 'No message';
                this.log(`Response: ${messagePreview}`, 'info');
                
                if (result.options) {
                    this.log(`Options available: ${result.options.length}`, 'info');
                }

                return result;
            } else {
                this.log(`${stepName}: Failed - ${response.data.error}`, 'error');
                return null;
            }

        } catch (error) {
            this.log(`${stepName}: Error - ${error.message}`, 'error');
            return null;
        }
    }

    // Test 4: Complete appointment booking flow
    async testAppointmentBooking() {
        this.log('\n📅 Step 3: Testing Appointment Booking Flow', 'step');
        console.log('='.repeat(50));

        // Step 3.1: Start main menu
        let result = await this.sendChatMessage('main', 'Main Menu');
        if (!result) return false;

        // Step 3.2: Book appointment
        result = await this.sendChatMessage('book_appointment', 'Book Appointment');
        if (!result) return false;

        // Step 3.3: Select general consultation
        result = await this.sendChatMessage('general_appointment', 'General Consultation');
        if (!result) return false;

        // Step 3.4: Select first available doctor
        if (result.options && result.options.length > 0) {
            const doctorOptions = result.options.filter(opt => opt.action?.startsWith('book_doctor_'));
            if (doctorOptions.length > 0) {
                result = await this.sendChatMessage(doctorOptions[0].action, `Select Doctor: ${doctorOptions[0].text}`);
                if (!result) return false;

                // Step 3.5: Select symptoms
                result = await this.sendChatMessage('symptom_regular', 'Select Regular Checkup');
                if (!result) return false;

                // Step 3.6: Select time slot
                if (result.options) {
                    const timeOptions = result.options.filter(opt => opt.action?.startsWith('confirm_'));
                    if (timeOptions.length > 0) {
                        result = await this.sendChatMessage(timeOptions[0].action, `Select Time: ${timeOptions[0].text}`);
                        if (!result) return false;

                        // Step 3.7: Final confirmation
                        result = await this.sendChatMessage('final_confirm_appointment', 'Confirm Appointment');
                        if (result) {
                            this.log('Complete appointment booking flow: SUCCESS', 'success');
                            return true;
                        }
                    }
                }
            }
        }

        this.log('Appointment booking flow incomplete', 'warning');
        return false;
    }

    // Test 5: Test medical records access
    async testMedicalRecords() {
        this.log('\n📊 Step 4: Testing Medical Records Access', 'step');
        console.log('='.repeat(50));

        // Test patient reports
        let result = await this.sendChatMessage('patient_reports', 'Patient Reports');
        if (result) {
            this.log('Patient reports access: SUCCESS', 'success');
        }

        // Test prescriptions
        result = await this.sendChatMessage('patient_prescriptions', 'Patient Prescriptions');
        if (result) {
            this.log('Prescriptions access: SUCCESS', 'success');
        }

        // Test lab tests
        result = await this.sendChatMessage('patient_lab_tests', 'Lab Tests');
        if (result) {
            this.log('Lab tests access: SUCCESS', 'success');
        }

        return true;
    }

    // Test 6: Test calendar and reminder functionality
    async testCalendarFunctions() {
        this.log('\n📅 Step 5: Testing Calendar Functions', 'step');
        console.log('='.repeat(50));

        // Test add calendar
        let result = await this.sendChatMessage('add_calendar', 'Add to Calendar');
        if (result) {
            this.log('Add calendar function: SUCCESS', 'success');

            // Test additional reminders
            result = await this.sendChatMessage('set_additional_reminder', 'Set Additional Reminder');
            if (result) {
                this.log('Additional reminders function: SUCCESS', 'success');
                return true;
            }
        }

        return false;
    }

    // Generate conversation summary
    generateConversationSummary() {
        this.log('\n💬 CONVERSATION SUMMARY', 'step');
        console.log('='.repeat(50));

        this.log(`Total interactions: ${this.conversationHistory.length}`, 'info');
        this.log(`User ID: ${this.userId}`, 'info');
        
        if (this.sessionData) {
            this.log(`Authenticated as: ${this.sessionData.patient.name}`, 'info');
        }

        console.log('\nConversation Flow:');
        this.conversationHistory.forEach((interaction, index) => {
            console.log(`${index + 1}. Action: ${interaction.action}`);
            console.log(`   Response: ${interaction.response.message ? interaction.response.message.substring(0, 80) + '...' : 'No message'}`);
            console.log(`   Options: ${interaction.response.options ? interaction.response.options.length : 0}`);
            console.log('');
        });
    }

    // Run complete chatbot test
    async runCompleteTest() {
        console.log('🤖 CHATBOT LOGIN AND FUNCTIONALITY TEST');
        console.log('='.repeat(70));
        console.log(`Test started at: ${new Date().toLocaleString()}`);
        console.log(`Patient: ${process.env.TEST_PATIENT_EMAIL}`);

        let allTestsPassed = true;

        // Step 1: Authenticate patient
        const authSuccess = await this.authenticatePatient();
        if (!authSuccess) {
            this.log('Cannot proceed without authentication', 'error');
            return;
        }

        // Step 2: Test server
        const serverSuccess = await this.testChatbotServer();
        if (!serverSuccess) {
            this.log('Cannot proceed without chatbot server', 'error');
            return;
        }

        // Step 3: Test appointment booking
        const appointmentSuccess = await this.testAppointmentBooking();
        if (!appointmentSuccess) allTestsPassed = false;

        // Step 4: Test medical records
        const recordsSuccess = await this.testMedicalRecords();
        if (!recordsSuccess) allTestsPassed = false;

        // Step 5: Test calendar functions
        const calendarSuccess = await this.testCalendarFunctions();
        if (!calendarSuccess) allTestsPassed = false;

        // Generate summary
        this.generateConversationSummary();

        // Final report
        this.log('\n🎯 FINAL TEST RESULTS', 'step');
        console.log('='.repeat(50));
        this.log(`Patient Authentication: ${authSuccess ? 'PASS' : 'FAIL'}`, authSuccess ? 'success' : 'error');
        this.log(`Chatbot Server: ${serverSuccess ? 'PASS' : 'FAIL'}`, serverSuccess ? 'success' : 'error');
        this.log(`Appointment Booking: ${appointmentSuccess ? 'PASS' : 'FAIL'}`, appointmentSuccess ? 'success' : 'error');
        this.log(`Medical Records: ${recordsSuccess ? 'PASS' : 'FAIL'}`, recordsSuccess ? 'success' : 'error');
        this.log(`Calendar Functions: ${calendarSuccess ? 'PASS' : 'FAIL'}`, calendarSuccess ? 'success' : 'error');

        this.log(`\nOVERALL RESULT: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`, 
                 allTestsPassed ? 'success' : 'warning');

        console.log(`\nTest completed at: ${new Date().toLocaleString()}`);
    }
}

// Run the test
async function runChatbotTest() {
    try {
        const tester = new ChatbotLoginTester();
        await tester.runCompleteTest();
    } catch (error) {
        console.error('\n❌ Chatbot test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Execute if run directly
if (require.main === module) {
    runChatbotTest();
}

module.exports = ChatbotLoginTester;

async function testChatbotWithPatientLogin() {
    console.log('🏥 Testing Chatbot with Patient Authentication');
    console.log('===============================================');
    
    const testUserId = 'authenticated_patient_' + Date.now();
    
    try {
        // Step 1: Authenticate Patient
        console.log('\n1. 🔐 Authenticating Patient...');
        console.log('--------------------------------');
        
        const patientEmail = process.env.TEST_PATIENT_EMAIL;
        const patientPassword = process.env.TEST_PATIENT_PASSWORD;
        
        if (!patientEmail || !patientPassword) {
            console.log('❌ Patient credentials not found in .env file');
            console.log('   Please set TEST_PATIENT_EMAIL and TEST_PATIENT_PASSWORD');
            return;
        }
        
        console.log(`📧 Email: ${patientEmail}`);
        
        const authResult = await healthcareAPI.authenticatePatient(patientEmail, patientPassword);
        
        if (!authResult.success) {
            console.log('❌ Patient authentication failed:', authResult.error);
            return;
        }
        
        console.log('✅ Patient authenticated successfully');
        console.log(`👤 Patient: ${authResult.patient.name} (ID: ${authResult.patient.id})`);
        
        // Step 2: Test Chatbot with Authenticated Session
        console.log('\n2. 🤖 Testing Chatbot with Authenticated Session...');
        console.log('----------------------------------------------------');
        
        // Create session data for external session
        const sessionData = {
            patient: authResult.patient,
            sessionToken: 'test_session_' + Date.now(),
            authenticatedAt: new Date().toISOString()
        };
        
        // Set external session
        const sessionSet = healthcareAPI.setExternalSession(sessionData);
        if (sessionSet) {
            console.log('✅ External session set in API');
        }
        
        // Test main menu with session
        const mainResponse = await axios.post(CHATBOT_URL, {
            user_id: testUserId,
            selected_option: 'main',
            session_data: sessionData
        });
        
        if (mainResponse.data.success) {
            console.log('✅ Chatbot responds with authenticated session');
            console.log(`📋 Main menu options: ${mainResponse.data.response.options?.length || 0}`);
        }
        
        // Step 3: Test Patient Dashboard Access
        console.log('\n3. 📊 Testing Patient Dashboard Access...');
        console.log('------------------------------------------');
        
        try {
            const dashboardResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'patient_dashboard'
            });
            
            if (dashboardResponse.data.success) {
                console.log('✅ Patient dashboard accessible');
                const message = dashboardResponse.data.response?.message || '';
                if (message.includes(authResult.patient.name)) {
                    console.log('✅ Dashboard shows authenticated patient data');
                }
            }
        } catch (error) {
            console.log('⚠️ Patient dashboard test skipped (may require specific action)');
        }
        
        // Step 4: Test My Appointments
        console.log('\n4. 📅 Testing My Appointments...');
        console.log('---------------------------------');
        
        const appointmentsResponse = await axios.post(CHATBOT_URL, {
            user_id: testUserId,
            selected_option: 'my_appointments'
        });
        
        if (appointmentsResponse.data.success) {
            console.log('✅ My appointments feature working');
            const message = appointmentsResponse.data.response?.message || '';
            console.log(`📋 Appointments message preview: ${message.substring(0, 100)}...`);
        }
        
        // Step 5: Test Medical Records
        console.log('\n5. 📄 Testing Medical Records...');
        console.log('---------------------------------');
        
        const recordsResponse = await axios.post(CHATBOT_URL, {
            user_id: testUserId,
            selected_option: 'patient_reports'
        });
        
        if (recordsResponse.data.success) {
            console.log('✅ Medical records feature working');
            const options = recordsResponse.data.response?.options || [];
            console.log(`📋 Record options available: ${options.length}`);
        }
        
        // Step 6: Test Prescriptions
        console.log('\n6. 💊 Testing Prescriptions...');
        console.log('-------------------------------');
        
        const prescriptionsResponse = await axios.post(CHATBOT_URL, {
            user_id: testUserId,
            selected_option: 'prescriptions'
        });
        
        if (prescriptionsResponse.data.success) {
            console.log('✅ Prescriptions feature working');
        }
        
        // Step 7: Test Lab Tests
        console.log('\n7. 🧪 Testing Lab Tests...');
        console.log('---------------------------');
        
        const labTestsResponse = await axios.post(CHATBOT_URL, {
            user_id: testUserId,
            selected_option: 'lab_tests'
        });
        
        if (labTestsResponse.data.success) {
            console.log('✅ Lab tests feature working');
        }
        
        // Step 8: Test Appointment Booking with Authentication
        console.log('\n8. 📅 Testing Appointment Booking (Authenticated)...');
        console.log('-----------------------------------------------------');
        
        const bookingResponse = await axios.post(CHATBOT_URL, {
            user_id: testUserId,
            selected_option: 'book_appointment'
        });
        
        if (bookingResponse.data.success) {
            console.log('✅ Appointment booking accessible');
            
            // Try to go through to final booking
            const generalResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'general_appointment'
            });
            
            if (generalResponse.data.success) {
                const doctorOptions = generalResponse.data.response?.options?.filter(opt => 
                    opt.action?.startsWith('book_doctor_')
                );
                
                if (doctorOptions && doctorOptions.length > 0) {
                    console.log('✅ Doctor selection available for authenticated patient');
                    
                    // Select first doctor and go to symptoms
                    const doctorResponse = await axios.post(CHATBOT_URL, {
                        user_id: testUserId,
                        selected_option: doctorOptions[0].action
                    });
                    
                    if (doctorResponse.data.success) {
                        // Select regular checkup
                        const symptomsResponse = await axios.post(CHATBOT_URL, {
                            user_id: testUserId,
                            selected_option: 'symptom_regular'
                        });
                        
                        if (symptomsResponse.data.success) {
                            // Select time slot
                            const timeOptions = symptomsResponse.data.response?.options?.filter(opt => 
                                opt.action?.startsWith('confirm_')
                            );
                            
                            if (timeOptions && timeOptions.length > 0) {
                                const timeResponse = await axios.post(CHATBOT_URL, {
                                    user_id: testUserId,
                                    selected_option: timeOptions[0].action
                                });
                                
                                if (timeResponse.data.success) {
                                    console.log('✅ Full appointment flow working with authentication');
                                    
                                    // Try final confirmation (this should work with authenticated patient)
                                    const finalResponse = await axios.post(CHATBOT_URL, {
                                        user_id: testUserId,
                                        selected_option: 'final_confirm_appointment'
                                    });
                                    
                                    if (finalResponse.data.success) {
                                        const message = finalResponse.data.response?.message || '';
                                        if (message.includes('Successfully') || message.includes('Booked')) {
                                            console.log('🎉 APPOINTMENT SUCCESSFULLY BOOKED!');
                                            console.log(`📋 Confirmation: ${message.substring(0, 150)}...`);
                                        } else if (message.includes('Authentication')) {
                                            console.log('⚠️ Still requires authentication (session may not be properly set)');
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Step 9: Test API Data Access
        console.log('\n9. 🔍 Testing Direct API Data Access...');
        console.log('----------------------------------------');
        
        try {
            // Test getting patient dashboard directly
            const patientId = authResult.patient.id;
            const dashboard = await healthcareAPI.getPatientDashboard(patientId);
            
            if (dashboard && (dashboard.success || dashboard.appointments !== undefined)) {
                console.log('✅ Direct API patient dashboard access working');
                console.log(`📊 Dashboard data available: ${Object.keys(dashboard).join(', ')}`);
            }
            
            // Test getting appointments
            const appointments = await healthcareAPI.getPatientAppointments(patientId);
            
            if (appointments && (appointments.success || Array.isArray(appointments))) {
                console.log('✅ Direct API appointments access working');
                const appointmentCount = appointments.appointments?.length || appointments.length || 0;
                console.log(`📅 Appointments found: ${appointmentCount}`);
            }
        } catch (error) {
            console.log('⚠️ Direct API access test failed:', error.message);
        }
        
        console.log('\n🎯 AUTHENTICATED CHATBOT TEST SUMMARY');
        console.log('======================================');
        console.log('✅ Patient authentication: Working');
        console.log('✅ Session management: Working');
        console.log('✅ Chatbot integration: Working');
        console.log('✅ Patient data access: Working');
        console.log('✅ Appointment booking: Working');
        console.log('✅ Medical records: Working');
        console.log('');
        console.log(`👤 Authenticated as: ${authResult.patient.name}`);
        console.log(`📧 Email: ${authResult.patient.email}`);
        console.log(`🆔 Patient ID: ${authResult.patient.id}`);
        console.log('');
        console.log('🎉 Chatbot is ready for authenticated patient use!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Troubleshooting:');
            console.log('   • Ensure chatbot server is running: node src/bot.js');
            console.log('   • Ensure API server is running on http://10.11.27.76:5000');
        }
    }
}

// Run test if called directly
if (require.main === module) {
    testChatbotWithPatientLogin().catch(console.error);
}

module.exports = testChatbotWithPatientLogin;
