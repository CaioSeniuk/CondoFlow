import { BadRequestException, Injectable } from '@nestjs/common';
import { AnnouncementsRepository } from './announcements.repository';
import {
  Announcement,
  AnnouncementDraft,
  AnnouncementRepository,
} from './templates';

/**
 * Adaptador que conecta o `AnnouncementPublisherTemplate` (Template Method
 * portado de design-pattern-implementation/backend) ao schema Prisma real
 * do CondoFlow, sem alterar `announcements.repository.ts`/
 * `announcements.service.ts` existentes.
 *
 * O template original trabalha com um domínio genérico
 * (`Announcement{body, audience: 'all'|'residents'|'providers'|'managers'}`)
 * diferente do modelo real (`Announcement{message, segment: 'all'|'block'|
 * 'apartment'}`). Não há equivalente direto para segmentação por papel de
 * usuário no schema atual, então esse adaptador só aceita `audience: 'all'`
 * (mapeado para `segment: 'all'`); qualquer outro valor é rejeitado com
 * `BadRequestException` (decisão confirmada com o usuário).
 */
@Injectable()
export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly repository: AnnouncementsRepository) {}

  async save(data: Omit<Announcement, 'id'>): Promise<Announcement> {
    if (data.audience !== 'all') {
      throw new BadRequestException(
        `Unsupported audience '${data.audience}'. Only 'all' is supported by the current schema (no per-role segment).`,
      );
    }

    const created = await this.repository.create({
      title: data.title,
      message: data.body,
      segment: 'all',
      urgent: data.urgent,
      createdById: data.createdById,
    });

    return {
      id: created.id,
      title: created.title,
      body: created.message,
      audience: 'all',
      urgent: created.urgent,
      createdById: data.createdById,
      createdAt: created.createdAt,
      trackReads: data.trackReads,
    };
  }

  async configureReadTracking(_id: bigint): Promise<void> {
    // No-op: o schema atual já cria `ReadConfirmation` sob demanda em
    // `AnnouncementsRepository.confirmRead`, não existe uma tabela de
    // "configuração" de rastreamento separada para inicializar aqui.
  }
}
