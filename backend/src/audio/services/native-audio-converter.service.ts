import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { AppLoggerService } from "../../logger/logger.service";
import type {
	MetadataFields,
	ThumbnailExtractionResult,
} from "../interfaces/audio-config.interface";
import { AudioConfigService } from "./audio-config.service";
import { NativeShellService } from "./native-shell.service";
import { WavToM4aService } from "./wav-to-m4a.service";

interface ConversionResult {
	outputPath: string;
	title?: string;
	artist?: string;
	thumbnailPath?: string;
	fileNumber?: string;
	existed?: boolean;
	yamlMetadata?: MetadataFields;
	convertedStreams?: number;
	totalStreams?: number;
}

@Injectable()
export class NativeAudioConverterService {
	private readonly logger;

	constructor(
		private configService: AudioConfigService,
		private shellService: NativeShellService,
		private wavToM4aService: WavToM4aService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(
			NativeAudioConverterService.name,
		);
	}

	// ACB → M4A 変換パイプライン
	async convertACBToM4A(
		acbFilePath: string,
		category: string,
	): Promise<ConversionResult> {
		this.logger.log(
			`Starting ACB to M4A conversion pipeline for: ${acbFilePath}`,
		);
		this.shellService.debugLog(
			`Script started with arguments: ${acbFilePath}, ${category}`,
		);

		// 引数チェック（shell scriptと同等）
		if (!acbFilePath || !category) {
			throw new Error("Usage: convertACBToM4A <ACB_FILE_PATH> <CATEGORY>");
		}

		// ツール実行ディレクトリを動的に決定（BGM / SE / ストーリーボイス）
		let finalACBDir: string;
		if (category === "SE") {
			finalACBDir = this.configService.getSeTempDir();
		} else if (acbFilePath.includes("vo_adv_")) {
			finalACBDir = this.configService.getStoryTempDir();
		} else {
			// BGMの場合は既存のディレクトリ
			finalACBDir = this.configService.getFinalACBDir();
		}

		// 必要なディレクトリ作成
		await this.shellService.ensureDirectoryExists(finalACBDir);

		// 必要なファイル・ツールの存在確認
		if (!(await this.shellService.fileExists(acbFilePath))) {
			throw new Error(`ACB file not found: ${acbFilePath}`);
		}

		const vgmstreamPath = this.configService.getVgmstreamPath();
		if (!(await this.shellService.fileExists(vgmstreamPath))) {
			throw new Error(`vgmstream-cli not found: ${vgmstreamPath}`);
		}

		this.shellService.printCyan("Converting ACB -> WAV...");

		// ACBファイル名を取得（shell scriptと同等の処理）
		const acbFilename = path.basename(acbFilePath);
		const acbBasename = path.basename(acbFilename, ".acb");

		const awbPath = path.join(path.dirname(acbFilePath), `${acbBasename}.awb`);
		const isBgm = acbBasename.startsWith("bgm_");
		const isBgmLiveOrPreview =
			acbBasename.startsWith("bgm_live_") ||
			acbBasename.startsWith("bgm_preview_");
		const workInputPath =
			isBgm &&
			!isBgmLiveOrPreview &&
			(await this.shellService.fileExists(awbPath))
				? awbPath
				: acbFilePath;
		this.shellService.debugLog(
			`ACB filename: ${acbFilename}, basename: ${acbBasename}`,
		);

		// 古いWAVファイルをクリーンアップ（shell scriptと同等）
		this.shellService.debugLog("Cleaning up ALL old WAV files");
		const wavPattern = path.join(finalACBDir, "*.wav");
		const cleanupCount = await this.shellService.deleteGlobFiles(wavPattern);
		this.shellService.debugLog(`Cleaned up ${cleanupCount} old WAV files`);

		this.shellService.printCyan(`Processing: ${acbFilePath}`);

		// メタデータ取得（shell scriptと同等のロジック）
		const metadataResult = await this.getACBMetadata(workInputPath);

		if (metadataResult.streamCount > 0) {
			// 複数ストリーム変換（shell scriptのループと同等）
			await this.convertMultipleStreams(
				workInputPath,
				metadataResult.streamCount,
				finalACBDir,
			);
		} else {
			// 単一変換（shell scriptと同等）
			await this.convertSingleStream(workInputPath, finalACBDir);
		}

		this.shellService.printGreen("All conversions completed!");
		this.shellService.debugLog("ACB to WAV conversion phase completed");

		return await this.processWAVToM4A(workInputPath, finalACBDir);
	}

