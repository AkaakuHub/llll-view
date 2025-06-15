import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { SometoolService } from './sometool.service';

@Controller('sometool')
export class SometoolController {
  constructor(private readonly sometoolService: SometoolService) {}

  @Get('status')
  async getStatus() {
    return await this.sometoolService.checkSometoolStatus();
  }

  @Post('build')
  async buildSometool() {
    return await this.sometoolService.buildSometool();
  }

  @Post('run')
  async runSometool(@Body() body: { analyze?: boolean; dbonly?: boolean }) {
    return await this.sometoolService.runSometool(body);
  }

  @Get('run')
  async runSometoolGet(
    @Query('analyze') analyze?: string,
    @Query('dbonly') dbonly?: string,
  ) {
    return await this.sometoolService.runSometool({
      analyze: analyze === 'true',
      dbonly: dbonly === 'true',
    });
  }

  @Get('acb/status')
  async getAcbExtractorStatus() {
    return await this.sometoolService.checkAcbExtractorStatus();
  }

  @Post('acb/extract')
  async extractAcb(@Body() body: { filePath: string; outputDir?: string }) {
    return await this.sometoolService.extractAcbFile(body.filePath, body.outputDir);
  }

  @Get('acb/list')
  async listAcbFiles() {
    return await this.sometoolService.listAcbFiles();
  }
}