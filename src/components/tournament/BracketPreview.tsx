'use client';

import React, { useState, useCallback } from 'react';
import { BracketStructure, Tournament, Match, DEFAULT_TOURNAMENT_THEME } from '@/lib/tournament/types';
import { Card } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Maximize2,
  Trophy,
  Users,
  Calendar
} from 'lucide-react';

interface BracketPreviewProps {
  bracket: BracketStructure;
  tournament: Tournament;
  onMatchClick?: (match: Match) => void;
  showControls?: boolean;
  className?: string;
}

export function BracketPreview({
  bracket,
  tournament,
  onMatchClick,
  showControls = true,
  className = '',
}: BracketPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const handleZoom = useCallback((delta: number) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, []);

  const resetView = useCallback(() => {
    setZoomLevel(1);
    setSelectedRound(null);
  }, []);

  const getRoundName = (roundNumber: number) => {
    const totalRounds = bracket.totalRounds;
    const fromEnd = totalRounds - roundNumber + 1;
    
    switch (fromEnd) {
      case 1: return 'Finals';
      case 2: return 'Semifinals';
      case 3: return 'Quarterfinals';
      case 4: return 'Round of 16';
      case 5: return 'Round of 32';
      default: return `Round ${roundNumber}`;
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'bye': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(0.2)}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(-0.2)}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              {(zoomLevel * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="w-4 h-4 mr-1" />
              Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* Tournament Info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Tournament</p>
              <p className="font-semibold">{tournament.name}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Teams</p>
              <p className="font-semibold">{tournament.teams.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Matches</p>
              <p className="font-semibold">{bracket.totalMatches}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Round Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={selectedRound === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedRound(null)}
        >
          All Rounds
        </Button>
        {bracket.rounds.map((round) => (
          <Button
            key={round.roundNumber}
            variant={selectedRound === round.roundNumber ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedRound(round.roundNumber)}
          >
            {getRoundName(round.roundNumber)}
          </Button>
        ))}
      </div>

      {/* Bracket Display */}
      <div 
        className="border rounded-lg overflow-auto"
        style={{ 
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          maxHeight: '600px'
        }}
      >
        <div className="flex gap-8 p-6 min-w-max">
          {bracket.rounds
            .filter(round => selectedRound === null || round.roundNumber === selectedRound)
            .map((round) => (
              <div key={round.roundNumber} className="flex flex-col gap-4 min-w-[200px]">
                {/* Round Header */}
                <div className="text-center">
                  <h3 className="font-semibold text-lg">
                    {getRoundName(round.roundNumber)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {round.matches.length} match{round.matches.length !== 1 ? 'es' : ''}
                  </p>
                </div>

                {/* Matches */}
                <div className="space-y-4">
                  {round.matches.map((match, index) => (
                    <PreviewMatchCard
                      key={match.id}
                      match={match}
                      onClick={() => onMatchClick?.(match)}
                      position={index + 1}
                    />
                  ))}
                </div>

                {/* Round Connector (for non-final rounds) */}
                {round.roundNumber < bracket.totalRounds && selectedRound === null && (
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-gray-300"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full mx-1"></div>
                    <div className="w-8 h-0.5 bg-gray-300"></div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-3">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-xl font-bold text-green-600">
            {bracket.rounds.reduce((sum, round) => 
              sum + round.matches.filter(m => m.status === 'completed').length, 0
            )}
          </p>
        </Card>
        
        <Card className="p-3">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-xl font-bold text-blue-600">
            {bracket.rounds.reduce((sum, round) => 
              sum + round.matches.filter(m => m.status === 'in_progress').length, 0
            )}
          </p>
        </Card>
        
        <Card className="p-3">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-xl font-bold text-gray-600">
            {bracket.rounds.reduce((sum, round) => 
              sum + round.matches.filter(m => m.status === 'pending').length, 0
            )}
          </p>
        </Card>
        
        <Card className="p-3">
          <p className="text-sm text-gray-600">Rounds</p>
          <p className="text-xl font-bold">{bracket.totalRounds}</p>
        </Card>
      </div>
    </div>
  );
}

// Preview Match Card Component
interface PreviewMatchCardProps {
  match: Match;
  onClick?: () => void;
  position: number;
}

function PreviewMatchCard({ match, onClick, position }: PreviewMatchCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'bye': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (match.status === 'bye') {
    return (
      <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <div className="text-center">
          <Badge className={getStatusColor(match.status)}>
            BYE
          </Badge>
          <p className="text-sm mt-2">
            {match.team1?.name || match.team2?.name} advances
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="space-y-2">
        {/* Match Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Match {position}</span>
          <Badge variant="outline" className={getStatusColor(match.status)}>
            {match.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Team 1 */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            {match.team1?.seed && (
              <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
                {match.team1.seed}
              </Badge>
            )}
            <span className={`text-sm font-medium ${
              match.winner?.id === match.team1?.id ? 'text-green-600' : ''
            }`}>
              {match.team1?.name || 'TBD'}
            </span>
          </div>
          <span className={`font-bold ${
            match.winner?.id === match.team1?.id ? 'text-green-600' : ''
          }`}>
            {match.score?.team1Score ?? '-'}
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            {match.team2?.seed && (
              <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
                {match.team2.seed}
              </Badge>
            )}
            <span className={`text-sm font-medium ${
              match.winner?.id === match.team2?.id ? 'text-green-600' : ''
            }`}>
              {match.team2?.name || 'TBD'}
            </span>
          </div>
          <span className={`font-bold ${
            match.winner?.id === match.team2?.id ? 'text-green-600' : ''
          }`}>
            {match.score?.team2Score ?? '-'}
          </span>
        </div>

        {/* Winner Indicator */}
        {match.winner && (
          <div className="text-center">
            <Badge variant="outline" className="text-green-600">
              <Trophy className="w-3 h-3 mr-1" />
              {match.winner.name} wins
            </Badge>
          </div>
        )}

        {/* Schedule Info */}
        {(match.scheduledTime || match.court) && (
          <div className="text-xs text-gray-600 text-center">
            {match.scheduledTime && (
              <span>{new Date(match.scheduledTime).toLocaleDateString()}</span>
            )}
            {match.court && (
              <span className="ml-2">Court {match.court}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}