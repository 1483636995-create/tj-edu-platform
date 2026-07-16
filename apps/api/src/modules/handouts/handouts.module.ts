import { Module } from '@nestjs/common';
import { HandoutsController } from './handouts.controller';
import { HandoutsService } from './handouts.service';

@Module({
  controllers: [HandoutsController],
  providers: [HandoutsService]
})
export class HandoutsModule {}
