import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import { Injectable } from "@nestjs/common";
import * as yaml from "js-yaml";
import pRetry from "p-retry";
import { AppLoggerService } from "../../logger/logger.service";
import type {
	MetadataFields,
	RetryableCommand,
} from "../interfaces/audio-config.interface";
import { AudioConfigService } from "./audio-config.service";

const execAsync = promisify(exec);

@Injectable()
export class NativeShellService {
	private readonly logger;

	constructor(
		private configService: AudioConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(NativeShellService.name);
	}

	// デバッグログ出力（shell scriptのdebug_log関数と同等）
	debugLog(message: string): void {
		if (this.configService.isDebugMode()) {
			const timestamp = new Date().toLocaleTimeString();
			this.logger.debug(`[${timestamp}] ${message}`);
		}
	}

	// カラー出力（shell scriptのprint_xxx関数と同等）
	printCyan(message: string): void {
		this.logger.log(`🔵 ${message}`);
	}

	printGreen(message: string): void {
		this.logger.log(`✅ ${message}`);
	}

	printRed(message: string): void {
		this.logger.error(`❌ ${message}`);
	}

	printYellow(message: string): void {
		this.logger.warn(`⚠️ ${message}`);
	}

	printBlue(message: string): void {
		this.logger.log(`🔷 ${message}`);
	}

	// ファイル存在チェック
	async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	// ディレクトリ作成（shell scriptのmkdir -pと同等）
	async ensureDirectoryExists(dirPath: string): Promise<void> {
		try {
			await fs.mkdir(dirPath, { recursive: true });
			this.debugLog(`Directory ensured: ${dirPath}`);
		} catch (error) {
			this.logger.error(
				`Failed to create directory ${dirPath}: ${error.message}`,
			);
			throw error;
		}
	}

	// リトライ機能付きコマンド実行（shell scriptのretry_command関数と同等）
	async executeRetryableCommand(cmd: RetryableCommand): Promise<void> {
		const retryConfig = this.configService.getRetryConfig();

		await pRetry(
			async (attemptNumber) => {
				if (attemptNumber > 1) {
					this.printYellow(
						`Retrying ${cmd.description} (attempt ${attemptNumber}/${retryConfig.maxRetries})...`,
					);
				}

				try {
					this.debugLog(`Executing command: ${cmd.command}`);
					const { stdout, stderr } = await execAsync(cmd.command, {
						timeout: cmd.timeout || retryConfig.commandTimeout,
						maxBuffer: 20 * 1024 * 1024, // 20MB
						env: {
							...process.env,
							LC_ALL: "en_US.UTF-8",
							LANG: "en_US.UTF-8",
							LOG_LEVEL: this.configService.getLogLevel(),
							DOTNET_ROOT: this.configService.getDotnetRootAssetStudio(),
							NO_COLOR: "1", // shell script のNO_COLOR=1と同等
						},
					});

					if (stderr?.trim()) {
						this.debugLog(`Command stderr: ${stderr}`);
					}

					this.debugLog(`Command succeeded: ${cmd.description}`);
					return { stdout, stderr };
				} catch (error) {
					this.debugLog(
						`Command failed: ${cmd.description} - ${error.message}`,
					);
					throw error;
				}
			},
			{
				retries: retryConfig.maxRetries - 1,
				minTimeout: retryConfig.retryDelay,
				maxTimeout: retryConfig.retryDelay,
				onFailedAttempt: (error) => {
					this.printRed(
						`Failed ${cmd.description}. ${error.retriesLeft > 0 ? `Retrying in ${retryConfig.retryDelay}ms...` : `Failed after ${retryConfig.maxRetries} attempts.`}`,
					);
				},
			},
		);
	}

