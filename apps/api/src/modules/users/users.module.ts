import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ParentalConsent } from './entities/parental-consent.entity';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ParentalConsent]),
    AuditModule,
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [RegistrationService],
})
export class UsersModule {}