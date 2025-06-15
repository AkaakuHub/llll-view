import { Injectable } from '@nestjs/common';
import { readFile, readdir } from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

@Injectable()
export class DatabaseService {
  private readonly sometoolPath: string;
  private readonly masterdataPath: string;

  constructor() {
    if (!process.env.SOME_TOOL_PATH) {
      throw new Error('SOME_TOOL_PATH environment variable is required');
    }
    this.sometoolPath = process.env.SOME_TOOL_PATH;
    this.masterdataPath = path.join(this.sometoolPath, 'masterdata');
  }

  async getDatabases(): Promise<{ databases: Array<{ name: string; type: string; description: string; recordCount?: number }> }> {
    try {
      const files = await readdir(this.masterdataPath);
      const databases = [];

      for (const file of files) {
        if (file.endsWith('.yaml')) {
          const name = file.replace('.yaml', '');
          let description = 'Game data';
          let recordCount = 0;

          try {
            const filePath = path.join(this.masterdataPath, file);
            const content = await readFile(filePath, 'utf-8');
            const data = yaml.load(content) as any[];
            
            if (Array.isArray(data)) {
              recordCount = data.length;
            }

            // Provide better descriptions for known tables
            if (name.includes('Adv')) {
              description = 'Adventure/Story data';
            } else if (name.includes('Story')) {
              description = 'Story content';
            } else if (name.includes('Character')) {
              description = 'Character information';
            } else if (name.includes('Music') || name.includes('Live')) {
              description = 'Music and Live data';
            } else if (name.includes('Card')) {
              description = 'Card game data';
            } else if (name.includes('Mission')) {
              description = 'Mission and quest data';
            }
          } catch (error) {
            // If we can't read the file, just use default values
          }

          databases.push({
            name,
            type: 'yaml',
            description,
            recordCount
          });
        }
      }

      return { databases: databases.sort((a, b) => a.name.localeCompare(b.name)) };
    } catch (error) {
      return { databases: [] };
    }
  }

