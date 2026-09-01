import './common/bigint-serialization';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { validateEnv } from './config/env.validation';
import { PaginationInterceptor } from './common/pagination.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UsersModule } from './users/users.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { PackagesModule } from './packages/packages.module';
import { VisitorsModule } from './visitors/visitors.module';
import { TicketsModule } from './tickets/tickets.module';
import { ProvidersModule } from './providers/providers.module';
import { ReservationsModule } from './reservations/reservations.module';
import { PollsModule } from './polls/polls.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    AnnouncementsModule,
    PackagesModule,
    VisitorsModule,
    TicketsModule,
    ProvidersModule,
    ReservationsModule,
    PollsModule,
    FinanceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: PaginationInterceptor },
  ],
})
export class AppModule {}
