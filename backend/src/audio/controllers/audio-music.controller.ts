import * as fs from "node:fs";
import { createReadStream } from "node:fs";
import * as path from "node:path";
import {
	Controller,
	Get,
	Header,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Query,
	StreamableFile,
} from "@nestjs/common";
import { GlobalConfigService } from "../../config/global-config.service";
import { AppLoggerService } from "../../logger/logger.service";
import type { MusicListResponse } from "../interfaces/music-response.interface";
import { AudioSearchService } from "../services/audio-search.service";

@Controller("audio/music")
export class AudioMusicController {
	private readonly logger;

	constructor(
		private readonly audioSearchService: AudioSearchService,
		private readonly globalConfig: GlobalConfigService,
		private readonly appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(AudioMusicController.name);
	}

	// 音楽ファイル検索
	@Get("search")
	async searchMusic(
		@Query("q") query?: string,
		@Query("category") category?: string,
		@Query("limit") limit?: string,
		@Query("offset") offset?: string,
		@Query("sortBy") sortBy?: string,
		@Query("sortOrder") sortOrder?: "asc" | "desc",
	): Promise<MusicListResponse> {
		try {
			const searchLimit = limit ? parseInt(limit, 10) : 50;
			const searchOffset = offset ? parseInt(offset, 10) : 0;
			const audioCategory = category as string;

			const results = await this.audioSearchService.searchMusic(
				query,
				audioCategory,
				searchLimit,
				searchOffset,
				sortBy,
				sortOrder,
			);

			return {
				success: true,
				data: results.data,
				pagination: results.pagination,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to search music: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 音楽ファイル一覧（検索・フィルタリング対応）
	// 特定の音楽ファイルのYAMLメタデータを取得
	@Get("metadata/:id")
	async getMusicMetadata(@Param("id") id: string) {
		try {
			const metadata = await this.audioSearchService.getMusicMetadata(id);

			if (!metadata) {
				throw new HttpException(
					`Music file not found: ${id}`,
					HttpStatus.NOT_FOUND,
				);
			}

			return {
				success: true,
				data: metadata,
			};
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				`Failed to get music metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 全体曲のYAMLメタデータ一覧を取得
	@Get("yaml-metadata")
	async getAllYamlMetadata(
		@Query("limit") limit?: string,
		@Query("offset") offset?: string,
	) {
		try {
			const searchLimit = limit ? parseInt(limit, 10) : 50;
			const searchOffset = offset ? parseInt(offset, 10) : 0;

			const results = await this.audioSearchService.getAllYamlMetadata({
				limit: searchLimit,
				offset: searchOffset,
			});

			return {
				success: true,
				data: results.metadata,
				pagination: {
					total: results.total,
					limit: searchLimit,
					offset: searchOffset,
					hasMore: results.total > searchOffset + searchLimit,
				},
			};
		} catch (error) {
			throw new HttpException(
				`Failed to get YAML metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 音楽ファイルダウンロード
	@Get("download/:id")
	@Header("Content-Type", "audio/m4a")
	async downloadMusic(@Param("id") id: string): Promise<StreamableFile> {
		try {
			const musicFile = await this.audioSearchService.getMusicFileById(id);

			if (!musicFile) {
				throw new HttpException(
					`Music file not found: ${id}`,
					HttpStatus.NOT_FOUND,
				);
			}

			// Get file path from streams first, then fallback to main outputPath
			let filePath: string | undefined;

			// Try to get from streams first
			const stream = musicFile.audioStreams?.[0];
			if (stream?.outputPath) {
				filePath = stream.outputPath;
			} else if (musicFile.outputPath) {
				// Fallback to main outputPath
				filePath = musicFile.outputPath;
			}

			if (!filePath) {
				throw new HttpException(
					"Music file path not available",
					HttpStatus.NOT_FOUND,
				);
			}

			// Convert relative path to absolute path
			let absoluteFilePath = filePath;
			if (!path.isAbsolute(filePath)) {
				absoluteFilePath = path.resolve(
					this.globalConfig.getProjectRootPath(),
					filePath,
				);
			}

			const fileName = path.basename(absoluteFilePath);

			// RFC 5987 compliant filename encoding for Japanese characters
			const encodedFileName = encodeURIComponent(fileName);
			// Add fallback filename for older browsers and ensure .m4a extension
			const safeName =
				fileName.replace(/[^\w\-_.]|\.wav$/gi, "_").replace(/\.m4a$/i, "") +
				".m4a";
			const dispositionHeader = `attachment; filename="${safeName}"; filename*=UTF-8''${encodedFileName}`;

			const file = createReadStream(absoluteFilePath);

			return new StreamableFile(file, {
				type: "audio/m4a",
				disposition: dispositionHeader,
			});
		} catch (error) {
			this.logger.error(`Download endpoint error: ${error}`);
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				`Failed to download music: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// ストーリーボイス個別ストリーム配信
	@Get("stream/:storyId/:streamIndex")
	@Header("Content-Type", "audio/m4a")
	async streamStoryVoice(
		@Param("storyId") storyId: string,
		@Param("streamIndex") streamIndex: string,
	): Promise<StreamableFile> {
		try {
			// ストーリーボイスファイル名を構築
			const storyVoiceFilename = `vo_adv_${storyId}.acb`;

			// AudioFilesテーブルからストーリーボイスファイルを探す
			const audioFile =
				await this.audioSearchService.getAudioFileByFilename(
					storyVoiceFilename,
				);

			if (!audioFile) {
				throw new HttpException(
					`Story voice file not found: ${storyVoiceFilename}`,
					HttpStatus.NOT_FOUND,
				);
			}

			// ストリームインデックスを数値に変換
			const streamIdx = parseInt(streamIndex, 10);
			if (Number.isNaN(streamIdx) || streamIdx < 0) {
				throw new HttpException(
					`Invalid stream index: ${streamIndex}`,
					HttpStatus.BAD_REQUEST,
				);
			}

			// 指定されたストリームのパスを構築
			// 実際のファイル名パターンから該当ファイルを検索
			const storyVoicePath = path.join(
				this.globalConfig.getAssetsPath(),
				"story",
				"voice",
			);

			// ディレクトリ内のファイルから該当するストリームを検索
			let streamPath = "";
			if (fs.existsSync(storyVoicePath)) {
				const files = fs.readdirSync(storyVoicePath);
				const targetFile = files.find((file) => {
					const match = file.match(/vo_adv_\d+_(\d+)_/);
					if (match) {
						const fileStreamIdx = parseInt(match[1], 10) - 1; // 1-indexed to 0-indexed
						return (
							fileStreamIdx === streamIdx &&
							file.startsWith(`vo_adv_${storyId}_`)
						);
					}
					return false;
				});

				if (targetFile) {
					streamPath = path.join(storyVoicePath, targetFile);
				}
			}

			if (!streamPath) {
				throw new HttpException(
					`Stream file not found for story ${storyId} stream ${streamIndex}`,
					HttpStatus.NOT_FOUND,
				);
			}

			// ファイル存在確認
			try {
				const file = createReadStream(streamPath);
				const filename = path.basename(streamPath);
				return new StreamableFile(file, {
					type: "audio/m4a",
					disposition: `inline; filename="${filename}"`,
				});
			} catch {
				throw new HttpException(
					`Stream file not found: ${streamPath}`,
					HttpStatus.NOT_FOUND,
				);
			}
		} catch (error) {
			this.logger.error(`Stream endpoint error: ${error}`);
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				`Failed to stream story voice: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// ストーリーボイス直接ファイル名でのストリーム配信
	@Get("story/:storyId/file/:filename")
	async streamStoryVoiceByFilename(
		@Param("storyId") storyId: string,
		@Param("filename") filename: string,
	): Promise<StreamableFile> {
		try {
			const storyVoiceFilename = `vo_adv_${storyId}.acb`;
			const audioFile =
				await this.audioSearchService.getAudioFileByFilename(
					storyVoiceFilename,
				);

			if (!audioFile) {
				throw new HttpException(
					`Story voice file not found: ${storyVoiceFilename}`,
					HttpStatus.NOT_FOUND,
				);
			}

			// ファイル名にM4A拡張子を追加
			const baseFilename = filename.endsWith(".m4a")
				? filename.replace(/\.m4a$/, "")
				: filename;
			const storyVoicePath = path.join(
				this.globalConfig.getAssetsPath(),
				"story",
				"voice",
			);
			const resolvedFilename = `${baseFilename}.m4a`;
			const streamPath = path.join(storyVoicePath, resolvedFilename);

			// ファイル存在確認
			if (!fs.existsSync(streamPath)) {
				throw new HttpException(
					`Stream file not found: ${resolvedFilename}`,
					HttpStatus.NOT_FOUND,
				);
			}

			const file = createReadStream(streamPath);
			return new StreamableFile(file, {
				type: "audio/m4a",
				disposition: `inline; filename="${resolvedFilename}"`,
			});
		} catch (error) {
			this.logger.error(`Stream by filename error: ${error}`);
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				`Failed to stream story voice by filename: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// ストーリーボイスファイル存在確認API
	@Get("story/:storyId/exists")
	async checkStoryVoiceExists(
		@Param("storyId") storyId: string,
	): Promise<{ exists: boolean; availableFiles: string[] }> {
		try {
			const storyVoiceFilename = `vo_adv_${storyId}.acb`;
			const audioFile =
				await this.audioSearchService.getAudioFileByFilename(
					storyVoiceFilename,
				);

			if (!audioFile) {
				return { exists: false, availableFiles: [] };
			}

			// 変換済みM4Aファイルの存在確認
			const availableFiles: string[] = [];
			const storyVoicePath = path.join(
				this.globalConfig.getAssetsPath(),
				"story",
				"voice",
			);

			// 実際に生成されるファイル名パターンでチェック
			// 元のWAVファイル名を維持しているため、ディレクトリ内のファイルを直接スキャン
			if (fs.existsSync(storyVoicePath)) {
				const files = fs.readdirSync(storyVoicePath);
				const storyFiles = files.filter(
					(file) =>
						file.startsWith(`vo_adv_${storyId}_`) && file.endsWith(".m4a"),
				);

				// ファイル名から.m4a拡張子を除去してベース名を取得
				for (const file of storyFiles) {
					const base = file.replace(/\.m4a$/, "");
					availableFiles.push(base);
				}

				availableFiles.sort();
			}

			return {
				exists: availableFiles.length > 0,
				availableFiles,
			};
		} catch (error) {
			this.logger.error(
				`Failed to check story voice existence for ${storyId}: ${error.message}`,
			);
			return { exists: false, availableFiles: [] };
		}
	}

	// 楽曲のいいね状態を切り替え
	@Post("like/:id")
	async toggleLike(@Param("id") id: string) {
		try {
			const result = await this.audioSearchService.toggleLike(id);

			if (!result) {
				throw new HttpException(
					`Music file not found: ${id}`,
					HttpStatus.NOT_FOUND,
				);
			}

			return {
				success: true,
				data: {
					id: result.id,
					isLiked: result.isLiked,
				},
			};
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				`Failed to toggle like: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 楽曲のいいね状態を取得
	@Get("like/:id")
	async getLikeStatus(@Param("id") id: string) {
		try {
			const musicFile = await this.audioSearchService.getMusicFileById(id);

			if (!musicFile) {
				throw new HttpException(
					`Music file not found: ${id}`,
					HttpStatus.NOT_FOUND,
				);
			}

			return {
				success: true,
				data: {
					id: musicFile.id,
					isLiked: musicFile.isLiked || false,
				},
			};
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				`Failed to get like status: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
