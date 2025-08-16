import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { TeamStanding } from './entities/team-standing.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(TeamStanding)
    private teamStandingRepository: Repository<TeamStanding>,
  ) {}

  async findAll(filters?: any) {
    const query = this.teamRepository.createQueryBuilder('team');
    
    if (filters?.leagueId) {
      query.andWhere('team.leagueId = :leagueId', { leagueId: filters.leagueId });
    }
    
    if (filters?.divisionId) {
      query.andWhere('team.divisionId = :divisionId', { divisionId: filters.divisionId });
    }
    
    if (filters?.seasonId) {
      query.andWhere('team.seasonId = :seasonId', { seasonId: filters.seasonId });
    }
    
    return query.getMany();
  }

  async findOne(id: string) {
    return this.teamRepository.findOne({ 
      where: { id },
      relations: ['members']
    });
  }

  async create(data: any) {
    const team = this.teamRepository.create(data);
    return this.teamRepository.save(team);
  }

  async update(id: string, data: any) {
    await this.teamRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.teamRepository.delete(id);
  }

  async addMember(teamId: string, memberData: any) {
    const member = this.teamMemberRepository.create({
      ...memberData,
      teamId
    });
    return this.teamMemberRepository.save(member);
  }

  async removeMember(teamId: string, memberId: string) {
    await this.teamMemberRepository.delete({ teamId, id: memberId });
  }

  async getMembers(teamId: string) {
    return this.teamMemberRepository.find({ where: { teamId } });
  }

  async updateMember(teamId: string, memberId: string, data: any) {
    await this.teamMemberRepository.update(
      { teamId, id: memberId },
      data
    );
    return this.teamMemberRepository.findOne({ 
      where: { teamId, id: memberId } 
    });
  }

  async getStandings(leagueId: string, divisionId?: string) {
    const query = this.teamStandingRepository.createQueryBuilder('standing')
      .leftJoinAndSelect('standing.team', 'team')
      .where('standing.leagueId = :leagueId', { leagueId });
    
    if (divisionId) {
      query.andWhere('standing.divisionId = :divisionId', { divisionId });
    }
    
    return query
      .orderBy('standing.points', 'DESC')
      .addOrderBy('standing.wins', 'DESC')
      .addOrderBy('standing.pointDifferential', 'DESC')
      .getMany();
  }

  async updateStandings(teamId: string, data: any) {
    const standing = await this.teamStandingRepository.findOne({ 
      where: { teamId } 
    });
    
    if (standing) {
      await this.teamStandingRepository.update(standing.id, data);
    } else {
      const newStanding = this.teamStandingRepository.create({
        ...data,
        teamId
      });
      await this.teamStandingRepository.save(newStanding);
    }
    
    return this.teamStandingRepository.findOne({ where: { teamId } });
  }
}