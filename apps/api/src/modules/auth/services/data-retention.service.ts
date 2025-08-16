import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuditService } from './audit.service';

export interface DataRetentionPolicy {
  userType: 'minor' | 'adult';
  dataType: string;
  retentionPeriodDays: number;
  autoDelete: boolean;
  requiresParentalConsent: boolean;
}

export interface PrivacySettings {
  userId: string;
  dataMinimization: boolean;
  parentalNotifications: boolean;
  dataExportAllowed: boolean;
  marketingOptOut: boolean;
  analyticsOptOut: boolean;
}

@Injectable()
export class DataRetentionService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  // COPPA-compliant data retention policies
  private getRetentionPolicies(): DataRetentionPolicy[] {
    return [
      // Minor account data - strict COPPA compliance
      {
        userType: 'minor',
        dataType: 'personal_information',
        retentionPeriodDays: 365, // 1 year max for minors
        autoDelete: true,
        requiresParentalConsent: true,
      },
      {
        userType: 'minor',
        dataType: 'session_logs',
        retentionPeriodDays: 90, // 3 months for security logs
        autoDelete: true,
        requiresParentalConsent: false,
      },
      {
        userType: 'minor',
        dataType: 'game_statistics',
        retentionPeriodDays: 730, // 2 years for sports records
        autoDelete: false, // May need parent approval to delete
        requiresParentalConsent: true,
      },
      {
        userType: 'minor',
        dataType: 'communication_history',
        retentionPeriodDays: 30, // Very short for safety
        autoDelete: true,
        requiresParentalConsent: false,
      },
      {
        userType: 'minor',
        dataType: 'location_data',
        retentionPeriodDays: 7, // Minimal retention
        autoDelete: true,
        requiresParentalConsent: false,
      },

      // Adult account data - standard retention
      {
        userType: 'adult',
        dataType: 'personal_information',
        retentionPeriodDays: 2555, // 7 years standard
        autoDelete: false,
        requiresParentalConsent: false,
      },
      {
        userType: 'adult',
        dataType: 'session_logs',
        retentionPeriodDays: 365, // 1 year
        autoDelete: true,
        requiresParentalConsent: false,
      },
      {
        userType: 'adult',
        dataType: 'game_statistics',
        retentionPeriodDays: 3650, // 10 years for historical records
        autoDelete: false,
        requiresParentalConsent: false,
      },
    ];
  }

  async scheduleDataDeletion(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const policies = this.getRetentionPolicies();
    const userType = user.isMinor ? 'minor' : 'adult';
    const applicablePolicies = policies.filter(p => p.userType === userType);

    for (const policy of applicablePolicies) {
      if (policy.autoDelete) {
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + policy.retentionPeriodDays);

        await this.auditService.logDataRetentionEvent(
          userId,
          'scheduled_deletion',
          [policy.dataType],
          {
            isMinor: user.isMinor,
            deletionDate: deletionDate.toISOString(),
            policy: policy.dataType,
            retentionDays: policy.retentionPeriodDays,
          },
        );

        // In production, this would schedule actual deletion jobs
        console.log(`[DATA_RETENTION] Scheduled deletion of ${policy.dataType} for user ${userId} on ${deletionDate}`);
      }
    }
  }

  async executeDataDeletion(userId: string, dataTypes: string[]): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if deletion requires parental consent for minors
    if (user.isMinor) {
      const policies = this.getRetentionPolicies().filter(
        p => p.userType === 'minor' && dataTypes.includes(p.dataType)
      );

      const requiresConsent = policies.some(p => p.requiresParentalConsent);
      if (requiresConsent) {
        // Verify parental consent for deletion
        const hasConsent = await this.verifyParentalConsentForDeletion(userId);
        if (!hasConsent) {
          throw new Error('Parental consent required for data deletion');
        }
      }
    }

    // Execute deletion for each data type
    for (const dataType of dataTypes) {
      await this.deleteDataByType(userId, dataType);
      
      await this.auditService.logDataRetentionEvent(
        userId,
        'deleted',
        [dataType],
        {
          isMinor: user.isMinor,
          deletedAt: new Date().toISOString(),
          dataType,
        },
      );
    }
  }

  async getDataExportForUser(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // COPPA requirement: Parents can request child's data
    if (user.isMinor) {
      const hasParentalConsent = await this.verifyParentalConsentForExport(userId);
      if (!hasParentalConsent) {
        throw new Error('Parental consent required for data export');
      }
    }

    // Collect user data from various sources
    const userData = {
      personalInformation: await this.getPersonalData(userId),
      gameStatistics: await this.getGameData(userId),
      sessionHistory: await this.getSessionData(userId),
      communicationHistory: user.isMinor ? null : await this.getCommunicationData(userId), // Restricted for minors
    };

    await this.auditService.logSecurityEvent(
      userId,
      'DATA_EXPORT_REQUESTED',
      {
        isMinor: user.isMinor,
        exportedDataTypes: Object.keys(userData).filter(key => userData[key] !== null),
      },
    );

    return userData;
  }

  async applyDataMinimization(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isMinor) {
      return; // Only apply to minors
    }

    // COPPA requirement: Minimize data collection for minors
    const minimizationActions = [
      'remove_optional_fields',
      'anonymize_ip_addresses',
      'limit_location_precision',
      'reduce_analytics_tracking',
    ];

    for (const action of minimizationActions) {
      await this.executeMinimizationAction(userId, action);
    }

    await this.auditService.logSecurityEvent(
      userId,
      'DATA_MINIMIZATION_APPLIED',
      {
        isMinor: true,
        actions: minimizationActions,
      },
    );
  }

  async checkComplianceStatus(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const complianceStatus = {
      userId,
      isMinor: user.isMinor,
      dataRetentionCompliant: await this.checkRetentionCompliance(userId),
      parentalConsentValid: user.isMinor ? await this.checkParentalConsentStatus(userId) : true,
      dataMinimizationApplied: user.isMinor ? await this.checkDataMinimization(userId) : true,
      lastComplianceCheck: new Date().toISOString(),
    };

    await this.auditService.logSecurityEvent(
      userId,
      'COMPLIANCE_STATUS_CHECK',
      {
        isMinor: user.isMinor,
        complianceStatus,
      },
    );

    return complianceStatus;
  }

  // Helper methods (in production, these would interact with actual data stores)
  private async verifyParentalConsentForDeletion(userId: string): Promise<boolean> {
    // Check if parent has consented to data deletion
    console.log(`[PRIVACY] Checking parental consent for deletion: ${userId}`);
    return true; // Placeholder - implement actual consent verification
  }

  private async verifyParentalConsentForExport(userId: string): Promise<boolean> {
    // Check if parent has consented to data export
    console.log(`[PRIVACY] Checking parental consent for export: ${userId}`);
    return true; // Placeholder - implement actual consent verification
  }

  private async deleteDataByType(userId: string, dataType: string): Promise<void> {
    console.log(`[DATA_DELETION] Deleting ${dataType} for user ${userId}`);
    // Implement actual data deletion based on data type
  }

  private async getPersonalData(userId: string): Promise<any> {
    // Return user's personal information
    return { placeholder: 'personal_data' };
  }

  private async getGameData(userId: string): Promise<any> {
    // Return user's game statistics
    return { placeholder: 'game_data' };
  }

  private async getSessionData(userId: string): Promise<any> {
    // Return user's session history
    return { placeholder: 'session_data' };
  }

  private async getCommunicationData(userId: string): Promise<any> {
    // Return user's communication history (restricted for minors)
    return { placeholder: 'communication_data' };
  }

  private async executeMinimizationAction(userId: string, action: string): Promise<void> {
    console.log(`[DATA_MINIMIZATION] Executing ${action} for user ${userId}`);
    // Implement actual minimization action
  }

  private async checkRetentionCompliance(userId: string): Promise<boolean> {
    // Check if data retention policies are being followed
    return true; // Placeholder
  }

  private async checkParentalConsentStatus(userId: string): Promise<boolean> {
    // Check if parental consent is still valid
    return true; // Placeholder
  }

  private async checkDataMinimization(userId: string): Promise<boolean> {
    // Check if data minimization has been applied
    return true; // Placeholder
  }
}