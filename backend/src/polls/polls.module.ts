import { Module } from '@nestjs/common';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';
import { PollsRepository, VotesRepository } from './polls.repository';

@Module({
  controllers: [PollsController],
  providers: [PollsService, PollsRepository, VotesRepository],
})
export class PollsModule {}
