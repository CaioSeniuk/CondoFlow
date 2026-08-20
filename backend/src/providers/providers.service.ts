import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { auditOnCreate, auditOnUpdate } from '../common/audit';
import { assertVisible } from '../common/access';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { EvidenceRepository, ProvidersRepository } from './providers.repository';
import {
  CreateEvidenceDto,
  CreateProviderDto,
  UpdateEvidenceDto,
  UpdateProviderDto,
} from './dto/provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private repo: ProvidersRepository) {}

  listForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.manager) return this.repo.all();
    if (user.role === UserRole.provider) return this.repo.filterByUser(user.id);
    return Promise.resolve([]);
  }

  /** Mesmo escopo do `listForUser` — prestador só acessa o próprio cadastro. */
  findByIdForUser(id: bigint, user: AuthenticatedUser) {
    if (user.role === UserRole.manager) return this.repo.findById(id);
    if (user.role === UserRole.provider) return this.repo.findByIdForUser(id, user.id);
    return Promise.resolve(null);
  }

  create(dto: CreateProviderDto, document: string | null, user: AuthenticatedUser) {
    const { user: userId, ...rest } = dto;
    return this.repo.create({
      ...rest,
      document,
      userId: userId === undefined ? null : BigInt(userId),
      ...auditOnCreate(user),
    });
  }

  async update(
    id: bigint,
    dto: UpdateProviderDto,
    document: string | null,
    user: AuthenticatedUser,
  ) {
    assertVisible(await this.findByIdForUser(id, user));
    const { user: userId, ...rest } = dto;
    return this.repo.update(id, {
      ...rest,
      ...(document !== null ? { document } : {}),
      ...(userId !== undefined ? { userId: BigInt(userId) } : {}),
      ...auditOnUpdate(user),
    });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    assertVisible(await this.findByIdForUser(id, user));
    return this.repo.remove(id);
  }
}

@Injectable()
export class EvidenceService {
  constructor(private repo: EvidenceRepository) {}

  listForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.provider) return this.repo.filterByProviderUser(user.id);
    if (user.role === UserRole.resident) return this.repo.filterByResident(user.id);
    if (user.role === UserRole.manager) return this.repo.all();
    return Promise.resolve([]);
  }

  /**
   * Mesmo escopo do `listForUser` — prestador só acessa evidência de chamado atribuído
   * a ele, morador só a dos próprios chamados.
   */
  findByIdForUser(id: bigint, user: AuthenticatedUser) {
    if (user.role === UserRole.manager) return this.repo.findById(id);
    if (user.role === UserRole.provider) return this.repo.findByIdForProviderUser(id, user.id);
    if (user.role === UserRole.resident) return this.repo.findByIdForResident(id, user.id);
    return Promise.resolve(null);
  }

  async create(
    dto: CreateEvidenceDto,
    photos: { beforePhoto: string | null; afterPhoto: string | null },
    user: AuthenticatedUser,
  ) {
    // Sem isto o prestador anexaria evidência em chamado de outro prestador.
    assertVisible(await this.repo.ticketAssignedTo(BigInt(dto.ticket), user.id));
    return this.repo.create({
      ticketId: BigInt(dto.ticket),
      notes: dto.notes,
      beforePhoto: photos.beforePhoto,
      afterPhoto: photos.afterPhoto,
      ...auditOnCreate(user),
    });
  }

  async update(
    id: bigint,
    dto: UpdateEvidenceDto,
    photos: { beforePhoto: string | null; afterPhoto: string | null },
    user: AuthenticatedUser,
  ) {
    assertVisible(await this.findByIdForUser(id, user));
    return this.repo.update(id, {
      ...dto,
      ...(photos.beforePhoto !== null ? { beforePhoto: photos.beforePhoto } : {}),
      ...(photos.afterPhoto !== null ? { afterPhoto: photos.afterPhoto } : {}),
      ...auditOnUpdate(user),
    });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    assertVisible(await this.findByIdForUser(id, user));
    return this.repo.remove(id);
  }
}
