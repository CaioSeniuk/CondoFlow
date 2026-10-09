import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { condominiumContext, systemScope } from '../common/condominium-context';
import { condominiumFilter, condominiumMiddleware } from './condominium.middleware';

function query(
  model: Prisma.ModelName,
  action: Prisma.PrismaAction,
  args: Record<string, unknown> = {},
): Prisma.MiddlewareParams {
  return { model, action, args, dataPath: [], runInTransaction: false };
}

describe('Condominium database scope', () => {
  const exists = jest.fn().mockResolvedValue(true);
  const middleware = condominiumMiddleware(exists);
  const next = jest.fn(async (params: Prisma.MiddlewareParams) => params.args);
  const scoped = <T>(fn: () => T) => condominiumContext.run({ condominiumId: 7n }, fn);

  beforeEach(() => {
    next.mockClear();
    exists.mockClear();
    exists.mockResolvedValue(true);
  });

  it('fails closed when a request has no condominium', async () => {
    await expect(middleware(query('Package', 'findMany'), next)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    'User',
    'Announcement',
    'Package',
    'Visitor',
    'Ticket',
    'Provider',
    'CommonArea',
    'Reservation',
    'Poll',
    'ExpenseCategory',
    'Expense',
  ] as const)(
    'scopes all reads and mutations for %s without trusting a supplied condominium',
    async (model) => {
      for (const action of [
        'findMany',
        'findUnique',
        'count',
        'aggregate',
        'update',
        'delete',
      ] as const) {
        const result = await scoped(() =>
          middleware(
            query(model, action, { where: { id: 1n, condominiumId: 8n }, data: {} }),
            next,
          ),
        );
        expect(result.where.AND).toContainEqual({ condominiumId: 7n });
      }
    },
  );

  it.each([
    'ReadConfirmation',
    'AccessLog',
    'StatusHistory',
    'Evidence',
    'PollOption',
    'Vote',
  ] as const)('scopes child records through their owner for %s', async (model) => {
    const result = await scoped(() => middleware(query(model, 'findMany'), next));
    expect(result.where.AND).toContainEqual(condominiumFilter(model, 7n));
  });

  it('assigns the condominium on creation and forbids reassignment', async () => {
    const result = await scoped(() =>
      middleware(query('Package', 'create', { data: { block: 'A' } }), next),
    );
    expect(result.data.condominiumId).toBe(7n);
    await expect(
      scoped(() =>
        middleware(
          query('User', 'update', { where: { id: 1n }, data: { condominiumId: 8n } }),
          next,
        ),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects links and nested writes to other condominiums', async () => {
    exists.mockResolvedValue(false);
    await expect(
      scoped(() => middleware(query('Ticket', 'create', { data: { residentId: 123n } }), next)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(exists).toHaveBeenCalledWith('User', 123n, 7n);
    await expect(
      scoped(() =>
        middleware(query('Provider', 'create', { data: { user: { connect: { id: 1n } } } }), next),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only allows nested poll options created with the parent', async () => {
    await scoped(() =>
      middleware(
        query('Poll', 'create', { data: { options: { create: [{ text: 'Sim' }] } } }),
        next,
      ),
    );
    await expect(
      scoped(() =>
        middleware(query('Poll', 'create', { data: { options: { connect: { id: 99n } } } }), next),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('isolates concurrent asynchronous request contexts', async () => {
    const results = await Promise.all(
      [1n, 2n, 3n].map((condominiumId) =>
        condominiumContext.run({ condominiumId }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return middleware(query('Expense', 'findMany'), next);
        }),
      ),
    );
    results.forEach((result, index) =>
      expect(result.where.AND).toContainEqual({ condominiumId: BigInt(index + 1) }),
    );
  });

  it('requires explicit system scope for provisioning', async () => {
    await systemScope(() =>
      middleware(query('Condominium', 'create', { data: { name: 'Novo' } }), next),
    );
    await expect(
      scoped(() => middleware(query('Condominium', 'create', { data: { name: 'Novo' } }), next)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows only the parameterized advisory lock used by transactions', async () => {
    const raw = (action: Prisma.PrismaAction, args: unknown): Prisma.MiddlewareParams => ({
      action,
      args,
      dataPath: [],
      runInTransaction: true,
    });
    await scoped(() =>
      middleware(raw('executeRaw', [['SELECT pg_advisory_xact_lock(', ')'], 7n]), next),
    );
    await expect(
      scoped(() =>
        middleware(raw('executeRaw', [['SELECT * FROM users_user WHERE id = ', ''], 7n]), next),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      scoped(() => middleware(raw('queryRaw', [['SELECT pg_advisory_xact_lock(', ')'], 7n]), next)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
