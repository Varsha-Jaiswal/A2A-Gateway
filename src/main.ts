import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { setupA2AServer } from './a2a-server';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS for cross-origin frontend requests
  app.enableCors();

  // Mount the A2A SDK server (AgentCard + JSON-RPC + REST) on the shared Express instance
  const httpAdapter = app.getHttpAdapter();
  const expressApp = httpAdapter.getInstance();
  setupA2AServer(expressApp);

  // Setup OpenAPI (Swagger) Documentation for auxiliary NestJS routes (Telegram adapter, health)
  const config = new DocumentBuilder()
    .setTitle('A2A Gateway - Triple A Protocol')
    .setDescription(
      'Official documentation for the Triple A VC Clawbot A2A Gateway.\n\n' +
      '**Primary A2A Interface** (Google A2A Spec):\n' +
      '- AgentCard: `GET /.well-known/agent-card.json`\n' +
      '- JSON-RPC: `POST /a2a/jsonrpc`\n' +
      '- REST: `POST /a2a/rest`\n\n' +
      '[Download Raw OpenAPI JSON Specifications](/api-json)'
    )
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Local environment')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Triple A API Documentation',
    jsonDocumentUrl: 'api-json',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

