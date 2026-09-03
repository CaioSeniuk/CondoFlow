import { Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { assertVisible } from './access';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

export interface ScopedResourceService<T> {
  listForUser(user: AuthenticatedUser): T[] | Promise<T[]>;
  findByIdForUser(id: bigint, user: AuthenticatedUser): (T | null) | Promise<T | null>;
}

export interface ScopedResourceDocs {
  listSummary: string;
  listDescription: string;
  retrieveSummary: string;
  retrieveDescription: string;
}

/**
 * Base para controllers cujo `list`/`retrieve` só delegam ao
 * `listForUser`/`findByIdForUser` do service (o mesmo formato em packages,
 * tickets, providers, evidences e reservations) — evita repetir essas duas
 * rotas idênticas em cada controller.
 */
export function ScopedResourceController<T>(docs: ScopedResourceDocs) {
  class Base {
    service!: ScopedResourceService<T>;

    @Get()
    @ApiOperation({ summary: docs.listSummary, description: docs.listDescription })
    list(@Req() req: { user: AuthenticatedUser }) {
      return this.service.listForUser(req.user);
    }

    @Get(':id')
    @ApiOperation({ summary: docs.retrieveSummary, description: docs.retrieveDescription })
    async retrieve(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
      return assertVisible(await this.service.findByIdForUser(BigInt(id), req.user));
    }
  }
  return Base;
}
