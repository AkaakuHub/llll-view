import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { AudioCategory, ConversionStatus } from "../../../generated/prisma";
import { GlobalConfigService } from "../../config/global-config.service";
import { AppLoggerService } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AudioScannerService {
	private readonly logger;

	constructor(
		private prisma: PrismaService,
		private globalConfig: GlobalConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(AudioScannerService.name);
	}

	// M4Aファイルをスキャンしてデータベースに反映
	async syncMusicDatabase(): Promise<{
		found: number;
		updated: number;
		added: number;
	}> {
		this.logger.log("Starting M4A files database sync...");

		const bgmPath = path.join(this.globalConfig.getAssetsPath(), "bgm");

		if (!fs.existsSync(bgmPath)) {
			throw new Error(`BGM directory not found: ${bgmPath}`);
		}

		const m4aFiles = fs
			.readdirSync(bgmPath)
			.filter((file) => file.endsWith(".m4a"))
			.map((filename) => {
				const filePath = path.join(bgmPath, filename);
				const stats = fs.statSync(filePath);
				return {
					filename,
					filePath,
					size: stats.size,
					modifiedAt: stats.mtime,
				};
			});

		let addedCount = 0;
		let updatedCount = 0;

		for (const fileInfo of m4aFiles) {
			// ファイル名からID抽出（例: 303203_名前のない怪物.m4a -> 303203）
			const numberMatch = fileInfo.filename.match(/^(\d+)/);
			if (!numberMatch) continue;

			const fileNumber = numberMatch[1];
			this.extractTitleFromFilename(fileInfo.filename);

			// データベース内で既存レコードを検索
			const existingFile = await this.prisma.audioFiles.findFirst({
				where: {
					OR: [
						{ filename: { contains: fileNumber } },
						{ outputPath: { contains: fileInfo.filename } },
					],
				},
			});

			if (existingFile) {
				// 既存レコードを更新
				await this.prisma.audioFiles.update({
					where: { id: existingFile.id },
					data: {
						status: ConversionStatus.COMPLETED,
						outputPath: `/assets/bgm/${fileInfo.filename}`,
						duration: null, // TODO: FFprobe で取得
					},
				});
				updatedCount++;
			} else {
				// 新規レコード作成 - BGMカテゴリと仮定
				await this.prisma.audioFiles.create({
					data: {
						id: crypto.randomUUID(),
						filename: fileInfo.filename,
						sourcePath: fileInfo.filePath,
						outputPath: `/assets/bgm/${fileInfo.filename}`,
						category: AudioCategory.BGM,
						status: ConversionStatus.COMPLETED,
						updatedAt: new Date(),
						// 必須YAMLフィールドにデフォルト値を設定
						musicId: 0,
						orderId: 0,
						title: "Unknown",
						titleFurigana: "",
						jacketId: 0,
						soundId: 0,
						description: "Scanned file",
						generationsId: 0,
						unitId: 0,
						centerCharacterId: 0,
						singerCharacterId: "",
						supportCharacterId: "",
						musicType: 0,
						experienceType: 0,
						beatPointCoefficient: 0,
						apIncrement: 0,
						songTime: 0,
						playTime: 0,
						feverSectionNo: 0,
						previewStartTime: 0,
						previewEndTime: 0,
						previewFadeInTime: 0,
						previewFadeOutTime: 0,
						releaseConditionType: 0,
						releaseConditionDetail: 0,
						releaseConditionText: "",
						startTime: new Date("1970-01-01"),
						endTime: new Date("2099-12-31"),
						maxAp: 0,
						isVideoMode: 0,
						videoBgId: 0,
						songType: 0,
						musicScoreReleaseTime: new Date("1970-01-01"),
					},
				});
				addedCount++;
			}
		}

		this.logger.log(
			`M4A database sync completed: found=${m4aFiles.length}, added=${addedCount}, updated=${updatedCount}`,
		);

		return {
			found: m4aFiles.length,
			added: addedCount,
			updated: updatedCount,
		};
	}

	private extractTitleFromFilename(filename: string): string {
		const baseName = path.parse(filename).name;
		const titleMatch = baseName.match(/^\d+_(.+)$/);
		return titleMatch ? titleMatch[1] : baseName;
	}

	// ACBファイルを検索してデータベースに登録
	async scanAcbFiles(): Promise<{ scanned: number; added: number }> {
		this.logger.log("Starting ACB file scan...");

		const acbFiles = await this.findAcbFiles();
		let addedCount = 0;

		for (const filePath of acbFiles) {
			const filename = path.basename(filePath);

			// 既存チェック
			const existing = await this.prisma.audioFiles.findUnique({
				where: { filename },
			});

			if (!existing) {
				const category = this.categorizeAcbFile(filename);
				await this.prisma.audioFiles.create({
					data: {
						id: crypto.randomUUID(),
						filename,
						sourcePath: filePath,
						category,
						status: ConversionStatus.PENDING,
						updatedAt: new Date(),
						// 必須YAMLフィールドにデフォルト値を設定
						musicId: 0,
						orderId: 0,
						title: "Unknown",
						titleFurigana: "",
						jacketId: 0,
						soundId: 0,
						description: "Scanned ACB file",
						generationsId: 0,
						unitId: 0,
						centerCharacterId: 0,
						singerCharacterId: "",
						supportCharacterId: "",
						musicType: 0,
						experienceType: 0,
						beatPointCoefficient: 0,
						apIncrement: 0,
						songTime: 0,
						playTime: 0,
						feverSectionNo: 0,
						previewStartTime: 0,
						previewEndTime: 0,
						previewFadeInTime: 0,
						previewFadeOutTime: 0,
						releaseConditionType: 0,
						releaseConditionDetail: 0,
						releaseConditionText: "",
						startTime: new Date("1970-01-01"),
						endTime: new Date("2099-12-31"),
						maxAp: 0,
						isVideoMode: 0,
						videoBgId: 0,
						songType: 0,
						musicScoreReleaseTime: new Date("1970-01-01"),
					},
				});
				addedCount++;
				// this.logger.log(`Added ACB file: ${filename}`);
			}
		}

		this.logger.log(
			`Scan complete. Found ${acbFiles.length} files, added ${addedCount} new files.`,
		);
		return { scanned: acbFiles.length, added: addedCount };
	}

	// 全てのACBファイルを検索
	private async findAcbFiles(): Promise<string[]> {
		const files: string[] = [];
		const sourceAcbPath = this.globalConfig.getCachePlainPath();

		try {
			const items = await fs.promises.readdir(sourceAcbPath);
			for (const item of items) {
				if (item.endsWith(".acb")) {
					files.push(path.join(sourceAcbPath, item));
				}
			}
		} catch (error) {
			this.logger.error(
				`Error reading ACB directory: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		return files;
	}

	// 既存のM4Aファイルをスキャンしてデータベースに登録
	async scanExistingM4AFiles(): Promise<{ scanned: number; added: number }> {
		this.logger.log("Starting existing M4A file scan...");

		let scanned = 0;
		let added = 0;
		const sourceAcbPath = this.globalConfig.getCachePlainPath();

		const categories = ["bgm", "voice", "se"];

		for (const categoryName of categories) {
			const categoryPath = path.join(
				this.globalConfig.getAssetsPath(),
				categoryName,
			);

			try {
				if (await this.directoryExists(categoryPath)) {
					const files = await fs.promises.readdir(categoryPath);

					for (const file of files) {
						if (file.endsWith(".m4a")) {
							scanned++;

							// ACBファイル名を推測（M4A名から.m4aを除去し.acbを追加）
							const baseName = path.parse(file).name;
							const assumedAcbName = `${baseName}.acb`;

							// 既存チェック
							const existing = await this.prisma.audioFiles.findUnique({
								where: { filename: assumedAcbName },
							});

							if (!existing) {
								const category = this.categorizeByDirectoryName(categoryName);
								const m4aPath = path.join(categoryPath, file);

								await this.prisma.audioFiles.create({
									data: {
										id: crypto.randomUUID(),
										filename: assumedAcbName,
										sourcePath: `${sourceAcbPath}/${assumedAcbName}`,
										category,
										status: ConversionStatus.COMPLETED, // 既存M4Aは変換済みとして扱う
										convertedAt: new Date(),
										updatedAt: new Date(),
										// 必須YAMLフィールドにデフォルト値を設定
										musicId: 0,
										orderId: 0,
										title: "Existing M4A",
										titleFurigana: "",
										jacketId: 0,
										soundId: 0,
										description: "Existing M4A file",
										generationsId: 0,
										unitId: 0,
										centerCharacterId: 0,
										singerCharacterId: "",
										supportCharacterId: "",
										musicType: 0,
										experienceType: 0,
										beatPointCoefficient: 0,
										apIncrement: 0,
										songTime: 0,
										playTime: 0,
										feverSectionNo: 0,
										previewStartTime: 0,
										previewEndTime: 0,
										previewFadeInTime: 0,
										previewFadeOutTime: 0,
										releaseConditionType: 0,
										releaseConditionDetail: 0,
										releaseConditionText: "",
										startTime: new Date("1970-01-01"),
										endTime: new Date("2099-12-31"),
										maxAp: 0,
										isVideoMode: 0,
										videoBgId: 0,
										songType: 0,
										musicScoreReleaseTime: new Date("1970-01-01"),
									},
								});

								// 対応するストリームも作成
								const audioFile = await this.prisma.audioFiles.findUnique({
									where: { filename: assumedAcbName },
								});

								if (audioFile) {
									await this.prisma.audioStreams.create({
										data: {
											id: crypto.randomUUID(),
											audioFileId: audioFile.id,
											updatedAt: new Date(),
											streamIndex: 0,
											outputPath: m4aPath,
											status: ConversionStatus.COMPLETED,
											convertedAt: new Date(),
										},
									});
								}

								added++;
								this.logger.log(
									`Added existing M4A file: ${file} -> ${assumedAcbName}`,
								);
							}
						}
					}
				}
			} catch (error) {
				this.logger.error(
					`Error scanning ${categoryPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		this.logger.log(
			`M4A scan complete. Found ${scanned} files, added ${added} new entries.`,
		);
		return { scanned, added };
	}

	// ディレクトリが存在するかチェック
	private async directoryExists(dirPath: string): Promise<boolean> {
		try {
			const stat = await fs.promises.stat(dirPath);
			return stat.isDirectory();
		} catch {
			return false;
		}
	}

	// ディレクトリ名からカテゴリを判定
	private categorizeByDirectoryName(dirName: string): AudioCategory {
		switch (dirName.toLowerCase()) {
			case "bgm":
				return AudioCategory.BGM;
			case "voice":
				return AudioCategory.VOICE;
			case "se":
				return AudioCategory.SE;
			default:
				return AudioCategory.BGM;
		}
	}

	// ファイル名からカテゴリを推測
	private categorizeAcbFile(filename: string): AudioCategory {
		const lower = filename.toLowerCase();

		if (lower.startsWith("bgm_")) return AudioCategory.BGM;
		if (lower.startsWith("vo_") || lower.includes("voice"))
			return AudioCategory.VOICE;
		if (lower.startsWith("se_") || lower.includes("se"))
			return AudioCategory.SE;
		if (lower.includes("jingle")) return AudioCategory.SE;

		return AudioCategory.BGM;
	}
}
