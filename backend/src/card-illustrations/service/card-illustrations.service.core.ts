import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { WavToM4aService } from "../../audio/services/wav-to-m4a.service";
import { GlobalConfigService } from "../../config/global-config.service";
import { AppLoggerService } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import type {
	AssetIndex,
	CardAssetAvailability,
	CardIndexEntry,
	CardYamlData,
	CharacterYamlData,
	MasterCache,
} from "./card-illustrations.service.types";

export class CardIllustrationsServiceCore {
	protected readonly logger;
	private assetIndexCache: { scannedAt: number; data: AssetIndex } | undefined;
	private masterCache: MasterCache | undefined;

	constructor(
		protected readonly prisma: PrismaService,
		protected readonly globalConfig: GlobalConfigService,
		protected readonly wavToM4aService: WavToM4aService,
		protected readonly appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(
			"CardIllustrationsService",
		);
	}

	private getAssetIndex(): AssetIndex {
		const now = Date.now();
		if (this.assetIndexCache && now - this.assetIndexCache.scannedAt < 30000) {
			return this.assetIndexCache.data;
		}

		const plainDir = this.globalConfig.getCachePlainPath();
		const files = fs.readdirSync(plainDir);

		const imageFull = new Set<string>();
		const imageHalf = new Set<string>();
		const imageMiddle = new Set<string>();
		const videoHome = new Set<string>();
		const videoGetIn = new Set<string>();
		const videoGetLoop = new Set<string>();
		const videoTrainingIn = new Set<string>();
		const videoTrainingLoop = new Set<string>();
		const voice = new Set<string>();

		for (const file of files) {
			if (
				file.startsWith("image_card_full_") &&
				file.endsWith(".assetbundle")
			) {
				imageFull.add(
					file.replace("image_card_full_", "").replace(".assetbundle", ""),
				);
				continue;
			}
			if (
				file.startsWith("image_card_half_") &&
				file.endsWith(".assetbundle")
			) {
				imageHalf.add(
					file.replace("image_card_half_", "").replace(".assetbundle", ""),
				);
				continue;
			}
			if (
				file.startsWith("image_card_middle_vertical_") &&
				file.endsWith(".assetbundle")
			) {
				imageMiddle.add(
					file
						.replace("image_card_middle_vertical_", "")
						.replace(".assetbundle", ""),
				);
				continue;
			}
			if (file.startsWith("picture_ur_home_") && file.endsWith(".usm")) {
				videoHome.add(file.replace("picture_ur_home_", "").replace(".usm", ""));
				continue;
			}
			if (file.startsWith("picture_ur_get_") && file.endsWith(".usm")) {
				const raw = file.replace("picture_ur_get_", "").replace(".usm", "");
				const seriesId = raw.replace(/_(in|loop)$/, "");
				if (raw.endsWith("_in")) {
					videoGetIn.add(seriesId);
				} else if (raw.endsWith("_loop")) {
					videoGetLoop.add(seriesId);
				}
				continue;
			}
			if (file.startsWith("picture_ur_training_") && file.endsWith(".usm")) {
				const raw = file
					.replace("picture_ur_training_", "")
					.replace(".usm", "");
				const seriesId = raw.replace(/_(in|loop)$/, "");
				if (raw.endsWith("_in")) {
					videoTrainingIn.add(seriesId);
				} else if (raw.endsWith("_loop")) {
					videoTrainingLoop.add(seriesId);
				}
				continue;
			}
			if (file.startsWith("vo_card_") && file.endsWith(".acb")) {
				voice.add(file.replace("vo_card_", "").replace(".acb", ""));
			}
		}

		const data = {
			imageFull,
			imageHalf,
			imageMiddle,
			videoHome,
			videoGetIn,
			videoGetLoop,
			videoTrainingIn,
			videoTrainingLoop,
			voice,
		};

		this.assetIndexCache = { scannedAt: now, data };
		return data;
	}

