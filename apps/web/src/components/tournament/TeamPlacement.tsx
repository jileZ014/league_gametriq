'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Team } from '@/lib/tournament/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trophy, TrendingUp, Users } from 'lucide-react';

interface TeamPlacementProps {
  team: Team;
  isDragging?: boolean;
  showSeed?: boolean;
  showStats?: boolean;
  style?: React.CSSProperties;
  onRemove?: () => void;
}

export function TeamPlacement({
  team,
  isDragging = false,
  showSeed = false,
  showStats = true,
  style,
  onRemove,
}: TeamPlacementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: team.id,
  });

  const transformStyle = CSS.Transform.toString(transform);
  
  const calculateWinPercentage = () => {
    if (!team.record) return 0;
    const totalGames = team.record.wins + team.record.losses + (team.record.ties || 0);
    if (totalGames === 0) return 0;
    return ((team.record.wins + (team.record.ties || 0) * 0.5) / totalGames * 100).toFixed(1);
  };

  const getRegionColor = (regionId?: string) => {
    const colors: Record<string, string> = {
      north: 'bg-blue-100 text-blue-800',
      south: 'bg-green-100 text-green-800',
      east: 'bg-yellow-100 text-yellow-800',
      west: 'bg-purple-100 text-purple-800',
      central: 'bg-red-100 text-red-800',
    };
    return colors[regionId || 'default'] || 'bg-gray-100 text-gray-800';
  };

  const getPowerRatingColor = (rating?: number) => {
    if (!rating) return 'text-gray-500';
    if (rating >= 90) return 'text-green-600';
    if (rating >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: transformStyle,
        transition,
        opacity: isDragging || isSortableDragging ? 0.5 : 1,
        ...style,
      }}
      className={`p-3 cursor-move hover:shadow-md transition-all ${
        isDragging || isSortableDragging ? 'shadow-lg scale-105' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div className="flex-shrink-0 text-gray-400">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Seed Number */}
        {showSeed && team.seed && (
          <div className="flex-shrink-0">
            <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
              {team.seed}
            </Badge>
          </div>
        )}

        {/* Team Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{team.name}</h4>
            {team.regionId && (
              <Badge variant="secondary" className={`text-xs ${getRegionColor(team.regionId)}`}>
                {team.regionId.charAt(0).toUpperCase() + team.regionId.slice(1)}
              </Badge>
            )}
          </div>

          {showStats && (
            <div className="flex items-center gap-4 text-xs text-gray-600">
              {/* Record */}
              {team.record && (
                <div className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  <span>
                    {team.record.wins}-{team.record.losses}
                    {team.record.ties ? `-${team.record.ties}` : ''}
                  </span>
                  <span className="text-gray-400">({calculateWinPercentage()}%)</span>
                </div>
              )}

              {/* Power Rating */}
              {team.powerRating && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span className={getPowerRatingColor(team.powerRating)}>
                    {team.powerRating}
                  </span>
                </div>
              )}

              {/* Division */}
              {team.divisionId && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{team.divisionId}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </Card>
  );
}