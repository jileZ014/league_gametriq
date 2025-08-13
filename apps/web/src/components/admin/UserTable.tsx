'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Mail,
  Phone,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ShieldCheck,
  ShieldOff
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

interface UserTableProps {
  users: User[];
  selectedUsers: string[];
  onSelectionChange: (selected: string[]) => void;
  onUserEdit: (id: string) => void;
  onUserDelete: (id: string) => void;
  getRoleBadgeColor: (role: User['role']) => string;
}

export function UserTable({
  users,
  selectedUsers,
  onSelectionChange,
  onUserEdit,
  onUserDelete,
  getRoleBadgeColor
}: UserTableProps) {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof User>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * direction;
    }
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return (Number(aValue) - Number(bValue)) * direction;
    }
    if (aValue instanceof Date && bValue instanceof Date) {
      return (aValue.getTime() - bValue.getTime()) * direction;
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
    if (selectedUsers.length === users.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(users.map(u => u.id));
    }
  };

  const handleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      onSelectionChange(selectedUsers.filter(userId => userId !== id));
    } else {
      onSelectionChange([...selectedUsers, id]);
    }
  };

  const getStatusBadge = (status: User['status']) => {
    const variants = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      suspended: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    
    return (
      <Badge className={variants[status]}>
        {status === 'active' && <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTimeSinceLogin = (lastLogin: string) => {
    const now = new Date();
    const login = new Date(lastLogin);
    const diff = now.getTime() - login.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recently';
  };

  const SortIcon = ({ field }: { field: keyof User }) => {
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
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="border-gray-600"
                />
              </th>
              <th className="p-4 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">User</span>
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="p-4 text-left">
                <button
                  onClick={() => handleSort('role')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Role</span>
                  <SortIcon field="role" />
                </button>
              </th>
              <th className="p-4 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</span>
              </th>
              <th className="p-4 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Leagues</span>
              </th>
              <th className="p-4 text-left">
                <button
                  onClick={() => handleSort('lastLogin')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Last Login</span>
                  <SortIcon field="lastLogin" />
                </button>
              </th>
              <th className="p-4 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Security</span>
              </th>
              <th className="p-4 text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <React.Fragment key={user.id}>
                <tr 
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleSelectUser(user.id)}
                      className="border-gray-600"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-black font-bold text-sm">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <button
                          onClick={() => toggleRowExpansion(user.id)}
                          className="text-white font-medium hover:text-orange-400 transition-colors text-left"
                        >
                          {user.name}
                        </button>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="p-4">
                    <div className="text-gray-300">
                      {user.leagues.length > 0 ? (
                        <div>
                          <div className="text-sm">{user.leagues[0]}</div>
                          {user.leagues.length > 1 && (
                            <div className="text-xs text-gray-500">+{user.leagues.length - 1} more</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">No leagues</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{getTimeSinceLogin(user.lastLogin)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {user.verified && (
                        <div className="group relative">
                          <UserCheck className="w-4 h-4 text-green-400" />
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Email Verified
                          </span>
                        </div>
                      )}
                      {user.twoFactorEnabled ? (
                        <div className="group relative">
                          <ShieldCheck className="w-4 h-4 text-blue-400" />
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            2FA Enabled
                          </span>
                        </div>
                      ) : (
                        <div className="group relative">
                          <ShieldOff className="w-4 h-4 text-gray-500" />
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            2FA Disabled
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleRowExpansion(user.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onUserEdit(user.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onUserDelete(user.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row Details */}
                {expandedRows.includes(user.id) && (
                  <tr className="bg-gray-800/20">
                    <td colSpan={8} className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Contact Information */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Contact Information</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <a href={`mailto:${user.email}`} className="hover:text-orange-400">
                                {user.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span>{user.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Associations */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Associations</h4>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Leagues:</p>
                              <div className="flex flex-wrap gap-1">
                                {user.leagues.map((league, index) => (
                                  <Badge key={index} className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                    {league}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Teams:</p>
                              <div className="flex flex-wrap gap-1">
                                {user.teams.map((team, index) => (
                                  <Badge key={index} className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                    {team}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Permissions & Security */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Permissions & Security</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-300">
                                {user.permissions.includes('all') ? 'Full Access' : 'Limited Access'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              <p>Created: {new Date(user.created).toLocaleDateString()}</p>
                              <p>Last Login: {new Date(user.lastLogin).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-6 pt-6 border-t border-gray-700 flex gap-2">
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          Send Email
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          Reset Password
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          View Activity Log
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          Manage Permissions
                        </Button>
                        {user.status === 'suspended' ? (
                          <Button size="sm" variant="outline" className="border-green-600 text-green-400">
                            Reactivate Account
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-400">
                            Suspend Account
                          </Button>
                        )}
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
          Showing {Math.min(50, sortedUsers.length)} of {sortedUsers.length} users
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" disabled>
            Previous
          </Button>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="border-gray-600 text-white bg-gray-700">
              1
            </Button>
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
              2
            </Button>
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
              3
            </Button>
            <span className="px-2 py-1 text-gray-500">...</span>
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
              10
            </Button>
          </div>
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}