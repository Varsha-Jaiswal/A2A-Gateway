import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as fs from 'fs/promises';
import * as path from 'path';
import { A2aHandshakeDto, A2aMessageDto } from './dto/a2a.dto';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  // In-memory mock DB for 2-way Session state (Test Mode)
  private readonly sessionLog = new Map<string, any[]>();
  private readonly sessionWebhooks = new Map<string, string>();

  constructor(@Optional() @InjectQueue('a2a_messages') private readonly messageQueue?: Queue) {}

  // V1 Heuristic Mandate Firewall
  checkMandate(intent: string): boolean {
    const text = intent.toLowerCase();

    // Hardcoded rejection list (Option A)
    const badKeywords = [
      'seo',
      'marketing agency',
      'lead generation',
      'dev shop',
      'software development agency',
    ];

    for (const keyword of badKeywords) {
      if (text.includes(keyword)) {
        this.logger.warn(`Mandate blocked specific keyword: ${keyword}`);
        return false; // REJECT
      }
    }

    return true;
  }

  async initializeSession(dto: A2aHandshakeDto) {
    const sessionId = `ses_${Math.random().toString(36).substring(7)}`;
    this.logger.log(`Session initialized for agent: ${dto.agent_id}`);

    // In-memory 2-way comm setup
    if (dto.webhook_url) {
      this.sessionWebhooks.set(sessionId, dto.webhook_url);
    }
    
    // Initialize the conversation history
    this.sessionLog.set(sessionId, [
      { 
        timestamp: new Date().toISOString(), 
        role: 'system', 
        content: 'VC Clawbot session established. Awaiting payload.' 
      }
    ]);

    return {
      status: 'HANDSHAKE_ACCEPT',
      session_id: sessionId,
      supported_capabilities: ['async_messaging', 'polling'],
    };
  }

  getSessionHistory(sessionId: string) {
    return this.sessionLog.get(sessionId) || null;
  }

  async enqueueMessage(dto: A2aMessageDto) {
    // 1. Record inbound message to the session memory
    const history = this.sessionLog.get(dto.session_id) || [];
    history.push({
      timestamp: new Date().toISOString(),
      role: 'founder-agent',
      content: dto.payload
    });
    this.sessionLog.set(dto.session_id, history);

    if (this.messageQueue) {
      // In PROD, rely on the Redis Queue
      await this.messageQueue.add('handle_a2a_message', dto);
      this.logger.log(`[PROD] Message queued in Redis successfully on session: ${dto.session_id}`);
    } else {
      this.logger.warn(`[TEST_MODE] Mocking Queue Push for session: ${dto.session_id}`);
      
      // Save the interaction to a local JSON log file
      const logPath = path.join(process.cwd(), 'interactions-log.json');
      const logEntry = {
        timestamp: new Date().toISOString(),
        session_id: dto.session_id,
        sender: dto.sender_id,
        payload: dto.payload
      };

      try {
        await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n', 'utf-8');
        this.logger.log(`[TEST_MODE] Logged agent interaction to ${logPath}`);
      } catch (err) {
        this.logger.error(`Failed to write interaction log: ${err}`);
      }

      // Simulate async extraction delay and generate a response natively
      this.simulateLLMResponse(dto.session_id, dto.payload);
    }

    return {
      status: 'QUEUED',
      message: 'Your payload is being processed asynchronously.',
    };
  }

  async processMessageSync(dto: A2aMessageDto) {
    // 1. Record inbound message to the session memory
    const history = this.sessionLog.get(dto.session_id) || [];
    history.push({
      timestamp: new Date().toISOString(),
      role: 'founder-agent',
      content: dto.payload
    });
    this.sessionLog.set(dto.session_id, history);

    this.logger.log(`[SYNC] Processing message synchronously for session: ${dto.session_id}`);

    // Save the interaction to a local JSON log file if in test mode (no queue)
    if (!this.messageQueue) {
      const logPath = path.join(process.cwd(), 'interactions-log.json');
      const logEntry = {
        timestamp: new Date().toISOString(),
        session_id: dto.session_id,
        sender: dto.sender_id,
        payload: dto.payload
      };

      try {
        await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n', 'utf-8');
        this.logger.log(`[TEST_MODE] Logged sync agent interaction to ${logPath}`);
      } catch (err) {
        this.logger.error(`Failed to write interaction log: ${err}`);
      }
    }

    // Wait for the LLM natively
    const reply = await this.generateLLMResponse(dto.session_id, dto.payload);
    return reply;
  }

  // Helper to wait 3 seconds and return the mock LLM payload (or hit the real VC bot)
  private async generateLLMResponse(sessionId: string, userPayload: any) {
    const vcBotUrl = process.env.PRIMARY_BOT;

    if (vcBotUrl) {
      this.logger.log(`[TEST_MODE] Forwarding payload to actual VC Bot at ${vcBotUrl}...`);
      try {
        const response = await fetch(vcBotUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, payload: userPayload })
        });
        
        const responseData = await response.json();
        
        const responsePayload = {
          timestamp: new Date().toISOString(),
          role: 'vc-bot',
          content: responseData
        };

        // 1. Append to polling memory
        const history = this.sessionLog.get(sessionId) || [];
        history.push(responsePayload);
        this.sessionLog.set(sessionId, history);

        return responsePayload;
      } catch (err) {
        this.logger.error(`[TEST_MODE] Failed to communicate with VC bot at ${vcBotUrl}: ${err.message}. Falling back to mock.`);
      }
    }

    this.logger.log(`[TEST_MODE] Simulating LLM computation for ${sessionId}...`);
    
    // Simulate LLM delay
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    const responsePayload = {
      timestamp: new Date().toISOString(),
      role: 'vc-bot',
      content: {
        text: "Thank you for the payload. Our Kimi 2.5 analysis notes your ARR is impressive, but we need more details on your churn rate. Please append specific churn cohorts.",
        action_required: "missing_churn_data"
      }
    };

    // 1. Append to polling memory
    const history = this.sessionLog.get(sessionId) || [];
    history.push(responsePayload);
    this.sessionLog.set(sessionId, history);

    return responsePayload;
  }

  // Internal test function to fake the background worker's completion and webhook trigger
  private async simulateLLMResponse(sessionId: string, userPayload: any) {
    const responsePayload = await this.generateLLMResponse(sessionId, userPayload);

    // 2. Trigger async webhook if defined by Founder
    const webhookUrl = this.sessionWebhooks.get(sessionId);
    if (webhookUrl) {
      this.logger.log(`[TEST_MODE] Dispatching Webhook to Founder Agent at ${webhookUrl}`);
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, data: responsePayload })
        });
      } catch (err) {
        this.logger.error(`Failed to reach Founder Webhook at ${webhookUrl}: ${err.message}`);
      }
    }
  }
}
