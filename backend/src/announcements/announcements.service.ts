import { Injectable } from '@nestjs/common';
import { Announcement, AnnouncementSegment, ReadConfirmation, UserRole } from '@prisma/client';
import { auditOnCreate, auditOnUpdate } from '../common/audit';
import { assertVisible } from '../common/access';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AnnouncementsRepository } from './announcements.repository';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

type AnnouncementWithConfirmations = Announcement & { confirmations: ReadConfirmation[] };

function isVisibleTo(announcement: Announcement, user: AuthenticatedUser): boolean {
  if (announcement.segment === AnnouncementSegment.all) return true;
  if (announcement.segment === AnnouncementSegment.block) return user.block === announcement.block;
  if (announcement.segment === AnnouncementSegment.apartment) {
    return user.block === announcement.block && user.apartment === announcement.apartment;
  }
  return false;
}

@Injectable()
export class AnnouncementsService {
  constructor(private repo: AnnouncementsRepository) {}

  async listForUser(user: AuthenticatedUser): Promise<AnnouncementWithConfirmations[]> {
    const all = await this.repo.all();
    if (user.role === UserRole.resident) {
      return all.filter((a) => isVisibleTo(a, user));
    }
    if (user.role === UserRole.manager) {
      return all;
    }
    return [];
  }

  /** Mesma segmentação do `listForUser` — sem isto o retrieve vaza comunicado de outro apartamento. */
  async findByIdForUser(
    id: bigint,
    user: AuthenticatedUser,
  ): Promise<AnnouncementWithConfirmations | null> {
    const announcement = await this.repo.findById(id);
    if (!announcement) return null;
    if (user.role === UserRole.manager) return announcement;
    if (user.role === UserRole.resident && isVisibleTo(announcement, user)) return announcement;
    return null;
  }

  create(dto: CreateAnnouncementDto, user: AuthenticatedUser) {
    return this.repo.create({ ...dto, ...auditOnCreate(user) });
  }

  update(id: bigint, dto: UpdateAnnouncementDto, user: AuthenticatedUser) {
    return this.repo.update(id, { ...dto, ...auditOnUpdate(user) });
  }

  remove(id: bigint) {
    return this.repo.remove(id);
  }

  async confirmRead(announcementId: bigint, resident: AuthenticatedUser) {
    assertVisible(await this.findByIdForUser(announcementId, resident));
    return this.repo.confirmRead(announcementId, resident.id);
  }

  confirmedByMe(announcement: AnnouncementWithConfirmations, user: AuthenticatedUser): boolean {
    return announcement.confirmations.some((c) => c.residentId === user.id);
  }
}
