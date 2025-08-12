'use client'

import { SearchBar } from '@/components/portal/SearchBar'
import { Filters } from '@/components/portal/Filters'
import { usePortalFilters } from '@/hooks/usePortalFilters'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState } from 'react'

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  venue: string
  league: string
  division: string
  ageGroup: string
  status: 'upcoming' | 'live' | 'completed' | 'cancelled'
  homeScore?: number
  awayScore?: number
}

// Mock game data (replace with API call)
const mockGames: Game[] = [
  {
    id: 'game-1',
    homeTeam: 'Thunder Hawks',
    awayTeam: 'Lightning Bolts',
    date: '2024-03-15',
    time: '19:00',
    venue: 'Main Arena',
    league: 'premier',
    division: 'a',
    ageGroup: 'u16',
    status: 'upcoming',
  },
  {
    id: 'game-2',
    homeTeam: 'Fire Dragons',
    awayTeam: 'Ice Warriors',
    date: '2024-03-14',
    time: '18:00',
    venue: 'North Field',
    league: 'championship',
    division: 'a',
    ageGroup: 'u18',
    status: 'completed',
    homeScore: 3,
    awayScore: 2,
  },
  {
    id: 'game-3',
    homeTeam: 'Lightning Bolts',
    awayTeam: 'Thunder Hawks',
    date: '2024-03-16',
    time: '15:00',
    venue: 'Main Arena',
    league: 'premier',
    division: 'a',
    ageGroup: 'u16',
    status: 'upcoming',
  },
  {
    id: 'game-4',
    homeTeam: 'Ice Warriors',
    awayTeam: 'Fire Dragons',
    date: '2024-03-13',
    time: '20:00',
    venue: 'South Complex',
    league: 'recreational',
    division: 'c',
    ageGroup: 'u12',
    status: 'cancelled',
  },
]

export default function SchedulePage() {
  const { filters } = usePortalFilters()
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  
  // Filter games based on active filters
  useEffect(() => {
    setIsLoading(true)
    
    // Simulate API call with filtering
    setTimeout(() => {
      let filteredGames = [...mockGames]
      
      // Apply search query
      if (filters.query) {
        const query = filters.query.toLowerCase()
        filteredGames = filteredGames.filter(game => 
          game.homeTeam.toLowerCase().includes(query) ||
          game.awayTeam.toLowerCase().includes(query) ||
          game.venue.toLowerCase().includes(query)
        )
      }
      
      // Apply league filter
      if (filters.league) {
        filteredGames = filteredGames.filter(game => game.league === filters.league)
      }
      
      // Apply division filter
      if (filters.division) {
        filteredGames = filteredGames.filter(game => game.division === filters.division)
      }
      
      // Apply age group filter
      if (filters.ageGroup) {
        filteredGames = filteredGames.filter(game => game.ageGroup === filters.ageGroup)
      }
      
      // Apply status filter
      if (filters.status) {
        filteredGames = filteredGames.filter(game => game.status === filters.status)
      }
      
      // Apply date range filters
      if (filters.dateFrom) {
        filteredGames = filteredGames.filter(game => game.date >= filters.dateFrom)
      }
      if (filters.dateTo) {
        filteredGames = filteredGames.filter(game => game.date <= filters.dateTo)
      }
      
      // Apply sorting
      filteredGames.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.time.localeCompare(b.time)
      })
      
      if (filters.sortOrder === 'desc') {
        filteredGames.reverse()
      }
      
      setGames(filteredGames)
      setIsLoading(false)
    }, 500)
  }, [filters])
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
  
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }
  
  const getStatusBadge = (status: Game['status']) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>
      case 'live':
        return <Badge variant="destructive">Live</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>
    }
  }
  
  // Group games by date
  const gamesByDate = games.reduce((acc, game) => {
    if (!acc[game.date]) {
      acc[game.date] = []
    }
    acc[game.date].push(game)
    return acc
  }, {} as Record<string, Game[]>)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Schedule</h1>
        <p className="text-muted-foreground mb-6">
          View upcoming games and match results
        </p>
        
        {/* Search Bar */}
        <div className="max-w-2xl mb-6">
          <SearchBar placeholder="Search teams or venues..." />
        </div>
        
        {/* View Toggle */}
        <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'calendar')}>
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Filters 
            showDateRange={true} 
            showStatus={true} 
            showSort={false} 
          />
        </div>
        
        {/* Schedule Content */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-muted-foreground">Loading schedule...</p>
              </div>
            </div>
          ) : games.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No games found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/portal/schedule'}
              >
                Clear filters
              </Button>
            </Card>
          ) : view === 'list' ? (
            <div className="space-y-6">
              {Object.entries(gamesByDate).map(([date, dateGames]) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-background py-2">
                    {formatDate(date)}
                  </h3>
                  <div className="space-y-3">
                    {dateGames.map((game) => (
                      <Card key={game.id} className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(game.status)}
                              <span className="text-sm text-muted-foreground">
                                {formatTime(game.time)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1 text-center md:text-right">
                                <div className="font-semibold text-lg">{game.homeTeam}</div>
                                {game.status === 'completed' && (
                                  <div className="text-2xl font-bold">{game.homeScore}</div>
                                )}
                              </div>
                              
                              <div className="px-4 text-muted-foreground">
                                {game.status === 'completed' ? 'vs' : '@'}
                              </div>
                              
                              <div className="flex-1 text-center md:text-left">
                                <div className="font-semibold text-lg">{game.awayTeam}</div>
                                {game.status === 'completed' && (
                                  <div className="text-2xl font-bold">{game.awayScore}</div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{game.venue}</span>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {game.league === 'premier' ? 'Premier' : 
                                   game.league === 'championship' ? 'Championship' : 
                                   'Recreational'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Div {game.division.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={`/portal/games/${game.id}`}>Details</a>
                            </Button>
                            {game.status === 'upcoming' && (
                              <Button variant="outline" size="sm">
                                Add to Calendar
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Calendar view placeholder
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
              <p className="text-muted-foreground">
                Calendar view coming soon. Use list view for now.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}