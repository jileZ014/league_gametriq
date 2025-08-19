'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { registrationApi } from '@/lib/api/registration'

interface TeamRegistrationData {
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

interface PlayerRegistrationData {
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

interface RegistrationState {
  currentStep: number
  totalSteps: number
  data: Partial<TeamRegistrationData | PlayerRegistrationData>
  errors: Record<string, string>
}

export function useRegistration() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<RegistrationState>({
    currentStep: 0,
    totalSteps: 6,
    data: {},
    errors: {}
  })

  const updateData = useCallback((updates: Partial<TeamRegistrationData | PlayerRegistrationData>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates }
    }))
  }, [])

  const setError = useCallback((field: string, message: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: message }
    }))
  }, [])

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {}
    }))
  }, [])

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.totalSteps - 1)
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0)
    }))
  }, [])

  const createTeamRegistration = useCallback(async (data: TeamRegistrationData) => {
    setLoading(true)
    clearErrors()

    try {
      const response = await registrationApi.createTeamRegistration(data)
      
      if (response.success) {
        toast.success('Team registered successfully!')
        
        // Send confirmation email
        await registrationApi.sendConfirmationEmail({
          type: 'team',
          email: data.coachEmail,
          registrationId: response.registrationId
        })
        
        return response
      } else {
        throw new Error(response.error || 'Registration failed')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      toast.error(message)
      setError('general', message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [clearErrors, setError])

  const createPlayerRegistration = useCallback(async (data: PlayerRegistrationData) => {
    setLoading(true)
    clearErrors()

    try {
      const response = await registrationApi.createPlayerRegistration(data)
      
      if (response.success) {
        toast.success('Player registered successfully!')
        
        // Send confirmation email
        const emailTarget = data.isMinor && data.parentEmail ? data.parentEmail : data.email
        if (emailTarget) {
          await registrationApi.sendConfirmationEmail({
            type: 'player',
            email: emailTarget,
            registrationId: response.registrationId
          })
        }
        
        return response
      } else {
        throw new Error(response.error || 'Registration failed')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      toast.error(message)
      setError('general', message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [clearErrors, setError])

  const validateDiscountCode = useCallback(async (code: string, registrationType: 'team' | 'player') => {
    try {
      const response = await registrationApi.validateDiscountCode(code, registrationType)
      return response
    } catch (error) {
      return null
    }
  }, [])

  const createPaymentIntent = useCallback(async (amount: number, metadata: Record<string, any>) => {
    try {
      const response = await registrationApi.createPaymentIntent(amount, metadata)
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment setup failed'
      toast.error(message)
      throw error
    }
  }, [])

  return {
    // State
    loading,
    state,
    
    // Actions
    updateData,
    setError,
    clearErrors,
    nextStep,
    prevStep,
    
    // API methods
    createTeamRegistration,
    createPlayerRegistration,
    validateDiscountCode,
    createPaymentIntent
  }
}