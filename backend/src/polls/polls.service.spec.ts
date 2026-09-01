import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PollsService } from './polls.service';
import { PollsRepository, VotesRepository } from './polls.repository';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

const resident: AuthenticatedUser = {
  id: 1n,
  username: 'resident1',
  role: UserRole.resident,
  block: 'A',
  apartment: '101',
};

function makeService(repo: Partial<PollsRepository>, voteRepo: Partial<VotesRepository>) {
  return new PollsService(repo as PollsRepository, voteRepo as VotesRepository);
}

describe('PollsService.vote', () => {
  it('records the vote when the resident has not voted on the poll yet', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1n });
    const service = makeService(
      { findOption: jest.fn().mockResolvedValue({ id: 3n, pollId: 2n }) },
      { findByPollAndResident: jest.fn().mockResolvedValue(null), create },
    );

    await service.vote(2n, 3n, resident);

    expect(create).toHaveBeenCalledWith(3n, resident.id);
  });

  it('rejects a second vote on the same poll', async () => {
    const create = jest.fn();
    const service = makeService(
      { findOption: jest.fn().mockResolvedValue({ id: 4n, pollId: 2n }) },
      { findByPollAndResident: jest.fn().mockResolvedValue({ id: 8n }), create },
    );

    await expect(service.vote(2n, 4n, resident)).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an option that belongs to another poll', async () => {
    const service = makeService(
      { findOption: jest.fn().mockResolvedValue(null) },
      { findByPollAndResident: jest.fn(), create: jest.fn() },
    );

    await expect(service.vote(2n, 99n, resident)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PollsService.listForUser', () => {
  it('returns nothing for doormen and providers', async () => {
    const all = jest.fn();
    const service = makeService({ all }, {});

    await expect(service.listForUser({ ...resident, role: UserRole.doorman })).resolves.toEqual([]);
    await expect(service.listForUser({ ...resident, role: UserRole.provider })).resolves.toEqual(
      [],
    );
    expect(all).not.toHaveBeenCalled();
  });
});
