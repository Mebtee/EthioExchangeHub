import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/request-with-user.interface';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all favorites for the current user' })
  async findAll(@CurrentUser() payload: JwtPayload) {
    return this.favoritesService.findAll(payload.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Add a favorite (bank or currency)' })
  async create(
    @CurrentUser() payload: JwtPayload,
    @Body() body: { type: 'BANK' | 'CURRENCY'; referenceId: string; label?: string },
  ) {
    return this.favoritesService.create(payload.sub, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a favorite' })
  async remove(@CurrentUser() payload: JwtPayload, @Param('id') id: string) {
    await this.favoritesService.remove(payload.sub, id);
    return { message: 'Favorite removed' };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all favorites for the current user' })
  async clearAll(@CurrentUser() payload: JwtPayload) {
    await this.favoritesService.clearAll(payload.sub);
    return { message: 'All favorites cleared' };
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle a favorite (add if missing, remove if exists)' })
  async toggle(
    @CurrentUser() payload: JwtPayload,
    @Body() body: { type: 'BANK' | 'CURRENCY'; referenceId: string; label?: string },
  ) {
    return this.favoritesService.toggle(payload.sub, body);
  }
}
