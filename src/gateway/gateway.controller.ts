import {
  Controller,
  Post,
  Body,
  HttpCode,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';
import { TelegramWebhookDto } from './dto/a2a.dto';

/**
 * GatewayController handles auxiliary HTTP routes that are NOT part of the A2A spec.
 *
 * Primary A2A communication happens via the @a2a-js/sdk routes mounted in main.ts:
 *   GET  /.well-known/agent-card.json  → AgentCard discovery
 *   POST /a2a/jsonrpc                   → JSON-RPC A2A transport
 *   POST /a2a/rest                      → HTTP+JSON A2A transport
 *
 * This controller only manages:
 *   POST /api/submissions/telegram/webhook  → Telegram → A2A adapter
 */
@ApiTags('Auxiliary')
@Controller('api/submissions')
@UseGuards(ThrottlerGuard)
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('telegram/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive inbound Telegram Bot updates and bridge them into the A2A session' })
  @ApiResponse({ status: 200, description: 'Update acknowledged.' })
  @ApiBody({ type: TelegramWebhookDto })
  async handleTelegramWebhook(@Body() update: TelegramWebhookDto) {
    if (update.message && update.message.text) {
      await this.gatewayService.bridgeTelegramMessage(
        `tg_chat_${update.message.chat.id}`,
        `tg_user_${update.message.from.id}`,
        update.message.text,
      );
    }
    // Always return 200 OK to Telegram
    return { status: 'ok' };
  }
}
