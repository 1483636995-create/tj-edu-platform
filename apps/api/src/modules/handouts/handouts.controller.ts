import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { HandoutFilterOptionsDto } from './dto/handout-filter-options.dto';
import { ListHandoutsDto } from './dto/list-handouts.dto';
import { UpsertHandoutDto } from './dto/upsert-handout.dto';
import { HandoutsService } from './handouts.service';

@Controller('handouts')
@Roles('admin', 'academic_admin', 'teacher')
export class HandoutsController {
  constructor(private readonly handoutsService: HandoutsService) {}

  @Get('filters')
  getFilterOptions(@CurrentUser() user: AuthUser, @Query() query: HandoutFilterOptionsDto) {
    return this.handoutsService.getFilterOptions(user, query);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListHandoutsDto) {
    return this.handoutsService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.handoutsService.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertHandoutDto) {
    return this.handoutsService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpsertHandoutDto
  ) {
    return this.handoutsService.update(user, id, dto);
  }
}
