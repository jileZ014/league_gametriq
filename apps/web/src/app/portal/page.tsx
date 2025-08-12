'use client'

import { SearchBar } from '@/components/portal/SearchBar'
import { useState } from 'react'
import { SearchResult } from '@/lib/search'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PortalHomePage() {
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([])
  
  const handleSearchResult = (result: SearchResult) => {
    // Add to recent searches (max 5)
    setRecentSearches(prev => {
      const filtered = prev.filter(r => r.id !== result.id)
      return [result, ...filtered].slice(0, 5)
    })
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Hero Section with Search */}
        <section className="text-center py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Welcome to Our League
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join the excitement and be part of our competitive gaming community.
            Register your team today!
          </p>
          
          {/* Global Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <SearchBar 
              autofocus 
              onResultClick={handleSearchResult}
              className="w-full"
            />
          </div>
          
          <div className="flex justify-center space-x-4">
            <a
              href="/register/team"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity"
            >
              Register Team
            </a>
            <a
              href="/portal/schedule"
              className="bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity"
            >
              View Schedule
            </a>
          </div>
        </section>
        
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <section className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Recent Searches</h3>
            <div className="space-y-2">
              {recentSearches.map((result) => (
                <Card key={result.id} className="p-3">
                  <a 
                    href={result.url}
                    className="flex items-center justify-between hover:bg-accent rounded-md transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{result.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {result.type}
                      </Badge>
                    </div>
                    {result.subtitle && (
                      <span className="text-sm text-muted-foreground">{result.subtitle}</span>
                    )}
                  </a>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg p-6 text-center border">
            <div className="text-3xl font-bold text-primary mb-2">128</div>
            <div className="text-muted-foreground">Active Teams</div>
          </div>
          <div className="bg-card rounded-lg p-6 text-center border">
            <div className="text-3xl font-bold text-primary mb-2">1,024</div>
            <div className="text-muted-foreground">Registered Players</div>
          </div>
          <div className="bg-card rounded-lg p-6 text-center border">
            <div className="text-3xl font-bold text-primary mb-2">256</div>
            <div className="text-muted-foreground">Games Played</div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-8">
          <h2 className="text-3xl font-bold text-center mb-8">Why Join Our League?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Competitive Play</h3>
              <p className="text-muted-foreground">
                Test your skills against the best teams in structured tournaments
                and seasonal leagues.
              </p>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Fair Matchmaking</h3>
              <p className="text-muted-foreground">
                Our advanced ranking system ensures balanced and exciting matches
                for all skill levels.
              </p>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-3">Great Prizes</h3>
              <p className="text-muted-foreground">
                Compete for cash prizes, gaming gear, and exclusive rewards
                throughout the season.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-accent rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">
            Registration is open now. Don't miss your chance to compete!
          </p>
          <a
            href="/register"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity"
          >
            Register Now
          </a>
        </section>
      </div>
    </div>
  )
}