'use client';

import React, { useState } from 'react';
import { Match, Team } from '@/lib/tournament/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  MapPin, 
  Play, 
  Pause, 
  Trophy, 
  Edit3, 
  Save, 
  X,
  Calendar,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

interface MatchCardProps {
  match: Match;
  onUpdateScore?: (matchId: string, team1Score: number, team2Score: number) => void;
  onAdvanceTeam?: (matchId: string, winner: Team, loser: Team) => void;
  onScheduleChange?: (matchId: string, scheduledTime: Date, court: string) => void;
  showControls?: boolean;
  compact?: boolean;
  className?: string;
}

export function MatchCard({
  match,
  onUpdateScore,
  onAdvanceTeam,
  onScheduleChange,
  showControls = false,
  compact = false,
  className = '',
}: MatchCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingScore, setEditingScore] = useState({
    team1Score: match.score?.team1Score || 0,
    team2Score: match.score?.team2Score || 0,
  });
  const [editingSchedule, setEditingSchedule] = useState({
    time: match.scheduledTime ? format(match.scheduledTime, "yyyy-MM-dd'T'HH:mm") : '',
    court: match.court || '',
  });

  const getStatusColor = () => {
    switch (match.status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'bye': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (match.status) {
      case 'completed': return <Trophy className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'bye': return <Users className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleSaveScore = () => {
    if (!match.team1 || !match.team2) return;

    onUpdateScore?.(match.id, editingScore.team1Score, editingScore.team2Score);
    
    // Determine winner and advance
    if (editingScore.team1Score !== editingScore.team2Score) {
      const winner = editingScore.team1Score > editingScore.team2Score ? match.team1 : match.team2;
      const loser = editingScore.team1Score > editingScore.team2Score ? match.team2 : match.team1;
      onAdvanceTeam?.(match.id, winner, loser);
    }
    
    setIsEditing(false);
  };

  const handleSaveSchedule = () => {
    if (editingSchedule.time) {
      const scheduledTime = new Date(editingSchedule.time);
      onScheduleChange?.(match.id, scheduledTime, editingSchedule.court);
    }
    setIsEditing(false);
  };

  const getRoundName = () => {
    if (match.isFinals) return 'Finals';
    if (match.isThirdPlace) return '3rd Place';
    if (match.isConsolation) return `Consolation R${match.roundNumber}`;
    
    // Standard round names based on position
    const roundNames: Record<number, string> = {
      1: 'First Round',
      2: 'Second Round',
      3: 'Quarterfinals',
      4: 'Semifinals',
      5: 'Finals',
    };
    
    return roundNames[match.roundNumber] || `Round ${match.roundNumber}`;
  };

  if (match.status === 'bye') {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center text-center">
          <div>
            <Badge className={getStatusColor()}>
              <Users className="w-4 h-4 mr-1" />
              BYE
            </Badge>
            <p className="text-sm text-gray-600 mt-2">
              {match.team1?.name || match.team2?.name} advances automatically
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={`p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className={match.winner?.id === match.team1?.id ? 'font-bold' : ''}>
                {match.team1?.name || 'TBD'}
              </span>
              <span className="text-gray-400">vs</span>
              <span className={match.winner?.id === match.team2?.id ? 'font-bold' : ''}>
                {match.team2?.name || 'TBD'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {match.score && (
              <span className="text-sm font-mono">
                {match.score.team1Score}-{match.score.team2Score}
              </span>
            )}
            <Badge variant="outline" className={getStatusColor()}>
              {match.status}
            </Badge>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusIcon()}
            {match.status.replace('_', ' ')}
          </Badge>
          <span className="text-sm text-gray-600">{getRoundName()}</span>
          {match.bracketPosition && (
            <span className="text-xs text-gray-400">#{match.bracketPosition}</span>
          )}
        </div>
        
        {showControls && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>

      {/* Teams and Scores */}
      <div className="space-y-3">
        {/* Team 1 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {match.team1?.seed && (
              <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                {match.team1.seed}
              </Badge>
            )}
            <div>
              <h4 className={`font-medium ${match.winner?.id === match.team1?.id ? 'text-green-600' : ''}`}>
                {match.team1?.name || 'TBD'}
              </h4>
              {match.team1?.record && (
                <p className="text-xs text-gray-600">
                  {match.team1.record.wins}-{match.team1.record.losses}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {isEditing && match.team1 && match.team2 ? (
              <Input
                type="number"
                min="0"
                value={editingScore.team1Score}
                onChange={(e) => setEditingScore(prev => ({ ...prev, team1Score: parseInt(e.target.value) || 0 }))}
                className="w-16 text-center"
              />
            ) : (
              <span className={`text-2xl font-bold ${match.winner?.id === match.team1?.id ? 'text-green-600' : ''}`}>
                {match.score?.team1Score ?? '-'}
              </span>
            )}
          </div>
        </div>

        {/* VS Divider */}
        <div className="text-center text-gray-400 font-medium">VS</div>

        {/* Team 2 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {match.team2?.seed && (
              <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                {match.team2.seed}
              </Badge>
            )}
            <div>
              <h4 className={`font-medium ${match.winner?.id === match.team2?.id ? 'text-green-600' : ''}`}>
                {match.team2?.name || 'TBD'}
              </h4>
              {match.team2?.record && (
                <p className="text-xs text-gray-600">
                  {match.team2.record.wins}-{match.team2.record.losses}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {isEditing && match.team1 && match.team2 ? (
              <Input
                type="number"
                min="0"
                value={editingScore.team2Score}
                onChange={(e) => setEditingScore(prev => ({ ...prev, team2Score: parseInt(e.target.value) || 0 }))}
                className="w-16 text-center"
              />
            ) : (
              <span className={`text-2xl font-bold ${match.winner?.id === match.team2?.id ? 'text-green-600' : ''}`}>
                {match.score?.team2Score ?? '-'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Information */}
      {(match.scheduledTime || match.court) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {match.scheduledTime && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {isEditing ? (
                  <Input
                    type="datetime-local"
                    value={editingSchedule.time}
                    onChange={(e) => setEditingSchedule(prev => ({ ...prev, time: e.target.value }))}
                    className="h-6 text-xs"
                  />
                ) : (
                  <span>{format(match.scheduledTime, 'MMM d, h:mm a')}</span>
                )}
              </div>
            )}
            
            {match.court && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {isEditing ? (
                  <Input
                    value={editingSchedule.court}
                    onChange={(e) => setEditingSchedule(prev => ({ ...prev, court: e.target.value }))}
                    placeholder="Court"
                    className="h-6 text-xs w-20"
                  />
                ) : (
                  <span>Court {match.court}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isEditing && showControls && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            {match.team1 && match.team2 && (
              <Button
                size="sm"
                onClick={handleSaveScore}
                disabled={editingScore.team1Score === editingScore.team2Score}
              >
                <Save className="w-4 h-4 mr-1" />
                Save Score
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSchedule}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Save Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Winner Indicator */}
      {match.winner && match.status === 'completed' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Trophy className="w-5 h-5" />
            <span className="font-medium">{match.winner.name} wins!</span>
          </div>
        </div>
      )}
    </Card>
  );
}