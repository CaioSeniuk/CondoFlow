import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPackageSchema = z.object({
  block: z.string().min(1).max(10),
  apartment: z.string().min(1).max(10),
  description: z.string().max(200).default(''),
});

export class CreatePackageDto extends createZodDto(createPackageSchema) {}

export const updatePackageSchema = createPackageSchema.partial();

export class UpdatePackageDto extends createZodDto(updatePackageSchema) {}

export const pickupPackageSchema = z.object({
  pickedUpBy: z.string().min(1).max(150),
});

export class PickupPackageDto extends createZodDto(pickupPackageSchema) {}
