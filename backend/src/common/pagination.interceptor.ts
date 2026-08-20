import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { PAGE_SIZE, paginate, paginationOffset } from './pagination';

/**
 * Envelopa qualquer resposta em lista no mesmo formato do PageNumberPagination do DRF.
 * O corte é em memória (os services devolvem a lista inteira) — suficiente para o
 * volume do MVP, mas é o ponto a trocar por LIMIT/OFFSET se as tabelas crescerem.
 */
@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        if (!Array.isArray(data)) return data;

        const page = Math.max(1, Number.parseInt(String(request.query.page ?? '1'), 10) || 1);
        const offset = paginationOffset(page);
        return paginate(data.slice(offset, offset + PAGE_SIZE), data.length, page);
      }),
    );
  }
}
