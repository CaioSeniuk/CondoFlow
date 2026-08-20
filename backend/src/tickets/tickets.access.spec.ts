import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { StatusHistoryRepository, TicketsRepository } from './tickets.repository';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

const resident: AuthenticatedUser = {
  id: 1n,
  username: 'resident1',
  role: UserRole.resident,
  block: 'A',
  apartment: '101',
};
const provider: AuthenticatedUser = { ...resident, id: 3n, role: UserRole.provider };
const manager: AuthenticatedUser = { ...resident, id: 9n, role: UserRole.manager };

function makeService(repo: Partial<TicketsRepository>) {
  return new TicketsService(repo as TicketsRepository, {} as StatusHistoryRepository);
}

describe('TicketsService — escopo por dono', () => {
  it("does not expose another resident's ticket", async () => {
    // findByIdForResident filtra por residentId, então o chamado alheio não volta.
    const findByIdForResident = jest.fn().mockResolvedValue(null);
    const findById = jest.fn();
    const service = makeService({ findByIdForResident, findById });

    await expect(service.findByIdForUser(5n, resident)).resolves.toBeNull();
    expect(findByIdForResident).toHaveBeenCalledWith(5n, resident.id);
    expect(findById).not.toHaveBeenCalled();
  });

  it("does not let a resident update another resident's ticket", async () => {
    const update = jest.fn();
    const service = makeService({ findByIdForResident: jest.fn().mockResolvedValue(null), update });

    await expect(service.update(5n, { category: 'x' }, resident)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("does not let a resident delete another resident's ticket", async () => {
    const remove = jest.fn();
    const service = makeService({ findByIdForResident: jest.fn().mockResolvedValue(null), remove });

    await expect(service.remove(5n, resident)).rejects.toBeInstanceOf(NotFoundException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('scopes a provider to the tickets assigned to them', async () => {
    const findByIdForProviderUser = jest.fn().mockResolvedValue(null);
    const service = makeService({ findByIdForProviderUser, findById: jest.fn() });

    await expect(service.findByIdForUser(5n, provider)).resolves.toBeNull();
    expect(findByIdForProviderUser).toHaveBeenCalledWith(5n, provider.id);
  });

  it('lets a manager reach any ticket', async () => {
    const findById = jest.fn().mockResolvedValue({ id: 5n });
    const service = makeService({ findById });

    await expect(service.findByIdForUser(5n, manager)).resolves.toEqual({ id: 5n });
  });

  it('hides tickets from doormen', async () => {
    const service = makeService({ findById: jest.fn(), findByIdForResident: jest.fn() });

    await expect(
      service.findByIdForUser(5n, { ...resident, role: UserRole.doorman }),
    ).resolves.toBeNull();
  });
});
