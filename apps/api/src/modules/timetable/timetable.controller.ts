import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { ListLessonsDto } from './dto/list-lessons.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { TimetableService } from './timetable.service';

@Controller('timetable')
@Roles('admin', 'academic_admin', 'teacher')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get('filters')
  getFilterOptions(@CurrentUser() user: AuthUser) {
    return this.timetableService.getFilterOptions(user);
  }

  @Get('lessons')
  list(@CurrentUser() user: AuthUser, @Query() query: ListLessonsDto) {
    return this.timetableService.list(user, query);
  }

  @Get('lessons/:id')
  getById(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.timetableService.getById(user, id);
  }

  @Post('periods')
  createTimetable(@CurrentUser() user: AuthUser, @Body() dto: CreateTimetableDto) {
    return this.timetableService.createTimetable(user, dto);
  }

  @Post('lessons')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLessonDto) {
    return this.timetableService.create(user, dto);
  }

  @Patch('lessons/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLessonDto
  ) {
    return this.timetableService.update(user, id, dto);
  }
}
