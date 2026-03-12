import express from 'express';
import {
  AgentCard,
  AGENT_CARD_PATH,
} from '@a2a-js/sdk';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
} from '@a2a-js/sdk/server';
import {
  agentCardHandler,
  jsonRpcHandler,
  restHandler,
  UserBuilder,
} from '@a2a-js/sdk/server/express';
import { VcBotExecutor } from './gateway/vc-bot.executor';


const PORT = parseInt(process.env.PORT ?? '3000', 10);
const BASE_URL = process.env.BACKEND_URL ?? `http://localhost:${PORT}`;

/**
 * The AgentCard is the A2A identity document for the Triple A VC Clawbot.
 * It is auto-published at /.well-known/agent-card.json and discoverable
 * by any A2A-compliant Founder Agent.
 */
export const tripleAAgentCard: AgentCard = {
  name: 'Triple A VC Clawbot',
  description:
    'An AI-powered gateway agent for Triple A Ventures. Conducts asynchronous diligence conversations with Founder Agents to extract startup metrics and evaluate mandate fit.',
  url: `${BASE_URL}/a2a/jsonrpc`,
  version: '1.0.0',
  protocolVersion: '0.3.0',
  skills: [
    {
      id: 'founder-intake',
      name: 'Founder Intake',
      description:
        'Conducts a structured, multi-turn diligence conversation with a Founder Agent. Extracts startup metrics (team, ARR, TAM, raise, defensibility) and assesses Triple A mandate fit.',
      tags: ['vc', 'diligence', 'b2b', 'ai', 'deep-tech'],
      examples: [
        'Tell me about your startup and what problem you are solving.',
        'What is your current ARR and growth rate?',
        'Who are your key competitors and how do you differentiate?',
      ],
    },
  ],
  capabilities: {
    pushNotifications: false,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  additionalInterfaces: [
    {
      url: `${BASE_URL}/a2a/jsonrpc`,
      transport: 'JSONRPC',
    },
    {
      url: `${BASE_URL}/a2a/rest`,
      transport: 'HTTP+JSON',
    },
  ],
};

/**
 * Bootstrap the A2A SDK server alongside NestJS.
 * Mounts three routes on the shared Express app:
 *   GET  /.well-known/agent-card.json  → AgentCard discovery
 *   POST /a2a/jsonrpc                   → JSON-RPC transport (spec compliant)
 *   POST /a2a/rest                      → HTTP+JSON/REST transport
 */
export function setupA2AServer(app: express.Application): void {
  const vcBotExecutor = new VcBotExecutor();

  const requestHandler = new DefaultRequestHandler(
    tripleAAgentCard,
    new InMemoryTaskStore(),
    vcBotExecutor,
  );

  // AgentCard discovery endpoint
  app.use(
    `/${AGENT_CARD_PATH}`,
    agentCardHandler({ agentCardProvider: requestHandler }),
  );

  // A2A JSON-RPC transport (protocol-compliant)
  app.use(
    '/a2a/jsonrpc',
    jsonRpcHandler({
      requestHandler,
      userBuilder: UserBuilder.noAuthentication,
    }),
  );

  // A2A HTTP+JSON/REST transport (additional convenience interface)
  app.use(
    '/a2a/rest',
    restHandler({
      requestHandler,
      userBuilder: UserBuilder.noAuthentication,
    }),
  );

  console.log(`[A2AServer] AgentCard published at ${BASE_URL}/${AGENT_CARD_PATH}`);
  console.log(`[A2AServer] JSON-RPC endpoint: ${BASE_URL}/a2a/jsonrpc`);
  console.log(`[A2AServer] REST endpoint: ${BASE_URL}/a2a/rest`);
}
