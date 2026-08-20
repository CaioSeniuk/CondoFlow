import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

/**
 * Regressão da regra inegociável nº 2: controle de acesso por perfil em toda rota.
 * Bate na API de verdade porque o furo original estava no controller (rota de detalhe
 * chamando findById sem escopo), não na regra do service.
 *
 * Precisa de Postgres: roda quando TEST_DATABASE_URL está definida (ver
 * reservations.concurrency.spec.ts para como subir um local).
 */
const DB = process.env.TEST_DATABASE_URL;
const describeWithDb = DB ? describe : describe.skip;

describeWithDb('Controle de acesso entre moradores (IDOR)', () => {
  let app: any;
  let prisma: PrismaService;
  let tokenA: string;
  let visitorOfB: bigint;
  let ticketOfB: bigint;

  beforeAll(async () => {
    process.env.DATABASE_URL = DB;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.statusHistory.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.visitor.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.user.deleteMany();

    const mk = (n: string, block: string, apt: string) =>
      prisma.user.create({
        data: {
          username: n,
          password: 'x',
          role: UserRole.resident,
          block,
          apartment: apt,
          firstName: n,
          lastName: 'X',
          email: `${n}@e.com`,
        },
      });
    const a = await mk('morador-a', 'A', '101');
    const b = await mk('morador-b', 'B', '202');

    const v = await prisma.visitor.create({
      data: {
        name: 'Visita do B',
        document: '123.456.789-00',
        block: 'B',
        apartment: '202',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 3600_000),
        createdById: b.id,
      },
    });
    visitorOfB = v.id;

    const t = await prisma.ticket.create({
      data: { residentId: b.id, category: 'Plumbing', location: 'Bath', description: 'Leak' },
    });
    ticketOfB = t.id;

    const jwt: JwtService = app.get(JwtService);
    const config: ConfigService = app.get(ConfigService);
    tokenA = jwt.sign(
      { sub: a.id.toString(), type: 'access' },
      { secret: config.get<string>('JWT_ACCESS_SECRET'), expiresIn: '5m' },
    );
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${tokenA}`);

  it('morador A não lê o visitante do morador B', async () => {
    const res = await auth(request(app.getHttpServer()).get(`/api/v1/visitors/${visitorOfB}`));
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('123.456.789-00');
  });

  it('morador A não edita o visitante do morador B', async () => {
    const res = await auth(
      request(app.getHttpServer()).patch(`/api/v1/visitors/${visitorOfB}`).send({ name: 'hack' }),
    );
    expect(res.status).toBe(404);
    const after = await prisma.visitor.findUnique({ where: { id: visitorOfB } });
    expect(after?.name).toBe('Visita do B');
  });

  it('morador A não apaga o visitante do morador B', async () => {
    const res = await auth(request(app.getHttpServer()).delete(`/api/v1/visitors/${visitorOfB}`));
    expect(res.status).toBe(404);
    expect(await prisma.visitor.count({ where: { id: visitorOfB } })).toBe(1);
  });

  it('morador A não lê nem apaga o chamado do morador B', async () => {
    expect(
      (await auth(request(app.getHttpServer()).get(`/api/v1/tickets/${ticketOfB}`))).status,
    ).toBe(404);
    expect(
      (await auth(request(app.getHttpServer()).delete(`/api/v1/tickets/${ticketOfB}`))).status,
    ).toBe(404);
    expect(await prisma.ticket.count({ where: { id: ticketOfB } })).toBe(1);
  });
});
