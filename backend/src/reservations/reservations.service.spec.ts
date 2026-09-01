import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { ReservationsRepository } from './reservations.repository';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

const resident: AuthenticatedUser = {
  id: 1n,
  username: 'resident1',
  role: UserRole.resident,
  block: 'A',
  apartment: '101',
};
const manager: AuthenticatedUser = { ...resident, id: 9n, role: UserRole.manager };

const fakeTx = Symbol('tx');

type RepoStub = Record<string, jest.Mock>;

function makeService(repo: RepoStub) {
  return new ReservationsService({
    // Executa `fn` direto: o teste cobre a lógica, não o lock do Postgres.
    withCommonAreaLock: jest.fn((_id: bigint, fn: (tx: unknown) => unknown) => fn(fakeTx)),
    ...repo,
  } as unknown as ReservationsRepository);
}

describe('ReservationsService', () => {
  const start = new Date('2026-09-01T18:00:00Z');
  const end = new Date('2026-09-01T20:00:00Z');

  it('creates a reservation when there is no overlap', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1n });
    const service = makeService({ findOverlapping: jest.fn().mockResolvedValue(null), create });

    await service.create({ commonArea: 7, startTime: start, endTime: end }, resident);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ commonAreaId: 7n, residentId: 1n, startTime: start, endTime: end }),
      fakeTx,
    );
  });

  it('rejects a reservation that overlaps a confirmed one', async () => {
    const create = jest.fn();
    const service = makeService({
      findOverlapping: jest.fn().mockResolvedValue({ id: 99n }),
      create,
    });

    await expect(
      service.create({ commonArea: 7, startTime: start, endTime: end }, resident),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('checks the overlap inside the common area lock, not before it', async () => {
    const withCommonAreaLock = jest.fn(async (_id: bigint, fn: (tx: unknown) => unknown) =>
      fn(fakeTx),
    );
    const findOverlapping = jest.fn().mockResolvedValue(null);
    const service = makeService({
      withCommonAreaLock,
      findOverlapping,
      create: jest.fn().mockResolvedValue({ id: 1n }),
    });

    await service.create({ commonArea: 7, startTime: start, endTime: end }, resident);

    expect(withCommonAreaLock).toHaveBeenCalledWith(7n, expect.any(Function));
    // A checagem recebe o client transacional — se rodasse fora da transação, o lock
    // não impediria duas requisições simultâneas de passarem as duas.
    expect(findOverlapping).toHaveBeenCalledWith(7n, start, end, undefined, fakeTx);
  });

  it('rejects a reservation that ends before it starts', async () => {
    const findOverlapping = jest.fn();
    const service = makeService({ findOverlapping, create: jest.fn() });

    await expect(
      service.create({ commonArea: 7, startTime: end, endTime: start }, resident),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findOverlapping).not.toHaveBeenCalled();
  });

  it('excludes the reservation itself from the overlap check on update', async () => {
    const findOverlapping = jest.fn().mockResolvedValue(null);
    const service = makeService({
      findByIdForResident: jest
        .fn()
        .mockResolvedValue({ id: 5n, commonAreaId: 7n, startTime: start, endTime: end }),
      findOverlapping,
      update: jest.fn().mockResolvedValue({ id: 5n }),
    });

    await service.update(5n, { startTime: start }, resident);

    expect(findOverlapping).toHaveBeenCalledWith(7n, start, end, 5n, fakeTx);
  });

  it('returns nothing for roles that cannot see reservations', async () => {
    const all = jest.fn();
    const filterByResident = jest.fn();
    const service = makeService({ all, filterByResident });

    await expect(service.listForUser({ ...resident, role: UserRole.doorman })).resolves.toEqual([]);
    expect(all).not.toHaveBeenCalled();
    expect(filterByResident).not.toHaveBeenCalled();
  });
});

describe('ReservationsService — escopo por dono', () => {
  it("does not let a resident read another resident's reservation", async () => {
    // findByIdForResident filtra por residentId, então a reserva de outro morador não volta.
    const findByIdForResident = jest.fn().mockResolvedValue(null);
    const findById = jest.fn();
    const service = makeService({ findByIdForResident, findById });

    await expect(service.findByIdForUser(5n, resident)).resolves.toBeNull();
    expect(findByIdForResident).toHaveBeenCalledWith(5n, resident.id);
    expect(findById).not.toHaveBeenCalled();
  });

  it("does not let a resident delete another resident's reservation", async () => {
    const remove = jest.fn();
    const service = makeService({
      findByIdForResident: jest.fn().mockResolvedValue(null),
      remove,
    });

    await expect(service.remove(5n, resident)).rejects.toBeInstanceOf(NotFoundException);
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not let a resident update another resident's reservation", async () => {
    const update = jest.fn();
    const service = makeService({
      findByIdForResident: jest.fn().mockResolvedValue(null),
      update,
    });

    await expect(service.update(5n, { startTime: new Date() }, resident)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('lets a manager reach any reservation', async () => {
    const findById = jest.fn().mockResolvedValue({ id: 5n });
    const service = makeService({ findById });

    await expect(service.findByIdForUser(5n, manager)).resolves.toEqual({ id: 5n });
  });

  it('hides reservations from doormen and providers', async () => {
    const service = makeService({ findById: jest.fn(), findByIdForResident: jest.fn() });

    await expect(
      service.findByIdForUser(5n, { ...resident, role: UserRole.doorman }),
    ).resolves.toBeNull();
    await expect(
      service.findByIdForUser(5n, { ...resident, role: UserRole.provider }),
    ).resolves.toBeNull();
  });
});
