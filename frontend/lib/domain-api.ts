import { authenticatedRequest } from './api';
import type { DomainRecord } from './modules';
import type { PaginatedResult } from './types';

export function listRecords(path: string, page = 1) {
  return authenticatedRequest<PaginatedResult<DomainRecord>>(`${path}?page=${page}`);
}

export async function allRecords(path: string): Promise<DomainRecord[]> {
  const records: DomainRecord[] = [];
  async function appendPage(page: number): Promise<DomainRecord[]> {
    const result = await listRecords(path, page);
    records.push(...result.results);
    if (result.next !== null) return appendPage(result.next);
    return records;
  }
  return appendPage(1);
}

export function saveRecord(path: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: Record<string, unknown> | FormData) {
  return authenticatedRequest<Record<string, unknown>>(path, {
    method,
    ...(payload ? { body: payload instanceof FormData ? payload : JSON.stringify(payload),
    } : {}),
  });
}
