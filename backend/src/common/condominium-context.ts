import { AsyncLocalStorage } from 'node:async_hooks';
import { UnauthorizedException } from '@nestjs/common';

type DatabaseScope = { condominiumId: bigint } | { system: true };

export const condominiumContext = new AsyncLocalStorage<DatabaseScope>();

export function requireCondominiumId(): bigint {
  const scope = condominiumContext.getStore();
  if (!scope || !('condominiumId' in scope)) {
    throw new UnauthorizedException('Condominium context required');
  }
  return scope.condominiumId;
}

export function tenantCreate<T>(data: T): T & { condominiumId: bigint } {
  return { ...data, condominiumId: requireCondominiumId() };
}

export function systemScope<T>(operation: () => PromiseLike<T>): Promise<T> {
  // Prisma queries are lazy: consume the promise before leaving the context.
  return condominiumContext.run({ system: true }, async () => await operation());
}
