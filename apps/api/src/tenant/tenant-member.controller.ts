import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { MembershipRole } from '../authorization/authorization.types';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TenantMemberService } from './tenant-member.service';

@Controller('tenant/members')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class TenantMemberController {
  constructor(private readonly members: TenantMemberService) {}

  @Get()
  @RequirePermission('tenant.read')
  list() {
    return this.members.list();
  }

  @Get(':userId')
  @RequirePermission('tenant.read')
  get(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.members.get(userId);
  }

  @Post()
  @RequirePermission('tenant.manage')
  create(@Body() dto: CreateMemberDto) {
    return this.members.create(dto.userId, dto.role);
  }

  @Patch(':userId')
  @RequirePermission('tenant.manage')
  update(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.members.update(userId, dto.role);
  }

  @Delete(':userId')
  @RequirePermission('tenant.manage')
  async remove(@Param('userId', new ParseUUIDPipe()) userId: string): Promise<void> {
    await this.members.remove(userId);
  }
}
