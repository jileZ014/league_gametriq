'use client';

import React, { useState } from 'react';
import { Card } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Checkbox } from '@/components/simple-ui';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  Users,
  MapPin,
  Mail,
  ChevronDown,
  ChevronUp
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

interface LeagueTableProps {
  leagues: League[];
  selectedLeagues: string[];
  onSelectionChange: (selected: string[]) => void;
  onLeagueEdit: (id: string) => void;
  onLeagueDelete: (id: string) => void;
}

export function LeagueTable({
  leagues,
  selectedLeagues,
  onSelectionChange,
  onLeagueEdit,
  onLeagueDelete
}: LeagueTableProps) {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof League>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof League) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLeagues = [...leagues].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * direction;
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction;
    }
    return 0;
  });

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeagues.length === leagues.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(leagues.map(l => l.id));
    }
  };

  const handleSelectLeague = (id: string) => {
    if (selectedLeagues.includes(id)) {
      onSelectionChange(selectedLeagues.filter(leagueId => leagueId !== id));
    } else {
      onSelectionChange([...selectedLeagues, id]);
    }
  };

  const getStatusBadge = (status: League['status']) => {
    const variants = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    
    return (
      <Badge className={variants[status]}>
        {status === 'active' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const SortIcon = ({ field }: { field: keyof League }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 opacity-30" />;
    }
    return sortDirection === 'desc' ? 
      <ChevronDown className="w-3 h-3 text-orange-400" /> : 
      <ChevronUp className="w-3 h-3 text-orange-400" />;
  };

  return (
    <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-4 text-left">
                <Checkbox
                  checked={selectedLeagues.length === leagues.length && leagues.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="border-gray-600"
                />
              </th>
              <th className="p-4 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">League Name</span>
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="p-4 text-left">
                <button
                  onClick={() => handleSort('division')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Division</span>
                  <SortIcon field="division" />
                </button>
              </th>
              <th className="p-4 text-left">
                <button
                  onClick={() => handleSort('season')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Season</span>
                  <SortIcon field="season" />
                </button>
              </th>
              <th className="p-4 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</span>
              </th>
              <th className="p-4 text-center">
                <button
                  onClick={() => handleSort('teams')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mx-auto"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Teams</span>
                  <SortIcon field="teams" />
                </button>
              </th>
              <th className="p-4 text-center">
                <button
                  onClick={() => handleSort('games')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mx-auto"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Games</span>
                  <SortIcon field="games" />
                </button>
              </th>
              <th className="p-4 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Registration</span>
              </th>
              <th className="p-4 text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLeagues.map((league) => (
              <React.Fragment key={league.id}>
                <tr 
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedLeagues.includes(league.id)}
                      onCheckedChange={() => handleSelectLeague(league.id)}
                      className="border-gray-600"
                    />
                  </td>
                  <td className="p-4">
                    <div>
                      <button
                        onClick={() => toggleRowExpansion(league.id)}
                        className="text-white font-medium hover:text-orange-400 transition-colors text-left"
                      >
                        {league.name}
                      </button>
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {league.id}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {league.division}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-300">{league.season}</span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(league.status)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="text-white font-semibold">{league.teams}</div>
                    <div className="text-xs text-gray-500">teams</div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="text-white font-semibold">{league.games}</div>
                    <div className="text-xs text-gray-500">scheduled</div>
                  </td>
                  <td className="p-4">
                    {league.registrationOpen ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Open
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Closed
                      </Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleRowExpansion(league.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onLeagueEdit(league.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onLeagueDelete(league.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row Details */}
                {expandedRows.includes(league.id) && (
                  <tr className="bg-gray-800/20">
                    <td colSpan={9} className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Coordinator Info */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Coordinator</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span>{league.coordinator}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <a href={`mailto:${league.coordinatorEmail}`} className="hover:text-orange-400">
                                {league.coordinatorEmail}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Schedule Info */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Schedule</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>Start: {new Date(league.startDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>End: {new Date(league.endDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Venues */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Venues</h4>
                          <div className="space-y-2">
                            {league.venues.map((venue, index) => (
                              <div key={index} className="flex items-center gap-2 text-gray-300">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span>{venue}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="mt-6 pt-6 border-t border-gray-700">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Created: {new Date(league.created).toLocaleDateString()}</span>
                          <span>Last Modified: {new Date(league.lastModified).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          View Schedule
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          View Teams
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          View Standings
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          Generate Report
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing {sortedLeagues.length} of {sortedLeagues.length} leagues
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" disabled>
            Previous
          </Button>
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" disabled>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}