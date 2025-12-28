import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { ConversionStatus } from "../../../generated/prisma";
import { AppLoggerService } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AudioSearchService {
	private readonly logger;

	constructor(
		private prisma: PrismaService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(AudioSearchService.name);
	}

	// 音楽検索機能
	async searchMusic(
		query?: string,
		category?: string,
		limit: number = 50,
		offset: number = 0,
		sortBy?: string,
		sortOrder?: "asc" | "desc",
	) {
		const whereCondition: Record<string, unknown> = {
			status: ConversionStatus.COMPLETED,
			audioStreams: {
				some: {
					status: ConversionStatus.COMPLETED,
				},
			},
			filename: { startsWith: "bgm_live_" },
		};

		if (category) {
			whereCondition.category = category;
		}

		if (query) {
			whereCondition.OR = [
				{ filename: { contains: query } },
				{ displayName: { contains: query } },
				{ title: { contains: query } },
				{ description: { contains: query } },
			];
		}

		// ソート条件を設定
		const orderBy = this.buildOrderBy(sortBy, sortOrder);

		const [results, total] = await Promise.all([
			this.prisma.audioFiles.findMany({
				where: whereCondition,
				include: {
					audioStreams: {
						where: { status: ConversionStatus.COMPLETED },
						orderBy: { streamIndex: "asc" },
					},
				},
				orderBy,
				take: limit,
				skip: offset,
			}),
			this.prisma.audioFiles.count({
				where: whereCondition,
			}),
		]);

		const musicFiles = results.map((file) => {
			const { title, artist } = this.extractTitleAndArtist(
				file.displayName,
				file.filename,
			);
			return {
				id: file.id,
				title,
				artist,
				album: undefined,
				duration: file.duration,
				url: this.getMusicUrl(file, 0), // fileオブジェクト全体を渡す
				thumbnailUrl: file.thumbnailPath || this.getThumbnailUrl(file.filename),
			};
		});

		return {
			data: musicFiles,
			pagination: {
				total,
				offset,
				limit,
				hasMore: offset + limit < total,
			},
		};
	}

	// 音楽ファイルのURLパスを生成（データベースからoutputPathを取得）
	private getMusicUrl(
		audioFile: {
			filename: string;
			outputPath?: string | null;
			audioStreams?: Array<{ outputPath?: string | null }>;
		},
		streamIndex: number = 0,
	): string {
		const basePath = "/assets/bgm";
		// outputPathが存在する場合はそれを直接使用
		if (audioFile.outputPath) {
			return audioFile.outputPath;
		}

		// ストリームが存在する場合はoutputPathから生成
		if (audioFile.audioStreams && audioFile.audioStreams.length > streamIndex) {
			const stream = audioFile.audioStreams[streamIndex];
			if (stream.outputPath) {
				return stream.outputPath;
			}
		}

		// フォールバック: ファイル名から推測
		const baseName = path.parse(audioFile.filename).name;
		return `${basePath}/${baseName}.m4a`;
	}

	// サムネイルURLパスを生成（実際のファイル構造に基づく）
	private getThumbnailUrl(filename: string): string {
		const basePath = "/assets/bgm/thumbnails";
		const baseName = path.parse(filename).name;

		// BGMファイルの場合、数字を抽出してimage_sticker_40xxxxxxまたは90xxxxxx.webpを生成
		if (baseName.startsWith("bgm_live_")) {
			// bgm_live_30420301.acb → 304203を抽出
			const match = baseName.match(/bgm_live_([0-9]{6})[0-9]{2}/);
			if (match) {
				const number = match[1];
				return `${basePath}/image_sticker_40${number}.webp`;
			}
		} else if (/^\d{6}_/.test(baseName)) {
			// M4Aファイル名パターン: 303203_名前のない怪物.m4a → 303203を抽出
			const match = baseName.match(/^(\d{6})_/);
			if (match) {
				const number = match[1];
				return `${basePath}/image_sticker_40${number}.webp`;
			}
		}

		// フォールバック: 元のロジック
		let imageName = baseName;
		if (baseName.startsWith("bgm_live_")) {
			imageName = baseName.replace("bgm_", "");
		} else if (baseName.includes("adv")) {
			imageName = `${baseName}_default`;
		} else if (baseName.includes("gacha")) {
			imageName = `${baseName}_default`;
		}

		return `${basePath}/${imageName}.webp`;
	}

	// displayNameとfilenameから適切なtitleとartistを抽出
	private extractTitleAndArtist(
		displayName: string | null,
		filename: string,
	): { title: string; artist: string } {
		if (displayName?.includes(" / ")) {
			// YAMLメタデータから保存された形式: "Title / Artist"
			const [title, artist] = displayName.split(" / ", 2);
			return { title: title.trim(), artist: artist.trim() };
		} else if (displayName) {
			// displayNameがあるがartist情報がない場合
			return { title: displayName, artist: this.extractArtist(filename) };
		} else {
			// displayNameがない場合はfilename基準のフォールバック
			return {
				title: this.extractTitle(filename),
				artist: this.extractArtist(filename),
			};
		}
	}

	// ファイル名からタイトルを抽出
	private extractTitle(filename: string): string {
		const baseName = path.parse(filename).name;

		// ユニークIDプレフィックスを削除してタイトルを生成
		if (baseName.startsWith("bgm_live_")) {
			return baseName.replace("bgm_live_", "Live ");
		} else if (baseName.startsWith("bgm_")) {
			return baseName.replace("bgm_", "").replace(/_/g, " ");
		} else if (baseName.includes("adv")) {
			return "Adventure Story BGM";
		} else if (baseName.includes("gacha")) {
			return "Gacha BGM";
		}

		return baseName.replace(/_/g, " ");
	}

	// ファイル名からアーティスト名を抽出
	private extractArtist(filename: string): string {
		const baseName = path.parse(filename).name;

		if (baseName.startsWith("bgm_live_")) {
			return "Live Performance";
		} else if (baseName.startsWith("bgm_")) {
			return "Game BGM";
		} else if (baseName.includes("voice") || baseName.includes("vo_")) {
			return "Character Voice";
		}

		return "Unknown Artist";
	}

	// ID指定で音楽ファイルを取得
	async getMusicFileById(id: string) {
		return await this.prisma.audioFiles.findUnique({
			where: { id },
			include: {
				audioStreams: {
					where: { status: ConversionStatus.COMPLETED },
					orderBy: { streamIndex: "asc" },
				},
			},
		});
	}

	// 特定音楽ファイルのYAMLメタデータを取得
	async getMusicMetadata(id: string) {
		const audioFile = await this.prisma.audioFiles.findUnique({
			where: { id },
			select: {
				id: true,
				filename: true,
				displayName: true,
				category: true,
				status: true,
				// 全YAMLメタデータフィールド
				musicId: true,
				orderId: true,
				title: true,
				titleFurigana: true,
				jacketId: true,
				soundId: true,
				description: true,
				generationsId: true,
				unitId: true,
				centerCharacterId: true,
				singerCharacterId: true,
				supportCharacterId: true,
				musicType: true,
				experienceType: true,
				beatPointCoefficient: true,
				apIncrement: true,
				songTime: true,
				playTime: true,
				feverSectionNo: true,
				previewStartTime: true,
				previewEndTime: true,
				previewFadeInTime: true,
				previewFadeOutTime: true,
				releaseConditionType: true,
				releaseConditionDetail: true,
				releaseConditionText: true,
				startTime: true,
				endTime: true,
				maxAp: true,
				isVideoMode: true,
				videoBgId: true,
				songType: true,
				musicScoreReleaseTime: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return audioFile;
	}

	// 全体のYAMLメタデータ一覧を取得
	async getAllYamlMetadata({
		limit,
		offset,
	}: {
		limit: number;
		offset: number;
	}) {
		const [metadata, total] = await Promise.all([
			this.prisma.audioFiles.findMany({
				select: {
					id: true,
					filename: true,
					displayName: true,
					category: true,
					status: true,
					// 主要YAMLメタデータフィールド
					musicId: true,
					orderId: true,
					title: true,
					titleFurigana: true,
					description: true,
					generationsId: true,
					unitId: true,
					songTime: true,
					playTime: true,
					releaseConditionText: true,
					startTime: true,
					endTime: true,
					createdAt: true,
				},
				orderBy: { orderId: "asc" },
				skip: offset,
				take: limit,
			}),
			this.prisma.audioFiles.count(),
		]);

		return {
			metadata,
			total,
		};
	}

	// ソート条件を構築
	private buildOrderBy(sortBy?: string, sortOrder: "asc" | "desc" = "asc") {
		const order = sortOrder || "asc";

		switch (sortBy) {
			case "title":
				return { title: order } as const;
			case "artist":
				return { description: order } as const; // アーティスト情報として description を利用
			case "filename":
				return { filename: order } as const;
			case "updatedAt":
				return { updatedAt: order } as const;
			case "createdAt":
				return { createdAt: order } as const;
			case "duration":
				return { duration: order } as const;
			case "orderId":
				return { orderId: order } as const;
			case "unitId":
				return { unitId: order } as const;
			case "musicType":
				return { musicType: order } as const;
			case "releaseConditionType":
				return { releaseConditionType: order } as const;
			case "songTime":
				return { songTime: order } as const;
			case "generationsId":
				return { generationsId: order } as const;
			default:
				return { filename: "asc" as const };
		}
	}

	// ファイル名で音声ファイルを検索
	async getAudioFileByFilename(filename: string) {
		try {
			return await this.prisma.audioFiles.findFirst({
				where: { filename },
				include: {
					audioStreams: {
						where: { status: ConversionStatus.COMPLETED },
					},
				},
			});
		} catch (error) {
			this.logger.error(`Error getting audio file by filename: ${error}`);
			throw error;
		}
	}

	// 楽曲のいいね状態を切り替え
	async toggleLike(id: string) {
		try {
			// 現在の楽曲を取得
			const currentMusicFile = await this.prisma.audioFiles.findUnique({
				where: { id },
				select: { id: true, isLiked: true },
			});

			if (!currentMusicFile) {
				return null;
			}

			// いいね状態を切り替え
			const updatedMusicFile = await this.prisma.audioFiles.update({
				where: { id },
				data: { isLiked: !currentMusicFile.isLiked },
				select: { id: true, isLiked: true },
			});

			return updatedMusicFile;
		} catch (error) {
			this.logger.error(`Error toggling like: ${error}`);
			throw error;
		}
	}
}
