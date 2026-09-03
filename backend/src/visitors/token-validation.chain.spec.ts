import { Visitor } from '@prisma/client';
import { buildTokenValidationChain } from './token-validation.chain';
import { VisitorNotFoundError, VisitorTokenInvalidError } from './visitors.errors';

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

describe('token validation chain', () => {
  const now = new Date();
  const hours = (n: number) => new Date(now.getTime() + n * 3600_000);

  it('rejects when there is no visitor', () => {
    const chain = buildTokenValidationChain();

    expect(() => chain.handle({ visitor: null, now })).toThrow(VisitorNotFoundError);
  });

  it('rejects a token outside the validity window', () => {
    const chain = buildTokenValidationChain();
    const expired = visitorValidFor(hours(-5), hours(-1));

    expect(() => chain.handle({ visitor: expired, now })).toThrow(VisitorTokenInvalidError);
  });

  it('lets a token inside the validity window pass through the whole chain', () => {
    const chain = buildTokenValidationChain();
    const valid = visitorValidFor(hours(-1), hours(4));

    expect(() => chain.handle({ visitor: valid, now })).not.toThrow();
  });
});
