import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, ProductPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CondominiumsService } from '../condominiums/condominiums.service';
import { AdminService } from './admin.service';

describe('Administrator LPS configuration persistence', () => {
  const create = jest.fn();
  const update = jest.fn();
  let service: AdminService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: { condominium: { create, update } },
        },
        { provide: CondominiumsService, useValue: {} },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  it.each([ProductPlan.essential, ProductPlan.complete])(
    'persists %s while provisioning',
    async (productPlan) => {
      create.mockResolvedValue({ id: 7n, name: 'Example', productPlan });
      const result = await service.provision({ name: 'Example', productPlan });
      expect(result.productPlan).toBe(productPlan);
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Example', productPlan }),
        select: { id: true, name: true, productPlan: true },
      });
    },
  );

  it('changes only the selected product, without deleting data or altering another tenant', async () => {
    update.mockResolvedValue({ id: 7n, name: 'Example', productPlan: 'essential' });
    await service.updateProductPlan(7n, { productPlan: ProductPlan.essential });
    expect(update).toHaveBeenCalledWith({
      where: { id: 7n },
      data: { productPlan: 'essential' },
      select: { id: true, name: true, productPlan: true },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('reports a missing condominium and propagates other database failures', async () => {
    update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.updateProductPlan(7n, { productPlan: ProductPlan.complete }),
    ).rejects.toThrow(NotFoundException);
    update.mockRejectedValue(new Error('Database unavailable'));
    await expect(
      service.updateProductPlan(7n, { productPlan: ProductPlan.complete }),
    ).rejects.toThrow('Database unavailable');
  });
});
