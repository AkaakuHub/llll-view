import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class SometoolService {
  private readonly sometoolPath: string;
  private readonly acbExtractorPath: string;
  private readonly cachePlainPath: string;

  constructor() {
    if (!process.env.SOME_TOOL_PATH) {
      throw new Error('SOME_TOOL_PATH environment variable is required');
    }
    this.sometoolPath = process.env.SOME_TOOL_PATH;
    this.acbExtractorPath = path.join(__dirname, '../../../..', 'llll-tools', 'ACBExtractor');
    this.cachePlainPath = path.join(this.sometoolPath, 'cache', 'plain');
  }

  async runSometool(options: {
    analyze?: boolean;
    dbonly?: boolean;
  } = {}): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      let command = 'cd ' + this.sometoolPath + ' && ./sometool';
      
      if (options.analyze) {
        command += ' --analyze';
      } else if (options.dbonly) {
        command += ' --dbonly';
      }

      console.log('Executing command:', command);
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
      
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  async checkSometoolStatus(): Promise<{ exists: boolean; built: boolean }> {
    try {
      const { stdout } = await execAsync(`ls -la ${this.sometoolPath}`);
      const exists = stdout.includes('sometool');
      const built = stdout.includes('./sometool');
      
      return { exists, built };
    } catch (error) {
      return { exists: false, built: false };
    }
  }

  async buildSometool(): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      const command = `cd ${this.sometoolPath} && go build .`;
      console.log('Building sometool:', command);
      const { stdout, stderr } = await execAsync(command);
      
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  async checkAcbExtractorStatus(): Promise<{ exists: boolean; ready: boolean }> {
    try {
      const exists = fs.existsSync(this.acbExtractorPath);
      if (!exists) {
        return { exists: false, ready: false };
      }

      const files = fs.readdirSync(this.acbExtractorPath);
      const ready = files.some(file => file.includes('acb') && (file.endsWith('.exe') || file.endsWith('.py')));
      
      return { exists, ready };
    } catch (error) {
      return { exists: false, ready: false };
    }
  }

  async listAcbFiles(): Promise<{ files: Array<{ name: string; size: number; path: string }> }> {
    try {
      if (!fs.existsSync(this.cachePlainPath)) {
        return { files: [] };
      }

      const files = fs.readdirSync(this.cachePlainPath)
        .filter(file => file.endsWith('.acb'))
        .map(file => {
          const filePath = path.join(this.cachePlainPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            path: filePath
          };
        });

      return { files };
    } catch (error) {
      return { files: [] };
    }
  }

  async extractAcbFile(filePath: string, outputDir?: string): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      const resolvedOutputDir = outputDir || path.join(this.cachePlainPath, 'extracted');
      
      if (!fs.existsSync(resolvedOutputDir)) {
        fs.mkdirSync(resolvedOutputDir, { recursive: true });
      }

      return {
        success: true,
        output: `Mock ACB extraction completed for ${path.basename(filePath)}. Output directory: ${resolvedOutputDir}`,
        error: undefined,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }
}