  async getTableData(tableName: string, limit = 100, offset = 0, search?: string): Promise<any> {
    try {
      const filePath = path.join(this.masterdataPath, `${tableName}.yaml`);
      const content = await readFile(filePath, 'utf-8');
      const data = yaml.load(content) as any[];

      if (!Array.isArray(data)) {
        return {
          error: 'Invalid data format',
          data: [],
          total: 0,
          columns: []
        };
      }

      let filteredData = data;

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = data.filter(row => {
          return Object.values(row).some(value => 
            value && value.toString().toLowerCase().includes(searchLower)
          );
        });
      }

      // Get columns from first row
      const columns = data.length > 0 ? Object.keys(data[0]) : [];

      // Apply pagination
      const paginatedData = filteredData.slice(offset, offset + limit);

      return {
        data: paginatedData,
        total: filteredData.length,
        columns,
        tableName,
        limit,
        offset,
        search: search || null
      };
    } catch (error) {
      return {
        error: error.message,
        data: [],
        total: 0,
        columns: [],
        tableName,
        limit,
        offset,
        search: search || null
      };
    }
  }

  async searchStories(query: string, limit = 50): Promise<any> {
    try {
      const storyTables = ['AdvDatas', 'AdvStoryDigestMovies'];
      const results = [];

      for (const table of storyTables) {
        try {
          const filePath = path.join(this.masterdataPath, `${table}.yaml`);
          const content = await readFile(filePath, 'utf-8');
          const data = yaml.load(content) as any[];

          if (Array.isArray(data)) {
            const queryLower = query.toLowerCase();
            const matchedRows = data.filter(row => {
              return (row.Name && row.Name.toLowerCase().includes(queryLower)) ||
                     (row.Description && row.Description.toLowerCase().includes(queryLower)) ||
                     (row.ScriptId && row.ScriptId.toString().includes(queryLower));
            });

            for (const row of matchedRows) {
              results.push({
                table,
                ...row,
                storyType: this.getStoryType(table, row)
              });
            }
          }
        } catch (error) {
          // Skip tables that can't be read
        }
      }

      // Sort by relevance (exact matches first, then partial matches)
      const queryLower = query.toLowerCase();
      results.sort((a, b) => {
        const aExact = a.Name && a.Name.toLowerCase() === queryLower;
        const bExact = b.Name && b.Name.toLowerCase() === queryLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });

      return {
        results: results.slice(0, limit),
        total: results.length,
        query
      };
    } catch (error) {
      return {
        error: error.message,
        results: [],
        total: 0,
        query
      };
    }
  }

  private getStoryType(tableName: string, _row: any): string {
    if (tableName === 'AdvDatas') {
      return 'Adventure Story';
    } else if (tableName === 'AdvStoryDigestMovies') {
      return 'Story Digest Movie';
    }
    return 'Unknown';
  }

  async getStoryContent(storyId: string): Promise<any> {
    try {
      // Try to find the story in AdvDatas first
      const advFilePath = path.join(this.masterdataPath, 'AdvDatas.yaml');
      const advContent = await readFile(advFilePath, 'utf-8');
      const advData = yaml.load(advContent) as any[];

      if (Array.isArray(advData)) {
        const story = advData.find(row => 
          row.Id.toString() === storyId || 
          row.ScriptId.toString() === storyId
        );

        if (story) {
          // Try to load the actual story text
          const storyText = await this.loadStoryText(story.ScriptId || story.Id);
          
          return {
            found: true,
            story,
            storyType: 'Adventure Story',
            storyText,
            relatedStories: this.findRelatedStories(advData, story)
          };
        }
      }

      return {
        found: false,
        error: 'Story not found',
        storyId
      };
    } catch (error) {
      return {
        found: false,
        error: error.message,
        storyId
      };
    }
  }

  private async loadStoryText(scriptId: string): Promise<any> {
    try {
      const plainPath = path.join(this.sometoolPath, 'cache', 'plain');
      const storyFilePath = path.join(plainPath, `story_main_${scriptId}.txt`);
      
      try {
        const storyContent = await readFile(storyFilePath, 'utf-8');
        const parsedStory = this.parseStoryText(storyContent);
        return {
          found: true,
          content: parsedStory,
          rawContent: storyContent
        };
      } catch (fileError) {
        return {
          found: false,
          error: `Story text file not found: story_main_${scriptId}.txt`
        };
      }
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  private parseStoryText(content: string): any {
    const lines = content.split('\n');
    const parsedContent = {
      dialogue: [],
      actions: [],
      metadata: {
        characters: new Set<string>(),
        backgroundMusic: [],
        backgrounds: []
      }
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      // Parse dialogue lines
      const dialogueMatch = trimmedLine.match(/\[メッセージ表示\s+(.+?)\s+(.+?)\s+(.+?)\]/);
      if (dialogueMatch) {
        const [, character, voiceFile, text] = dialogueMatch;
        parsedContent.dialogue.push({
          character: character.trim(),
          text: text.trim(),
          voiceFile: voiceFile.trim()
        });
        parsedContent.metadata.characters.add(character.trim());
        continue;
      }

      // Parse background music
      const bgmMatch = trimmedLine.match(/\[BGM(.+?再生)\s+(.+?)\]/);
      if (bgmMatch) {
        const [, action, bgm] = bgmMatch;
        parsedContent.actions.push({
          type: 'bgm',
          action: action.trim(),
          value: bgm.trim()
        });
        parsedContent.metadata.backgroundMusic.push(bgm.trim());
        continue;
      }

      // Parse background changes
      const backgroundMatch = trimmedLine.match(/\[背景表示\s+(.+?)\]/);
      if (backgroundMatch) {
        const [, background] = backgroundMatch;
        parsedContent.actions.push({
          type: 'background',
          value: background.trim()
        });
        parsedContent.metadata.backgrounds.push(background.trim());
        continue;
      }

      // Parse character actions
      const characterActionMatch = trimmedLine.match(/\[キャラ(.+?)\s+(.+?)\]/);
      if (characterActionMatch) {
        const [, action, details] = characterActionMatch;
        parsedContent.actions.push({
          type: 'character',
          action: action.trim(),
          details: details.trim()
        });
        continue;
      }

      // Parse other actions
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        parsedContent.actions.push({
          type: 'other',
          content: trimmedLine
        });
      }
    }

    // Convert Set to Array for JSON serialization
    const result = {
      ...parsedContent,
      metadata: {
        ...parsedContent.metadata,
        characters: Array.from(parsedContent.metadata.characters)
      }
    };

    return result;
  }

  private findRelatedStories(allStories: any[], currentStory: any): any[] {
    if (!currentStory.AdvSeriesId) return [];

    return allStories
      .filter(story => 
        story.AdvSeriesId === currentStory.AdvSeriesId && 
        story.Id !== currentStory.Id
      )
      .sort((a, b) => a.OrderId - b.OrderId)
      .slice(0, 10); // Limit to 10 related stories
  }
}