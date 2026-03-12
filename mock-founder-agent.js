/**
 * mock-founder-agent.js
 *
 * Simulates a Founder Agent using the official @a2a-js/sdk ClientFactory.
 * Runs a multi-turn A2A conversation with a VC bot through the gateway,
 * saves the transcript, and generates a diligence brief.
 *
 * Usage:
 * node mock-founder-agent.js
 */

import('@a2a-js/sdk/client').then(async ({ ClientFactory }) => {

  const { v4: uuidv4 } = await import('uuid');
  const fs = await import('fs/promises');
  const path = await import('path');

  const GATEWAY_URL = process.env.BACKEND_URL || 'http://localhost:3000';

  const OUTPUT_PATH = path.join(process.cwd(), 'founder-conversation.json');
  const BRIEF_PATH = path.join(process.cwd(), 'diligence-brief.txt');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Initial founder pitch
  const INITIAL_PITCH =
    "We are AcmeAI. We're building an autonomous AI orchestration layer for enterprise JVM stacks. Seed stage, pre-revenue with 3 LOIs.";

  // Founder knowledge base
  const FOUNDER_KNOWLEDGE = {
    team:
      "Our team is 4 people: 2 PhDs in distributed systems, an ex-Google infrastructure engineer, and myself — a previous B2B SaaS founder who exited in 2021.",

    market:
      "Our target customers are Fortune 500 companies modernising legacy JVM stacks. TAM is roughly $40B across enterprise Java infrastructure.",

    gtm:
      "We plan to land the first 5 customers via design partnerships with companies already evaluating our prototype. Two of our LOIs are from enterprise banks.",

    economics:
      "Typical enterprise contract value is projected around $120k annually with high expansion potential. We estimate LTV above $1M.",

    competition:
      "Direct competitors include emerging AI infra startups, but most competition is internal build teams. Our differentiation is autonomous orchestration.",

    defensibility:
      "We've filed three patents around our agent scheduling algorithm and our proprietary JVM pipeline adapter.",

    raise:
      "We're raising $1.5M seed. $300k already committed from angels and operators in the infra space."
  };

  function founderReply(vcQuestion) {

    const q = vcQuestion.toLowerCase();

    if (q.includes("team")) return FOUNDER_KNOWLEDGE.team;
    if (q.includes("market") || q.includes("tam")) return FOUNDER_KNOWLEDGE.market;
    if (q.includes("go-to-market") || q.includes("customers")) return FOUNDER_KNOWLEDGE.gtm;
    if (q.includes("ltv") || q.includes("revenue") || q.includes("economics")) return FOUNDER_KNOWLEDGE.economics;
    if (q.includes("competitor")) return FOUNDER_KNOWLEDGE.competition;
    if (q.includes("defens")) return FOUNDER_KNOWLEDGE.defensibility;
    if (q.includes("raise") || q.includes("fund")) return FOUNDER_KNOWLEDGE.raise;

    return "Happy to expand further on any part of the business or technology.";
  }

  console.log("\n🚀 Founder Agent Starting...\n");
  console.log(`🔎 Discovering AgentCard from: ${GATEWAY_URL}\n`);

  const factory = new ClientFactory();
  const client = await factory.createFromUrl(GATEWAY_URL);

  console.log("✅ AgentCard discovered successfully\n");

  const contextId = `ctx_${uuidv4()}`;
  const transcript = [];

  let founderMessage = INITIAL_PITCH;

  console.log(`── Conversation Started (contextId: ${contextId}) ──\n`);

  for (let turn = 1; turn <= 6; turn++) {

    console.log(`📤 Founder Turn ${turn}`);
    console.log(`"${founderMessage.substring(0, 120)}..."`);

    let replyText = "";

    try {

      const result = await client.sendMessage({
        message: {
          kind: "message",
          messageId: uuidv4(),
          role: "user",
          contextId,
          parts: [{ kind: "text", text: founderMessage }]
        }
      });

      replyText =
        result?.parts?.find(p => p.kind === "text")?.text ||
        result?.status?.message?.parts?.[0]?.text ||
        JSON.stringify(result);

    } catch (err) {

      console.error("❌ Error contacting VC agent:", err.message);
      replyText = "VC agent unavailable.";
    }

    console.log(`📥 VC Bot Reply ${turn}`);
    console.log(`"${replyText.substring(0, 120)}..."\n`);

    transcript.push({
      turn,
      timestamp: new Date().toISOString(),
      founder: founderMessage,
      vcBot: replyText,
      contextId
    });

    founderMessage = founderReply(replyText);

    await sleep(1500);
  }

  /* 
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify({ contextId, transcript }, null, 2),
    "utf-8"
  );
  console.log(`✅ Transcript saved → ${OUTPUT_PATH}\n`);
  */

  const signals = {
    stage: "Seed",
    domain: "AI Infrastructure",
    lois: transcript.some(t => t.founder.includes("LOI")),
    patents: transcript.some(t => t.founder.includes("patent")),
    teamStrength: "Strong technical founding team",
    mandateFit: "High — Deep tech B2B AI"
  };

  const brief = `
TRIPLE A — FOUNDER DILIGENCE BRIEF
========================================
Context ID : ${contextId}
Generated  : ${new Date().toISOString()}
Turns      : ${transcript.length}
========================================

STARTUP SNAPSHOT
----------------------------------------
${transcript.map(t => `[Founder ${t.turn}] ${t.founder}`).join("\n\n")}

VC QUESTIONS
----------------------------------------
${transcript.map(t => `[VC ${t.turn}] ${t.vcBot}`).join("\n\n")}

PRELIMINARY SIGNALS
----------------------------------------
Stage             : ${signals.stage}
Domain            : ${signals.domain}
Team Strength     : ${signals.teamStrength}
LOIs Present      : ${signals.lois ? "Yes" : "No"}
Patent Claims     : ${signals.patents ? "Yes" : "No"}
Mandate Fit       : ${signals.mandateFit}

RECOMMENDATION
----------------------------------------
Startup shows strong technical credibility and early enterprise interest.
Recommend internal partner review.

STATUS: Pass to Investment Committee Queue
========================================
`;

  await fs.writeFile(BRIEF_PATH, brief, "utf-8");

  console.log(brief);
  console.log(`✅ Brief saved → ${BRIEF_PATH}`);

}).catch(err => {
  console.error("❌ Founder Agent Error:", err);
  process.exit(1);
});