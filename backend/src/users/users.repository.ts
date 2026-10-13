import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { tenantCreate } from '../common/condominium-context';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.user.findMany({
      where: { isSuperuser: false },
      orderBy: { firstName: 'asc' },
    });
  }

  findById(id: bigint) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { condominium: { select: { id: true, name: true } } },
    });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  create(data: Omit<Prisma.UserUncheckedCreateInput, 'condominiumId'>) {
    return this.prisma.user.create({ data: tenantCreate(data) });
  }

  update(id: bigint, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  remove(id: bigint) {
    return this.prisma.user.delete({ where: { id } });
  }
}
