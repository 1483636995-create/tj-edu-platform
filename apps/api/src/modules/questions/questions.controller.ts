import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsDto } from './dto/list-questions.dto';
import { QuestionFilterOptionsDto } from './dto/question-filter-options.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
@Roles('admin', 'academic_admin', 'teacher')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('filters')
  getFilterOptions(@CurrentUser() user: AuthUser, @Query() query: QuestionFilterOptionsDto) {
    return this.questionsService.getFilterOptions(user, query);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListQuestionsDto) {
    return this.questionsService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.questionsService.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuestionDto) {
    return this.questionsService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuestionDto
  ) {
    return this.questionsService.update(user, id, dto);
  }
}
