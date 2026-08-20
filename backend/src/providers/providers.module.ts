import { Module } from '@nestjs/common';
import { EvidenceController, ProvidersController } from './providers.controller';
import { EvidenceService, ProvidersService } from './providers.service';
import { EvidenceRepository, ProvidersRepository } from './providers.repository';

@Module({
  // EvidenceController vem antes: senão `/api/v1/providers/evidences` casaria com
  // a rota dinâmica `/api/v1/providers/:id` do ProvidersController.
  controllers: [EvidenceController, ProvidersController],
  providers: [ProvidersService, EvidenceService, ProvidersRepository, EvidenceRepository],
})
export class ProvidersModule {}
