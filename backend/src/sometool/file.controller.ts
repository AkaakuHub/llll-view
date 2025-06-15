import { Controller, Get, Query, Param } from '@nestjs/common';
import { FileService } from './file.service';

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('list')
  async listFiles(@Query('path') path?: string) {
    return await this.fileService.listFiles(path);
  }

  @Get('content/:filename')
  async getFileContent(@Param('filename') filename: string) {
    return await this.fileService.getFileContent(filename);
  }

  @Get('catalog')
  async getCatalog() {
    return await this.fileService.getCatalog();
  }

  @Get('assets/stats')
  async getAssetStats() {
    return await this.fileService.getAssetStats();
  }
}