	private getMasterCache(): MasterCache {
		const cardsPath = this.globalConfig.getCardDatasYamlPath();
		const charactersPath = this.globalConfig.getCharactersYamlPath();

		const cardMtime = fs.statSync(cardsPath).mtimeMs;
		const characterMtime = fs.statSync(charactersPath).mtimeMs;

		if (
			this.masterCache &&
			this.masterCache.cardMtime === cardMtime &&
			this.masterCache.characterMtime === characterMtime
		) {
			return this.masterCache;
		}

		const cardsYaml = fs.readFileSync(cardsPath, "utf8");
		const charactersYaml = fs.readFileSync(charactersPath, "utf8");
		const cards = yaml.load(cardsYaml) as CardYamlData[];
		const characters = yaml.load(charactersYaml) as CharacterYamlData[];

		const cardById = new Map<number, CardYamlData>();
		const characterById = new Map<number, CharacterYamlData>();
		const cardsBySeriesId = new Map<number, CardYamlData[]>();

		for (const card of cards) {
			cardById.set(card.Id, card);
			if (!cardsBySeriesId.has(card.CardSeriesId)) {
				cardsBySeriesId.set(card.CardSeriesId, []);
			}
			cardsBySeriesId.get(card.CardSeriesId)?.push(card);
		}

		for (const character of characters) {
			characterById.set(character.Id, character);
		}

		for (const seriesCards of cardsBySeriesId.values()) {
			seriesCards.sort((a, b) => (a.EvolveTimes || 0) - (b.EvolveTimes || 0));
		}

		this.masterCache = {
			loadedAt: Date.now(),
			cardMtime,
			characterMtime,
			cards,
			characters,
			cardById,
			characterById,
			cardsBySeriesId,
		};

		return this.masterCache;
	}

	private buildAvailability(
		cardId: number,
		cardSeriesId: number,
		index: AssetIndex,
	): CardAssetAvailability {
		const id = cardId.toString();
		const series = cardSeriesId.toString();
		return {
			images: {
				full: index.imageFull.has(id),
				half: index.imageHalf.has(id),
				middleVertical: index.imageMiddle.has(id),
			},
			videos: {
				home: index.videoHome.has(id),
			},
			seriesVideos: {
				get: {
					in: index.videoGetIn.has(series),
					loop: index.videoGetLoop.has(series),
				},
				training: {
					in: index.videoTrainingIn.has(series),
					loop: index.videoTrainingLoop.has(series),
				},
			},
			voice: index.voice.has(series),
		};
	}

	async getCardIndex() {
		const { cards, characterById } = this.getMasterCache();
		const assetIndex = this.getAssetIndex();

		const entries: CardIndexEntry[] = cards.map((card) => {
			const character = characterById.get(card.CharactersId);
			return {
				id: card.Id,
				cardSeriesId: card.CardSeriesId,
				characterId: card.CharactersId,
				name: card.Name,
				description: card.Description,
				rarity: card.Rarity || 1,
				evolveTimes: card.EvolveTimes || 0,
				style: card.Style || 1,
				mood: card.Mood || 1,
				initialSmile: card.InitialSmile || undefined,
				initialPure: card.InitialPure || undefined,
				initialCool: card.InitialCool || undefined,
				initialMental: card.InitialMental || undefined,
				maxSmile: card.MaxSmile || undefined,
				maxPure: card.MaxPure || undefined,
				maxCool: card.MaxCool || undefined,
				maxMental: card.MaxMental || undefined,
				beatPoint: card.BeatPoint || undefined,
				orderId: card.OrderId || undefined,
				character: {
					id: character?.Id || card.CharactersId,
					nameLast: character?.NameLast || "",
					nameFirst: character?.NameFirst || "",
					latinAlphabetNameLast: character?.LatinAlphabetNameLast || "",
					latinAlphabetNameFirst: character?.LatinAlphabetNameFirst || "",
					themeColor: character?.ThemeColor || "",
					introduction: character?.Introduction || "",
					styleType: character?.StyleType || 0,
				},
				assets: this.buildAvailability(card.Id, card.CardSeriesId, assetIndex),
			};
		});

		const totals = {
			cards: entries.length,
			images: {
				full: entries.filter((entry) => entry.assets.images.full).length,
				half: entries.filter((entry) => entry.assets.images.half).length,
				middleVertical: entries.filter(
					(entry) => entry.assets.images.middleVertical,
				).length,
			},
			videos: {
				home: entries.filter((entry) => entry.assets.videos.home).length,
				get: entries.filter(
					(entry) =>
						entry.assets.seriesVideos.get.in ||
						entry.assets.seriesVideos.get.loop,
				).length,
				training: entries.filter(
					(entry) =>
						entry.assets.seriesVideos.training.in ||
						entry.assets.seriesVideos.training.loop,
				).length,
			},
			voice: entries.filter((entry) => entry.assets.voice).length,
		};

		return { totals, cards: entries };
	}

