// Quick test to verify the frontend text input functionality
// Run this in browser console after navigating to custom symptoms

// Simulate a response with expectingInput: true
const mockResponse = {
    message: "✏️ **Describe Your Symptoms**\n\nPlease type your symptoms or reason for consultation:\n\n*Example: Joint pain, difficulty sleeping, skin rash, etc.*",
    options: [
        {"id": "back_to_symptoms", "text": "← Back to Symptom Options", "action": "back_to_symptoms"}
    ],
    expectingInput: true
};

// Test if the addTextInputToMessage function works
console.log('Testing text input functionality...');

// Create a test message div
const testDiv = document.createElement('div');
testDiv.className = 'message';

const testBotDiv = document.createElement('div');
testBotDiv.className = 'bot-message';
testBotDiv.innerHTML = 'Test message with text input';

testDiv.appendChild(testBotDiv);

// Test the addTextInputToMessage function
if (typeof healthChatbot !== 'undefined' && healthChatbot.addTextInputToMessage) {
    healthChatbot.addTextInputToMessage(testDiv, mockResponse.options);
    
    // Add to messages container
    document.getElementById('messagesContainer').appendChild(testDiv);
    
    console.log('✅ Text input added successfully!');
    
    // Check if textarea exists
    const textarea = testDiv.querySelector('.symptom-input');
    if (textarea) {
        console.log('✅ Textarea found and ready for input');
        textarea.focus();
    } else {
        console.log('❌ Textarea not found');
    }
} else {
    console.log('❌ healthChatbot.addTextInputToMessage function not available');
}
