'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Trophy, Calendar, Users, MapPin, Star } from 'lucide-react'
import Link from 'next/link'

export default function TournamentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading tournaments...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tournaments</h1>
          <p className="text-text-secondary">
            Competitive tournaments and championship events
          </p>
        </div>

        {/* Coming Soon Section */}
        <div className="card p-12 text-center">
          <Trophy className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Tournament Feature Coming Soon</h2>
          <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
            We're working on an exciting tournament management system that will handle 
            single elimination, double elimination, and round-robin formats. Perfect for 
            Saturday tournaments with multiple simultaneous games.
          </p>
          
          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 text-left">
            <div className="bg-bg-secondary rounded-lg p-6">
              <Star className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-semibold mb-2">Multiple Formats</h3>
              <p className="text-text-secondary text-sm">
                Support for single elimination, double elimination, and round-robin tournaments
              </p>
            </div>
            
            <div className="bg-bg-secondary rounded-lg p-6">
              <Users className="w-8 h-8 text-success mb-3" />
              <h3 className="font-semibold mb-2">Bracket Management</h3>
              <p className="text-text-secondary text-sm">
                Automated bracket generation and real-time updates as games complete
              </p>
            </div>
            
            <div className="bg-bg-secondary rounded-lg p-6">
              <Calendar className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Event Scheduling</h3>
              <p className="text-text-secondary text-sm">
                Smart scheduling across multiple courts and time slots
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/games" className="btn-primary">
              View Regular Season Games
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}