import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogArchive } from './audit.entity';
import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, AuditLogArchive]),
    ScheduleModule.forRoot(),
  ],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}