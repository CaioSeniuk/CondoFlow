import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsRepository } from './announcements.repository';
import { AnnouncementPublisherController } from './announcement-publisher.controller';
import { AnnouncementPublisherService } from './announcement-publisher.service';
import { PrismaAnnouncementRepository } from './announcement-publisher.repository';
import { PrismaAnnouncementVisibilityChain } from './announcement-visibility.adapter';

@Module({
  controllers: [AnnouncementsController, AnnouncementPublisherController],
  providers: [
    AnnouncementsService,
    AnnouncementsRepository,
    AnnouncementPublisherService,
    PrismaAnnouncementRepository,
    PrismaAnnouncementVisibilityChain,
  ],
})
export class AnnouncementsModule {}
