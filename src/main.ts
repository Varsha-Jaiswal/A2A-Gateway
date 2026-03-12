import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

let cachedApp: any;

async function bootstrap() {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.enableCors();
  app.set('json spaces', 2);

  // Setup OpenAPI (Swagger)
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
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Triple A API Documentation',
    jsonDocumentUrl: 'api-json',
    // Helping Vercel find Swagger assets
    swaggerOptions: {
      persistAuthorization: true,
    },
    customfavIcon: '/favicon.ico',
    customCssUrl: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });

  await app.init();
  cachedApp = app.getHttpAdapter().getInstance();
  return cachedApp;
}

// Export for Vercel
export default async (req: any, res: any) => {
  const app = await bootstrap();
  return app(req, res);
};

// Local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  bootstrap().then(() => {
    NestFactory.create<NestExpressApplication>(AppModule).then(app => {
        app.enableCors();
        app.listen(process.env.PORT ?? 3000);
    });
  });
}


