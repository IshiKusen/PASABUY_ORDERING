async function testWebhook() {
  console.log('--- FB Webhook Automation Test (Fetch) ---');
  
  const serverUrl = 'http://localhost:5000/api/webhook';
  
  const mockPayload = {
    object: 'page',
    entry: [
      {
        id: '123456789',
        time: Date.now(),
        messaging: [
          {
            sender: { id: 'test_user_psid' },
            message: { text: 'Magkano po yung Kitkat?' }
          }
        ]
      }
    ]
  };

  try {
    console.log('📤 Sending mock Messenger payload...');
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayload)
    });
    
    console.log('📥 Server Response:', response.status);
    const text = await response.text();
    console.log('📥 Response Body:', text);
    
    console.log('\n✅ Mock payload received by server.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

testWebhook();
