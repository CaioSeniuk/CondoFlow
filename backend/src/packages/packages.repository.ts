import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { tenantCreate } from '../common/condominium-context';

@Injectable()
export class PackagesRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.package.findMany({ orderBy: { createdAt: 'desc' } });
  }

  filterByBlockApartment(block: string, apartment: string) {
    return this.prisma.package.findMany({
      where: { block, apartment },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: bigint) {
    return this.prisma.package.findUnique({ where: { id } });
  }

  create(data: Omit<Prisma.PackageUncheckedCreateInput, 'condominiumId'>) {
    return this.prisma.package.create({ data: tenantCreate(data) });
  }

  update(id: bigint, data: Prisma.PackageUncheckedUpdateInput) {
    return this.prisma.package.update({ where: { id }, data });
  }

  remove(id: bigint) {
    return this.prisma.package.delete({ where: { id } });
  }
}
