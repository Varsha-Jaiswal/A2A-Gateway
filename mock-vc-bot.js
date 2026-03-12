const express = require('express');
const app = express();
const PORT = 4000;

app.use(express.json());

// Track which turn we're on per session
const sessionTurns = {};

const DILIGENCE_QUESTIONS = [
  "Interesting! Tell me more about your team's background — specifically, does anyone have prior experience shipping enterprise infrastructure at scale?",
  "Got it. What's your go-to-market strategy? How are you planning to land your first 5 enterprise clients given the typical 6-12 month sales cycle?",
  "Understood. Can you walk me through your unit economics? Even pre-revenue — what does a typical contract look like and what's your estimated LTV?",
  "That's helpful. Who are you seeing as your primary competitors right now — both direct (other AI infra startups) and indirect (build-in-house teams)?",
  "Thank you for the full picture. Our Kimi 2.5 system will now process your full pitch. Expect a diligence brief to follow within 24 hours."
];

// Mock VC Bot "Thinking" Endpoint
app.post('/api/message', (req, res) => {
  const { session_id, payload } = req.body;
  
  // Get or initialize turn counter for this session
  if (!sessionTurns[session_id]) sessionTurns[session_id] = 0;
  const turn = sessionTurns[session_id];
  const question = DILIGENCE_QUESTIONS[turn] || DILIGENCE_QUESTIONS[DILIGENCE_QUESTIONS.length - 1];
  sessionTurns[session_id]++;
  
  console.log('\n═══════════════════════════════════════════════');
  console.log(`🤖 [MOCK VC BOT] Turn ${turn + 1} — Session: ${session_id}`);
  console.log('═══════════════════════════════════════════════');
  console.log(`📥 Received: "${String(payload?.text || JSON.stringify(payload)).substring(0, 80)}..."`);
  
  // Simulate LLM delay (1.5 seconds)
  setTimeout(() => {
    console.log(`📤 Replying: "${question.substring(0, 80)}..."\n`);
    res.json({
      text: question,
      turn: turn + 1,
      action_required: turn < 4 ? 'awaiting_founder_response' : 'conversation_complete'
    });
  }, 1500);
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mock VC Bot Server running on http://localhost:${PORT}`);
  console.log(`   Waiting for A2A Gateway to forward payloads...`);
});
