import { createHash, randomBytes } from 'node:crypto';

export function hashRegistrationCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export function newRegistrationCode(): string {
  return randomBytes(16).toString('hex').toUpperCase();
}
