'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { updateUserRole, getDashboardPath, getRoleDisplayName, getRoleDescription, UserRole } from '@/lib/auth/roleManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/simple-ui'
import { Button } from '@/components/simple-ui'
import { Badge } from '@/components/simple-ui'
import { toast } from 'sonner'
import { 
  Users, 
  Trophy, 
  Whistle, 
  ClipboardList, 
  Shield,
  Heart,
  CheckCircle
} from 'lucide-react'

interface RoleOption {
  id: UserRole
  title: string
  description: string
  icon: React.ElementType
  color: string
  features: string[]
}

const roleOptions: RoleOption[] = [
  {
    id: 'coach',
    title: 'Coach',
    description: 'Manage teams, track statistics, and coordinate with players',
    icon: Trophy,
    color: 'bg-basketball-orange-500',
    features: [
      'Team roster management',
      'Game scheduling',
      'Player statistics tracking',
      'Practice planning'
    ]
  },
  {
    id: 'parent',
    title: 'Parent/Guardian',
    description: "Follow your child's games and stay updated on team activities",
    icon: Heart,
    color: 'bg-basketball-green-500',
    features: [
      'Game schedules',
      'Live score updates',
      "Child's statistics",
      'Team communications'
    ]
  },
  {
    id: 'referee',
    title: 'Referee',
    description: 'Manage game assignments and submit official reports',
    icon: Whistle,
    color: 'bg-purple-500',
    features: [
      'Game assignments',
      'Schedule management',
      'Report submission',
      'Rule references'
    ]
  },
  {
    id: 'scorer',
    title: 'Scorekeeper',
    description: 'Record live game scores and track statistics',
    icon: ClipboardList,
    color: 'bg-blue-500',
    features: [
      'Live scoring interface',
      'Statistics tracking',
      'Game reports',
      'Offline mode'
    ]
  },
  {
    id: 'admin',
    title: 'League Administrator',
    description: 'Full access to manage leagues, teams, and system settings',
    icon: Shield,
    color: 'bg-red-500',
    features: [
      'League management',
      'User administration',
      'Tournament setup',
      'System configuration'
    ]
  }
]

export default function SelectRolePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login')
    }
    
    // Check if user already has a role
    const existingRole = localStorage.getItem('userRole')
    if (existingRole) {
      // User already has a role, redirect to their dashboard
      router.push(getDashboardPath(existingRole as UserRole))
    }
  }, [user, loading, router])

  const handleRoleSelection = async (role: UserRole) => {
    if (!user) {
      toast.error('Please sign in first')
      router.push('/login')
      return
    }

    setSelectedRole(role)
    setIsSubmitting(true)

    try {
      // Update user role in Supabase
      const success = await updateUserRole(user.uid, role)
      
      if (success) {
        toast.success(`Welcome, ${getRoleDisplayName(role)}!`)
        
        // Store role locally
        localStorage.setItem('userRole', role)
        
        // Redirect to appropriate dashboard
        const dashboardPath = getDashboardPath(role)
        router.push(dashboardPath)
      } else {
        toast.error('Failed to save your role. Please try again.')
        setIsSubmitting(false)
        setSelectedRole(null)
      }
    } catch (error) {
      console.error('Error selecting role:', error)
      toast.error('An error occurred. Please try again.')
      setIsSubmitting(false)
      setSelectedRole(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-basketball-orange-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Choose Your Role</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Select how you'll be using GameTriq Basketball League
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">
              Signed in as: {user.email}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roleOptions.map((role, index) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id

            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`relative h-full cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-basketball-orange-500' : ''
                  }`}
                  onClick={() => !isSubmitting && handleRoleSelection(role.id)}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle className="h-6 w-6 text-basketball-orange-500" />
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className={`w-12 h-12 ${role.color} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{role.title}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Features:</p>
                      <ul className="space-y-1">
                        {role.features.map((feature) => (
                          <li key={feature} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button 
                      className="w-full mt-6"
                      disabled={isSubmitting}
                      variant={isSelected ? 'default' : 'outline'}
                    >
                      {isSubmitting && isSelected ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Setting up...
                        </>
                      ) : (
                        `Select ${role.title}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            You can change your role later in your account settings
          </p>
        </div>
      </div>
    </div>
  )
}