import { Module, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';

const imports: any[] = [];

if (process.env.TEST_MODE !== 'true') {
  imports.push(
    BullModule.registerQueue({
      name: 'a2a_messages',
    })
  );
}

@Module({
  imports,
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
