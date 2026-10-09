import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { managedUserSchema, registerSchema } from './dto/user.dto';
import { condominiumContext } from '../common/condominium-context';
import { hashRegistrationCode } from '../condominiums/registration-code';

describe('Public registration business rule', () => {
  const code = 'A'.repeat(32);
  const input = registerSchema.parse({
    username: 'new-user',
    password: 'Password123',
    email: 'new@example.com',
    role: 'resident',
    condominiumCode: code,
  });
  const create = jest.fn();
  const lock = jest.fn();
  const lookup = jest.fn();
  const current = jest.fn();
  const hash = jest.fn();
  const managedCreate = jest.fn();
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    lookup.mockResolvedValue({ id: 9n });
    current.mockResolvedValue({ id: 9n, registrationCodeHash: hashRegistrationCode(code) });
    hash.mockResolvedValue('hashed-password');
    create.mockImplementation(async ({ data }) => ({ ...data, id: 1n }));
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: { create: managedCreate } },
        { provide: PasswordService, useValue: { hash } },
        {
          provide: PrismaService,
          useValue: {
            condominium: { findUnique: lookup },
            $transaction: (
              fn: (tx: {
                condominium: { findUnique: typeof current };
                user: { create: typeof create };
                $executeRaw: typeof lock;
              }) => Promise<unknown>,
            ) =>
              fn({
                condominium: { findUnique: current },
                user: { create },
                $executeRaw: lock,
              }),
          },
        },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('requires the code and refuses manager accounts even when submitted directly', () => {
    const { condominiumCode, ...noCode } = input;
    expect(registerSchema.safeParse(noCode).success).toBe(false);
    expect(registerSchema.safeParse({ ...input, role: 'manager' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...input, condominiumCode: 'invalid' }).success).toBe(false);
    expect(managedUserSchema.safeParse({ ...noCode, role: 'manager' }).success).toBe(true);
  });

  it('rejects unknown codes before hashing or creating an account', async () => {
    lookup.mockResolvedValue(null);
    await expect(service.register(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('binds the account to the code owner and never stores the code in the user', async () => {
    create.mockImplementation(async ({ data }) => {
      expect(condominiumContext.getStore()).toEqual({ condominiumId: 9n });
      return { ...data, id: 1n };
    });
    const result = await service.register(input);
    expect(result).toMatchObject({ condominiumId: 9n, password: 'hashed-password' });
    expect(result).not.toHaveProperty('condominiumCode');
    expect(lookup).toHaveBeenCalledWith({
      where: { registrationCodeHash: hashRegistrationCode(code) },
      select: { id: true },
    });
    expect(lock).toHaveBeenCalled();
  });

  it('rejects a code revoked or replaced while password hashing was in progress', async () => {
    current.mockResolvedValue({ id: 9n, registrationCodeHash: null });
    await expect(service.register(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns a conflict rather than a success when the username already exists', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.register(input)).rejects.toMatchObject({ status: 409 });
  });
});