	// vgmstreamでメタデータ取得（shell scriptと同等）
	private async getACBMetadata(
		acbFilePath: string,
	): Promise<{ streamCount: number }> {
		this.shellService.debugLog("Checking metadata with vgmstream");

		const vgmstreamPath = this.configService.getVgmstreamPath();
		const command = `"${vgmstreamPath}" -m "${acbFilePath}"`;

		try {
			const { stdout } =
				await this.shellService.executeRetryableCommandWithOutput({
					command,
					description: "metadata extraction",
					captureOutput: true,
				});

			this.shellService.debugLog("Metadata extraction completed");

			// ストリーム数を抽出（shell scriptの正規表現と同等）
			const streamMatch = stdout.match(/stream\s+count:\s*(\d+)/);
			if (streamMatch) {
				const streamCount = parseInt(streamMatch[1], 10);
				this.shellService.printYellow(`Stream count: ${streamCount}`);
				this.shellService.debugLog(`Found ${streamCount} streams`);
				return { streamCount };
			}

			return { streamCount: 0 };
		} catch (error) {
			this.logger.warn(`Failed to get metadata: ${error.message}`);
			return { streamCount: 0 };
		}
	}

	// 複数ストリーム変換（shell scriptのforループと同等）
	private async convertMultipleStreams(
		acbFilePath: string,
		streamCount: number,
		finalACBDir: string,
	): Promise<void> {
		this.shellService.debugLog("Starting stream conversion loop");

		const vgmstreamPath = this.configService.getVgmstreamPath();

		for (let i = 1; i <= streamCount; i++) {
			this.shellService.debugLog(`Converting stream ${i} of ${streamCount}`);

			const outputPattern = path.join(finalACBDir, "?n.wav");
			const command = `"${vgmstreamPath}" "${acbFilePath}" -o "${outputPattern}" -s "${i}"`;

			try {
				await this.shellService.executeRetryableCommand({
					command: `${command} > /dev/null 2>&1`,
					description: `stream ${i} conversion`,
				});

				this.shellService.debugLog(`Stream ${i} conversion completed`);
			} catch (error) {
				this.shellService.printRed(
					`エラー: ${acbFilePath} のストリーム ${i} の変換に失敗しました。`,
				);
				throw new Error(`Failed to convert stream ${i}: ${error.message}`);
			}
		}

		this.shellService.debugLog("Stream conversion loop finished");
	}

	// 単一ストリーム変換（shell scriptと同等）
	private async convertSingleStream(
		acbFilePath: string,
		finalACBDir: string,
	): Promise<void> {
		this.shellService.printYellow("No stream found. Converting normally...");
		this.shellService.debugLog("No streams found, using single conversion");

		const vgmstreamPath = this.configService.getVgmstreamPath();
		const outputPattern = path.join(finalACBDir, "?n.wav");
		const command = `"${vgmstreamPath}" "${acbFilePath}" -o "${outputPattern}"`;

		try {
			await this.shellService.executeRetryableCommand({
				command: `${command} > /dev/null 2>&1`,
				description: "ACB conversion",
			});

			this.shellService.debugLog("Single conversion completed");
		} catch (error) {
			this.shellService.printRed(
				`エラー: ${acbFilePath} の変換に失敗しました。`,
			);
			throw new Error(`Failed to convert ACB: ${error.message}`);
		}
	}

