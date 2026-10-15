import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductPlan, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ProductFeatureGuard } from './product-feature.guard';
import { enabledFeatures, featureForPath } from './product-features';
import { provisionCondominiumSchema, UpdateProductPlanDto } from '../admin/admin.dto';

const user: AuthenticatedUser = {
  id: 1n,
  condominiumId: 9n,
  username: 'manager',
  role: UserRole.manager,
  block: '',
  apartment: '',
};

function context(path: string, actor?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ path, user: actor }) }),
  } as ExecutionContext;
}

describe('LPS product selection', () => {
  const find = jest.fn();
  let guard: ProductFeatureGuard;

  beforeEach(async () => {
    find.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        ProductFeatureGuard,
        { provide: PrismaService, useValue: { condominium: { findUnique: find } } },
      ],
    }).compile();
    guard = module.get(ProductFeatureGuard);
  });

  it('keeps existing clients on complete and rejects unknown products/extra fields', () => {
    expect(provisionCondominiumSchema.parse({ name: 'Example' }).productPlan).toBe('complete');
    expect(
      provisionCondominiumSchema.parse({ name: 'Example', productPlan: 'essential' }).productPlan,
    ).toBe('essential');
    expect(
      provisionCondominiumSchema.safeParse({ name: 'Example', productPlan: 'other' }).success,
    ).toBe(false);
    expect(
      UpdateProductPlanDto.schema.safeParse({ productPlan: 'essential', name: 'Changed' }).success,
    ).toBe(false);
    expect(UpdateProductPlanDto.schema.safeParse({}).success).toBe(false);
  });

  it('models optional features as a bundle and matches nested routes and case variants', () => {
    expect(enabledFeatures(ProductPlan.essential)).toEqual([]);
    expect(enabledFeatures(ProductPlan.complete)).toEqual(['reservations', 'polls', 'finance']);
    expect(featureForPath('/api/v1/reservations/common-areas/1')).toBe('reservations');
    expect(featureForPath('/api/v1/FINANCE/reports/category-expense')).toBe('finance');
    expect(featureForPath('/api/v1/finance-other')).toBeUndefined();
  });

  it.each(['reservations', 'polls', 'finance'])(
    'blocks %s in essential using the authenticated tenant',
    async (feature) => {
      find.mockResolvedValue({ productPlan: ProductPlan.essential });
      await expect(guard.canActivate(context(`/api/v1/${feature}/1`, user))).rejects.toThrow(
        ForbiddenException,
      );
      expect(find).toHaveBeenCalledWith({
        where: { id: 9n },
        select: { productPlan: true },
      });
    },
  );

  it('allows complete, then immediately blocks after a persisted downgrade without a new token', async () => {
    find
      .mockResolvedValueOnce({ productPlan: ProductPlan.complete })
      .mockResolvedValueOnce({ productPlan: ProductPlan.essential });
    const request = context('/api/v1/finance', user);
    expect(await guard.canActivate(request)).toBe(true);
    await expect(guard.canActivate(request)).rejects.toThrow(ForbiddenException);
  });

  it('does not bypass the product for global admins and keeps the administration/core available', async () => {
    find.mockResolvedValue({ productPlan: ProductPlan.essential });
    await expect(
      guard.canActivate(context('/api/v1/polls', { ...user, isSuperuser: true })),
    ).rejects.toThrow(ForbiddenException);
    expect(
      await guard.canActivate(context('/api/v1/admin/condominiums/1/product-plan', user)),
    ).toBe(true);
    expect(await guard.canActivate(context('/api/v1/tickets', user))).toBe(true);
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('leaves authentication to the auth guard and does not hide lookup errors', async () => {
    expect(await guard.canActivate(context('/api/v1/finance'))).toBe(true);
    expect(find).not.toHaveBeenCalled();
    find.mockResolvedValue(null);
    await expect(guard.canActivate(context('/api/v1/finance', user))).rejects.toThrow(
      NotFoundException,
    );
    find.mockRejectedValue(new Error('Database unavailable'));
    await expect(guard.canActivate(context('/api/v1/finance', user))).rejects.toThrow(
      'Database unavailable',
    );
  });
});
