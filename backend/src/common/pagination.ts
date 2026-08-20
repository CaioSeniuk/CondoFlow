import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const PAGE_SIZE = 20;

export interface PaginatedResult<T> {
  count: number;
  next: number | null;
  previous: number | null;
  results: T[];
}

export function paginate<T>(items: T[], count: number, page: number): PaginatedResult<T> {
  const totalPages = Math.ceil(count / PAGE_SIZE);
  return {
    count,
    next: page < totalPages ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results: items,
  };
}

export function paginationOffset(page: number): number {
  return (page - 1) * PAGE_SIZE;
}
