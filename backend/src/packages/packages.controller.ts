import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Package, UserRole } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PackagesService } from './packages.service';
import { CreatePackageDto, PickupPackageDto, UpdatePackageDto } from './dto/package.dto';
import { ScopedResourceController } from '../common/scoped-resource.controller';

@ApiTags('packages')
@UseGuards(RolesGuard)
@Controller('api/v1/packages')
export class PackagesController extends ScopedResourceController<Package>({
  listSummary: 'List packages',
  listDescription:
    'Residents see only packages addressed to their own block/apartment. Managers and doormen see every package.',
  retrieveSummary: 'Retrieve a package',
  retrieveDescription:
    'Residents can only retrieve packages for their own block/apartment; anything else responds 404.',
}) {
  service: PackagesService;

  constructor(
    service: PackagesService,
    private storage: StorageService,
  ) {
    super();
    this.service = service;
  }

  @Post()
  @Roles(UserRole.doorman)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Register a package', description: 'Doorman only.' })
  async create(
    @Body() dto: CreatePackageDto,
    @UploadedFile() photo: Express.Multer.File,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const photoUrl = await this.storage.upload('packages', photo);
    return this.service.create(dto, photoUrl, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.doorman)
  @ApiOperation({ summary: 'Partially update a package', description: 'Doorman only.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackageDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.update(BigInt(id), dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.doorman)
  @ApiOperation({ summary: 'Delete a package', description: 'Doorman only.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }

  @Post(':id/pickup')
  @Roles(UserRole.doorman)
  @ApiOperation({
    summary: 'Register package pickup',
    description:
      'Doorman only. Records who picked up the package, the timestamp, and the doorman who released it, for traceability.',
  })
  pickup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PickupPackageDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.pickup(BigInt(id), dto.pickedUpBy, req.user);
  }
}
