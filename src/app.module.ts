import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// The starter repository does not ship with database credentials. Keeping the
// database module conditional lets health checks and the existing root test
// boot without PostgreSQL, while a configured DATABASE_URL enables auth.
const configModule = ConfigModule.forRoot({
  isGlobal: true,
});

const databaseModules = process.env.DATABASE_URL
  ? [
      TypeOrmModule.forRoot({
        type: 'postgres' as const,
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
      }),
      AuthModule,
      AccountModule,
    ]
  : [];

@Module({
  imports: [configModule, ...databaseModules],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