	// リトライ機能付きコマンド実行（出力キャプチャ版）
	async executeRetryableCommandWithOutput(
		cmd: RetryableCommand,
	): Promise<{ stdout: string; stderr: string }> {
		const retryConfig = this.configService.getRetryConfig();

		return pRetry(
			async (attemptNumber) => {
				if (attemptNumber > 1) {
					this.printYellow(
						`Retrying ${cmd.description} (attempt ${attemptNumber}/${retryConfig.maxRetries})...`,
					);
				}

				try {
					this.debugLog(
						`Executing command with output capture: ${cmd.command}`,
					);
					const { stdout, stderr } = await execAsync(cmd.command, {
						timeout: cmd.timeout || retryConfig.commandTimeout,
						maxBuffer: 20 * 1024 * 1024, // 20MB
						env: {
							...process.env,
							LC_ALL: "en_US.UTF-8",
							LANG: "en_US.UTF-8",
							LOG_LEVEL: this.configService.getLogLevel(),
							DOTNET_ROOT: this.configService.getDotnetRootAssetStudio(),
							NO_COLOR: "1", // shell script のNO_COLOR=1と同等
						},
					});

					this.debugLog(`Command succeeded: ${cmd.description}`);
					return { stdout, stderr };
				} catch (error) {
					this.debugLog(
						`Command failed with exit code ${error.code}: ${cmd.description}`,
					);
					this.debugLog(`Command output: ${error.stdout || ""}`);
					throw error;
				}
			},
			{
				retries: retryConfig.maxRetries - 1,
				minTimeout: retryConfig.retryDelay,
				maxTimeout: retryConfig.retryDelay,
				onFailedAttempt: (error) => {
					this.printRed(
						`Failed ${cmd.description}. ${error.retriesLeft > 0 ? `Retrying in ${retryConfig.retryDelay}ms...` : `Failed after ${retryConfig.maxRetries} attempts.`}`,
					);
				},
			},
		);
	}

	// YAMLファイル読み込み（shell scriptのyq機能と同等）
	async loadYamlFile<T = unknown>(yamlPath: string): Promise<T> {
		try {
			this.debugLog(`Loading YAML file: ${yamlPath}`);
			const fileContent = await fs.readFile(yamlPath, "utf8");
			const data = yaml.load(fileContent) as T;
			this.debugLog(`YAML file loaded successfully`);
			return data;
		} catch (error) {
			this.logger.error(
				`Failed to load YAML file ${yamlPath}: ${error.message}`,
			);
			throw new Error(`Failed to load YAML file: ${error.message}`);
		}
	}

	// メタデータ検索（shell scriptのyq evalと同等）
	async findMetadataById(
		yamlData: unknown[],
		musicId: number,
	): Promise<MetadataFields | null> {
		try {
			this.debugLog(`Searching for metadata with ID: ${musicId}`);
			const metadata = yamlData.find((item: unknown) => {
				const typedItem = item as { Id?: number };
				return typedItem.Id === musicId;
			});

			if (!metadata) {
				this.debugLog(`No metadata found for ID: ${musicId}`);
				return null;
			}

			// shell scriptと同じフィールド構造でマッピング
			const typedMetadata = metadata as Record<string, unknown>;
			const result: MetadataFields = {
				musicId: typedMetadata.Id as number,
				orderId: typedMetadata.OrderId as number,
				title: typedMetadata.Title as string,
				titleFurigana: typedMetadata.TitleFurigana as string,
				jacketId: typedMetadata.JacketId as number,
				soundId: typedMetadata.SoundId as number,
				description: typedMetadata.Description as string,
				generationsId: typedMetadata.GenerationsId as number,
				unitId: typedMetadata.UnitId as number,
				centerCharacterId: typedMetadata.CenterCharacterId as number,
				singerCharacterId:
					(typedMetadata.SingerCharacterId as number)?.toString() || "",
				supportCharacterId:
					(typedMetadata.SupportCharacterId as number)?.toString() || "",
				musicType: typedMetadata.MusicType as number,
				experienceType: typedMetadata.ExperienceType as number,
				beatPointCoefficient: typedMetadata.BeatPointCoefficient as number,
				apIncrement: typedMetadata.ApIncrement as number,
				songTime: typedMetadata.SongTime as number,
				playTime: typedMetadata.PlayTime as number,
				feverSectionNo: typedMetadata.FeverSectionNo as number,
				previewStartTime: typedMetadata.PreviewStartTime as number,
				previewEndTime: typedMetadata.PreviewEndTime as number,
				previewFadeInTime: typedMetadata.PreviewFadeInTime as number,
				previewFadeOutTime: typedMetadata.PreviewFadeOutTime as number,
				releaseConditionType: typedMetadata.ReleaseConditionType as number,
				releaseConditionDetail: typedMetadata.ReleaseConditionDetail as number,
				releaseConditionText: typedMetadata.ReleaseConditionText as string,
				startTime: typedMetadata.StartTime as string,
				endTime: typedMetadata.EndTime as string,
				maxAp: typedMetadata.MaxAp as number,
				isVideoMode: typedMetadata.IsVideoMode as number,
				videoBgId: typedMetadata.VideoBgId as number,
				songType: typedMetadata.SongType as number,
				musicScoreReleaseTime: typedMetadata.MusicScoreReleaseTime as string,
			};

			this.debugLog(`Metadata found for ID ${musicId}: ${result.title}`);
			return result;
		} catch (error) {
			this.logger.error(`Error searching metadata: ${error.message}`);
			throw error;
		}
	}

