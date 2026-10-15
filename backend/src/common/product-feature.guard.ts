import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { systemScope } from './condominium-context';
import { enabledFeatures, featureForPath } from './product-features';

@Injectable()
export class ProductFeatureGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      path: string;
      user?: AuthenticatedUser;
    }>();
    const feature = featureForPath(request.path);
    const user = request.user;
    if (!feature || !user) return true;

    const condominium = await systemScope(() =>
      this.prisma.condominium.findUnique({
        where: { id: user.condominiumId },
        select: { productPlan: true },
      }),
    );
    if (!condominium) throw new NotFoundException('Condomínio não encontrado.');
    if (!enabledFeatures(condominium.productPlan).includes(feature)) {
      throw new ForbiddenException('Funcionalidade indisponível no produto deste condomínio.');
    }
    return true;
  }
}
