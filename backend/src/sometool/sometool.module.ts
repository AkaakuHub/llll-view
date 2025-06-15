import { Module } from '@nestjs/common';
import { SometoolController } from './sometool.controller';
import { SometoolService } from './sometool.service';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
  controllers: [SometoolController, FileController],
  providers: [SometoolService, FileService],
})
export class SometoolModule {}