import { Injectable } from '@nestjs/common';
import { readdir, readFile, stat } from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly sometoolPath: string;

  constructor() {
    if (!process.env.SOME_TOOL_PATH) {
      throw new Error('SOME_TOOL_PATH environment variable is required');
    }
    this.sometoolPath = process.env.SOME_TOOL_PATH;
  }

  async listFiles(relativePath?: string): Promise<any> {
    try {
      const targetPath = relativePath 
        ? path.join(this.sometoolPath, relativePath)
        : this.sometoolPath;

      const items = await readdir(targetPath);
      const result = [];

      for (const item of items) {
        const itemPath = path.join(targetPath, item);
        const stats = await stat(itemPath);
        
        result.push({
          name: item,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          path: relativePath ? path.join(relativePath, item) : item,
        });
      }

      // Add total count for assets directory
      let totalAssets = 0;
      if (relativePath === 'cache/assets') {
        totalAssets = result.filter(item => item.type === 'file').length;
      }

      return {
        currentPath: relativePath || '',
        items: result.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        }),
        totalAssets: totalAssets || undefined,
      };
    } catch (error) {
      return {
        error: error.message,
        currentPath: relativePath || '',
        items: [],
      };
    }
  }

  async getFileContent(filename: string): Promise<any> {
    try {
      const filePath = path.join(this.sometoolPath, filename);
      const stats = await stat(filePath);

      if (stats.isDirectory()) {
        return { error: 'Path is a directory', type: 'directory' };
      }

      // Check file size (limit to 10MB for safety)
      if (stats.size > 10 * 1024 * 1024) {
        return { 
          error: 'File too large to display', 
          size: stats.size,
          type: 'file' 
        };
      }

      const content = await readFile(filePath, 'utf-8');
      const extension = path.extname(filename).toLowerCase();

      return {
        filename,
        size: stats.size,
        modified: stats.mtime,
        content,
        type: this.getFileType(extension),
        extension,
      };
    } catch (error) {
      return {
        error: error.message,
        filename,
      };
    }
  }

  async getCatalog(): Promise<any> {
    try {
      const catalogPath = path.join(this.sometoolPath, 'cache', 'catalog.json');
      const content = await readFile(catalogPath, 'utf-8');
      const catalog = JSON.parse(content);

      // Return first 100 items for performance
      return {
        total: catalog.length,
        items: catalog.slice(0, 100),
        hasMore: catalog.length > 100,
      };
    } catch (error) {
      return {
        error: error.message,
        total: 0,
        items: [],
        hasMore: false,
      };
    }
  }

  async getAssetStats(): Promise<any> {
    try {
      const assetsPath = path.join(this.sometoolPath, 'cache', 'assets');
      const catalogPath = path.join(this.sometoolPath, 'cache', 'catalog.json');
      
      let downloadedCount = 0;
      let totalSize = 0;
      let totalExpected = 0;

      try {
        const assetFiles = await readdir(assetsPath);
        downloadedCount = assetFiles.length;

        // Calculate total size
        for (const file of assetFiles) {
          const filePath = path.join(assetsPath, file);
          const stats = await stat(filePath);
          totalSize += stats.size;
        }
      } catch (error) {
        // Assets directory doesn't exist yet
      }

      // Get expected total from catalog
      try {
        const catalogContent = await readFile(catalogPath, 'utf-8');
        const catalog = JSON.parse(catalogContent);
        totalExpected = catalog.length;
      } catch (error) {
        // Catalog doesn't exist yet
      }

      return {
        downloaded: downloadedCount,
        totalExpected,
        totalSize,
        progress: totalExpected > 0 ? (downloadedCount / totalExpected * 100).toFixed(1) : 0,
        formattedSize: this.formatFileSize(totalSize),
      };
    } catch (error) {
      return {
        error: error.message,
        downloaded: 0,
        totalExpected: 0,
        totalSize: 0,
        progress: 0,
      };
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getFileType(extension: string): string {
    switch (extension) {
      case '.json':
        return 'json';
      case '.txt':
      case '.log':
        return 'text';
      case '.md':
        return 'markdown';
      case '.go':
        return 'go';
      case '.js':
      case '.ts':
        return 'javascript';
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
        return 'image';
      default:
        return 'unknown';
    }
  }
}