import { Test } from '@nestjs/testing';
import { CondominiumsService } from './condominiums.service';
import { PrismaService } from '../prisma/prisma.service';
import { condominiumContext } from '../common/condominium-context';
import { hashRegistrationCode } from './registration-code';

describe('Shared condominium code lifecycle', () => {
  const lock = jest.fn();
  const update = jest.fn();
  const find = jest.fn();
  let service: CondominiumsService;
  const scoped = <T>(fn: () => Promise<T>) => condominiumContext.run({ condominiumId: 9n }, fn);

  beforeEach(async () => {
    jest.clearAllMocks();
    find.mockResolvedValue({
      id: 9n,
      name: 'Condomínio Teste',
      registrationCodeHash: null,
      codeUpdatedAt: null,
    });
    const module = await Test.createTestingModule({
      providers: [
        CondominiumsService,
        {
          provide: PrismaService,
          useValue: {
            condominium: { findUniqueOrThrow: find },
            $transaction: (
              fn: (tx: {
                condominium: { update: typeof update };
                $executeRaw: typeof lock;
              }) => Promise<unknown>,
            ) => fn({ condominium: { update }, $executeRaw: lock }),
          },
        },
      ],
    }).compile();
    service = module.get(CondominiumsService);
  });

  it('does not expose stored hashes in the condominium profile', async () => {
    find.mockResolvedValue({
      id: 9n,
      name: 'Condomínio Teste',
      registrationCodeHash: 'hash',
      codeUpdatedAt: null,
    });
    expect(await scoped(() => service.me())).toEqual({
      id: 9n,
      name: 'Condomínio Teste',
      codeEnabled: true,
      codeUpdatedAt: null,
    });
  });

  it('persists generated codes and hashes in the current condominium', async () => {
    const first = await scoped(() => service.replaceCode());
    const second = await scoped(() => service.replaceCode());
    expect(first.code).toMatch(/^[A-F0-9]{32}$/);
    expect(second.code).not.toBe(first.code);
    expect(update).toHaveBeenCalledWith({
      where: { id: 9n },
      data: {
        registrationCode: first.code,
        registrationCodeHash: hashRegistrationCode(first.code),
        codeUpdatedAt: expect.any(Date),
      },
    });
    expect(lock).toHaveBeenCalledTimes(2);
  });

  it('revokes the code without changing or deleting existing accounts', async () => {
    await scoped(() => service.revokeCode());
    expect(update).toHaveBeenCalledWith({
      where: { id: 9n },
      data: { registrationCode: null, registrationCodeHash: null, codeUpdatedAt: expect.any(Date) },
    });
    expect(lock).toHaveBeenCalled();
  });
});
