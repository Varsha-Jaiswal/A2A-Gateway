/**
 * mock-founder-agent.js
 * 
 * Simulates a Founder Agent conducting a multi-turn A2A conversation with the VC Bot
 * through the A2A Gateway. Saves the full transcript and generates a diligence brief.
 * 
 * Usage: node mock-founder-agent.js
 */

const fs = require('fs/promises');
const path = require('path');

const GATEWAY_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const OUTPUT_PATH = path.join(__dirname, 'founder-conversation-log.json');
const BRIEF_PATH  = path.join(__dirname, 'diligence-brief.txt');

// The scripted conversation turns the Founder Agent will send
const FOUNDER_SCRIPT = [
  "We are AcmeAI. We're building an autonomous AI orchestration layer for enterprise JVM stacks. Seed stage, pre-revenue but with 3 LOIs.",
  "Our team is 4 people: 2 PhDs in distributed systems, 1 ex-Google infra engineer, and myself (prev founder - exited a B2B SaaS in 2021).",
  "Our target market is Fortune 500 companies modernising legacy Java/Scala infrastructure. TAM is ~$40B. ARR goal: $2M by end of year 2.",
  "We're raising $1.5M seed. We have $300k in soft commitments already. Looking for a lead investor who understands deep tech B2B.",
  "Our defensibility comes from 3 patents we've filed around our agent scheduling algorithm and our proprietary data pipeline adapter."
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function get(url) {
  const res = await fetch(url);
  return res.json();
}

async function generateBrief(sessionId, messages) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Generating Diligence Brief from Conversation...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const founderMessages = messages.filter(m => m.role === 'founder-agent').map(m => m.content.text || JSON.stringify(m.content));
  const vcBotMessages   = messages.filter(m => m.role === 'vc-bot').map(m => m.content.text || JSON.stringify(m.content));

  const brief = `
TRIPLE A — FOUNDER DILIGENCE BRIEF
====================================
Session ID  : ${sessionId}
Generated At: ${new Date().toISOString()}
Turns       : ${founderMessages.length} founder messages, ${vcBotMessages.length} VC bot responses
====================================

STARTUP SNAPSHOT
----------------
${founderMessages.map((m, i) => `[Turn ${i + 1}] ${m}`).join('\n\n')}

VC BOT RESPONSES
-----------------
${vcBotMessages.map((m, i) => `[Response ${i + 1}] ${m}`).join('\n\n')}

PRELIMINARY SIGNALS
-------------------
- Stage             : Seed
- Domain            : AI / Enterprise Infrastructure
- Team Strength     : PhDs + experienced operator
- Traction          : Pre-revenue, 3 LOIs, $300k soft commits
- Raise Target      : $1.5M
- Defensibility     : Patent-pending scheduling algorithm
- Mandate Fit       : STRONG — Technical, B2B, AI Infrastructure

STATUS: Eligible for internal review. Pass to Partner Meeting queue.
====================================
`;

  await fs.writeFile(BRIEF_PATH, brief, 'utf-8');
  console.log(brief);
  console.log(`\n✅  Brief saved to: ${BRIEF_PATH}`);
}

async function run() {
  console.log('\n🚀 Founder Agent Simulation Starting...');
  console.log(`   Targeting Gateway: ${GATEWAY_URL}\n`);

  // Step 1: Handshake
  console.log('── Step 1: Initiating A2A Handshake ──');
  const handshake = await post(`${GATEWAY_URL}/api/submissions`, {
    startup_name  : 'AcmeAI',
    pitch_summary : 'We are building an autonomous AI orchestration layer for enterprise JVM stacks.',
    agent_id      : 'founder-agent-acmeai-001',
    intent        : 'Early stage AI pitch — B2B Infrastructure'
  });

  if (handshake.status !== 'HANDSHAKE_ACCEPT') {
    console.error('❌ Handshake rejected:', handshake);
    process.exit(1);
  }

  const { session_id } = handshake;
  console.log(`✅  Handshake accepted. Session: ${session_id}\n`);

  // Step 2: Multi-turn conversation
  console.log('── Step 2: Running Multi-Turn Conversation ──\n');
  for (let i = 0; i < FOUNDER_SCRIPT.length; i++) {
    const text = FOUNDER_SCRIPT[i];
    console.log(`📤 [Founder Turn ${i + 1}]: "${text.substring(0, 60)}..."`);

    const response = await post(`${GATEWAY_URL}/api/submissions/${session_id}/message/sync`, {
      sender_id: 'founder-agent-acmeai-001',
      payload  : { text }
    });

    const reply = response?.response?.content?.text || JSON.stringify(response?.response?.content);
    console.log(`📥 [VC Bot Reply ${i + 1}]: "${reply?.substring(0, 80)}..."\n`);

    // Small pause between turns to feel natural
    if (i < FOUNDER_SCRIPT.length - 1) await sleep(500);
  }

  // Step 3: Fetch the full session transcript
  console.log('\n── Step 3: Fetching Full Session Transcript ──');
  const sessionData = await get(`${GATEWAY_URL}/api/submissions/${session_id}/messages`);
  const messages = sessionData.messages || [];

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(sessionData, null, 2), 'utf-8');
  console.log(`✅  Full transcript saved to: ${OUTPUT_PATH}`);
  console.log(`   Total messages in session: ${messages.length}`);

  // Step 4: Generate a diligence brief
  await generateBrief(session_id, messages);
}

run().catch(err => {
  console.error('❌ Founder Agent Error:', err.message);
  process.exit(1);
});
