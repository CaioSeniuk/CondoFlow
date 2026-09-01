import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { StatusHistoryRepository, TicketsRepository } from './tickets.repository';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository, StatusHistoryRepository],
})
export class TicketsModule {}
