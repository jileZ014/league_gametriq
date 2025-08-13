'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AnalyticsMetric {
  id: string;
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'purple';
}

interface AnalyticsCardsProps {
  metrics?: AnalyticsMetric[];
  className?: string;
}

// Default metrics with mock data for Phoenix Youth Basketball
const defaultMetrics: AnalyticsMetric[] = [
  {
    id: 'total-registrations',
    title: 'Total Registrations',
    value: '12,847',
    previousValue: '11,234',
    change: 14.4,
    changeLabel: '+1,613 this season',
    trend: 'up',
    color: 'green',
    description: 'Active player registrations across all leagues',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
  },
  {
    id: 'active-games',
    title: 'Games Today',
    value: '47',
    previousValue: '52',
    change: -9.6,
    changeLabel: 'vs last Saturday',
    trend: 'down',
    color: 'blue',
    description: 'Live and scheduled games for today',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: 'revenue',
    title: 'Season Revenue',
    value: '$487,930',
    previousValue: '$423,150',
    change: 15.3,
    changeLabel: '+$64,780',
    trend: 'up',
    color: 'green',
    description: 'Total registration fees collected',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: 'active-leagues',
    title: 'Active Leagues',
    value: '83',
    previousValue: '79',
    change: 5.1,
    changeLabel: '+4 new leagues',
    trend: 'up',
    color: 'purple',
    description: 'Currently running basketball leagues',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
      </svg>
    ),
  },
  {
    id: 'completion-rate',
    title: 'Season Completion',
    value: '68%',
    previousValue: '45%',
    change: 23,
    changeLabel: 'vs last month',
    trend: 'up',
    color: 'blue',
    description: 'Average league season progress',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: 'user-satisfaction',
    title: 'User Satisfaction',
    value: '4.7/5',
    previousValue: '4.4/5',
    change: 6.8,
    changeLabel: 'Based on 2,847 reviews',
    trend: 'up',
    color: 'yellow',
    description: 'Average rating from coaches and parents',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
];

export function AnalyticsCards({ metrics = defaultMetrics, className = '' }: AnalyticsCardsProps) {
  const getColorClasses = (color: string, trend?: string) => {
    const colorMap = {
      green: {
        icon: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        trend: trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400',
      },
      red: {
        icon: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        trend: trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400',
      },
      blue: {
        icon: 'text-blue-400',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        trend: trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400',
      },
      yellow: {
        icon: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        trend: trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400',
      },
      purple: {
        icon: 'text-purple-400',
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/30',
        trend: trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400',
      },
    };

    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    if (trend === 'down') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 15.586l5.293-5.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {metrics.map((metric) => {
        const colors = getColorClasses(metric.color || 'blue', metric.trend);
        
        return (
          <Card 
            key={metric.id} 
            className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:scale-105"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                  <span className={colors.icon}>
                    {metric.icon}
                  </span>
                </div>
                {metric.trend && (
                  <Badge variant="secondary" className={`${colors.trend} bg-transparent border border-current`}>
                    <span className="flex items-center space-x-1">
                      {getTrendIcon(metric.trend)}
                      <span className="text-xs font-medium">
                        {metric.change && Math.abs(metric.change).toFixed(1)}%
                      </span>
                    </span>
                  </Badge>
                )}
              </div>
              <CardTitle className="text-white text-base font-medium mt-3">
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-white">
                  {metric.value}
                </div>
                {metric.changeLabel && (
                  <div className={`text-sm ${colors.trend} flex items-center space-x-1`}>
                    {getTrendIcon(metric.trend)}
                    <span>{metric.changeLabel}</span>
                  </div>
                )}
                {metric.description && (
                  <p className="text-xs text-gray-400 mt-2">
                    {metric.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Individual metric card for custom layouts
export function AnalyticsCard({ metric }: { metric: AnalyticsMetric }) {
  return <AnalyticsCards metrics={[metric]} />;
}

// High-level summary component
export function AnalyticsSummary() {
  const summaryMetrics = defaultMetrics.slice(0, 4); // Show top 4 metrics
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Platform Overview</h2>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
          Live Data
        </Badge>
      </div>
      <AnalyticsCards metrics={summaryMetrics} />
    </div>
  );
}