import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configuredPort = configService.get<string>('PORT') ?? '3000';
  const port = Number(configuredPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `PORT must be an integer between 1 and 65535; received "${configuredPort}".`,
    );
  }

  try {
    await app.listen(port);
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined;

    if (code === 'EADDRINUSE') {
      logger.error(
        `Port ${port} is already in use. Stop the other backend process or set a different PORT in jobseeker_backend/.env.`,
      );
      await app.close();
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}
void bootstrap();
