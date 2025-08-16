import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game } from './entities/game.entity';
import { GameScore } from './entities/game-score.entity';
import { GameStatistics } from './entities/game-statistics.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, GameScore, GameStatistics])
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService]
})
export class GamesModule {}