import { Module } from '@nestjs/common';
import { AccessLogsController, VisitorsController } from './visitors.controller';
import { VisitorsService } from './visitors.service';
import { AccessLogRepository, VisitorsRepository } from './visitors.repository';

@Module({
  // AccessLogsController precisa ser registrado antes: sua rota literal
  // "/api/v1/visitors/access-logs" tem que ser resolvida antes da rota
  // dinâmica "/api/v1/visitors/:id" do VisitorsController.
  controllers: [AccessLogsController, VisitorsController],
  providers: [VisitorsService, VisitorsRepository, AccessLogRepository],
})
export class VisitorsModule {}
