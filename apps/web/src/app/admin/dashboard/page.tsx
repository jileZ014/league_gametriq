'use client';

import React, { useState, useEffect } from 'react';
import { ModernAdminLayout } from '@/components/admin/ModernAdminLayout';
import { AnalyticsCards, AnalyticsSummary } from '@/components/admin/AnalyticsCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFeatureFlag } from '@/lib/feature-flags';

interface RecentActivity {
  id: string;
  type: 'registration' | 'game' | 'payment' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  user?: string;
  league?: string;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: string;
  responseTime: number;
  activeConnections: number;
  lastUpdate: string;
}

interface LiveGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  score: { home: number; away: number };
  quarter: number;
  timeRemaining: string;
  venue: string;
  league: string;
}

export default function AdminDashboard() {
  const isModernUI = useFeatureFlag('ADMIN_MODERN_UI');
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: '99.8%',
    responseTime: 145,
    activeConnections: 1247,
    lastUpdate: new Date().toLocaleTimeString(),
  });

  // Mock data for demonstration
  useEffect(() => {
    const mockLiveGames: LiveGame[] = [
      {
        id: '1',
        homeTeam: 'Phoenix Suns Youth',
        awayTeam: 'Desert Storm',
        score: { home: 45, away: 38 },
        quarter: 3,
        timeRemaining: '8:42',
        venue: 'Mesa Recreation Center',
        league: 'U14 Boys Division A',
      },
      {
        id: '2',
        homeTeam: 'Scottsdale Eagles',
        awayTeam: 'Tempe Thunder',
        score: { home: 72, away: 68 },
        quarter: 4,
        timeRemaining: '2:15',
        venue: 'Scottsdale Sports Complex',
        league: 'U16 Girls Division B',
      },
      {
        id: '3',
        homeTeam: 'Glendale Warriors',
        awayTeam: 'Chandler Chargers',
        score: { home: 28, away: 31 },
        quarter: 2,
        timeRemaining: '5:30',
        venue: 'Glendale Youth Center',
        league: 'U12 Boys Division C',
      },
    ];

    const mockActivity: RecentActivity[] = [
      {
        id: '1',
        type: 'registration',
        title: 'New Team Registration',
        description: 'Phoenix Rising U14 Boys registered for Spring League',
        timestamp: '2 minutes ago',
        status: 'success',
        user: 'Coach Martinez',
        league: 'Phoenix Metro League',
      },
      {
        id: '2',
        type: 'payment',
        title: 'Payment Received',
        description: '$450 registration fee processed',
        timestamp: '5 minutes ago',
        status: 'success',
        user: 'Sarah Johnson',
        league: 'Desert Youth League',
      },
      {
        id: '3',
        type: 'game',
        title: 'Game Completed',
        description: 'Tempe Tigers vs Mesa Mustangs - Final: 65-58',
        timestamp: '12 minutes ago',
        status: 'info',
        league: 'U16 Boys Division A',
      },
      {
        id: '4',
        type: 'alert',
        title: 'Weather Advisory',
        description: 'High temperatures expected - recommend early games',
        timestamp: '1 hour ago',
        status: 'warning',
        league: 'All Outdoor Leagues',
      },
      {
        id: '5',
        type: 'registration',
        title: 'Player Registration',
        description: 'Emma Rodriguez joined Scottsdale Eagles',
        timestamp: '2 hours ago',
        status: 'success',
        user: 'Parent Portal',
        league: 'U14 Girls Division B',
      },
    ];

    setLiveGames(mockLiveGames);
    setRecentActivity(mockActivity);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setSystemHealth(prev => ({
        ...prev,
        responseTime: Math.floor(Math.random() * 100) + 120,
        activeConnections: Math.floor(Math.random() * 200) + 1100,
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
          </svg>
        );
      case 'game':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'payment':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zM6 10a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1z" />
          </svg>
        );
      case 'alert':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getActivityStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'error':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'info':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  if (!isModernUI) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <p className="text-gray-600">Modern UI is disabled. Enable ADMIN_MODERN_UI feature flag to see the modern dashboard.</p>
      </div>
    );
  }

  return (
    <ModernAdminLayout 
      title="Admin Dashboard" 
      subtitle="Phoenix Youth Basketball League Management"
    >
      <div className="space-y-8">
        {/* Analytics Overview */}
        <section>
          <AnalyticsSummary />
        </section>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Live Games */}
          <div className="xl:col-span-2">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span>Live Games</span>
                  </CardTitle>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                    {liveGames.length} Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveGames.map((game) => (
                    <div 
                      key={game.id} 
                      className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">{game.league}</div>
                        <div className="flex items-center space-x-2 text-sm text-yellow-400">
                          <span>Q{game.quarter}</span>
                          <span>-</span>
                          <span>{game.timeRemaining}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 items-center gap-4">
                        <div className="text-white font-medium text-right">
                          <div className="text-sm">{game.homeTeam}</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {game.score.home} - {game.score.away}
                          </div>
                        </div>
                        
                        <div className="text-white font-medium">
                          <div className="text-sm">{game.awayTeam}</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400 text-center">
                        {game.venue}
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="outline" className="w-full mt-4">
                    View All Live Games
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <div>
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>System Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      {systemHealth.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-white font-medium">{systemHealth.uptime}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white font-medium">{systemHealth.responseTime}ms</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Active Users</span>
                    <span className="text-white font-medium">{systemHealth.activeConnections.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-500">
                      Last updated: {systemHealth.lastUpdate}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="default">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create League
                  </Button>
                  
                  <Button className="w-full justify-start" variant="outline">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Schedule Games
                  </Button>
                  
                  <Button className="w-full justify-start" variant="secondary">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                    View Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <section>
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-700/30 transition-colors">
                    <div className={`p-2 rounded-lg border ${getActivityStatusColor(activity.status)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium text-sm">{activity.title}</h4>
                        <span className="text-xs text-gray-500">{activity.timestamp}</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{activity.description}</p>
                      {(activity.user || activity.league) && (
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          {activity.user && <span>By: {activity.user}</span>}
                          {activity.league && <span>League: {activity.league}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </ModernAdminLayout>
  );
}