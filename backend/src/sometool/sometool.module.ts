import { Module } from '@nestjs/common';
import { SometoolController } from './sometool.controller';
import { SometoolService } from './sometool.service';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [SometoolController, FileController, DatabaseController],
  providers: [SometoolService, FileService, DatabaseService],
})
export class SometoolModule {}