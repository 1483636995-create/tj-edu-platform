import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { StudentsModule } from './modules/students/students.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    QuestionsModule,
    FilesModule,
    TimetableModule,
    StudentsModule
  ]
})
export class AppModule {}
