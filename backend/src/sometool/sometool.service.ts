import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class SometoolService {
  private readonly sometoolPath: string;

  constructor() {
    if (!process.env.SOME_TOOL_PATH) {
      throw new Error('SOME_TOOL_PATH environment variable is required');
    }
    this.sometoolPath = process.env.SOME_TOOL_PATH;
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
}