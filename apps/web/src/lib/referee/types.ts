/**
 * Referee Assignment System - Type Definitions
 * Following Domain-Driven Design principles for clear bounded contexts
 */

// Core Domain Types
export interface Referee {
  id: string;
  organizationId: string;
  userId: string; // Links to user account
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  };
  
  // Certification & Experience
  experience: ExperienceLevel;
  certifications: Certification[];
  specializations: Specialization[];
  yearsOfExperience: number;
  gamesOfficiated: number;
  
  // Availability & Constraints
  availability: AvailabilityRule[];
  blackoutDates: BlackoutDate[];
  maxGamesPerDay: number;
  maxGamesPerWeek: number;
  maxConsecutiveGames: number;
  minRestBetweenGames: number; // minutes
  travelRadius: number; // miles
  
  // Preferences
  preferredVenues: string[];
  preferredDivisions: Division[];
  preferredPartners: string[]; // Other referee IDs
  avoidPartners: string[]; // Referee IDs to avoid pairing with
  
  // Payment & Performance
  baseRate: number; // per game
  experienceMultiplier: number;
  performanceRating: number;
  reliability: number; // 0-100
  punctuality: number; // 0-100
  
  // Status
  status: RefereeStatus;
  active: boolean;
  lastAssignmentDate?: Date;
  totalEarnings: number;
  
  // Metadata
  notes: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ExperienceLevel = 
  | 'VOLUNTEER'
  | 'BEGINNER' 
  | 'INTERMEDIATE'
  | 'EXPERIENCED'
  | 'CERTIFIED';

export type RefereeStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'ON_LEAVE'
  | 'RETIRED';

export interface Certification {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate: Date;
  expiryDate?: Date;
  level: string;
  verified: boolean;
}

export interface Specialization {
  division: Division;
  experienceLevel: 'BASIC' | 'PROFICIENT' | 'EXPERT';
  gamesOfficiated: number;
}

export interface Division {
  id: string;
  name: string; // e.g., "6U", "8U", "10U", etc.
  ageGroup: string;
  skillLevel: SkillLevel;
  requiredExperience: ExperienceLevel;
  gameLength: number; // minutes
  numberOfPeriods: number;
  periodLength: number; // minutes
}

export type SkillLevel = 
  | 'RECREATIONAL'
  | 'COMPETITIVE'
  | 'ELITE'
  | 'TOURNAMENT';

// Availability & Scheduling
export interface AvailabilityRule {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  priority: 'AVAILABLE' | 'PREFERRED' | 'IF_NEEDED';
  effectiveFrom: Date;
  effectiveTo?: Date;
  recurring: boolean;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday

export interface BlackoutDate {
  id: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  partial?: {
    startTime?: string;
    endTime?: string;
  };
}

// Assignment Domain
export interface Assignment {
  id: string;
  gameId: string;
  refereeId: string;
  role: AssignmentRole;
  status: AssignmentStatus;
  
  // Assignment Details
  assignedAt: Date;
  assignedBy: string;
  confirmedAt?: Date;
  declinedAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
  
  // Payment
  payRate: number;
  bonuses: Bonus[];
  totalPay: number;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  
  // Performance
  performanceScore?: number;
  feedback?: string;
  complaints?: Complaint[];
  commendations?: Commendation[];
  
  // Logistics
  arrivalTime?: Date;
  departureTime?: Date;
  mileage?: number;
  expenses?: Expense[];
  
  // Metadata
  notes?: string;
  conflictScore: number; // Lower is better
  autoAssigned: boolean;
}

export type AssignmentRole = 
  | 'HEAD_REFEREE'
  | 'ASSISTANT_REFEREE'
  | 'SCOREKEEPER'
  | 'CLOCK_OPERATOR'
  | 'SHOT_CLOCK_OPERATOR';

export type AssignmentStatus = 
  | 'PENDING'
  | 'OFFERED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'COMPLETED'
  | 'PAID';

export interface Bonus {
  type: 'TOURNAMENT' | 'OVERTIME' | 'HOLIDAY' | 'LAST_MINUTE' | 'EXPERIENCE';
  amount: number;
  reason: string;
}

export interface Complaint {
  id: string;
  reportedBy: string;
  date: Date;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  resolved: boolean;
}

export interface Commendation {
  id: string;
  givenBy: string;
  date: Date;
  description: string;
}

export interface Expense {
  type: 'MILEAGE' | 'PARKING' | 'MEAL' | 'OTHER';
  amount: number;
  description?: string;
  approved: boolean;
}

export type PaymentMethod = 
  | 'CHECK'
  | 'DIRECT_DEPOSIT'
  | 'CASH'
  | 'VENMO'
  | 'PAYPAL';

// Constraint Satisfaction Problem (CSP) Types
export interface AssignmentConstraints {
  // Required constraints (hard)
  requiredExperience: Map<Division, ExperienceLevel>;
  maximumGamesPerDay: number;
  maximumGamesPerWeek: number;
  minimumRestBetweenGames: number; // minutes
  maximumTravelDistance: number; // miles
  maximumConsecutiveGames: number;
  
