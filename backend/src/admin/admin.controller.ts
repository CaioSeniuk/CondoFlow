import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { ProvisionCondominiumDto } from './admin.dto';

@ApiTags('admin')
@UseGuards(AdminGuard)
@Controller('api/v1/admin/condominiums')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List condominiums. Global admin only.' })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a condominium and its reusable registration code.' })
  @ApiBody({ type: ProvisionCondominiumDto })
  provision(@Body() dto: ProvisionCondominiumDto) {
    return this.service.provision(dto);
  }

  @Post(':id/registration-code')
  @ApiOperation({
    summary: 'Generate a new registration code for a condominium. Global admin only.',
  })
  replaceCode(@Param('id', ParseIntPipe) id: number) {
    return this.service.replaceCode(BigInt(id));
  }

  @Delete(':id/registration-code')
  @ApiOperation({ summary: 'Revoke a condominium registration code. Global admin only.' })
  revokeCode(@Param('id', ParseIntPipe) id: number) {
    return this.service.revokeCode(BigInt(id));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an empty condominium. Global admin only.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }
}
