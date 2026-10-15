import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ProductPlan } from '@prisma/client';

const manager = {
  condominiumId: 1n,
  id: 1n,
  username: 'manager1',
  role: 'manager',
  block: '',
  apartment: '',
  isActive: true,
};

const condominium = { productPlan: ProductPlan.complete as ProductPlan };
const prismaStub = new Proxy(
  {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    condominium: { findUnique: jest.fn().mockImplementation(async () => condominium) },
  },
  {
    get(target: any, prop) {
      if (prop in target) return target[prop];
      return {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(manager),
      };
    },
  },
);

describe('route registration', () => {
  it('resolves literal sub-resource paths instead of the sibling :id routes', async () => {
    condominium.productPlan = ProductPlan.complete;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const jwt = app.get(JwtService);
    const config = app.get(ConfigService);
    const token = jwt.sign(
      { sub: '1', type: 'access' },
      { secret: config.get<string>('JWT_ACCESS_SECRET'), expiresIn: '5m' },
    );

    for (const path of [
      '/api/v1/visitors/access-logs',
      '/api/v1/providers/evidences',
      '/api/v1/reservations/common-areas',
      '/api/v1/finance/categories',
      '/api/v1/users/me',
    ]) {
      const res = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${token}`);
      expect([path, res.status]).toEqual([path, 200]);
    }

    condominium.productPlan = ProductPlan.essential;
    for (const path of [
      '/api/v1/reservations',
      '/api/v1/reservations/common-areas',
      '/api/v1/reservations/1',
      '/api/v1/polls',
      '/api/v1/polls/1/vote',
      '/api/v1/finance',
      '/api/v1/finance/categories',
      '/api/v1/finance/reports/category-expense',
      '/api/v1/finance/reports/budget-vs-actual',
    ]) {
      for (const method of ['get', 'post', 'patch', 'delete'] as const) {
        const res = await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${token}`);
        // Unsupported verbs still return 404; every registered operation must be blocked.
        expect([403, 404]).toContain(res.status);
        if (res.status === 403) {
          expect(res.body.message).toBe('Funcionalidade indisponível no produto deste condomínio.');
        }
      }
    }
    const blocked = await request(app.getHttpServer())
      .get('/api/v1/finance/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(blocked.status).toBe(403);
    const unauthenticated = await request(app.getHttpServer()).get('/api/v1/finance');
    expect(unauthenticated.status).toBe(401);
    const unauthorizedSelection = await request(app.getHttpServer())
      .patch('/api/v1/admin/condominiums/1/product-plan')
      .set('Authorization', `Bearer ${token}`)
      .send({ productPlan: 'complete' });
    expect(unauthorizedSelection.status).toBe(403);
    condominium.productPlan = ProductPlan.complete;
    const restored = await request(app.getHttpServer())
      .get('/api/v1/finance/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(restored.status).toBe(200);

    await app.close();
  }, 30000);
});