  // Preferred constraints (soft)
  preferExperiencedForTournaments: boolean;
  preferLocalReferees: boolean;
  preferConsistentCrews: boolean;
  avoidBackToBackGames: boolean;
  
  // Fairness constraints
  balanceAssignments: boolean;
  balanceEarnings: boolean;
  respectPreferences: boolean;
  
  // Cost constraints
  maximumCostPerGame?: number;
  targetUtilization: number; // 0-1
  
  // Time constraints
  assignmentLeadTime: number; // hours before game
  confirmationDeadline: number; // hours before game
  allowEmergencyAssignments: boolean;
}

// Scheduling Algorithm Types
export interface SchedulingContext {
  games: Game[];
  referees: Referee[];
  venues: Venue[];
  existingAssignments: Assignment[];
  constraints: AssignmentConstraints;
  timeWindow: {
    start: Date;
    end: Date;
  };
  optimization: OptimizationObjective;
}

export type OptimizationObjective = 
  | 'MINIMIZE_COST'
  | 'MAXIMIZE_COVERAGE'
  | 'BALANCE_WORKLOAD'
  | 'MINIMIZE_TRAVEL'
  | 'MAXIMIZE_SATISFACTION';

export interface SchedulingResult {
  success: boolean;
  assignments: Assignment[];
  unassignedGames: UnassignedGame[];
  conflicts: Conflict[];
  metrics: SchedulingMetrics;
  suggestions: Suggestion[];
}

export interface UnassignedGame {
  game: Game;
  reason: string;
  requiredRoles: AssignmentRole[];
  availableCandidates: string[];
}

export interface Conflict {
  type: ConflictType;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedEntities: {
    referees?: string[];
    games?: string[];
    venues?: string[];
  };
  resolution?: string;
}

export type ConflictType = 
  | 'DOUBLE_BOOKING'
  | 'INSUFFICIENT_REST'
  | 'TRAVEL_TIME'
  | 'EXPERIENCE_MISMATCH'
  | 'AVAILABILITY_CONFLICT'
  | 'MAX_GAMES_EXCEEDED'
  | 'BLACKOUT_DATE'
  | 'PARTNER_CONFLICT';

export interface SchedulingMetrics {
  totalGames: number;
  assignedGames: number;
  coverageRate: number;
  totalCost: number;
  averageCostPerGame: number;
  refereeUtilization: Map<string, number>;
  travelDistance: Map<string, number>;
  workloadBalance: number; // 0-1, higher is more balanced
  satisfactionScore: number; // 0-100
}

export interface Suggestion {
  type: 'ADD_REFEREES' | 'ADJUST_CONSTRAINTS' | 'RESCHEDULE_GAMES' | 'INCREASE_RATES';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  impact: string;
  implementation?: string;
}

// Game & Venue Types (simplified for referee context)
export interface Game {
  id: string;
  leagueId: string;
  divisionId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledTime: Date;
  estimatedDuration: number; // minutes
  type: GameType;
  importance: GameImportance;
  requiredOfficials: RequiredOfficial[];
  status: GameStatus;
}

export type GameType = 
  | 'REGULAR'
  | 'PLAYOFF'
  | 'CHAMPIONSHIP'
  | 'TOURNAMENT'
  | 'FRIENDLY';

export type GameImportance = 
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'CRITICAL';

export interface RequiredOfficial {
  role: AssignmentRole;
  experienceLevel: ExperienceLevel;
  quantity: number;
}

export type GameStatus = 
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED';

export interface Venue {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number;
    longitude: number;
  };
  facilities: string[];
  parkingAvailable: boolean;
  accessibility: string[];
  contactPhone?: string;
}

// Notification Types
export interface AssignmentNotification {
  id: string;
  refereeId: string;
  type: NotificationType;
  assignmentId: string;
  sentAt: Date;
  readAt?: Date;
  respondedAt?: Date;
  response?: 'ACCEPTED' | 'DECLINED';
  channel: NotificationChannel;
}

export type NotificationType = 
  | 'NEW_ASSIGNMENT'
  | 'ASSIGNMENT_REMINDER'
  | 'ASSIGNMENT_CANCELLED'
  | 'ASSIGNMENT_CHANGED'
  | 'PAYMENT_PROCESSED'
  | 'PERFORMANCE_FEEDBACK';

export type NotificationChannel = 
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'IN_APP';

// Payment & Reporting Types
export interface PaymentRecord {
  id: string;
  refereeId: string;
  period: {
    start: Date;
    end: Date;
  };
  assignments: string[];
  subtotal: number;
  bonuses: number;
  expenses: number;
  deductions: number;
  total: number;
  status: PaymentStatus;
  method: PaymentMethod;
  processedAt?: Date;
  reference?: string;
}

export type PaymentStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface PerformanceMetrics {
  refereeId: string;
  period: {
    start: Date;
    end: Date;
  };
  gamesOfficiated: number;
  onTimeArrival: number;
  lateArrivals: number;
  noShows: number;
  averageRating: number;
  complaints: number;
  commendations: number;
  acceptanceRate: number;
  reliabilityScore: number;
}