import { Injectable } from '@nestjs/common';
import { AccessDirection, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitorsRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.visitor.findMany({ orderBy: { createdAt: 'desc' } });
  }

  filterByBlockApartment(block: string, apartment: string) {
    return this.prisma.visitor.findMany({
      where: { block, apartment },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: bigint) {
    return this.prisma.visitor.findUnique({ where: { id } });
  }

  findByToken(token: string) {
    return this.prisma.visitor.findUnique({ where: { token } });
  }

  create(data: Prisma.VisitorUncheckedCreateInput) {
    return this.prisma.visitor.create({ data });
  }

  update(id: bigint, data: Prisma.VisitorUncheckedUpdateInput) {
    return this.prisma.visitor.update({ where: { id }, data });
  }

  remove(id: bigint) {
    return this.prisma.visitor.delete({ where: { id } });
  }
}

@Injectable()
export class AccessLogRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.accessLog.findMany({ orderBy: { registeredAt: 'desc' } });
  }

  create(visitorId: bigint, direction: AccessDirection, registeredById: bigint) {
    return this.prisma.accessLog.create({ data: { visitorId, direction, registeredById } });
  }
}
