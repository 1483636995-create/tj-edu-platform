import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile
} from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { HandoutFilterOptionsDto } from './dto/handout-filter-options.dto';
import { ListHandoutsDto } from './dto/list-handouts.dto';
import { UpsertHandoutDto } from './dto/upsert-handout.dto';
import { HandoutsService } from './handouts.service';

interface PassthroughResponse {
  setHeader(name: string, value: string): void;
}

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

  @Get(':id/export')
  async export(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) response: PassthroughResponse
  ) {
    const exported = await this.handoutsService.exportMarkdown(user, id);
    const content = Buffer.from(exported.content, 'utf8');
    response.setHeader('Content-Type', exported.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(exported.filename)}`
    );
    response.setHeader('Content-Length', String(content.byteLength));
    return new StreamableFile(content);
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
