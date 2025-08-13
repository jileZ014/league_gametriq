'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ModernAdminLayout } from '@/components/admin/ModernAdminLayout';
import { LeagueTable } from '@/components/admin/LeagueTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { useFeatureFlag } from '@/lib/feature-flags';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  ChevronDown,
  Calendar,
  Users,
  Trophy,
  TrendingUp
} from 'lucide-react';

interface League {
  id: string;
  name: string;
  division: string;
  season: string;
  status: 'active' | 'suspended' | 'archived' | 'upcoming';
  startDate: string;
  endDate: string;
  teams: number;
  games: number;
  registrationOpen: boolean;
  coordinator: string;
  coordinatorEmail: string;
  venues: string[];
  created: string;
  lastModified: string;
}

interface LeagueStats {
  totalLeagues: number;
  activeLeagues: number;
  totalTeams: number;
  totalGames: number;
  upcomingGames: number;
  completedGames: number;
}

export default function LeaguesManagement() {
  const isModernUI = useFeatureFlag('ADMIN_MODERN_UI');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [filteredLeagues, setFilteredLeagues] = useState<League[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stats, setStats] = useState<LeagueStats>({
    totalLeagues: 82,
    activeLeagues: 68,
    totalTeams: 3542,
    totalGames: 12456,
    upcomingGames: 324,
    completedGames: 8932
  });

  // Mock data generation
  useEffect(() => {
    const divisions = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Adult'];
    const seasons = ['Spring 2024', 'Summer 2024', 'Fall 2024', 'Winter 2024'];
    const statuses: League['status'][] = ['active', 'suspended', 'archived', 'upcoming'];
    const coordinators = [
      'John Martinez', 'Sarah Johnson', 'Mike Williams', 'Emily Chen', 
      'David Rodriguez', 'Lisa Thompson', 'Robert Garcia'
    ];
    const venues = [
      'Phoenix Sports Complex', 'Mesa Recreation Center', 'Scottsdale Arena',
      'Tempe Youth Center', 'Glendale Basketball Courts', 'Chandler Sports Hub'
    ];

    const mockLeagues: League[] = [];
    for (let i = 1; i <= 82; i++) {
      const division = divisions[Math.floor(Math.random() * divisions.length)];
      const season = seasons[Math.floor(Math.random() * seasons.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const coordinator = coordinators[Math.floor(Math.random() * coordinators.length)];
      
      mockLeagues.push({
        id: `league-${i}`,
        name: `Phoenix ${division} ${['Elite', 'Premier', 'Select', 'Rec', 'Competitive'][Math.floor(Math.random() * 5)]} League`,
        division,
        season,
        status,
        startDate: '2024-03-15',
        endDate: '2024-06-30',
        teams: Math.floor(Math.random() * 80) + 20,
        games: Math.floor(Math.random() * 300) + 100,
        registrationOpen: status === 'upcoming' || (status === 'active' && Math.random() > 0.5),
        coordinator,
        coordinatorEmail: coordinator.toLowerCase().replace(' ', '.') + '@phoenixleague.com',
        venues: venues.slice(0, Math.floor(Math.random() * 3) + 1),
        created: '2024-01-15',
        lastModified: '2024-03-01'
      });
    }

    setLeagues(mockLeagues);
    setFilteredLeagues(mockLeagues);
  }, []);

  // Filter leagues based on search and filters
  useEffect(() => {
    let filtered = [...leagues];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(league => 
        league.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        league.coordinator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        league.division.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(league => league.status === statusFilter);
    }

    // Division filter
    if (divisionFilter !== 'all') {
      filtered = filtered.filter(league => league.division === divisionFilter);
    }

    // Season filter
    if (seasonFilter !== 'all') {
      filtered = filtered.filter(league => league.season === seasonFilter);
    }

    setFilteredLeagues(filtered);
  }, [searchTerm, statusFilter, divisionFilter, seasonFilter, leagues]);

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on`, selectedLeagues);
    // Implement bulk action logic
    setSelectedLeagues([]);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting to ${format}`);
    // Implement export logic
  };

  if (!isModernUI) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">League Management</h1>
        <p className="text-gray-600">Modern UI is disabled. Enable ADMIN_MODERN_UI feature flag to see the modern interface.</p>
      </div>
    );
  }

  return (
    <ModernAdminLayout 
      title="League Management" 
      subtitle="Manage basketball leagues, divisions, and seasons"
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Leagues</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.totalLeagues}</p>
                  <p className="text-xs text-green-400 mt-2">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    +12% from last season
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-black" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Leagues</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.activeLeagues}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {Math.round((stats.activeLeagues / stats.totalLeagues) * 100)}% of total
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Teams</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.totalTeams.toLocaleString()}</p>
                  <p className="text-xs text-blue-400 mt-2">
                    Across all divisions
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Games</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.totalGames.toLocaleString()}</p>
                  <p className="text-xs text-purple-400 mt-2">
                    {stats.upcomingGames} upcoming
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions Bar */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search leagues, coordinators, divisions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>

                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Divisions</option>
                  <option value="U8">U8</option>
                  <option value="U10">U10</option>
                  <option value="U12">U12</option>
                  <option value="U14">U14</option>
                  <option value="U16">U16</option>
                  <option value="U18">U18</option>
                  <option value="Adult">Adult</option>
                </select>

                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Seasons</option>
                  <option value="Spring 2024">Spring 2024</option>
                  <option value="Summer 2024">Summer 2024</option>
                  <option value="Fall 2024">Fall 2024</option>
                  <option value="Winter 2024">Winter 2024</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport('csv')}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold hover:from-yellow-500 hover:to-orange-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create League
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedLeagues.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between">
                <span className="text-yellow-400 text-sm">
                  {selectedLeagues.length} league(s) selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('activate')}
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('suspend')}
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    Suspend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('archive')}
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    Archive
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* League Table */}
        <LeagueTable
          leagues={filteredLeagues}
          selectedLeagues={selectedLeagues}
          onSelectionChange={setSelectedLeagues}
          onLeagueEdit={(id) => console.log('Edit league', id)}
          onLeagueDelete={(id) => console.log('Delete league', id)}
        />
      </div>
    </ModernAdminLayout>
  );
}