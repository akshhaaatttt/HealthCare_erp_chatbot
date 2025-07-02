require('dotenv').config();
const axios = require('axios');
const healthcareAPI = require('./src/services/healthcareAPI');

const CHATBOT_URL = 'http://localhost:3000/chat';
const API_BASE_URL = 'http://10.11.27.76:5000/api';

class HealthcareTestSuite {
    constructor() {
        this.testResults = {
            apiConnection: false,
            patientAuth: false,
            doctorAuth: false,
            chatbotResponse: false,
            appointmentFlow: false,
            symptomsInput: false,
            calendarFunctions: false,
            feeDisplay: false
        };
        this.patientData = null;
        this.doctorData = null;
    }

    async runAllTests() {
        console.log('🏥 Healthcare ERP - Comprehensive Test Suite');
        console.log('==============================================');
        console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
        console.log(`🌐 API URL: ${API_BASE_URL}`);
        console.log(`🤖 Chatbot URL: ${CHATBOT_URL}`);
        
        try {
            await this.testAPIConnection();
            await this.testAuthentication();
            await this.testChatbotBasics();
            await this.testAppointmentBooking();
            await this.testSymptomsInput();
            await this.testCalendarFunctions();
            await this.testFeeDisplay();
            
            this.displayTestSummary();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.displayTestSummary();
        }
    }

    async testAPIConnection() {
        console.log('\n🔌 Testing API Connection');
        console.log('==========================');
        
        try {
            // Test API health endpoint
            const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
            console.log('✅ API server is responding');
            
            // Test API headers
            const headers = healthcareAPI.getHeaders();
            console.log('✅ API headers configured correctly:');
            console.log(`   • X-API-Key: ${headers['X-API-Key'] ? 'Present' : 'Missing'}`);
            console.log(`   • Content-Type: ${headers['Content-Type']}`);
            
            this.testResults.apiConnection = true;
        } catch (error) {
            console.log('❌ API connection failed:', error.message);
            console.log('   Please ensure API server is running on http://10.11.27.76:5000');
        }
    }

    async testAuthentication() {
        console.log('\n🔐 Testing Authentication');
        console.log('==========================');
        
        // Test Patient Authentication
        console.log('\n👤 Patient Authentication:');
        const patientEmail = process.env.TEST_PATIENT_EMAIL;
        const patientPassword = process.env.TEST_PATIENT_PASSWORD;
        
        if (!patientEmail || !patientPassword) {
            console.log('❌ Patient credentials missing in .env file');
            return;
        }
        
        try {
            const patientResult = await healthcareAPI.authenticatePatient(patientEmail, patientPassword);
            
            if (patientResult.success) {
                console.log('✅ Patient authentication successful');
                console.log(`   • Name: ${patientResult.patient.name}`);
                console.log(`   • ID: ${patientResult.patient.id}`);
                console.log(`   • Email: ${patientResult.patient.email}`);
                this.patientData = patientResult.patient;
                this.testResults.patientAuth = true;
            } else {
                console.log('❌ Patient authentication failed:', patientResult.error);
            }
        } catch (error) {
            console.log('❌ Patient authentication error:', error.message);
        }

        // Test Doctor Authentication
        console.log('\n👨‍⚕️ Doctor Authentication:');
        const doctorEmail = process.env.TEST_DOCTOR_EMAIL;
        const doctorPassword = process.env.TEST_DOCTOR_PASSWORD;
        
        if (!doctorEmail || !doctorPassword) {
            console.log('⚠️ Doctor credentials missing in .env file (optional)');
            return;
        }
        
        try {
            const doctorResult = await healthcareAPI.authenticateDoctor(doctorEmail, doctorPassword);
            
            if (doctorResult.success) {
                console.log('✅ Doctor authentication successful');
                console.log(`   • Name: ${doctorResult.doctor.name}`);
                console.log(`   • ID: ${doctorResult.doctor.id}`);
                this.doctorData = doctorResult.doctor;
                this.testResults.doctorAuth = true;
            } else {
                console.log('❌ Doctor authentication failed:', doctorResult.error);
            }
        } catch (error) {
            console.log('❌ Doctor authentication error:', error.message);
        }
    }

