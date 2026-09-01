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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Evidence, Provider, UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { StorageService } from '../storage/storage.service';
import { EvidenceService, ProvidersService } from './providers.service';
import {
  CreateEvidenceDto,
  CreateProviderDto,
  UpdateEvidenceDto,
  UpdateProviderDto,
} from './dto/provider.dto';
import { ScopedResourceController } from '../common/scoped-resource.controller';

type EvidenceFiles = {
  beforePhoto?: Express.Multer.File[];
  afterPhoto?: Express.Multer.File[];
};

const evidenceUpload = FileFieldsInterceptor([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 },
]);

@ApiTags('providers')
@UseGuards(RolesGuard)
@Controller('api/v1/providers/evidences')
export class EvidenceController extends ScopedResourceController<Evidence>({
  listSummary: 'List service evidence',
  listDescription:
    'Providers see evidence for their own tickets. Residents see evidence for their own tickets. Managers see every evidence.',
  retrieveSummary: 'Retrieve a piece of evidence',
  retrieveDescription:
    "Scoped the same way as the list: anything outside the caller's own tickets responds 404.",
}) {
  service: EvidenceService;

  constructor(
    service: EvidenceService,
    private storage: StorageService,
  ) {
    super();
    this.service = service;
  }

  @Post()
  @Roles(UserRole.provider)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(evidenceUpload)
  @ApiOperation({
    summary: 'Attach evidence to a ticket',
    description: 'Provider only. Before/after photos of the service performed.',
  })
  async create(
    @Body() dto: CreateEvidenceDto,
    @UploadedFiles() files: EvidenceFiles,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.create(dto, await this.uploadPhotos(files), req.user);
  }

  @Patch(':id')
  @Roles(UserRole.provider)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(evidenceUpload)
  @ApiOperation({ summary: 'Partially update a piece of evidence', description: 'Provider only.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvidenceDto,
    @UploadedFiles() files: EvidenceFiles,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.update(BigInt(id), dto, await this.uploadPhotos(files), req.user);
  }

  @Delete(':id')
  @Roles(UserRole.provider)
  @ApiOperation({
    summary: 'Delete a piece of evidence',
    description: 'Provider only, and only for tickets assigned to them.',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    return this.service.remove(BigInt(id), req.user);
  }

  private async uploadPhotos(files: EvidenceFiles) {
    const before = files?.beforePhoto?.[0];
    const after = files?.afterPhoto?.[0];
    return {
      beforePhoto: before ? await this.storage.upload('providers/evidence/before', before) : null,
      afterPhoto: after ? await this.storage.upload('providers/evidence/after', after) : null,
    };
  }
}

@ApiTags('providers')
@UseGuards(RolesGuard)
@Controller('api/v1/providers')
export class ProvidersController extends ScopedResourceController<Provider>({
  listSummary: 'List providers',
  listDescription:
    'Managers see every provider. Providers see only their own profile. Residents and doormen see no results.',
  retrieveSummary: 'Retrieve a provider',
  retrieveDescription: 'Providers can only retrieve their own profile; anything else responds 404.',
}) {
  service: ProvidersService;

  constructor(
    service: ProvidersService,
    private storage: StorageService,
  ) {
    super();
    this.service = service;
  }

  @Post()
  @Roles(UserRole.manager)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('document'))
  @ApiOperation({ summary: 'Register a provider', description: 'Manager only.' })
  async create(
    @Body() dto: CreateProviderDto,
    @UploadedFile() document: Express.Multer.File | undefined,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const documentUrl = document
      ? await this.storage.upload('providers/documents', document)
      : null;
    return this.service.create(dto, documentUrl, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.manager)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('document'))
  @ApiOperation({ summary: 'Partially update a provider', description: 'Manager only.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProviderDto,
    @UploadedFile() document: Express.Multer.File | undefined,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const documentUrl = document
      ? await this.storage.upload('providers/documents', document)
      : null;
    return this.service.update(BigInt(id), dto, documentUrl, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.manager)
  @ApiOperation({ summary: 'Delete a provider', description: 'Manager only.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    return this.service.remove(BigInt(id), req.user);
  }
}
