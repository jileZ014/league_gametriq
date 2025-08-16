import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { League } from './entities/league.entity';
import { Division } from './entities/division.entity';
import { Season } from './entities/season.entity';

@Injectable()
export class LeaguesService {
  constructor(
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
    @InjectRepository(Division)
    private divisionRepository: Repository<Division>,
    @InjectRepository(Season)
    private seasonRepository: Repository<Season>,
  ) {}

  async findAll() {
    return this.leagueRepository.find({ relations: ['divisions', 'seasons'] });
  }

  async findOne(id: string) {
    return this.leagueRepository.findOne({ 
      where: { id },
      relations: ['divisions', 'seasons']
    });
  }

  async create(data: any) {
    const league = this.leagueRepository.create(data);
    return this.leagueRepository.save(league);
  }

  async update(id: string, data: any) {
    await this.leagueRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.leagueRepository.delete(id);
  }

  async getDivisions(leagueId: string) {
    return this.divisionRepository.find({ where: { leagueId } });
  }

  async getSeasons(leagueId: string) {
    return this.seasonRepository.find({ where: { leagueId } });
  }

  async createDivision(leagueId: string, data: any) {
    const division = this.divisionRepository.create({ ...data, leagueId });
    return this.divisionRepository.save(division);
  }

  async createSeason(leagueId: string, data: any) {
    const season = this.seasonRepository.create({ ...data, leagueId });
    return this.seasonRepository.save(season);
  }
}