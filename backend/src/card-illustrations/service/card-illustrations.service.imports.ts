import * as fs from "node:fs";
import * as yaml from "js-yaml";
import type {
	LiveTimelineYamlData,
	MusicScoreYamlData,
} from "../music-data.types";
import { CardIllustrationsServiceCore } from "./card-illustrations.service.core";
import type {
	CardLevelYamlData,
	CardSkillYamlData,
	CardYamlData,
	CenterSkillYamlData,
	CharacterYamlData,
} from "./card-illustrations.service.types";

export class CardIllustrationsServiceImports extends CardIllustrationsServiceCore {
	async importYamlData() {
		const result = {
			charactersImported: 0,
			charactersSkipped: 0,
			cardsImported: 0,
			cardsSkipped: 0,
			errors: [],
		};

		try {
			// キャラクターデータのインポート
			const charactersResult = await this.importCharacters();
			result.charactersImported = charactersResult.imported;
			result.charactersSkipped = charactersResult.skipped;
			result.errors.push(...charactersResult.errors);

			// カードデータのインポート
			const cardsResult = await this.importCards();
			result.cardsImported = cardsResult.imported;
			result.cardsSkipped = cardsResult.skipped;
			result.errors.push(...cardsResult.errors);
		} catch (error) {
			this.logger.error("YAMLデータインポート中にエラーが発生:", error);
			result.errors.push(`システムエラー: ${error.message}`);
		}

		return result;
	}

	async importPerformanceData() {
		const result = {
			cardSkillsImported: 0,
			cardSkillsSkipped: 0,
			cardLevelsImported: 0,
			cardLevelsSkipped: 0,
			centerSkillsImported: 0,
			centerSkillsSkipped: 0,
			errors: [],
		};

		try {
			// カードスキルデータのインポート
			const skillsResult = await this.importCardSkills();
			result.cardSkillsImported = skillsResult.imported;
			result.cardSkillsSkipped = skillsResult.skipped;
			result.errors.push(...skillsResult.errors);

			// カードレベルデータのインポート
			const levelsResult = await this.importCardLevels();
			result.cardLevelsImported = levelsResult.imported;
			result.cardLevelsSkipped = levelsResult.skipped;
			result.errors.push(...levelsResult.errors);

			// センタースキルデータのインポート
			const centerSkillsResult = await this.importCenterSkills();
			result.centerSkillsImported = centerSkillsResult.imported;
			result.centerSkillsSkipped = centerSkillsResult.skipped;
			result.errors.push(...centerSkillsResult.errors);
		} catch (error) {
			this.logger.error("性能データインポート中にエラーが発生:", error);
			result.errors.push(`システムエラー: ${error.message}`);
		}

		return result;
	}

