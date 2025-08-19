// Registration API client for frontend
// This module handles all registration-related API calls

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

interface TeamRegistrationPayload {
  teamName: string
  leagueId: string
  divisionId: string
  coachName: string
  coachEmail: string
  coachPhone: string
  assistantCoachName?: string
  assistantCoachEmail?: string
  teamColors: {
    primary: string
    secondary?: string
  }
  practicePreferences?: string
  specialRequests?: string
  paymentIntentId: string
  discount?: string
  waiverSignedAt: string
}

interface PlayerRegistrationPayload {
  firstName: string
  lastName: string
  dateOfBirth: {
    month: string
    day: string
    year: string
  }
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say'
  email?: string
  phone?: string
  parentName?: string
  parentEmail?: string
  parentPhone?: string
  teamId: string
  jerseySize: string
  jerseyNumber?: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
  medicalConditions?: string
  allergies?: string
  medications?: string
  insuranceProvider?: string
  insurancePolicyNumber?: string
  paymentIntentId: string
  discount?: string
  waiverSignedAt: string
  isMinor: boolean
}

interface DiscountValidationResponse {
  valid: boolean
  type: 'percentage' | 'fixed'
  value: number
  description: string
}

interface PaymentIntentResponse {
  clientSecret: string
  paymentIntentId: string
}

class RegistrationAPI {
  private async fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async createTeamRegistration(data: TeamRegistrationPayload): Promise<ApiResponse<{ registrationId: string }>> {
    try {
      const response = await this.fetchAPI<ApiResponse>('/registration/team', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      
      return {
        success: true,
        registrationId: response.data.registrationId
      }
    } catch (error) {
      console.error('Team registration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      }
    }
  }

  async createPlayerRegistration(data: PlayerRegistrationPayload): Promise<ApiResponse<{ registrationId: string }>> {
    try {
      const response = await this.fetchAPI<ApiResponse>('/registration/player', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      
      return {
        success: true,
        registrationId: response.data.registrationId
      }
    } catch (error) {
      console.error('Player registration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      }
    }
  }

  async validateDiscountCode(
    code: string,
    type: 'team' | 'player'
  ): Promise<DiscountValidationResponse | null> {
    try {
      const response = await this.fetchAPI<ApiResponse<DiscountValidationResponse>>(
        `/registration/discount/validate`,
        {
          method: 'POST',
          body: JSON.stringify({ code, type }),
        }
      )
      
      return response.data || null
    } catch (error) {
      console.error('Discount validation error:', error)
      return null
    }
  }

  async createPaymentIntent(
    amount: number,
    metadata: Record<string, any>
  ): Promise<PaymentIntentResponse> {
    const response = await this.fetchAPI<ApiResponse<PaymentIntentResponse>>(
      '/registration/payment/create-intent',
      {
        method: 'POST',
        body: JSON.stringify({ amount, metadata }),
      }
    )
    
    if (!response.success || !response.data) {
      throw new Error('Failed to create payment intent')
    }
    
    return response.data
  }

  async sendConfirmationEmail(data: {
    type: 'team' | 'player'
    email: string
    registrationId: string
  }): Promise<void> {
    try {
      await this.fetchAPI('/registration/confirmation-email', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    } catch (error) {
      // Don't throw on email errors - registration is still successful
      console.error('Failed to send confirmation email:', error)
    }
  }

  async getTeams(leagueId?: string, divisionId?: string): Promise<Array<{
    id: string
    name: string
    league: string
    division: string
    spotsAvailable: number
    fee: number
  }>> {
    const params = new URLSearchParams()
    if (leagueId) params.append('leagueId', leagueId)
    if (divisionId) params.append('divisionId', divisionId)
    
    const response = await this.fetchAPI<ApiResponse<any[]>>(
      `/registration/teams?${params.toString()}`
    )
    
    return response.data || []
  }

  async getLeagues(): Promise<Array<{
    id: string
    name: string
    description: string
    startDate: string
    endDate: string
    registrationDeadline: string
    fee: number
    divisions: Array<{
      id: string
      name: string
      minAge: number
      maxAge: number
    }>
  }>> {
    const response = await this.fetchAPI<ApiResponse<any[]>>('/registration/leagues')
    return response.data || []
  }

  async checkJerseyAvailability(
    teamId: string,
    jerseyNumber: string
  ): Promise<{ available: boolean }> {
    const response = await this.fetchAPI<ApiResponse<{ available: boolean }>>(
      `/registration/jersey/check`,
      {
        method: 'POST',
        body: JSON.stringify({ teamId, jerseyNumber }),
      }
    )
    
    return response.data || { available: false }
  }

  async uploadWaiverSignature(
    registrationId: string,
    signature: string,
    signedBy: string,
    signedAt: string
  ): Promise<void> {
    await this.fetchAPI('/registration/waiver/upload', {
      method: 'POST',
      body: JSON.stringify({
        registrationId,
        signature,
        signedBy,
        signedAt,
      }),
    })
  }
}

// Export singleton instance
export const registrationApi = new RegistrationAPI()