	// WAV → M4A 変換処理
	private async processWAVToM4A(
		acbFilePath: string,
		finalACBDir: string,
	): Promise<ConversionResult> {
		this.shellService.printCyan(
			"Processing converted WAV files for M4A conversion...",
		);
		this.shellService.debugLog("Starting M4A conversion phase");

		// WAVファイル検索パターンをファイル名から決定（実ファイル基準）
		this.shellService.debugLog(`Searching for WAV files in ${finalACBDir}`);
		const acbBasename = path.parse(acbFilePath).name;
		const lowerBasename = acbBasename.toLowerCase();
		const seContainerNames = new Set([
			"adv",
			"extra_ui",
			"fes",
			"gacha",
			"quest",
			"rhythm",
		]);

		let searchPattern: string;
		let fileDescription: string;
		let categoryKind: "story_voice" | "voice" | "bgm" | "se";

		if (lowerBasename.startsWith("vo_adv_")) {
			searchPattern = "vo_adv_*.wav";
			fileDescription = "Story voice";
			categoryKind = "story_voice";
		} else if (lowerBasename.startsWith("vo_card_")) {
			searchPattern = "vo_card_*.wav";
			fileDescription = "Card voice";
			categoryKind = "voice";
		} else if (lowerBasename.startsWith("vo_chara_")) {
			searchPattern = "vo_chara_*.wav";
			fileDescription = "Character voice";
			categoryKind = "voice";
		} else if (lowerBasename.startsWith("bgm_")) {
			searchPattern = "bgm_*.wav";
			fileDescription = "BGM";
			categoryKind = "bgm";
		} else if (
			lowerBasename.startsWith("se_") ||
			seContainerNames.has(lowerBasename)
		) {
			searchPattern = "se_*.wav";
			fileDescription = "Sound effect";
			categoryKind = "se";
		} else {
			throw new Error(`Unknown ACB category for ${acbBasename}`);
		}

		const wavFiles = await this.shellService.findFiles(
			finalACBDir,
			searchPattern,
		);

		// 実際に存在するファイルだけをフィルタリング
		const actualWavFiles: string[] = [];
		for (const file of wavFiles) {
			if (await this.shellService.fileExists(file)) {
				actualWavFiles.push(file);
			}
		}

		this.shellService.debugLog(
			`Found ${actualWavFiles.length} ${fileDescription} WAV files to process`,
		);
		if (actualWavFiles.length === 0) {
			this.shellService.printYellow(
				`No ${fileDescription} WAV files found for M4A conversion`,
			);

			// ストーリーボイスの場合は複数ストリーム処理を試行
			if (categoryKind === "story_voice") {
				return await this.processStoryVoiceStreams(acbFilePath, finalACBDir);
			}

			throw new Error("No WAV files found for M4A conversion");
		}

		if (categoryKind === "story_voice") {
			return await this.processStoryVoiceStreams(acbFilePath, finalACBDir);
		}

		if (categoryKind === "voice") {
			const voiceDir = path.join(this.configService.getAssetsPath(), "voice");
			return await this.processGenericWavs(
				actualWavFiles,
				voiceDir,
				acbBasename,
				"Voice",
			);
		}

		if (categoryKind === "se") {
			return await this.processSeStreams(actualWavFiles);
		}

		const isBgm = acbBasename.startsWith("bgm_");
		const isBgmLiveOrPreview =
			acbBasename.startsWith("bgm_live_") ||
			acbBasename.startsWith("bgm_preview_");

		if (isBgm && !isBgmLiveOrPreview) {
			return await this.processBgmWavs(actualWavFiles, acbBasename);
		}

		// 各WAVファイルに対してaddThumbnail処理を実行
		for (const wavFile of actualWavFiles) {
			this.shellService.printCyan(
				`Processing WAV file: ${path.basename(wavFile)}`,
			);
			this.shellService.debugLog(
				`Starting addThumbnail processing for: ${wavFile}`,
			);

			const result = await this.processAddThumbnail(wavFile);
			if (result.outputPath) {
				// 成功した場合は結果を返す
				this.shellService.printGreen(
					`Successfully created M4A: ${result.outputPath}`,
				);
				this.shellService.debugLog("Script completed successfully");
				return result;
			}
		}

		throw new Error("No M4A files were generated successfully");
	}

