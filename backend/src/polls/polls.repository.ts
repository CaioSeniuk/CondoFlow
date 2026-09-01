import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const includeOptions = {
  options: {
    orderBy: { id: 'asc' },
    include: { _count: { select: { votes: true } } },
  },
} satisfies Prisma.PollInclude;

export type PollWithOptions = Prisma.PollGetPayload<{ include: typeof includeOptions }>;

@Injectable()
export class PollsRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.poll.findMany({ include: includeOptions, orderBy: { createdAt: 'desc' } });
  }

  findById(id: bigint) {
    return this.prisma.poll.findUnique({ where: { id }, include: includeOptions });
  }

  create(data: Prisma.PollUncheckedCreateInput, options: { text: string }[]) {
    return this.prisma.poll.create({
      data: { ...data, options: { create: options } },
      include: includeOptions,
    });
  }

  update(id: bigint, data: Prisma.PollUncheckedUpdateInput) {
    return this.prisma.poll.update({ where: { id }, data, include: includeOptions });
  }

  remove(id: bigint) {
    return this.prisma.poll.delete({ where: { id } });
  }

  findOption(pollId: bigint, optionId: bigint) {
    return this.prisma.pollOption.findFirst({ where: { id: optionId, pollId } });
  }
}

@Injectable()
export class VotesRepository {
  constructor(private prisma: PrismaService) {}

  findByPollAndResident(pollId: bigint, residentId: bigint) {
    return this.prisma.vote.findFirst({ where: { residentId, option: { pollId } } });
  }

  findPollIdsVotedBy(residentId: bigint) {
    return this.prisma.vote.findMany({
      where: { residentId },
      select: { option: { select: { pollId: true } } },
    });
  }

  create(optionId: bigint, residentId: bigint) {
    return this.prisma.vote.create({ data: { optionId, residentId } });
  }
}
