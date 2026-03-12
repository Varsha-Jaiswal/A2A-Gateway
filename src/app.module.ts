import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { GatewayModule } from './gateway/gateway.module';
import { IntakeModule } from './intake/intake.module';

// Base Modules (Always loaded)
const imports: any[] = [
  // 1. Environment Config
  ConfigModule.forRoot({ isGlobal: true }),

  // 2. Open Access Rate Limiting (10 reqs per 60 seconds per IP)
  ThrottlerModule.forRoot([{
    ttl: 60000,
    limit: 10,
  }]),

  // 3. Core Feature Modules
  GatewayModule,
  IntakeModule,
];

// Conditionally load Heavy Infrastructure based on TEST_MODE flag
if (process.env.TEST_MODE !== 'true') {
  imports.push(
    // MongoDB Connection (Dynamic State)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/a2a-gateway',
      }),
      inject: [ConfigService],
    }),
    
    // Redis Queue Connection (BullMQ for Async LLM processing)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    })
  );
}

@Module({
  imports,
})
export class AppModule {}