	private async processBgmWavs(
		wavFiles: string[],
		acbBasename: string,
	): Promise<ConversionResult> {
		if (wavFiles.length === 0) {
			throw new Error(`No WAV files found for ${acbBasename}`);
		}

		const destinationPath = this.configService.getDestinationPath();
		await this.shellService.ensureDirectoryExists(destinationPath);

		const outputPath = path.join(destinationPath, `${acbBasename}.m4a`);
		const basePath = path.dirname(destinationPath);
		const relativeFilePath = path.relative(basePath, outputPath);

		if (await this.shellService.fileExists(outputPath)) {
			for (const wavFile of wavFiles) {
				await this.shellService.deleteFile(wavFile);
			}
			return {
				outputPath: `assets/${relativeFilePath}`,
				title: acbBasename,
				artist: "BGM",
				existed: true,
			};
		}

		let sourceWav = wavFiles[0];
		if (wavFiles.length > 1) {
			let bestSize = 0;
			for (const file of wavFiles) {
				try {
					const stat = await fs.stat(file);
					if (stat.size > bestSize) {
						bestSize = stat.size;
						sourceWav = file;
					}
				} catch {
					// ignore
				}
			}
		}

		await this.convertWavToM4a(sourceWav, outputPath, acbBasename);

		for (const wavFile of wavFiles) {
			await this.shellService.deleteFile(wavFile);
		}

		if (!(await this.shellService.fileExists(outputPath))) {
			throw new Error("M4A file was not generated");
		}

		return {
			outputPath: `assets/${relativeFilePath}`,
			title: acbBasename,
			artist: "BGM",
			existed: false,
		};
	}

	private async processGenericWavs(
		wavFiles: string[],
		outputDir: string,
		outputBasename: string,
		label: string,
	): Promise<ConversionResult> {
		if (wavFiles.length === 0) {
			throw new Error(`No WAV files found for ${outputBasename}`);
		}

		await this.shellService.ensureDirectoryExists(outputDir);

		const outputPath = path.join(outputDir, `${outputBasename}.m4a`);
		const assetsRoot = this.configService.getAssetsPath();
		const relativeFilePath = path
			.relative(assetsRoot, outputPath)
			.replace(/\\/g, "/");

		if (await this.shellService.fileExists(outputPath)) {
			for (const wavFile of wavFiles) {
				await this.shellService.deleteFile(wavFile);
			}
			return {
				outputPath: `assets/${relativeFilePath}`,
				title: outputBasename,
				artist: label,
				existed: true,
			};
		}

		let sourceWav = wavFiles[0];
		if (wavFiles.length > 1) {
			let bestSize = 0;
			for (const file of wavFiles) {
				try {
					const stat = await fs.stat(file);
					if (stat.size > bestSize) {
						bestSize = stat.size;
						sourceWav = file;
					}
				} catch {
					// ignore
				}
			}
		}

		await this.convertWavToM4a(sourceWav, outputPath, outputBasename);

		for (const wavFile of wavFiles) {
			await this.shellService.deleteFile(wavFile);
		}

		if (!(await this.shellService.fileExists(outputPath))) {
			throw new Error("M4A file was not generated");
		}

		return {
			outputPath: `assets/${relativeFilePath}`,
			title: outputBasename,
			artist: label,
			existed: false,
		};
	}

	private async processSeStreams(
		wavFiles: string[],
	): Promise<ConversionResult> {
		this.shellService.printCyan("Processing SE streams...");

		if (wavFiles.length === 0) {
			throw new Error("No SE WAV files found");
		}

		const assetsPath = path.join(this.configService.getAssetsPath(), "se");
		await this.shellService.ensureDirectoryExists(assetsPath);
		const assetsRoot = this.configService.getAssetsPath();

		let convertedCount = 0;
		let lastOutputPath = "";

		for (const wavFile of wavFiles) {
			try {
				const wavBasename = path.basename(wavFile, ".wav");
				const outputFilename = `${wavBasename}.m4a`;
				const outputPath = path.join(assetsPath, outputFilename);
				const relativeFilePath = path
					.relative(assetsRoot, outputPath)
					.replace(/\\/g, "/");

				await this.convertWavToM4a(wavFile, outputPath, `SE ${wavBasename}`);

				convertedCount++;
				lastOutputPath = `assets/${relativeFilePath}`;
			} catch (error) {
				this.logger.warn(`Failed to convert ${wavFile}: ${error.message}`);
			}
		}

		if (convertedCount === 0) {
			throw new Error("No SE streams were successfully converted");
		}

		return {
			outputPath: lastOutputPath,
			title: "SE",
			artist: "SE",
			existed: false,
			convertedStreams: convertedCount,
			totalStreams: wavFiles.length,
		};
	}

