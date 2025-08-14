import jsPDF from 'jspdf'
import { format } from 'date-fns'

// Basketball-specific PDF generation utilities
export class BasketballPDFGenerator {
  private pdf: jsPDF

  constructor() {
    this.pdf = new jsPDF()
  }

  // Generate game scoresheet PDF
  generateScoresheet(gameData: GameData): Blob {
    this.pdf = new jsPDF()
    
    // Header
    this.pdf.setFontSize(20)
    this.pdf.text('BASKETBALL SCORESHEET', 105, 20, { align: 'center' })
    
    // Game info
    this.pdf.setFontSize(12)
    this.pdf.text(`Game Date: ${format(new Date(gameData.scheduledAt), 'PPP')}`, 20, 40)
    this.pdf.text(`League: ${gameData.league}`, 20, 50)
    this.pdf.text(`Division: ${gameData.division}`, 20, 60)
    
    // Team names
    this.pdf.setFontSize(16)
    this.pdf.text(`HOME: ${gameData.homeTeam}`, 20, 80)
    this.pdf.text(`AWAY: ${gameData.awayTeam}`, 120, 80)
    
    // Score boxes
    this.drawScoreBoxes()
    
    // Player roster sections
    this.drawRosterSections(gameData)
    
    // Fouls and timeouts tracking
    this.drawFoulTimeoutSections()
    
    // Signatures
    this.drawSignatureSection()
    
    return this.pdf.output('blob')
  }

  // Generate team roster PDF
  generateTeamRoster(teamData: TeamData): Blob {
    this.pdf = new jsPDF()
    
    // Header
    this.pdf.setFontSize(20)
    this.pdf.text('TEAM ROSTER', 105, 20, { align: 'center' })
    
    // Team info
    this.pdf.setFontSize(14)
    this.pdf.text(`Team: ${teamData.name}`, 20, 40)
    this.pdf.text(`Coach: ${teamData.coach}`, 20, 50)
    this.pdf.text(`Division: ${teamData.division}`, 20, 60)
    this.pdf.text(`Season: ${teamData.season}`, 20, 70)
    
    // Player table
    this.drawPlayerTable(teamData.players)
    
    return this.pdf.output('blob')
  }

  // Generate tournament bracket PDF
  generateTournamentBracket(tournamentData: TournamentData): Blob {
    this.pdf = new jsPDF('landscape')
    
    // Header
    this.pdf.setFontSize(20)
    this.pdf.text(tournamentData.name, 148, 20, { align: 'center' })
    
    // Draw bracket structure
    this.drawBracketStructure(tournamentData.bracket)
    
    return this.pdf.output('blob')
  }

  // Generate league standings PDF
  generateStandings(standingsData: StandingsData): Blob {
    this.pdf = new jsPDF()
    
    // Header
    this.pdf.setFontSize(20)
    this.pdf.text('LEAGUE STANDINGS', 105, 20, { align: 'center' })
    
    // League info
    this.pdf.setFontSize(12)
    this.pdf.text(`League: ${standingsData.league}`, 20, 40)
    this.pdf.text(`Division: ${standingsData.division}`, 20, 50)
    this.pdf.text(`Updated: ${format(new Date(), 'PPP')}`, 20, 60)
    
    // Standings table
    this.drawStandingsTable(standingsData.teams)
    
    return this.pdf.output('blob')
  }

  private drawScoreBoxes() {
    // Quarter score boxes
    const quarters = ['1st', '2nd', '3rd', '4th', 'OT', 'Final']
    let startX = 20
    let y = 100
    
    quarters.forEach((quarter, index) => {
      this.pdf.rect(startX + (index * 25), y, 25, 15)
      this.pdf.text(quarter, startX + (index * 25) + 2, y + 10)
    })
    
    // Away team boxes
    y = 115
    quarters.forEach((quarter, index) => {
      this.pdf.rect(startX + (index * 25), y, 25, 15)
    })
    
    // Home team boxes  
    y = 130
    quarters.forEach((quarter, index) => {
      this.pdf.rect(startX + (index * 25), y, 25, 15)
    })
  }

  private drawRosterSections(gameData: GameData) {
    let y = 160
    
    // Home team roster
    this.pdf.setFontSize(12)
    this.pdf.text('HOME TEAM ROSTER', 20, y)
    y += 10
    
    for (let i = 0; i < 12; i++) {
      this.pdf.text(`${i + 1}. #___ ___________________`, 20, y + (i * 8))
    }
    
    // Away team roster
    y = 160
    this.pdf.text('AWAY TEAM ROSTER', 120, y)
    y += 10
    
    for (let i = 0; i < 12; i++) {
      this.pdf.text(`${i + 1}. #___ ___________________`, 120, y + (i * 8))
    }
  }

