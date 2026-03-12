import {
  Controller,
  Post,
  Get,
  Header,
  Body,
  HttpCode,
  Redirect,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';
import { TelegramWebhookDto } from './dto/a2a.dto';
import { tripleAAgentCard } from '../a2a-server';
import { VcBotExecutor } from './vc-bot.executor';
import { Request, Response, NextFunction } from 'express';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
} from '@a2a-js/sdk/server';
import {
  jsonRpcHandler,
  restHandler,
  UserBuilder,
} from '@a2a-js/sdk/server/express';
import { Req, Res, Next } from '@nestjs/common';

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
  private readonly a2aRequestHandler: DefaultRequestHandler;

  constructor(
    private readonly gatewayService: GatewayService,
    private readonly vcBotExecutor: VcBotExecutor,
  ) {
    this.a2aRequestHandler = new DefaultRequestHandler(
      tripleAAgentCard,
      new InMemoryTaskStore(),
      this.vcBotExecutor,
    );
  }

  @Post('/a2a/test')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  a2aTest() {
    return { status: 'a2a-post-ok' };
  }

  @Post('/api/ping')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  pingPost() {
    return { status: 'ok', method: 'POST', environment: process.env.NODE_ENV };
  }

  @Get('/env.js')
  @Header('Content-Type', 'application/javascript')
  @ApiExcludeEndpoint()
  getEnvJs() {
    const backendUrl = process.env.BACKEND_URL || '';
    return `window.ENV = { BACKEND_URL: "${backendUrl}" };`;
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
  async handleJsonRpc(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    const handler = jsonRpcHandler({
      requestHandler: this.a2aRequestHandler,
      userBuilder: UserBuilder.noAuthentication,
      // The SDK might expect the Express 'app' or other context here, 
      // but let's try the standard middleware signature.
    });
    return handler(req, res, next);
  }

  @Post('/a2a/rest')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'A2A REST Transport Point',
    description: 'Standard A2A RESTful interface for message sending and state polling.'
  })
  @ApiResponse({ status: 200, description: 'Successful REST response.' })
  async handleRest(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    const handler = restHandler({
      requestHandler: this.a2aRequestHandler,
      userBuilder: UserBuilder.noAuthentication,
    });
    return handler(req, res, next);
  }

  @Get('/a2a/jsonrpc')
  @ApiExcludeEndpoint()
  getJsonRpcInfo() {
    return { 
      message: 'A2A JSON-RPC Endpoint is Active.',
      usage: 'This endpoint accepts POST requests only, as per the A2A spec.',
      docs: '/api-docs'
    };
  }

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

}
