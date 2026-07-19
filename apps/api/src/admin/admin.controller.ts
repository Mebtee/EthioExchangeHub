import {
  Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard overview' })
  getDashboard() {
    return this.adminService.getDashboardOverview();
  }

  // ── Rates ─────────────────────────────────────────────────────
  @Get('rates')
  @ApiOperation({ summary: 'List all exchange rates (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'bankCode', required: false })
  @ApiQuery({ name: 'currencyTo', required: false })
  getRates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('bankCode') bankCode?: string,
    @Query('currencyTo') currencyTo?: string,
  ) {
    return this.adminService.getRates(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      bankCode,
      currencyTo,
    );
  }

  @Post('rates')
  @ApiOperation({ summary: 'Create a new exchange rate' })
  createRate(@Body() body: {
    bankId: string; currencyFrom: string; currencyTo: string;
    buyRate: number; sellRate: number; source?: string;
  }) {
    return this.adminService.createRate(body);
  }

  @Put('rates/:id')
  @ApiOperation({ summary: 'Update an exchange rate' })
  updateRate(@Param('id') id: string, @Body() body: { buyRate?: number; sellRate?: number; source?: string }) {
    return this.adminService.updateRate(id, body);
  }

  @Delete('rates/:id')
  @ApiOperation({ summary: 'Delete an exchange rate' })
  deleteRate(@Param('id') id: string) {
    return this.adminService.deleteRate(id);
  }

  // ── Banks ─────────────────────────────────────────────────────
  @Get('banks')
  @ApiOperation({ summary: 'List all banks with stats' })
  getBanks(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getBanks(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Patch('banks/:id')
  @ApiOperation({ summary: 'Update a bank' })
  updateBank(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateBank(id, body);
  }

  // ── Users ─────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'List all users (admin)' })
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(@Param('id') id: string, @Body() body: { role: 'USER' | 'ADMIN' }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  // ── Subscriptions ─────────────────────────────────────────────
  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions' })
  getSubscriptions(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getSubscriptions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'Update a subscription' })
  updateSubscription(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateSubscription(id, body);
  }

  // ── Rankings ──────────────────────────────────────────────────
  @Get('rankings')
  @ApiOperation({ summary: 'List all rankings' })
  getRankings(@Query('category') category?: string) {
    return this.adminService.getRankings(category);
  }

  @Post('rankings')
  @ApiOperation({ summary: 'Create a new ranking entry' })
  createRanking(@Body() body: any) {
    return this.adminService.createRanking(body);
  }

  @Put('rankings/:id')
  @ApiOperation({ summary: 'Update a ranking entry' })
  updateRanking(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateRanking(id, body);
  }

  // ── Logs ──────────────────────────────────────────────────────
  @Get('logs')
  @ApiOperation({ summary: 'View system logs' })
  getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      status,
    );
  }

  // ── Alert Queue ───────────────────────────────────────────────
  @Get('alerts')
  @ApiOperation({ summary: 'View rate alert queue' })
  getAlertQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAlertQueue(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Post('alerts/:id/toggle')
  @ApiOperation({ summary: 'Toggle alert active/inactive' })
  toggleAlert(@Param('id') id: string) {
    return this.adminService.toggleAlert(id);
  }

  // ── Revenue ───────────────────────────────────────────────────
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue dashboard data' })
  getRevenue() {
    return this.adminService.getRevenueDashboard();
  }
}
