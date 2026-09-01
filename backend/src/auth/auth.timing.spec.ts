import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';

const passwords = new PasswordService();

async function medianDuration(fn: () => Promise<unknown>, runs = 7) {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    await fn().catch(() => undefined);
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

function makeAuth(user: unknown) {
  return new AuthService(
    { user: { findUnique: jest.fn().mockResolvedValue(user) } } as unknown as PrismaService,
    { signAsync: jest.fn().mockResolvedValue('token') } as never,
    passwords,
    { get: jest.fn().mockReturnValue('secret') } as never,
  );
}

describe('AuthService.login — enumeração de usuário por timing', () => {
  it('gasta o mesmo tempo para usuário inexistente e para senha errada', async () => {
    const existing = {
      id: 1n,
      username: 'resident1',
      password: await passwords.hash('senha-correta'),
      isActive: true,
      role: UserRole.resident,
      block: 'A',
      apartment: '101',
    };

    const missing = makeAuth(null);
    const wrongPassword = makeAuth(existing);

    // Aquece o hash descartável, que é calculado sob demanda na primeira chamada.
    await expect(missing.login('nobody', 'qualquer-senha')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const tMissing = await medianDuration(() => missing.login('nobody', 'qualquer-senha'));
    const tWrong = await medianDuration(() => wrongPassword.login('resident1', 'senha-errada'));

    // Sem a mitigação em AuthService.login a razão cai para ~0: o caminho do usuário
    // inexistente responde na hora, sem calcular hash nenhum.
    const ratio = tMissing / tWrong;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2);
  }, 60000);
});
