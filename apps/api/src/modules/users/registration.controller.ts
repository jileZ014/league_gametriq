import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Public } from '../../common/decorators/public.decorator';
import { extractIpFromRequest } from '../../utils/ip_hash';
import { Request } from 'express';

interface ProcessConsentDto {
  approved: boolean;
  parentFirstName: string;
  parentLastName: string;
  dataCollection: boolean;
  paymentProcessing: boolean;
  communication: boolean;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
}

interface RevokeConsentDto {
  reason: string;
  parentEmail: string;
}

@ApiTags('registration')
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user with COPPA compliance' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid registration data or missing parent email for minors' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: CreateUserDto })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() request: Request,
  ) {
    const ipAddress = extractIpFromRequest(request);
    
    const user = await this.registrationService.register(createUserDto, ipAddress);
    
    // Don't return sensitive data
    const { password, ...userWithoutPassword } = user as any;
    
    return {
      user: userWithoutPassword,
      requiresParentalConsent: user.isMinor,
      message: user.isMinor 
        ? 'Registration successful. A parental consent request has been sent to the provided parent email.'
        : 'Registration successful.',
    };
  }

  @Post('consent/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process parental consent for a minor' })
  @ApiResponse({ status: 200, description: 'Consent processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid consent token or request' })
  async processConsent(
    @Param('token') consentToken: string,
    @Body() consentDto: ProcessConsentDto,
    @Req() request: Request,
  ) {
    if (!consentDto.termsAccepted || !consentDto.privacyPolicyAccepted) {
      throw new BadRequestException('Terms and privacy policy must be accepted');
    }

    const ipAddress = extractIpFromRequest(request);
    
    const consent = await this.registrationService.processParentalConsent(
      consentToken,
      consentDto.approved,
      {
        firstName: consentDto.parentFirstName,
        lastName: consentDto.parentLastName,
        dataCollection: consentDto.dataCollection,
        paymentProcessing: consentDto.paymentProcessing,
        communication: consentDto.communication,
        termsAccepted: consentDto.termsAccepted,
        privacyPolicyAccepted: consentDto.privacyPolicyAccepted,
      },
      ipAddress,
    );

    return {
      success: true,
      status: consent.status,
      message: consentDto.approved
        ? 'Parental consent approved. The child account is now active.'
        : 'Parental consent denied. The child account will remain inactive.',
    };
  }

  @Post('consent/:consentId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke parental consent' })
  @ApiResponse({ status: 200, description: 'Consent revoked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async revokeConsent(
    @Param('consentId') consentId: string,
    @Body() revokeDto: RevokeConsentDto,
  ) {
    await this.registrationService.revokeParentalConsent(
      consentId,
      revokeDto.reason,
      revokeDto.parentEmail,
    );

    return {
      success: true,
      message: 'Parental consent has been revoked. The child account has been suspended.',
    };
  }

  @Post('migrate-minor-dob')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Migrate existing minor DOB data to year-only format' })
  @ApiResponse({ status: 200, description: 'Migration completed' })
  async migrateMinorDob() {
    const updatedCount = await this.registrationService.updateMinorDobToYearOnly();

    return {
      success: true,
      updatedRecords: updatedCount,
      message: `Successfully updated ${updatedCount} minor records to store only birth year.`,
    };
  }
}