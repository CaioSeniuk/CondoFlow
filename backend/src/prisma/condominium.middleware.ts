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

export function condominiumMiddleware(
  exists: (model: string, id: bigint, condominiumId: bigint) => Promise<boolean>,
): Prisma.Middleware {
  return async (params, next) => {
    const scope = condominiumContext.getStore();
    if (scope && 'system' in scope) return next(params);
    if (!scope || !('condominiumId' in scope)) {
      throw new UnauthorizedException('Condominium context required');
    }
    // The only raw query used by repositories is the advisory reservation lock.
    if (!params.model) {
      if (params.action === 'executeRaw') {
        const args: unknown = params.args;
        if (
          Array.isArray(args) &&
          args.length === 2 &&
          Array.isArray(args[0]) &&
          args[0].length === 2 &&
          args[0][0] === 'SELECT pg_advisory_xact_lock(' &&
          args[0][1] === ')' &&
          typeof args[1] === 'bigint'
        ) {
          return next(params);
        }
      }
      throw new BadRequestException('Unscoped raw queries are not allowed');
    }
    const { condominiumId } = scope;
    const model = params.model;
    const filter = condominiumFilter(model, condominiumId);
    const args = params.args ?? {};
    const reads = [
      'findUnique',
      'findUniqueOrThrow',
      'findFirst',
      'findFirstOrThrow',
      'findMany',
      'count',
      'aggregate',
      'groupBy',
    ];
    const mutations = ['update', 'updateMany', 'delete', 'deleteMany', 'upsert'];
    if (reads.includes(params.action) || mutations.includes(params.action)) {
      args.where = { ...args.where, AND: [args.where?.AND ?? {}, filter] };
    }
    const metadata = Prisma.dmmf.datamodel.models.find((item) => item.name === model);
    async function validateData(value: unknown, creating: boolean) {
      const data = record(value);
      if ('condominiumId' in data && data.condominiumId !== condominiumId) {
        throw new BadRequestException('Cannot change condominium');
      }
      if (ownedModels.has(model) && creating) data.condominiumId = condominiumId;
      if (model === 'Condominium' && creating)
        throw new BadRequestException('Administrator provisioning required');
      for (const field of metadata?.fields ?? []) {
        if (field.kind !== 'object' || !(field.name in data)) continue;
        // Nested options inherit ownership from their newly created poll.
        if (model === 'Poll' && field.name === 'options' && creating) {
          const nested = record(data.options);
          if (
            Object.keys(nested).some((key) => key !== 'create') ||
            !Array.isArray(nested.create) ||
            nested.create.some((option) =>
              Object.keys(record(option)).some((key) => key !== 'text'),
            )
          ) {
            throw new BadRequestException('Only new poll options are allowed');
          }
          continue;
        }
        throw new BadRequestException('Use scoped scalar references instead of nested writes');
      }
      for (const field of metadata?.fields ?? []) {
        if (!field.relationFromFields?.length || field.type === 'Condominium') continue;
        for (const scalar of field.relationFromFields) {
          if (!(scalar in data) || data[scalar] === null) continue;
          const value = data[scalar];
          if (typeof value !== 'bigint') throw new BadRequestException('Invalid related record');
          if (!(await exists(field.type, value, condominiumId))) {
            throw new NotFoundException('Related record not found in your condominium');
          }
        }
      }
      return data;
    }
    if (params.action === 'create') args.data = await validateData(args.data, true);
    else if (params.action === 'update' || params.action === 'updateMany') {
      args.data = await validateData(args.data, false);
    } else if (params.action === 'upsert') {
      args.create = await validateData(args.create, true);
      args.update = await validateData(args.update, false);
    } else if (!reads.includes(params.action) && !mutations.includes(params.action)) {
      throw new BadRequestException(`Unsupported scoped operation: ${params.action}`);
    }
    params.args = args;
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
