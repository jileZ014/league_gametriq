'use client';

import React, { useState } from 'react';
import { CoachLayout } from '@/components/coach/CoachLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Player {
  id: string;
  name: string;
  number: string;
  position: string;
  height: string;
  grade: string;
  status: 'active' | 'injured' | 'ineligible';
  stats: {
    ppg: number;
    rpg: number;
    apg: number;
  };
}

function PlayerCard({ player, isDragging = false }: { player: Player; isDragging?: boolean }) {
  const statusColors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    injured: 'bg-red-500/20 text-red-400 border-red-500/30',
    ineligible: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <div className={`p-4 bg-gray-700/50 rounded-lg border border-gray-600 ${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <span className="text-blue-400 font-bold">{player.number}</span>
          </div>
          <div>
            <div className="text-white font-semibold">{player.name}</div>
            <div className="text-sm text-gray-400">{player.position} • {player.height} • {player.grade}</div>
          </div>
        </div>
        <Badge className={statusColors[player.status]}>
          {player.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
        <span>{player.stats.ppg} PPG</span>
        <span>{player.stats.rpg} RPG</span>
        <span>{player.stats.apg} APG</span>
      </div>
    </div>
  );
}

function SortablePlayerCard({ player }: { player: Player }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-move"
    >
      <PlayerCard player={player} isDragging={isDragging} />
    </div>
  );
}

export default function RosterManagement() {
  // Mock data
  const initialPlayers: Player[] = [
    { id: '1', name: 'Michael Johnson', number: '23', position: 'PG', height: "5'10\"", grade: '8th', status: 'active', stats: { ppg: 15.2, rpg: 7.1, apg: 3.5 } },
    { id: '2', name: 'David Chen', number: '10', position: 'SG', height: "5'8\"", grade: '8th', status: 'active', stats: { ppg: 12.8, rpg: 4.2, apg: 6.3 } },
    { id: '3', name: 'Marcus Williams', number: '5', position: 'SF', height: "6'0\"", grade: '8th', status: 'active', stats: { ppg: 11.5, rpg: 3.8, apg: 2.1 } },
    { id: '4', name: 'James Rodriguez', number: '12', position: 'PF', height: "6'1\"", grade: '7th', status: 'active', stats: { ppg: 9.2, rpg: 8.5, apg: 1.8 } },
    { id: '5', name: 'Tyler Anderson', number: '15', position: 'C', height: "6'3\"", grade: '8th', status: 'active', stats: { ppg: 8.7, rpg: 10.2, apg: 1.2 } },
    { id: '6', name: 'Kevin Lee', number: '7', position: 'PG', height: "5'7\"", grade: '7th', status: 'injured', stats: { ppg: 7.3, rpg: 3.1, apg: 4.2 } },
    { id: '7', name: 'Brandon Smith', number: '22', position: 'SG', height: "5'9\"", grade: '8th', status: 'active', stats: { ppg: 6.8, rpg: 2.9, apg: 2.5 } },
    { id: '8', name: 'Alex Martinez', number: '3', position: 'SF', height: "5'11\"", grade: '7th', status: 'active', stats: { ppg: 5.5, rpg: 4.1, apg: 1.9 } },
    { id: '9', name: 'Ryan Thompson', number: '14', position: 'PF', height: "6'0\"", grade: '8th', status: 'active', stats: { ppg: 4.2, rpg: 5.8, apg: 1.0 } },
    { id: '10', name: 'Jordan Davis', number: '11', position: 'C', height: "6'2\"", grade: '7th', status: 'active', stats: { ppg: 3.8, rpg: 7.2, apg: 0.8 } },
  ];

  const [starters, setStarters] = useState<Player[]>(initialPlayers.slice(0, 5));
  const [bench, setBench] = useState<Player[]>(initialPlayers.slice(5));
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activePlayer = [...starters, ...bench].find(p => p.id === active.id);
    const overPlayer = [...starters, ...bench].find(p => p.id === over.id);

    if (!activePlayer || !overPlayer) {
      setActiveId(null);
      return;
    }

    const activeInStarters = starters.some(p => p.id === active.id);
    const overInStarters = starters.some(p => p.id === over.id);

    if (activeInStarters && overInStarters) {
      // Reordering within starters
      const oldIndex = starters.findIndex(p => p.id === active.id);
      const newIndex = starters.findIndex(p => p.id === over.id);
      setStarters(arrayMove(starters, oldIndex, newIndex));
    } else if (!activeInStarters && !overInStarters) {
      // Reordering within bench
      const oldIndex = bench.findIndex(p => p.id === active.id);
      const newIndex = bench.findIndex(p => p.id === over.id);
      setBench(arrayMove(bench, oldIndex, newIndex));
    } else if (activeInStarters && !overInStarters) {
      // Moving from starters to bench
      setStarters(starters.filter(p => p.id !== active.id));
      setBench([...bench, activePlayer]);
    } else {
      // Moving from bench to starters
      if (starters.length < 5) {
        setBench(bench.filter(p => p.id !== active.id));
        setStarters([...starters, activePlayer]);
      }
    }

    setActiveId(null);
  };

  const activePlayer = [...starters, ...bench].find(p => p.id === activeId);

  return (
    <CoachLayout title="Roster Management" subtitle="Drag and drop to set your lineup">
      <div className="space-y-6">
        {/* Roster Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Players</p>
                  <p className="text-2xl font-bold text-white">{starters.length + bench.length}</p>
                </div>
                <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Players</p>
                  <p className="text-2xl font-bold text-white">
                    {[...starters, ...bench].filter(p => p.status === 'active').length}
                  </p>
                </div>
                <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Injured</p>
                  <p className="text-2xl font-bold text-white">
                    {[...starters, ...bench].filter(p => p.status === 'injured').length}
                  </p>
                </div>
                <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Starting Lineup */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Starting Lineup
                  </CardTitle>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    {starters.length}/5
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <SortableContext
                  items={starters.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {starters.map((player) => (
                      <SortablePlayerCard key={player.id} player={player} />
                    ))}
                  </div>
                </SortableContext>
                {starters.length < 5 && (
                  <div className="mt-3 p-4 border-2 border-dashed border-gray-600 rounded-lg text-center text-gray-400">
                    Drag players here to add to starting lineup
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bench */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Bench</CardTitle>
                  <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                    {bench.length} Players
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <SortableContext
                  items={bench.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {bench.map((player) => (
                      <SortablePlayerCard key={player.id} player={player} />
                    ))}
                  </div>
                </SortableContext>
                {bench.length === 0 && (
                  <div className="p-4 border-2 border-dashed border-gray-600 rounded-lg text-center text-gray-400">
                    No players on bench
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DragOverlay>
            {activePlayer ? <PlayerCard player={activePlayer} isDragging /> : null}
          </DragOverlay>
        </DndContext>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline">
            Reset Lineup
          </Button>
          <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
            Save Lineup
          </Button>
        </div>
      </div>
    </CoachLayout>
  );
}