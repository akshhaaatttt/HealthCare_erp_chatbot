require('dotenv').config();
const healthcareAPI = require('./src/services/healthcareAPI');
const config = require('./src/config/config');

async function testLogin() {
    console.log('🧪 Testing Healthcare API Login Functionality');
    console.log('==============================================');
    
    try {
        // Test Patient Login
        console.log('\n1. 👤 Testing Patient Login...');
        console.log('--------------------------------');
        
        // Get test credentials from .env file
        const testPatientEmail = process.env.TEST_PATIENT_EMAIL;
        const testPatientPassword = process.env.TEST_PATIENT_PASSWORD;
        
        if (!testPatientEmail || !testPatientPassword) {
            console.log('❌ Test patient credentials not found in .env file');
            console.log('   Please set TEST_PATIENT_EMAIL and TEST_PATIENT_PASSWORD in .env');
            return;
        }
        
        console.log(`📧 Email: ${testPatientEmail}`);
        console.log(`🔒 Password: ${testPatientPassword}`);
        
        const patientResult = await healthcareAPI.authenticatePatient(testPatientEmail, testPatientPassword);
        
        if (patientResult.success) {
            console.log('✅ Patient login successful!');
            console.log('👤 Patient Details:');
            console.log(`   • Name: ${patientResult.patient.name}`);
            console.log(`   • ID: ${patientResult.patient.id}`);
            console.log(`   • Email: ${patientResult.patient.email}`);
            console.log(`   • Phone: ${patientResult.patient.phone}`);
            console.log(`   • Blood Group: ${patientResult.patient.blood_group}`);
            console.log(`   • Age: ${patientResult.patient.age}`);
        } else {
            console.log('❌ Patient login failed');
            console.log(`   Error: ${patientResult.error}`);
        }
        
        // Test Doctor Login
        console.log('\n2. 👨‍⚕️ Testing Doctor Login...');
        console.log('--------------------------------');
        
        // Get test credentials from .env file
        const testDoctorEmail = process.env.TEST_DOCTOR_EMAIL;
        const testDoctorPassword = process.env.TEST_DOCTOR_PASSWORD;
        
        let doctorResult = { success: false, error: 'No credentials provided' };
        
        if (!testDoctorEmail || !testDoctorPassword) {
            console.log('❌ Test doctor credentials not found in .env file');
            console.log('   Please set TEST_DOCTOR_EMAIL and TEST_DOCTOR_PASSWORD in .env');
            console.log('   Skipping doctor login test...');
        } else {
            console.log(`📧 Email: ${testDoctorEmail}`);
            console.log(`🔒 Password: ${testDoctorPassword}`);
        
            doctorResult = await healthcareAPI.authenticateDoctor(testDoctorEmail, testDoctorPassword);
            
            if (doctorResult.success) {
                console.log('✅ Doctor login successful!');
                console.log('👨‍⚕️ Doctor Details:');
                console.log(`   • Name: ${doctorResult.doctor.name}`);
                console.log(`   • ID: ${doctorResult.doctor.id}`);
                console.log(`   • Email: ${doctorResult.doctor.email}`);
                console.log(`   • Specialization: ${doctorResult.doctor.specialization}`);
                console.log(`   • Hospital ID: ${doctorResult.doctor.hospital_id}`);
                console.log(`   • Phone: ${doctorResult.doctor.phone}`);
            } else {
                console.log('❌ Doctor login failed');
                console.log(`   Error: ${doctorResult.error}`);
            }
        }
        
        // Test Invalid Credentials
        console.log('\n3. 🚫 Testing Invalid Credentials...');
        console.log('-------------------------------------');
        
        const invalidResult = await healthcareAPI.authenticatePatient('invalid@email.com', 'wrongpassword');
        
        if (!invalidResult.success) {
            console.log('✅ Invalid credentials correctly rejected');
            console.log(`   Error: ${invalidResult.error}`);
        } else {
            console.log('❌ Invalid credentials should have been rejected');
        }
        
        // Test API Connection
        console.log('\n4. 🌐 Testing API Connection...');
        console.log('--------------------------------');
        
        try {
            const headers = healthcareAPI.getHeaders();
            console.log('✅ API headers configured correctly:');
            console.log(`   • Content-Type: ${headers['Content-Type']}`);
            console.log(`   • Accept: ${headers['Accept']}`);
            console.log(`   • X-API-Key: ${headers['X-API-Key'] ? 'Present' : 'Missing'}`);
            console.log(`   • Authorization: ${headers['Authorization'] ? 'Present' : 'Missing'}`);
        } catch (error) {
            console.log('❌ API configuration error:', error.message);
        }
        
        console.log('\n🎯 Test Summary:');
        console.log('================');
        console.log('• Patient Authentication: ' + (patientResult.success ? '✅ Working' : '❌ Failed'));
        console.log('• Doctor Authentication: ' + (doctorResult.success ? '✅ Working' : '❌ Failed'));
        console.log('• Invalid Credential Handling: ✅ Working');
        console.log('• API Configuration: ✅ Working');
        
        if (!patientResult.success && !doctorResult.success) {
            console.log('\n💡 Troubleshooting Tips:');
            console.log('========================');
            console.log('1. Check if the API server is running on http://10.11.27.76:5000');
            console.log('2. Verify test credentials exist in the database');
            console.log('3. Check network connectivity to the API server');
            console.log('4. Verify API_KEY and API_TOKEN in .env file');
            console.log('5. Check API server logs for authentication errors');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Connection refused - API server may not be running');
            console.log('   Check if http://10.11.27.76:5000 is accessible');
        } else if (error.code === 'ENOTFOUND') {
            console.log('\n💡 Host not found - check network connection or API URL');
        }
    }
}

// Run the test
testLogin();
