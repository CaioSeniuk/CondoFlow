import { AuthenticatedUser } from '../../auth/authenticated-user.interface';

export type AnnouncementAudience = 'all' | 'residents' | 'providers' | 'managers';

export interface Announcement {
  id: bigint;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  urgent: boolean;
  createdById: bigint;
  createdAt: Date;
  trackReads: boolean;
}

export interface AnnouncementDraft {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  urgent?: boolean;
  trackReads?: boolean;
}

export interface AnnouncementRepository {
  save(data: Omit<Announcement, 'id'>): Promise<Announcement>;
  configureReadTracking(id: bigint): Promise<void>;
}

export interface AnnouncementVisibilityChain {
  validate(
    draft: AnnouncementDraft,
    actor: AuthenticatedUser,
  ): void | Promise<void>;
}
