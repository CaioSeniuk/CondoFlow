import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireCondominiumId } from '../common/condominium-context';
import { hashRegistrationCode, newRegistrationCode } from './registration-code';

@Injectable()
export class CondominiumsService {
  constructor(private prisma: PrismaService) {}

  async me() {
    const condominium = await this.prisma.condominium.findUniqueOrThrow({
      where: { id: requireCondominiumId() },
      select: { id: true, name: true, registrationCodeHash: true, codeUpdatedAt: true },
    });
    return {
      id: condominium.id,
      name: condominium.name,
      codeEnabled: condominium.registrationCodeHash !== null,
      codeUpdatedAt: condominium.codeUpdatedAt,
    };
  }

  async replaceCode() {
    const id = requireCondominiumId();
    const code = newRegistrationCode();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${id})`;
      await tx.condominium.update({
        where: { id },
        data: {
          registrationCode: code,
          registrationCodeHash: hashRegistrationCode(code),
          codeUpdatedAt: new Date(),
        },
      });
    });
    return { ...(await this.me()), code };
  }

  async revokeCode() {
    const id = requireCondominiumId();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${id})`;
      await tx.condominium.update({
        where: { id },
        data: { registrationCode: null, registrationCodeHash: null, codeUpdatedAt: new Date() },
      });
    });
    return this.me();
  }
}
