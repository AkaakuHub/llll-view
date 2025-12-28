import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type {
	LiveTimelineYamlData,
	MusicDataBySongResponse,
	MusicMasterdata,
	MusicScoreYamlData,
	RawLiveTimelineRecord,
	RawMusicDataResponse,
	RawMusicScoreRecord,
} from "../music-data.types";
import { CardIllustrationsServiceAssets } from "./card-illustrations.service.assets";

export class CardIllustrationsServicePerformance extends CardIllustrationsServiceAssets {
	async syncAllData() {
		const result = {
			// Basic data
			charactersImported: 0,
			charactersSkipped: 0,
			cardsImported: 0,
			cardsSkipped: 0,
			// Performance data
			cardSkillsImported: 0,
			cardSkillsSkipped: 0,
			cardLevelsImported: 0,
			cardLevelsSkipped: 0,
			centerSkillsImported: 0,
			centerSkillsSkipped: 0,
			// Music data
			musicScoresImported: 0,
			musicScoresSkipped: 0,
			liveTimelinesImported: 0,
			liveTimelinesSkipped: 0,
			errors: [],
			totalProcessingTime: 0,
		};

		const startTime = Date.now();

		try {
			this.logger.log("統合データ同期を開始します...");

			// Step 1: Basic data import (Characters & Cards)
			this.logger.log("基本データ（キャラクター・カード）をインポート中...");
			const basicDataResult = await this.importYamlData();
			result.charactersImported = basicDataResult.charactersImported;
			result.charactersSkipped = basicDataResult.charactersSkipped;
			result.cardsImported = basicDataResult.cardsImported;
			result.cardsSkipped = basicDataResult.cardsSkipped;
			result.errors.push(...basicDataResult.errors);

			// Step 2: Performance data import
			this.logger.log("性能データ（スキル・レベル）をインポート中...");
			const performanceDataResult = await this.importPerformanceData();
			result.cardSkillsImported = performanceDataResult.cardSkillsImported;
			result.cardSkillsSkipped = performanceDataResult.cardSkillsSkipped;
			result.cardLevelsImported = performanceDataResult.cardLevelsImported;
			result.cardLevelsSkipped = performanceDataResult.cardLevelsSkipped;
			result.centerSkillsImported = performanceDataResult.centerSkillsImported;
			result.centerSkillsSkipped = performanceDataResult.centerSkillsSkipped;
			result.errors.push(...performanceDataResult.errors);

			// Step 3: Music data import
			this.logger.log("楽曲データ（スコア・タイムライン）をインポート中...");
			const musicDataResult = await this.importMusicData();
			result.musicScoresImported = musicDataResult.musicScoresImported;
			result.musicScoresSkipped = musicDataResult.musicScoresSkipped;
			result.liveTimelinesImported = musicDataResult.liveTimelinesImported;
			result.liveTimelinesSkipped = musicDataResult.liveTimelinesSkipped;
			result.errors.push(...musicDataResult.errors);

			result.totalProcessingTime = Date.now() - startTime;
			this.logger.log(`統合データ同期完了 (${result.totalProcessingTime}ms)`);
		} catch (error) {
			this.logger.error("統合データ同期中にエラーが発生:", error);
			result.errors.push(`統合同期エラー: ${error.message}`);
			result.totalProcessingTime = Date.now() - startTime;
		}

		return result;
	}

	// Music data import methods
	async importMusicData() {
		const result = {
			musicScoresImported: 0,
			musicScoresSkipped: 0,
			liveTimelinesImported: 0,
			liveTimelinesSkipped: 0,
			errors: [],
		};

		try {
			// Music scores data import
			const scoresResult = await this.importMusicScores();
			result.musicScoresImported = scoresResult.imported;
			result.musicScoresSkipped = scoresResult.skipped;
			result.errors.push(...scoresResult.errors);

			// Live timelines data import
			const timelinesResult = await this.importLiveTimelines();
			result.liveTimelinesImported = timelinesResult.imported;
			result.liveTimelinesSkipped = timelinesResult.skipped;
			result.errors.push(...timelinesResult.errors);
		} catch (error) {
			this.logger.error("楽曲データインポート中にエラーが発生:", error);
			result.errors.push(`システムエラー: ${error.message}`);
		}

		return result;
	}

