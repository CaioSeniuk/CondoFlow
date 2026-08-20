import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { auditOnCreate, auditOnUpdate } from '../common/audit';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PollWithOptions, PollsRepository, VotesRepository } from './polls.repository';
import { CreatePollDto, UpdatePollDto } from './dto/poll.dto';

@Injectable()
export class PollsService {
  constructor(
    private repo: PollsRepository,
    private voteRepo: VotesRepository,
  ) {}

  listForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.resident || user.role === UserRole.manager) return this.repo.all();
    return Promise.resolve([]);
  }

  findById(id: bigint) {
    return this.repo.findById(id);
  }

  /** Mesmo escopo do `listForUser` — porteiro e prestador não enxergam enquete. */
  findByIdForUser(id: bigint, user: AuthenticatedUser) {
    if (user.role === UserRole.resident || user.role === UserRole.manager) {
      return this.repo.findById(id);
    }
    return Promise.resolve(null);
  }

  create(dto: CreatePollDto, user: AuthenticatedUser) {
    const { options, ...rest } = dto;
    return this.repo.create({ ...rest, ...auditOnCreate(user) }, options);
  }

  update(id: bigint, dto: UpdatePollDto, user: AuthenticatedUser) {
    return this.repo.update(id, { ...dto, ...auditOnUpdate(user) });
  }

  remove(id: bigint) {
    return this.repo.remove(id);
  }

  async vote(pollId: bigint, optionId: bigint, resident: AuthenticatedUser) {
    const option = await this.repo.findOption(pollId, optionId);
    if (!option) throw new BadRequestException({ option: 'Invalid option for this poll.' });

    const existing = await this.voteRepo.findByPollAndResident(pollId, resident.id);
    if (existing) {
      throw new BadRequestException({ detail: 'This resident has already voted on this poll.' });
    }

    return this.voteRepo.create(option.id, resident.id);
  }

  async votedPollIds(resident: AuthenticatedUser): Promise<Set<bigint>> {
    const votes = await this.voteRepo.findPollIdsVotedBy(resident.id);
    return new Set(votes.map((v) => v.option.pollId));
  }

  serialize(poll: PollWithOptions, votedPollIds: Set<bigint>) {
    const { options, ...rest } = poll;
    return {
      ...rest,
      options: options.map(({ _count, ...option }) => ({ ...option, totalVotes: _count.votes })),
      votedByMe: votedPollIds.has(poll.id),
    };
  }
}
