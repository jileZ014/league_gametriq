import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ScheduledReport } from './scheduled-report.entity';
import { ReportHistory } from './report-history.entity';

export enum ReportTemplateType {
  LEAGUE_SUMMARY = 'league_summary',
  FINANCIAL = 'financial',
  GAME_RESULTS = 'game_results',
  ATTENDANCE = 'attendance',
  CUSTOM = 'custom',
}

export interface TemplateSection {
  id: string;
  type: 'table' | 'chart' | 'summary' | 'text' | 'statistics';
  title: string;
  data?: string;
  columns?: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut';
  limit?: number;
  orderBy?: string;
  filters?: Record<string, any>;
}

export interface TemplateVariables {
  [key: string]: {
    type: 'string' | 'number' | 'date' | 'boolean' | 'array';
    required: boolean;
    default?: any;
    description?: string;
  };
}

@Entity('report_templates')
@Index(['organizationId'])
@Index(['templateType'])
@Index(['isActive'])
@Index(['isSystem'])
export class ReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportTemplateType,
    name: 'template_type',
  })
  templateType: ReportTemplateType;

  @Column({ type: 'jsonb', default: {}, name: 'template_content' })
  templateContent: Record<string, any>;

  @Column({ type: 'jsonb', default: {}, name: 'variables' })
  variables: TemplateVariables;

  @Column({ type: 'jsonb', default: {}, name: 'default_filters' })
  defaultFilters: Record<string, any>;

  @Column({ type: 'jsonb', default: [], name: 'sections' })
  sections: TemplateSection[];

  @Column({ type: 'jsonb', default: {}, name: 'styling' })
  styling: Record<string, any>;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ type: 'boolean', default: false, name: 'is_system' })
  isSystem: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ScheduledReport, (report) => report.template)
  scheduledReports: ScheduledReport[];

  @OneToMany(() => ReportHistory, (history) => history.template)
  reportHistory: ReportHistory[];

  // Helper methods
  isEditable(): boolean {
    return !this.isSystem;
  }

  validateVariables(providedVariables: Record<string, any>): string[] {
    const errors: string[] = [];
    
    Object.entries(this.variables).forEach(([key, config]) => {
      if (config.required && !(key in providedVariables)) {
        errors.push(`Required variable '${key}' is missing`);
      }
      
      if (key in providedVariables) {
        const value = providedVariables[key];
        const expectedType = config.type;
        
        if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Variable '${key}' must be an array`);
        } else if (expectedType === 'number' && typeof value !== 'number') {
          errors.push(`Variable '${key}' must be a number`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Variable '${key}' must be a boolean`);
        } else if (expectedType === 'date' && !(value instanceof Date)) {
          errors.push(`Variable '${key}' must be a date`);
        }
      }
    });
    
    return errors;
  }

  applyDefaults(variables: Record<string, any>): Record<string, any> {
    const result = { ...variables };
    
    Object.entries(this.variables).forEach(([key, config]) => {
      if (!(key in result) && 'default' in config) {
        result[key] = config.default;
      }
    });
    
    return result;
  }
}