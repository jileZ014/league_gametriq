'use client';

import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

// Types
export interface PlayerStats {
  id: string;
  number: string;
  name: string;
  position: string;
  isStarter: boolean;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plusMinus: number;
  fg: { made: number; attempted: number; };
  threePt: { made: number; attempted: number; };
  ft: { made: number; attempted: number; };
}

export interface TeamTotals {
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fg: { made: number; attempted: number; };
  threePt: { made: number; attempted: number; };
  ft: { made: number; attempted: number; };
}

export interface ColumnConfig {
  key: keyof PlayerStats | 'name';
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  format?: (value: any, player?: PlayerStats) => string;
  abbr?: string;
}

export interface BoxScoreTableProps {
  // Required
  teamName: string;
  players: PlayerStats[];
  teamTotals: TeamTotals;
  
  // Optional
  teamLogo?: string;
  teamColor?: string;
  variant?: 'compact' | 'standard' | 'expanded';
  density?: 'compact' | 'comfortable' | 'spacious';
  columns?: ColumnConfig[];
  sortable?: boolean;
  selectable?: boolean;
  showBench?: boolean;
  highlightPlayer?: string;
  onPlayerClick?: (player: PlayerStats) => void;
  className?: string;
}

// Default columns configuration
const defaultColumns: ColumnConfig[] = [
  { key: 'name', label: 'PLAYER', align: 'left', sortable: true },
  { key: 'minutes', label: 'MIN', align: 'center', sortable: true, format: (v) => Math.floor(v).toString() },
  { key: 'points', label: 'PTS', align: 'center', sortable: true },
  { key: 'rebounds', label: 'REB', align: 'center', sortable: true },
  { key: 'assists', label: 'AST', align: 'center', sortable: true },
  { key: 'plusMinus', label: '+/-', align: 'center', sortable: true, format: (v) => v > 0 ? `+${v}` : v.toString() },
];

const expandedColumns: ColumnConfig[] = [
  ...defaultColumns,
  { key: 'steals', label: 'STL', align: 'center', sortable: true },
  { key: 'blocks', label: 'BLK', align: 'center', sortable: true },
  { key: 'turnovers', label: 'TO', align: 'center', sortable: true },
  { key: 'fouls', label: 'PF', align: 'center', sortable: true },
];

const compactColumns: ColumnConfig[] = [
  { key: 'name', label: 'PLAYER', align: 'left' },
  { key: 'points', label: 'PTS', align: 'center' },
  { key: 'rebounds', label: 'REB', align: 'center' },
  { key: 'assists', label: 'AST', align: 'center' },
];

// Sort indicator component
const SortIndicator = memo(({ direction }: { direction: 'asc' | 'desc' | null }) => {
  if (!direction) return null;
  
  return (
    <span className="ml-1 inline-flex">
      {direction === 'asc' ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )}
    </span>
  );
});
SortIndicator.displayName = 'SortIndicator';

