import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
