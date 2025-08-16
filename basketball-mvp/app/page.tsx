import Link from 'next/link'
import { Trophy, Users, Calendar, Activity, CheckCircle, Wifi } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Phoenix Basketball League
            <span className="text-primary block mt-2">Management Platform</span>
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            Streamline your league operations with real-time scoring, player verification, and comprehensive team management.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
            <Link href="/games/live" className="btn-secondary text-lg px-8 py-3">
              View Live Games
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 bg-bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Built for Basketball</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card p-6">
              <Activity className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Live Scoring</h3>
              <p className="text-text-secondary">
                Real-time score updates visible to all spectators instantly
              </p>
            </div>
            
            <div className="card p-6">
              <CheckCircle className="w-12 h-12 text-success mb-4" />
              <h3 className="text-xl font-semibold mb-2">Player Verification</h3>
              <p className="text-text-secondary">
                Ensure fair play with official player roster verification
              </p>
            </div>
            
            <div className="card p-6">
              <Wifi className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">Offline First</h3>
              <p className="text-text-secondary">
                Works seamlessly even with poor gym WiFi connectivity
              </p>
            </div>
            
            <div className="card p-6">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Management</h3>
              <p className="text-text-secondary">
                Complete roster management and player statistics tracking
              </p>
            </div>
            
            <div className="card p-6">
              <Calendar className="w-12 h-12 text-success mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-text-secondary">
                Automated game scheduling with venue management
              </p>
            </div>
            
            <div className="card p-6">
              <Trophy className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">Tournament Ready</h3>
              <p className="text-text-secondary">
                Handle Saturday tournaments with multiple simultaneous games
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-primary">80+</p>
              <p className="text-text-secondary">Active Leagues</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-accent">3,500+</p>
              <p className="text-text-secondary">Teams</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-success">1000+</p>
              <p className="text-text-secondary">Concurrent Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">24/7</p>
              <p className="text-text-secondary">Live Updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your League?</h2>
          <p className="text-xl text-text-secondary mb-8">
            Join the Phoenix basketball community today
          </p>
          <Link href="/register" className="btn-primary text-lg px-8 py-3">
            Start Free Trial
          </Link>
        </div>
      </section>
    </div>
  )
}