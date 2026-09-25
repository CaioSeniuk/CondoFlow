import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { AnnouncementDraft } from './announcement.types';
import { AnnouncementPublisherTemplate } from './announcement-publisher.template';

export class StandardAnnouncementPublisher extends AnnouncementPublisherTemplate {
  protected formatMessage(
    draft: AnnouncementDraft,
    _actor: AuthenticatedUser,
  ): AnnouncementDraft {
    return {
      ...draft,
      title: draft.title.trim(),
      body: draft.body.trim(),
      urgent: false,
      trackReads: draft.trackReads ?? true,
    };
  }
}
