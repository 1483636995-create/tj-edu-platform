import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListStudentsDto } from './dto/list-students.dto';
import { UpdateMistakeDto } from './dto/update-mistake.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { StudentsService } from './students.service';

@Controller('students')
@Roles('admin', 'academic_admin', 'teacher', 'student')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('filters')
  getFilterOptions() {
    return this.studentsService.getFilterOptions();
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListStudentsDto) {
    return this.studentsService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.studentsService.getById(user, id);
  }

  @Patch(':id/profile')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentProfileDto
  ) {
    return this.studentsService.updateProfile(user, id, dto);
  }

  @Patch(':studentId/mistakes/:mistakeId')
  updateMistake(
    @CurrentUser() user: AuthUser,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Param('mistakeId', new ParseUUIDPipe()) mistakeId: string,
    @Body() dto: UpdateMistakeDto
  ) {
    return this.studentsService.updateMistake(user, studentId, mistakeId, dto);
  }
}