	private async importMusicScores() {
		const result = { imported: 0, skipped: 0, errors: [] as string[] };

		try {
			const musicScoresPath = this.globalConfig.getMusicScoresYamlPath();

			if (!fs.existsSync(musicScoresPath)) {
				throw new Error(`MusicScores.yamlが見つかりません: ${musicScoresPath}`);
			}

			const musicScoresYaml = fs.readFileSync(musicScoresPath, "utf8");
			const musicScoresData = yaml.load(
				musicScoresYaml,
			) as MusicScoreYamlData[];

			this.logger.log(
				`${musicScoresData.length}件の楽曲スコアデータを処理開始`,
			);

			for (let i = 0; i < musicScoresData.length; i++) {
				const musicScore = musicScoresData[i];

				// Progress logging every 10 items
				if (i % 10 === 0) {
					this.logger.log(
						`楽曲スコア処理進捗: ${i}/${musicScoresData.length} (${Math.round((i / musicScoresData.length) * 100)}%)`,
					);
				}
				try {
					// 既存チェック
					const existing = await this.prisma.musicScores.findUnique({
						where: { id: musicScore.Id },
					});

					if (existing) {
						result.skipped++;
						continue;
					}

					await this.prisma.musicScores.create({
						data: {
							id: musicScore.Id,
							normalLevel: musicScore.NormalLevel || null,
							hardLevel: musicScore.HardLevel || null,
							expertLevel: musicScore.ExpertLevel || null,
							masterLevel: musicScore.MasterLevel || null,
							normalMaxCombo: musicScore.NormalMaxCombo || null,
							hardMaxCombo: musicScore.HardMaxCombo || null,
							expertMaxCombo: musicScore.ExpertMaxCombo || null,
							masterMaxCombo: musicScore.MasterMaxCombo || null,
							shouldVerifyNotesCount: musicScore.ShouldVerifyNotesCount || null,
							scoreRewardSeriesId: musicScore.ScoreRewardSeriesId || null,
							normalGainMusicExp: musicScore.NormalGainMusicExp || null,
							hardGainMusicExp: musicScore.HardGainMusicExp || null,
							expertGainMusicExp: musicScore.ExpertGainMusicExp || null,
							masterGainMusicExp: musicScore.MasterGainMusicExp || null,
						},
					});
					result.imported++;
				} catch (error) {
					const errorMsg = `楽曲スコア ${musicScore.Id} のインポートに失敗: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `楽曲スコアデータの読み込みに失敗: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	private async importLiveTimelines() {
		const result = { imported: 0, skipped: 0, errors: [] as string[] };

		try {
			const liveTimelinesPath = this.globalConfig.getLiveTimelinesYamlPath();

			if (!fs.existsSync(liveTimelinesPath)) {
				throw new Error(
					`LiveTimelines.yamlが見つかりません: ${liveTimelinesPath}`,
				);
			}

			const liveTimelinesYaml = fs.readFileSync(liveTimelinesPath, "utf8");
			const liveTimelinesData = yaml.load(
				liveTimelinesYaml,
			) as LiveTimelineYamlData[];

			this.logger.log(
				`${liveTimelinesData.length}件のライブタイムラインデータを処理開始`,
			);

			for (let i = 0; i < liveTimelinesData.length; i++) {
				const liveTimeline = liveTimelinesData[i];

				// Progress logging every 5 items
				if (i % 5 === 0) {
					this.logger.log(
						`ライブタイムライン処理進捗: ${i}/${liveTimelinesData.length} (${Math.round((i / liveTimelinesData.length) * 100)}%)`,
					);
				}
				try {
					// 既存チェック
					const existing = await this.prisma.liveTimelines.findUnique({
						where: { id: liveTimeline.Id.toString() },
					});

					if (existing) {
						result.skipped++;
						continue;
					}

					await this.prisma.liveTimelines.create({
						data: {
							id: liveTimeline.Id.toString(),
							label: liveTimeline.Label || null,
							musicId: liveTimeline.MusicId || null,
							locationsId: liveTimeline.LocationsId || null,
							freeId: liveTimeline.FreeId || null,
							nextId: liveTimeline.NextId || null,
							movieIds: liveTimeline.MovieIds || null,
						},
					});
					result.imported++;
				} catch (error) {
					const errorMsg = `ライブタイムライン ${liveTimeline.Id} のインポートに失敗: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `ライブタイムラインデータの読み込みに失敗: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	// Get music data
	async getMusicDataBySongId(
		musicId: number,
	): Promise<MusicDataBySongResponse> {
		const musicScoresPath = this.globalConfig.getMusicScoresYamlPath();
		const liveTimelinesPath = this.globalConfig.getLiveTimelinesYamlPath();
		const musicsPath = path.join(
			this.globalConfig.getMasterdataPath(),
			"Musics.yaml",
		);

		const musicScores = this.parseMusicScores(
			this.readYamlArray<unknown>(musicScoresPath, "MusicScores.yaml"),
		);
		const liveTimelines = this.parseLiveTimelines(
			this.readYamlArray<unknown>(liveTimelinesPath, "LiveTimelinesEvol.yaml"),
		);
		const musics = this.parseMusics(
			this.readYamlArray<unknown>(musicsPath, "Musics.yaml"),
		);

		const music = musics.find((entry) => entry.Id === musicId);
		const matchingScores = musicScores.filter((score) => score.Id === musicId);
		const matchingTimelines = liveTimelines.filter(
			(timeline) => timeline.MusicId === musicId,
		);

		return {
			music,
			musicScores: matchingScores,
			liveTimelines: matchingTimelines,
		};
	}

	private readYamlArray<T>(filePath: string, label: string): T[] {
		if (!fs.existsSync(filePath)) {
			throw new Error(`${label} not found at ${filePath}`);
		}

		const content = fs.readFileSync(filePath, "utf8");
		const parsed = yaml.load(content);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	}

	private isNumber(value: unknown): value is number {
		return typeof value === "number" && !Number.isNaN(value);
	}

	private isString(value: unknown): value is string {
		return typeof value === "string";
	}

	private parseMusicScores(raw: unknown[]): MusicScoreYamlData[] {
		const result: MusicScoreYamlData[] = [];
		for (const item of raw) {
			if (!item || typeof item !== "object") continue;
			const record = item as Record<string, unknown>;
			if (!this.isNumber(record.Id)) continue;
			result.push({
				Id: record.Id,
				NormalLevel: this.isNumber(record.NormalLevel)
					? record.NormalLevel
					: undefined,
				HardLevel: this.isNumber(record.HardLevel)
					? record.HardLevel
					: undefined,
				ExpertLevel: this.isNumber(record.ExpertLevel)
					? record.ExpertLevel
					: undefined,
				MasterLevel: this.isNumber(record.MasterLevel)
					? record.MasterLevel
					: undefined,
				NormalMaxCombo: this.isNumber(record.NormalMaxCombo)
					? record.NormalMaxCombo
					: undefined,
				HardMaxCombo: this.isNumber(record.HardMaxCombo)
					? record.HardMaxCombo
					: undefined,
				ExpertMaxCombo: this.isNumber(record.ExpertMaxCombo)
					? record.ExpertMaxCombo
					: undefined,
				MasterMaxCombo: this.isNumber(record.MasterMaxCombo)
					? record.MasterMaxCombo
					: undefined,
				ShouldVerifyNotesCount: this.isNumber(record.ShouldVerifyNotesCount)
					? record.ShouldVerifyNotesCount
					: undefined,
				ScoreRewardSeriesId: this.isNumber(record.ScoreRewardSeriesId)
					? record.ScoreRewardSeriesId
					: undefined,
				NormalGainMusicExp: this.isNumber(record.NormalGainMusicExp)
					? record.NormalGainMusicExp
					: undefined,
				HardGainMusicExp: this.isNumber(record.HardGainMusicExp)
					? record.HardGainMusicExp
					: undefined,
				ExpertGainMusicExp: this.isNumber(record.ExpertGainMusicExp)
					? record.ExpertGainMusicExp
					: undefined,
				MasterGainMusicExp: this.isNumber(record.MasterGainMusicExp)
					? record.MasterGainMusicExp
					: undefined,
				NormalDropRewardSeriesId: this.isNumber(record.NormalDropRewardSeriesId)
					? record.NormalDropRewardSeriesId
					: undefined,
				HardDropRewardSeriesId: this.isNumber(record.HardDropRewardSeriesId)
					? record.HardDropRewardSeriesId
					: undefined,
				ExpertDropRewardSeriesId: this.isNumber(record.ExpertDropRewardSeriesId)
					? record.ExpertDropRewardSeriesId
					: undefined,
				MasterDropRewardSeriesId: this.isNumber(record.MasterDropRewardSeriesId)
					? record.MasterDropRewardSeriesId
					: undefined,
			});
		}
		return result;
	}

	private parseLiveTimelines(raw: unknown[]): LiveTimelineYamlData[] {
		const result: LiveTimelineYamlData[] = [];
		for (const item of raw) {
			if (!item || typeof item !== "object") continue;
			const record = item as Record<string, unknown>;
			if (!this.isNumber(record.Id)) continue;
			result.push({
				Id: record.Id,
				Label: this.isString(record.Label) ? record.Label : undefined,
				MusicId: this.isNumber(record.MusicId) ? record.MusicId : undefined,
				LocationsId: this.isNumber(record.LocationsId)
					? record.LocationsId
					: undefined,
				FreeId: this.isNumber(record.FreeId) ? record.FreeId : undefined,
				NextId: this.isNumber(record.NextId) ? record.NextId : undefined,
				MovieIds: this.isString(record.MovieIds) ? record.MovieIds : undefined,
			});
		}
		return result;
	}

	private parseMusics(raw: unknown[]): MusicMasterdata[] {
		const result: MusicMasterdata[] = [];
		for (const item of raw) {
			if (!item || typeof item !== "object") continue;
			const record = item as Record<string, unknown>;
			if (!this.isNumber(record.Id)) continue;
			result.push({
				Id: record.Id,
				Title: this.isString(record.Title) ? record.Title : undefined,
				OrderId: this.isNumber(record.OrderId) ? record.OrderId : undefined,
				UnitId: this.isNumber(record.UnitId) ? record.UnitId : undefined,
				MusicType: this.isNumber(record.MusicType)
					? record.MusicType
					: undefined,
			});
		}
		return result;
	}

	// Get raw music data from masterdata (generated from cache/plain)
	async getRawMusicData(): Promise<RawMusicDataResponse> {
		const musicScoresPath = this.globalConfig.getMusicScoresYamlPath();
		const liveTimelinesPath = this.globalConfig.getLiveTimelinesYamlPath();
		const musicsPath = path.join(
			this.globalConfig.getMasterdataPath(),
			"Musics.yaml",
		);

		const musicScores = this.parseMusicScores(
			this.readYamlArray<unknown>(musicScoresPath, "MusicScores.yaml"),
		);
		const liveTimelines = this.parseLiveTimelines(
			this.readYamlArray<unknown>(liveTimelinesPath, "LiveTimelinesEvol.yaml"),
		);
		const musics = this.parseMusics(
			this.readYamlArray<unknown>(musicsPath, "Musics.yaml"),
		);

		const musicById = new Map<number, MusicMasterdata>();
		for (const music of musics) {
			musicById.set(music.Id, music);
		}

		const normalizedScores: RawMusicScoreRecord[] = musicScores.map((score) => {
			const music = musicById.get(score.Id);
			return {
				musicId: score.Id,
				title: music?.Title ?? null,
				orderId: music?.OrderId ?? null,
				unitId: music?.UnitId ?? null,
				musicType: music?.MusicType ?? null,
				normalLevel: score.NormalLevel ?? null,
				hardLevel: score.HardLevel ?? null,
				expertLevel: score.ExpertLevel ?? null,
				masterLevel: score.MasterLevel ?? null,
				normalMaxCombo: score.NormalMaxCombo ?? null,
				hardMaxCombo: score.HardMaxCombo ?? null,
				expertMaxCombo: score.ExpertMaxCombo ?? null,
				masterMaxCombo: score.MasterMaxCombo ?? null,
				shouldVerifyNotesCount: score.ShouldVerifyNotesCount ?? null,
				scoreRewardSeriesId: score.ScoreRewardSeriesId ?? null,
				normalGainMusicExp: score.NormalGainMusicExp ?? null,
				hardGainMusicExp: score.HardGainMusicExp ?? null,
				expertGainMusicExp: score.ExpertGainMusicExp ?? null,
				masterGainMusicExp: score.MasterGainMusicExp ?? null,
				normalDropRewardSeriesId: score.NormalDropRewardSeriesId ?? null,
				hardDropRewardSeriesId: score.HardDropRewardSeriesId ?? null,
				expertDropRewardSeriesId: score.ExpertDropRewardSeriesId ?? null,
				masterDropRewardSeriesId: score.MasterDropRewardSeriesId ?? null,
			};
		});

		const normalizedTimelines: RawLiveTimelineRecord[] = liveTimelines.map(
			(timeline) => {
				const music = timeline.MusicId
					? musicById.get(timeline.MusicId)
					: undefined;
				return {
					id: timeline.Id,
					label: timeline.Label ?? null,
					musicId: timeline.MusicId ?? null,
					musicTitle: music?.Title ?? null,
					locationsId: timeline.LocationsId ?? null,
					freeId: timeline.FreeId ?? null,
					nextId: timeline.NextId ?? null,
					movieIds: timeline.MovieIds ?? null,
				};
			},
		);

		return {
			musicScores: normalizedScores,
			liveTimelines: normalizedTimelines,
			meta: {
				source: "cache/plain → masterdata",
				musicScoresPath,
				liveTimelinesPath,
				musicsPath,
				musicScoresCount: normalizedScores.length,
				liveTimelinesCount: normalizedTimelines.length,
			},
		};
	}

	// Get all performance data
	async getAllPerformanceData() {
		const cardSkills = await this.prisma.cardSkills.findMany({
			orderBy: [{ cardSkillSeriesId: "asc" }, { skillLevel: "asc" }],
		});

		const cardLevels = await this.prisma.cardLevels.findMany({
			orderBy: [{ experienceType: "asc" }, { cardLevel: "asc" }],
		});

		const centerSkills = await this.prisma.centerSkills.findMany({
			orderBy: [{ centerSkillSeriesId: "asc" }, { skillLevel: "asc" }],
		});

		return {
			cardSkills,
			cardLevels,
			centerSkills,
		};
	}
}
