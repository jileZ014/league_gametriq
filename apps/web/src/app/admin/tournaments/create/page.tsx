'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { 
  Tournament, 
  Team, 
  TournamentType, 
  SeedingMethod,
  TournamentEngine,
  TournamentFactory,
  TOURNAMENT_FORMATS,
  SEEDING_METHODS,
  VALIDATION_RULES
} from '@/lib/tournament/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Eye, 
  Save, 
  Upload, 
  Download,
  Shuffle,
  Target,
  Users,
  Trophy,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import { TeamPlacement } from '@/components/tournament/TeamPlacement';
import { BracketPreview } from '@/components/tournament/BracketPreview';
import { TournamentSettings as TournamentSettingsComponent } from '@/components/tournament/TournamentSettings';

interface CreateTournamentPageProps {}

export default function CreateTournamentPage({}: CreateTournamentPageProps) {
  const [currentStep, setCurrentStep] = useState<'basic' | 'teams' | 'settings' | 'preview'>('basic');
  const [tournament, setTournament] = useState<Partial<Tournament>>({
    name: '',
    type: 'single_elimination',
    teams: [],
    status: 'setup',
  });
  
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [draggedTeam, setDraggedTeam] = useState<Team | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [previewBracket, setPreviewBracket] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load available teams (mock data for now)
  useEffect(() => {
    const mockTeams: Team[] = [
      { id: '1', name: 'Phoenix Suns Youth', powerRating: 95, record: { wins: 12, losses: 2 }, regionId: 'north' },
      { id: '2', name: 'Scottsdale Storm', powerRating: 88, record: { wins: 10, losses: 4 }, regionId: 'north' },
      { id: '3', name: 'Tempe Thunder', powerRating: 92, record: { wins: 11, losses: 3 }, regionId: 'central' },
      { id: '4', name: 'Mesa Mavericks', powerRating: 85, record: { wins: 9, losses: 5 }, regionId: 'east' },
      { id: '5', name: 'Glendale Giants', powerRating: 90, record: { wins: 10, losses: 4 }, regionId: 'west' },
      { id: '6', name: 'Chandler Champions', powerRating: 87, record: { wins: 9, losses: 5 }, regionId: 'south' },
      { id: '7', name: 'Peoria Panthers', powerRating: 83, record: { wins: 8, losses: 6 }, regionId: 'west' },
      { id: '8', name: 'Gilbert Gladiators', powerRating: 91, record: { wins: 11, losses: 3 }, regionId: 'east' },
      { id: '9', name: 'Surprise Spartans', powerRating: 79, record: { wins: 7, losses: 7 }, regionId: 'west' },
      { id: '10', name: 'Ahwatukee Aces', powerRating: 86, record: { wins: 9, losses: 5 }, regionId: 'south' },
      { id: '11', name: 'Fountain Hills Falcons', powerRating: 82, record: { wins: 8, losses: 6 }, regionId: 'north' },
      { id: '12', name: 'Paradise Valley Vipers', powerRating: 89, record: { wins: 10, losses: 4 }, regionId: 'north' },
    ];
    setAvailableTeams(mockTeams);
  }, []);

  // Validation
  const validateStep = useCallback((step: string): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'basic':
        if (!tournament.name || tournament.name.length < 3) {
          newErrors.name = 'Tournament name must be at least 3 characters';
        }
        if (!tournament.type) {
          newErrors.type = 'Tournament type is required';
        }
        break;
      
      case 'teams':
        const format = TOURNAMENT_FORMATS[tournament.type as TournamentType];
        if (selectedTeams.length < format.minTeams) {
          newErrors.teams = `At least ${format.minTeams} teams required`;
        }
        if (selectedTeams.length > format.maxTeams) {
          newErrors.teams = `Maximum ${format.maxTeams} teams allowed`;
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [tournament, selectedTeams]);

  // Handle drag and drop
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const team = [...availableTeams, ...selectedTeams].find(t => t.id === active.id);
    setDraggedTeam(team || null);
  }, [availableTeams, selectedTeams]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTeam(null);

    if (!over) return;

    const activeTeam = [...availableTeams, ...selectedTeams].find(t => t.id === active.id);
    if (!activeTeam) return;

    // Moving between available and selected
    if (over.id === 'selected-teams' && !selectedTeams.find(t => t.id === activeTeam.id)) {
      setSelectedTeams(prev => [...prev, activeTeam]);
      setAvailableTeams(prev => prev.filter(t => t.id !== activeTeam.id));
    } else if (over.id === 'available-teams' && selectedTeams.find(t => t.id === activeTeam.id)) {
      setAvailableTeams(prev => [...prev, activeTeam]);
      setSelectedTeams(prev => prev.filter(t => t.id !== activeTeam.id));
    }
    
    // Reordering within selected teams
    if (over.id !== 'selected-teams' && over.id !== 'available-teams') {
      const oldIndex = selectedTeams.findIndex(t => t.id === active.id);
      const newIndex = selectedTeams.findIndex(t => t.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setSelectedTeams(arrayMove(selectedTeams, oldIndex, newIndex));
      }
    }
  }, [availableTeams, selectedTeams]);

  // Auto-seed teams
  const autoSeedTeams = useCallback((method: SeedingMethod) => {
    let seededTeams = [...selectedTeams];

    switch (method) {
      case 'power_rating':
        seededTeams.sort((a, b) => (b.powerRating || 0) - (a.powerRating || 0));
        break;
      case 'win_percentage':
        seededTeams.sort((a, b) => {
          const aWinPct = a.record ? a.record.wins / (a.record.wins + a.record.losses) : 0;
          const bWinPct = b.record ? b.record.wins / (b.record.wins + b.record.losses) : 0;
          return bWinPct - aWinPct;
        });
        break;
      case 'random':
        for (let i = seededTeams.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [seededTeams[i], seededTeams[j]] = [seededTeams[j], seededTeams[i]];
        }
        break;
    }

    // Assign seed numbers
    seededTeams = seededTeams.map((team, index) => ({
      ...team,
      seed: index + 1,
    }));

    setSelectedTeams(seededTeams);
  }, [selectedTeams]);

  // Generate preview bracket
  const generatePreview = useCallback(() => {
    if (selectedTeams.length === 0) return;

    try {
      const tournamentData = TournamentFactory.createSingleElimination(selectedTeams);
      const engine = new TournamentEngine(tournamentData);
      const bracket = engine.generateBracket();
      setPreviewBracket(bracket);
    } catch (error) {
      console.error('Error generating bracket:', error);
    }
  }, [selectedTeams, tournament.type]);

  // Generate preview when teams or type changes
  useEffect(() => {
    if (currentStep === 'preview') {
      generatePreview();
    }
  }, [currentStep, generatePreview]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateStep('teams')) return;

    setLoading(true);
    try {
      // Create tournament
      const finalTournament = {
        ...tournament,
        teams: selectedTeams,
        id: `tournament_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Tournament;

      // Generate bracket
      const engine = new TournamentEngine(finalTournament);
      const bracket = engine.generateBracket();
      
      finalTournament.bracket = bracket;
      finalTournament.matches = bracket.rounds.flatMap(round => round.matches);

      // Save tournament (mock for now)
      console.log('Saving tournament:', finalTournament);
      
      // Redirect to tournament view
      // router.push(`/admin/tournaments/${finalTournament.id}`);
      
    } catch (error) {
      console.error('Error creating tournament:', error);
    } finally {
      setLoading(false);
    }
  }, [tournament, selectedTeams, validateStep]);

  const currentFormat = TOURNAMENT_FORMATS[tournament.type as TournamentType];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Tournament</h1>
          <p className="text-gray-600">Set up a new basketball tournament bracket</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || currentStep !== 'preview'}
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </Button>
        </div>
      </div>

      {/* Step Navigation */}
      <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tournament Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Tournament Name *</Label>
                <Input
                  id="name"
                  value={tournament.name || ''}
                  onChange={(e) => setTournament(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Spring Championship 2024"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="type">Tournament Type *</Label>
                <Select
                  value={tournament.type || ''}
                  onValueChange={(value) => setTournament(prev => ({ ...prev, type: value as TournamentType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TOURNAMENT_FORMATS).map(([key, format]) => (
                      <SelectItem key={key} value={key}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={(tournament as any).description || ''}
                  onChange={(e) => setTournament(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tournament description..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="date">Tournament Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={(tournament as any).date || ''}
                  onChange={(e) => setTournament(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={(tournament as any).location || ''}
                  onChange={(e) => setTournament(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Phoenix Sports Complex"
                />
              </div>
            </div>

            {currentFormat && (
              <Alert className="mt-4">
                <Trophy className="w-4 h-4" />
                <div>
                  <p className="font-medium">{currentFormat.name}</p>
                  <p className="text-sm text-gray-600">{currentFormat.description}</p>
                  <p className="text-sm text-gray-600">
                    Teams: {currentFormat.minTeams} - {currentFormat.maxTeams} • 
                    Guaranteed games: {typeof currentFormat.guaranteedGames === 'function' ? 'Variable' : currentFormat.guaranteedGames}
                  </p>
                </div>
              </Alert>
            )}
          </Card>
        </TabsContent>

        {/* Team Selection */}
        <TabsContent value="teams" className="space-y-6">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Teams */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Available Teams</h3>
                  <Badge variant="outline">{availableTeams.length}</Badge>
                </div>
                
                <div className="space-y-2 min-h-[400px] border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <SortableContext items={availableTeams.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {availableTeams.map(team => (
                      <TeamPlacement
                        key={team.id}
                        team={team}
                        isDragging={draggedTeam?.id === team.id}
                      />
                    ))}
                  </SortableContext>
                  
                  {availableTeams.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      All teams have been added to the tournament
                    </div>
                  )}
                </div>
              </Card>

              {/* Selected Teams */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Tournament Teams</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedTeams.length}</Badge>
                    {currentFormat && (
                      <Badge 
                        variant={selectedTeams.length >= currentFormat.minTeams ? 'default' : 'destructive'}
                      >
                        Min: {currentFormat.minTeams}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => autoSeedTeams('power_rating')}
                      disabled={selectedTeams.length === 0}
                    >
                      <Target className="w-4 h-4 mr-1" />
                      Seed by Rating
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => autoSeedTeams('win_percentage')}
                      disabled={selectedTeams.length === 0}
                    >
                      Seed by Record
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => autoSeedTeams('random')}
                      disabled={selectedTeams.length === 0}
                    >
                      <Shuffle className="w-4 h-4 mr-1" />
                      Randomize
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 min-h-[400px] border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <SortableContext items={selectedTeams.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {selectedTeams.map((team, index) => (
                      <TeamPlacement
                        key={team.id}
                        team={{ ...team, seed: index + 1 }}
                        isDragging={draggedTeam?.id === team.id}
                        showSeed
                      />
                    ))}
                  </SortableContext>
                  
                  {selectedTeams.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      Drag teams here to add them to the tournament
                    </div>
                  )}
                </div>

                {errors.teams && (
                  <Alert className="mt-4" variant="destructive">
                    {errors.teams}
                  </Alert>
                )}
              </Card>
            </div>

            <DragOverlay>
              {draggedTeam && (
                <TeamPlacement
                  team={draggedTeam}
                  isDragging
                  style={{ opacity: 0.8 }}
                />
              )}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* Tournament Settings */}
        <TabsContent value="settings" className="space-y-6">
          <TournamentSettingsComponent
            tournament={tournament}
            onChange={setTournament}
          />
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tournament Bracket Preview</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generatePreview}
                >
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>

            {previewBracket ? (
              <BracketPreview
                bracket={previewBracket}
                tournament={tournament as Tournament}
              />
            ) : (
              <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                  <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Generate bracket to see preview</p>
                </div>
              </div>
            )}
          </Card>

          {/* Tournament Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tournament Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Teams</p>
                <p className="text-2xl font-bold">{selectedTeams.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Format</p>
                <p className="text-lg font-semibold">
                  {currentFormat?.name || tournament.type}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Matches</p>
                <p className="text-2xl font-bold">
                  {previewBracket ? previewBracket.totalMatches : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rounds</p>
                <p className="text-2xl font-bold">
                  {previewBracket ? previewBracket.totalRounds : '-'}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}