import { Announcement, AnnouncementSegment, UserRole } from '@prisma/client';
import { isVisibleTo } from './visibility.chain';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

const resident: AuthenticatedUser = {
  id: 1n,
  username: 'resident1',
  role: UserRole.resident,
  block: 'A',
  apartment: '101',
};

function announcement(segment: AnnouncementSegment, block = '', apartment = ''): Announcement {
  return {
    id: 1n,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 2n,
    updatedById: null,
    title: 'T',
    message: 'M',
    segment,
    block,
    apartment,
    urgent: false,
  };
}

describe('announcement visibility chain', () => {
  it('is visible to everyone when the segment is "all"', () => {
    expect(isVisibleTo(announcement(AnnouncementSegment.all), resident)).toBe(true);
  });

  it('is visible only to residents of the same block when the segment is "block"', () => {
    expect(isVisibleTo(announcement(AnnouncementSegment.block, 'A'), resident)).toBe(true);
    expect(isVisibleTo(announcement(AnnouncementSegment.block, 'B'), resident)).toBe(false);
  });

  it('is visible only to the target apartment when the segment is "apartment"', () => {
    expect(isVisibleTo(announcement(AnnouncementSegment.apartment, 'A', '101'), resident)).toBe(
      true,
    );
    expect(isVisibleTo(announcement(AnnouncementSegment.apartment, 'A', '202'), resident)).toBe(
      false,
    );
  });
});
