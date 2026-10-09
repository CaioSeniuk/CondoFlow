import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CondominiumsModule } from '../condominiums/condominiums.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [AuthModule, CondominiumsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
