import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PasswordService } from '../auth/password.service';
import { UsersRepository } from './users.repository';
import { CreateManagedUserDto, RegisterDto, UpdateUserDto } from './dto/user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { condominiumContext, systemScope } from '../common/condominium-context';
import { hashRegistrationCode } from '../condominiums/registration-code';

@Injectable()
export class UsersService {
  constructor(
    private repo: UsersRepository,
    private passwords: PasswordService,
    private prisma: PrismaService,
  ) {}

  listAll() {
    return this.repo.all();
  }

  findById(id: bigint) {
    return this.repo.findById(id);
  }

  async register(dto: RegisterDto) {
    const { password, condominiumCode, ...rest } = dto;
    const hash = hashRegistrationCode(condominiumCode);
    const condominium = await systemScope(() =>
      this.prisma.condominium.findUnique({
        where: { registrationCodeHash: hash },
        select: { id: true },
      }),
    );
    if (!condominium) throw new BadRequestException('Código do condomínio inválido ou revogado.');
    const hashed = await this.passwords.hash(password);
    try {
      return await systemScope(() =>
        this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${condominium.id})`;
          const current = await tx.condominium.findUnique({ where: { id: condominium.id } });
          if (current?.registrationCodeHash !== hash) {
            throw new BadRequestException('Código do condomínio inválido ou revogado.');
          }
          return condominiumContext.run(
            { condominiumId: condominium.id },
            async () =>
              await tx.user.create({
                data: { ...rest, password: hashed, condominiumId: condominium.id },
              }),
          );
        }),
      );
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async createManaged(dto: CreateManagedUserDto) {
    const { password, ...rest } = dto;
    const hashed = await this.passwords.hash(password);
    try {
      return await this.repo.create({ ...rest, password: hashed });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  private handleConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Este nome de usuário já está em uso.');
    }
    throw error;
  }

  async update(id: bigint, dto: UpdateUserDto) {
    const target = await this.repo.findById(id);
    if (target?.isSuperuser)
      throw new ForbiddenException('Administradores globais não podem ser alterados pelo síndico.');
    try {
      return await this.repo.update(id, dto);
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async remove(id: bigint) {
    const target = await this.repo.findById(id);
    if (target?.isSuperuser)
      throw new ForbiddenException('Administradores globais não podem ser excluídos pelo síndico.');
    return this.repo.remove(id);
  }
}
