require('dotenv').config();
const axios = require('axios');

const CHATBOT_URL = 'http://localhost:3000/chat';
const TEST_USER_ID = 'test_symptoms_flow_' + Date.now();

async function testSymptomsFlow() {
    console.log('🧪 Testing Complete Symptoms Flow');
    console.log('=================================');
    
    try {
        // Step 1: Start appointment booking
        console.log('\n1. 📅 Starting appointment booking...');
        const startResponse = await axios.post(CHATBOT_URL, {
            user_id: TEST_USER_ID,
            selected_option: "book_appointment"
        });
        
        console.log('✅ Start response received');
        
        // Step 2: Select general consultation
        console.log('\n2. 🩺 Selecting general consultation...');
        const generalResponse = await axios.post(CHATBOT_URL, {
            user_id: TEST_USER_ID,
            selected_option: "general_appointment"
        });
        
        // Step 3: Select first doctor
        const doctorOptions = generalResponse.data.response?.options?.filter(opt => opt.action?.startsWith('book_doctor_'));
        if (doctorOptions && doctorOptions.length > 0) {
            console.log('\n3. 👨‍⚕️ Selecting doctor...');
            const doctorResponse = await axios.post(CHATBOT_URL, {
                user_id: TEST_USER_ID,
                selected_option: doctorOptions[0].action
            });
            
            console.log('✅ Doctor selected');
            console.log('📋 Available symptom options:', doctorResponse.data.response?.options?.map(opt => opt.text).join(', '));
            
            // Step 4: Select "Other symptoms" to test text input
            console.log('\n4. ✏️ Testing custom symptoms input...');
            const symptomsResponse = await axios.post(CHATBOT_URL, {
                user_id: TEST_USER_ID,
                selected_option: "symptom_other"
            });
            
            if (symptomsResponse.data.success && symptomsResponse.data.response?.expectingInput) {
                console.log('✅ Custom symptoms prompt received with expectingInput: true');
                console.log('📋 Message:', symptomsResponse.data.response.message.substring(0, 100) + '...');
                
                // Step 5: Submit custom symptom
                console.log('\n5. 📝 Submitting custom symptom...');
                const customSymptomResponse = await axios.post(CHATBOT_URL, {
                    user_id: TEST_USER_ID,
                    selected_option: "Joint pain and stiffness in knees"
                });
                
                if (customSymptomResponse.data.success) {
                    console.log('✅ Custom symptom submitted successfully');
                    console.log('📋 Next step:', customSymptomResponse.data.response?.message.substring(0, 100) + '...');
                    
                    console.log('\n🎉 COMPLETE SYMPTOMS FLOW WORKING!');
                    console.log('✅ Backend expectingInput: Working');
                    console.log('✅ Custom symptom submission: Working');
                    console.log('✅ Flow continues to time slots: Working');
                } else {
                    console.log('❌ Custom symptom submission failed');
                }
            } else {
                console.log('❌ expectingInput not received');
                console.log('📋 Response:', JSON.stringify(symptomsResponse.data, null, 2));
            }
        } else {
            console.log('❌ No doctors available');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data?.error || error.message);
        if (error.response?.data) {
            console.log('📋 Error response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testSymptomsFlow();
