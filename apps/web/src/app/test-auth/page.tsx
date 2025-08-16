'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function TestAuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>({})
  const supabase = createClient()

  const testConnection = async () => {
    setLoading(true)
    const testResults: any = {}
    
    try {
      // Test 1: Check if Supabase client is initialized
      testResults.clientInitialized = !!supabase
      testResults.authAvailable = !!supabase?.auth
      
      // Test 2: Try to get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      testResults.sessionCheck = {
        success: !sessionError,
        hasSession: !!sessionData?.session,
        error: sessionError?.message || null
      }
      
      // Test 3: Try to query database
      const { data: dbData, error: dbError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact', head: true })
      
      testResults.databaseCheck = {
        success: !dbError,
        error: dbError?.message || null
      }
      
      setResults(testResults)
    } catch (error: any) {
      testResults.generalError = error.message
      setResults(testResults)
    } finally {
      setLoading(false)
    }
  }

  const testRegister = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      
      setResults({
        action: 'register',
        success: !error,
        userId: data?.user?.id,
        email: data?.user?.email,
        error: error?.message || null,
        errorDetails: error
      })
      
      if (!error) {
        toast.success('Registration successful! Check your email.')
      } else {
        toast.error(`Registration failed: ${error.message}`)
      }
    } catch (error: any) {
      setResults({
        action: 'register',
        success: false,
        error: error.message,
        errorDetails: error
      })
      toast.error(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      setResults({
        action: 'login',
        success: !error,
        userId: data?.user?.id,
        email: data?.user?.email,
        session: !!data?.session,
        error: error?.message || null,
        errorDetails: error
      })
      
      if (!error) {
        toast.success('Login successful!')
      } else {
        toast.error(`Login failed: ${error.message}`)
      }
    } catch (error: any) {
      setResults({
        action: 'login',
        success: false,
        error: error.message,
        errorDetails: error
      })
      toast.error(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogout = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      
      setResults({
        action: 'logout',
        success: !error,
        error: error?.message || null
      })
      
      if (!error) {
        toast.success('Logout successful!')
      } else {
        toast.error(`Logout failed: ${error.message}`)
      }
    } catch (error: any) {
      setResults({
        action: 'logout',
        success: false,
        error: error.message
      })
      toast.error(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
      
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Supabase Configuration</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({
              url: 'https://mgfpbqvkhqjlvgeqaclj.supabase.co',
              keyLength: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'.length,
              clientExists: !!supabase,
              authExists: !!supabase?.auth
            }, null, 2)}
          </pre>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="TestPass123!"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testConnection} 
            disabled={loading}
            variant="outline"
          >
            Test Connection
          </Button>
          <Button 
            onClick={testRegister} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            Test Register
          </Button>
          <Button 
            onClick={testLogin} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Test Login
          </Button>
          <Button 
            onClick={testLogout} 
            disabled={loading}
            variant="destructive"
          >
            Test Logout
          </Button>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h2 className="font-semibold mb-2">Test Results</h2>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}