    async testChatbotBasics() {
        console.log('\n🤖 Testing Chatbot Responses');
        console.log('==============================');
        
        const testUserId = 'test_user_' + Date.now();
        
        try {
            // Test main menu
            const mainResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'main'
            });
            
            if (mainResponse.data.success) {
                console.log('✅ Chatbot main menu working');
                console.log(`   • Options available: ${mainResponse.data.response.options?.length || 0}`);
                this.testResults.chatbotResponse = true;
            } else {
                console.log('❌ Chatbot main menu failed');
            }
            
            // Test health endpoint
            const healthResponse = await axios.get(`${CHATBOT_URL.replace('/chat', '/health')}`);
            console.log('✅ Chatbot health endpoint working');
            
        } catch (error) {
            console.log('❌ Chatbot test failed:', error.message);
            console.log('   Please ensure chatbot server is running on http://localhost:3000');
        }
    }

    async testAppointmentBooking() {
        console.log('\n📅 Testing Appointment Booking Flow');
        console.log('=====================================');
        
        const testUserId = 'test_appointment_' + Date.now();
        
        try {
            // Start appointment booking
            const startResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'book_appointment'
            });
            
            if (!startResponse.data.success) {
                console.log('❌ Appointment booking start failed');
                return;
            }
            
            // Select general consultation
            const generalResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'general_appointment'
            });
            
            if (generalResponse.data.success) {
                console.log('✅ General consultation selection working');
                
                const doctorOptions = generalResponse.data.response?.options?.filter(opt => 
                    opt.action?.startsWith('book_doctor_')
                );
                
                if (doctorOptions && doctorOptions.length > 0) {
                    console.log(`✅ Doctors available: ${doctorOptions.length}`);
                    
                    // Test selecting first doctor
                    const doctorResponse = await axios.post(CHATBOT_URL, {
                        user_id: testUserId,
                        selected_option: doctorOptions[0].action
                    });
                    
                    if (doctorResponse.data.success) {
                        console.log('✅ Doctor selection working');
                        
                        const symptomsOptions = doctorResponse.data.response?.options?.filter(opt => 
                            opt.action?.startsWith('symptom_')
                        );
                        
                        if (symptomsOptions && symptomsOptions.length > 0) {
                            console.log('✅ Symptoms selection available');
                            this.testResults.appointmentFlow = true;
                        }
                    }
                } else {
                    console.log('⚠️ No doctors available for booking');
                }
            }
        } catch (error) {
            console.log('❌ Appointment booking test failed:', error.message);
        }
    }

    async testSymptomsInput() {
        console.log('\n✏️ Testing Custom Symptoms Input');
        console.log('==================================');
        
        const testUserId = 'test_symptoms_' + Date.now();
        
        try {
            // Test custom symptoms input
            const symptomsResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'symptom_other'
            });
            
            if (symptomsResponse.data.success && symptomsResponse.data.response?.expectingInput) {
                console.log('✅ Custom symptoms input prompt working');
                console.log('✅ expectingInput flag correctly set');
                
                // Test submitting custom symptom
                const customSymptomResponse = await axios.post(CHATBOT_URL, {
                    user_id: testUserId,
                    selected_option: 'Joint pain and morning stiffness'
                });
                
                if (customSymptomResponse.data.success) {
                    console.log('✅ Custom symptom submission working');
                    this.testResults.symptomsInput = true;
                }
            } else {
                console.log('❌ Custom symptoms input not working');
                console.log('   expectingInput flag missing or false');
            }
        } catch (error) {
            console.log('❌ Symptoms input test failed:', error.message);
        }
    }

    async testCalendarFunctions() {
        console.log('\n📅 Testing Calendar Functions');
        console.log('===============================');
        
        const testUserId = 'test_calendar_' + Date.now();
        
        try {
            // Test add_calendar action
            const calendarResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'add_calendar'
            });
            
            if (calendarResponse.data.success) {
                console.log('✅ Add calendar function working');
                
                // Test set_additional_reminder action
                const reminderResponse = await axios.post(CHATBOT_URL, {
                    user_id: testUserId,
                    selected_option: 'set_additional_reminder'
                });
                
                if (reminderResponse.data.success) {
                    console.log('✅ Additional reminder function working');
                    this.testResults.calendarFunctions = true;
                } else {
                    console.log('❌ Additional reminder function not working');
                }
            } else {
                console.log('❌ Add calendar function not working');
            }
        } catch (error) {
            console.log('❌ Calendar functions test failed:', error.message);
        }
    }

    async testFeeDisplay() {
        console.log('\n💰 Testing Fee Display');
        console.log('========================');
        
        const testUserId = 'test_fee_' + Date.now();
        
        try {
            const generalResponse = await axios.post(CHATBOT_URL, {
                user_id: testUserId,
                selected_option: 'general_appointment'
            });
            
            if (generalResponse.data.success) {
                const message = generalResponse.data.response?.message || '';
                const options = generalResponse.data.response?.options || [];
                
                // Check for fee display issues
                let hasColorCodeIssue = false;
                
                if (message.includes('#667eea') || message.includes(';">')) {
                    console.log('❌ Color code found in message');
                    hasColorCodeIssue = true;
                }
                
                options.forEach(opt => {
                    if (opt.text.includes('#667eea') || opt.text.includes(';">')) {
                        console.log('❌ Color code found in option:', opt.text);
                        hasColorCodeIssue = true;
                    }
                });
                
                if (!hasColorCodeIssue) {
                    console.log('✅ Fee display clean (no color code leaks)');
                    if (options.length > 0) {
                        console.log(`✅ Sample doctor option: ${options[0]?.text?.substring(0, 50)}...`);
                    }
                    this.testResults.feeDisplay = true;
                } else {
                    console.log('❌ Fee display has formatting issues');
                }
            }
        } catch (error) {
            console.log('❌ Fee display test failed:', error.message);
        }
    }

    displayTestSummary() {
        console.log('\n📊 TEST SUMMARY');
        console.log('================');
        
        const results = this.testResults;
        const totalTests = Object.keys(results).length;
        const passedTests = Object.values(results).filter(result => result === true).length;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        console.log(`Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
        console.log('');
        
        console.log('Individual Test Results:');
        console.log(`🔌 API Connection: ${results.apiConnection ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`🔐 Patient Authentication: ${results.patientAuth ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`👨‍⚕️ Doctor Authentication: ${results.doctorAuth ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`🤖 Chatbot Response: ${results.chatbotResponse ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`📅 Appointment Flow: ${results.appointmentFlow ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`✏️ Symptoms Input: ${results.symptomsInput ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`📅 Calendar Functions: ${results.calendarFunctions ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`💰 Fee Display: ${results.feeDisplay ? '✅ PASS' : '❌ FAIL'}`);
        
        if (this.patientData) {
            console.log('\n👤 Authenticated Patient:');
            console.log(`   • ${this.patientData.name} (ID: ${this.patientData.id})`);
            console.log(`   • ${this.patientData.email}`);
        }
        
        if (this.doctorData) {
            console.log('\n👨‍⚕️ Authenticated Doctor:');
            console.log(`   • ${this.doctorData.name} (ID: ${this.doctorData.id})`);
            console.log(`   • ${this.doctorData.email}`);
        }
        
        console.log('\n🎯 Recommendations:');
        if (successRate === 100) {
            console.log('🎉 All tests passed! System is ready for production.');
        } else if (successRate >= 80) {
            console.log('⚠️ Most tests passed. Address failing tests before production.');
        } else {
            console.log('❌ Multiple test failures. System needs debugging before use.');
        }
        
        if (!results.apiConnection) {
            console.log('• Ensure API server is running on http://10.11.27.76:5000');
        }
        if (!results.chatbotResponse) {
            console.log('• Ensure chatbot server is running on http://localhost:3000');
        }
        if (!results.patientAuth) {
            console.log('• Check patient credentials in .env file');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const testSuite = new HealthcareTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = HealthcareTestSuite;
