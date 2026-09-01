import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertVisible } from '../common/access';
import { UserRole } from '@prisma/client';
import { auditOnCreate, auditOnUpdate } from '../common/audit';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CommonAreasRepository, ReservationsRepository } from './reservations.repository';
import {
  CreateCommonAreaDto,
  CreateReservationDto,
  UpdateCommonAreaDto,
  UpdateReservationDto,
} from './dto/reservation.dto';

@Injectable()
export class CommonAreasService {
  constructor(private repo: CommonAreasRepository) {}

  listAll() {
    return this.repo.all();
  }

  findById(id: bigint) {
    return this.repo.findById(id);
  }

  create(dto: CreateCommonAreaDto, user: AuthenticatedUser) {
    return this.repo.create({ ...dto, ...auditOnCreate(user) });
  }

  update(id: bigint, dto: UpdateCommonAreaDto, user: AuthenticatedUser) {
    return this.repo.update(id, { ...dto, ...auditOnUpdate(user) });
  }

  remove(id: bigint) {
    return this.repo.remove(id);
  }
}

@Injectable()
export class ReservationsService {
  constructor(private repo: ReservationsRepository) {}

  listForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.resident) return this.repo.filterByResident(user.id);
    if (user.role === UserRole.manager) return this.repo.all();
    return Promise.resolve([]);
  }

  findById(id: bigint) {
    return this.repo.findById(id);
  }

  /** Mesmo escopo do `listForUser` — morador só acessa a própria reserva. */
  findByIdForUser(id: bigint, user: AuthenticatedUser) {
    if (user.role === UserRole.manager) return this.repo.findById(id);
    if (user.role === UserRole.resident) return this.repo.findByIdForResident(id, user.id);
    return Promise.resolve(null);
  }

  async create(dto: CreateReservationDto, resident: AuthenticatedUser) {
    const commonAreaId = BigInt(dto.commonArea);
    this.assertValidWindow(dto.startTime, dto.endTime);

    // Checagem de conflito e insert na mesma transação, com a área comum travada:
    // fora dela duas requisições simultâneas passariam as duas pela checagem.
    return this.repo.withCommonAreaLock(commonAreaId, async (tx) => {
      await this.assertNoConflict(commonAreaId, dto.startTime, dto.endTime, undefined, tx);
      return this.repo.create(
        {
          commonAreaId,
          residentId: resident.id,
          startTime: dto.startTime,
          endTime: dto.endTime,
          ...auditOnCreate(resident),
        },
        tx,
      );
    });
  }

  async update(id: bigint, dto: UpdateReservationDto, user: AuthenticatedUser) {
    const current = assertVisible(await this.findByIdForUser(id, user));

    const commonAreaId =
      dto.commonArea === undefined ? current.commonAreaId : BigInt(dto.commonArea);
    const startTime = dto.startTime ?? current.startTime;
    const endTime = dto.endTime ?? current.endTime;
    this.assertValidWindow(startTime, endTime);

    return this.repo.withCommonAreaLock(commonAreaId, async (tx) => {
      await this.assertNoConflict(commonAreaId, startTime, endTime, id, tx);
      return this.repo.update(id, { commonAreaId, startTime, endTime, ...auditOnUpdate(user) }, tx);
    });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    assertVisible(await this.findByIdForUser(id, user));
    return this.repo.remove(id);
  }

  private assertValidWindow(startTime: Date, endTime: Date) {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }
  }

  private async assertNoConflict(
    commonAreaId: bigint,
    startTime: Date,
    endTime: Date,
    excludeId: bigint | undefined,
    tx: Prisma.TransactionClient,
  ) {
    const conflict = await this.repo.findOverlapping(
      commonAreaId,
      startTime,
      endTime,
      excludeId,
      tx,
    );
    if (conflict) {
      throw new BadRequestException(
        'This common area is already reserved for the selected period.',
      );
    }
  }
}
