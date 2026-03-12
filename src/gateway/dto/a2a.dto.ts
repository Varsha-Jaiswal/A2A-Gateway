import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class A2aHandshakeDto {
  @ApiProperty({ example: 'Acme AI', description: 'The name of the startup pitching.' })
  @IsString()
  startup_name: string;

  @ApiProperty({ example: 'We are building an AGI layer for the JVM.', description: 'The core pitch or thesis.' })
  @IsString()
  pitch_summary: string;

  @ApiProperty({ example: 'founder-bot-0X9', description: 'The unique identifier of the requesting Agent node.' })
  @IsString()
  agent_id: string;

  @ApiProperty({ example: 'Early stage AI pitch', description: 'The target mandate of the VC.' })
  @IsString()
  intent: string;

  @ApiPropertyOptional({ example: 'https://founder-bot.com/webhook', description: 'Callback URL for the VC Bot to send asynchronous event responses.' })
  @IsOptional()
  @IsString()
  webhook_url?: string;
}

export class A2aMessageDto {
  @ApiPropertyOptional({ example: 'ses_123xyz', description: 'The Triple A assigned session token (if continuing a thread).' })
  @IsOptional()
  @IsString()
  session_id?: string;

  @ApiProperty({ example: 'founder-bot-0X9', description: 'The unique identifier of the requesting Agent node.' })
  @IsString()
  sender_id: string;

  @ApiProperty({
    example: { text: "Here is our attached ARR data.", attachments: ["https://example.com/arr.csv"] },
    description: 'The message payload containing unstructured text and optional remote attachment URIs.'
  })
  @IsObject()
  payload: {
    text: string;
    attachments?: string[];
  };
}

export class TelegramWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  update_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}
