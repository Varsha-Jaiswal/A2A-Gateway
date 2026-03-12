const express = require("express");
const app = express();
const PORT = 4000;

app.use(express.json());

const sessions = new Map();

function detectCategory(text) {
  text = text.toLowerCase();

  if (text.includes("team") || text.includes("founder")) return "team";
  if (text.includes("market") || text.includes("tam")) return "market";
  if (text.includes("revenue") || text.includes("ltv") || text.includes("pricing")) return "economics";
  if (text.includes("customer") || text.includes("sales")) return "gtm";
  if (text.includes("competitor") || text.includes("competition")) return "competition";

  return "product";
}

function getQuestion(category) {
  const questions = {
    team: "Who on your team has previously built or scaled infrastructure products?",
    market: "How large is the total addressable market and what segment are you targeting first?",
    economics: "What does a typical customer contract look like and what’s your expected LTV?",
    gtm: "How do you plan to acquire your first 5 enterprise customers?",
    competition: "Who do you see as the strongest competitor today?",
    product: "What core technical advantage does your product have over alternatives?"
  };

  return questions[category];
}

app.post("/api/message", (req, res) => {
  const { session_id, payload } = req.body;
  const founderText = payload?.text || "";

  if (!sessions.has(session_id)) {
    sessions.set(session_id, { 
      turns: 0, 
      askedCategories: new Set(),
      // Priority order for diligence
      priority: ["market", "team", "economics", "gtm", "competition", "product"]
    });
  }

  const session = sessions.get(session_id);
  session.turns++;

  // Logic: 
  // 1. Detect if the founder mentioned a specific new category.
  // 2. Otherwise, pick the next unasked category from our priority list.
  let category = detectCategory(founderText);
  
  // if we already asked this or it's just 'product' (default), 
  // pick the next logical one.
  if (session.askedCategories.has(category) || category === "product") {
    category = session.priority.find(c => !session.askedCategories.has(c)) || "product";
  }

  session.askedCategories.add(category);
  const question = getQuestion(category);

  console.log("\n═══════════════════════════════════════════════");
  console.log(`🤖 VC Bot Session: ${session_id}`);
  console.log(`Turn: ${session.turns}`);
  console.log(`Detected/Next category: ${category}`);
  console.log(`VC Question: ${question}`);

  setTimeout(() => {
    res.json({
      text: question,
      turn: session.turns,
      category: category,
      action_required:
        session.turns < 5 ? "awaiting_founder_response" : "conversation_complete"
    });
  }, 1200);
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-vc-bot' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mock VC Bot Server running on http://localhost:${PORT}`);
  console.log(`   Waiting for A2A Gateway to forward payloads...`);
});
