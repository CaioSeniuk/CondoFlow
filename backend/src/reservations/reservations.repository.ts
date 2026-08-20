import { Injectable } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Aceita tanto o client normal quanto o client de dentro de uma transação. */
type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CommonAreasRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.commonArea.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: bigint) {
    return this.prisma.commonArea.findUnique({ where: { id } });
  }

  create(data: Prisma.CommonAreaUncheckedCreateInput) {
    return this.prisma.commonArea.create({ data });
  }

  update(id: bigint, data: Prisma.CommonAreaUncheckedUpdateInput) {
    return this.prisma.commonArea.update({ where: { id }, data });
  }

  remove(id: bigint) {
    return this.prisma.commonArea.delete({ where: { id } });
  }
}

const includeNames = {
  commonArea: { select: { name: true } },
  resident: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ReservationInclude;

@Injectable()
export class ReservationsRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Serializa as operações de reserva de uma mesma área comum. O lock consultivo é
   * liberado no commit/rollback, então duas requisições simultâneas não conseguem mais
   * passar as duas pela checagem de conflito antes de qualquer uma gravar.
   *
   * Áreas comuns diferentes não se bloqueiam entre si (a chave do lock é o id da área).
   */
  withCommonAreaLock<T>(
    commonAreaId: bigint,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${commonAreaId})`;
      return fn(tx);
    });
  }

  all() {
    return this.prisma.reservation.findMany({
      include: includeNames,
      orderBy: { startTime: 'asc' },
    });
  }

  filterByResident(residentId: bigint) {
    return this.prisma.reservation.findMany({
      where: { residentId },
      include: includeNames,
      orderBy: { startTime: 'asc' },
    });
  }

  findById(id: bigint) {
    return this.prisma.reservation.findUnique({ where: { id }, include: includeNames });
  }

  findByIdForResident(id: bigint, residentId: bigint) {
    return this.prisma.reservation.findFirst({ where: { id, residentId }, include: includeNames });
  }

  /** Replica a query de overlap do `Reservation.clean()` do Django. */
  findOverlapping(
    commonAreaId: bigint,
    startTime: Date,
    endTime: Date,
    excludeId?: bigint,
    db: Db = this.prisma,
  ) {
    return db.reservation.findFirst({
      where: {
        commonAreaId,
        status: ReservationStatus.confirmed,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
    });
  }

  create(data: Prisma.ReservationUncheckedCreateInput, db: Db = this.prisma) {
    return db.reservation.create({ data, include: includeNames });
  }

  update(id: bigint, data: Prisma.ReservationUncheckedUpdateInput, db: Db = this.prisma) {
    return db.reservation.update({ where: { id }, data, include: includeNames });
  }

  remove(id: bigint) {
    return this.prisma.reservation.delete({ where: { id } });
  }
}
