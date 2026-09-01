import { Announcement, AnnouncementSegment, UserRole } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsRepository } from './announcements.repository';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

const resident: AuthenticatedUser = {
  id: 1n,
  username: 'resident1',
  role: UserRole.resident,
  block: 'A',
  apartment: '101',
};

function announcement(
  id: bigint,
  segment: AnnouncementSegment,
  block = '',
  apartment = '',
): Announcement {
  return {
    id,
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

describe('AnnouncementsService.listForUser', () => {
  const announcements = [
    announcement(1n, AnnouncementSegment.all),
    announcement(2n, AnnouncementSegment.block, 'A'),
    announcement(3n, AnnouncementSegment.block, 'B'),
    announcement(4n, AnnouncementSegment.apartment, 'A', '101'),
    announcement(5n, AnnouncementSegment.apartment, 'A', '202'),
  ];

  function makeService() {
    return new AnnouncementsService({
      all: jest.fn().mockResolvedValue(announcements),
    } as unknown as AnnouncementsRepository);
  }

  it('shows a resident only what targets their segment', async () => {
    const result = await makeService().listForUser(resident);
    expect(result.map((a) => a.id)).toEqual([1n, 2n, 4n]);
  });

  it('shows a manager every announcement', async () => {
    const result = await makeService().listForUser({ ...resident, role: UserRole.manager });
    expect(result).toHaveLength(announcements.length);
  });

  it('shows nothing to doormen and providers', async () => {
    const service = makeService();
    await expect(service.listForUser({ ...resident, role: UserRole.doorman })).resolves.toEqual([]);
    await expect(service.listForUser({ ...resident, role: UserRole.provider })).resolves.toEqual(
      [],
    );
  });
});
