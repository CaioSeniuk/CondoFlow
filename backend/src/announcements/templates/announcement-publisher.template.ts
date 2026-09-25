import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import {
  Announcement,
  AnnouncementDraft,
  AnnouncementRepository,
  AnnouncementVisibilityChain,
} from './announcement.types';

/**
 * Design pattern: Template Method.
 *
 * Publicar um comunicado sempre passa pela mesma sequência:
 * 1) validar a segmentação usando a Chain of Responsibility de visibilidade;
 * 2) formatar a mensagem;
 * 3) salvar;
 * 4) configurar o rastreamento de leitura.
 *
 * StandardAnnouncementPublisher e UrgentAnnouncementPublisher só alteram
 * os passos que realmente variam.
 */
export abstract class AnnouncementPublisherTemplate {
  constructor(
    protected readonly repo: AnnouncementRepository,
    protected readonly visibilityChain: AnnouncementVisibilityChain,
  ) {}

  async publish(
    draft: AnnouncementDraft,
    actor: AuthenticatedUser,
  ): Promise<Announcement> {
    await this.validateSegmentation(draft, actor);
    const formatted = await this.formatMessage(draft, actor);
    const saved = await this.save(formatted, actor);
    await this.configureReadTracking(saved);
    return saved;
  }

  protected async validateSegmentation(
    draft: AnnouncementDraft,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (!draft.title.trim() || !draft.body.trim()) {
      throw new ForbiddenException('Announcement title and body are required');
    }

    await this.visibilityChain.validate(draft, actor);
  }

  protected abstract formatMessage(
    draft: AnnouncementDraft,
    actor: AuthenticatedUser,
  ): Promise<AnnouncementDraft> | AnnouncementDraft;

  protected async save(
    draft: AnnouncementDraft,
    actor: AuthenticatedUser,
  ): Promise<Announcement> {
    return this.repo.save({
      title: draft.title,
      body: draft.body,
      audience: draft.audience,
      urgent: draft.urgent ?? false,
      createdById: actor.id,
      createdAt: new Date(),
      trackReads: draft.trackReads ?? true,
    });
  }

  protected async configureReadTracking(announcement: Announcement): Promise<void> {
    if (announcement.trackReads) {
      await this.repo.configureReadTracking(announcement.id);
    }
  }
}
