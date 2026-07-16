import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { HandoutsModule } from './modules/handouts/handouts.module';
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
    HandoutsModule,
    TimetableModule,
    StudentsModule
  ]
})
export class AppModule {}
