import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { condominiumContext } from '../common/condominium-context';

const ownedModels = new Set([
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
]);

export function condominiumFilter(model: string, condominiumId: bigint): Record<string, unknown> {
  if (ownedModels.has(model)) return { condominiumId };
  switch (model) {
    case 'Condominium':
      return { id: condominiumId };
    case 'ReadConfirmation':
      return { announcement: { condominiumId } };
    case 'AccessLog':
      return { visitor: { condominiumId } };
    case 'StatusHistory':
    case 'Evidence':
      return { ticket: { condominiumId } };
    case 'PollOption':
      return { poll: { condominiumId } };
    case 'Vote':
      return { option: { poll: { condominiumId } } };
    default:
      throw new BadRequestException(`No condominium scope defined for ${model}`);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Invalid database write');
  }
  return value as Record<string, unknown>;
}

const reads = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);
const mutations = new Set(['update', 'updateMany', 'delete', 'deleteMany', 'upsert']);

function isReservationLock(params: Prisma.MiddlewareParams): boolean {
  const args: unknown = params.args;
  return (
    params.action === 'executeRaw' &&
    Array.isArray(args) &&
    args.length === 2 &&
    Array.isArray(args[0]) &&
    args[0].length === 2 &&
    args[0][0] === 'SELECT pg_advisory_xact_lock(' &&
    args[0][1] === ')' &&
    typeof args[1] === 'bigint'
  );
}

function validateNestedWrites(model: string, data: Record<string, unknown>, creating: boolean) {
  const metadata = Prisma.dmmf.datamodel.models.find((item) => item.name === model);
  for (const field of metadata?.fields ?? []) {
    if (field.kind !== 'object' || !(field.name in data)) continue;
    // Nested options inherit ownership from their newly created poll.
    if (model === 'Poll' && field.name === 'options' && creating) {
      const nested = record(data.options);
      if (
        Object.keys(nested).some((key) => key !== 'create') ||
        !Array.isArray(nested.create) ||
        nested.create.some((option) => Object.keys(record(option)).some((key) => key !== 'text'))
      ) {
        throw new BadRequestException('Only new poll options are allowed');
      }
    } else {
      throw new BadRequestException('Use scoped scalar references instead of nested writes');
    }
  }
}

type ReferenceExists = (model: string, id: bigint, condominiumId: bigint) => Promise<boolean>;

async function validateReferences(
  model: string,
  data: Record<string, unknown>,
  condominiumId: bigint,
  exists: ReferenceExists,
) {
  const metadata = Prisma.dmmf.datamodel.models.find((item) => item.name === model);
  const references = (metadata?.fields ?? [])
    .filter((field) => field.type !== 'Condominium')
    .flatMap((field) =>
      (field.relationFromFields ?? []).map((scalar) => ({ model: field.type, scalar })),
    )
    .filter(({ scalar }) => scalar in data && data[scalar] !== null);
  await Promise.all(
    references.map(async (reference) => {
      const id = data[reference.scalar];
      if (typeof id !== 'bigint') throw new BadRequestException('Invalid related record');
      if (!(await exists(reference.model, id, condominiumId))) {
        throw new NotFoundException('Related record not found in your condominium');
      }
    }),
  );
}

async function validateData(
  model: string,
  value: unknown,
  creating: boolean,
  condominiumId: bigint,
  exists: ReferenceExists,
) {
  const data = record(value);
  if ('condominiumId' in data && data.condominiumId !== condominiumId) {
    throw new BadRequestException('Cannot change condominium');
  }
  if (ownedModels.has(model) && creating) data.condominiumId = condominiumId;
  if (model === 'Condominium' && creating)
    throw new BadRequestException('Administrator provisioning required');
  validateNestedWrites(model, data, creating);
  await validateReferences(model, data, condominiumId, exists);
  return data;
}

async function scopeWrite(
  params: Prisma.MiddlewareParams,
  condominiumId: bigint,
  exists: ReferenceExists,
) {
  const args = params.args ?? {};
  const model = params.model;
  if (!model) throw new BadRequestException('Scoped model required');
  switch (params.action) {
    case 'create':
      args.data = await validateData(model, args.data, true, condominiumId, exists);
      break;
    case 'update':
    case 'updateMany':
      args.data = await validateData(model, args.data, false, condominiumId, exists);
      break;
    case 'upsert':
      args.create = await validateData(model, args.create, true, condominiumId, exists);
      args.update = await validateData(model, args.update, false, condominiumId, exists);
      break;
    default:
      if (!reads.has(params.action) && !mutations.has(params.action)) {
        throw new BadRequestException(`Unsupported scoped operation: ${params.action}`);
      }
  }
  params.args = args;
}

export function condominiumMiddleware(exists: ReferenceExists): Prisma.Middleware {
  return async (params, next) => {
    const scope = condominiumContext.getStore();
    if (scope && 'system' in scope) return next(params);
    if (!scope || !('condominiumId' in scope)) {
      throw new UnauthorizedException('Condominium context required');
    }
    // The only raw query used by repositories is the advisory reservation lock.
    if (!params.model) {
      if (isReservationLock(params)) return next(params);
      throw new BadRequestException('Unscoped raw queries are not allowed');
    }
    const { condominiumId } = scope;
    const model = params.model;
    const filter = condominiumFilter(model, condominiumId);
    const args = params.args ?? {};
    if (reads.has(params.action) || mutations.has(params.action)) {
      args.where = { ...args.where, AND: [args.where?.AND ?? {}, filter] };
    }
    params.args = args;
    await scopeWrite(params, condominiumId, exists);
    try {
      return await next(params);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Record not found in your condominium');
      }
      throw error;
    }
  };
}
