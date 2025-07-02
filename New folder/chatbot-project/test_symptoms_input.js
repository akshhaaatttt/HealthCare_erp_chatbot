require('dotenv').config();
const axios = require('axios');

async function testCustomSymptoms() {
    console.log('🧪 Testing Custom Symptoms Input');
    console.log('================================');
    
    try {
        // Step 1: Start appointment flow
        console.log('\n1. Starting appointment flow...');
        const startResponse = await axios.post('http://localhost:3000/chat', {
            user_id: 'test_symptoms_' + Date.now(),
            selected_option: "book_appointment"
        });
        
        console.log('✅ Started');
        
        // Step 2: Select general appointment
        const generalResponse = await axios.post('http://localhost:3000/chat', {
            user_id: 'test_symptoms_' + Date.now(),
            selected_option: "general_appointment"
        });
        
        console.log('✅ General selected');
        
        // Step 3: Select first doctor
        const doctorOptions = generalResponse.data.response?.options?.filter(opt => opt.action?.startsWith('book_doctor_'));
        if (doctorOptions && doctorOptions.length > 0) {
            console.log('\n2. Selecting doctor...');
            const doctorResponse = await axios.post('http://localhost:3000/chat', {
                user_id: 'test_symptoms_' + Date.now(),
                selected_option: doctorOptions[0].action
            });
            
            console.log('✅ Doctor selected');
            
            // Step 4: Select "Other" symptoms to trigger text input
            console.log('\n3. Testing custom symptoms...');
            const symptomsResponse = await axios.post('http://localhost:3000/chat', {
                user_id: 'test_symptoms_' + Date.now(),
                selected_option: "symptom_other"
            });
            
            console.log('✅ Custom symptoms response received');
            console.log('ExpectingInput:', symptomsResponse.data.response?.expectingInput);
            console.log('Message:', symptomsResponse.data.response?.message.substring(0, 150) + '...');
            
            if (symptomsResponse.data.response?.expectingInput) {
                console.log('✅ SUCCESS: expectingInput is true - frontend should show text input');
            } else {
                console.log('❌ ISSUE: expectingInput is not true');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCustomSymptoms();
