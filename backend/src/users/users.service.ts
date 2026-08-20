import { Injectable } from '@nestjs/common';
import { PasswordService } from '../auth/password.service';
import { UsersRepository } from './users.repository';
import { RegisterDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private repo: UsersRepository,
    private passwords: PasswordService,
  ) {}

  listAll() {
    return this.repo.all();
  }

  findById(id: bigint) {
    return this.repo.findById(id);
  }

  async register(dto: RegisterDto) {
    const { password, ...rest } = dto;
    const hashed = await this.passwords.hash(password);
    return this.repo.create({ ...rest, password: hashed });
  }

  update(id: bigint, dto: UpdateUserDto) {
    return this.repo.update(id, dto);
  }

  remove(id: bigint) {
    return this.repo.remove(id);
  }
}