	private async convertWavToM4a(
		wavFile: string,
		outputPath: string,
		label: string,
	) {
		this.logger.log(`Converting WAV to M4A for ${label}...`);
		await this.wavToM4aService.convertOnly({
			sourceWavPath: wavFile,
			destinationPath: outputPath,
			bitrateKbps: 320,
			cutoffKhz: 20,
		});
	}

	private async processAddThumbnail(
		wavFile: string,
	): Promise<ConversionResult> {
		this.shellService.debugLog(
			`addThumbnail processing started with file: ${wavFile}`,
		);

		// 出力ディレクトリ作成
		const destinationPath = this.configService.getDestinationPath();
		const thumbnailDestPath = this.configService.getThumbnailDestPath();
		await this.shellService.ensureDirectoryExists(destinationPath);
		await this.shellService.ensureDirectoryExists(thumbnailDestPath);

		// 必要なファイルの存在チェック
		if (!(await this.shellService.fileExists(wavFile))) {
			throw new Error(`WAV file not found: ${wavFile}`);
		}

		const manifestPath = this.configService.getManifestPath();
		if (!(await this.shellService.fileExists(manifestPath))) {
			throw new Error("No manifest found");
		}

		// YAMLを読み込んで変数に保存（shell scriptと同等）
		this.shellService.printCyan("Reading manifest");
		const yamlData = await this.shellService.loadYamlFile(manifestPath);
		this.shellService.printGreen("Manifest read");

		// ファイル名から番号を抽出（bgm_live_*, bgm_preview_* 対応）
		const filename = path.basename(wavFile);
		let number: string;

		if (filename.includes("bgm_preview_")) {
			// bgm_preview_20410901 -> 204109 (first 6 digits)
			const previewMatch = filename.match(/bgm_preview_(\d{8})/);
			if (!previewMatch) {
				throw new Error(`Number not found for preview file: ${filename}`);
			}
			number = previewMatch[1].slice(0, 6); // Take first 6 digits
		} else if (filename.includes("bgm_live_")) {
			// bgm_live_30420301 -> 304203 (last 2 digits removed)
			const liveMatch = filename.match(/bgm_live_(\d{6})\d{2}/);
			if (!liveMatch) {
				throw new Error(`Number not found for live file: ${filename}`);
			}
			number = liveMatch[1];
		} else {
			throw new Error(`Unknown BGM file format: ${filename}`);
		}

		// YAMLからメタデータを取得
		const metadata = await this.shellService.findMetadataById(
			yamlData as unknown[],
			parseInt(number, 10),
		);
		if (!metadata || !metadata.title || !metadata.description) {
			throw new Error(`Metadata not found for ${filename}`);
		}

		this.shellService.printCyan(`Processing ${metadata.title}`);

		// サムネイル処理
		const thumbnailResult = await this.processThumbnail(
			number,
			thumbnailDestPath,
		);
		if (!thumbnailResult.success) {
			throw new Error(thumbnailResult.error || "Thumbnail processing failed");
		}

		// ファイル名を安全にする（shell scriptと同等）
		const safeMusicTitle = metadata.title.replace(/[/\\:*?"<>|]/g, "_");
		const destinationFilePath = path.join(
			destinationPath,
			`${number}_${safeMusicTitle}.m4a`,
		);
		// shell scriptでは$rootDirからの相対パスを生成していた
		const basePath = path.dirname(destinationPath);
		const relativeFilePath = path.relative(basePath, destinationFilePath);

		// 既にm4aが存在する場合はスキップ（shell scriptと同等）
		if (await this.shellService.fileExists(destinationFilePath)) {
			this.shellService.printBlue(`Already exists for ${filename}`);

			// 既存ファイルの場合もWebP処理を実行
			const thumbnailPath = thumbnailResult.thumbnailPath;
			if (!thumbnailPath) {
				throw new Error("Thumbnail path is missing");
			}
			const webpPath = await this.processWebPConversion(thumbnailPath);

			return this.generateMetadataResult(
				relativeFilePath,
				metadata,
				webpPath || thumbnailResult.webpPath || thumbnailPath,
				true,
			);
		}

		// Pythonスクリプトを呼び出し（shell scriptと同等）
		const thumbnailPath = thumbnailResult.thumbnailPath;
		if (!thumbnailPath) {
			throw new Error("Thumbnail path is missing");
		}
		await this.wavToM4aService.convertWithTags({
			sourceWavPath: wavFile,
			destinationPath: destinationFilePath,
			coverPngPath: thumbnailPath,
			title: metadata.title,
			artist: metadata.description,
		});

		// 変換が成功した場合、一時WAVファイルを削除
		if (await this.shellService.fileExists(destinationFilePath)) {
			await this.shellService.deleteFile(wavFile);
			this.shellService.printGreen(`Removed temporary WAV: ${wavFile}`);

			// WebP変換処理
			const webpPath = await this.processWebPConversion(thumbnailPath);

			this.shellService.printGreen(`Completed for ${filename}`);

			return this.generateMetadataResult(
				relativeFilePath,
				metadata,
				webpPath || thumbnailPath,
				false,
			);
		}

		throw new Error("M4A file was not generated");
	}

	// サムネイル処理（shell scriptのサムネイル検索ロジックと同等）
	private async processThumbnail(
		number: string,
		thumbnailDestPath: string,
	): Promise<ThumbnailExtractionResult> {
		const thumbnailPath = this.configService.getThumbnailPath();
		const possibleThumbnail = path.join(
			thumbnailPath,
			`image_sticker_40${number}.png`,
		);

		if (await this.shellService.fileExists(possibleThumbnail)) {
			// PNGファイルが直接存在する場合
			const destThumbnail = path.join(
				thumbnailDestPath,
				`image_sticker_40${number}.png`,
			);
			await this.shellService.copyFile(possibleThumbnail, destThumbnail);
			this.shellService.printGreen(`Found PNG thumbnail: ${possibleThumbnail}`);
			this.shellService.printGreen(`Copied to: ${destThumbnail}`);
			return { success: true, thumbnailPath: destThumbnail };
		}

		// .assetbundleファイルを探してAssetStudioで抽出
		return await this.extractThumbnailFromAssetBundle(
			number,
			thumbnailDestPath,
		);
	}

	// AssetBundleからサムネイル抽出（shell scriptと同等）
	private async extractThumbnailFromAssetBundle(
		number: string,
		thumbnailDestPath: string,
	): Promise<ThumbnailExtractionResult> {
		this.shellService.printRed(`Thumbnail PNG not found for number ${number}`);

		const anotherThumbnailPath = this.configService.getThumbnailPath();
		const assetbundle40 = path.join(
			anotherThumbnailPath,
			`image_sticker_40${number}.assetbundle`,
		);
		const assetbundle90 = path.join(
			anotherThumbnailPath,
			`image_sticker_90${number}.assetbundle`,
		);

		// 40番サムネイルを優先して試行
		if (await this.shellService.fileExists(assetbundle40)) {
			this.shellService.printYellow(`Found assetbundle (40): ${assetbundle40}`);
			const result = await this.extractWithAssetStudio(
				assetbundle40,
				number,
				thumbnailDestPath,
				"40",
			);
			if (result.success) return result;
		}

		// 90番サムネイルを試行
		if (await this.shellService.fileExists(assetbundle90)) {
			this.shellService.printYellow(`Found assetbundle (90): ${assetbundle90}`);
			const result = await this.extractWithAssetStudio(
				assetbundle90,
				number,
				thumbnailDestPath,
				"90",
			);
			if (result.success) return result;
		}

		return { success: false, error: `No thumbnail found for number ${number}` };
	}

	// AssetStudioでPNG抽出（shell scriptと同等）
	private async extractWithAssetStudio(
		assetbundlePath: string,
		number: string,
		thumbnailDestPath: string,
		type: "40" | "90",
	): Promise<ThumbnailExtractionResult> {
		// shell scriptと同じ一時ディレクトリ名の生成方式を使用
		const tempExtractDir = `/tmp/assetstudio_${process.pid}`;
		await this.shellService.ensureDirectoryExists(tempExtractDir);

		try {
			const assetStudioPath = this.configService.getAssetStudioPath();
			// shell scriptと完全に同じコマンド引数を使用
			const command = `"${assetStudioPath}" "${assetbundlePath}" -t tex2d -o "${tempExtractDir}" --image-format png --log-level warning`;

			await this.shellService.executeRetryableCommand({
				command: `${command} >/dev/null 2>&1`,
				description: "AssetStudio extraction",
			});

			const extractedFiles = await this.shellService.findFiles(
				tempExtractDir,
				"*.png",
			);
			if (extractedFiles.length > 0) {
				const finalThumbnailPng = path.join(
					thumbnailDestPath,
					`image_sticker_${type}${number}.png`,
				);
				await this.shellService.moveFile(extractedFiles[0], finalThumbnailPng);
				this.shellService.printGreen(
					`Extracted and saved PNG: ${finalThumbnailPng}`,
				);
				return { success: true, thumbnailPath: finalThumbnailPng };
			}

			return { success: false, error: "No PNG files extracted" };
		} catch (error) {
			return {
				success: false,
				error: `AssetStudio extraction failed: ${error.message}`,
			};
		} finally {
			// 一時ディレクトリを削除（shell scriptと同等）
			try {
				await this.shellService.executeRetryableCommand({
					command: `rm -rf "${tempExtractDir}"`,
					description: "cleanup temp directory",
				});
			} catch (cleanupError) {
				this.logger.warn(
					`Failed to cleanup temp directory: ${cleanupError.message}`,
				);
			}
		}
	}

	// Pythonスクリプト呼び出し（shell scriptと同等）
	// WebP変換処理（shell scriptと同等）
	private async processWebPConversion(pngPath: string): Promise<string | null> {
		if (!(await this.shellService.fileExists(pngPath))) {
			return null;
		}

		const webpPath = pngPath.replace(/\.png$/, ".webp");
		const cwebpPath = this.configService.getCwebpPath();

		try {
			const command = `"${cwebpPath}" -q 90 "${pngPath}" -o "${webpPath}"`;
			await this.shellService.executeRetryableCommand({
				command: `${command} &> /dev/null`,
				description: "WebP conversion",
			});

			this.shellService.printGreen(`Generated WebP thumbnail: ${webpPath}`);

			// 一時PNGファイルを削除（M4Aに埋め込み済みのため）
			await this.shellService.deleteFile(pngPath);
			this.shellService.printGreen(`Removed temporary PNG: ${pngPath}`);

			return webpPath;
		} catch (error) {
			this.shellService.printRed(
				`Failed to convert PNG to WebP: ${pngPath}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return pngPath; // WebP変換失敗時はPNGパスを返す
		}
	}

	// ストーリーボイス複数ストリーム処理
	private async processStoryVoiceStreams(
		acbFilePath: string,
		finalACBDir: string,
		progressCallback?: (current: number, total: number) => void,
	): Promise<ConversionResult> {
		this.shellService.printCyan("Processing story voice streams...");

		const acbBasename = path.basename(acbFilePath, ".acb");
		// ストーリーボイス専用ディレクトリに保存
		const assetsPath = this.configService.getStoryAssetsPath();

		// 変換されたWAVファイルを探す
		const allWavFiles = await this.shellService.findFiles(finalACBDir, "*.wav");
		const storyWavFiles = allWavFiles.filter((f) => f.includes(acbBasename));

		this.shellService.debugLog(
			`Found ${storyWavFiles.length} story voice WAV files for ${acbBasename}`,
		);

		if (storyWavFiles.length === 0) {
			throw new Error(`No story voice WAV files found for ${acbBasename}`);
		}

		// 各WAVファイルを個別にM4Aに変換
		let convertedCount = 0;
		let lastOutputPath = "";

		for (const wavFile of storyWavFiles) {
			try {
				const wavBasename = path.basename(wavFile, ".wav");
				// ファイル名をありのままでM4Aに変換（正規化しない）
				const outputFilename = `${wavBasename}.m4a`;
				const outputPath = path.join(assetsPath, outputFilename);

				// 進捗報告
				if (progressCallback) {
					progressCallback(convertedCount, storyWavFiles.length);
				}

				// ストーリーボイスはPythonスクリプトではなく直接FFmpegを使用
				// （カバー画像が必須でストーリーボイスには不要のため）
				await this.convertWavToM4a(
					wavFile,
					outputPath,
					`Story voice ${wavBasename}`,
				);

				convertedCount++;
				lastOutputPath = outputPath;

				this.shellService.debugLog(
					`Converted stream ${convertedCount}/${storyWavFiles.length}: ${outputFilename}`,
				);
			} catch (error) {
				this.logger.warn(`Failed to convert ${wavFile}: ${error.message}`);
			}
		}

		if (convertedCount === 0) {
			throw new Error("No story voice streams were successfully converted");
		}

		this.shellService.printGreen(
			`Successfully converted ${convertedCount}/${storyWavFiles.length} story voice streams`,
		);

		// 最初の変換されたファイルのパスを返す（ストーリーボイスは複数ファイルなので代表として）
		return {
			outputPath: lastOutputPath,
			title: acbBasename,
			artist: "Story Voice",
			thumbnailPath: "",
			fileNumber: acbBasename,
			existed: false,
			yamlMetadata: null,
			convertedStreams: convertedCount,
			totalStreams: storyWavFiles.length,
		};
	}

	// メタデータ結果生成（shell scriptのJSON生成と同等）
	private generateMetadataResult(
		outputPath: string,
		metadata: MetadataFields,
		thumbnailPath: string,
		existed: boolean,
	): ConversionResult {
		// shell scriptでは$rootDirからの相対パスを生成していた
		const destinationPath = this.configService.getDestinationPath();
		const basePath = path.dirname(destinationPath);
		const relativeThumbnailPath = path.relative(basePath, thumbnailPath);
		// Add assets/ prefix for proper URL serving (consistent format without leading /)
		const normalizedThumbnailPath = `assets/${relativeThumbnailPath}`;

		return {
			outputPath: `assets/${outputPath}`, // Add assets/ prefix for URL serving
			title: metadata.title,
			artist: metadata.description,
			thumbnailPath: normalizedThumbnailPath, // URL path with /assets/ prefix
			fileNumber: metadata.musicId.toString(),
			existed,
			yamlMetadata: metadata,
		};
	}

	// ストーリーボイス変換専用メソッド
	async convertStoryVoice(
		filename: string,
		progressCallback?: (current: number, total: number) => void,
	): Promise<ConversionResult> {
		const cachePlainPath = this.configService.getCachePlainPath();
		const acbFilePath = path.join(cachePlainPath, filename);
		const storyTempDir = this.configService.getStoryTempDir();

		// 必要なディレクトリ作成
		await this.shellService.ensureDirectoryExists(storyTempDir);

		// 必要なファイル・ツールの存在確認
		if (!(await this.shellService.fileExists(acbFilePath))) {
			throw new Error(`ACB file not found: ${acbFilePath}`);
		}

		const vgmstreamPath = this.configService.getVgmstreamPath();
		if (!(await this.shellService.fileExists(vgmstreamPath))) {
			throw new Error(`vgmstream-cli not found: ${vgmstreamPath}`);
		}

		// 古いWAVファイルをクリーンアップ
		const wavPattern = path.join(storyTempDir, "*.wav");
		await this.shellService.deleteGlobFiles(wavPattern);

		// ストーリーボイス専用の変換処理（ACB -> WAV -> M4A）
		// const acbBasename = path.basename(acbFilePath, ".acb");
		const metadataResult = await this.getACBMetadata(acbFilePath);

		if (metadataResult.streamCount > 0) {
			await this.convertMultipleStreams(
				acbFilePath,
				metadataResult.streamCount,
				storyTempDir,
			);
		} else {
			await this.convertSingleStream(acbFilePath, storyTempDir);
		}

		return await this.processStoryVoiceStreams(
			acbFilePath,
			storyTempDir,
			progressCallback,
		);
	}
}
