import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
const DJANGO_PBKDF2_PREFIX = 'pbkdf2_sha256$';
/** Só serve para gerar um hash descartável com o mesmo custo do real (ver runDummyVerify). */
const TIMING_EQUALIZER_INPUT = 'condoflow-timing-equalizer';

@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  /** Verifica bcrypt (usuários novos) ou pbkdf2_sha256 (usuários herdados do Django). */
  async verify(plain: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith(DJANGO_PBKDF2_PREFIX)) {
      return this.verifyDjangoPbkdf2(plain, storedHash);
    }
    return bcrypt.compare(plain, storedHash);
  }

  isLegacyDjangoHash(storedHash: string): boolean {
    return storedHash.startsWith(DJANGO_PBKDF2_PREFIX);
  }

  /**
   * Gasta o mesmo tempo de um `verify` real, para ser chamado quando o usuário não
   * existe. Sem isto, "usuário inexistente" responde na hora e "usuário existente com
   * senha errada" demora o custo do bcrypt — diferença suficiente para enumerar contas
   * por tempo de resposta. É a mesma mitigação do `ModelBackend.authenticate` do Django.
   */
  async runDummyVerify(plain: string): Promise<void> {
    this.dummyHash ??= this.hash(TIMING_EQUALIZER_INPUT);
    await bcrypt.compare(plain, await this.dummyHash);
  }

  private dummyHash?: Promise<string>;

  /** Replica PBKDF2PasswordHasher do Django: pbkdf2_sha256$<iterations>$<salt>$<base64(hash)> */
  private verifyDjangoPbkdf2(plain: string, storedHash: string): boolean {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const [algorithm, iterationsRaw, salt, expectedHashB64] = parts;
    if (algorithm !== 'pbkdf2_sha256') return false;

    const iterations = Number.parseInt(iterationsRaw, 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;

    const derived = crypto.pbkdf2Sync(plain, salt, iterations, 32, 'sha256');
    const computedHashB64 = derived.toString('base64');

    const expected = Buffer.from(expectedHashB64);
    const computed = Buffer.from(computedHashB64);
    if (expected.length !== computed.length) return false;
    return crypto.timingSafeEqual(expected, computed);
  }
}
