import { Injectable } from '@nestjs/common';
import { Package, PackageStatus, UserRole } from '@prisma/client';
import { auditOnCreate, auditOnUpdate } from '../common/audit';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PackagesRepository } from './packages.repository';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';

@Injectable()
export class PackagesService {
  constructor(private repo: PackagesRepository) {}

  listForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.resident) {
      return this.repo.filterByBlockApartment(user.block, user.apartment);
    }
    if (user.role === UserRole.manager || user.role === UserRole.doorman) {
      return this.repo.all();
    }
    return Promise.resolve([]);
  }

  /** Mesmo escopo do `listForUser` — morador só vê encomenda do próprio apartamento. */
  private canAccess(pkg: Package, user: AuthenticatedUser): boolean {
    if (user.role === UserRole.manager || user.role === UserRole.doorman) return true;
    if (user.role === UserRole.resident) {
      return pkg.block === user.block && pkg.apartment === user.apartment;
    }
    return false;
  }

  async findByIdForUser(id: bigint, user: AuthenticatedUser): Promise<Package | null> {
    const pkg = await this.repo.findById(id);
    if (!pkg || !this.canAccess(pkg, user)) return null;
    return pkg;
  }

  create(dto: CreatePackageDto, photoUrl: string, user: AuthenticatedUser) {
    return this.repo.create({ ...dto, photo: photoUrl, ...auditOnCreate(user) });
  }

  update(id: bigint, dto: UpdatePackageDto, user: AuthenticatedUser) {
    return this.repo.update(id, { ...dto, ...auditOnUpdate(user) });
  }

  remove(id: bigint) {
    return this.repo.remove(id);
  }

  pickup(id: bigint, pickedUpBy: string, actor: AuthenticatedUser) {
    return this.repo.update(id, {
      status: PackageStatus.picked_up,
      pickedUpAt: new Date(),
      pickedUpBy,
      releasedById: actor.id,
      updatedById: actor.id,
    });
  }
}
