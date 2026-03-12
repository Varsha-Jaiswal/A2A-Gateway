import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  Redirect,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';
import { TelegramWebhookDto } from './dto/a2a.dto';
import { tripleAAgentCard } from '../a2a-server';

/**
 * GatewayController handles auxiliary HTTP routes that are NOT part of the A2A spec.
 *
 * Primary A2A communication happens via the @a2a-js/sdk routes mounted in main.ts:
 *   GET  /.well-known/agent-card.json   → AgentCard discovery
 *   POST /a2a/jsonrpc                   → JSON-RPC A2A transport
 *   POST /a2a/rest                      → HTTP+JSON A2A transport
 *
 * This controller only manages:
 *   POST /api/submissions/telegram/webhook  → Telegram → A2A adapter
 */
@ApiTags('Auxiliary')
@Controller()
@UseGuards(ThrottlerGuard)
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('api/submissions/telegram/webhook')

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

  // --- A2A PROTOCOL DISCOVERY (For Swagger Visibility) ---

  @Get('/.well-known/agent-card.json')
  @ApiOperation({ 
    summary: 'Discover the Agent Identity Card (A2A Spec)',
    description: 'Returns the dynamically generated Agent Card containing skills, versioning, and endpoint URLs.'
  })
  @ApiResponse({ status: 200, description: 'Returns the AgentCard JSON object.' })
  getAgentCard() {
    // This endpoint is already served by the SDK handler in main.ts, 
    // but adding it here makes it visible in Swagger UI.
    return tripleAAgentCard;
  }

  @Post('/a2a/jsonrpc')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'A2A JSON-RPC Transport Point',
    description: 'Protocol-compliant endpoint for Agent-to-Agent communication via JSON-RPC 2.0.'
  })
  @ApiResponse({ status: 200, description: 'Successful JSON-RPC response.' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        jsonrpc: { type: 'string', example: '2.0' },
        id: { type: 'string', example: '123' },
        method: { type: 'string', example: 'message/send' },
        params: { type: 'object' }
      } 
    } 
  })
  handleJsonRpc() {
    // Dummy method for Swagger documentation. 
    // Actual routing is handled by the SDK Express middleware.
    return { message: 'Use JSON-RPC 2.0 as per A2A spec.' };
  }

  @Post('/a2a/rest')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'A2A REST Transport Point',
    description: 'Standard A2A RESTful interface for message sending and state polling.'
  })
  @ApiResponse({ status: 200, description: 'Successful REST response.' })
  handleRest() {
    // Dummy method for Swagger documentation.
    return { message: 'Use A2A RESTful protocol.' };
  }
}
