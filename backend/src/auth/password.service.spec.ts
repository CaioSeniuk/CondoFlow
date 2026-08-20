import * as crypto from 'node:crypto';
import { PasswordService } from './password.service';

function djangoHash(plain: string, iterations = 1000, salt = 'abcdefghij') {
  const derived = crypto.pbkdf2Sync(plain, salt, iterations, 32, 'sha256');
  return `pbkdf2_sha256$${iterations}$${salt}$${derived.toString('base64')}`;
}

describe('PasswordService', () => {
  const service = new PasswordService();
  const plain = 'super-secure-password-123';

  it('verifies a password hashed by itself', async () => {
    const hash = await service.hash(plain);
    await expect(service.verify(plain, hash)).resolves.toBe(true);
    await expect(service.verify('wrong', hash)).resolves.toBe(false);
  });

  it('verifies a legacy Django PBKDF2 hash', async () => {
    const hash = djangoHash(plain);
    await expect(service.verify(plain, hash)).resolves.toBe(true);
    await expect(service.verify('wrong', hash)).resolves.toBe(false);
  });

  it('flags legacy hashes so they can be rehashed on login', async () => {
    expect(service.isLegacyDjangoHash(djangoHash(plain))).toBe(true);
    expect(service.isLegacyDjangoHash(await service.hash(plain))).toBe(false);
  });

  it('rejects a malformed legacy hash instead of throwing', async () => {
    await expect(service.verify(plain, 'pbkdf2_sha256$broken')).resolves.toBe(false);
  });
});
