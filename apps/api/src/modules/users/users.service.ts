import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password if provided
    if (createUserDto.password) {
      const pepper = this.configService.get('security.pepper');
      createUserDto.password = await bcrypt.hash(
        createUserDto.password + pepper,
        this.configService.get('security.bcryptRounds'),
      );
    }

    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(organizationId?: string): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (organizationId) {
      query.where('user.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Don't allow password updates through this method
    delete updateUserDto.password;

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async findByRole(role: string, organizationId?: string): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user');
    
    query.where('user.role = :role', { role });
    
    if (organizationId) {
      query.andWhere('user.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  async findChildren(parentId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { parentEmail: parentId },
    });
  }

  async updateLastLogin(id: string, ipAddress?: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      // lastLoginIp: ipAddress,
    });
  }

  async activateUser(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = true;
    user.emailVerifiedAt = new Date();
    return this.userRepository.save(user);
  }

  async deactivateUser(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = false;
    return this.userRepository.save(user);
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.userRepository.count({
      where: { organizationId },
    });
  }
}