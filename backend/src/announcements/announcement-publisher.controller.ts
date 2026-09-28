import { BadRequestException, Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  AnnouncementPublisherService,
  AnnouncementPublisherType,
} from './announcement-publisher.service';
import { PublishAnnouncementDto } from './dto/announcement-publisher.dto';

const VALID_PUBLISHER_TYPES: AnnouncementPublisherType[] = ['standard', 'urgent'];

/**
 * Controller isolado (não substitui `AnnouncementsController`) que expõe o
 * Template Method de publicação de comunicados portado de
 * design-pattern-implementation/backend. Protegido apenas pelo
 * `JwtAuthGuard` global.
 */
@ApiTags('announcements')
@Controller('api/v1/announcements/publish')
export class AnnouncementPublisherController {
  constructor(private service: AnnouncementPublisherService) {}

  @Post(':type')
  @ApiOperation({
    summary: 'Publish an announcement using the Template Method pattern',
    description:
      "Design pattern: Template Method. type is 'standard' or 'urgent'. " +
      "The current schema only supports audience 'all' (no per-role segment); " +
      'any other audience value returns 400.',
  })
  @ApiBody({
    type: PublishAnnouncementDto,
    examples: {
      standard: {
        summary: 'Comunicado padrão',
        value: {
          title: 'Manutenção da piscina',
          body: 'A piscina ficará fechada para manutenção na próxima segunda-feira.',
          audience: 'all',
        },
      },
      urgent: {
        summary: 'Comunicado urgente',
        value: {
          title: 'Interrupção no fornecimento de água',
          body: 'O fornecimento de água será interrompido hoje das 14h às 16h.',
          audience: 'all',
        },
      },
    },
  })
  publish(
    @Param('type') type: string,
    @Body() dto: PublishAnnouncementDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    if (!VALID_PUBLISHER_TYPES.includes(type as AnnouncementPublisherType)) {
      throw new BadRequestException(
        `Invalid publisher type '${type}'. Expected one of: ${VALID_PUBLISHER_TYPES.join(', ')}`,
      );
    }
    return this.service.publish(type as AnnouncementPublisherType, dto, req.user);
  }
}
