import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TokenObtainDto, TokenRefreshDto } from './dto/token.dto';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('api/v1/token')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtain an access/refresh token pair', description: 'Public endpoint.' })
  obtain(@Body() dto: TokenObtainDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate a refresh token into a new token pair',
    description: 'Public endpoint.',
  })
  refresh(@Body() dto: TokenRefreshDto) {
    return this.authService.refresh(dto.refresh);
  }
}
