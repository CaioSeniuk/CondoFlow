import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AnnouncementDraft, AnnouncementVisibilityChain } from './templates';

/**
 * Adaptador da Chain of Responsibility de visibilidade exigida pelo
 * `AnnouncementPublisherTemplate`. O schema real do CondoFlow segmenta
 * comunicados por `all | block | apartment`, sem conceito de audiência por
 * papel de usuário (residents/providers/managers) como no exemplo original
 * — por isso só `audience: 'all'` é aceito aqui; qualquer outro valor gera
 * `BadRequestException` (decisão confirmada com o usuário).
 */
@Injectable()
export class PrismaAnnouncementVisibilityChain implements AnnouncementVisibilityChain {
  validate(draft: AnnouncementDraft, _actor: AuthenticatedUser): void {
    if (draft.audience !== 'all') {
      throw new BadRequestException(
        `Unsupported audience '${draft.audience}'. Only 'all' is supported by the current schema (no per-role segment).`,
      );
    }
  }
}
