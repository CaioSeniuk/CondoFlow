import { AccessDirection, UserRole, Visitor } from '@prisma/client';
import { VisitorsService } from './visitors.service';
import { VisitorTokenInvalidError, VisitorNotFoundError } from './visitors.errors';
import { AccessLogRepository, VisitorsRepository } from './visitors.repository';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

const doorman: AuthenticatedUser = {
  id: 2n,
  username: 'doorman1',
  role: UserRole.doorman,
  block: '',
  apartment: '',
};

function visitorValidFor(validFrom: Date, validUntil: Date): Visitor {
  return {
    id: 10n,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 1n,
    updatedById: null,
    name: 'John Doe',
    document: '',
    block: 'A',
    apartment: '101',
    token: '0d5f1b6e-1111-2222-3333-444455556666',
    validFrom,
    validUntil,
  };
}

function makeService(visitor: Visitor | null, accessLogRepo: Partial<AccessLogRepository> = {}) {
  return new VisitorsService(
    { findByToken: jest.fn().mockResolvedValue(visitor) } as unknown as VisitorsRepository,
    { create: jest.fn().mockResolvedValue({ id: 1n }), ...accessLogRepo } as AccessLogRepository,
  );
}

describe('VisitorsService.validateToken', () => {
  const now = Date.now();
  const hours = (n: number) => new Date(now + n * 3600_000);

  it('registers the access log when the token is inside its validity window', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1n });
    const service = makeService(visitorValidFor(hours(-1), hours(4)), { create });

    const result = await service.validateToken('token', AccessDirection.entry, doorman);

    expect(result.visitor.id).toBe(10n);
    expect(create).toHaveBeenCalledWith(10n, AccessDirection.entry, doorman.id);
  });

  it('rejects an expired token and logs no access', async () => {
    const create = jest.fn();
    const service = makeService(visitorValidFor(hours(-5), hours(-1)), { create });

    await expect(
      service.validateToken('token', AccessDirection.entry, doorman),
    ).rejects.toBeInstanceOf(VisitorTokenInvalidError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a token that is not valid yet', async () => {
    const service = makeService(visitorValidFor(hours(2), hours(6)));

    await expect(
      service.validateToken('token', AccessDirection.entry, doorman),
    ).rejects.toBeInstanceOf(VisitorTokenInvalidError);
  });

  it('rejects an unknown token', async () => {
    const service = makeService(null);

    await expect(
      service.validateToken('nope', AccessDirection.entry, doorman),
    ).rejects.toBeInstanceOf(VisitorNotFoundError);
  });
});
