import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { AppLoggerService } from "../../logger/logger.service";
import { AudioConfigService } from "./audio-config.service";
import { NativeShellService } from "./native-shell.service";

@Injectable()
export class StoryBackgroundService {
	private readonly logger;

	constructor(
		private configService: AudioConfigService,
		private shellService: NativeShellService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(
			StoryBackgroundService.name,
		);
	}

	async convertStoryBackgrounds(storyId: string): Promise<{
		converted: number;
		skipped: number;
		missing: number;
	}> {
		const storyFile = path.join(
			this.configService.getCachePlainPath(),
			`story_main_${storyId}.txt`,
		);

		if (!(await this.shellService.fileExists(storyFile))) {
			this.logger.warn(`Story text not found: ${storyFile}`);
			return { converted: 0, skipped: 0, missing: 0 };
		}

		const content = await fs.readFile(storyFile, "utf-8");
		const backgrounds = new Set<string>();

		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const match = trimmed.match(/\[背景表示\s+(.+?)\]/);
			if (match) {
				backgrounds.add(match[1].trim());
			}
		}

		const assetsRoot = this.configService.getAssetsPath();
		const outputDir = path.join(assetsRoot, "story", "backgrounds");
		await this.shellService.ensureDirectoryExists(outputDir);

		let converted = 0;
		let skipped = 0;
		let missing = 0;

		for (const background of backgrounds) {
			const outputPath = path.join(outputDir, `${background}.png`);
			if (await this.shellService.fileExists(outputPath)) {
				skipped++;
				continue;
			}

			const assetbundlePath = path.join(
				this.configService.getCachePlainPath(),
				`${background}.assetbundle`,
			);

			if (!(await this.shellService.fileExists(assetbundlePath))) {
				this.logger.warn(
					`Background assetbundle not found: ${assetbundlePath}`,
				);
				missing++;
				continue;
			}

			const extracted = await this.extractBackground(
				assetbundlePath,
				outputPath,
			);
			if (extracted) {
				converted++;
			} else {
				missing++;
			}
		}

		return { converted, skipped, missing };
	}

	private async extractBackground(
		assetbundlePath: string,
		outputPath: string,
	): Promise<boolean> {
		const tempExtractDir = `/tmp/assetstudio_story_bg_${process.pid}_${Date.now()}`;
		await this.shellService.ensureDirectoryExists(tempExtractDir);

		try {
			const assetStudioPath = this.configService.getAssetStudioPath();
			const command = `"${assetStudioPath}" "${assetbundlePath}" -t tex2d -o "${tempExtractDir}" --image-format png --log-level warning`;

			await this.shellService.executeRetryableCommand({
				command: `${command} >/dev/null 2>&1`,
				description: "Story background extraction",
			});

			const extractedFiles = await this.shellService.findFiles(
				tempExtractDir,
				"*.png",
			);

			if (extractedFiles.length === 0) {
				return false;
			}

			const largestFile = await this.pickLargestFile(extractedFiles);
			if (!largestFile) {
				return false;
			}

			await this.shellService.moveFile(largestFile, outputPath);
			this.shellService.printGreen(`Extracted background: ${outputPath}`);
			return true;
		} catch (error) {
			this.logger.warn(`Background extraction failed: ${error.message}`);
			return false;
		} finally {
			try {
				await this.shellService.executeRetryableCommand({
					command: `rm -rf "${tempExtractDir}"`,
					description: "cleanup background temp directory",
				});
			} catch (cleanupError) {
				this.logger.warn(
					`Failed to cleanup background temp directory: ${cleanupError.message}`,
				);
			}
		}
	}

	private async pickLargestFile(files: string[]): Promise<string | null> {
		let bestFile: string | null = null;
		let bestSize = 0;

		for (const file of files) {
			try {
				const stat = await fs.stat(file);
				if (stat.size > bestSize) {
					bestSize = stat.size;
					bestFile = file;
				}
			} catch {
				// ignore
			}
		}

		return bestFile;
	}
}
