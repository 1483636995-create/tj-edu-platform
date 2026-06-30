import { Module } from '@nestjs/common';
import { FileStorage } from './file-storage';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { LocalFileStorageService } from './local-file-storage.service';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    LocalFileStorageService,
    { provide: FileStorage, useExisting: LocalFileStorageService }
  ]
})
export class FilesModule {}
