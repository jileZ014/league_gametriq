import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Tournament } from './entities/tournament.entity';
import { TournamentTeam } from './entities/tournament-team.entity';
import { TournamentMatch } from './entities/tournament-match.entity';
import { TournamentCourt } from './entities/tournament-court.entity';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { TournamentGateway } from './tournament.gateway';
import { BracketGeneratorService } from './services/bracket-generator.service';
import { ScheduleOptimizerService } from './services/schedule-optimizer.service';
import { CourtAssignerService } from './services/court-assigner.service';
import { WebSocketModule } from '../../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      TournamentTeam,
      TournamentMatch,
      TournamentCourt,
    ]),
    BullModule.registerQueue({
      name: 'tournament',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    WebSocketModule,
  ],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    TournamentGateway,
    BracketGeneratorService,
    ScheduleOptimizerService,
    CourtAssignerService,
  ],
  exports: [TournamentService],
})
export class TournamentModule {}