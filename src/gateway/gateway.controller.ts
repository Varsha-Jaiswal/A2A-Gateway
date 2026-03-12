import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  UseGuards
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';
import { A2aHandshakeDto, A2aMessageDto, TelegramWebhookDto } from './dto/a2a.dto';

@ApiTags('A2A Protocol')
@Controller('api/submissions')
@UseGuards(ThrottlerGuard)
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Initiate a new A2A Handshake with the VC Bot' })
  @ApiResponse({ status: 200, description: 'Handshake accepted. Returns a unique session_id.' })
  @ApiResponse({ status: 403, description: 'Mandate violation (e.g. pitching marketing services rather than tech).' })
  @ApiResponse({ status: 429, description: 'Too many requests. Agent rate limit exceeded.' })
  @ApiBody({ type: A2aHandshakeDto })
  async createSubmission(@Body() dto: A2aHandshakeDto) {
    // 1. Mandate Filter (Heuristic Firewall)
    const isAllowed = this.gatewayService.checkMandate(dto.intent);

    if (!isAllowed) {
      throw new HttpException(
        {
          error: 'MANDATE_VIOLATION',
          message:
            'Triple A mandate strictly accepts: Founders, Early stage, Tech. Rejects: Marketing, Sales, Services.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // 2. Initialize Session
    const sessionResponse = await this.gatewayService.initializeSession(dto);
    return sessionResponse;
  }

  @Post(':id/message')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a follow-up payload to an existing A2A session (Asynchronous)' })
  @ApiResponse({ status: 200, description: 'Payload queued successfully for asynchronous LLM parsing.' })
  @ApiBody({ type: A2aMessageDto })
  async handleMessage(@Param('id') id: string, @Body() dto: A2aMessageDto) {
    dto.session_id = id;
    // 1. Enqueue the message for asynchronous LLM/Bot processing
    const response = await this.gatewayService.enqueueMessage(dto);
    return response;
  }

  @Post(':id/message/sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a follow-up payload and wait synchronously for the VC Bot reply' })
  @ApiResponse({ status: 200, description: 'Returns the generated AI VC reply directly in the response body.' })
  @ApiBody({ type: A2aMessageDto })
  async handleMessageSync(@Param('id') id: string, @Body() dto: A2aMessageDto) {
    dto.session_id = id;
    const response = await this.gatewayService.processMessageSync(dto);
    return { status: 'SUCCESS', response };
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Poll the A2A session for updates or asynchronous VC Bot replies' })
  @ApiResponse({ status: 200, description: 'Returns an array of message objects representing the session history.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  getSessionMessages(@Param('id') id: string) {
    const history = this.gatewayService.getSessionHistory(id);
    if (!history) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
    return { session_id: id, messages: history };
  }

  @Post('telegram/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive inbound Telegram Bot updates natively via webhook' })
  @ApiResponse({ status: 200, description: 'Update acknowledged.' })
  @ApiBody({ type: TelegramWebhookDto })
  async handleTelegramWebhook(@Body() update: TelegramWebhookDto) {
    if (update.message && update.message.text) {
      const mappedMessage: A2aMessageDto = {
        session_id: `tg_chat_${update.message.chat.id}`,
        sender_id: `tg_user_${update.message.from.id}`,
        payload: {
          text: update.message.text
        }
      };
      
      await this.gatewayService.enqueueMessage(mappedMessage);
    }
    
    // Always return 200 OK to Telegram
    return { status: 'ok' };
  }
}