	async getCardByIdFromRaw(cardId: number) {
		const { cardById, characterById, cardsBySeriesId } = this.getMasterCache();
		const card = cardById.get(cardId);
		if (!card) {
			return null;
		}
		const assetIndex = this.getAssetIndex();
		const character = characterById.get(card.CharactersId);
		const seriesCards = cardsBySeriesId.get(card.CardSeriesId) || [];
		const seriesEntries = seriesCards.map((entry) => ({
			id: entry.Id,
			cardSeriesId: entry.CardSeriesId,
			characterId: entry.CharactersId,
			name: entry.Name,
			description: entry.Description,
			rarity: entry.Rarity || 1,
			evolveTimes: entry.EvolveTimes || 0,
			style: entry.Style || 1,
			mood: entry.Mood || 1,
			assets: this.buildAvailability(entry.Id, entry.CardSeriesId, assetIndex),
		}));

		return {
			id: card.Id,
			cardSeriesId: card.CardSeriesId,
			characterId: card.CharactersId,
			name: card.Name,
			description: card.Description,
			rarity: card.Rarity || 1,
			evolveTimes: card.EvolveTimes || 0,
			style: card.Style || 1,
			mood: card.Mood || 1,
			initialSmile: card.InitialSmile || undefined,
			initialPure: card.InitialPure || undefined,
			initialCool: card.InitialCool || undefined,
			initialMental: card.InitialMental || undefined,
			maxSmile: card.MaxSmile || undefined,
			maxPure: card.MaxPure || undefined,
			maxCool: card.MaxCool || undefined,
			maxMental: card.MaxMental || undefined,
			beatPoint: card.BeatPoint || undefined,
			orderId: card.OrderId || undefined,
			character: {
				id: character?.Id || card.CharactersId,
				nameLast: character?.NameLast || "",
				nameFirst: character?.NameFirst || "",
				latinAlphabetNameLast: character?.LatinAlphabetNameLast || "",
				latinAlphabetNameFirst: character?.LatinAlphabetNameFirst || "",
				themeColor: character?.ThemeColor || "",
				introduction: character?.Introduction || "",
				styleType: character?.StyleType || 0,
			},
			assets: this.buildAvailability(card.Id, card.CardSeriesId, assetIndex),
			seriesCards: seriesEntries,
		};
	}

	protected getCardImageAssetBundlePath(
		cardId: number,
		type: "full" | "half" | "middle_vertical",
	) {
		const plainDir = this.globalConfig.getCachePlainPath();
		const prefix =
			type === "full"
				? "image_card_full_"
				: type === "half"
					? "image_card_half_"
					: "image_card_middle_vertical_";
		return path.join(plainDir, `${prefix}${cardId}.assetbundle`);
	}

	protected getCardImageCachePath(cardId: number, type: string) {
		return path.join(
			this.globalConfig.getCardIllustrationsAssetsPath(),
			`card_${cardId}_${type}.png`,
		);
	}

	protected getCardVideoCachePath(
		cardId: number,
		type: "home" | "get" | "training",
		phase: "in" | "loop" | "single",
	) {
		return path.join(
			this.globalConfig.getCardIllustrationsAssetsPath(),
			`card_${cardId}_${type}_${phase}.mp4`,
		);
	}

