import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { VcBotExecutor } from './vc-bot.executor';
import { StartupProfile, StartupProfileSchema } from '../database/startup-profile.schema';

const imports: any[] = [];

const isTestMode = process.env.TEST_MODE === 'true';

if (!isTestMode) {
  imports.push(
    MongooseModule.forFeature([
      { name: StartupProfile.name, schema: StartupProfileSchema },
    ]),
    BullModule.registerQueue({
      name: 'a2a_messages',
    })
  );
}

@Module({
  imports,
  controllers: [GatewayController],
  providers: [GatewayService, VcBotExecutor],
  exports: [VcBotExecutor],
})
export class GatewayModule {}
