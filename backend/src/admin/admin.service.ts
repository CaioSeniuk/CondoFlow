import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { condominiumContext, systemScope } from '../common/condominium-context';
import { CondominiumsService } from '../condominiums/condominiums.service';
import { hashRegistrationCode, newRegistrationCode } from '../condominiums/registration-code';
import { ProvisionCondominiumDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private condominiums: CondominiumsService,
  ) {}

  list() {
    return systemScope(() =>
      this.prisma.condominium.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          registrationCode: true,
          codeUpdatedAt: true,
        },
      }),
    );
  }

  async provision(dto: ProvisionCondominiumDto) {
    const code = newRegistrationCode();
    try {
      const condominium = await systemScope(() =>
        this.prisma.condominium.create({
          data: {
            name: dto.name,
            registrationCode: code,
            registrationCodeHash: hashRegistrationCode(code),
            codeUpdatedAt: new Date(),
          },
          select: { id: true, name: true },
        }),
      );
      return { ...condominium, code };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um condomínio com este nome.');
      }
      throw error;
    }
  }

  replaceCode(id: bigint) {
    return condominiumContext.run({ condominiumId: id }, () => this.condominiums.replaceCode());
  }

  revokeCode(id: bigint) {
    return condominiumContext.run({ condominiumId: id }, () => this.condominiums.revokeCode());
  }

  async remove(id: bigint) {
    try {
      await systemScope(() =>
        this.prisma.$transaction(async (tx) => {
          // Blocks new foreign-key references until the emptiness check and deletion finish.
          const rows = await tx.$queryRaw<{ id: bigint }[]>`
            SELECT id FROM condominiums_condominium WHERE id = ${id} FOR UPDATE
          `;
          if (!rows.length) throw new NotFoundException('Condomínio não encontrado.');
          const condominium = await tx.condominium.findUniqueOrThrow({
            where: { id },
            select: {
              _count: {
                select: {
                  users: true,
                  announcements: true,
                  packages: true,
                  visitors: true,
                  tickets: true,
                  providers: true,
                  commonAreas: true,
                  reservations: true,
                  polls: true,
                  expenseCategories: true,
                  expenses: true,
                },
              },
            },
          });
          if (Object.values(condominium._count).some((count) => count > 0)) {
            throw new ConflictException(
              'Não é possível excluir um condomínio com usuários ou outros registros vinculados.',
            );
          }
          await tx.condominium.delete({ where: { id } });
        }),
      );
      return { message: 'Condomínio excluído.' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException(
            'Não é possível excluir um condomínio com usuários ou outros registros vinculados.',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Condomínio não encontrado.');
        }
      }
      throw error;
    }
  }
}
