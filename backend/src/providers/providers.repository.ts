import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProvidersRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.provider.findMany({ orderBy: { name: 'asc' } });
  }

  filterByUser(userId: bigint) {
    return this.prisma.provider.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  }

  findById(id: bigint) {
    return this.prisma.provider.findUnique({ where: { id } });
  }

  findByIdForUser(id: bigint, userId: bigint) {
    return this.prisma.provider.findFirst({ where: { id, userId } });
  }

  create(data: Prisma.ProviderUncheckedCreateInput) {
    return this.prisma.provider.create({ data });
  }

  update(id: bigint, data: Prisma.ProviderUncheckedUpdateInput) {
    return this.prisma.provider.update({ where: { id }, data });
  }

  remove(id: bigint) {
    return this.prisma.provider.delete({ where: { id } });
  }
}

@Injectable()
export class EvidenceRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.evidence.findMany({ orderBy: { createdAt: 'desc' } });
  }

  filterByProviderUser(userId: bigint) {
    return this.prisma.evidence.findMany({
      where: { ticket: { provider: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  filterByResident(residentId: bigint) {
    return this.prisma.evidence.findMany({
      where: { ticket: { residentId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: bigint) {
    return this.prisma.evidence.findUnique({ where: { id } });
  }

  findByIdForProviderUser(id: bigint, userId: bigint) {
    return this.prisma.evidence.findFirst({ where: { id, ticket: { provider: { userId } } } });
  }

  findByIdForResident(id: bigint, residentId: bigint) {
    return this.prisma.evidence.findFirst({ where: { id, ticket: { residentId } } });
  }

  ticketAssignedTo(ticketId: bigint, providerUserId: bigint) {
    return this.prisma.ticket.findFirst({
      where: { id: ticketId, provider: { userId: providerUserId } },
      select: { id: true },
    });
  }

  create(data: Prisma.EvidenceUncheckedCreateInput) {
    return this.prisma.evidence.create({ data });
  }

  update(id: bigint, data: Prisma.EvidenceUncheckedUpdateInput) {
    return this.prisma.evidence.update({ where: { id }, data });
  }

  remove(id: bigint) {
    return this.prisma.evidence.delete({ where: { id } });
  }
}
