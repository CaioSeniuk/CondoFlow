import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

const manager = {
  id: 1n,
  username: 'manager1',
  role: 'manager',
  block: '',
  apartment: '',
  isActive: true,
};

const prismaStub = new Proxy(
  { $connect: jest.fn(), $disconnect: jest.fn() },
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

    await app.close();
  }, 30000);
});
