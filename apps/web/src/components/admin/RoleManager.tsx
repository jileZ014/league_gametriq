'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  X, 
  Shield, 
  Plus, 
  Edit2, 
  Trash2,
  Save,
  Users,
  Lock,
  Unlock,
  ChevronRight
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  color: string;
}

interface RoleManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleManager({ isOpen, onClose }: RoleManagerProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchPermission, setSearchPermission] = useState('');

  // Mock data
  const [roles] = useState<Role[]>([
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: ['all'],
      userCount: 12,
      isSystem: true,
      color: 'red'
    },
    {
      id: 'coordinator',
      name: 'League Coordinator',
      description: 'Manages leagues, teams, and schedules',
      permissions: ['manage_leagues', 'manage_teams', 'manage_schedules', 'view_reports'],
      userCount: 45,
      isSystem: true,
      color: 'purple'
    },
    {
      id: 'coach',
      name: 'Coach',
      description: 'Manages team roster and views game information',
      permissions: ['manage_roster', 'view_schedule', 'view_scores', 'submit_lineup'],
      userCount: 892,
      isSystem: true,
      color: 'blue'
    },
    {
      id: 'referee',
      name: 'Referee',
      description: 'Submits game reports and manages game flow',
      permissions: ['submit_reports', 'manage_game', 'view_assignments'],
      userCount: 156,
      isSystem: true,
      color: 'orange'
    },
    {
      id: 'scorekeeper',
      name: 'Scorekeeper',
      description: 'Records live scores and game statistics',
      permissions: ['record_scores', 'manage_stats', 'view_games'],
      userCount: 234,
      isSystem: true,
      color: 'pink'
    },
    {
      id: 'parent',
      name: 'Parent',
      description: 'Views child information and team schedules',
      permissions: ['view_child_info', 'view_schedule', 'view_scores'],
      userCount: 6234,
      isSystem: false,
      color: 'green'
    },
    {
      id: 'player',
      name: 'Player',
      description: 'Views personal stats and team information',
      permissions: ['view_stats', 'view_schedule', 'view_team'],
      userCount: 7892,
      isSystem: false,
      color: 'yellow'
    },
    {
      id: 'spectator',
      name: 'Spectator',
      description: 'Public viewing access',
      permissions: ['view_public'],
      userCount: 377,
      isSystem: false,
      color: 'gray'
    }
  ]);

  const [permissions] = useState<Permission[]>([
    // League Management
    { id: 'manage_leagues', name: 'Manage Leagues', description: 'Create, edit, and delete leagues', category: 'League Management' },
    { id: 'manage_teams', name: 'Manage Teams', description: 'Create, edit, and delete teams', category: 'League Management' },
    { id: 'manage_schedules', name: 'Manage Schedules', description: 'Create and modify game schedules', category: 'League Management' },
    
    // Game Management
    { id: 'manage_game', name: 'Manage Game', description: 'Control game flow and timing', category: 'Game Management' },
    { id: 'record_scores', name: 'Record Scores', description: 'Enter and update live scores', category: 'Game Management' },
    { id: 'manage_stats', name: 'Manage Statistics', description: 'Record player and team statistics', category: 'Game Management' },
    { id: 'submit_reports', name: 'Submit Reports', description: 'Submit official game reports', category: 'Game Management' },
    
    // Team Management
    { id: 'manage_roster', name: 'Manage Roster', description: 'Add and remove players from roster', category: 'Team Management' },
    { id: 'submit_lineup', name: 'Submit Lineup', description: 'Submit game lineups', category: 'Team Management' },
    
    // Viewing Permissions
    { id: 'view_reports', name: 'View Reports', description: 'Access analytics and reports', category: 'Viewing' },
    { id: 'view_schedule', name: 'View Schedule', description: 'View game schedules', category: 'Viewing' },
    { id: 'view_scores', name: 'View Scores', description: 'View game scores', category: 'Viewing' },
    { id: 'view_stats', name: 'View Statistics', description: 'View player and team statistics', category: 'Viewing' },
    { id: 'view_assignments', name: 'View Assignments', description: 'View referee assignments', category: 'Viewing' },
    { id: 'view_team', name: 'View Team', description: 'View team information', category: 'Viewing' },
    { id: 'view_child_info', name: 'View Child Info', description: 'View child player information', category: 'Viewing' },
    { id: 'view_public', name: 'View Public', description: 'Public viewing access', category: 'Viewing' },
    
    // System
    { id: 'all', name: 'All Permissions', description: 'Complete system access', category: 'System' }
  ]);

  const getRoleColor = (color: string) => {
    const colors: Record<string, string> = {
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[color] || colors.gray;
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredPermissions = searchPermission
    ? permissions.filter(p => 
        p.name.toLowerCase().includes(searchPermission.toLowerCase()) ||
        p.description.toLowerCase().includes(searchPermission.toLowerCase())
      )
    : permissions;

  const handlePermissionToggle = (permissionId: string) => {
    if (!editingRole) return;
    
    const newPermissions = editingRole.permissions.includes(permissionId)
      ? editingRole.permissions.filter(p => p !== permissionId)
      : [...editingRole.permissions, permissionId];
    
    setEditingRole({
      ...editingRole,
      permissions: newPermissions
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-orange-400" />
              <CardTitle className="text-white">Role & Permission Manager</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex h-[calc(90vh-80px)]">
          {/* Roles List */}
          <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
            <div className="p-4 border-b border-gray-700">
              <Button
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Role
              </Button>
            </div>
            
            <div className="p-4 space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => {
                    setSelectedRole(role);
                    setEditingRole(null);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedRole?.id === role.id
                      ? 'bg-gray-700/50 border-orange-500'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleColor(role.color)}>
                        {role.name}
                      </Badge>
                      {role.isSystem && (
                        <Lock className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                      selectedRole?.id === role.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{role.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {role.permissions.length} permissions
                    </span>
                    <span className="text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {role.userCount.toLocaleString()} users
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role Details & Permissions */}
          <div className="flex-1 overflow-y-auto">
            {selectedRole ? (
              <div className="p-6">
                {/* Role Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {editingRole ? (
                          <Input
                            value={editingRole.name}
                            onChange={(e) => setEditingRole({...editingRole, name: e.target.value})}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        ) : (
                          selectedRole.name
                        )}
                      </h3>
                      <p className="text-gray-400">
                        {editingRole ? (
                          <Input
                            value={editingRole.description}
                            onChange={(e) => setEditingRole({...editingRole, description: e.target.value})}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        ) : (
                          selectedRole.description
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {editingRole ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRole(null)}
                            className="border-gray-600 text-gray-300"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRole(selectedRole)}
                            className="border-gray-600 text-gray-300"
                            disabled={selectedRole.isSystem}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Role
                          </Button>
                          {!selectedRole.isSystem && (
                            <Button
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Role
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Role Stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-400">Users with this role</p>
                      <p className="text-2xl font-bold text-white">{selectedRole.userCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total permissions</p>
                      <p className="text-2xl font-bold text-white">
                        {selectedRole.permissions.includes('all') ? 'All' : selectedRole.permissions.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Role type</p>
                      <p className="text-lg font-semibold text-white">
                        {selectedRole.isSystem ? (
                          <span className="flex items-center gap-1">
                            <Lock className="w-4 h-4" />
                            System
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Unlock className="w-4 h-4" />
                            Custom
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Permissions</h4>
                    {editingRole && (
                      <Input
                        type="text"
                        placeholder="Search permissions..."
                        value={searchPermission}
                        onChange={(e) => setSearchPermission(e.target.value)}
                        className="w-64 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      />
                    )}
                  </div>

                  {editingRole ? (
                    // Edit Mode - Show all permissions grouped
                    <div className="space-y-6">
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category}>
                          <h5 className="text-sm font-semibold text-gray-400 mb-3">{category}</h5>
                          <div className="space-y-2">
                            {perms
                              .filter(p => filteredPermissions.includes(p))
                              .map((permission) => (
                                <div
                                  key={permission.id}
                                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={editingRole.permissions.includes(permission.id)}
                                      onCheckedChange={() => handlePermissionToggle(permission.id)}
                                      className="border-gray-600"
                                    />
                                    <div>
                                      <p className="text-white font-medium">{permission.name}</p>
                                      <p className="text-xs text-gray-400">{permission.description}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // View Mode - Show only assigned permissions
                    <div className="grid grid-cols-2 gap-3">
                      {selectedRole.permissions.includes('all') ? (
                        <div className="col-span-2 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-red-400" />
                            <span className="text-white font-semibold">Full System Access</span>
                          </div>
                          <p className="text-sm text-gray-300 mt-2">
                            This role has all permissions and can perform any action in the system.
                          </p>
                        </div>
                      ) : (
                        permissions
                          .filter(p => selectedRole.permissions.includes(p.id))
                          .map((permission) => (
                            <div
                              key={permission.id}
                              className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg"
                            >
                              <p className="text-white font-medium text-sm">{permission.name}</p>
                              <p className="text-xs text-gray-400 mt-1">{permission.description}</p>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Select a role to view details</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}