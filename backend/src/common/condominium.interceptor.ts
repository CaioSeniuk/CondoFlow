import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { condominiumContext } from './condominium-context';

@Injectable()
export class CondominiumInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user) return next.handle();
    return new Observable((subscriber) =>
      condominiumContext.run({ condominiumId: user.condominiumId }, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}