	// ファイル削除（shell scriptのrm -fと同等）
	async deleteFile(filePath: string): Promise<void> {
		try {
			if (await this.fileExists(filePath)) {
				await fs.unlink(filePath);
				this.debugLog(`Deleted file: ${filePath}`);
			}
		} catch (error) {
			this.debugLog(`Failed to delete file ${filePath}: ${error.message}`);
			// shell scriptのrm -fと同じように、削除失敗は無視
		}
	}

	// 複数ファイル削除（shell scriptのglob処理と同等）
	async deleteGlobFiles(pattern: string): Promise<number> {
		try {
			const { glob } = await import("glob");
			const files = await glob(pattern);
			let deletedCount = 0;

			for (const file of files) {
				try {
					await fs.unlink(file);
					this.debugLog(`Deleted file: ${file}`);
					deletedCount++;
				} catch (error) {
					this.debugLog(`Failed to delete file ${file}: ${error.message}`);
				}
			}

			this.debugLog(
				`Deleted ${deletedCount} files matching pattern: ${pattern}`,
			);
			return deletedCount;
		} catch (error) {
			this.logger.error(
				`Error deleting glob files ${pattern}: ${error.message}`,
			);
			return 0;
		}
	}

	// ファイルコピー（shell scriptのcpと同等）
	async copyFile(source: string, destination: string): Promise<void> {
		try {
			await fs.copyFile(source, destination);
			this.debugLog(`Copied file: ${source} -> ${destination}`);
		} catch (error) {
			this.logger.error(
				`Failed to copy file ${source} -> ${destination}: ${error.message}`,
			);
			throw error;
		}
	}

	// ファイル移動（shell scriptのmvと同等）
	async moveFile(source: string, destination: string): Promise<void> {
		try {
			await fs.rename(source, destination);
			this.debugLog(`Moved file: ${source} -> ${destination}`);
		} catch (error) {
			this.logger.error(
				`Failed to move file ${source} -> ${destination}: ${error.message}`,
			);
			throw error;
		}
	}

	// ファイル検索（shell scriptのfind相当）
	async findFiles(directory: string, pattern: string): Promise<string[]> {
		try {
			const { glob } = await import("glob");
			const searchPattern = path.join(directory, pattern);
			const files = await glob(searchPattern);
			this.debugLog(`Found ${files.length} files matching ${searchPattern}`);
			return files;
		} catch (error) {
			this.logger.error(
				`Error finding files in ${directory} with pattern ${pattern}: ${error.message}`,
			);
			return [];
		}
	}
}
