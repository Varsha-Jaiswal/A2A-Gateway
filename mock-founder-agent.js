/**
 * mock-founder-agent.js
 *
 * Simulates a Founder Agent using the official @a2a-js/sdk ClientFactory.
 * Runs a multi-turn A2A conversation with the VC Clawbot, saves the full
 * transcript, and generates a diligence brief.
 *
 * Usage: node mock-founder-agent.js
 */

// Dynamic import for the ESM-only @a2a-js/sdk
import('@a2a-js/sdk/client').then(async ({ ClientFactory }) => {
  const { v4: uuidv4 } = await import('uuid');
  const fs = await import('fs/promises');
  const path = await import('path');

  const GATEWAY_URL = process.env.BACKEND_URL || 'http://localhost:3000';
  const OUTPUT_PATH = path.join(process.cwd(), 'founder-conversation-log.json');
  const BRIEF_PATH  = path.join(process.cwd(), 'diligence-brief.txt');

  const FOUNDER_SCRIPT = [
    'We are AcmeAI. We\'re building an autonomous AI orchestration layer for enterprise JVM stacks. Seed stage, pre-revenue but with 3 LOIs.',
    'Our team is 4 people: 2 PhDs in distributed systems, 1 ex-Google infra engineer, and myself (prev founder — exited a B2B SaaS in 2021).',
    'Our target market is Fortune 500 companies modernising legacy Java/Scala infrastructure. TAM is ~$40B. ARR goal: $2M by end of year 2.',
    'We\'re raising $1.5M seed. We have $300k in soft commitments already. Looking for a lead investor who understands deep tech B2B.',
    'Our defensibility comes from 3 patents we\'ve filed around our agent scheduling algorithm and our proprietary data pipeline adapter.',
  ];

  console.log('\n🚀 Founder Agent (A2A SDK Client) Starting...');
  console.log(`   Discovering AgentCard from: ${GATEWAY_URL}\n`);

  const factory = new ClientFactory();
  const client = await factory.createFromUrl(GATEWAY_URL);

  console.log('✅  AgentCard discovered successfully!\n');

  const contextId = `ctx_${uuidv4()}`;
  const transcript = [];

  console.log(`── Running Multi-Turn Conversation (contextId: ${contextId}) ──\n`);

  for (let i = 0; i < FOUNDER_SCRIPT.length; i++) {
    const text = FOUNDER_SCRIPT[i];
    console.log(`📤 [Founder Turn ${i + 1}]: "${text.substring(0, 70)}..."`);

    const result = await client.sendMessage({
      message: {
        kind: 'message',
        messageId: uuidv4(),
        role: 'user',
        contextId,
        parts: [{ kind: 'text', text }],
      },
    });

    const replyText = result?.parts?.find(p => p.kind === 'text')?.text
      || (result?.status?.message?.parts?.[0]?.text)
      || JSON.stringify(result);

    console.log(`📥 [VC Bot Reply ${i + 1}]: "${String(replyText).substring(0, 90)}..."\n`);

    transcript.push({ turn: i + 1, founder: text, vcBot: replyText });
  }

  // Save transcript
  await fs.writeFile(OUTPUT_PATH, JSON.stringify({ contextId, transcript }, null, 2), 'utf-8');
  console.log(`✅  Transcript saved to: ${OUTPUT_PATH}`);

  // Generate diligence brief
  const brief = `
TRIPLE A — FOUNDER DILIGENCE BRIEF (A2A SDK)
=============================================
Context ID  : ${contextId}
Generated At: ${new Date().toISOString()}
Turns       : ${transcript.length}
=============================================

STARTUP SNAPSHOT
----------------
${transcript.map(t => `[Turn ${t.turn}] ${t.founder}`).join('\n\n')}

VC BOT RESPONSES
-----------------
${transcript.map(t => `[Response ${t.turn}] ${t.vcBot}`).join('\n\n')}

PRELIMINARY SIGNALS
-------------------
- Stage             : Seed
- Domain            : AI / Enterprise Infrastructure
- Team Strength     : PhDs + experienced operator
- Traction          : Pre-revenue, 3 LOIs, $300k soft commits
- Raise Target      : $1.5M
- Defensibility     : Patent-pending scheduling algorithm
- Mandate Fit       : STRONG — Technical, B2B, AI Infrastructure
- Protocol          : Google A2A Spec (@a2a-js/sdk)

STATUS: Eligible for internal review. Pass to Partner Meeting queue.
=============================================
`;

  await fs.writeFile(BRIEF_PATH, brief, 'utf-8');
  console.log(brief);
  console.log(`✅  Brief saved to: ${BRIEF_PATH}`);

}).catch(err => {
  console.error('❌ Founder Agent Error:', err.message || err);
  process.exit(1);
});
