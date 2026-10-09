import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { condominiumContext } from '../common/condominium-context';
import { hashRegistrationCode } from './registration-code';

const DB = process.env.TEST_DATABASE_URL;
const describeWithDb = DB ? describe : describe.skip;

describeWithDb('Condominium registration and isolation (Postgres)', () => {
  let app: INestApplication;
  let raw: PrismaClient;
  let prisma: PrismaService;
  let a: bigint;
  let b: bigint;
  let managerA: bigint;
  let residentB: bigint;
  let tokenA: string;
  let tokenResident: string;
  let visitorB: bigint;
  let ticketB: bigint;
  let providerB: bigint;
  let areaB: bigint;
  let codeA: string;
  let codeB: string;
  const scoped = <T>(id: bigint, fn: () => PromiseLike<T>) =>
    condominiumContext.run({ condominiumId: id }, async () => await fn());

  beforeAll(async () => {
    process.env.DATABASE_URL = DB;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    raw = new PrismaClient();
    a = (await raw.condominium.create({ data: { name: 'Condomínio A' } })).id;
    b = (await raw.condominium.create({ data: { name: 'Condomínio B' } })).id;
    const userA = await raw.user.create({
      data: {
        condominiumId: a,
        username: `manager-${a}`,
        password: 'unused',
        role: UserRole.manager,
        firstName: 'Síndico A',
        lastName: '',
        email: 'manager-a@example.com',
      },
    });
    managerA = userA.id;
    const userB = await raw.user.create({
      data: {
        condominiumId: b,
        username: `resident-${b}`,
        password: 'unused',
        role: UserRole.resident,
        firstName: 'Morador B',
        lastName: '',
        email: 'resident-b@example.com',
        block: 'A',
        apartment: '101',
      },
    });
    residentB = userB.id;
    const jwt = app.get(JwtService);
    const secret = app.get(ConfigService).get<string>('JWT_ACCESS_SECRET');
    tokenA = jwt.sign({ sub: managerA.toString(), type: 'access' }, { secret, expiresIn: '5m' });
    tokenResident = jwt.sign(
      { sub: residentB.toString(), type: 'access' },
      { secret, expiresIn: '5m' },
    );
    for (const condominiumId of [a, b]) {
      const residentId = condominiumId === a ? managerA : residentB;
      await raw.package.create({
        data: { condominiumId, block: 'A', apartment: '101', photo: 'test-photo' },
      });
      const visitor = await raw.visitor.create({
        data: {
          condominiumId,
          name: 'Visita',
          block: 'A',
          apartment: '101',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 60_000),
          createdById: residentId,
        },
      });
      const provider = await raw.provider.create({ data: { condominiumId, name: 'Prestador' } });
      const ticket = await raw.ticket.create({
        data: {
          condominiumId,
          residentId,
          providerId: provider.id,
          category: 'Manutenção',
          location: 'Portão',
          description: 'Teste',
        },
      });
      await raw.evidence.create({ data: { ticketId: ticket.id, notes: 'Evidência' } });
      await raw.statusHistory.create({
        data: { ticketId: ticket.id, status: 'open', changedById: residentId },
      });
      await raw.accessLog.create({
        data: { visitorId: visitor.id, direction: 'entry', registeredById: residentId },
      });
      const area = await raw.commonArea.create({ data: { condominiumId, name: 'Salão' } });
      await raw.reservation.create({
        data: {
          condominiumId,
          commonAreaId: area.id,
          residentId,
          startTime: new Date(),
          endTime: new Date(Date.now() + 60_000),
        },
      });
      const announcement = await raw.announcement.create({
        data: { condominiumId, title: 'Comunicado', message: 'Teste' },
      });
      await raw.readConfirmation.create({ data: { announcementId: announcement.id, residentId } });
      const poll = await raw.poll.create({
        data: { condominiumId, question: 'Teste?', options: { create: [{ text: 'Sim' }] } },
        include: { options: true },
      });
      await raw.vote.create({ data: { optionId: poll.options[0].id, residentId } });
      const category = await raw.expenseCategory.create({
        data: { condominiumId, name: 'Limpeza' },
      });
      await raw.expense.create({
        data: {
          condominiumId,
          categoryId: category.id,
          referenceMonth: new Date(),
          budgetedAmount: 100,
          actualAmount: 50,
        },
      });
      if (condominiumId === b) {
        visitorB = visitor.id;
        ticketB = ticket.id;
        providerB = provider.id;
        areaB = area.id;
      }
    }
  }, 60000);

  afterAll(async () => {
    if (raw) {
      const where = { condominiumId: { in: [a, b] } };
      await raw.expense.deleteMany({ where });
      await raw.expenseCategory.deleteMany({ where });
      await raw.poll.deleteMany({ where });
      await raw.announcement.deleteMany({ where });
      await raw.reservation.deleteMany({ where });
      await raw.commonArea.deleteMany({ where });
      await raw.ticket.deleteMany({ where });
      await raw.provider.deleteMany({ where });
      await raw.visitor.deleteMany({ where });
      await raw.package.deleteMany({ where });
      await raw.user.deleteMany({ where });
      await raw.condominium.deleteMany({ where: { id: { in: [a, b] } } });
      await raw.$disconnect();
    }
    await app?.close();
  });

  it('manager generates a code for only their own condominium; residents cannot generate one', async () => {
    const generated = await request(app.getHttpServer())
      .post('/api/v1/condominiums/me/registration-code')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(generated.status).toBe(201);
    codeA = generated.body.code;
    expect(codeA).toMatch(/^[A-F0-9]{32}$/);
    expect(generated.body.id).toBe(a.toString());
    expect(generated.body).not.toHaveProperty('registrationCodeHash');
    expect(
      (await raw.condominium.findUniqueOrThrow({ where: { id: a } })).registrationCodeHash,
    ).toBe(hashRegistrationCode(codeA));
    codeB = 'B'.repeat(32);
    await raw.condominium.update({
      where: { id: b },
      data: { registrationCodeHash: hashRegistrationCode(codeB) },
    });
    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/condominiums/me/registration-code')
      .set('Authorization', `Bearer ${tokenResident}`);
    expect(forbidden.status).toBe(403);
  });

  it('requires a valid code, refuses public managers and ignores forged condominium identifiers', async () => {
    const input = {
      username: `new-${a}`,
      password: 'Password123',
      email: 'new@example.com',
      role: 'resident',
    };
    for (const condominiumCode of [undefined, '', 'C'.repeat(32)]) {
      const result = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ ...input, condominiumCode });
      expect(result.status).toBe(400);
    }
    const manager = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ ...input, condominiumCode: codeA, role: 'manager' });
    expect(manager.status).toBe(400);
    const result = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ ...input, condominiumCode: codeB.toLowerCase(), condominiumId: a.toString() });
    expect(result.status).toBe(201);
    expect(result.body.condominiumId).toBe(b.toString());
    expect(result.body).not.toHaveProperty('password');
    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ ...input, condominiumCode: codeB });
    expect(duplicate.status).toBe(409);
  });

  it('scopes every resource and child query to the condominium', async () => {
    await scoped(a, async () => {
      for (const list of [
        () => prisma.announcement.findMany(),
        () => prisma.package.findMany(),
        () => prisma.visitor.findMany(),
        () => prisma.ticket.findMany(),
        () => prisma.provider.findMany(),
        () => prisma.commonArea.findMany(),
        () => prisma.reservation.findMany(),
        () => prisma.poll.findMany(),
        () => prisma.expenseCategory.findMany(),
        () => prisma.expense.findMany(),
        () => prisma.evidence.findMany(),
        () => prisma.accessLog.findMany(),
        () => prisma.statusHistory.findMany(),
        () => prisma.readConfirmation.findMany(),
        () => prisma.pollOption.findMany(),
        () => prisma.vote.findMany(),
      ])
        expect(await list()).toHaveLength(1);
      expect(await prisma.user.count()).toBe(1);
      expect(await prisma.visitor.findUnique({ where: { id: visitorB } })).toBeNull();
      await expect(
        prisma.ticket.update({ where: { id: ticketB }, data: { description: 'Invadido' } }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(prisma.visitor.delete({ where: { id: visitorB } })).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        prisma.ticket.create({
          data: {
            condominiumId: a,
            residentId: managerA,
            providerId: providerB,
            category: 'Teste',
            location: 'Teste',
            description: 'Teste',
          },
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        prisma.reservation.create({
          data: {
            condominiumId: a,
            commonAreaId: areaB,
            residentId: managerA,
            startTime: new Date(),
            endTime: new Date(Date.now() + 60_000),
          },
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
    for (const method of ['get', 'patch', 'delete'] as const) {
      const result = await request(app.getHttpServer())
        [method](`/api/v1/users/${residentB}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send(method === 'patch' ? { firstName: 'Invadido' } : {});
      expect(result.status).toBe(404);
    }
    const listed = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listed.body.results).toHaveLength(1);
    expect(listed.body.results[0].condominiumId).toBe(a.toString());
  });

  it('replacement and revocation block old codes but do not affect other condominiums', async () => {
    const input = {
      username: `revoked-${a}`,
      password: 'Password123',
      email: 'revoked@example.com',
      role: 'provider',
    };
    const replacement = await request(app.getHttpServer())
      .post('/api/v1/condominiums/me/registration-code')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(replacement.status).toBe(201);
    expect(replacement.body.code).not.toBe(codeA);
    expect(
      (
        await request(app.getHttpServer())
          .post('/api/v1/users')
          .send({ ...input, condominiumCode: codeA })
      ).status,
    ).toBe(400);
    const active = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ ...input, condominiumCode: replacement.body.code });
    expect(active.status).toBe(201);
    expect(active.body.condominiumId).toBe(a.toString());
    const revoked = await request(app.getHttpServer())
      .delete('/api/v1/condominiums/me/registration-code')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(revoked.status).toBe(200);
    expect(revoked.body.codeEnabled).toBe(false);
    expect(
      (
        await request(app.getHttpServer())
          .post('/api/v1/users')
          .send({ ...input, username: `other-${a}`, condominiumCode: replacement.body.code })
      ).status,
    ).toBe(400);
    expect(
      (await raw.condominium.findUniqueOrThrow({ where: { id: b } })).registrationCodeHash,
    ).toBe(hashRegistrationCode(codeB));
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${tokenA}`)
      ).status,
    ).toBe(200);
  });

  it('authenticated user creation binds the account to the manager condominium without a code', async () => {
    const input = {
      username: `managed-${a}`,
      password: 'Password123',
      email: 'managed@example.com',
      role: 'manager',
      condominiumId: b.toString(),
    };
    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/users/managed')
      .set('Authorization', `Bearer ${tokenResident}`)
      .send(input);
    expect(forbidden.status).toBe(403);
    const created = await request(app.getHttpServer())
      .post('/api/v1/users/managed')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(input);
    expect(created.status).toBe(201);
    expect(created.body.condominiumId).toBe(a.toString());
    expect(created.body).not.toHaveProperty('password');
  });

  it('upserts child records only for resources in the current condominium', async () => {
    await scoped(a, async () => {
      const announcement = await prisma.announcement.findFirstOrThrow();
      const confirmation = await prisma.readConfirmation.upsert({
        where: {
          announcementId_residentId: { announcementId: announcement.id, residentId: managerA },
        },
        create: { announcementId: announcement.id, residentId: managerA },
        update: {},
      });
      expect(confirmation.announcementId).toBe(announcement.id);
      const foreign = await raw.announcement.findFirstOrThrow({ where: { condominiumId: b } });
      await expect(
        prisma.readConfirmation.upsert({
          where: {
            announcementId_residentId: { announcementId: foreign.id, residentId: managerA },
          },
          create: { announcementId: foreign.id, residentId: managerA },
          update: {},
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
