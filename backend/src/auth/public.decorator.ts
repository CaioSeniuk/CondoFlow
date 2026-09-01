import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota como pública (equivalente a permission_classes=[AllowAny] no DRF). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
