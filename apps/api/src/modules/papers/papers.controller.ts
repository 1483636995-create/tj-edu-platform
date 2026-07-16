import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListPapersDto } from './dto/list-papers.dto';
import { PaperBuilderFilterOptionsDto } from './dto/paper-builder-filter-options.dto';
import { UpsertPaperDto } from './dto/upsert-paper.dto';
import { PapersService } from './papers.service';

@Controller('papers')
@Roles('admin', 'academic_admin', 'teacher')
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Get('filters')
  getFilterOptions(@CurrentUser() user: AuthUser, @Query() query: PaperBuilderFilterOptionsDto) {
    return this.papersService.getFilterOptions(user, query);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListPapersDto) {
    return this.papersService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.papersService.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertPaperDto) {
    return this.papersService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpsertPaperDto
  ) {
    return this.papersService.update(user, id, dto);
  }
}
