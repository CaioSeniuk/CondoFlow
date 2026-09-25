import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { AnnouncementDraft } from './announcement.types';
import { AnnouncementPublisherTemplate } from './announcement-publisher.template';

export class UrgentAnnouncementPublisher extends AnnouncementPublisherTemplate {
  protected formatMessage(
    draft: AnnouncementDraft,
    _actor: AuthenticatedUser,
  ): AnnouncementDraft {
    const title = draft.title.trim().toUpperCase();
    const body = `URGENTE: ${draft.body.trim()}`;

    return {
      ...draft,
      title: `⚠ ${title}`,
      body,
      urgent: true,
      trackReads: true,
    };
  }
}
