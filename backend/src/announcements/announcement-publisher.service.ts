import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaAnnouncementRepository } from './announcement-publisher.repository';
import { PrismaAnnouncementVisibilityChain } from './announcement-visibility.adapter';
import {
  AnnouncementDraft,
  AnnouncementPublisherTemplate,
  StandardAnnouncementPublisher,
  UrgentAnnouncementPublisher,
} from './templates';

export type AnnouncementPublisherType = 'standard' | 'urgent';

/**
 * Serviço isolado (não substitui `AnnouncementsService`) que expõe a
 * publicação de comunicados construída com o Template Method portado de
 * design-pattern-implementation/backend.
 */
@Injectable()
export class AnnouncementPublisherService {
  private readonly publishers: Record<AnnouncementPublisherType, AnnouncementPublisherTemplate>;

  constructor(
    repo: PrismaAnnouncementRepository,
    visibilityChain: PrismaAnnouncementVisibilityChain,
  ) {
    this.publishers = {
      standard: new StandardAnnouncementPublisher(repo, visibilityChain),
      urgent: new UrgentAnnouncementPublisher(repo, visibilityChain),
    };
  }

  publish(
    type: AnnouncementPublisherType,
    draft: AnnouncementDraft,
    actor: AuthenticatedUser,
  ) {
    return this.publishers[type].publish(draft, actor);
  }
}