  private drawFoulTimeoutSections() {
    // Foul tracking boxes
    let y = 220
    this.pdf.setFontSize(10)
    this.pdf.text('TEAM FOULS BY QUARTER', 20, y)
    
    // Home team fouls
    y += 10
    for (let q = 1; q <= 4; q++) {
      this.pdf.rect(20 + (q * 30), y, 25, 15)
      this.pdf.text(`Q${q}`, 25 + (q * 30), y + 10)
    }
    
    // Timeout tracking
    y += 25
    this.pdf.text('TIMEOUTS USED', 20, y)
    y += 10
    
    ['HOME', 'AWAY'].forEach((team, index) => {
      this.pdf.text(team, 20, y + (index * 15))
      for (let i = 0; i < 5; i++) {
        this.pdf.circle(60 + (i * 15), y + (index * 15) - 2, 3)
      }
    })
  }

  private drawSignatureSection() {
    const y = 260
    this.pdf.setFontSize(10)
    
    this.pdf.text('OFFICIAL SCOREKEEPER: ________________________', 20, y)
    this.pdf.text('REFEREE 1: ________________________', 20, y + 15)
    this.pdf.text('REFEREE 2: ________________________', 120, y + 15)
  }

  private drawPlayerTable(players: Player[]) {
    let y = 90
    
    // Table headers
    this.pdf.setFontSize(10)
    this.pdf.text('#', 20, y)
    this.pdf.text('Name', 35, y)
    this.pdf.text('Position', 100, y)
    this.pdf.text('Grade', 130, y)
    this.pdf.text('Parent/Guardian', 155, y)
    
    // Underline headers
    this.pdf.line(20, y + 2, 190, y + 2)
    
    // Player rows
    players.forEach((player, index) => {
      y += 10
      this.pdf.text(player.number?.toString() || '', 20, y)
      this.pdf.text(player.name, 35, y)
      this.pdf.text(player.position || '', 100, y)
      this.pdf.text(player.grade?.toString() || '', 130, y)
      this.pdf.text(player.parentName || '', 155, y)
    })
  }

  private drawBracketStructure(bracket: BracketData) {
    // Simplified bracket drawing - would need more complex logic for full bracket
    this.pdf.setFontSize(10)
    this.pdf.text('Tournament Bracket Structure', 20, 40)
    this.pdf.text('(Full bracket rendering requires more complex layout)', 20, 50)
  }

  private drawStandingsTable(teams: StandingsTeam[]) {
    let y = 80
    
    // Headers
    this.pdf.setFontSize(10)
    this.pdf.text('Rank', 20, y)
    this.pdf.text('Team', 40, y)
    this.pdf.text('W', 100, y)
    this.pdf.text('L', 115, y)
    this.pdf.text('PCT', 130, y)
    this.pdf.text('PF', 150, y)
    this.pdf.text('PA', 170, y)
    
    // Underline
    this.pdf.line(20, y + 2, 190, y + 2)
    
    // Team rows
    teams.forEach((team, index) => {
      y += 10
      this.pdf.text((index + 1).toString(), 20, y)
      this.pdf.text(team.name, 40, y)
      this.pdf.text(team.wins.toString(), 100, y)
      this.pdf.text(team.losses.toString(), 115, y)
      this.pdf.text(team.winPercentage.toFixed(3), 130, y)
      this.pdf.text(team.pointsFor.toString(), 150, y)
      this.pdf.text(team.pointsAgainst.toString(), 170, y)
    })
  }
}

// Type definitions
export interface GameData {
  id: string
  league: string
  division: string
  homeTeam: string
  awayTeam: string
  scheduledAt: string
}

export interface TeamData {
  name: string
  coach: string
  division: string
  season: string
  players: Player[]
}

export interface Player {
  id: string
  name: string
  number?: number
  position?: string
  grade?: number
  parentName?: string
}

export interface TournamentData {
  name: string
  bracket: BracketData
}

export interface BracketData {
  rounds: Round[]
}

export interface Round {
  games: BracketGame[]
}

export interface BracketGame {
  team1: string
  team2: string
  winner?: string
}

export interface StandingsData {
  league: string
  division: string
  teams: StandingsTeam[]
}

export interface StandingsTeam {
  name: string
  wins: number
  losses: number
  winPercentage: number
  pointsFor: number
  pointsAgainst: number
}

// Export singleton instance
export const pdfGenerator = new BasketballPDFGenerator()