'use client';

import React from 'react';
import { CoachLayout } from '@/components/coach/CoachLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import Link from 'next/link';

export default function CoachDashboard() {
  // Mock data for demonstration
  const upcomingGames = [
    {
      id: '1',
      opponent: 'Desert Storm',
      date: 'Tomorrow',
      time: '3:00 PM',
      venue: 'Mesa Recreation Center',
      type: 'League',
    },
    {
      id: '2',
      opponent: 'Scottsdale Eagles',
      date: 'Saturday',
      time: '10:00 AM',
      venue: 'Scottsdale Sports Complex',
      type: 'Tournament',
    },
  ];

  const recentGames = [
    {
      id: '1',
      opponent: 'Tempe Thunder',
      result: 'W',
      score: '68-62',
      date: '2 days ago',
    },
    {
      id: '2',
      opponent: 'Chandler Chargers',
      result: 'W',
      score: '75-71',
      date: '5 days ago',
    },
    {
      id: '3',
      opponent: 'Glendale Warriors',
      result: 'L',
      score: '58-65',
      date: '1 week ago',
    },
  ];

  const topPerformers = [
    { name: 'Michael Johnson', number: '23', ppg: 15.2, rpg: 7.1, apg: 3.5 },
    { name: 'David Chen', number: '10', ppg: 12.8, rpg: 4.2, apg: 6.3 },
    { name: 'Marcus Williams', number: '5', ppg: 11.5, rpg: 3.8, apg: 2.1 },
  ];

  const practiceAttendance = {
    lastPractice: { date: 'Yesterday', present: 12, absent: 3 },
    seasonAverage: 85,
  };

  return (
    <CoachLayout title="Coach Dashboard" subtitle="Team Overview & Management">
      <div className="space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Season Record</p>
                  <p className="text-2xl font-bold text-white">12-3</p>
                  <p className="text-xs text-green-400 mt-1">80% Win Rate</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Division Rank</p>
                  <p className="text-2xl font-bold text-white">2nd</p>
                  <p className="text-xs text-yellow-400 mt-1">Division A</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Roster</p>
                  <p className="text-2xl font-bold text-white">15</p>
                  <p className="text-xs text-blue-400 mt-1">All Eligible</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Practice Attendance</p>
                  <p className="text-2xl font-bold text-white">{practiceAttendance.seasonAverage}%</p>
                  <p className="text-xs text-gray-400 mt-1">Season Average</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Upcoming Games */}
          <div className="xl:col-span-2">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Upcoming Games</CardTitle>
                  <Link href="/coach/schedule">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingGames.map((game) => (
                  <div key={game.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-white font-semibold">vs {game.opponent}</div>
                        <div className="text-sm text-gray-400 mt-1">
                          {game.date} at {game.time}
                        </div>
                      </div>
                      <Badge className={`${
                        game.type === 'Tournament' 
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {game.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-400">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {game.venue}
                      </div>
                      <Button size="sm" variant="outline">
                        Prepare Lineup
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Recent Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentGames.map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-3 hover:bg-gray-700/30 rounded-lg transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                          game.result === 'W' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {game.result}
                        </div>
                        <div>
                          <div className="text-white font-medium">vs {game.opponent}</div>
                          <div className="text-xs text-gray-400">{game.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{game.score}</div>
                        <Link href={`/coach/stats/game/${game.id}`}>
                          <span className="text-xs text-blue-400 hover:underline cursor-pointer">View Stats</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Top Performers */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((player, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-sm">
                          {player.number}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">
                            {player.ppg} PPG
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        <div>{player.rpg} RPG</div>
                        <div>{player.apg} APG</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Practice Attendance */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Last Practice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Date</span>
                    <span className="text-white font-medium">{practiceAttendance.lastPractice.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Present</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      {practiceAttendance.lastPractice.present} Players
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Absent</span>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      {practiceAttendance.lastPractice.absent} Players
                    </Badge>
                  </div>
                  <div className="pt-4 border-t border-gray-700">
                    <Link href="/coach/schedule">
                      <Button className="w-full" variant="outline">
                        Schedule Practice
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/coach/roster" className="block">
                  <Button className="w-full justify-start" variant="default">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
                    </svg>
                    Manage Roster
                  </Button>
                </Link>
                
                <Link href="/coach/messages" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    Send Team Message
                  </Button>
                </Link>
                
                <Link href="/coach/stats" className="block">
                  <Button className="w-full justify-start" variant="secondary">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7z" />
                    </svg>
                    View Statistics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CoachLayout>
  );
}