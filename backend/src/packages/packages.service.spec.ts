import { PackageStatus, UserRole } from '@prisma/client';
import { PackagesService } from './packages.service';
import { PackagesRepository } from './packages.repository';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

const resident: AuthenticatedUser = {
  id: 1n,
  username: 'resident1',
  role: UserRole.resident,
  block: 'A',
  apartment: '101',
};
const doorman: AuthenticatedUser = {
  id: 2n,
  username: 'doorman1',
  role: UserRole.doorman,
  block: '',
  apartment: '',
};

function makeService(repo: Partial<PackagesRepository>) {
  return new PackagesService(repo as PackagesRepository);
}

describe('PackagesService', () => {
  it('scopes a resident to their own block/apartment', async () => {
    const filterByBlockApartment = jest.fn().mockResolvedValue([]);
    const all = jest.fn();
    const service = makeService({ filterByBlockApartment, all });

    await service.listForUser(resident);

    expect(filterByBlockApartment).toHaveBeenCalledWith('A', '101');
    expect(all).not.toHaveBeenCalled();
  });

  it('records who released the package and when, on pickup', async () => {
    const update = jest.fn().mockResolvedValue({ id: 1n });
    const service = makeService({ update });

    await service.pickup(1n, 'Ana Silva', doorman);

    expect(update).toHaveBeenCalledWith(
      1n,
      expect.objectContaining({
        status: PackageStatus.picked_up,
        pickedUpBy: 'Ana Silva',
        releasedById: doorman.id,
        pickedUpAt: expect.any(Date),
      }),
    );
  });
});
