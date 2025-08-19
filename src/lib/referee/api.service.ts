/**
 * Referee API Service
 * Handles all API interactions for referee management
 */

import {
  Referee,
  Assignment,
  AssignmentStatus,
  SchedulingContext,
  SchedulingResult,
  PaymentRecord,
  PerformanceMetrics,
  AssignmentNotification,
  NotificationChannel,
  Conflict
} from './types';

export class RefereeAPIService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  private static instance: RefereeAPIService;

  private constructor() {}

  public static getInstance(): RefereeAPIService {
    if (!RefereeAPIService.instance) {
      RefereeAPIService.instance = new RefereeAPIService();
    }
    return RefereeAPIService.instance;
  }

  /**
   * Referee CRUD Operations
   */
  async getReferees(organizationId: string): Promise<Referee[]> {
    const response = await fetch(`${this.baseUrl}/referees?organizationId=${organizationId}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch referees');
    }
    
    return response.json();
  }

  async getRefereeById(refereeId: string): Promise<Referee> {
    const response = await fetch(`${this.baseUrl}/referees/${refereeId}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch referee');
    }
    
    return response.json();
  }

  async createReferee(referee: Omit<Referee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Referee> {
    const response = await fetch(`${this.baseUrl}/referees`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(referee)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create referee');
    }
    
    return response.json();
  }

  async updateReferee(refereeId: string, updates: Partial<Referee>): Promise<Referee> {
    const response = await fetch(`${this.baseUrl}/referees/${refereeId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update referee');
    }
    
    return response.json();
  }

  async deleteReferee(refereeId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/referees/${refereeId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete referee');
    }
  }

  /**
   * Assignment Operations
   */
  async getAssignments(filters?: {
    refereeId?: string;
    gameId?: string;
    status?: AssignmentStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Assignment[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/assignments?${params}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch assignments');
    }
    
    return response.json();
  }

  async createAssignment(assignment: Omit<Assignment, 'id'>): Promise<Assignment> {
    const response = await fetch(`${this.baseUrl}/assignments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(assignment)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create assignment');
    }
    
    return response.json();
  }

  async updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus,
    notes?: string
  ): Promise<Assignment> {
    const response = await fetch(`${this.baseUrl}/assignments/${assignmentId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, notes })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update assignment status');
    }
    
    return response.json();
  }

  async confirmAssignment(assignmentId: string): Promise<Assignment> {
    return this.updateAssignmentStatus(assignmentId, 'CONFIRMED');
  }

  async declineAssignment(assignmentId: string, reason?: string): Promise<Assignment> {
    return this.updateAssignmentStatus(assignmentId, 'DECLINED', reason);
  }

  async cancelAssignment(assignmentId: string, reason?: string): Promise<Assignment> {
    return this.updateAssignmentStatus(assignmentId, 'CANCELLED', reason);
  }

  /**
   * Scheduling Operations
   */
  async runScheduling(context: SchedulingContext): Promise<SchedulingResult> {
    const response = await fetch(`${this.baseUrl}/scheduling/run`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(context)
    });
    
    if (!response.ok) {
      throw new Error('Failed to run scheduling');
    }
    
    return response.json();
  }

  async optimizeSchedule(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SchedulingResult> {
    const response = await fetch(`${this.baseUrl}/scheduling/optimize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        organizationId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to optimize schedule');
    }
    
    return response.json();
  }

  async getSchedulingConflicts(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Conflict[]> {
    const params = new URLSearchParams({
      organizationId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    const response = await fetch(`${this.baseUrl}/scheduling/conflicts?${params}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch conflicts');
    }
    
    return response.json();
  }

  async resolveConflict(
    conflictId: string,
    resolution: {
      type: 'REASSIGN' | 'CANCEL' | 'OVERRIDE';
      refereeId?: string;
      notes?: string;
    }
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/scheduling/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(resolution)
    });
    
    if (!response.ok) {
      throw new Error('Failed to resolve conflict');
    }
  }

  /**
   * Availability Management
   */
  async updateAvailability(
    refereeId: string,
    availability: Referee['availability']
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/referees/${refereeId}/availability`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(availability)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update availability');
    }
  }

  async addBlackoutDate(
    refereeId: string,
    blackoutDate: Referee['blackoutDates'][0]
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/referees/${refereeId}/blackout-dates`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(blackoutDate)
    });
    
    if (!response.ok) {
      throw new Error('Failed to add blackout date');
    }
  }

  async removeBlackoutDate(refereeId: string, blackoutDateId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/referees/${refereeId}/blackout-dates/${blackoutDateId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders()
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to remove blackout date');
    }
  }

  /**
   * Performance & Analytics
   */
  async getRefereePerformance(
    refereeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    const response = await fetch(
      `${this.baseUrl}/referees/${refereeId}/performance?${params}`,
      {
        headers: this.getHeaders()
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch performance metrics');
    }
    
    return response.json();
  }

  async getOrganizationAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalGames: number;
    totalAssignments: number;
    coverageRate: number;
    totalCost: number;
    averageRating: number;
    topPerformers: Array<{ refereeId: string; rating: number; games: number }>;
    utilizationRate: Map<string, number>;
  }> {
    const params = new URLSearchParams({
      organizationId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    const response = await fetch(`${this.baseUrl}/analytics/referees?${params}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    
    return response.json();
  }

  /**
   * Payment Operations
   */
  async getPaymentRecords(
    refereeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PaymentRecord[]> {
    const params = new URLSearchParams();
    
    if (refereeId) params.append('refereeId', refereeId);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const response = await fetch(`${this.baseUrl}/payments/referees?${params}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch payment records');
    }
    
    return response.json();
  }

  async processPayment(paymentRecord: Omit<PaymentRecord, 'id'>): Promise<PaymentRecord> {
    const response = await fetch(`${this.baseUrl}/payments/referees`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(paymentRecord)
    });
    
    if (!response.ok) {
      throw new Error('Failed to process payment');
    }
    
    return response.json();
  }

  async exportPayroll(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'pdf' | 'excel'
  ): Promise<Blob> {
    const params = new URLSearchParams({
      organizationId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      format
    });
    
    const response = await fetch(`${this.baseUrl}/payments/referees/export?${params}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to export payroll');
    }
    
    return response.blob();
  }

  /**
   * Notification Operations
   */
  async sendNotification(
    refereeId: string,
    notification: Omit<AssignmentNotification, 'id' | 'sentAt'>
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/referees`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...notification,
        refereeId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send notification');
    }
  }

  async sendBulkNotifications(
    refereeIds: string[],
    message: {
      type: AssignmentNotification['type'];
      content: string;
      channels: NotificationChannel[];
    }
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/referees/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        refereeIds,
        message
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send bulk notifications');
    }
  }

  async getNotificationHistory(
    refereeId: string,
    limit?: number
  ): Promise<AssignmentNotification[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const response = await fetch(
      `${this.baseUrl}/referees/${refereeId}/notifications?${params}`,
      {
        headers: this.getHeaders()
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch notification history');
    }
    
    return response.json();
  }

  /**
   * Import/Export Operations
   */
  async importReferees(file: File, organizationId: string): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('organizationId', organizationId);
    
    const response = await fetch(`${this.baseUrl}/referees/import`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthToken()
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to import referees');
    }
    
    return response.json();
  }

  async exportReferees(
    organizationId: string,
    format: 'csv' | 'excel'
  ): Promise<Blob> {
    const params = new URLSearchParams({
      organizationId,
      format
    });
    
    const response = await fetch(`${this.baseUrl}/referees/export?${params}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to export referees');
    }
    
    return response.blob();
  }

  /**
   * Helper Methods
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.getAuthToken()
    };
  }

  private getAuthToken(): string {
    // Get auth token from local storage or auth context
    return localStorage.getItem('authToken') || '';
  }

  /**
   * WebSocket Support for Real-time Updates
   */
  subscribeToAssignmentUpdates(
    organizationId: string,
    onUpdate: (assignment: Assignment) => void
  ): () => void {
    const ws = new WebSocket(`${this.getWebSocketUrl()}/assignments/${organizationId}`);
    
    ws.onmessage = (event) => {
      const assignment = JSON.parse(event.data) as Assignment;
      onUpdate(assignment);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Return cleanup function
    return () => {
      ws.close();
    };
  }

  subscribeToConflictUpdates(
    organizationId: string,
    onConflict: (conflict: Conflict) => void
  ): () => void {
    const ws = new WebSocket(`${this.getWebSocketUrl()}/conflicts/${organizationId}`);
    
    ws.onmessage = (event) => {
      const conflict = JSON.parse(event.data) as Conflict;
      onConflict(conflict);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Return cleanup function
    return () => {
      ws.close();
    };
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
}