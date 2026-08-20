import { NotFoundException } from '@nestjs/common';

/**
 * No DRF o `get_object()` aplicava o mesmo `get_queryset()` do list, então
 * retrieve/update/destroy herdavam o escopo por perfil de graça. Aqui isso é
 * explícito: cada service tem um `findByIdForUser` e as rotas de detalhe passam
 * o resultado por aqui.
 *
 * Responde 404 (não 403) para objeto fora do escopo — além de espelhar o DRF,
 * evita confirmar a existência do id para quem não pode vê-lo.
 */
export function assertVisible<T>(entity: T | null | undefined): T {
  if (entity === null || entity === undefined) throw new NotFoundException();
  return entity;
}
