'use client';

import React, { useState } from 'react';
import { CoachLayout } from '@/components/coach/CoachLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Radar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PlayerStats {
  id: string;
  name: string;
  number: string;
  games: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fg: { made: number; attempted: number };
  threePoint: { made: number; attempted: number };
  ft: { made: number; attempted: number };
}

export default function StatisticsPage() {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [statView, setStatView] = useState<'overview' | 'individual' | 'comparison'>('overview');
  const [timeRange, setTimeRange] = useState<'season' | 'last5' | 'last10'>('season');

  // Mock player stats
  const playerStats: PlayerStats[] = [
    {
      id: '1',
      name: 'Michael Johnson',
      number: '23',
      games: 15,
      minutes: 450,
      points: 228,
      rebounds: 107,
      assists: 53,
      steals: 22,
      blocks: 8,
      turnovers: 31,
      fouls: 28,
      fg: { made: 89, attempted: 182 },
      threePoint: { made: 18, attempted: 52 },
      ft: { made: 32, attempted: 41 },
    },
    {
      id: '2',
      name: 'David Chen',
      number: '10',
      games: 15,
      minutes: 420,
      points: 192,
      rebounds: 63,
      assists: 95,
      steals: 18,
      blocks: 3,
      turnovers: 25,
      fouls: 22,
      fg: { made: 72, attempted: 156 },
      threePoint: { made: 24, attempted: 68 },
      ft: { made: 24, attempted: 30 },
    },
  ];

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9CA3AF',
        },
      },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
      },
    },
    scales: {
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      y: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
    },
  };

  // Team performance over time
  const performanceData = {
    labels: ['Game 1', 'Game 2', 'Game 3', 'Game 4', 'Game 5', 'Game 6', 'Game 7', 'Game 8', 'Game 9', 'Game 10'],
    datasets: [
      {
        label: 'Points Scored',
        data: [65, 72, 68, 75, 71, 82, 78, 69, 74, 77],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Points Allowed',
        data: [58, 68, 71, 62, 65, 70, 72, 75, 68, 71],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Player comparison
  const comparisonData = {
    labels: ['PPG', 'RPG', 'APG', 'SPG', 'FG%', 'FT%'],
    datasets: [
      {
        label: 'Michael Johnson',
        data: [15.2, 7.1, 3.5, 1.5, 48.9, 78.0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
      },
      {
        label: 'David Chen',
        data: [12.8, 4.2, 6.3, 1.2, 46.2, 80.0],
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
      },
    ],
  };

  // Shooting distribution
  const shootingData = {
    labels: ['2PT Made', '3PT Made', 'FT Made', 'Missed'],
    datasets: [
      {
        data: [142, 42, 56, 180],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Category leaders
  const categoryLeaders = [
    { category: 'Points', leader: 'Michael Johnson', value: '15.2 PPG' },
    { category: 'Rebounds', leader: 'Tyler Anderson', value: '10.2 RPG' },
    { category: 'Assists', leader: 'David Chen', value: '6.3 APG' },
    { category: 'Steals', leader: 'Marcus Williams', value: '2.1 SPG' },
    { category: 'FG%', leader: 'James Rodriguez', value: '52.3%' },
    { category: 'FT%', leader: 'David Chen', value: '80.0%' },
  ];

  return (
    <CoachLayout title="Team Statistics" subtitle="Performance Analytics & Insights">
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={statView === 'overview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatView('overview')}
            >
              Overview
            </Button>
            <Button
              variant={statView === 'individual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatView('individual')}
            >
              Individual
            </Button>
            <Button
              variant={statView === 'comparison' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatView('comparison')}
            >
              Comparison
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="season">Season</SelectItem>
                <SelectItem value="last10">Last 10</SelectItem>
                <SelectItem value="last5">Last 5</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export
            </Button>
          </div>
        </div>

        {/* Team Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg Points</p>
                  <p className="text-2xl font-bold text-white">72.5</p>
                  <p className="text-xs text-green-400 mt-1">+5.2 vs last season</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H4a2 2 0 01-2-2V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">FG Percentage</p>
                  <p className="text-2xl font-bold text-white">47.3%</p>
                  <p className="text-xs text-green-400 mt-1">Above average</p>
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
                  <p className="text-gray-400 text-sm">Avg Rebounds</p>
                  <p className="text-2xl font-bold text-white">38.2</p>
                  <p className="text-xs text-yellow-400 mt-1">League average</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Turnovers</p>
                  <p className="text-2xl font-bold text-white">11.3</p>
                  <p className="text-xs text-red-400 mt-1">Need improvement</p>
                </div>
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Performance Trend */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Line data={performanceData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Shooting Distribution */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Shooting Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut data={shootingData} options={{ ...chartOptions, maintainAspectRatio: false }} />
              </div>
            </CardContent>
          </Card>

          {/* Player Comparison Radar */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Player Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Radar 
                  data={comparisonData} 
                  options={{
                    ...chartOptions,
                    scales: {
                      r: {
                        grid: {
                          color: '#374151',
                        },
                        pointLabels: {
                          color: '#9CA3AF',
                        },
                        ticks: {
                          color: '#9CA3AF',
                        },
                      },
                    },
                  }} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Category Leaders */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Category Leaders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryLeaders.map((leader, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{leader.category}</div>
                        <div className="text-xs text-gray-400">{leader.leader}</div>
                      </div>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {leader.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player Stats Table */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Individual Player Statistics</CardTitle>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  <SelectItem value="1">Michael Johnson</SelectItem>
                  <SelectItem value="2">David Chen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 text-gray-400">Player</th>
                    <th className="text-center py-2 text-gray-400">GP</th>
                    <th className="text-center py-2 text-gray-400">MIN</th>
                    <th className="text-center py-2 text-gray-400">PTS</th>
                    <th className="text-center py-2 text-gray-400">REB</th>
                    <th className="text-center py-2 text-gray-400">AST</th>
                    <th className="text-center py-2 text-gray-400">STL</th>
                    <th className="text-center py-2 text-gray-400">BLK</th>
                    <th className="text-center py-2 text-gray-400">FG%</th>
                    <th className="text-center py-2 text-gray-400">3P%</th>
                    <th className="text-center py-2 text-gray-400">FT%</th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((player) => (
                    <tr key={player.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-400 font-medium">#{player.number}</span>
                          <span className="text-white">{player.name}</span>
                        </div>
                      </td>
                      <td className="text-center text-gray-300">{player.games}</td>
                      <td className="text-center text-gray-300">{(player.minutes / player.games).toFixed(1)}</td>
                      <td className="text-center text-white font-medium">{(player.points / player.games).toFixed(1)}</td>
                      <td className="text-center text-gray-300">{(player.rebounds / player.games).toFixed(1)}</td>
                      <td className="text-center text-gray-300">{(player.assists / player.games).toFixed(1)}</td>
                      <td className="text-center text-gray-300">{(player.steals / player.games).toFixed(1)}</td>
                      <td className="text-center text-gray-300">{(player.blocks / player.games).toFixed(1)}</td>
                      <td className="text-center text-gray-300">{((player.fg.made / player.fg.attempted) * 100).toFixed(1)}%</td>
                      <td className="text-center text-gray-300">{((player.threePoint.made / player.threePoint.attempted) * 100).toFixed(1)}%</td>
                      <td className="text-center text-gray-300">{((player.ft.made / player.ft.attempted) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </CoachLayout>
  );
}