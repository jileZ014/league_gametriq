'use client';

import React from 'react';
import { Tournament, TournamentSettings as Settings, SEEDING_METHODS, TIEBREAKER_RULES } from '@/lib/tournament/types';
import { Card } from '@/components/simple-ui';
import { Label } from '@/components/simple-ui';
import { Checkbox } from '@/components/simple-ui';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/simple-ui';
import { Input } from '@/components/simple-ui';
import { Textarea } from '@/components/simple-ui';
import { Alert } from '@/components/simple-ui';
import { 
  Settings as SettingsIcon, 
  Target, 
  Shield, 
  Clock, 
  MapPin,
  Trophy,
  Info
} from 'lucide-react';

interface TournamentSettingsProps {
  tournament: Partial<Tournament>;
  onChange: (tournament: Partial<Tournament>) => void;
}

export function TournamentSettings({ tournament, onChange }: TournamentSettingsProps) {
  const settings = tournament.settings || {
    autoAdvance: false,
    randomizeByes: false,
    balancedBracket: true,
    regionProtection: false,
    divisionProtection: false,
    consolationRounds: 0,
  };

  const format = tournament.format || {
    size: 0,
    byes: 0,
    guaranteedGames: 1,
    allowConsolation: false,
    seedingMethod: 'power_rating',
    tiebreakers: ['head_to_head', 'point_differential'],
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    onChange({
      ...tournament,
      settings: { ...settings, ...newSettings },
    });
  };

  const updateFormat = (newFormat: Partial<typeof format>) => {
    onChange({
      ...tournament,
      format: { ...format, ...newFormat },
    });
  };

  return (
    <div className="space-y-6">
      {/* Tournament Format Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Format & Seeding</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="seedingMethod">Seeding Method</Label>
            <Select
              value={format.seedingMethod}
              onValueChange={(value) => updateFormat({ seedingMethod: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select seeding method" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SEEDING_METHODS).map(([key, method]) => (
                  <SelectItem key={key} value={key}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600 mt-1">
              {SEEDING_METHODS[format.seedingMethod]?.description}
            </p>
          </div>

          <div>
            <Label htmlFor="guaranteedGames">Guaranteed Games</Label>
            <Input
              id="guaranteedGames"
              type="number"
              min="1"
              max="10"
              value={format.guaranteedGames}
              onChange={(e) => updateFormat({ guaranteedGames: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-gray-600 mt-1">
              Minimum games each team will play
            </p>
          </div>

          <div className="md:col-span-2">
            <Label>Tiebreaker Rules (in order of priority)</Label>
            <div className="space-y-2 mt-2">
              {Object.entries(TIEBREAKER_RULES).map(([key, rule]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tiebreaker-${key}`}
                    checked={format.tiebreakers.includes(key as any)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateFormat({
                          tiebreakers: [...format.tiebreakers, key as any],
                        });
                      } else {
                        updateFormat({
                          tiebreakers: format.tiebreakers.filter(t => t !== key),
                        });
                      }
                    }}
                  />
                  <Label htmlFor={`tiebreaker-${key}`} className="text-sm">
                    {rule.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Bracket Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Bracket Configuration</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoAdvance"
              checked={settings.autoAdvance}
              onCheckedChange={(checked) => updateSettings({ autoAdvance: checked })}
            />
            <Label htmlFor="autoAdvance">Auto-advance teams from byes</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="randomizeByes"
              checked={settings.randomizeByes}
              onCheckedChange={(checked) => updateSettings({ randomizeByes: checked })}
            />
            <Label htmlFor="randomizeByes">Randomize bye placement</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="balancedBracket"
              checked={settings.balancedBracket}
              onCheckedChange={(checked) => updateSettings({ balancedBracket: checked })}
            />
            <Label htmlFor="balancedBracket">Create balanced bracket</Label>
          </div>

          {format.allowConsolation && (
            <div>
              <Label htmlFor="consolationRounds">Consolation Rounds</Label>
              <Input
                id="consolationRounds"
                type="number"
                min="0"
                max="5"
                value={settings.consolationRounds}
                onChange={(e) => updateSettings({ consolationRounds: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
              <p className="text-xs text-gray-600 mt-1">
                Additional rounds for eliminated teams
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Protection Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Protection Rules</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="regionProtection"
              checked={settings.regionProtection}
              onCheckedChange={(checked) => updateSettings({ regionProtection: checked })}
            />
            <Label htmlFor="regionProtection">Avoid same-region matchups in early rounds</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="divisionProtection"
              checked={settings.divisionProtection}
              onCheckedChange={(checked) => updateSettings({ divisionProtection: checked })}
            />
            <Label htmlFor="divisionProtection">Avoid same-division matchups in early rounds</Label>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <p className="text-sm">
              Protection rules help create more competitive early-round matchups by avoiding 
              teams that have played each other frequently during the regular season.
            </p>
          </Alert>
        </div>
      </Card>

      {/* Schedule Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Schedule & Logistics</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">Tournament Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={(tournament as any).startTime || ''}
              onChange={(e) => onChange({ ...tournament, startTime: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="gameLength">Game Length (minutes)</Label>
            <Input
              id="gameLength"
              type="number"
              min="30"
              max="120"
              value={(tournament as any).gameLength || 60}
              onChange={(e) => onChange({ ...tournament, gameLength: parseInt(e.target.value) || 60 })}
            />
          </div>

          <div>
            <Label htmlFor="breakBetweenGames">Break Between Games (minutes)</Label>
            <Input
              id="breakBetweenGames"
              type="number"
              min="5"
              max="60"
              value={(tournament as any).breakBetweenGames || 15}
              onChange={(e) => onChange({ ...tournament, breakBetweenGames: parseInt(e.target.value) || 15 })}
            />
          </div>

          <div>
            <Label htmlFor="courtsAvailable">Courts Available</Label>
            <Input
              id="courtsAvailable"
              type="number"
              min="1"
              max="20"
              value={(tournament as any).courtsAvailable || 1}
              onChange={(e) => onChange({ ...tournament, courtsAvailable: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="venue">Venue Information</Label>
            <Textarea
              id="venue"
              value={(tournament as any).venue || ''}
              onChange={(e) => onChange({ ...tournament, venue: e.target.value })}
              placeholder="Address, parking info, check-in location..."
              rows={3}
            />
          </div>
        </div>
      </Card>

      {/* Awards & Recognition */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Awards & Recognition</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="championshipTrophy"
              checked={(tournament as any).championshipTrophy || false}
              onCheckedChange={(checked) => onChange({ ...tournament, championshipTrophy: checked })}
            />
            <Label htmlFor="championshipTrophy">Championship trophy/medal</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="runnerUpAward"
              checked={(tournament as any).runnerUpAward || false}
              onCheckedChange={(checked) => onChange({ ...tournament, runnerUpAward: checked })}
            />
            <Label htmlFor="runnerUpAward">Runner-up award</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="participationAwards"
              checked={(tournament as any).participationAwards || false}
              onCheckedChange={(checked) => onChange({ ...tournament, participationAwards: checked })}
            />
            <Label htmlFor="participationAwards">Participation awards for all teams</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="mvpAward"
              checked={(tournament as any).mvpAward || false}
              onCheckedChange={(checked) => onChange({ ...tournament, mvpAward: checked })}
            />
            <Label htmlFor="mvpAward">Most Valuable Player award</Label>
          </div>

          <div>
            <Label htmlFor="specialAwards">Special Awards</Label>
            <Textarea
              id="specialAwards"
              value={(tournament as any).specialAwards || ''}
              onChange={(e) => onChange({ ...tournament, specialAwards: e.target.value })}
              placeholder="Sportsmanship, Most Improved, Team Spirit, etc."
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Additional Rules */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Additional Rules</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="overtimeRules">Overtime Rules</Label>
            <Select
              value={(tournament as any).overtimeRules || 'sudden_death'}
              onValueChange={(value) => onChange({ ...tournament, overtimeRules: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select overtime rules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sudden_death">Sudden Death</SelectItem>
                <SelectItem value="5_minute_periods">5-Minute Periods</SelectItem>
                <SelectItem value="3_minute_periods">3-Minute Periods</SelectItem>
                <SelectItem value="no_overtime">No Overtime (Tie Games Allowed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="foulLimit">Team Foul Limit per Period</Label>
            <Input
              id="foulLimit"
              type="number"
              min="5"
              max="15"
              value={(tournament as any).foulLimit || 7}
              onChange={(e) => onChange({ ...tournament, foulLimit: parseInt(e.target.value) || 7 })}
            />
          </div>

          <div>
            <Label htmlFor="timeoutRules">Timeout Rules</Label>
            <Textarea
              id="timeoutRules"
              value={(tournament as any).timeoutRules || ''}
              onChange={(e) => onChange({ ...tournament, timeoutRules: e.target.value })}
              placeholder="Number of timeouts per team, length, when they can be called..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="substituteRules">Substitution Rules</Label>
            <Textarea
              id="substituteRules"
              value={(tournament as any).substituteRules || ''}
              onChange={(e) => onChange({ ...tournament, substituteRules: e.target.value })}
              placeholder="Player substitution rules, roster limits, etc."
              rows={2}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}