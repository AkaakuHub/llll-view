import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import type { AudioCategory } from "../../generated/prisma";
import { GlobalConfigService } from "../config/global-config.service";
import { AppLoggerService } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AudioService {
	private readonly logger;

	constructor(
		private prisma: PrismaService,
		private globalConfig: GlobalConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(AudioService.name);
	}

	// オーディオファイル一覧取得
	async getAudioFiles(category?: string) {
		return this.prisma.audioFiles.findMany({
			where: category ? { category: category as AudioCategory } : undefined,
			include: { audioStreams: true },
			orderBy: { createdAt: "desc" },
		});
	}

	// 特定のオーディオファイルを削除
	async deleteAudioFile(id: string) {
		const audioFile = await this.prisma.audioFiles.findUnique({
			where: { id },
			include: { audioStreams: true },
		});

		if (!audioFile) {
			throw new Error(`Audio file not found: ${id}`);
		}

		// ファイルシステムからファイルを削除
		const filesToDelete: string[] = [];

		// M4Aファイルを削除
		if (audioFile.outputPath && (await this.fileExists(audioFile.outputPath))) {
			filesToDelete.push(audioFile.outputPath);
		}

		// ストリーム出力ファイルを削除
		for (const stream of audioFile.audioStreams) {
			if (stream.outputPath && (await this.fileExists(stream.outputPath))) {
				filesToDelete.push(stream.outputPath);
			}
		}

		// BGMの場合、サムネイル画像も削除
		if (audioFile.category === "BGM") {
			const baseDir = path.join(
				this.globalConfig.getAssetsPath(),
				"bgm/thumbnails",
			);
			const fileNumberMatch = audioFile.filename.match(/(\d+)/);

			if (fileNumberMatch) {
				const fileNumber = fileNumberMatch[1];
				const thumbnailPaths = [
					path.join(baseDir, `image_sticker_40${fileNumber}.webp`),
					path.join(baseDir, `image_sticker_90${fileNumber}.webp`),
				];

				for (const thumbnailPath of thumbnailPaths) {
					if (await this.fileExists(thumbnailPath)) {
						filesToDelete.push(thumbnailPath);
					}
				}
			}
		}

		// ファイルを削除
		for (const filePath of filesToDelete) {
			try {
				await fs.promises.unlink(filePath);
				this.logger.log(`Deleted file: ${filePath}`);
			} catch (error) {
				this.logger.warn(
					`Failed to delete file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// データベースから削除（関連するストリームも自動削除される）
		await this.prisma.audioFiles.delete({
			where: { id },
		});

		this.logger.log(
			`Deleted audio file and related data: ${audioFile.filename}`,
		);
	}

	// 特定のオーディオファイルを未変換状態にリセット
	async resetAudioFileToUnconverted(id: string) {
		const audioFile = await this.prisma.audioFiles.findUnique({
			where: { id },
			include: { audioStreams: true },
		});

		if (!audioFile) {
			throw new Error(`Audio file not found: ${id}`);
		}

		// ファイルシステムから変換済みファイルを削除
		const filesToDelete: string[] = [];

		// M4Aファイルを削除
		if (audioFile.outputPath && (await this.fileExists(audioFile.outputPath))) {
			filesToDelete.push(audioFile.outputPath);
		}

		// ストリーム出力ファイルを削除
		for (const stream of audioFile.audioStreams) {
			if (stream.outputPath && (await this.fileExists(stream.outputPath))) {
				filesToDelete.push(stream.outputPath);
			}
		}

		// BGMの場合、サムネイル画像も削除
		if (audioFile.category === "BGM") {
			const baseDir = path.join(
				this.globalConfig.getAssetsPath(),
				"bgm/thumbnails",
			);
			const fileNumberMatch = audioFile.filename.match(/(\d+)/);

			if (fileNumberMatch) {
				const fileNumber = fileNumberMatch[1];
				const thumbnailPaths = [
					path.join(baseDir, `image_sticker_40${fileNumber}.webp`),
					path.join(baseDir, `image_sticker_90${fileNumber}.webp`),
				];

				for (const thumbnailPath of thumbnailPaths) {
					if (await this.fileExists(thumbnailPath)) {
						filesToDelete.push(thumbnailPath);
					}
				}
			}
		}

		// ファイルを削除
		for (const filePath of filesToDelete) {
			try {
				await fs.promises.unlink(filePath);
				this.logger.log(`Deleted file: ${filePath}`);
			} catch (error) {
				this.logger.warn(
					`Failed to delete file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// データベースを未変換状態にリセット（ファイルは残す）
		const updatedAudioFile = await this.prisma.audioFiles.update({
			where: { id },
			data: {
				outputPath: null,
				displayName: null,
				thumbnailPath: null,
				status: "PENDING",
				convertedAt: null,
				// ストリームも削除
				audioStreams: {
					deleteMany: {},
				},
			},
			include: { audioStreams: true },
		});

		this.logger.log(
			`Reset audio file to unconverted state: ${audioFile.filename}`,
		);
		return updatedAudioFile;
	}

	// 全オーディオファイルを削除（データベースリセット）
	async deleteAllAudioFiles() {
		// 全ファイルを取得
		const allFiles = await this.prisma.audioFiles.findMany({
			include: { audioStreams: true },
		});

		// 各ファイルを個別に削除（ファイルシステムクリーンアップのため）
		for (const file of allFiles) {
			try {
				await this.deleteAudioFile(file.id);
			} catch (error) {
				this.logger.warn(
					`Failed to delete file ${file.filename}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// 追加で残ったM4Aファイルとサムネイルディレクトリも削除
		const bgmDir = path.join(this.globalConfig.getAssetsPath(), "bgm");
		const thumbnailDir = path.join(
			this.globalConfig.getAssetsPath(),
			"bgm/thumbnails",
		);

		try {
			// M4Aファイルを削除
			const m4aFiles = await fs.promises.readdir(bgmDir).catch(() => []);
			for (const file of m4aFiles) {
				if (file.endsWith(".m4a")) {
					try {
						await fs.promises.unlink(path.join(bgmDir, file));
						this.logger.log(`Deleted remaining M4A file: ${file}`);
					} catch (error) {
						this.logger.warn(
							`Failed to delete M4A file ${file}: ${error instanceof Error ? error.message : "Unknown error"}`,
						);
					}
				}
			}

			// サムネイルディレクトリを削除
			if (await this.fileExists(thumbnailDir)) {
				await fs.promises.rmdir(thumbnailDir, { recursive: true });
				this.logger.log(`Deleted thumbnails directory: ${thumbnailDir}`);
			}
		} catch (error) {
			this.logger.warn(
				`Failed to clean up directories: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		this.logger.log("All audio files and related data deleted successfully");
	}

	// ファイル存在確認ヘルパー
	private async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.promises.access(filePath);
			return true;
		} catch {
			return false;
		}
	}
}
