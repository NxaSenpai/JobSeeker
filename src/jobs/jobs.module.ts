import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../account/entities/company.entity';
import { Job } from '../account/entities/job.entity';
import { JobService } from '../account/job.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Job])],
  providers: [JobService],
  exports: [JobService],
})
export class JobsModule {}
