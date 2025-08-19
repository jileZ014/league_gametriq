'use client';

import React, { useState } from 'react';
import { CoachLayout } from '@/components/coach/CoachLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { Input } from '@/components/simple-ui';
import { Label } from '@/components/simple-ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/simple-ui';

interface Event {
  id: string;
  title: string;
  type: 'practice' | 'game' | 'tournament';
  date: string;
  time: string;
  venue: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  attendance?: number;
  notes?: string;
}

export default function SchedulePage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Mock events data
  const events: Event[] = [
    {
      id: '1',
      title: 'Team Practice',
      type: 'practice',
      date: '2024-01-15',
      time: '4:00 PM',
      venue: 'Mesa Recreation Center',
      status: 'confirmed',
      attendance: 12,
    },
    {
      id: '2',
      title: 'vs Desert Storm',
      type: 'game',
      date: '2024-01-16',
      time: '3:00 PM',
      venue: 'Mesa Recreation Center',
      status: 'confirmed',
    },
    {
      id: '3',
      title: 'Shooting Drills',
      type: 'practice',
      date: '2024-01-17',
      time: '5:00 PM',
      venue: 'Phoenix Youth Center',
      status: 'tentative',
      notes: 'Focus on free throws and 3-pointers',
    },
    {
      id: '4',
      title: 'Phoenix Tournament',
      type: 'tournament',
      date: '2024-01-20',
      time: '9:00 AM',
      venue: 'Scottsdale Sports Complex',
      status: 'confirmed',
    },
  ];

  const practiceTemplates = [
    { id: '1', name: 'Fundamentals', duration: '90 min', focus: 'Dribbling, Passing, Shooting' },
    { id: '2', name: 'Defense Clinic', duration: '60 min', focus: 'Man-to-man, Zone defense' },
    { id: '3', name: 'Conditioning', duration: '45 min', focus: 'Sprints, Agility, Endurance' },
    { id: '4', name: 'Game Prep', duration: '120 min', focus: 'Plays, Scrimmage, Strategy' },
  ];

  const venues = [
    { id: '1', name: 'Mesa Recreation Center', available: true },
    { id: '2', name: 'Phoenix Youth Center', available: true },
    { id: '3', name: 'Scottsdale Sports Complex', available: false },
    { id: '4', name: 'Tempe Community Gym', available: true },
  ];

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'practice':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'game':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'tournament':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'tentative':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Simple calendar grid
  const renderCalendar = () => {
    const daysInMonth = 31; // Simplified for demo
    const firstDay = 1; // Monday
    const weeks = Math.ceil((daysInMonth + firstDay - 1) / 7);
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-semibold text-gray-400">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const dayNumber = i - firstDay + 2;
          const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
          const hasEvent = events.some(e => {
            const eventDay = parseInt(e.date.split('-')[2]);
            return eventDay === dayNumber;
          });
          
          return (
            <div
              key={i}
              className={`min-h-[80px] p-2 border border-gray-700 rounded-lg ${
                isCurrentMonth ? 'bg-gray-800/50' : 'bg-gray-900/50'
              } ${hasEvent ? 'ring-1 ring-blue-500/50' : ''} hover:bg-gray-700/50 cursor-pointer`}
            >
              {isCurrentMonth && (
                <>
                  <div className="text-sm font-medium text-gray-300">{dayNumber}</div>
                  {hasEvent && (
                    <div className="mt-1">
                      {events
                        .filter(e => parseInt(e.date.split('-')[2]) === dayNumber)
                        .slice(0, 2)
                        .map(event => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded mb-1 truncate ${
                              event.type === 'practice' ? 'bg-blue-500/20 text-blue-400' :
                              event.type === 'game' ? 'bg-green-500/20 text-green-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}
                          >
                            {event.title}
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <CoachLayout title="Schedule Management" subtitle="Practices, Games & Events">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('calendar')}
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Calendar
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              List
            </Button>
          </div>
          
          <Button
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            onClick={() => setShowAddEvent(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Event
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            {view === 'calendar' ? (
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">January 2024</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm">
                        Today
                      </Button>
                      <Button variant="ghost" size="sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderCalendar()}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Upcoming Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-white font-semibold">{event.title}</h3>
                              <Badge className={getEventTypeColor(event.type)}>
                                {event.type}
                              </Badge>
                              <Badge className={getStatusColor(event.status)}>
                                {event.status}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-400">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                {event.date} at {event.time}
                              </div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                {event.venue}
                              </div>
                              {event.attendance !== undefined && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                  </svg>
                                  {event.attendance} confirmed
                                </div>
                              )}
                              {event.notes && (
                                <div className="text-gray-500 italic">{event.notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button variant="ghost" size="sm">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-400">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Practice Templates */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Practice Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {practiceTemplates.map((template) => (
                    <div key={template.id} className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm">{template.name}</span>
                        <span className="text-xs text-gray-400">{template.duration}</span>
                      </div>
                      <p className="text-xs text-gray-500">{template.focus}</p>
                      <Button size="sm" variant="ghost" className="w-full mt-2">
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Venue Availability */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Venue Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {venues.map((venue) => (
                    <div key={venue.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{venue.name}</span>
                      <Badge className={venue.available ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                        {venue.available ? 'Available' : 'Booked'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Check All Venues
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="default">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Schedule Practice
                </Button>
                
                <Button className="w-full justify-start" variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Send Team Notification
                </Button>
                
                <Button className="w-full justify-start" variant="secondary">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export Schedule
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CoachLayout>
  );
}