import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsRepository } from './reservations.repository';
import { ReservationsService } from './reservations.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

/**
 * Regra inegociável nº 4 do projeto: reserva de área comum nunca pode ter conflito de
 * horário. Este teste precisa de um Postgres de verdade (o lock consultivo não existe
 * em mock), então roda só quando TEST_DATABASE_URL está definida — a CI sobe um
 * container efêmero para isso. Localmente:
 *
 *   docker run -d --name condoflow-test-pg -p 55432:5432 \
 *     -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test postgres:16
 *   TEST_DATABASE_URL='postgresql://test:test@localhost:55432/test' npx prisma db push
 *   TEST_DATABASE_URL='postgresql://test:test@localhost:55432/test' npm run test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeWithDb = TEST_DATABASE_URL ? describe : describe.skip;

const start = new Date('2026-09-01T18:00:00Z');
const end = new Date('2026-09-01T20:00:00Z');
const CONCURRENCY = 5;
/** Alarga a janela entre checar e gravar, para a corrida ser reproduzível. */
const RACE_WINDOW_MS = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const times = <T>(n: number, fn: () => Promise<T>) => Array.from({ length: n }, fn);

describeWithDb('Reserva de área comum sob concorrência', () => {
  let prisma: PrismaService;
  let repo: ReservationsRepository;
  let service: ReservationsService;
  let resident: AuthenticatedUser;
  let commonAreaId: bigint;

  async function checkThenInsert(db: PrismaService | Prisma.TransactionClient) {
    const conflict = await repo.findOverlapping(commonAreaId, start, end, undefined, db);
    await sleep(RACE_WINDOW_MS);
    if (conflict) throw new Error('conflict');
    return repo.create(
      { commonAreaId, residentId: resident.id, startTime: start, endTime: end },
      db,
    );
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = `${TEST_DATABASE_URL}?connection_limit=25`;
    prisma = new PrismaService();
    repo = new ReservationsRepository(prisma);
    service = new ReservationsService(repo);

    await prisma.$connect();
    await prisma.reservation.deleteMany();
    await prisma.commonArea.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        username: 'resident-concurrency',
        password: 'x',
        role: UserRole.resident,
        block: 'A',
        apartment: '101',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
      },
    });
    resident = {
      id: user.id,
      username: user.username,
      role: user.role,
      block: user.block,
      apartment: user.apartment,
    };
    commonAreaId = (await prisma.commonArea.create({ data: { name: 'Party room' } })).id;
  }, 60000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(() => prisma.reservation.deleteMany());

  it('reproduz o overbooking quando o "checa depois grava" roda sem o lock', async () => {
    await Promise.allSettled(times(CONCURRENCY, () => checkThenInsert(prisma)));

    // Baseline: comprova que a corrida é real, e não teórica.
    expect(await prisma.reservation.count()).toBeGreaterThan(1);
  }, 60000);

  it('grava só uma reserva quando a mesma corrida passa pelo lock', async () => {
    await Promise.allSettled(
      times(CONCURRENCY, () => repo.withCommonAreaLock(commonAreaId, (tx) => checkThenInsert(tx))),
    );

    expect(await prisma.reservation.count()).toBe(1);
  }, 60000);

  it('aceita só uma das requisições concorrentes no service completo', async () => {
    const results = await Promise.allSettled(
      times(CONCURRENCY, () =>
        service.create(
          { commonArea: Number(commonAreaId), startTime: start, endTime: end },
          resident,
        ),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.reservation.count()).toBe(1);
  }, 60000);

  it('não serializa reservas de áreas comuns diferentes', async () => {
    const other = await prisma.commonArea.create({ data: { name: 'Gym' } });

    const results = await Promise.allSettled([
      service.create(
        { commonArea: Number(commonAreaId), startTime: start, endTime: end },
        resident,
      ),
      service.create({ commonArea: Number(other.id), startTime: start, endTime: end }, resident),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    await prisma.reservation.deleteMany();
    await prisma.commonArea.delete({ where: { id: other.id } });
  }, 60000);
});
