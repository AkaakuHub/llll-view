import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { glob } from "glob";
import * as yaml from "js-yaml";
import { GlobalConfigService } from "../config/global-config.service";
import { AppLoggerService } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DatabaseService {
	private readonly logger;
	private readonly sometoolPath: string;
	private readonly masterdataPath: string;

	constructor(
		private prisma: PrismaService,
		private globalConfig: GlobalConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(DatabaseService.name);
		this.sometoolPath = path.resolve(this.globalConfig.getSometoolDirPath());
		this.masterdataPath = path.resolve(this.globalConfig.getMasterdataPath());
	}

	async getDatabases(): Promise<{
		databases: Array<{
			name: string;
			type: string;
			description: string;
			recordCount?: number;
		}>;
	}> {
		try {
			const files = await readdir(this.masterdataPath);
			const databases = [];

			for (const file of files) {
				if (file.endsWith(".yaml")) {
					const name = file.replace(".yaml", "");
					let description = "Game data";
					let recordCount = 0;

					try {
						const filePath = path.join(this.masterdataPath, file);
						const content = await readFile(filePath, "utf-8");
						const data = yaml.load(content) as unknown[];

						if (Array.isArray(data)) {
							recordCount = data.length;
						}

						// Provide better descriptions for known tables
						if (name.includes("Adv")) {
							description = "Adventure/Story data";
						} else if (name.includes("Story")) {
							description = "Story content";
						} else if (name.includes("Character")) {
							description = "Character information";
						} else if (name.includes("Music") || name.includes("Live")) {
							description = "Music and Live data";
						} else if (name.includes("Card")) {
							description = "Card game data";
						} else if (name.includes("Mission")) {
							description = "Mission and quest data";
						}
					} catch {
						// If we can't read the file, just use default values
					}

					databases.push({
						name,
						type: "yaml",
						description,
						recordCount,
					});
				}
			}

			return {
				databases: databases.sort((a, b) => a.name.localeCompare(b.name)),
			};
		} catch {
			return { databases: [] };
		}
	}

	async getTableData(
		tableName: string,
		limit = 100,
		offset = 0,
		search?: string,
	): Promise<Record<string, unknown>> {
		try {
			const filePath = path.join(this.masterdataPath, `${tableName}.yaml`);
			const content = await readFile(filePath, "utf-8");
			const data = yaml.load(content) as unknown[];

			if (!Array.isArray(data)) {
				return {
					error: "Invalid data format",
					data: [],
					total: 0,
					columns: [],
				};
			}

			let filteredData = data;

			// Apply search filter if provided
			if (search) {
				const searchLower = search.toLowerCase();
				filteredData = data.filter((row) => {
					return Object.values(row).some((value) =>
						value?.toString().toLowerCase().includes(searchLower),
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
				search: search || null,
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
				search: search || null,
			};
		}
	}

	async searchStories(
		query: string,
		limit = 50,
	): Promise<Record<string, unknown>> {
		try {
			const storyTables = ["AdvDatas", "AdvStoryDigestMovies"];
			const results = [];

			for (const table of storyTables) {
				try {
					const filePath = path.join(this.masterdataPath, `${table}.yaml`);
					const content = await readFile(filePath, "utf-8");
					const data = yaml.load(content) as unknown[];

					if (Array.isArray(data)) {
						const queryLower = query.toLowerCase();
						const matchedRows = data.filter((row: Record<string, unknown>) => {
							const name = (row.Name ?? row.Title ?? "").toString();
							const description = (row.Description ?? "").toString();
							const scriptId = row.ScriptId ? row.ScriptId.toString() : "";
							return (
								name.toLowerCase().includes(queryLower) ||
								description.toLowerCase().includes(queryLower) ||
								scriptId.includes(queryLower)
							);
						});

						for (const row of matchedRows) {
							const record = row as Record<string, unknown>;
							const normalizedRow = {
								...(row as object),
								Name:
									(record.Name as string | undefined) ||
									(record.Title as string | undefined) ||
									"",
								Description:
									(record.Description as string | undefined) ||
									(record.Title as string | undefined) ||
									"",
							};
							results.push({
								table,
								...normalizedRow,
								storyType: this.getStoryType(table),
							});
						}
					}
				} catch {
					// Skip tables that can't be read
				}
			}

			// Sort by relevance (exact matches first, then partial matches)
			const queryLower = query.toLowerCase();
			results.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
				const aExact =
					a.Name && (a.Name as string).toLowerCase() === queryLower;
				const bExact =
					b.Name && (b.Name as string).toLowerCase() === queryLower;
				if (aExact && !bExact) return -1;
				if (!aExact && bExact) return 1;
				return 0;
			});

			return {
				results: results.slice(0, limit),
				total: results.length,
				query,
			};
		} catch (error) {
			return {
				error: error.message,
				results: [],
				total: 0,
				query,
			};
		}
	}

	async indexStoryDialogues(): Promise<Record<string, unknown>> {
		this.logger.log("Starting story dialogue indexing");
		const plainPath = path.join(this.sometoolPath, "cache", "plain");
		const filePattern = path.join(plainPath, "story_main_*.txt");
		const filePaths = await glob(filePattern);

		const advFilePath = path.join(this.masterdataPath, "AdvDatas.yaml");
		const advContent = await readFile(advFilePath, "utf-8");
		const advData = yaml.load(advContent) as unknown[];
		const storyMap = new Map<
			string,
			{ storyId: number; scriptId: number; name: string; description: string }
		>();

		if (Array.isArray(advData)) {
			for (const row of advData) {
				const record = row as Record<string, unknown>;
				const id = Number(record.Id ?? 0);
				const scriptId = Number(record.ScriptId ?? record.Id ?? 0);
				const name =
					(record.Name as string | undefined) ||
					(record.Title as string | undefined) ||
					"";
				const description =
					(record.Description as string | undefined) ||
					(record.Title as string | undefined) ||
					"";
				if (scriptId) {
					storyMap.set(String(scriptId), {
						storyId: id || scriptId,
						scriptId,
						name,
						description,
					});
				}
			}
		}

		const existingScriptIds = new Set(
			(
				await this.prisma.storyDialogueIndex.findMany({
					select: { scriptId: true },
					distinct: ["scriptId"],
				})
			).map((row) => row.scriptId),
		);
		this.logger.log(
			`Found ${existingScriptIds.size} indexed scriptIds before update`,
		);

		const fileScriptIds = new Set<number>();
		let indexed = 0;
		let skipped = 0;

		for (const filePath of filePaths) {
			const match = path.basename(filePath).match(/story_main_(\d+)\.txt/);
			if (!match) continue;
			const scriptId = Number(match[1]);
			if (!scriptId) continue;
			fileScriptIds.add(scriptId);

			const stat = await fs.promises.stat(filePath);
			const mtimeMs = BigInt(Math.floor(stat.mtimeMs));

			const existing = await this.prisma.storyDialogueIndex.findFirst({
				where: { scriptId },
				select: { sourceFileMtime: true },
			});

			if (existing && existing.sourceFileMtime === mtimeMs) {
				skipped++;
				continue;
			}

			await this.prisma.storyDialogueIndex.deleteMany({
				where: { scriptId },
			});

			const content = await readFile(filePath, "utf-8");
			const lines = content.split("\n");
			let dialogueIndex = 0;
			const records = [];
			const storyInfo = storyMap.get(String(scriptId)) ?? {
				storyId: scriptId,
				scriptId,
				name: "",
				description: "",
			};

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;
				const matchLine = trimmed.match(
					/^\[メッセージ表示\s+(\S+)\s+(\S+)\s+(.+)\]$/,
				);
				if (!matchLine) continue;
				const [, , voiceFile, text] = matchLine;
				const normalizedText = this.normalizeDialogueText(text);
				records.push({
					id: randomUUID(),
					storyId: storyInfo.storyId,
					scriptId: storyInfo.scriptId,
					dialogueIndex,
					text: normalizedText,
					voiceFile: voiceFile?.trim() || null,
					sourceFileMtime: mtimeMs,
				});
				dialogueIndex++;
			}

			if (records.length > 0) {
				await this.prisma.storyDialogueIndex.createMany({
					data: records,
				});
				indexed++;
			} else {
				skipped++;
			}
		}

		const toDelete = [...existingScriptIds].filter(
			(id) => !fileScriptIds.has(id),
		);
		if (toDelete.length > 0) {
			await this.prisma.storyDialogueIndex.deleteMany({
				where: { scriptId: { in: toDelete } },
			});
		}

		this.logger.log(
			`Index complete: indexed=${indexed}, skipped=${skipped}, deleted=${toDelete.length}, totalFiles=${filePaths.length}`,
		);
		return {
			indexed,
			skipped,
			deleted: toDelete.length,
			totalFiles: filePaths.length,
		};
	}

	async searchStoryDialogues(
		query: string,
		limit = 50,
	): Promise<Record<string, unknown>> {
		if (!query) {
			return { results: [], total: 0, query };
		}

		const advFilePath = path.join(this.masterdataPath, "AdvDatas.yaml");
		const advContent = await readFile(advFilePath, "utf-8");
		const advData = yaml.load(advContent) as unknown[];
		const storyMap = new Map<
			string,
			{
				Id: number;
				Name: string;
				Description: string;
				ScriptId?: number;
				storyType: string;
			}
		>();

		if (Array.isArray(advData)) {
			for (const row of advData) {
				const record = row as Record<string, unknown>;
				const scriptId = Number(record.ScriptId ?? record.Id ?? 0);
				if (!scriptId) continue;
				storyMap.set(String(scriptId), {
					Id: Number(record.Id ?? scriptId),
					Name:
						(record.Name as string | undefined) ||
						(record.Title as string | undefined) ||
						"",
					Description:
						(record.Description as string | undefined) ||
						(record.Title as string | undefined) ||
						"",
					ScriptId: scriptId,
					storyType: "Adventure Story",
				});
			}
		}

		const matches = await this.prisma.storyDialogueIndex.findMany({
			where: { text: { contains: query } },
			orderBy: { scriptId: "asc" },
			take: limit,
		});

		const results = matches.map((match) => {
			const story = storyMap.get(String(match.scriptId));
			return {
				table: "AdvDatas",
				Id: story?.Id ?? match.storyId,
				Name: story?.Name ?? "",
				Description: story?.Description ?? "",
				ScriptId: match.scriptId,
				storyType: story?.storyType ?? "Adventure Story",
				dialogueIndex: match.dialogueIndex,
				text: match.text,
				voiceFile: match.voiceFile,
			};
		});

		return {
			results,
			total: results.length,
			query,
		};
	}

	async getLatestStories(
		limit = 50,
		offset = 0,
	): Promise<Record<string, unknown>> {
		try {
			const filePath = path.join(this.masterdataPath, "AdvDatas.yaml");
			const content = await readFile(filePath, "utf-8");
			const data = yaml.load(content) as unknown[];

			if (!Array.isArray(data)) {
				return {
					results: [],
					total: 0,
					limit,
					offset,
				};
			}

			const normalized = data.map((row) => ({
				table: "AdvDatas",
				...(row as object),
				storyType: "Adventure Story",
			}));

			normalized.sort(
				(a: Record<string, unknown>, b: Record<string, unknown>) => {
					const aTime = this.parseStartTime(a.StartTime as string | undefined);
					const bTime = this.parseStartTime(b.StartTime as string | undefined);
					if (aTime !== bTime) return bTime - aTime;
					const aId = Number(a.Id ?? 0);
					const bId = Number(b.Id ?? 0);
					return bId - aId;
				},
			);

			return {
				results: normalized.slice(offset, offset + limit),
				total: normalized.length,
				limit,
				offset,
			};
		} catch (error) {
			return {
				error: error.message,
				results: [],
				total: 0,
				limit,
				offset,
			};
		}
	}

	private getStoryType(tableName: string): string {
		if (tableName === "AdvDatas") {
			return "Adventure Story";
		} else if (tableName === "AdvStoryDigestMovies") {
			return "Story Digest Movie";
		}
		return "Unknown";
	}

	async getStoryContent(storyId: string): Promise<Record<string, unknown>> {
		try {
			// Try to find the story in AdvDatas first
			const advFilePath = path.join(this.masterdataPath, "AdvDatas.yaml");
			const advContent = await readFile(advFilePath, "utf-8");
			const advData = yaml.load(advContent) as unknown[];

			if (Array.isArray(advData)) {
				const story = advData.find(
					(row: Record<string, unknown>) =>
						(row.Id as string | number).toString() === storyId ||
						(row.ScriptId as string | number).toString() === storyId,
				);

				if (story) {
					// Try to load the actual story text
					const storyRecord = story as Record<string, unknown>;
					const storyText = await this.loadStoryText(
						(storyRecord.ScriptId as string) || (storyRecord.Id as string),
					);

					return {
						found: true,
						story,
						storyType: "Adventure Story",
						storyText,
						relatedStories: this.findRelatedStories(
							advData as Record<string, unknown>[],
							story as Record<string, unknown>,
						),
					};
				}
			}

			// Try to find the story in AdvStoryDigestMovies
			const digestFilePath = path.join(
				this.masterdataPath,
				"AdvStoryDigestMovies.yaml",
			);
			const digestContent = await readFile(digestFilePath, "utf-8");
			const digestData = yaml.load(digestContent) as unknown[];

			if (Array.isArray(digestData)) {
				const story = digestData.find(
					(row: Record<string, unknown>) =>
						(row.Id as string | number).toString() === storyId,
				);

				if (story) {
					const storyRecord = story as Record<string, unknown>;
					return {
						found: true,
						story: {
							...storyRecord,
							Name:
								(storyRecord.Name as string | undefined) ||
								(storyRecord.Title as string | undefined) ||
								"",
							Description:
								(storyRecord.Description as string | undefined) ||
								(storyRecord.Title as string | undefined) ||
								"",
						},
						storyType: "Story Digest Movie",
						storyText: {
							found: false,
							error: "Story digest movie has no story text",
						},
						relatedStories: [],
					};
				}
			}

			return {
				found: false,
				error: "Story not found",
				storyId,
			};
		} catch (error) {
			return {
				found: false,
				error: error.message,
				storyId,
			};
		}
	}

	private async loadStoryText(
		scriptId: string,
	): Promise<Record<string, unknown>> {
		try {
			const plainPath = path.join(this.sometoolPath, "cache", "plain");
			const storyFilePath = path.join(plainPath, `story_main_${scriptId}.txt`);

			try {
				const storyContent = await readFile(storyFilePath, "utf-8");
				const parsedStory = this.parseStoryText(storyContent);
				return {
					found: true,
					content: parsedStory,
					rawContent: storyContent,
				};
			} catch {
				return {
					found: false,
					error: `Story text file not found: story_main_${scriptId}.txt`,
				};
			}
		} catch (error) {
			return {
				found: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	private parseStoryText(content: string): Record<string, unknown> {
		const lines = content.split("\n");
		const parsedContent = {
			dialogue: [],
			actions: [],
			metadata: {
				characters: new Set<string>(),
				backgroundMusic: [],
				backgrounds: [],
			},
		};
		let currentBackground: string | null = null;
		let lastDialogue: { waitSeconds?: number } | null = null;

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine || trimmedLine.startsWith("#")) continue;

			// Parse dialogue lines
			const dialogueMatch = trimmedLine.match(
				/^\[メッセージ表示\s+(\S+)\s+(\S+)\s+(.+)\]$/,
			);
			if (dialogueMatch) {
				const [, character, voiceFile, text] = dialogueMatch;
				const normalizedCharacter = character.trim();
				const normalizedVoice = voiceFile.trim();
				const normalizedText = this.normalizeDialogueText(text);
				const entry = {
					character: normalizedCharacter,
					text: normalizedText,
					voiceFile: normalizedVoice,
					background: currentBackground,
					waitSeconds: undefined,
				} as {
					character: string;
					text: string;
					voiceFile?: string;
					background?: string | null;
					waitSeconds?: number;
				};
				(
					parsedContent.dialogue as Array<{
						character: string;
						text: string;
						voiceFile?: string;
						background?: string | null;
						waitSeconds?: number;
					}>
				).push(entry);
				lastDialogue = entry;

				parsedContent.metadata.characters.add(normalizedCharacter);
				continue;
			}

			// Parse background music
			const bgmMatch = trimmedLine.match(/\[BGM(.+?再生)\s+(.+?)\]/);
			if (bgmMatch) {
				const [, action, bgm] = bgmMatch;
				parsedContent.actions.push({
					type: "bgm",
					action: action.trim(),
					value: bgm.trim(),
				});
				parsedContent.metadata.backgroundMusic.push(bgm.trim());
				continue;
			}

			// Parse background changes
			const backgroundMatch = trimmedLine.match(/\[背景表示\s+(.+?)\]/);
			if (backgroundMatch) {
				const [, background] = backgroundMatch;
				currentBackground = background.trim();
				parsedContent.actions.push({
					type: "background",
					value: background.trim(),
				});
				parsedContent.metadata.backgrounds.push(background.trim());
				continue;
			}

			// Parse character actions
			const characterActionMatch = trimmedLine.match(/\[キャラ(.+?)\s+(.+?)\]/);
			if (characterActionMatch) {
				const [, action, details] = characterActionMatch;
				parsedContent.actions.push({
					type: "character",
					action: action.trim(),
					details: details.trim(),
				});
				continue;
			}

			// Parse wait time
			const waitMatch = trimmedLine.match(/\[待機\s+秒数指定\s+([0-9.]+)\]/);
			if (waitMatch && lastDialogue) {
				const seconds = Number.parseFloat(waitMatch[1]);
				if (!Number.isNaN(seconds)) {
					lastDialogue.waitSeconds = (lastDialogue.waitSeconds || 0) + seconds;
				}
				continue;
			}

			// Parse other actions
			if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
				parsedContent.actions.push({
					type: "other",
					content: trimmedLine,
				});
			}
		}

		// Convert Set to Array for JSON serialization
		const result = {
			...parsedContent,
			metadata: {
				...parsedContent.metadata,
				characters: Array.from(parsedContent.metadata.characters),
			},
		};

		return result;
	}

	private normalizeDialogueText(text: string): string {
		return text
			.replace(/\[r\]/g, "\n")
			.replace(/\[Space\]/g, " ")
			.trim();
	}

	private findRelatedStories(
		allStories: Record<string, unknown>[],
		currentStory: Record<string, unknown>,
	): Record<string, unknown>[] {
		if (!currentStory.AdvSeriesId) return [];

		return allStories
			.filter(
				(story) =>
					story.AdvSeriesId === currentStory.AdvSeriesId &&
					story.Id !== currentStory.Id,
			)
			.sort((a, b) => (a.OrderId as number) - (b.OrderId as number))
			.slice(0, 10) // Limit to 10 related stories
			.map((story) => ({
				Id: story.Id,
				OrderId: story.OrderId,
				Name: story.Name,
				Description: story.Description,
				ScriptId: story.ScriptId,
			}));
	}

	private parseStartTime(value?: string): number {
		if (!value) return 0;
		const time = Date.parse(value);
		return Number.isNaN(time) ? 0 : time;
	}
}
