import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { GameScore } from './entities/game-score.entity';
import { GameStatistics } from './entities/game-statistics.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(GameScore)
    private gameScoreRepository: Repository<GameScore>,
    @InjectRepository(GameStatistics)
    private gameStatisticsRepository: Repository<GameStatistics>,
  ) {}

  async findAll() {
    return this.gameRepository.find();
  }

  async findOne(id: string) {
    return this.gameRepository.findOne({ where: { id } });
  }

  async create(data: any) {
    const game = this.gameRepository.create(data);
    return this.gameRepository.save(game);
  }

  async update(id: string, data: any) {
    await this.gameRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.gameRepository.delete(id);
  }

  async updateScore(gameId: string, scoreData: any) {
    const score = await this.gameScoreRepository.findOne({ where: { gameId } });
    if (score) {
      await this.gameScoreRepository.update(score.id, scoreData);
    } else {
      const newScore = this.gameScoreRepository.create({ ...scoreData, gameId });
      await this.gameScoreRepository.save(newScore);
    }
    return this.gameScoreRepository.findOne({ where: { gameId } });
  }

  async getStatistics(gameId: string) {
    return this.gameStatisticsRepository.find({ where: { gameId } });
  }
}