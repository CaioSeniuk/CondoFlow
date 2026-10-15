import { ProductPlan } from '@prisma/client';

export const productFeatures = ['reservations', 'polls', 'finance'] as const;
export type ProductFeature = (typeof productFeatures)[number];

export function enabledFeatures(plan: ProductPlan): readonly ProductFeature[] {
  return plan === ProductPlan.complete ? productFeatures : [];
}

export function featureForPath(path: string): ProductFeature | undefined {
  return productFeatures.find((feature) =>
    new RegExp(`^/api/v1/${feature}(?:/|$)`, 'i').test(path),
  );
}