	async syncCardSeriesData(cardSeriesId: number) {
		const startTime = Date.now();
		this.logger.log(
			`カードシリーズ ${cardSeriesId} のデータ同期を開始します...`,
		);

		const result = {
			cardSeriesId,
			cardsImported: 0,
			cardsSkipped: 0,
			cardSkillsImported: 0,
			cardSkillsSkipped: 0,
			cardLevelsImported: 0,
			cardLevelsSkipped: 0,
			centerSkillsImported: 0,
			centerSkillsSkipped: 0,
			musicScoresImported: 0,
			musicScoresSkipped: 0,
			liveTimelinesImported: 0,
			liveTimelinesSkipped: 0,
			errors: [] as string[],
			totalProcessingTime: 0,
		};

		try {
			// Step 1: Import characters (needed for cards)
			this.logger.log("キャラクターデータをインポート中...");
			await this.importCharacters();

			// Step 2: Import specific card series cards
			this.logger.log(
				`カードシリーズ ${cardSeriesId} のカードデータをインポート中...`,
			);
			const cardsResult = await this.importCardsBySeriesId(cardSeriesId);
			result.cardsImported = cardsResult.imported;
			result.cardsSkipped = cardsResult.skipped;
			result.errors.push(...cardsResult.errors);

			// Step 3: Import performance data for this card series
			this.logger.log(
				`カードシリーズ ${cardSeriesId} のパフォーマンスデータをインポート中...`,
			);
			const performanceResult =
				await this.importPerformanceDataBySeriesId(cardSeriesId);
			result.cardSkillsImported = performanceResult.cardSkillsImported;
			result.cardSkillsSkipped = performanceResult.cardSkillsSkipped;
			result.cardLevelsImported = performanceResult.cardLevelsImported;
			result.cardLevelsSkipped = performanceResult.cardLevelsSkipped;
			result.centerSkillsImported = performanceResult.centerSkillsImported;
			result.centerSkillsSkipped = performanceResult.centerSkillsSkipped;
			result.errors.push(...performanceResult.errors);

			// Step 4: Import music data for this card series
			this.logger.log(
				`カードシリーズ ${cardSeriesId} の楽曲データをインポート中...`,
			);
			const musicResult = await this.importMusicDataBySeriesId(cardSeriesId);
			result.musicScoresImported = musicResult.musicScoresImported;
			result.musicScoresSkipped = musicResult.musicScoresSkipped;
			result.liveTimelinesImported = musicResult.liveTimelinesImported;
			result.liveTimelinesSkipped = musicResult.liveTimelinesSkipped;
			result.errors.push(...musicResult.errors);
		} catch (error) {
			this.logger.error(
				`カードシリーズ ${cardSeriesId} のデータ同期中にエラーが発生:`,
				error,
			);
			result.errors.push(`システムエラー: ${error.message}`);
		}

		const endTime = Date.now();
		result.totalProcessingTime = endTime - startTime;

		this.logger.log(
			`カードシリーズ ${cardSeriesId} のデータ同期が完了しました (${result.totalProcessingTime}ms)`,
		);
		this.logger.log(
			`結果: Cards ${result.cardsImported}/${result.cardsSkipped}, Skills ${result.cardSkillsImported}/${result.cardSkillsSkipped}, Music ${result.musicScoresImported}/${result.musicScoresSkipped}`,
		);

		return result;
	}

