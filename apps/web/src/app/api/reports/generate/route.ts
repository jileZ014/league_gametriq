import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken, hasPermission } from '@/lib/auth'
import { z } from 'zod'
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'

// Validation schemas
const GenerateReportSchema = z.object({
  report_type: z.enum(['team_stats', 'player_stats', 'game_results', 'attendance', 'financial', 'league_summary']),
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  league_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  include_charts: z.boolean().default(false),
  email_to: z.string().email().optional(),
})

// Rate limiting for report generation
const reportRateLimit = new Map<string, { count: number; resetTime: number }>()

function checkReportRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = reportRateLimit.get(userId)
  
  if (limit && limit.resetTime > now) {
    if (limit.count >= 10) { // 10 reports per hour
      return false
    }
    limit.count++
  } else {
    reportRateLimit.set(userId, { count: 1, resetTime: now + 3600000 }) // 1 hour window
  }
  
  return true
}

// Helper function to generate PDF report
async function generatePDFReport(data: any, reportType: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, left: 50, right: 50, bottom: 50 },
      info: {
        Title: `Basketball League ${reportType.replace('_', ' ').toUpperCase()} Report`,
        Author: 'Gametriq Basketball League',
        Subject: reportType,
        CreationDate: new Date(),
      },
    })
    
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    
    // Add header
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Basketball League Report', { align: 'center' })
    
    doc.fontSize(14)
       .font('Helvetica')
       .text(reportType.replace('_', ' ').toUpperCase(), { align: 'center' })
    
    doc.moveDown()
    doc.fontSize(10)
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' })
    
    doc.moveDown(2)
    
    // Add report content based on type
    switch (reportType) {
      case 'team_stats':
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Team Statistics')
        doc.moveDown()
        
        if (data.teams && Array.isArray(data.teams)) {
          data.teams.forEach((team: any) => {
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text(team.name)
            
            doc.fontSize(10)
               .font('Helvetica')
               .text(`Wins: ${team.wins} | Losses: ${team.losses}`)
               .text(`Points For: ${team.points_for} | Points Against: ${team.points_against}`)
               .text(`Win Percentage: ${((team.wins / (team.wins + team.losses)) * 100).toFixed(1)}%`)
            
            doc.moveDown()
          })
        }
        break
      
      case 'player_stats':
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Player Statistics')
        doc.moveDown()
        
        if (data.players && Array.isArray(data.players)) {
          // Create a simple table
          const headers = ['Name', 'Team', 'PPG', 'RPG', 'APG', 'SPG', 'BPG']
          const columnWidths = [120, 100, 50, 50, 50, 50, 50]
          
          // Draw headers
          let xPos = 50
          doc.fontSize(10).font('Helvetica-Bold')
          headers.forEach((header, i) => {
            doc.text(header, xPos, doc.y, { width: columnWidths[i], align: 'left' })
            xPos += columnWidths[i]
          })
          
          doc.moveDown()
          
          // Draw player data
          doc.font('Helvetica')
          data.players.forEach((player: any) => {
            xPos = 50
            const y = doc.y
            
            doc.text(player.name, xPos, y, { width: columnWidths[0], align: 'left' })
            xPos += columnWidths[0]
            doc.text(player.team_name, xPos, y, { width: columnWidths[1], align: 'left' })
            xPos += columnWidths[1]
            doc.text(player.ppg?.toFixed(1) || '0.0', xPos, y, { width: columnWidths[2], align: 'center' })
            xPos += columnWidths[2]
            doc.text(player.rpg?.toFixed(1) || '0.0', xPos, y, { width: columnWidths[3], align: 'center' })
            xPos += columnWidths[3]
            doc.text(player.apg?.toFixed(1) || '0.0', xPos, y, { width: columnWidths[4], align: 'center' })
            xPos += columnWidths[4]
            doc.text(player.spg?.toFixed(1) || '0.0', xPos, y, { width: columnWidths[5], align: 'center' })
            xPos += columnWidths[5]
            doc.text(player.bpg?.toFixed(1) || '0.0', xPos, y, { width: columnWidths[6], align: 'center' })
            
            doc.moveDown(0.5)
          })
        }
        break
      
      case 'game_results':
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Game Results')
        doc.moveDown()
        
        if (data.games && Array.isArray(data.games)) {
          data.games.forEach((game: any) => {
            doc.fontSize(10)
               .font('Helvetica')
               .text(`${new Date(game.scheduled_at).toLocaleDateString()} - ${game.venue}`)
            
            doc.font('Helvetica-Bold')
               .text(`${game.home_team_name}: ${game.home_score} - ${game.away_team_name}: ${game.away_score}`)
            
            doc.moveDown()
          })
        }
        break
      
      case 'financial':
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Financial Summary')
        doc.moveDown()
        
        if (data.financial) {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`Total Revenue: $${data.financial.total_revenue?.toFixed(2) || '0.00'}`)
             .text(`Registration Fees: $${data.financial.registration_fees?.toFixed(2) || '0.00'}`)
             .text(`Tournament Fees: $${data.financial.tournament_fees?.toFixed(2) || '0.00'}`)
             .text(`Total Refunds: $${data.financial.total_refunds?.toFixed(2) || '0.00'}`)
             .text(`Net Revenue: $${data.financial.net_revenue?.toFixed(2) || '0.00'}`)
        }
        break
    }
    
    // Add footer
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(8)
         .text(
           `Page ${i + 1} of ${pageCount}`,
           50,
           doc.page.height - 30,
           { align: 'center' }
         )
    }
    
    doc.end()
  })
}

