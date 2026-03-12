import { Injectable, Logger } from '@nestjs/common';

/**
 * GatewayService handles auxiliary logic not covered by the A2A SDK:
 * - Telegram message bridging
 *
 * All core A2A agent logic (mandate firewall, VC Bot proxy, session state)
 * has been migrated to VcBotExecutor (src/gateway/vc-bot.executor.ts).
 */
@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  /**
   * Bridges a Telegram message into the A2A flow by calling the local A2A
   * JSON-RPC endpoint. Uses the Telegram chat ID as the A2A contextId.
   */
  async bridgeTelegramMessage(contextId: string, senderId: string, text: string) {
    const a2aEndpoint = `http://localhost:${process.env.PORT ?? 3000}/a2a/jsonrpc`;
    this.logger.log(`[TelegramBridge] Routing message from ${senderId} (ctx: ${contextId}) to A2A endpoint`);

    try {
      const response = await fetch(a2aEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'message/send',
          params: {
            message: {
              kind: 'message',
              messageId: `tg_${Date.now()}`,
              role: 'user',
              contextId,
              parts: [{ kind: 'text', text }],
            },
          },
        }),
      });

      if (!response.ok) {
        this.logger.error(`[TelegramBridge] A2A endpoint returned ${response.status}`);
      } else {
        this.logger.log(`[TelegramBridge] Message successfully routed to A2A endpoint`);
      }
    } catch (err) {
      this.logger.error(`[TelegramBridge] Failed to reach A2A endpoint: ${err.message}`);
    }
  }
}
