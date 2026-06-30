import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '@tj-edu/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileFilterOptionsDto } from './dto/file-filter-options.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { FilesService } from './files.service';

interface UploadPayload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface PassthroughResponse {
  setHeader(name: string, value: string): void;
}

@Controller('files')
@Roles('admin', 'academic_admin', 'teacher')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('filters')
  getFilterOptions(@Query() query: FileFilterOptionsDto) {
    return this.filesService.getFilterOptions(query);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListFilesDto) {
    return this.filesService.list(user, query);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadPayload | undefined,
    @Body() dto: UploadFileDto
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件。');
    }

    return this.filesService.upload(user, file, dto);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.filesService.getById(user, id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) response: PassthroughResponse
  ) {
    const file = await this.filesService.open(user, id);
    response.setHeader('Content-Type', file.metadata.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.metadata.name)}`
    );
    response.setHeader('Content-Length', String(file.metadata.size));
    return new StreamableFile(file.stream);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.filesService.remove(user, id);
  }
}
