import { Injectable } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const includeHistory = { statusHistory: { orderBy: { changedAt: 'asc' as const } } };

@Injectable()
export class TicketsRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.ticket.findMany({ orderBy: { createdAt: 'desc' }, include: includeHistory });
  }

  filterByResident(residentId: bigint) {
    return this.prisma.ticket.findMany({
      where: { residentId },
      orderBy: { createdAt: 'desc' },
      include: includeHistory,
    });
  }

  filterByProviderUser(providerUserId: bigint) {
    return this.prisma.ticket.findMany({
      where: { provider: { userId: providerUserId } },
      orderBy: { createdAt: 'desc' },
      include: includeHistory,
    });
  }

  findById(id: bigint) {
    return this.prisma.ticket.findUnique({ where: { id }, include: includeHistory });
  }

  findByIdForResident(id: bigint, residentId: bigint) {
    return this.prisma.ticket.findFirst({ where: { id, residentId }, include: includeHistory });
  }

  findByIdForProviderUser(id: bigint, providerUserId: bigint) {
    return this.prisma.ticket.findFirst({
      where: { id, provider: { userId: providerUserId } },
      include: includeHistory,
    });
  }

  create(data: Prisma.TicketUncheckedCreateInput) {
    return this.prisma.ticket.create({ data, include: includeHistory });
  }

  update(id: bigint, data: Prisma.TicketUncheckedUpdateInput) {
    return this.prisma.ticket.update({ where: { id }, data, include: includeHistory });
  }

  remove(id: bigint) {
    return this.prisma.ticket.delete({ where: { id } });
  }
}

@Injectable()
export class StatusHistoryRepository {
  constructor(private prisma: PrismaService) {}

  create(ticketId: bigint, status: TicketStatus, changedById: bigint, note = '') {
    return this.prisma.statusHistory.create({ data: { ticketId, status, changedById, note } });
  }
}
