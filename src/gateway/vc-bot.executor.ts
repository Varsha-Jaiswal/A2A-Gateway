import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { put, list, head } from '@vercel/blob';
import {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
} from '@a2a-js/sdk/server';
import { Message } from '@a2a-js/sdk';


/**
 * VcBotExecutor implements the core A2A Agent Logic for the Triple A VC Clawbot.
 * This runs on every incoming message from a Founder Agent.
 */
@Injectable()
export class VcBotExecutor implements AgentExecutor {
  private readonly BLOCKED_KEYWORDS = [
    'seo', 'marketing agency', 'lead generation', 'dev shop', 'software development agency',
  ];

  private checkMandate(text: string): boolean {
    const lower = text.toLowerCase();
    for (const keyword of this.BLOCKED_KEYWORDS) {
      if (lower.includes(keyword)) {
        console.warn(`[VcBotExecutor] Mandate violation: blocked keyword "${keyword}"`);
        return false;
      }
    }
    return true;
  }

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { contextId, userMessage } = requestContext;

    // 1. Extract text from the incoming A2A Message
    const textPart = userMessage.parts.find(p => p.kind === 'text');
    const userText = (textPart as any)?.text || '';

    console.log(`\n[VcBotExecutor] Received message for context: ${contextId}`);
    console.log(`[VcBotExecutor] Founder said: "${userText.substring(0, 80)}..."`);

    // 2. Mandate Filter — reject off-mandate messages
    if (!this.checkMandate(userText)) {
      const rejectMessage: Message = {
        kind: 'message',
        messageId: randomUUID(),
        role: 'agent',
        contextId,
        parts: [{
          kind: 'text',
          text: 'MANDATE_VIOLATION: Triple A mandate strictly accepts Technical Founders, B2B SaaS, AI Infrastructure, Hard Tech. Your submission has been declined.',
        }],
      };
      eventBus.publish(rejectMessage);
      eventBus.finished();
      return;
    }

    // 3. Log to Vercel Blob in TEST_MODE
    if (process.env.TEST_MODE === 'true') {
      try {
        const logFileName = 'founder-conversation.json';
        const logEntry = JSON.stringify({ timestamp: new Date().toISOString(), contextId, userText }) + '\n';
        
        // Note: In a real production app we'd use a database, but for "Test Mode" on Vercel
        // we append to a blob. Since Vercel Blob 'put' overwrites, we simulate append
        // by reading previous content if possible (limited for simplicity here).
        // For efficiency, we just 'put' the new entry. In the Vercel Dashboard,
        // you will see multiple blobs or we could manage a single consolidated one.
        await put(logFileName, logEntry, {
          access: 'public',
          addRandomSuffix: true, // Creates separate entries for each turn in the dashboard
        });
      } catch (err) {
        console.error(`[VcBotExecutor] Blob Log Error: ${err.message}`);
      }
    }

    // 4. Proxy to real VC Bot (if PRIMARY_BOT is set)
    const vcBotUrl = process.env.PRIMARY_BOT;
    if (vcBotUrl) {
      try {
        console.log(`[VcBotExecutor] Forwarding to VC Bot at ${vcBotUrl}...`);
        const response = await fetch(vcBotUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: contextId, payload: { text: userText } }),
        });

        if (!response.ok) throw new Error(`VC Bot returned ${response.status}`);
        const data = await response.json() as any;

        const botReply: Message = {
          kind: 'message',
          messageId: randomUUID(),
          role: 'agent',
          contextId,
          parts: [{ kind: 'text', text: data.text || JSON.stringify(data) }],
        };

        eventBus.publish(botReply);
        eventBus.finished();
        return;
      } catch (err) {
        console.error(`[VcBotExecutor] Failed to reach VC Bot (${err.message}). Using mock fallback.`);
      }
    }

    // 5. Mock fallback — simulate VC Bot response
    console.log(`[VcBotExecutor] Using mock response for context ${contextId}`);
    await new Promise(r => setTimeout(r, 1500));

    const mockReply: Message = {
      kind: 'message',
      messageId: randomUUID(),
      role: 'agent',
      contextId,
      parts: [{
        kind: 'text',
        text: 'Thank you for the details. Can you share more about your go-to-market strategy and how you plan to acquire your first 10 enterprise clients?',
      }],
    };

    eventBus.publish(mockReply);
    eventBus.finished();

    // 6. If conversation is "finished" in test mode, save the brief to Blob
    if (process.env.TEST_MODE === 'true') {
      try {
        const briefText = `Diligence Brief for ${contextId}\nGenerated: ${new Date().toISOString()}\n\nFull conversation logs are available in the Vercel Blob dashboard.`;
        await put(`briefs/${contextId}.txt`, briefText, { access: 'public' });
        console.log(`[VcBotExecutor] Brief uploaded to Vercel Blob for ${contextId}`);
      } catch (err) {
        console.error(`[VcBotExecutor] Brief Upload Error: ${err.message}`);
      }
    }
  }

  cancelTask = async (): Promise<void> => {};
}
