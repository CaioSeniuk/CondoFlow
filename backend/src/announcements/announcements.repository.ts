import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: { confirmations: true },
    });
  }

  findById(id: bigint) {
    return this.prisma.announcement.findUnique({
      where: { id },
      include: { confirmations: true },
    });
  }

  create(data: Prisma.AnnouncementUncheckedCreateInput) {
    return this.prisma.announcement.create({ data, include: { confirmations: true } });
  }

  update(id: bigint, data: Prisma.AnnouncementUncheckedUpdateInput) {
    return this.prisma.announcement.update({
      where: { id },
      data,
      include: { confirmations: true },
    });
  }

  remove(id: bigint) {
    return this.prisma.announcement.delete({ where: { id } });
  }

  confirmRead(announcementId: bigint, residentId: bigint) {
    return this.prisma.readConfirmation.upsert({
      where: { announcementId_residentId: { announcementId, residentId } },
      update: {},
      create: { announcementId, residentId },
    });
  }
}
