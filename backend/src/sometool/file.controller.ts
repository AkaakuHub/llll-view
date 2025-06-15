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
  async getCatalog(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return await this.fileService.getCatalog(search, parsedLimit, parsedOffset);
  }

  @Get('assets/stats')
  async getAssetStats() {
    return await this.fileService.getAssetStats();
  }

  @Get('search')
  async searchFiles(
    @Query('q') query: string,
    @Query('types') types?: string,
  ) {
    const fileTypes = types ? types.split(',') : undefined;
    return await this.fileService.searchFiles(query, fileTypes);
  }
}