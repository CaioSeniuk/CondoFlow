import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { assertVisible } from '../common/access';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { VisitorsService } from './visitors.service';
import { VisitorNotFoundError, VisitorTokenInvalidError } from './visitors.errors';
import { AccessLogRepository } from './visitors.repository';
import { CreateVisitorDto, UpdateVisitorDto, ValidateTokenDto } from './dto/visitor.dto';

function serialize(visitor: any, service: VisitorsService) {
  return { ...visitor, isValid: service.isValid(visitor) };
}

@ApiTags('visitors')
@UseGuards(RolesGuard)
@Controller('api/v1/visitors')
export class VisitorsController {
  constructor(
    private service: VisitorsService,
    private accessLogRepo: AccessLogRepository,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List visitors',
    description:
      'Residents see only visitors registered for their own block/apartment. Managers and doormen see every visitor.',
  })
  async list(@Req() req: { user: AuthenticatedUser }) {
    const visitors = await this.service.listForUser(req.user);
    return visitors.map((v) => serialize(v, this.service));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve a visitor',
    description:
      'Residents can only retrieve visitors registered for their own block/apartment; anything else responds 404.',
  })
  async retrieve(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    const visitor = assertVisible(await this.service.findByIdForUser(BigInt(id), req.user));
    return serialize(visitor, this.service);
  }

  @Post()
  @Roles(UserRole.resident)
  @ApiOperation({
    summary: 'Register a visitor',
    description:
      'Resident only. Generates a QR Code token valid only between valid_from and valid_until.',
  })
  async create(@Body() dto: CreateVisitorDto, @Req() req: { user: AuthenticatedUser }) {
    const visitor = await this.service.create(dto, req.user);
    return serialize(visitor, this.service);
  }

  @Patch(':id')
  @Roles(UserRole.resident)
  @ApiOperation({
    summary: 'Partially update a visitor',
    description: 'Resident only, and only for their own block/apartment.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVisitorDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const visitor = await this.service.update(BigInt(id), dto, req.user);
    return serialize(visitor, this.service);
  }

  @Delete(':id')
  @Roles(UserRole.resident)
  @ApiOperation({
    summary: 'Delete a visitor',
    description: 'Resident only, and only for their own block/apartment.',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    return this.service.remove(BigInt(id), req.user);
  }

  @Post('validate_token')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.doorman)
  @ApiOperation({
    summary: "Validate a visitor's QR Code",
    description:
      "Doorman only. Checks the QR Code token's validity window and registers an entry/exit access log entry.",
  })
  async validateToken(@Body() dto: ValidateTokenDto, @Req() req: { user: AuthenticatedUser }) {
    try {
      const { visitor, accessLog } = await this.service.validateToken(
        dto.token,
        dto.direction,
        req.user,
      );
      return { visitor: serialize(visitor, this.service), accessLog };
    } catch (err) {
      if (err instanceof VisitorNotFoundError) {
        throw new NotFoundException('Visitor not found');
      }
      if (err instanceof VisitorTokenInvalidError) {
        throw new BadRequestException('QR code expired or not yet valid');
      }
      throw err;
    }
  }
}

@ApiTags('visitors')
@UseGuards(RolesGuard)
@Roles(UserRole.manager, UserRole.doorman)
@Controller('api/v1/visitors/access-logs')
export class AccessLogsController {
  constructor(private accessLogRepo: AccessLogRepository) {}

  @Get()
  @ApiOperation({
    summary: 'List access logs',
    description: 'Manager or doorman only. History of visitor entries and exits.',
  })
  list() {
    return this.accessLogRepo.all();
  }
}
