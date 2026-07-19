import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/request-with-user.interface';

@ApiTags('Portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'Get portfolio dashboard with summary' })
  async getDashboard(@CurrentUser() payload: JwtPayload) {
    return this.portfolioService.getDashboard(payload.sub);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all portfolio items' })
  async findAll(@CurrentUser() payload: JwtPayload) {
    return this.portfolioService.findAll(payload.sub);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to portfolio' })
  async create(
    @CurrentUser() payload: JwtPayload,
    @Body() body: {
      type: 'CURRENCY_HOLDING' | 'BANK_ACCOUNT' | 'INVESTMENT' | 'OTHER';
      currency: string;
      amount: number;
      description?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.portfolioService.create(payload.sub, body);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update portfolio item' })
  async update(
    @CurrentUser() payload: JwtPayload,
    @Param('id') id: string,
    @Body() body: { amount?: number; description?: string; metadata?: Record<string, unknown> },
  ) {
    return this.portfolioService.update(payload.sub, id, body);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove portfolio item' })
  async remove(@CurrentUser() payload: JwtPayload, @Param('id') id: string) {
    await this.portfolioService.remove(payload.sub, id);
    return { message: 'Portfolio item removed' };
  }
}