	protected getSeriesVideoCachePath(
		cardSeriesId: number,
		type: "get" | "training",
		phase: "in" | "loop",
	) {
		return path.join(
			this.globalConfig.getCardIllustrationsAssetsPath(),
			`card_series_${cardSeriesId}_${type}_${phase}.mp4`,
		);
	}

	async getCardImageFromRaw(
		cardId: number,
		type: "full" | "half" | "middle_vertical",
	) {
		const outputPath = this.getCardImageCachePath(cardId, type);
		if (fs.existsSync(outputPath)) {
			return outputPath;
		}

		const inputPath = this.getCardImageAssetBundlePath(cardId, type);
		if (!fs.existsSync(inputPath)) {
			return null;
		}

		const assetsDir = this.globalConfig.getCardIllustrationsAssetsPath();
		if (!fs.existsSync(assetsDir)) {
			fs.mkdirSync(assetsDir, { recursive: true });
		}

		const tempDir = fs.mkdtempSync(
			path.join(this.globalConfig.getTempPath(), "card-image-"),
		);
		const assetStudio = this.globalConfig.getAssetStudioCliPath();

		const cmd = `export DOTNET_ROOT=${this.globalConfig.getDotnetRootAssetStudio()} && "${assetStudio}" "${inputPath}" -t tex2d -o "${tempDir}" --image-format png --log-level warning`;

		try {
			await new Promise<void>((resolve, reject) => {
				exec(
					cmd,
					{
						timeout: 60000,
						shell: "/bin/bash",
						env: {
							...process.env,
							DOTNET_ROOT: this.globalConfig.getDotnetRootAssetStudio(),
							PATH:
								"/usr/bin:" +
								this.globalConfig.getDotnetRootAssetStudio() +
								":" +
								process.env.PATH,
						},
					},
					(error, stdout, stderr) => {
						if (error) {
							if (stderr) this.logger.error(`AssetStudio stderr: ${stderr}`);
							if (stdout) this.logger.log(`AssetStudio stdout: ${stdout}`);
							reject(new Error(`AssetStudio failed: ${error.message}`));
							return;
						}
						resolve();
					},
				);
			});

			const extracted = fs
				.readdirSync(tempDir)
				.filter((file) => file.endsWith(".png"));

			if (extracted.length === 0) {
				return null;
			}

			const srcPath = path.join(tempDir, extracted[0]);
			fs.renameSync(srcPath, outputPath);
			return outputPath;
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}

	private getUsmPathForCard(cardId: number, type: "home"): string | null {
		if (type !== "home") return null;
		const plainDir = this.globalConfig.getCachePlainPath();
		const file = path.join(plainDir, `picture_ur_home_${cardId}.usm`);
		return fs.existsSync(file) ? file : null;
	}

	private getUsmPathForSeries(
		cardSeriesId: number,
		type: "get" | "training",
		phase: "in" | "loop",
	): string | null {
		const plainDir = this.globalConfig.getCachePlainPath();
		const prefix = type === "get" ? "picture_ur_get_" : "picture_ur_training_";
		const file = path.join(plainDir, `${prefix}${cardSeriesId}_${phase}.usm`);
		return fs.existsSync(file) ? file : null;
	}

	async getCardVideoFromRaw(cardId: number) {
		const cachePath = this.getCardVideoCachePath(cardId, "home", "single");
		if (fs.existsSync(cachePath)) {
			return cachePath;
		}

		const inputPath = this.getUsmPathForCard(cardId, "home");
		if (!inputPath) {
			return null;
		}

		const assetsDir = this.globalConfig.getCardIllustrationsAssetsPath();
		if (!fs.existsSync(assetsDir)) {
			fs.mkdirSync(assetsDir, { recursive: true });
		}

		const tempDir = fs.mkdtempSync(
			path.join(this.globalConfig.getTempPath(), "card-video-"),
		);
		const usmToolkitDir = this.globalConfig.getUsmToolkitPath();
		const cmd = `cd "${usmToolkitDir}" && dotnet run -- convert "${inputPath}" -o "${tempDir}" -c`;

		try {
			await new Promise<void>((resolve, reject) => {
				exec(
					cmd,
					{
						timeout: 120000,
						shell: "/bin/bash",
						env: {
							...process.env,
							DOTNET_ROOT: this.globalConfig.getDotnetRootUsmToolkit(),
							PATH:
								this.globalConfig.getDotnetRootUsmToolkit() +
								":" +
								this.globalConfig.getVgmstreamCliPath() +
								":" +
								this.globalConfig.getBinPath() +
								":/usr/bin:" +
								process.env.PATH,
							DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: "1",
							VGMSTREAM_CLI: this.globalConfig.getVgmstreamCliPath(),
							FFMPEG_BIN: this.globalConfig.getFfmpegPath(),
						},
					},
					(error, stdout, stderr) => {
						if (error) {
							if (stderr) this.logger.error(`UsmToolkit stderr: ${stderr}`);
							if (stdout) this.logger.log(`UsmToolkit stdout: ${stdout}`);
							reject(new Error(`UsmToolkit failed: ${error.message}`));
							return;
						}
						resolve();
					},
				);
			});

			const converted = fs
				.readdirSync(tempDir)
				.filter((file) => file.endsWith(".mp4"));

			if (converted.length === 0) {
				return null;
			}

			const srcPath = path.join(tempDir, converted[0]);
			fs.renameSync(srcPath, cachePath);
			return cachePath;
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}

	async getSeriesVideoFromRaw(
		cardSeriesId: number,
		type: "get" | "training",
		phase: "in" | "loop",
	) {
		const cachePath = this.getSeriesVideoCachePath(cardSeriesId, type, phase);
		if (fs.existsSync(cachePath)) {
			return cachePath;
		}

		const inputPath = this.getUsmPathForSeries(cardSeriesId, type, phase);
		if (!inputPath) {
			return null;
		}

		const assetsDir = this.globalConfig.getCardIllustrationsAssetsPath();
		if (!fs.existsSync(assetsDir)) {
			fs.mkdirSync(assetsDir, { recursive: true });
		}

		const tempDir = fs.mkdtempSync(
			path.join(this.globalConfig.getTempPath(), "card-series-video-"),
		);
		const usmToolkitDir = this.globalConfig.getUsmToolkitPath();
		const cmd = `cd "${usmToolkitDir}" && dotnet run -- convert "${inputPath}" -o "${tempDir}" -c`;

		try {
			await new Promise<void>((resolve, reject) => {
				exec(
					cmd,
					{
						timeout: 120000,
						shell: "/bin/bash",
						env: {
							...process.env,
							DOTNET_ROOT: this.globalConfig.getDotnetRootUsmToolkit(),
							PATH:
								this.globalConfig.getDotnetRootUsmToolkit() +
								":" +
								this.globalConfig.getVgmstreamCliPath() +
								":" +
								this.globalConfig.getBinPath() +
								":/usr/bin:" +
								process.env.PATH,
							DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: "1",
							VGMSTREAM_CLI: this.globalConfig.getVgmstreamCliPath(),
							FFMPEG_BIN: this.globalConfig.getFfmpegPath(),
						},
					},
					(error, stdout, stderr) => {
						if (error) {
							if (stderr) this.logger.error(`UsmToolkit stderr: ${stderr}`);
							if (stdout) this.logger.log(`UsmToolkit stdout: ${stdout}`);
							reject(new Error(`UsmToolkit failed: ${error.message}`));
							return;
						}
						resolve();
					},
				);
			});

			const converted = fs
				.readdirSync(tempDir)
				.filter((file) => file.endsWith(".mp4"));

			if (converted.length === 0) {
				return null;
			}

			const srcPath = path.join(tempDir, converted[0]);
			fs.renameSync(srcPath, cachePath);
			return cachePath;
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}
}
