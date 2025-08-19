'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AgeGate } from '@/components/age-gate'
import { Button } from '@/components/simple-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/simple-ui'
import { Badge } from '@/components/simple-ui'
import { 
  Trophy, 
  Users, 
  BarChart3, 
  Shield, 
  Smartphone,
  Clock,
  MapPin,
  Star,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

const features = [
  {
    icon: Trophy,
    title: 'Live Game Scoring',
    description: 'Real-time scoring with offline support and automatic sync',
    color: 'text-basketball-orange-500'
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Complete roster management with player stats and profiles',
    color: 'text-basketball-green-500'
  },
  {
    icon: Trophy,
    title: 'Tournament Brackets',
    description: 'Interactive tournament management with live updates',
    color: 'text-team-home-primary'
  },
  {
    icon: BarChart3,
    title: 'Advanced Statistics',
    description: 'Comprehensive player and team analytics dashboard',
    color: 'text-purple-500'
  },
  {
    icon: Shield,
    title: 'Youth Safety First',
    description: 'COPPA compliant with Phoenix heat safety monitoring',
    color: 'text-heat-red'
  },
  {
    icon: Smartphone,
    title: 'Mobile Optimized',
    description: 'Touch-friendly interface designed for courtside use',
    color: 'text-teal-500'
  }
]

const testimonials = [
  {
    name: 'Mike Johnson',
    role: 'Eagles Coach',
    content: 'GameTriq has transformed how we manage our team. The live scoring feature is incredible!',
    rating: 5
  },
  {
    name: 'Sarah Davis',
    role: 'Parent',
    content: 'I love getting real-time updates about my daughter\'s games. The app is so easy to use.',
    rating: 5
  },
  {
    name: 'Tom Wilson',
    role: 'League Administrator',
    content: 'Managing our entire league has never been easier. The scheduling tools are fantastic.',
    rating: 5
  }
]

const stats = [
  { value: '10,000+', label: 'Active Players' },
  { value: '500+', label: 'Teams Managed' },
  { value: '50+', label: 'Leagues' },
  { value: '99.9%', label: 'Uptime' }
]

export default function HomePage() {
  const [ageVerified, setAgeVerified] = useState(false)
  const [showAgeGate, setShowAgeGate] = useState(false)

  useEffect(() => {
    // Check if age has been previously verified
    const verified = localStorage.getItem('age-verified')
    if (verified === 'true') {
      setAgeVerified(true)
    } else {
      // Show age gate after a brief delay for better UX
      const timer = setTimeout(() => setShowAgeGate(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAgeVerification = (isOver13: boolean, hasParentalConsent: boolean) => {
    if (isOver13 || hasParentalConsent) {
      setAgeVerified(true)
      localStorage.setItem('age-verified', 'true')
      if (!isOver13) {
        localStorage.setItem('parental-consent', 'true')
      }
    }
    setShowAgeGate(false)
  }

  return (
    <>
      {/* Age Gate Modal */}
      {showAgeGate && !ageVerified && (
        <AgeGate 
          onVerify={handleAgeVerification}
          onClose={() => setShowAgeGate(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-basketball-orange-500" />
              <span className="text-xl font-bold text-basketball-orange-500">GameTriq</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link href="#features" className="text-foreground/60 hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-foreground/60 hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="#about" className="text-foreground/60 hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="#contact" className="text-foreground/60 hover:text-foreground transition-colors">
                Contact
              </Link>
            </nav>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main id="main-content" className="flex-1">
          <section className="relative py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-basketball-orange-50 to-basketball-green-50">
            <div className="container px-4 md:px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center space-y-8 text-center"
              >
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                    Trophy League Management
                    <span className="text-basketball-orange-500"> Made Simple</span>
                  </h1>
                  <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
                    The complete platform for managing basketball leagues, teams, and players. 
                    Real-time scoring, statistics, and tournament management with mobile-first design.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" asChild>
                    <Link href="/register">
                      Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/dashboard">View Dashboard</Link>
                  </Button>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    Free 14-day trial
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    No credit card required
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    COPPA compliant
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-12 bg-basketball-orange-500 text-white">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                    <div className="text-sm text-basketball-orange-100">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-12 md:py-24">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center space-y-4 mb-12"
              >
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Everything You Need to Manage Trophy
                </h2>
                <p className="mx-auto max-w-[600px] text-gray-600 md:text-lg">
                  From youth leagues to competitive tournaments, GameTriq provides all the tools 
                  you need to run successful basketball programs.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-200">
                      <CardHeader>
                        <feature.icon className={`h-10 w-10 ${feature.color} mb-2`} />
                        <CardTitle>{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Phoenix Heat Safety Callout */}
          <section className="py-12 bg-gradient-to-r from-heat-orange to-heat-red text-white">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center space-y-4"
              >
                <div className="flex items-center justify-center space-x-2">
                  <MapPin className="h-6 w-6" />
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    Phoenix, AZ Optimized
                  </Badge>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  Built for Phoenix Heat Safety
                </h2>
                <p className="mx-auto max-w-[600px] text-heat-orange-100">
                  Automatic heat monitoring, safety protocols, and game management 
                  specifically designed for Arizona's extreme temperatures.
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Real-time heat alerts
                  </div>
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Automated safety protocols
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Testimonials Section */}
          <section className="py-12 md:py-24 bg-gray-50">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center space-y-4 mb-12"
              >
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Loved by Coaches, Players, and Parents
                </h2>
                <p className="mx-auto max-w-[600px] text-gray-600 md:text-lg">
                  See what the basketball community is saying about GameTriq
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-1 mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                        <div>
                          <div className="font-semibold">{testimonial.name}</div>
                          <div className="text-sm text-gray-500">{testimonial.role}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-12 md:py-24 bg-basketball-green-500 text-white">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center space-y-6"
              >
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Ready to Transform Your League?
                </h2>
                <p className="mx-auto max-w-[600px] text-basketball-green-100 md:text-lg">
                  Join thousands of coaches, players, and administrators who trust GameTriq 
                  to manage their basketball programs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/register">
                      Start Free Trial <ArrowRight className="ml-2 h-4 w-4 inline" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-basketball-green-500" asChild>
                    <Link href="/tournaments">View Tournaments</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t bg-white">
          <div className="container py-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-basketball-orange-500" />
                <span className="font-semibold">GameTriq</span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
                <Link href="/terms" className="hover:text-gray-900">Terms</Link>
                <Link href="/support" className="hover:text-gray-900">Support</Link>
              </div>
              <div className="text-sm text-gray-500">
                © 2025 GameTriq. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}