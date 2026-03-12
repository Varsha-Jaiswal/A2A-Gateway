# Triple A VC Clawbot — A2A Gateway

Official implementation of the Triple A A2A Gateway using the **Google Agent-to-Agent (A2A) SDK**. 

The Triple A VC Clawbot (or "Clawbot") is an autonomous investment agent that conducts early-stage diligence by chatting directly with Founder Agents. It handles mandate filtering, data extraction (ARR, TAM, Team, IP), and generates diligence briefs for Triple A partners.

## 🏗 Architecture

The gateway runs on a dual-server stack:
- **A2A SDK Server**: Handles protocol-compliant discovery (`agent-card.json`) and transports (`JSON-RPC`, `REST`).
- **NestJS Server**: Handles auxiliary features like Swagger UI, Telegram bridging, and rate limiting.


Founder Agent
│
▼
A2A Gateway
├─ A2A SDK Server
└─ NestJS Server
│
▼
VC Clawbot Backend

---

### Protocol Endpoints

| Resource | URL | Purpose |
|---|---|---|
| **Discovery** | `GET /.well-known/agent-card.json` | A2A AgentCard discovery |
| **JSON-RPC** | `POST /a2a/jsonrpc` | Primary spec-compliant transport |
| **REST API** | `POST /a2a/rest` | HTTP+JSON convenience transport |
| **Docs** | `GET /api-docs` | Swagger UI for auxiliary routes |
| **Telegram** | `POST /api/submissions/telegram/webhook` | Telegram-to-A2A Bridge |

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file based on `.env.example`:
```env
PORT=3000 // Gateway server port
BACKEND_URL=http://localhost:3000 // Public gateway URL
PRIMARY_BOT=http://localhost:4000/api/message // VC bot backend endpoint
TEST_MODE=true // Enables interaction logging
```

### 3. Run for Local Development

# Start the mock VC Bot (the agent's brain)
```bash
node mock-vc-bot.js
```
Runs at: http://localhost:4000

# Start the A2A Gateway
```bash
npm run start:dev
```
Gateway runs at: http://localhost:3000

### 4. Run Multi-Turn Simulation
```bash
# Runs a scripted 5-turn A2A conversation via the official SDK client
node mock-founder-agent.js
```
The script will:
- Discover the gateway AgentCard
- Start an A2A conversation session
- Run a multi-turn founder pitch
- Save the conversation transcript
- Generate a diligence brief

Generated outputs:
- founder-conversation.json
- diligence-brief.txt

## 🧠 Core Agent Logic (`VcBotExecutor`)

The `VcBotExecutor` implements the A2A `AgentExecutor` interface and handles the heavy lifting:

1. **Mandate Firewall**: Rejects pitches containing specific restricted keywords (e.g., SEO, marketing agencies).
2. **VC Bot Proxy**: Forwards valid A2A messages to the downstream bot backend.
3. **Session State**: Automatically handled by the SDK via `contextId`.
4. **Local Logging**: In `TEST_MODE`, all interactions are logged to `founder-conversation.json`.

## 🛡️ Production Readiness

- **Rate Limiting**: Integrated via NestJS Throttler (10 requests per 60 seconds).
- **Persistence**: Using `InMemoryTaskStore` for dev; production supports Redis/MongoDB providers.
- **Authentication**: Using `noAuthentication` builder for MVP; extensible via `UserBuilder`.
