import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user?.isSuperuser)
      throw new ForbiddenException('Acesso exclusivo do administrador global.');
    return true;
  }
}
