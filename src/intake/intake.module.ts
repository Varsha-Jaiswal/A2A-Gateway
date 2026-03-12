import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { IntakeProcessor } from './intake.processor/intake.processor';

@Module({
  providers: [IntakeService, IntakeProcessor],
})
export class IntakeModule {}
