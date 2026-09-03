import { TicketStatus, TicketUrgency, UserRole } from '@prisma/client';
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
const manager: AuthenticatedUser = {
  id: 2n,
  username: 'manager1',
  role: UserRole.manager,
  block: '',
  apartment: '',
};

function makeService(
  repo: Partial<TicketsRepository>,
  historyRepo: Partial<StatusHistoryRepository>,
) {
  return new TicketsService(repo as TicketsRepository, historyRepo as StatusHistoryRepository);
}

describe('TicketsService', () => {
  it('records the initial status history when a ticket is opened', async () => {
    const create = jest.fn().mockResolvedValue({ id: 5n, status: TicketStatus.open });
    const historyCreate = jest.fn().mockResolvedValue({ id: 1n });
    const service = makeService(
      { create, findById: jest.fn().mockResolvedValue({ id: 5n }) },
      { create: historyCreate },
    );

    await service.create(
      {
        category: 'Plumbing',
        location: 'Bathroom',
        description: 'Leaking pipe',
        urgency: TicketUrgency.high,
      },
      null,
      resident,
    );

    expect(historyCreate).toHaveBeenCalledWith(5n, TicketStatus.open, resident.id);
  });

  it('appends a history entry when the manager changes the status', async () => {
    const update = jest.fn().mockResolvedValue({ id: 5n });
    const historyCreate = jest.fn().mockResolvedValue({ id: 2n });
    const service = makeService(
      { update, findById: jest.fn().mockResolvedValue({ id: 5n, status: TicketStatus.open }) },
      { create: historyCreate },
    );

    await service.changeStatus(5n, TicketStatus.under_review, 'Checking', manager);

    expect(update).toHaveBeenCalledWith(
      5n,
      expect.objectContaining({ status: TicketStatus.under_review, updatedById: manager.id }),
    );
    expect(historyCreate).toHaveBeenCalledWith(
      5n,
      TicketStatus.under_review,
      manager.id,
      'Checking',
    );
  });

  it('rejects a status transition that the chain of responsibility does not allow', async () => {
    const update = jest.fn();
    const historyCreate = jest.fn();
    const service = makeService(
      { findById: jest.fn().mockResolvedValue({ id: 5n, status: TicketStatus.resolved }), update },
      { create: historyCreate },
    );

    await expect(
      service.changeStatus(5n, TicketStatus.under_review, 'Reopen', manager),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
    expect(historyCreate).not.toHaveBeenCalled();
  });

  it('scopes each role to the tickets it may see', async () => {
    const filterByResident = jest.fn().mockResolvedValue([]);
    const filterByProviderUser = jest.fn().mockResolvedValue([]);
    const all = jest.fn().mockResolvedValue([]);
    const service = makeService({ filterByResident, filterByProviderUser, all }, {});

    await service.listForUser(resident);
    await service.listForUser({ ...resident, role: UserRole.provider });
    await service.listForUser(manager);

    expect(filterByResident).toHaveBeenCalledWith(resident.id);
    expect(filterByProviderUser).toHaveBeenCalledWith(resident.id);
    expect(all).toHaveBeenCalled();
    await expect(service.listForUser({ ...manager, role: UserRole.doorman })).resolves.toEqual([]);
  });
});
