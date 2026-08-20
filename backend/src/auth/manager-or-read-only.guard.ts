import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from './authenticated-user.interface';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Equivalente a IsManagerOrReadOnly: qualquer autenticado lê, só manager escreve. */
@Injectable()
export class ManagerOrReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser; method: string }>();
    if (!request.user) return false;
    if (SAFE_METHODS.has(request.method)) return true;
    return request.user.role === UserRole.manager;
  }
}
