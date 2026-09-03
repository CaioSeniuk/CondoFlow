import { Announcement, AnnouncementSegment } from '@prisma/client';
import { Handler } from '../common/handler';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

export interface VisibilityRequest {
  announcement: Announcement;
  user: AuthenticatedUser;
}

export abstract class VisibilityHandler extends Handler<VisibilityRequest, boolean> {}

export class AllSegmentHandler extends VisibilityHandler {
  handle(request: VisibilityRequest): boolean | undefined {
    if (request.announcement.segment === AnnouncementSegment.all) return true;
    return super.handle(request);
  }
}

export class BlockSegmentHandler extends VisibilityHandler {
  handle(request: VisibilityRequest): boolean | undefined {
    if (request.announcement.segment === AnnouncementSegment.block) {
      return request.user.block === request.announcement.block;
    }
    return super.handle(request);
  }
}

export class ApartmentSegmentHandler extends VisibilityHandler {
  handle(request: VisibilityRequest): boolean | undefined {
    if (request.announcement.segment === AnnouncementSegment.apartment) {
      return (
        request.user.block === request.announcement.block &&
        request.user.apartment === request.announcement.apartment
      );
    }
    return super.handle(request);
  }
}

export function buildVisibilityChain(): VisibilityHandler {
  const all = new AllSegmentHandler();
  const block = new BlockSegmentHandler();
  const apartment = new ApartmentSegmentHandler();
  all.setNext(block).setNext(apartment);
  return all;
}

export function isVisibleTo(announcement: Announcement, user: AuthenticatedUser): boolean {
  return buildVisibilityChain().handle({ announcement, user }) ?? false;
}
