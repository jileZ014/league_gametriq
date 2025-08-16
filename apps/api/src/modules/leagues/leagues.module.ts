import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaguesService } from './leagues.service';
import { LeaguesController } from './leagues.controller';
import { League } from './entities/league.entity';
import { Division } from './entities/division.entity';
import { Season } from './entities/season.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([League, Division, Season])
  ],
  controllers: [LeaguesController],
  providers: [LeaguesService],
  exports: [LeaguesService]
})
export class LeaguesModule {}