// Player row component
const PlayerRow = memo(({
  player,
  columns,
  density,
  isHighlighted,
  teamColor,
  onClick,
  isLeader
}: {
  player: PlayerStats;
  columns: ColumnConfig[];
  density?: string;
  isHighlighted?: boolean;
  teamColor?: string;
  onClick?: () => void;
  isLeader?: boolean;
}) => {
  const rowHeight = density === 'compact' ? 'h-8' : density === 'spacious' ? 'h-16' : 'h-12';
  const fontSize = density === 'compact' ? 'text-xs' : density === 'spacious' ? 'text-base' : 'text-sm';
  
  return (
    <motion.tr
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
      className={cn(
        "border-b border-border/50 transition-all cursor-pointer",
        "hover:bg-accent/5",
        rowHeight,
        fontSize,
        isHighlighted && "bg-primary/10 animate-pulse",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role="row"
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Jersey Number */}
      <td className="px-2 text-center font-mono text-muted-foreground">
        {player.number}
      </td>
      
      {columns.map((col) => {
        const value = col.key === 'name' ? (
          <div>
            <div className="font-semibold flex items-center gap-2">
              {player.name}
              {isLeader && col.key === 'name' && (
                <Trophy className="w-3 h-3 text-yellow-500" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {player.position} {player.isStarter && '• Starter'}
            </div>
          </div>
        ) : col.format ? 
          col.format(player[col.key as keyof PlayerStats], player) : 
          player[col.key as keyof PlayerStats]?.toString();
        
        const cellAlign = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left';
        const isPoints = col.key === 'points';
        const highScore = isPoints && Number(player.points) >= 20;
        
        return (
          <td
            key={col.key}
            className={cn(
              "px-2",
              cellAlign,
              col.key === 'name' && "sticky left-0 bg-background z-10",
              highScore && "font-bold text-success",
              typeof value === 'number' && value < 0 && "text-error"
            )}
            style={{
              color: highScore && teamColor ? teamColor : undefined
            }}
          >
            {value}
          </td>
        );
      })}
    </motion.tr>
  );
});
PlayerRow.displayName = 'PlayerRow';

// Main BoxScoreTable component
export const BoxScoreTable = memo(({
  teamName,
  players,
  teamTotals,
  teamLogo,
  teamColor,
  variant = 'standard',
  density = 'comfortable',
  columns,
  sortable = true,
  selectable = false,
  showBench = true,
  highlightPlayer,
  onPlayerClick,
  className
}: BoxScoreTableProps) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Select columns based on variant
  const activeColumns = useMemo(() => {
    if (columns) return columns;
    if (variant === 'compact') return compactColumns;
    if (variant === 'expanded') return expandedColumns;
    return defaultColumns;
  }, [columns, variant]);
  
  // Sort players
  const sortedPlayers = useMemo(() => {
    if (!sortColumn) {
      // Default sort: starters first, then by minutes
      return [...players].sort((a, b) => {
        if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
        return b.minutes - a.minutes;
      });
    }
    
    return [...players].sort((a, b) => {
      const aVal = a[sortColumn as keyof PlayerStats];
      const bVal = b[sortColumn as keyof PlayerStats];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [players, sortColumn, sortDirection]);
  
  // Get leader for points
  const pointsLeader = useMemo(() => {
    return players.reduce((leader, player) => 
      player.points > (leader?.points || 0) ? player : leader
    , null as PlayerStats | null);
  }, [players]);
  
  // Handle column sort
  const handleSort = useCallback((columnKey: string) => {
    if (!sortable) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('desc');
    }
  }, [sortColumn, sortable]);
  
  // Separate starters and bench
  const starters = sortedPlayers.filter(p => p.isStarter);
  const bench = sortedPlayers.filter(p => !p.isStarter);
  
  return (
    <div
      ref={tableRef}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-background/95 backdrop-blur-sm",
        className
      )}
      role="table"
      aria-label={`Box score statistics for ${teamName}`}
    >
      {/* Team Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-3">
          {teamLogo && (
            <img 
              src={teamLogo} 
              alt={`${teamName} logo`}
              className="w-8 h-8 object-contain"
            />
          )}
          <h3 className="text-lg font-bold" style={{ color: teamColor }}>
            {teamName}
          </h3>
        </div>
        <div className="text-2xl font-mono font-bold">
          {teamTotals.points}
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">
            Team statistics for {teamName} showing {players.length} players
          </caption>
          
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider">
                ##
              </th>
              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-2 py-2 text-xs font-bold uppercase tracking-wider",
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                    col.key === 'name' && "sticky left-0 bg-muted/30 z-10",
                    col.sortable && sortable && "cursor-pointer hover:bg-muted/50 transition-colors"
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                  role="columnheader"
                  aria-sort={
                    sortColumn === col.key
                      ? sortDirection === 'asc' ? 'ascending' : 'descending'
                      : 'none'
                  }
                >
                  <div className="flex items-center justify-center">
                    <abbr title={col.label} className="no-underline">
                      {col.abbr || col.label}
                    </abbr>
                    {col.sortable && sortable && (
                      <SortIndicator 
                        direction={sortColumn === col.key ? sortDirection : null} 
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* Starters */}
            {starters.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                columns={activeColumns}
                density={density}
                isHighlighted={highlightPlayer === player.id}
                teamColor={teamColor}
                onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
                isLeader={pointsLeader?.id === player.id}
              />
            ))}
            
            {/* Bench separator */}
            {showBench && bench.length > 0 && (
              <tr className="bg-muted/20">
                <td colSpan={activeColumns.length + 1} className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bench
                </td>
              </tr>
            )}
            
            {/* Bench players */}
            {showBench && bench.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                columns={activeColumns}
                density={density}
                isHighlighted={highlightPlayer === player.id}
                teamColor={teamColor}
                onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
                isLeader={pointsLeader?.id === player.id}
              />
            ))}
          </tbody>
          
          {/* Totals footer */}
          <tfoot className="border-t-2 bg-muted/50 font-bold">
            <tr>
              <td className="px-2 py-2"></td>
              {activeColumns.map((col) => {
                let value = '';
                
                if (col.key === 'name') {
                  value = 'TOTALS';
                } else if (col.key === 'minutes') {
                  value = teamTotals.minutes.toString();
                } else if (col.key in teamTotals) {
                  const total = teamTotals[col.key as keyof TeamTotals];
                  value = col.format ? col.format(total) : total?.toString() || '';
                }
                
                return (
                  <td
                    key={col.key}
                    className={cn(
                      "px-2 py-2",
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                      col.key === 'name' && "sticky left-0 bg-muted/50 z-10"
                    )}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
            
            {/* Shooting stats */}
            <tr className="text-xs text-muted-foreground">
              <td colSpan={activeColumns.length + 1} className="px-4 py-2">
                <div className="flex gap-4">
                  <span>
                    FG: {teamTotals.fg.made}-{teamTotals.fg.attempted} 
                    ({((teamTotals.fg.made / teamTotals.fg.attempted) * 100).toFixed(1)}%)
                  </span>
                  <span>
                    3PT: {teamTotals.threePt.made}-{teamTotals.threePt.attempted}
                    ({((teamTotals.threePt.made / teamTotals.threePt.attempted) * 100).toFixed(1)}%)
                  </span>
                  <span>
                    FT: {teamTotals.ft.made}-{teamTotals.ft.attempted}
                    ({((teamTotals.ft.made / teamTotals.ft.attempted) * 100).toFixed(1)}%)
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

BoxScoreTable.displayName = 'BoxScoreTable';

export default BoxScoreTable;