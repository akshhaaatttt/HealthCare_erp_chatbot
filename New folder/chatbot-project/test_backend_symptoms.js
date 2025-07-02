require('dotenv').config();
const axios = require('axios');

async function testBackendSymptoms() {
    console.log('🧪 Testing Backend Symptoms Response');
    console.log('===================================');
    
    try {
        const TEST_USER = 'backend_test_' + Date.now();
        
        // Test the symptom_other action directly
        console.log('\n1. Testing symptom_other action...');
        const response = await axios.post('http://localhost:3000/chat', {
            user_id: TEST_USER,
            selected_option: "symptom_other"
        });
        
        console.log('✅ Response received');
        console.log('Success:', response.data.success);
        console.log('ExpectingInput:', response.data.response?.expectingInput);
        console.log('Message preview:', response.data.response?.message?.substring(0, 200));
        console.log('Options count:', response.data.response?.options?.length || 0);
        
        if (response.data.response?.expectingInput === true) {
            console.log('✅ Backend correctly sends expectingInput: true');
        } else {
            console.log('❌ Backend NOT sending expectingInput: true');
        }
        
        // Also test if we can submit a custom symptom
        console.log('\n2. Testing custom symptom submission...');
        const customResponse = await axios.post('http://localhost:3000/chat', {
            user_id: TEST_USER,
            selected_option: "joint pain and headaches"
        });
        
        console.log('Custom symptom response success:', customResponse.data.success);
        console.log('Message preview:', customResponse.data.response?.message?.substring(0, 100));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.log('Error status:', error.response.status);
            console.log('Error data:', error.response.data);
        }
    }
}

testBackendSymptoms();