	// カードシリーズ個別のインポートメソッド
	private async importCardsBySeriesId(cardSeriesId: number) {
		const result = { imported: 0, skipped: 0, errors: [] as string[] };

		try {
			const cardDatasPath = this.globalConfig.getCardDatasYamlPath();
			if (!fs.existsSync(cardDatasPath)) {
				throw new Error(`CardDatas.yamlが見つかりません: ${cardDatasPath}`);
			}

			const cardDatasYaml = fs.readFileSync(cardDatasPath, "utf8");
			const cardDatasData = yaml.load(cardDatasYaml) as CardYamlData[];

			// 指定されたカードシリーズIDのカードのみをフィルタ
			const seriesCards = cardDatasData.filter(
				(card) => card.CardSeriesId === cardSeriesId,
			);
			this.logger.log(
				`カードシリーズ ${cardSeriesId}: ${seriesCards.length}件のカードを処理`,
			);

			for (const card of seriesCards) {
				try {
					const existing = await this.prisma.cardIllustrations.findUnique({
						where: { id: card.Id },
					});

					if (existing) {
						result.skipped++;
						continue;
					}

					await this.prisma.cardIllustrations.create({
						data: {
							id: card.Id,
							cardSeriesId: card.CardSeriesId,
							characterId: card.CharactersId,
							name: card.Name || null,
							description: card.Description || null,
							rarity: card.Rarity || 1,
							evolveTimes: card.EvolveTimes || 0,
							style: card.Style || 1,
							mood: card.Mood || 1,
							initialSmile: card.InitialSmile || null,
							initialPure: card.InitialPure || null,
							initialCool: card.InitialCool || null,
							initialMental: card.InitialMental || null,
							maxSmile: card.MaxSmile || null,
							maxPure: card.MaxPure || null,
							maxCool: card.MaxCool || null,
							maxMental: card.MaxMental || null,
							beatPoint: card.BeatPoint || null,
							orderId: card.OrderId || null,
						},
					});
					result.imported++;
				} catch (error) {
					const errorMsg = `カード ${card.Id} のインポートに失敗: ${error.message}`;
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			result.errors.push(`カードデータの読み込みに失敗: ${error.message}`);
		}

		return result;
	}

	private async importPerformanceDataBySeriesId(cardSeriesId: number) {
		const result = {
			cardSkillsImported: 0,
			cardSkillsSkipped: 0,
			cardLevelsImported: 0,
			cardLevelsSkipped: 0,
			centerSkillsImported: 0,
			centerSkillsSkipped: 0,
			errors: [] as string[],
		};

		try {
			// Card Skills for this series
			const cardSkillsPath = this.globalConfig.getCardSkillsYamlPath();
			if (fs.existsSync(cardSkillsPath)) {
				const cardSkillsYaml = fs.readFileSync(cardSkillsPath, "utf8");
				const cardSkillsData = yaml.load(cardSkillsYaml) as CardSkillYamlData[];

				// カードシリーズIDに関連するスキルをフィルタ
				// CardSeriesId: 1021801 -> CardSkillSeriesId: 10218011, 10218012, 10218013, 10218014
				// But we need to get the skills that EXACTLY match the pattern for this specific card series
				const cardSeriesIdStr = cardSeriesId.toString();

				// Get all cards for this series to find their evolution stages
				const cardDatasPath = this.globalConfig.getCardDatasYamlPath();
				const cardDatasYaml = fs.readFileSync(cardDatasPath, "utf8");
				const cardDatasData = yaml.load(cardDatasYaml) as CardYamlData[];
				const cardsInSeries = cardDatasData.filter(
					(card) => card.CardSeriesId === cardSeriesId,
				);

				// For each card's evolution stage, find matching CardSkillSeriesId
				const expectedSkillSeriesIds = new Set<number>();
				for (const card of cardsInSeries) {
					// CardSeriesId: 1021801, EvolveTimes: 1 -> CardSkillSeriesId: 10218011
					// Pattern: take first 6 digits + last digit + evolution digit
					const baseId = cardSeriesIdStr.substring(0, 6); // "102180"
					const seriesDigit = cardSeriesIdStr.substring(6); // "1"
					const skillSeriesId = parseInt(
						baseId + seriesDigit + (card.EvolveTimes || 1).toString(),
					);
					expectedSkillSeriesIds.add(skillSeriesId);
				}

				const seriesSkills = cardSkillsData.filter((skill) => {
					return expectedSkillSeriesIds.has(skill.CardSkillSeriesId);
				});

				for (const skill of seriesSkills) {
					try {
						const existing = await this.prisma.cardSkills.findUnique({
							where: { id: skill.Id.toString() },
						});

						if (existing) {
							result.cardSkillsSkipped++;
							continue;
						}

						const calculatedCardSeriesId = skill.CardSkillSeriesId
							? parseInt(skill.CardSkillSeriesId.toString().substring(0, 7))
							: null;

						await this.prisma.cardSkills.create({
							data: {
								id: skill.Id.toString(),
								cardSkillSeriesId: skill.CardSkillSeriesId.toString(),
								skillLevel: skill.SkillLevel,
								skillCost: skill.SkillCost || null,
								apperanceType: skill.ApperanceType?.toString() || null,
								cardSkillEffectId: skill.CardSkillEffectId || null,
								description: skill.Description || null,
								cardSeriesId: calculatedCardSeriesId,
							},
						});
						result.cardSkillsImported++;
					} catch (error) {
						result.errors.push(
							`カードスキル ${skill.Id} のインポートに失敗: ${error.message}`,
						);
					}
				}
			}

			// 簡略化のため、Card Levels は全体をインポート（個別フィルタリングは複雑）
			const cardLevelsResult = await this.importCardLevels();
			result.cardLevelsImported = cardLevelsResult.imported;
			result.cardLevelsSkipped = cardLevelsResult.skipped;
			result.errors.push(...cardLevelsResult.errors);
		} catch (error) {
			result.errors.push(
				`パフォーマンスデータの読み込みに失敗: ${error.message}`,
			);
		}

		return result;
	}

	private async importMusicDataBySeriesId(cardSeriesId: number) {
		const result = {
			musicScoresImported: 0,
			musicScoresSkipped: 0,
			liveTimelinesImported: 0,
			liveTimelinesSkipped: 0,
			errors: [] as string[],
		};

		try {
			// このカードシリーズに関連する楽曲を取得
			const cards = await this.prisma.cardIllustrations.findMany({
				where: { cardSeriesId },
				select: { beatPoint: true },
			});

			const musicIds = [
				...new Set(cards.map((card) => card.beatPoint).filter(Boolean)),
			];

			this.logger.log(
				`カードシリーズ ${cardSeriesId}: beatPoints=${musicIds.join(",")} (注: MusicScoresとの直接的な関連付けは不可)`,
			);

			// Music Scores
			const musicScoresPath = this.globalConfig.getMusicScoresYamlPath();
			if (fs.existsSync(musicScoresPath)) {
				const musicScoresYaml = fs.readFileSync(musicScoresPath, "utf8");
				const musicScoresData = yaml.load(
					musicScoresYaml,
				) as MusicScoreYamlData[];

				// MusicScoresには楽曲IDとの直接的な関連付けがないため、簡易的に最初の10件をインポート
				const relevantScores = musicScoresData.slice(0, 10);

				for (const score of relevantScores) {
					try {
						const existing = await this.prisma.musicScores.findUnique({
							where: { id: score.Id },
						});

						if (existing) {
							result.musicScoresSkipped++;
							continue;
						}

						await this.prisma.musicScores.create({
							data: {
								id: score.Id,
								normalLevel: score.NormalLevel || null,
								hardLevel: score.HardLevel || null,
								expertLevel: score.ExpertLevel || null,
								masterLevel: score.MasterLevel || null,
								normalMaxCombo: score.NormalMaxCombo || null,
								hardMaxCombo: score.HardMaxCombo || null,
								expertMaxCombo: score.ExpertMaxCombo || null,
								masterMaxCombo: score.MasterMaxCombo || null,
								shouldVerifyNotesCount: score.ShouldVerifyNotesCount || null,
								scoreRewardSeriesId: score.ScoreRewardSeriesId || null,
								normalGainMusicExp: score.NormalGainMusicExp || null,
								hardGainMusicExp: score.HardGainMusicExp || null,
								expertGainMusicExp: score.ExpertGainMusicExp || null,
								masterGainMusicExp: score.MasterGainMusicExp || null,
							},
						});
						result.musicScoresImported++;
					} catch (error) {
						result.errors.push(
							`楽曲スコア ${score.Id} のインポートに失敗: ${error.message}`,
						);
					}
				}
			}

			// Live Timelines
			const liveTimelinesPath = this.globalConfig.getLiveTimelinesYamlPath();
			if (fs.existsSync(liveTimelinesPath)) {
				const liveTimelinesYaml = fs.readFileSync(liveTimelinesPath, "utf8");
				const liveTimelinesData = yaml.load(
					liveTimelinesYaml,
				) as LiveTimelineYamlData[];

				// LiveTimelinesも簡易的に最初の10件をインポート
				const relevantTimelines = liveTimelinesData.slice(0, 10);

				for (const timeline of relevantTimelines) {
					try {
						const existing = await this.prisma.liveTimelines.findUnique({
							where: { id: timeline.Id.toString() },
						});

						if (existing) {
							result.liveTimelinesSkipped++;
							continue;
						}

						await this.prisma.liveTimelines.create({
							data: {
								id: timeline.Id.toString(),
								label: timeline.Label || null,
								musicId: timeline.MusicId || null,
								locationsId: timeline.LocationsId || null,
								freeId: timeline.FreeId || null,
								nextId: timeline.NextId || null,
								movieIds: timeline.MovieIds || null,
							},
						});
						result.liveTimelinesImported++;
					} catch (error) {
						result.errors.push(
							`ライブタイムライン ${timeline.Id} のインポートに失敗: ${error.message}`,
						);
					}
				}
			}
		} catch (error) {
			result.errors.push(`楽曲データの読み込みに失敗: ${error.message}`);
		}

		return result;
	}

	private async importCharacters() {
		const result = { imported: 0, skipped: 0, errors: [] as string[] };

		try {
			const charactersPath = this.globalConfig.getCharactersYamlPath();

			if (!fs.existsSync(charactersPath)) {
				throw new Error(`Characters.yamlが見つかりません: ${charactersPath}`);
			}

			const charactersYaml = fs.readFileSync(charactersPath, "utf8");
			const charactersData = yaml.load(charactersYaml) as CharacterYamlData[];

			this.logger.log(
				`${charactersData.length}件のキャラクターデータを処理開始`,
			);

			for (const character of charactersData) {
				try {
					// 既存チェック
					const existing = await this.prisma.characters.findUnique({
						where: { id: character.Id },
					});

					if (existing) {
						result.skipped++;
						continue;
					}

					// Use DisplayFullName if available and NameDisplayType is 1
					let displayName = character.DisplayFullName || "";
					let nameLast = character.NameLast || "";
					let nameFirst = character.NameFirst || "";

					if (character.NameDisplayType === 1 && character.DisplayFullName) {
						// Parse the full name - if it contains &, take the second part
						if (character.DisplayFullName.includes("&")) {
							const parts = character.DisplayFullName.split("&");
							displayName = parts[1].trim();
						} else {
							displayName = character.DisplayFullName;
						}

						// Try to split the display name into last and first name
						const nameParts = displayName.split(" ");
						if (nameParts.length >= 2) {
							nameFirst = nameParts[0];
							nameLast = nameParts.slice(1).join(" ");
						} else {
							nameFirst = displayName;
							nameLast = "";
						}
					}

					await this.prisma.characters.create({
						data: {
							id: character.Id,
							nameLast: nameLast,
							nameFirst: nameFirst,
							latinAlphabetNameLast: character.LatinAlphabetNameLast || null,
							latinAlphabetNameFirst: character.LatinAlphabetNameFirst || null,
							generationsId: character.GenerationsId || 0,
							characterVoice: character.CharacterVoice || null,
							themeColor: character.ThemeColor || null,
							introduction: character.Introduction || null,
							styleType: character.StyleType || 1,
						},
					});
					result.imported++;
				} catch (error) {
					const errorMsg = `キャラクター ${character.Id} のインポートに失敗: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `キャラクターデータの読み込みに失敗: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	private async importCards() {
		const result = { imported: 0, skipped: 0, errors: [] as string[] };

		try {
			const cardsPath = this.globalConfig.getCardDatasYamlPath();

			if (!fs.existsSync(cardsPath)) {
				throw new Error(`CardDatas.yamlが見つかりません: ${cardsPath}`);
			}

			const cardsYaml = fs.readFileSync(cardsPath, "utf8");
			const cardsData = yaml.load(cardsYaml) as CardYamlData[];

			this.logger.log(`${cardsData.length}件のカードデータを処理開始`);

			for (const card of cardsData) {
				try {
					// 既存チェック
					const existing = await this.prisma.cardIllustrations.findUnique({
						where: { id: card.Id },
					});

					if (existing) {
						result.skipped++;
						continue;
					}

					// キャラクターの存在確認
					const character = await this.prisma.characters.findUnique({
						where: { id: card.CharactersId },
					});

					if (!character) {
						const errorMsg = `キャラクター ${card.CharactersId} が見つからないため、カード ${card.Id} をスキップ`;
						this.logger.warn(errorMsg);
						result.errors.push(errorMsg);
						result.skipped++;
						continue;
					}

					await this.prisma.cardIllustrations.create({
						data: {
							id: card.Id,
							cardSeriesId: card.CardSeriesId,
							characterId: card.CharactersId,
							name: card.Name || null,
							description: card.Description || null,
							rarity: card.Rarity || 1,
							evolveTimes: card.EvolveTimes || 0,
							style: card.Style || 1,
							mood: card.Mood || 1,
							initialSmile: card.InitialSmile || null,
							initialPure: card.InitialPure || null,
							initialCool: card.InitialCool || null,
							initialMental: card.InitialMental || null,
							maxSmile: card.MaxSmile || null,
							maxPure: card.MaxPure || null,
							maxCool: card.MaxCool || null,
							maxMental: card.MaxMental || null,
							beatPoint: card.BeatPoint || null,
							orderId: card.OrderId || null,
						},
					});
					result.imported++;
				} catch (error) {
					const errorMsg = `カード ${card.Id} のインポートに失敗: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `カードデータの読み込みに失敗: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	async getAllCards() {
		return this.prisma.cardIllustrations.findMany({
			include: {
				character: true,
			},
			orderBy: {
				orderId: "asc",
			},
		});
	}

	async getCardById(id: number) {
		return this.prisma.cardIllustrations.findUnique({
			where: { id },
			include: {
				character: true,
			},
		});
	}

	async getCardsByCharacter(characterId: number) {
		return this.prisma.cardIllustrations.findMany({
			where: { characterId },
			include: {
				character: true,
			},
			orderBy: {
				evolveTimes: "asc",
			},
		});
	}

	async getCardsByRarity(rarity: number) {
		return this.prisma.cardIllustrations.findMany({
			where: { rarity },
			include: {
				character: true,
			},
			orderBy: {
				orderId: "asc",
			},
		});
	}

	// Card performance data import methods
	private async importCardSkills() {
		const result = { imported: 0, skipped: 0, errors: [] as string[] };

		try {
			const cardSkillsPath = this.globalConfig.getCardSkillsYamlPath();

			if (!fs.existsSync(cardSkillsPath)) {
				throw new Error(`CardSkills.yamlが見つかりません: ${cardSkillsPath}`);
			}

			const cardSkillsYaml = fs.readFileSync(cardSkillsPath, "utf8");
			const cardSkillsData = yaml.load(cardSkillsYaml) as CardSkillYamlData[];

			this.logger.log(
				`${cardSkillsData.length}件のカードスキルデータを処理開始`,
			);

			for (const cardSkill of cardSkillsData) {
				try {
					// 既存チェック
					const existing = await this.prisma.cardSkills.findUnique({
						where: { id: cardSkill.Id.toString() },
					});

					if (existing) {
						result.skipped++;
						continue;
					}

					// カードスキルセリーズIDからカードシリーズIDを推測
					const cardSeriesId = cardSkill.CardSkillSeriesId
						? parseInt(cardSkill.CardSkillSeriesId.toString().substring(0, 7))
						: null;

					await this.prisma.cardSkills.create({
						data: {
							id: cardSkill.Id.toString(),
							cardSkillSeriesId: cardSkill.CardSkillSeriesId.toString(),
							skillLevel: cardSkill.SkillLevel,
							skillCost: cardSkill.SkillCost || null,
							apperanceType: cardSkill.ApperanceType?.toString() || null,
							cardSkillEffectId: cardSkill.CardSkillEffectId || null,
							description: cardSkill.Description || null,
							cardSeriesId: cardSeriesId,
						},
					});
					result.imported++;
				} catch (error) {
					const errorMsg = `カードスキル ${cardSkill.Id} のインポートに失敗: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `カードスキルデータの読み込みに失敗: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	private async importCardLevels() {
		const result = { imported: 0, skipped: 0, errors: [] as string[] };

		try {
			const cardLevelsPath = this.globalConfig.getCardLevelsYamlPath();

			if (!fs.existsSync(cardLevelsPath)) {
				throw new Error(`CardLevels.yamlが見つかりません: ${cardLevelsPath}`);
			}

			const cardLevelsYaml = fs.readFileSync(cardLevelsPath, "utf8");
			const cardLevelsData = yaml.load(cardLevelsYaml) as CardLevelYamlData[];

			this.logger.log(
				`${cardLevelsData.length}件のカードレベルデータを処理開始`,
			);

			for (const cardLevel of cardLevelsData) {
				try {
					// 既存チェック
					const existing = await this.prisma.cardLevels.findUnique({
						where: { id: cardLevel.Id },
					});

					if (existing) {
						result.skipped++;
						continue;
					}

					await this.prisma.cardLevels.create({
						data: {
							id: cardLevel.Id,
							experienceType: cardLevel.ExperienceType,
							cardLevel: cardLevel.CardLevel,
							experience: cardLevel.Experience,
							cumulativeExperience: cardLevel.CumulativeExperience,
						},
					});
					result.imported++;
				} catch (error) {
					const errorMsg = `カードレベル ${cardLevel.Id} のインポートに失敗: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `カードレベルデータの読み込みに失敗: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	private async importCenterSkills() {
		const result = { imported: 0, skipped: 0, errors: [] as string[] };

		try {
			const centerSkillsPath = this.globalConfig.getCenterSkillsYamlPath();

			if (!fs.existsSync(centerSkillsPath)) {
				throw new Error(
					`CenterSkills.yamlが見つかりません: ${centerSkillsPath}`,
				);
			}

			const centerSkillsYaml = fs.readFileSync(centerSkillsPath, "utf8");
			const centerSkillsData = yaml.load(
				centerSkillsYaml,
			) as CenterSkillYamlData[];

			this.logger.log(
				`${centerSkillsData.length}件のセンタースキルデータを処理開始`,
			);

			for (const centerSkill of centerSkillsData) {
				try {
					// 既存チェック
					const existing = await this.prisma.centerSkills.findUnique({
						where: { id: centerSkill.Id },
					});

					if (existing) {
						result.skipped++;
						continue;
					}

					await this.prisma.centerSkills.create({
						data: {
							id: centerSkill.Id,
							centerSkillSeriesId: centerSkill.CenterSkillSeriesId,
							skillLevel: centerSkill.SkillLevel,
							description: centerSkill.Description || null,
							centerSkillEffectId: centerSkill.CenterSkillEffectId || null,
						},
					});
					result.imported++;
				} catch (error) {
					const errorMsg = `センタースキル ${centerSkill.Id} のインポートに失敗: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `センタースキルデータの読み込みに失敗: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	// Get card with performance data
	async getCardWithPerformanceData(cardId: number) {
		const card = await this.prisma.cardIllustrations.findUnique({
			where: { id: cardId },
			include: {
				character: true,
			},
		});

		if (!card) {
			return null;
		}

		// Get card skills for ALL evolution stages of this card series
		// CardSeriesId: 1021801 -> CardSkillSeriesId: 10218011, 10218012, 10218013, 10218014
		const cardSeriesIdStr = card.cardSeriesId.toString();
		const baseId = cardSeriesIdStr.substring(0, 6); // "102180"
		const seriesDigit = cardSeriesIdStr.substring(6); // "1"

		// Get all evolution stages for this card series
		const allCardsInSeries = await this.prisma.cardIllustrations.findMany({
			where: { cardSeriesId: card.cardSeriesId },
			select: { evolveTimes: true },
		});

		const evolutionStages = [
			...new Set(allCardsInSeries.map((c) => c.evolveTimes || 1)),
		];
		const expectedCardSkillSeriesIds = evolutionStages.map(
			(stage) => baseId + seriesDigit + stage.toString(),
		);

		const cardSkills = await this.prisma.cardSkills.findMany({
			where: {
				cardSkillSeriesId: { in: expectedCardSkillSeriesIds },
			},
			orderBy: [{ cardSkillSeriesId: "asc" }, { skillLevel: "asc" }],
		});

		// Get card level info based on rarity
		const cardLevels = await this.prisma.cardLevels.findMany({
			where: { experienceType: card.rarity },
			orderBy: { cardLevel: "asc" },
		});

		return {
			...card,
			cardSkills,
			cardLevels,
		};
	}
}
