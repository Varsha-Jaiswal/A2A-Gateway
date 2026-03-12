import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
      is_bot: boolean; // Just in case from subfields
      id_chat?: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}
