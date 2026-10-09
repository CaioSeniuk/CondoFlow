import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { hashRegistrationCode } from '../condominiums/registration-code';

const DB = process.env.TEST_DATABASE_URL;
const describeWithDb = DB ? describe : describe.skip;

describeWithDb('Global administrator provisioning', () => {
  let app: INestApplication;
  let raw: PrismaClient;
  let home: bigint;
  let created: bigint | undefined;
  let adminId: bigint;
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = DB;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    raw = new PrismaClient();
    home = (await raw.condominium.create({ data: { name: 'Admin home' } })).id;
    const admin = await raw.user.create({
      data: {
        condominiumId: home,
        username: `admin-test-${home}`,
        password: 'unused',
        firstName: 'Admin',
        lastName: '',
        email: 'admin@example.com',
        role: 'manager',
        isSuperuser: true,
      },
    });
    adminId = admin.id;
    const manager = await raw.user.create({
      data: {
        condominiumId: home,
        username: `manager-admin-test-${home}`,
        password: 'unused',
        firstName: 'Manager',
        lastName: '',
        email: 'manager@example.com',
        role: 'manager',
      },
    });
    const jwt = app.get(JwtService);
    const secret = app.get(ConfigService).get<string>('JWT_ACCESS_SECRET');
    adminToken = jwt.sign({ sub: String(adminId), type: 'access' }, { secret, expiresIn: '5m' });
    managerToken = jwt.sign(
      { sub: String(manager.id), type: 'access' },
      { secret, expiresIn: '5m' },
    );
  }, 60000);

  afterAll(async () => {
    if (raw) {
      const ids = created ? [home, created] : [home];
      await raw.expenseCategory.deleteMany({ where: { condominiumId: { in: ids } } });
      await raw.user.deleteMany({ where: { condominiumId: { in: ids } } });
      await raw.condominium.deleteMany({ where: { id: { in: ids } } });
      await raw.$disconnect();
    }
    await app?.close();
  });

  it('does not allow normal managers into the administrator API or to modify admin accounts', async () => {
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/condominiums')
          .set('Authorization', `Bearer ${managerToken}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/users/${adminId}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({ role: 'resident' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/api/v1/users/${adminId}`)
          .set('Authorization', `Bearer ${managerToken}`)
      ).status,
    ).toBe(403);
    const list = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(list.body.results.some((user: { id: string }) => user.id === String(adminId))).toBe(
      false,
    );
  });

  it('creates only a condominium with a persistent reusable code, without creating a manager', async () => {
    const usersBefore = await raw.user.count();
    const rejected = await request(app.getHttpServer())
      .post('/api/v1/admin/condominiums')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Rejected old provisioning', managerUsername: 'unused-manager' });
    expect(rejected.status).toBe(400);
    expect(await raw.condominium.count({ where: { name: 'Rejected old provisioning' } })).toBe(0);
    const result = await request(app.getHttpServer())
      .post('/api/v1/admin/condominiums')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New admin condominium',
      });
    expect(result.status).toBe(201);
    created = BigInt(result.body.id);
    expect(result.body.code).toMatch(/^[A-F0-9]{32}$/);
    expect(result.body).not.toHaveProperty('manager');
    expect(await raw.user.count()).toBe(usersBefore);
    expect(await raw.user.count({ where: { condominiumId: created } })).toBe(0);
    const saved = await raw.condominium.findUniqueOrThrow({ where: { id: created } });
    expect(saved.registrationCodeHash).toBe(hashRegistrationCode(result.body.code));
    expect(saved.registrationCode).toBe(result.body.code);
    const duplicates = await Promise.all(
      ['New admin condominium', '  NEW   ADMIN CONDOMINIUM  '].map((name) =>
        request(app.getHttpServer())
          .post('/api/v1/admin/condominiums')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name }),
      ),
    );
    expect(duplicates.map((response) => response.status)).toEqual([409, 409]);
    expect(
      duplicates.every(
        (response) => response.body.message === 'Já existe um condomínio com este nome.',
      ),
    ).toBe(true);
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/condominiums')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(
      list.body.results.find((item: { id: string }) => item.id === String(created)),
    ).not.toHaveProperty('registrationCodeHash');
    expect(
      list.body.results.find((item: { id: string }) => item.id === String(created))
        .registrationCode,
    ).toBe(result.body.code);
    expect(
      (await raw.condominium.findUniqueOrThrow({ where: { id: created } })).registrationCodeHash,
    ).toBe(saved.registrationCodeHash);
    const replace = await request(app.getHttpServer())
      .post(`/api/v1/admin/condominiums/${created}/registration-code`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(replace.status).toBe(201);
    expect(replace.body.code).not.toBe(result.body.code);
    expect(
      (await raw.condominium.findUniqueOrThrow({ where: { id: created } })).registrationCode,
    ).toBe(replace.body.code);
    const revoke = await request(app.getHttpServer())
      .delete(`/api/v1/admin/condominiums/${created}/registration-code`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(revoke.status).toBe(200);
    expect(revoke.body.codeEnabled).toBe(false);
    expect(
      (await raw.condominium.findUniqueOrThrow({ where: { id: created } })).registrationCode,
    ).toBeNull();
    const normal = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(
      normal.body.results.every(
        (user: { condominiumId: string }) => user.condominiumId === String(home),
      ),
    ).toBe(true);
    const forbidden = await request(app.getHttpServer())
      .delete(`/api/v1/admin/condominiums/${created}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(forbidden.status).toBe(403);
    const linked = await request(app.getHttpServer())
      .delete(`/api/v1/admin/condominiums/${home}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(linked.status).toBe(409);
    expect(linked.body.message).toBe(
      'Não é possível excluir um condomínio com usuários ou outros registros vinculados.',
    );
    expect(await raw.user.findUnique({ where: { id: adminId } })).not.toBeNull();
    const category = await raw.expenseCategory.create({
      data: { condominiumId: created, name: 'Deletion protection' },
    });
    const linkedData = await request(app.getHttpServer())
      .delete(`/api/v1/admin/condominiums/${created}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(linkedData.status).toBe(409);
    expect(await raw.expenseCategory.findUnique({ where: { id: category.id } })).not.toBeNull();
    await raw.expenseCategory.delete({ where: { id: category.id } });
    const deletedId = created;
    const deleted = await request(app.getHttpServer())
      .delete(`/api/v1/admin/condominiums/${deletedId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);
    expect(await raw.condominium.findUnique({ where: { id: deletedId } })).toBeNull();
    const missing = await request(app.getHttpServer())
      .delete(`/api/v1/admin/condominiums/${deletedId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(missing.status).toBe(404);
    created = undefined;
  });
});