// Helper function to generate Excel report
async function generateExcelReport(data: any, reportType: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Gametriq Basketball League'
  workbook.lastModifiedBy = 'System'
  workbook.created = new Date()
  workbook.modified = new Date()
  
  const sheet = workbook.addWorksheet(reportType.replace('_', ' ').toUpperCase())
  
  // Style configurations
  const headerStyle = {
    font: { bold: true, size: 12 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0066CC' } },
    color: { argb: 'FFFFFFFF' },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
  }
  
  switch (reportType) {
    case 'team_stats':
      sheet.columns = [
        { header: 'Team Name', key: 'name', width: 25 },
        { header: 'Wins', key: 'wins', width: 10 },
        { header: 'Losses', key: 'losses', width: 10 },
        { header: 'Points For', key: 'points_for', width: 12 },
        { header: 'Points Against', key: 'points_against', width: 12 },
        { header: 'Win %', key: 'win_percentage', width: 10 },
      ]
      
      // Apply header styles
      sheet.getRow(1).font = headerStyle.font
      sheet.getRow(1).fill = headerStyle.fill
      sheet.getRow(1).alignment = headerStyle.alignment
      
      if (data.teams && Array.isArray(data.teams)) {
        data.teams.forEach((team: any) => {
          sheet.addRow({
            name: team.name,
            wins: team.wins,
            losses: team.losses,
            points_for: team.points_for,
            points_against: team.points_against,
            win_percentage: ((team.wins / (team.wins + team.losses || 1)) * 100).toFixed(1) + '%',
          })
        })
      }
      break
    
    case 'player_stats':
      sheet.columns = [
        { header: 'Player Name', key: 'name', width: 25 },
        { header: 'Team', key: 'team_name', width: 20 },
        { header: 'Games', key: 'games', width: 10 },
        { header: 'PPG', key: 'ppg', width: 10 },
        { header: 'RPG', key: 'rpg', width: 10 },
        { header: 'APG', key: 'apg', width: 10 },
        { header: 'SPG', key: 'spg', width: 10 },
        { header: 'BPG', key: 'bpg', width: 10 },
        { header: 'FG%', key: 'fg_percentage', width: 10 },
      ]
      
      // Apply header styles
      sheet.getRow(1).font = headerStyle.font
      sheet.getRow(1).fill = headerStyle.fill
      sheet.getRow(1).alignment = headerStyle.alignment
      
      if (data.players && Array.isArray(data.players)) {
        data.players.forEach((player: any) => {
          sheet.addRow({
            name: player.name,
            team_name: player.team_name,
            games: player.games_played || 0,
            ppg: player.ppg?.toFixed(1) || '0.0',
            rpg: player.rpg?.toFixed(1) || '0.0',
            apg: player.apg?.toFixed(1) || '0.0',
            spg: player.spg?.toFixed(1) || '0.0',
            bpg: player.bpg?.toFixed(1) || '0.0',
            fg_percentage: player.fg_percentage ? (player.fg_percentage * 100).toFixed(1) + '%' : '0.0%',
          })
        })
      }
      break
    
    case 'game_results':
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Time', key: 'time', width: 10 },
        { header: 'Venue', key: 'venue', width: 20 },
        { header: 'Home Team', key: 'home_team', width: 20 },
        { header: 'Home Score', key: 'home_score', width: 12 },
        { header: 'Away Team', key: 'away_team', width: 20 },
        { header: 'Away Score', key: 'away_score', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
      ]
      
      // Apply header styles
      sheet.getRow(1).font = headerStyle.font
      sheet.getRow(1).fill = headerStyle.fill
      sheet.getRow(1).alignment = headerStyle.alignment
      
      if (data.games && Array.isArray(data.games)) {
        data.games.forEach((game: any) => {
          const gameDate = new Date(game.scheduled_at)
          sheet.addRow({
            date: gameDate.toLocaleDateString(),
            time: gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            venue: game.venue,
            home_team: game.home_team_name,
            home_score: game.home_score,
            away_team: game.away_team_name,
            away_score: game.away_score,
            status: game.status,
          })
        })
      }
      break
  }
  
  // Auto-fit columns
  sheet.columns.forEach(column => {
    if (column.values) {
      let maxLength = 0
      column.values.forEach((value: any) => {
        const length = value ? value.toString().length : 0
        if (length > maxLength) {
          maxLength = length
        }
      })
      column.width = Math.min(maxLength + 2, 50)
    }
  })
  
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// Helper function to generate CSV report
function generateCSVReport(data: any, reportType: string): string {
  let csv = ''
  
  switch (reportType) {
    case 'team_stats':
      csv = 'Team Name,Wins,Losses,Points For,Points Against,Win %\n'
      if (data.teams && Array.isArray(data.teams)) {
        data.teams.forEach((team: any) => {
          const winPct = ((team.wins / (team.wins + team.losses || 1)) * 100).toFixed(1)
          csv += `"${team.name}",${team.wins},${team.losses},${team.points_for},${team.points_against},${winPct}%\n`
        })
      }
      break
    
    case 'player_stats':
      csv = 'Player Name,Team,Games,PPG,RPG,APG,SPG,BPG,FG%\n'
      if (data.players && Array.isArray(data.players)) {
        data.players.forEach((player: any) => {
          const fgPct = player.fg_percentage ? (player.fg_percentage * 100).toFixed(1) : '0.0'
          csv += `"${player.name}","${player.team_name}",${player.games_played || 0},`
          csv += `${player.ppg?.toFixed(1) || '0.0'},${player.rpg?.toFixed(1) || '0.0'},`
          csv += `${player.apg?.toFixed(1) || '0.0'},${player.spg?.toFixed(1) || '0.0'},`
          csv += `${player.bpg?.toFixed(1) || '0.0'},${fgPct}%\n`
        })
      }
      break
    
    case 'game_results':
      csv = 'Date,Time,Venue,Home Team,Home Score,Away Team,Away Score,Status\n'
      if (data.games && Array.isArray(data.games)) {
        data.games.forEach((game: any) => {
          const gameDate = new Date(game.scheduled_at)
          csv += `${gameDate.toLocaleDateString()},${gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},`
          csv += `"${game.venue}","${game.home_team_name}",${game.home_score},`
          csv += `"${game.away_team_name}",${game.away_score},"${game.status}"\n`
        })
      }
      break
  }
  
  return csv
}

// POST /api/reports/generate - Generate a report
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify token
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Check rate limit
    if (!checkReportRateLimit(decodedToken.userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 reports per hour.' },
        { status: 429 }
      )
    }
    
    // Check permissions based on report type
    const body = await request.json()
    const validatedData = GenerateReportSchema.parse(body)
    
    // Financial reports require admin access
    if (validatedData.report_type === 'financial' && 
        !hasPermission(decodedToken.role, 'league-admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions for financial reports' },
        { status: 403 }
      )
    }
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Fetch data based on report type
    let reportData: any = {}
    
    switch (validatedData.report_type) {
      case 'team_stats':
        let teamQuery = supabase
          .from('teams')
          .select('*')
        
        if (validatedData.league_id) {
          teamQuery = teamQuery.eq('league_id', validatedData.league_id)
        }
        if (validatedData.team_id) {
          teamQuery = teamQuery.eq('id', validatedData.team_id)
        }
        
        const { data: teams } = await teamQuery
        reportData.teams = teams
        break
      
      case 'player_stats':
        let playerQuery = supabase
          .from('players')
          .select(`
            *,
            user:users(name),
            team:teams(name)
          `)
        
        if (validatedData.team_id) {
          playerQuery = playerQuery.eq('team_id', validatedData.team_id)
        }
        
        const { data: players } = await playerQuery
        
        // Calculate player statistics
        reportData.players = players?.map((player: any) => ({
          name: player.user?.name || 'Unknown',
          team_name: player.team?.name || 'No Team',
          games_played: player.stats?.games_played || 0,
          ppg: player.stats?.total_points / (player.stats?.games_played || 1) || 0,
          rpg: player.stats?.total_rebounds / (player.stats?.games_played || 1) || 0,
          apg: player.stats?.total_assists / (player.stats?.games_played || 1) || 0,
          spg: player.stats?.total_steals / (player.stats?.games_played || 1) || 0,
          bpg: player.stats?.total_blocks / (player.stats?.games_played || 1) || 0,
          fg_percentage: player.stats?.field_goals_made / (player.stats?.field_goals_attempted || 1) || 0,
        }))
        break
      
      case 'game_results':
        let gameQuery = supabase
          .from('games')
          .select(`
            *,
            home_team:teams!games_home_team_id_fkey(name),
            away_team:teams!games_away_team_id_fkey(name)
          `)
        
        if (validatedData.league_id) {
          gameQuery = gameQuery.eq('league_id', validatedData.league_id)
        }
        if (validatedData.date_from) {
          gameQuery = gameQuery.gte('scheduled_at', validatedData.date_from)
        }
        if (validatedData.date_to) {
          gameQuery = gameQuery.lte('scheduled_at', validatedData.date_to)
        }
        
        const { data: games } = await gameQuery.order('scheduled_at', { ascending: false })
        
        reportData.games = games?.map((game: any) => ({
          ...game,
          home_team_name: game.home_team?.name,
          away_team_name: game.away_team?.name,
        }))
        break
      
      case 'financial':
        // Get payment data
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, type, status, created_at')
          .eq('status', 'succeeded')
        
        const { data: refunds } = await supabase
          .from('refunds')
          .select('amount, created_at')
          .eq('status', 'completed')
        
        const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
        const totalRefunds = refunds?.reduce((sum, r) => sum + r.amount, 0) || 0
        
        reportData.financial = {
          total_revenue: totalRevenue,
          registration_fees: payments?.filter(p => p.type === 'registration')
            .reduce((sum, p) => sum + p.amount, 0) || 0,
          tournament_fees: payments?.filter(p => p.type === 'tournament')
            .reduce((sum, p) => sum + p.amount, 0) || 0,
          total_refunds: totalRefunds,
          net_revenue: totalRevenue - totalRefunds,
        }
        break
    }
    
    // Generate report in requested format
    let reportContent: Buffer | string
    let contentType: string
    let fileName: string
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseFileName = `${validatedData.report_type}_${timestamp}`
    
    switch (validatedData.format) {
      case 'pdf':
        reportContent = await generatePDFReport(reportData, validatedData.report_type)
        contentType = 'application/pdf'
        fileName = `${baseFileName}.pdf`
        break
      
      case 'excel':
        reportContent = await generateExcelReport(reportData, validatedData.report_type)
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        fileName = `${baseFileName}.xlsx`
        break
      
      case 'csv':
        reportContent = generateCSVReport(reportData, validatedData.report_type)
        contentType = 'text/csv'
        fileName = `${baseFileName}.csv`
        break
      
      case 'json':
        reportContent = JSON.stringify(reportData, null, 2)
        contentType = 'application/json'
        fileName = `${baseFileName}.json`
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid format' },
          { status: 400 }
        )
    }
    
    // Log report generation
    await supabase
      .from('report_history')
      .insert({
        report_type: validatedData.report_type,
        format: validatedData.format,
        generated_by: decodedToken.userId,
        parameters: {
          league_id: validatedData.league_id,
          team_id: validatedData.team_id,
          date_from: validatedData.date_from,
          date_to: validatedData.date_to,
        },
        file_name: fileName,
        created_at: new Date().toISOString(),
      })
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'report.generated',
        resource_type: 'report',
        resource_id: fileName,
        details: {
          report_type: validatedData.report_type,
          format: validatedData.format,
        },
        created_at: new Date().toISOString(),
      })
    
    // Return the report file
    return new NextResponse(reportContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}