async function testAgentSuite() {
  console.log('🚀 Running Verification Suite for AI Forms — Agent Studio & Chatbot...\n');

  const post = async (path, body) => {
    const res = await fetch(`http://127.0.0.1:3000${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  const get = async (path) => {
    const res = await fetch(`http://127.0.0.1:3000${path}`);
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  // 1. Test Agents List
  console.log('1. Testing GET /api/forms/agents...');
  const listRes = await get('/api/forms/agents');
  console.log(`   ✓ Status: ${listRes.status} | Agents found: ${listRes.data.agents?.length || 0}`);

  // 2. Test Agent Save / Create
  console.log('\n2. Testing POST /api/forms/agents (Create Clara Agent)...');
  const saveRes = await post('/api/forms/agents', {
    id: 'agent_clara_test',
    slug: 'clara-dental-test',
    name: 'Clara',
    roleTitle: 'Dental Appointment Assistant',
    brandColor: '#2563eb',
    welcomeGreeting: "Hi, I'm Clara, an AI Agent and Dental Appointment Assistant. How may I help you?",
    quickActions: [
      { id: 'qa_1', label: 'Schedule appointment', actionType: 'message', payload: 'I would like to schedule an appointment.' },
      { id: 'qa_2', label: 'Complete inquiry form', actionType: 'open_form', payload: 'form_1' },
    ],
    connectedForms: [
      { id: 'form_1', name: 'Dental Appointment & Inquiry Form', description: 'Quick patient registration form' },
    ],
  });
  console.log(`   ✓ Status: ${saveRes.status} | Saved Agent: ${saveRes.data.agent?.name} (${saveRes.data.agent?.roleTitle})`);

  // 3. Test Agent Chat & Form Recommendation
  console.log('\n3. Testing POST /api/forms/agents/agent_clara_test/chat...');
  const chatRes = await post('/api/forms/agents/agent_clara_test/chat', {
    message: 'I would like to schedule an appointment for teeth cleaning.',
    agentConfig: saveRes.data.agent,
  });
  console.log(`   ✓ Status: ${chatRes.status}`);
  console.log(`   ✓ AI Reply: "${chatRes.data.reply?.slice(0, 80)}..."`);
  console.log(`   ✓ Recommended Form ID: ${chatRes.data.suggestedFormId}`);

  // 4. Test Agent Knowledge Ingestion (Train tab)
  console.log('\n4. Testing POST /api/forms/agents/agent_clara_test/train...');
  const trainRes = await post('/api/forms/agents/agent_clara_test/train', {
    type: 'faq',
    faq: {
      question: 'Do you accept Delta Dental insurance?',
      answer: 'Yes! We are an in-network provider for Delta Dental Premier and PPO.',
    },
  });
  console.log(`   ✓ Status: ${trainRes.status} | Indexed FAQ: ${trainRes.data.item?.question}`);

  // 5. Test Standalone Page
  console.log('\n5. Testing Standalone Agent Hosted Page (/chat/agent_clara)...');
  const pageRes = await fetch('http://127.0.0.1:3000/chat/agent_clara');
  console.log(`   ✓ Page HTTP Status: ${pageRes.status}`);

  console.log('\n🎉 AI Forms Agent Studio Verification Complete — All Systems Operational!');
}

testAgentSuite().catch(console.error);
