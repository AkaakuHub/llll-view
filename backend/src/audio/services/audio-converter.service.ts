import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { ConversionStatus } from "../../../generated/prisma";
import { GlobalConfigService } from "../../config/global-config.service";
import { AppLoggerService } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AudioScannerService } from "./audio-scanner.service";
import { NativeAudioConverterService } from "./native-audio-converter.service";
import { StoryBackgroundService } from "./story-background.service";

@Injectable()
export class AudioConverterService {
	private readonly logger;
	private activeConversions = new Map<
		string,
		{ process: ChildProcess | null; canCancel: boolean }
	>();

	constructor(
		private prisma: PrismaService,
		private nativeConverter: NativeAudioConverterService,
		private storyBackgroundService: StoryBackgroundService,
		private audioScannerService: AudioScannerService,
		private globalConfig: GlobalConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(
			AudioConverterService.name,
		);
	}

	// ACBファイルを完全変換パイプライン（ACB → M4A、shell script呼び出しのみ）
	async convertAcbToWav(audioFileId: string): Promise<{
		success: boolean;
		totalStreams: number;
		convertedStreams: number;
		errorMessage?: string;
	}> {
		// 重複変換防止: 既にアクティブな変換があるかチェック
		if (this.activeConversions.has(audioFileId)) {
			this.logger.warn(
				`Conversion already in progress for file: ${audioFileId}`,
			);
			throw new Error(
				`Conversion already in progress for file: ${audioFileId}`,
			);
		}

		const audioFile = await this.prisma.audioFiles.findUnique({
			where: { id: audioFileId },
		});

		if (!audioFile) {
			throw new Error(`Audio file not found: ${audioFileId}`);
		}

		// 既に変換済みの場合はスキップ
		if (audioFile.status === ConversionStatus.COMPLETED) {
			this.logger.warn(`File already converted: ${audioFileId}`);
			return {
				success: true,
				totalStreams: audioFile.streamCount || 1,
				convertedStreams: audioFile.streamCount || 1,
				errorMessage: "File already converted",
			};
		}

		try {
			// ステータスを変換中に更新
			await this.prisma.audioFiles.update({
				where: { id: audioFileId },
				data: { status: ConversionStatus.PROCESSING, updatedAt: new Date() },
			});

			// プロセス追跡開始
			this.trackConversionProcess(audioFileId);

			// NativeAudioConverterServiceを使用してメタデータ付きの結果を取得
			const conversionResult = await this.nativeConverter.convertACBToM4A(
				audioFile.sourcePath,
				audioFile.category || "BGM",
			);

			// プロセス追跡終了
			this.untrackConversionProcess(audioFileId);

			// 既存ファイルの場合もメタデータを確実にDBに保存
			if (conversionResult.existed) {
				this.logger.log(
					`File already exists, updating database metadata: ${conversionResult.outputPath}`,
				);
			}

			// ストリーム情報をデータベースに保存（M4Aパス）
			await this.prisma.audioStreams.upsert({
				where: {
					audioFileId_streamIndex: {
						audioFileId: audioFileId,
						streamIndex: 0, // 単一ストリームとして扱う
					},
				},
				update: {
					outputPath: conversionResult.outputPath,
					status: ConversionStatus.COMPLETED,
					updatedAt: new Date(),
					convertedAt: new Date(),
				},
				create: {
					id: randomUUID(),
					audioFileId: audioFileId,
					streamIndex: 0,
					outputPath: conversionResult.outputPath,
					status: ConversionStatus.COMPLETED,
					updatedAt: new Date(),
					convertedAt: new Date(),
				},
			});

			// メタデータをAudioFileに保存（YAMLから取得した正確な情報）
			const updateData: Record<string, unknown> = {
				status: ConversionStatus.COMPLETED,
				updatedAt: new Date(),
				convertedAt: new Date(),
				outputPath: conversionResult.outputPath,
			};

			// YAMLから取得したメタデータがある場合は更新
			if (conversionResult.title) {
				// titleとartistを組み合わせてdisplayNameに保存
				updateData.displayName = conversionResult.artist
					? `${conversionResult.title} / ${conversionResult.artist}`
					: conversionResult.title;
			}

			// サムネイルパス情報も保存
			if (conversionResult.thumbnailPath) {
				updateData.thumbnailPath = conversionResult.thumbnailPath;
			}

			// 全YAMLメタデータをDBに保存
			if (conversionResult.yamlMetadata) {
				const yaml = conversionResult.yamlMetadata;

				// 数値フィールド（必須）
				updateData.musicId = yaml.musicId;
				updateData.orderId = yaml.orderId;
				updateData.jacketId = yaml.jacketId;
				updateData.soundId = yaml.soundId;
				updateData.generationsId = yaml.generationsId;
				updateData.unitId = yaml.unitId;
				updateData.centerCharacterId = yaml.centerCharacterId;
				updateData.musicType = yaml.musicType;
				updateData.experienceType = yaml.experienceType;
				updateData.beatPointCoefficient = yaml.beatPointCoefficient;
				updateData.apIncrement = yaml.apIncrement;
				updateData.songTime = yaml.songTime;
				updateData.playTime = yaml.playTime;
				updateData.feverSectionNo = yaml.feverSectionNo;
				updateData.previewStartTime = yaml.previewStartTime;
				updateData.previewEndTime = yaml.previewEndTime;
				updateData.previewFadeInTime = yaml.previewFadeInTime;
				updateData.previewFadeOutTime = yaml.previewFadeOutTime;
				updateData.releaseConditionType = yaml.releaseConditionType;
				updateData.releaseConditionDetail = yaml.releaseConditionDetail;
				updateData.maxAp = yaml.maxAp;
				updateData.isVideoMode = yaml.isVideoMode;
				updateData.videoBgId = yaml.videoBgId;
				updateData.songType = yaml.songType;

				// 文字列フィールド（必須）
				updateData.title = yaml.title;
				updateData.titleFurigana = yaml.titleFurigana;
				updateData.description = yaml.description;
				updateData.singerCharacterId = yaml.singerCharacterId?.toString() || "";
				updateData.supportCharacterId =
					yaml.supportCharacterId?.toString() || "";
				updateData.releaseConditionText = yaml.releaseConditionText;

				// 日時フィールド（必須・ISO文字列をDateオブジェクトに変換）
				try {
					updateData.startTime = new Date(yaml.startTime);
					updateData.endTime = new Date(yaml.endTime);
					updateData.musicScoreReleaseTime = new Date(
						yaml.musicScoreReleaseTime,
					);
				} catch (error) {
					this.logger.error(`Invalid date format in YAML metadata: ${error}`);
					this.logger.error(
						`startTime: ${yaml.startTime}, endTime: ${yaml.endTime}, musicScoreReleaseTime: ${yaml.musicScoreReleaseTime}`,
					);
					throw new Error(`Invalid date format in YAML metadata`);
				}

				this.logger.log(
					`Saving ${Object.keys(updateData).length} metadata fields to database`,
				);
			}

			await this.prisma.audioFiles.update({
				where: { id: audioFileId },
				data: updateData,
			});

			this.logger.log(
				`Successfully converted ${audioFile.filename}: ${conversionResult.outputPath}`,
			);
			if (conversionResult.title) {
				this.logger.log(`  Title: ${conversionResult.title}`);
			}
			if (conversionResult.artist) {
				this.logger.log(`  Artist: ${conversionResult.artist}`);
			}
			if (conversionResult.thumbnailPath) {
				this.logger.log(`  Thumbnail: ${conversionResult.thumbnailPath}`);
			}

			return {
				success: true,
				totalStreams: 1,
				convertedStreams: 1,
				errorMessage: undefined,
			};
		} catch (error) {
			// プロセス追跡終了
			this.untrackConversionProcess(audioFileId);

			// エラー時はファイルの状態を失敗に更新
			await this.prisma.audioFiles.update({
				where: { id: audioFileId },
				data: { status: ConversionStatus.FAILED, updatedAt: new Date() },
			});

			const errorMessage = `Conversion failed for ${audioFile.filename}: ${error instanceof Error ? error.message : "Unknown error"}`;
			this.logger.error(errorMessage);

			return {
				success: false,
				totalStreams: 1,
				convertedStreams: 0,
				errorMessage: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// アクティブな変換プロセス管理を継続
	private trackConversionProcess(audioFileId: string): void {
		// NativeAudioConverterServiceを使用する場合、プロセス管理は不要
		// 必要に応じて将来の拡張のためにプレースホルダーとして保持
		this.activeConversions.set(audioFileId, {
			process: null,
			canCancel: false,
		});
	}

	private untrackConversionProcess(audioFileId: string): void {
		this.activeConversions.delete(audioFileId);
	}

	// 既存ファイルを削除して再変換
	async reconvertAcbToWav(audioFileId: string): Promise<{
		success: boolean;
		totalStreams: number;
		convertedStreams: number;
		errorMessage?: string;
	}> {
		const audioFile = await this.prisma.audioFiles.findUnique({
			where: { id: audioFileId },
			include: { audioStreams: true },
		});

		if (!audioFile) {
			throw new Error(`Audio file not found: ${audioFileId}`);
		}

		this.logger.log(`Starting reconversion for ${audioFile.filename}`);

		try {
			// 1. データベースの既存ストリーム情報から出力ファイルパスを取得
			const existingStreams = audioFile.audioStreams || [];
			const filesToCleanup: string[] = [];

			for (const stream of existingStreams) {
				if (stream.outputPath) {
					filesToCleanup.push(stream.outputPath);

					// サムネイルパスも推測して追加
					const m4aDir = stream.outputPath.substring(
						0,
						stream.outputPath.lastIndexOf("/"),
					);
					const thumbnailDir = `${m4aDir}/thumbnails`;

					// BGMファイルの場合、サムネイル命名規則に基づいてパスを生成
					if (audioFile.filename.includes("bgm_live_")) {
						const match = audioFile.filename.match(
							/bgm_live_([0-9]{6})[0-9]{2}/,
						);
						if (match) {
							const number = match[1];
							filesToCleanup.push(
								`${thumbnailDir}/image_sticker_40${number}.webp`,
							);
							filesToCleanup.push(
								`${thumbnailDir}/image_sticker_90${number}.webp`,
							);
						}
					}
				}
			}

			// 2. 既存ファイルを削除
			for (const filePath of filesToCleanup) {
				try {
					const resolvedPath = this.resolveAssetPath(filePath);
					if (await this.fileExists(resolvedPath)) {
						await fs.promises.unlink(resolvedPath);
						this.logger.log(`Deleted existing file: ${filePath}`);
					}
				} catch (error) {
					this.logger.warn(
						`Failed to delete file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}
			}

			// 3. データベースのストリーム情報をリセット
			await this.prisma.audioStreams.deleteMany({
				where: { audioFileId: audioFileId },
			});

			// 4. AudioFileのステータスをPENDINGに戻す
			await this.prisma.audioFiles.update({
				where: { id: audioFileId },
				data: {
					status: ConversionStatus.PENDING,
					convertedAt: null,
				},
			});

			this.logger.log(
				`Cleanup completed for ${audioFile.filename}, starting fresh conversion`,
			);

			// 5. 通常の変換プロセスを実行
			return await this.convertAcbToWav(audioFileId);
		} catch (error) {
			const errorMessage = `Reconversion failed for ${audioFile.filename}: ${error instanceof Error ? error.message : "Unknown error"}`;
			this.logger.error(errorMessage);

			// エラー時も失敗ステータスに更新
			await this.prisma.audioFiles.update({
				where: { id: audioFileId },
				data: { status: ConversionStatus.FAILED, updatedAt: new Date() },
			});

			return {
				success: false,
				totalStreams: 1,
				convertedStreams: 0,
				errorMessage: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// 変換をキャンセル
	async cancelConversion(
		audioFileId: string,
	): Promise<{ success: boolean; message: string }> {
		const conversion = this.activeConversions.get(audioFileId);

		if (!conversion) {
			return {
				success: false,
				message: "No active conversion found for this file",
			};
		}

		try {
			if (conversion.process && !conversion.process.killed) {
				// より強力なキャンセル処理
				conversion.process.kill("SIGTERM");

				// SIGTERMで終了しない場合は強制終了
				setTimeout(() => {
					if (conversion.process && !conversion.process.killed) {
						this.logger.warn(`Force killing process for file: ${audioFileId}`);
						conversion.process.kill("SIGKILL");
					}
				}, 5000); // 5秒後に強制終了
			}

			this.activeConversions.delete(audioFileId);

			// ファイルのステータスをPENDINGに戻す
			await this.prisma.audioFiles.update({
				where: { id: audioFileId },
				data: { status: ConversionStatus.PENDING },
			});

			this.logger.log(`Conversion cancelled for file: ${audioFileId}`);
			return { success: true, message: "Conversion cancelled" };
		} catch (error) {
			this.logger.error(
				`Error cancelling conversion for ${audioFileId}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			// エラーが発生してもマップからは削除し、ステータスは戻す
			this.activeConversions.delete(audioFileId);

			try {
				await this.prisma.audioFiles.update({
					where: { id: audioFileId },
					data: { status: ConversionStatus.PENDING },
				});
			} catch (dbError) {
				this.logger.error(
					`Error updating database status for ${audioFileId}: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
				);
			}

			return { success: true, message: "Conversion cancelled (with errors)" };
		}
	}

	// アクティブな変換一覧を取得
	getActiveConversions(): string[] {
		return Array.from(this.activeConversions.keys());
	}

	// ストーリーボイス変換
	async convertStoryVoice(
		storyId: string,
		progressCallback?: (current: number, total: number) => void,
	): Promise<{
		success: boolean;
		totalStreams: number;
		convertedStreams: number;
		errorMessage?: string;
	}> {
		const storyVoiceFilename = `vo_adv_${storyId}.acb`;
		this.logger.log(
			`Starting story voice conversion for: ${storyVoiceFilename}`,
		);

		// AudioFilesテーブルからストーリーボイスファイルを探す
		const audioFile = await this.prisma.audioFiles.findFirst({
			where: { filename: storyVoiceFilename },
		});

		if (!audioFile) {
			throw new Error(`Story voice file not found: ${storyVoiceFilename}`);
		}

		try {
			// ストーリーボイス専用の変換を実行
			const result = await this.nativeConverter.convertStoryVoice(
				audioFile.filename,
				progressCallback,
			);

			return {
				success: true,
				totalStreams: result.totalStreams || 0,
				convertedStreams: result.convertedStreams || 0,
				errorMessage: undefined,
			};
		} catch (error) {
			this.logger.error(
				`Story voice conversion failed for ${storyVoiceFilename}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);

			return {
				success: false,
				totalStreams: 0,
				convertedStreams: 0,
				errorMessage: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// ストーリー背景画像変換
	async convertStoryBackgrounds(storyId: string): Promise<{
		success: boolean;
		converted: number;
		skipped: number;
		missing: number;
	}> {
		try {
			const result =
				await this.storyBackgroundService.convertStoryBackgrounds(storyId);
			return {
				success: true,
				converted: result.converted,
				skipped: result.skipped,
				missing: result.missing,
			};
		} catch (error) {
			this.logger.error(
				`Story background conversion failed for ${storyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return {
				success: false,
				converted: 0,
				skipped: 0,
				missing: 0,
			};
		}
	}

	// ストーリーBGM変換（BGM名をTXTから抽出）
	async convertStoryBgm(storyId: string): Promise<{
		success: boolean;
		converted: number;
		skipped: number;
		missing: number;
	}> {
		const plainPath = this.globalConfig.getCachePlainPath();
		const storyFilePath = path.join(plainPath, `story_main_${storyId}.txt`);

		if (!(await this.fileExists(storyFilePath))) {
			return { success: false, converted: 0, skipped: 0, missing: 0 };
		}

		try {
			const content = await fs.promises.readFile(storyFilePath, "utf-8");
			const bgmSet = new Set<string>();

			for (const line of content.split("\n")) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;
				const match = trimmed.match(/^\[BGM(?:再生|停止)\s+(\S+)/);
				if (match) {
					bgmSet.add(match[1].trim());
				}
			}

			let converted = 0;
			let skipped = 0;
			let missing = 0;

			// 既存のスキャンフローでDBに登録
			await this.audioScannerService.scanAcbFiles();

			const convertByNames = async (names: Set<string>) => {
				for (const name of names) {
					const acbFilename = `${name}.acb`;
					const acbFilePath = path.join(plainPath, acbFilename);

					if (!(await this.fileExists(acbFilePath))) {
						missing++;
						continue;
					}

					const audioFile = await this.prisma.audioFiles.findUnique({
						where: { filename: acbFilename },
					});

					if (!audioFile) {
						missing++;
						continue;
					}

					const conversionResult = await this.nativeConverter.convertACBToM4A(
						acbFilePath,
						"BGM",
					);

					const outputPath = conversionResult.outputPath;
					if (conversionResult.existed) {
						skipped += 1;
					} else {
						converted += 1;
					}
					await this.prisma.audioFiles.update({
						where: { id: audioFile.id },
						data: {
							status: ConversionStatus.COMPLETED,
							outputPath,
							updatedAt: new Date(),
							convertedAt: new Date(),
						},
					});

					await this.prisma.audioStreams.upsert({
						where: {
							audioFileId_streamIndex: {
								audioFileId: audioFile.id,
								streamIndex: 0,
							},
						},
						update: {
							outputPath,
							status: ConversionStatus.COMPLETED,
							updatedAt: new Date(),
							convertedAt: new Date(),
						},
						create: {
							id: randomUUID(),
							audioFileId: audioFile.id,
							streamIndex: 0,
							outputPath,
							status: ConversionStatus.COMPLETED,
							updatedAt: new Date(),
							convertedAt: new Date(),
						},
					});
				}
			};

			await convertByNames(bgmSet);

			return { success: true, converted, skipped, missing };
		} catch (error) {
			this.logger.error(
				`Story BGM conversion failed for ${storyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return { success: false, converted: 0, skipped: 0, missing: 0 };
		}
	}

	// ストーリーSE変換（SE名をTXTから抽出）
	async convertStorySe(storyId: string): Promise<{
		success: boolean;
		converted: number;
		skipped: number;
		missing: number;
	}> {
		const plainPath = this.globalConfig.getCachePlainPath();
		const storyFilePath = path.join(plainPath, `story_main_${storyId}.txt`);

		if (!(await this.fileExists(storyFilePath))) {
			return { success: false, converted: 0, skipped: 0, missing: 0 };
		}

		try {
			const content = await fs.promises.readFile(storyFilePath, "utf-8");
			const seNameSet = new Set<string>();

			for (const line of content.split("\n")) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;
				const seMatch = trimmed.match(/^\[SE(?:再生|停止)\s+(\S+)/);
				if (seMatch) {
					seNameSet.add(seMatch[1].trim());
				}
			}

			let converted = 0;
			let skipped = 0;
			let missing = 0;

			// 既存のスキャンフローでDBに登録
			await this.audioScannerService.scanAcbFiles();

			const acbBasenames = (await fs.promises.readdir(plainPath))
				.filter((file) => file.endsWith(".acb"))
				.map((file) => path.parse(file).name.toLowerCase())
				.sort((a, b) => b.length - a.length);

			const seContainerSet = new Set<string>();
			for (const rawSeName of seNameSet) {
				const seName = rawSeName.toLowerCase();
				for (const base of acbBasenames) {
					const prefix = `se_${base}`;
					if (seName === prefix || seName.startsWith(`${prefix}_`)) {
						seContainerSet.add(base);
						break;
					}
				}
			}

			for (const container of seContainerSet) {
				const acbFilename = `${container}.acb`;
				const acbFilePath = path.join(plainPath, acbFilename);

				if (!(await this.fileExists(acbFilePath))) {
					missing++;
					continue;
				}

				const audioFile = await this.prisma.audioFiles.findUnique({
					where: { filename: acbFilename },
				});

				if (!audioFile) {
					missing++;
					continue;
				}

				const conversionResult = await this.nativeConverter.convertACBToM4A(
					acbFilePath,
					"SE",
				);

				const outputPath = conversionResult.outputPath;
				if (conversionResult.existed) {
					skipped += 1;
				} else {
					converted += 1;
				}
				await this.prisma.audioFiles.update({
					where: { id: audioFile.id },
					data: {
						status: ConversionStatus.COMPLETED,
						outputPath,
						updatedAt: new Date(),
						convertedAt: new Date(),
					},
				});

				await this.prisma.audioStreams.upsert({
					where: {
						audioFileId_streamIndex: {
							audioFileId: audioFile.id,
							streamIndex: 0,
						},
					},
					update: {
						outputPath,
						status: ConversionStatus.COMPLETED,
						updatedAt: new Date(),
						convertedAt: new Date(),
					},
					create: {
						id: randomUUID(),
						audioFileId: audioFile.id,
						streamIndex: 0,
						outputPath,
						status: ConversionStatus.COMPLETED,
						updatedAt: new Date(),
						convertedAt: new Date(),
					},
				});
			}

			return { success: true, converted, skipped, missing };
		} catch (error) {
			this.logger.error(
				`Story SE conversion failed for ${storyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return { success: false, converted: 0, skipped: 0, missing: 0 };
		}
	}

	// ファイルが存在するかチェック
	private async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.promises.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	private resolveAssetPath(filePath: string): string {
		if (path.isAbsolute(filePath)) {
			return filePath;
		}
		if (filePath.startsWith("assets/")) {
			return path.join(this.globalConfig.getProjectRootPath(), filePath);
		}
		if (filePath.startsWith("/assets/")) {
			return path.join(
				this.globalConfig.getProjectRootPath(),
				filePath.slice(1),
			);
		}
		return filePath;
	}
}
