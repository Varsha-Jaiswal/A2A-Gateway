import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS for cross-origin frontend requests
  app.enableCors();

  // Setup OpenAPI (Swagger) Documentation
  const config = new DocumentBuilder()
    .setTitle('A2A Gateway - Triple A Protocol')
    .setDescription('The official asynchronous API documentation for interacting with the Triple A VC Clawbot.\n\n[Download Raw OpenAPI JSON Specifications](/api-json)')
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
