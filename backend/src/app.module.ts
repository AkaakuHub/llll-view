import { Module } from '@nestjs/common';
import { SometoolModule } from './sometool/sometool.module';

@Module({
  imports: [SometoolModule],
})
export class AppModule {}