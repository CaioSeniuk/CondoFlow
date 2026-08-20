import { Module } from '@nestjs/common';
import { CommonAreasController, ReservationsController } from './reservations.controller';
import { CommonAreasService, ReservationsService } from './reservations.service';
import { CommonAreasRepository, ReservationsRepository } from './reservations.repository';

@Module({
  // CommonAreasController vem antes: senão `/api/v1/reservations/common-areas` casaria
  // com a rota dinâmica `/api/v1/reservations/:id`.
  controllers: [CommonAreasController, ReservationsController],
  providers: [
    CommonAreasService,
    ReservationsService,
    CommonAreasRepository,
    ReservationsRepository,
  ],
})
export class ReservationsModule {}
