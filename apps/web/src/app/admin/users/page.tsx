'use client';

import React, { useState, useEffect } from 'react';
import { ModernAdminLayout } from '@/components/admin/ModernAdminLayout';
import { UserTable } from '@/components/admin/UserTable';
import { RoleManager } from '@/components/admin/RoleManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFeatureFlag } from '@/lib/feature-flags';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Users,
  Shield,
  UserCheck,
  UserX,
  TrendingUp,
  Activity
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'coordinator' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator';
  status: 'active' | 'inactive' | 'suspended';
  leagues: string[];
  teams: string[];
  lastLogin: string;
  created: string;
  verified: boolean;
  twoFactorEnabled: boolean;
  permissions: string[];
  avatar?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newThisWeek: number;
  activeToday: number;
  roleDistribution: Record<string, number>;
}

export default function UsersManagement() {
  const isModernUI = useFeatureFlag('ADMIN_MODERN_UI');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 15842,
    activeUsers: 12456,
    newThisWeek: 234,
    activeToday: 1247,
    roleDistribution: {
      admin: 12,
      coordinator: 45,
      coach: 892,
      parent: 6234,
      player: 7892,
      referee: 156,
      scorekeeper: 234,
      spectator: 377
    }
  });

  // Mock data generation
  useEffect(() => {
    const roles: User['role'][] = ['admin', 'coordinator', 'coach', 'parent', 'player', 'referee', 'scorekeeper', 'spectator'];
    const statuses: User['status'][] = ['active', 'inactive', 'suspended'];
    const leagues = ['Phoenix Metro League', 'Desert Youth League', 'Scottsdale Elite', 'Mesa Recreation', 'Tempe Thunder League'];
    const teams = ['Phoenix Suns Youth', 'Desert Storm', 'Scottsdale Eagles', 'Mesa Mustangs', 'Tempe Thunder', 'Glendale Warriors'];
    
    const firstNames = ['John', 'Sarah', 'Mike', 'Emily', 'David', 'Lisa', 'Robert', 'Jennifer', 'James', 'Maria'];
    const lastNames = ['Martinez', 'Johnson', 'Williams', 'Chen', 'Rodriguez', 'Thompson', 'Garcia', 'Davis', 'Miller', 'Wilson'];

    const mockUsers: User[] = [];
    for (let i = 1; i <= 100; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const role = roles[Math.floor(Math.random() * roles.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      mockUsers.push({
        id: `user-${i}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `(602) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        role,
        status,
        leagues: leagues.slice(0, Math.floor(Math.random() * 3) + 1),
        teams: teams.slice(0, Math.floor(Math.random() * 2) + 1),
        lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        verified: Math.random() > 0.2,
        twoFactorEnabled: Math.random() > 0.7,
        permissions: role === 'admin' ? ['all'] : role === 'coordinator' ? ['manage_leagues', 'manage_teams'] : ['view_only']
      });
    }

    setUsers(mockUsers);
    setFilteredUsers(mockUsers);
  }, []);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, statusFilter, users]);

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on`, selectedUsers);
    // Implement bulk action logic
    setSelectedUsers([]);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting to ${format}`);
    // Implement export logic
  };

  const getRoleBadgeColor = (role: User['role']) => {
    const colors = {
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      coordinator: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      coach: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      parent: 'bg-green-500/20 text-green-400 border-green-500/30',
      player: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      referee: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      scorekeeper: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      spectator: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[role];
  };

  if (!isModernUI) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">User Management</h1>
        <p className="text-gray-600">Modern UI is disabled. Enable ADMIN_MODERN_UI feature flag to see the modern interface.</p>
      </div>
    );
  }

  return (
    <ModernAdminLayout 
      title="User Management" 
      subtitle="Manage users, roles, and permissions"
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-green-400 mt-2">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    +18% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-black" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Users</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.activeUsers.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of total
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">New This Week</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.newThisWeek}</p>
                  <p className="text-xs text-blue-400 mt-2">
                    Registration surge
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Today</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.activeToday.toLocaleString()}</p>
                  <p className="text-xs text-purple-400 mt-2">
                    Peak hours: 6-8 PM
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Distribution */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {Object.entries(stats.roleDistribution).map(([role, count]) => (
                <div key={role} className="text-center">
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <Badge className={getRoleBadgeColor(role as User['role']) + ' mt-1'}>
                    {role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                    placeholder="Search users by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="coach">Coach</option>
                  <option value="parent">Parent</option>
                  <option value="player">Player</option>
                  <option value="referee">Referee</option>
                  <option value="scorekeeper">Scorekeeper</option>
                  <option value="spectator">Spectator</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRoleManagerOpen(true)}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Manage Roles
                </Button>
                
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
                  Add User
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between">
                <span className="text-yellow-400 text-sm">
                  {selectedUsers.length} user(s) selected
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
                    onClick={() => handleBulkAction('deactivate')}
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    Deactivate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('change_role')}
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    Change Role
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('reset_password')}
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    Reset Password
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

        {/* User Table */}
        <UserTable
          users={filteredUsers}
          selectedUsers={selectedUsers}
          onSelectionChange={setSelectedUsers}
          onUserEdit={(id) => console.log('Edit user', id)}
          onUserDelete={(id) => console.log('Delete user', id)}
          getRoleBadgeColor={getRoleBadgeColor}
        />

        {/* Role Manager Modal */}
        {isRoleManagerOpen && (
          <RoleManager
            isOpen={isRoleManagerOpen}
            onClose={() => setIsRoleManagerOpen(false)}
          />
        )}
      </div>
    </ModernAdminLayout>
  );
}