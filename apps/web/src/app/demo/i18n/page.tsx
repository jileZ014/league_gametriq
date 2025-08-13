'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LanguageSwitcher, LanguageSwitcherCompact } from '@/components/LanguageSwitcher'
import { useTranslation, useBasketballTranslation, useRegistrationTranslation, useScoringTranslation } from '@/hooks/useTranslation'
import { Calendar, Trophy, Users, Clock, CreditCard, Bell, Globe, CheckCircle2 } from 'lucide-react'

// Sample data for demonstration
const mockGame = {
  homeTeam: 'Phoenix Suns Youth',
  awayTeam: 'Scottsdale Eagles',
  homeScore: 68,
  awayScore: 64,
  quarter: 4,
  timeRemaining: '2:35',
  date: new Date('2024-12-21T19:00:00'),
}

const mockPlayer = {
  name: 'Carlos Rodriguez',
  number: 23,
  points: 18,
  rebounds: 7,
  assists: 5,
  fouls: 3,
}

const registrationFees = {
  earlyBird: 150,
  regular: 175,
  late: 200,
  uniformFee: 45,
}

export default function I18nDemoPage() {
  const { t, format, currentLanguage } = useTranslation('common')
  const { t: tBasketball, basketball } = useBasketballTranslation()
  const { t: tRegistration } = useRegistrationTranslation()
  const { t: tScoring } = useScoringTranslation()
  
  const [showSuccess, setShowSuccess] = useState(false)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header with Language Switcher */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gold mb-2">
            {t('app.name')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('app.tagline')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            <Globe className="h-3 w-3 mr-1" />
            {currentLanguage === 'en' ? 'English' : 'Español'}
          </Badge>
          <LanguageSwitcher showLabel />
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t('messages.changesSaved')}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation Example */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('navigation.home')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['games', 'teams', 'standings', 'schedule', 'stats', 'coach', 'referee'].map((key) => (
              <Button key={key} variant="outline" size="sm">
                {t(`navigation.${key}`)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="game" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="game">{tBasketball('game.title')}</TabsTrigger>
          <TabsTrigger value="registration">{tRegistration('title')}</TabsTrigger>
          <TabsTrigger value="scoring">{tScoring('title')}</TabsTrigger>
          <TabsTrigger value="formats">{t('common.details')}</TabsTrigger>
        </TabsList>

        {/* Game Tab */}
        <TabsContent value="game">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Live Game Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{tBasketball('game.title')}</CardTitle>
                  <Badge className="bg-red-500 text-white animate-pulse">
                    {t('status.live')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score Display */}
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {basketball.score(mockGame.homeScore, mockGame.awayScore)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{tBasketball('game.home')}</p>
                      <p className="font-semibold">{mockGame.homeTeam}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{tBasketball('game.away')}</p>
                      <p className="font-semibold">{mockGame.awayTeam}</p>
                    </div>
                  </div>
                </div>
                
                {/* Game Info */}
                <div className="flex justify-between text-sm">
                  <span>{basketball.quarter(mockGame.quarter)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {mockGame.timeRemaining}
                  </span>
                </div>

                {/* Team Fouls */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-secondary rounded">
                    <span className="text-muted-foreground">{tBasketball('stats.teamFouls')}: </span>
                    <span className="font-semibold">{basketball.foulCount(5, 7)}</span>
                  </div>
                  <div className="p-2 bg-secondary rounded">
                    <span className="text-muted-foreground">{tBasketball('timeout.remaining')}: </span>
                    <span className="font-semibold">{basketball.timeoutCount(2, 3)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>{tBasketball('stats.points')}</CardTitle>
                <CardDescription>
                  #{mockPlayer.number} {mockPlayer.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-2xl font-bold">
                    {basketball.playerStats(mockPlayer.points, mockPlayer.rebounds, mockPlayer.assists)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 bg-secondary rounded">
                      <p className="text-2xl font-bold text-gold">{mockPlayer.points}</p>
                      <p className="text-xs text-muted-foreground">{tBasketball('stats.points')}</p>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded">
                      <p className="text-2xl font-bold">{mockPlayer.rebounds}</p>
                      <p className="text-xs text-muted-foreground">{tBasketball('stats.rebounds')}</p>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded">
                      <p className="text-2xl font-bold">{mockPlayer.assists}</p>
                      <p className="text-xs text-muted-foreground">{tBasketball('stats.assists')}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>{tBasketball('stats.personalFouls')}:</span>
                      <span className="font-semibold">
                        {basketball.foulCount(mockPlayer.fouls, 5)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Standings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-gold" />
                  {tBasketball('standings.team')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">{tBasketball('standings.rank')}</th>
                      <th className="text-left py-2">{tBasketball('standings.team')}</th>
                      <th className="text-center py-2">{tBasketball('standings.wins')}</th>
                      <th className="text-center py-2">{tBasketball('standings.losses')}</th>
                      <th className="text-right py-2">{tBasketball('standings.winPercentage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">1</td>
                      <td className="py-2">{mockGame.homeTeam}</td>
                      <td className="text-center py-2">12</td>
                      <td className="text-center py-2">3</td>
                      <td className="text-right py-2">.800</td>
                    </tr>
                    <tr>
                      <td className="py-2">2</td>
                      <td className="py-2">{mockGame.awayTeam}</td>
                      <td className="text-center py-2">10</td>
                      <td className="text-center py-2">5</td>
                      <td className="text-right py-2">.667</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Youth Divisions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {tBasketball('youth.ageGroup')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {['under8', 'under10', 'under12', 'under14'].map((age) => (
                    <Button key={age} variant="outline" size="sm" className="justify-start">
                      {tBasketball(`youth.${age}`)}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Badge>{tBasketball('youth.recreational')}</Badge>
                  <Badge variant="secondary">{tBasketball('youth.competitive')}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Registration Tab */}
        <TabsContent value="registration">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Registration Form Preview */}
            <Card>
              <CardHeader>
                <CardTitle>{tRegistration('player.title')}</CardTitle>
                <CardDescription>{tRegistration('player.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {tRegistration('player.fields.playerFirstName')}
                  </label>
                  <input 
                    className="w-full px-3 py-2 border rounded-md" 
                    placeholder={tRegistration('player.fields.playerFirstName')}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {tRegistration('player.fields.dateOfBirth')}
                  </label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {tRegistration('player.fields.jerseySize')}
                  </label>
                  <select className="w-full px-3 py-2 border rounded-md">
                    <option>{tRegistration('player.options.youthSmall')}</option>
                    <option>{tRegistration('player.options.youthMedium')}</option>
                    <option>{tRegistration('player.options.youthLarge')}</option>
                  </select>
                </div>

                <Button 
                  className="w-full bg-gold hover:bg-gold/90 text-black"
                  onClick={() => setShowSuccess(true)}
                >
                  {t('common.submit')}
                </Button>
              </CardContent>
            </Card>

            {/* Registration Fees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {tRegistration('fees.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-800">
                        {tRegistration('fees.earlyBird')}
                      </span>
                      <span className="text-2xl font-bold text-green-600">
                        {format.currency(registrationFees.earlyBird)}
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {tRegistration('status.deadline', { date: format.date(new Date('2024-12-31')) })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span>{tRegistration('fees.regular')}</span>
                      <span className="font-semibold">{format.currency(registrationFees.regular)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>{tRegistration('fees.late')}</span>
                      <span className="font-semibold">{format.currency(registrationFees.late)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>{tRegistration('player.payment.uniformFee')}</span>
                      <span className="font-semibold">{format.currency(registrationFees.uniformFee)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">{tRegistration('fees.details.includes')}</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• {tRegistration('fees.details.uniform')}</li>
                      <li>• {tRegistration('fees.details.insurance')}</li>
                      <li>• {tRegistration('fees.details.referees')}</li>
                      <li>• {tRegistration('fees.details.awards')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Registration Status */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{tRegistration('status.open')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { division: tBasketball('youth.under8'), spots: 12, status: 'open' },
                    { division: tBasketball('youth.under10'), spots: 3, status: 'closing' },
                    { division: tBasketball('youth.under12'), spots: 0, status: 'full' },
                    { division: tBasketball('youth.under14'), spots: 8, status: 'open' },
                  ].map((div) => (
                    <div key={div.division} className="p-3 border rounded-lg">
                      <p className="font-semibold">{div.division}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {div.spots > 0 
                          ? tRegistration(`status.spotsRemaining${div.spots === 1 ? '' : '_plural'}`, { count: div.spots })
                          : tRegistration('status.full')
                        }
                      </p>
                      <Badge 
                        variant={div.status === 'full' ? 'destructive' : div.status === 'closing' ? 'secondary' : 'default'}
                        className="mt-2"
                      >
                        {tRegistration(`status.${div.status}`)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scoring Tab */}
        <TabsContent value="scoring">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Scoring Interface */}
            <Card>
              <CardHeader>
                <CardTitle>{tScoring('game.title')}</CardTitle>
                <CardDescription>{tScoring('game.inProgress')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    {tScoring('scoring.twoPoint')}
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    {tScoring('scoring.threePoint')}
                  </Button>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    {tScoring('scoring.freeThrow')}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline">
                    {tScoring('scoring.rebound')}
                  </Button>
                  <Button variant="outline">
                    {tScoring('scoring.assist')}
                  </Button>
                  <Button variant="outline">
                    {tScoring('scoring.steal')}
                  </Button>
                  <Button variant="outline">
                    {tScoring('scoring.block')}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="destructive">
                    {tScoring('scoring.foul')}
                  </Button>
                  <Button variant="secondary">
                    {tScoring('actions.callTimeout')}
                  </Button>
                </div>

                <Button variant="outline" className="w-full">
                  {tScoring('actions.undoLast')}
                </Button>
              </CardContent>
            </Card>

            {/* Game Clock */}
            <Card>
              <CardHeader>
                <CardTitle>{tScoring('clock.gameClock')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold font-mono">
                    12:00
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {tScoring('clock.quarter', { number: 2 })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline">
                    {tScoring('clock.startClock')}
                  </Button>
                  <Button variant="outline">
                    {tScoring('clock.stopClock')}
                  </Button>
                </div>

                <div className="p-3 bg-secondary rounded">
                  <div className="flex justify-between text-sm">
                    <span>{tScoring('clock.shotClock')}</span>
                    <span className="font-mono font-bold">24</span>
                  </div>
                </div>

                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    {tScoring('messages.offlineMode')}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{tScoring('shortcuts.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {[
                    'space', 'enter', 'esc', 'num1', 'num2', 'num3',
                    'f', 't', 's', 'u', 'h', 'a'
                  ].map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono">
                        {key.replace('num', '')}
                      </kbd>
                      <span className="text-muted-foreground">
                        {tScoring(`shortcuts.${key}`).split(' - ')[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Date & Number Formats Tab */}
        <TabsContent value="formats">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Date Formatting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('time.date')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('time.today')}</p>
                  <p className="font-semibold">{format.date(new Date())}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('time.time')}</p>
                  <p className="font-semibold">{format.time(new Date())}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{tBasketball('game.gameTime')}</p>
                  <p className="font-semibold">{format.dateTime(mockGame.date)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Relative</p>
                  <p className="font-semibold">{format.relative(mockGame.date)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="font-semibold">{format.distance(new Date('2024-12-15'))}</p>
                </div>
              </CardContent>
            </Card>

            {/* Number Formatting */}
            <Card>
              <CardHeader>
                <CardTitle>{t('common.details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Number</p>
                  <p className="font-semibold">{format.number(1234567.89)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-semibold">{format.currency(1234.56)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Percent</p>
                  <p className="font-semibold">{format.percent(75.5)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{tBasketball('standings.winPercentage')}</p>
                  <p className="font-semibold">{format.percent(80)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>{t('app.copyright')}</p>
        <div className="mt-2">
          <LanguageSwitcherCompact />
        </div>
      </div>
    </div>
  )
}