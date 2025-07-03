require('dotenv').config();
const healthcareAPI = require('./src/services/healthcareAPI');

async function loginExample() {
    console.log('📋 Healthcare API Login Example');
    console.log('================================');
    
    console.log('\n🔧 Configuration:');
    console.log(`API URL: ${healthcareAPI.baseURL}`);
    console.log(`API Key: ${healthcareAPI.apiKey ? 'Configured' : 'Missing'}`);
    console.log(`API Token: ${healthcareAPI.token ? 'Configured' : 'Missing'}`);
    
    try {
        console.log('\n💡 Example: Patient Login');
        console.log('=========================');
        
        // Get actual credentials from .env file
        const patientCredentials = {
            email: process.env.TEST_PATIENT_EMAIL || 'your-patient@email.com',
            password: process.env.TEST_PATIENT_PASSWORD || 'your-password'
        };
        
        console.log('📝 How to use patient login:');
        console.log(`
const healthcareAPI = require('./src/services/healthcareAPI');

const result = await healthcareAPI.authenticatePatient(
    '${patientCredentials.email}', 
    '${patientCredentials.password}'
);

if (result.success) {
    console.log('Patient logged in:', result.patient.name);
    // Access patient data:
    // result.patient.id
    // result.patient.name
    // result.patient.email
    // result.patient.phone
    // result.patient.blood_group
    // result.patient.age
} else {
    console.log('Login failed:', result.error);
}
        `);
        
        console.log('\n💡 Example: Doctor Login');
        console.log('========================');
        
        // Get actual credentials from .env file
        const doctorCredentials = {
            email: process.env.TEST_DOCTOR_EMAIL || 'your-doctor@email.com',
            password: process.env.TEST_DOCTOR_PASSWORD || 'your-password'
        };
        
        console.log('📝 How to use doctor login:');
        console.log(`
const healthcareAPI = require('./src/services/healthcareAPI');

const result = await healthcareAPI.authenticateDoctor(
    '${doctorCredentials.email}', 
    '${doctorCredentials.password}'
);

if (result.success) {
    console.log('Doctor logged in:', result.doctor.name);
    // Access doctor data:
    // result.doctor.id
    // result.doctor.name
    // result.doctor.email
    // result.doctor.specialization
    // result.doctor.hospital_id
    // result.doctor.phone
} else {
    console.log('Login failed:', result.error);
}
        `);
        
        console.log('\n💡 Example: Using External Session');
        console.log('==================================');
        
        console.log('📝 How to set external session (from your main app):');
        console.log(`
// If user is already logged in your main application
const sessionData = {
    patient: {
        id: 'patient_123',
        name: 'John Doe',
        email: 'john.doe@example.com'
    },
    sessionToken: 'your_session_token_here'
};

const success = healthcareAPI.setExternalSession(sessionData);
if (success) {
    console.log('External session set successfully');
    // Now the chatbot can access patient data without re-authentication
}
        `);
        
        console.log('\n🔍 Example: Check Current User');
        console.log('==============================');
        
        console.log('📝 How to check if user is logged in:');
        console.log(`
const currentUser = healthcareAPI.getCurrentUser();

if (currentUser.patient) {
    console.log('Patient is logged in:', currentUser.patient.name);
} else if (currentUser.doctor) {
    console.log('Doctor is logged in:', currentUser.doctor.name);
} else {
    console.log('No user is logged in');
}
        `);
        
        console.log('\n🚀 Example: Complete Workflow');
        console.log('=============================');
        
        console.log('📝 Complete login and data access workflow:');
        console.log(`
// 1. Initialize API service
const healthcareAPI = require('./src/services/healthcareAPI');

// 2. Authenticate patient
const loginResult = await healthcareAPI.authenticatePatient(email, password);

if (loginResult.success) {
    // 3. Get patient dashboard
    const dashboard = await healthcareAPI.getPatientDashboard(loginResult.patient.id);
    
    // 4. Get patient appointments
    const appointments = await healthcareAPI.getPatientAppointments(loginResult.patient.id);
    
    // 5. Get patient prescriptions
    const prescriptions = await healthcareAPI.getPatientPrescriptions(loginResult.patient.id);
    
    // 6. Get patient lab tests
    const labTests = await healthcareAPI.getPatientLabTests(loginResult.patient.id);
    
    console.log('Patient data loaded successfully');
} else {
    console.log('Authentication required');
}
        `);
        
        console.log('\n📊 Available API Methods:');
        console.log('=========================');
        console.log('Authentication:');
        console.log('• authenticatePatient(email, password)');
        console.log('• authenticateDoctor(email, password)');
        console.log('• setExternalSession(sessionData)');
        console.log('• getCurrentUser()');
        console.log('• hasValidExternalSession()');
        
        console.log('\nPatient Data:');
        console.log('• getPatientDashboard(patientId)');
        console.log('• getPatientAppointments(patientId)');
        console.log('• getPatientPrescriptions(patientId)');
        console.log('• getPatientLabTests(patientId)');
        console.log('• getPatientReports(patientId)');
        
        console.log('\nDoctor Data:');
        console.log('• getDoctorsList()');
        console.log('• getDoctorsBySpecialty(specialty)');
        console.log('• getDoctorDetails(doctorId)');
        
        console.log('\nAppointment Management:');
        console.log('• bookAppointment(patientId, appointmentData)');
        console.log('• cancelAppointment(appointmentId)');
        console.log('• rescheduleAppointment(appointmentId, newDateTime)');
        
        console.log('\n🔑 Test Credentials (Update these with real credentials):');
        console.log('=========================================================');
        console.log('Patient Test Account:');
        console.log(`• Email: ${patientCredentials.email}`);
        console.log(`• Password: ${patientCredentials.password}`);
        
        console.log('\nDoctor Test Account:');
        console.log(`• Email: ${doctorCredentials.email}`);
        console.log(`• Password: ${doctorCredentials.password}`);
        
        console.log('\n⚠️  Important Notes:');
        console.log('====================');
        console.log('1. Replace example credentials with actual test accounts');
        console.log('2. Ensure API server is running on http://10.11.28.161:5000');
        console.log('3. Check .env file for proper API_KEY and API_TOKEN');
        console.log('4. Test network connectivity to the API server');
        console.log('5. Run "node login_test.js" to test actual authentication');
        
    } catch (error) {
        console.error('❌ Example failed:', error.message);
    }
}

// Run the example
loginExample();
