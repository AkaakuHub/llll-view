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

  async getCatalog(search?: string, limit = 100, offset = 0): Promise<any> {
    try {
      const catalogPath = path.join(this.sometoolPath, 'cache', 'catalog.json');
      const content = await readFile(catalogPath, 'utf-8');
      let catalog = JSON.parse(content);

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        catalog = catalog.filter((item: any) => 
          (item.name && item.name.toLowerCase().includes(searchLower)) ||
          (item.hash && item.hash.toLowerCase().includes(searchLower)) ||
          (item.path && item.path.toLowerCase().includes(searchLower))
        );
      }

      const total = catalog.length;
      const items = catalog.slice(offset, offset + limit);

      return {
        total,
        items,
        hasMore: offset + limit < total,
        offset,
        limit,
        search: search || null,
      };
    } catch (error) {
      return {
        error: error.message,
        total: 0,
        items: [],
        hasMore: false,
        offset: 0,
        limit,
        search: search || null,
      };
    }
  }

  async searchFiles(query: string, fileTypes?: string[]): Promise<any> {
    try {
      const plainPath = path.join(this.sometoolPath, 'cache', 'plain');
      
      if (!await this.pathExists(plainPath)) {
        return {
          error: 'Plain cache directory not found',
          results: [],
          total: 0,
        };
      }

      const results = [];
      const files = await readdir(plainPath);
      const queryLower = query.toLowerCase();

      for (const file of files) {
        const filePath = path.join(plainPath, file);
        const stats = await stat(filePath);
        
        if (stats.isFile()) {
          const extension = path.extname(file).toLowerCase();
          
          // Filter by file types if specified
          if (fileTypes && fileTypes.length > 0) {
            const matchesType = fileTypes.some(type => {
              switch (type) {
                case 'audio':
                  return ['.acb', '.wav', '.mp3', '.ogg'].includes(extension);
                case 'video':
                  return ['.usm', '.mp4', '.avi', '.mov'].includes(extension);
                case 'bundle':
                  return extension === '.assetbundle';
                case 'image':
                  return ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(extension);
                default:
                  return extension === `.${type}`;
              }
            });
            
            if (!matchesType) continue;
          }

          // Check if filename matches query
          if (file.toLowerCase().includes(queryLower)) {
            results.push({
              name: file,
              path: path.join('cache', 'plain', file),
              size: stats.size,
              modified: stats.mtime,
              type: this.getAssetType(extension),
              extension,
            });
          }
        }
      }

      return {
        results: results.slice(0, 200), // Limit results for performance
        total: results.length,
        query,
        fileTypes: fileTypes || [],
      };
    } catch (error) {
      return {
        error: error.message,
        results: [],
        total: 0,
        query,
        fileTypes: fileTypes || [],
      };
    }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  private getAssetType(extension: string): string {
    switch (extension) {
      case '.acb':
        return 'audio';
      case '.usm':
        return 'video';
      case '.assetbundle':
        return 'bundle';
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.bmp':
        return 'image';
      default:
        return 'unknown';
    }
  }

  async getAssetStats(): Promise<any> {
    try {
      const plainPath = path.join(this.sometoolPath, 'cache', 'plain');
      const catalogPath = path.join(this.sometoolPath, 'cache', 'catalog.json');
      
      let downloadedCount = 0;
      let totalSize = 0;
      let totalExpected = 0;

      // Count files in plain directory (these are the actual extracted assets)
      try {
        const plainFiles = await readdir(plainPath);
        downloadedCount = plainFiles.length;

        // Calculate total size
        for (const file of plainFiles) {
          const filePath = path.join(plainPath, file);
          const stats = await stat(filePath);
          totalSize += stats.size;
        }
      } catch (error) {
        // Plain directory doesn't exist yet
      }

      // Get expected total from catalog
      try {
        const catalogContent = await readFile(catalogPath, 'utf-8');
        const catalog = JSON.parse(catalogContent);
        totalExpected = catalog.length;
      } catch (error) {
        // Catalog doesn't exist yet
      }

      // Also get asset bundle counts for more detailed stats
      let assetBundleCount = 0;
      let storyFileCount = 0;
      let audioFileCount = 0;
      let otherFileCount = 0;

      try {
        const plainFiles = await readdir(plainPath);
        for (const file of plainFiles) {
          if (file.endsWith('.assetbundle')) {
            assetBundleCount++;
          } else if (file.startsWith('story_main_') && file.endsWith('.txt')) {
            storyFileCount++;
          } else if (file.endsWith('.acb') || file.endsWith('.awb')) {
            audioFileCount++;
          } else {
            otherFileCount++;
          }
        }
      } catch (error) {
        // Handle error silently
      }

      return {
        downloaded: downloadedCount,
        totalExpected,
        totalSize,
        progress: totalExpected > 0 ? (downloadedCount / totalExpected * 100).toFixed(1) : 0,
        formattedSize: this.formatFileSize(totalSize),
        breakdown: {
          assetBundles: assetBundleCount,
          storyFiles: storyFileCount,
          audioFiles: audioFileCount,
          otherFiles: otherFileCount
        }
      };
    } catch (error) {
      return {
        error: error.message,
        downloaded: 0,
        totalExpected: 0,
        totalSize: 0,
        progress: 0,
        breakdown: {
          assetBundles: 0,
          storyFiles: 0,
          audioFiles: 0,
          otherFiles: 0
        }
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