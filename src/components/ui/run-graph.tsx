'use client';

import React, { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts';
import { motion } from 'framer-motion';

// Types
export interface GameDataPoint {
  time: string;      // "Q1 5:47"
  homeScore: number;
  awayScore: number;
  event?: string;    // "3-pointer by Player X"
  isHighlight?: boolean;
}

export interface RunGraphProps {
  gameData: GameDataPoint[];
  homeTeam?: {
    name: string;
    color?: string;
  };
  awayTeam?: {
    name: string;
    color?: string;
  };
  variant?: 'line' | 'area' | 'combined';
  showGrid?: boolean;
  showTooltip?: boolean;
  height?: number;
  className?: string;
}

// Custom tooltip component
const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-background/95 border rounded-lg p-3 shadow-lg backdrop-blur-sm"
    >
      <p className="text-xs font-bold text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="font-semibold">{entry.name}:</span>
          <span className="font-mono font-bold">{entry.value}</span>
        </div>
      ))}
      {payload[0]?.payload?.event && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          {payload[0].payload.event}
        </p>
      )}
    </motion.div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

// Custom dot for highlights
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  
  if (!payload.isHighlight) return null;
  
  return (
    <g>
      <motion.circle
        cx={cx}
        cy={cy}
        r={6}
        fill="var(--primary)"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.5, 1] }}
        transition={{ duration: 0.5 }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="white"
      />
    </g>
  );
};

// Main RunGraph component
export const RunGraph = memo(({
  gameData,
  homeTeam = { name: 'Home', color: '#10b981' },
  awayTeam = { name: 'Away', color: '#ef4444' },
  variant = 'line',
  showGrid = true,
  showTooltip = true,
  height = 300,
  className
}: RunGraphProps) => {
  // Calculate max score for Y-axis
  const maxScore = useMemo(() => {
    const max = Math.max(
      ...gameData.map(d => Math.max(d.homeScore, d.awayScore))
    );
    return Math.ceil(max / 10) * 10 + 10; // Round up to nearest 10 + buffer
  }, [gameData]);

  // Find lead changes
  const leadChanges = useMemo(() => {
    const changes: number[] = [];
    for (let i = 1; i < gameData.length; i++) {
      const prevLead = gameData[i - 1].homeScore > gameData[i - 1].awayScore ? 'home' : 'away';
      const currLead = gameData[i].homeScore > gameData[i].awayScore ? 'home' : 'away';
      if (prevLead !== currLead) {
        changes.push(i);
      }
    }
    return changes;
  }, [gameData]);

  // Get current leader
  const currentLeader = useMemo(() => {
    if (gameData.length === 0) return null;
    const last = gameData[gameData.length - 1];
    if (last.homeScore > last.awayScore) return 'home';
    if (last.awayScore > last.homeScore) return 'away';
    return 'tied';
  }, [gameData]);

  // Chart component based on variant
  const ChartComponent = variant === 'area' ? AreaChart : LineChart;
  const DataComponent = variant === 'area' ? Area : Line;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative rounded-lg border bg-background/95 backdrop-blur-sm p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Score Progression
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: homeTeam.color }}
            />
            <span className={cn(
              "font-semibold",
              currentLeader === 'home' && "text-success"
            )}>
              {homeTeam.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: awayTeam.color }}
            />
            <span className={cn(
              "font-semibold",
              currentLeader === 'away' && "text-success"
            )}>
              {awayTeam.name}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={gameData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border)"
              opacity={0.3}
            />
          )}
          
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10 }}
            stroke="var(--muted-foreground)"
            axisLine={{ stroke: 'var(--border)' }}
          />
          
          <YAxis 
            domain={[0, maxScore]}
            tick={{ fontSize: 10 }}
            stroke="var(--muted-foreground)"
            axisLine={{ stroke: 'var(--border)' }}
          />
          
          {showTooltip && (
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
          )}
          
          {/* Reference lines for lead changes */}
          {leadChanges.map((index) => (
            <ReferenceLine
              key={index}
              x={gameData[index].time}
              stroke="var(--warning)"
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.5}
            />
          ))}
          
          {/* Data lines/areas */}
          <DataComponent
            type="monotone"
            dataKey="homeScore"
            stroke={homeTeam.color}
            fill={homeTeam.color}
            strokeWidth={2}
            name={homeTeam.name}
            fillOpacity={variant === 'area' ? 0.3 : 0}
            dot={<CustomDot />}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          
          <DataComponent
            type="monotone"
            dataKey="awayScore"
            stroke={awayTeam.color}
            fill={awayTeam.color}
            strokeWidth={2}
            name={awayTeam.name}
            fillOpacity={variant === 'area' ? 0.3 : 0}
            dot={<CustomDot />}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </ChartComponent>
      </ResponsiveContainer>

      {/* Lead changes indicator */}
      {leadChanges.length > 0 && (
        <div className="mt-4 text-xs text-muted-foreground text-center">
          {leadChanges.length} lead change{leadChanges.length !== 1 && 's'}
        </div>
      )}
    </motion.div>
  );
});

RunGraph.displayName = 'RunGraph';

export default RunGraph;