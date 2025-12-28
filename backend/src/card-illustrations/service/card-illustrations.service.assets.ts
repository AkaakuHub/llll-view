import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { CardIllustrationsServiceImports } from "./card-illustrations.service.imports";

export class CardIllustrationsServiceAssets extends CardIllustrationsServiceImports {
	async extractAssets() {
		const result = {
			imagesExtracted: 0,
			videosExtracted: 0,
			errors: [],
		};

		try {
			// アセット抽出ディレクトリを作成（新フォーマットをassets直下に出力）
			const extractDir = this.globalConfig.getCardIllustrationsAssetsPath();
			if (!fs.existsSync(extractDir)) {
				fs.mkdirSync(extractDir, { recursive: true });
			}

			// カードイラスト画像の抽出
			const imageResult = await this.extractCardImages();
			result.imagesExtracted = imageResult.extracted;
			result.errors.push(...imageResult.errors);

			// USM動画の変換
			const videoResult = await this.convertUsmVideos();
			result.videosExtracted = videoResult.converted;
			result.errors.push(...videoResult.errors);
		} catch (error) {
			this.logger.error("アセット抽出中にエラーが発生:", error);
			result.errors.push(`システムエラー: ${error.message}`);
		}

		return result;
	}

	private async extractCardImages() {
		const result = { extracted: 0, errors: [] as string[] };

		try {
			const plainDir = this.globalConfig.getCachePlainPath();

			const imageFiles = fs
				.readdirSync(plainDir)
				.filter(
					(file) =>
						file.startsWith("image_card_full_") &&
						file.endsWith(".assetbundle"),
				);

			this.logger.log(
				`${imageFiles.length}個のカードイラストファイルを処理開始`,
			);

			for (const file of imageFiles) {
				try {
					const inputPath = path.join(plainDir, file);
					const cardId = file
						.replace("image_card_full_", "")
						.replace(".assetbundle", "");

					const outputPath = this.getCardImageCachePath(
						parseInt(cardId, 10),
						"full",
					);
					if (fs.existsSync(outputPath)) {
						this.logger.log(`スキップ（既に存在）: card_${cardId}_full.png`);
						result.extracted++;
						continue;
					}

					const ASSETSTUDIO_CLI = this.globalConfig.getAssetStudioCliPath();
					const tempDir = fs.mkdtempSync(
						path.join(this.globalConfig.getTempPath(), "card-image-bulk-"),
					);
					const cmd = `export DOTNET_ROOT=${this.globalConfig.getDotnetRootAssetStudio()} && "${ASSETSTUDIO_CLI}" "${inputPath}" -t tex2d -o "${tempDir}" --image-format png --log-level warning`;

					this.logger.log(`画像抽出実行: ${file}`);
					this.logger.log(`コマンド: ${cmd}`);

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
										this.logger.error(`AssetStudio実行失敗: ${error.message}`);
										if (stderr) this.logger.error(`stderr: ${stderr}`);
										if (stdout) this.logger.log(`stdout: ${stdout}`);
										reject(new Error(`Command failed: ${error.message}`));
										return;
									}

									this.logger.log(`AssetStudio完了: ${file}`);
									if (
										stderr &&
										!stderr.includes("Writing") &&
										!stderr.includes("Successfully")
									) {
										this.logger.warn(`警告: ${stderr}`);
									}
									if (stdout) {
										this.logger.log(`AssetStudio出力: ${stdout}`);
									}

									resolve();
								},
							);
						});

						const extractedFiles = fs
							.readdirSync(tempDir)
							.filter((f) => f.endsWith(".png"));

						this.logger.log(`抽出されたファイル数: ${extractedFiles.length}`);

						if (extractedFiles.length > 0) {
							const extractedFile = extractedFiles[0];
							const tempPath = path.join(tempDir, extractedFile);
							await this.moveImageToAssets(parseInt(cardId, 10), tempPath);
							result.extracted++;
						} else {
							this.logger.warn(`PNG ファイルが抽出されませんでした: ${file}`);
						}
					} finally {
						fs.rmSync(tempDir, { recursive: true, force: true });
					}
				} catch (error) {
					const errorMsg = `画像抽出失敗 ${file}: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `画像抽出処理でエラー: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	private async convertUsmVideos() {
		const result = { converted: 0, errors: [] as string[] };

		try {
			const plainDir = this.globalConfig.getCachePlainPath();

			// picture_ur_home_*.usmファイルを検索
			const usmFiles = fs
				.readdirSync(plainDir)
				.filter(
					(file) =>
						file.startsWith("picture_ur_home_") && file.endsWith(".usm"),
				);

			this.logger.log(`${usmFiles.length}個のUSM動画ファイルを処理開始`);

			for (const file of usmFiles) {
				try {
					const inputPath = path.join(plainDir, file);
					const cardId = file
						.replace("picture_ur_home_", "")
						.replace(".usm", "");
					const outputPath = this.getCardVideoCachePath(
						parseInt(cardId, 10),
						"home",
						"single",
					);

					// 既に変換済みかチェック
					if (fs.existsSync(outputPath)) {
						this.logger.log(
							`スキップ（既に存在）: card_${cardId}_home_single.mp4`,
						);
						result.converted++;
						continue;
					}

					// UsmToolkitで動画変換
					const usmToolkitDir = this.globalConfig.getUsmToolkitPath();
					const tempDir = fs.mkdtempSync(
						path.join(this.globalConfig.getTempPath(), "card-video-bulk-"),
					);
					const cmd = `cd "${usmToolkitDir}" && dotnet run -- convert "${inputPath}" -o "${tempDir}" -c`;

					this.logger.log(`USM動画変換実行: ${file}`);
					this.logger.log(`コマンド: ${cmd}`);

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
										this.logger.error(`USM変換失敗: ${error.message}`);
										if (stderr) this.logger.error(`stderr: ${stderr}`);
										if (stdout) this.logger.log(`stdout: ${stdout}`);
										reject(new Error(`Command failed: ${error.message}`));
										return;
									}

									this.logger.log(`USM変換完了: ${file}`);
									if (
										stderr &&
										!stderr.includes("Converting") &&
										!stderr.includes("Successfully")
									) {
										this.logger.warn(`警告: ${stderr}`);
									}
									if (stdout) {
										this.logger.log(`UsmToolkit出力: ${stdout}`);
									}

									resolve();
								},
							);
						});

						const convertedFiles = fs
							.readdirSync(tempDir)
							.filter((f) => f.endsWith(".mp4"));

						this.logger.log(`変換されたファイル数: ${convertedFiles.length}`);

						if (convertedFiles.length > 0) {
							const convertedFile = convertedFiles[0];
							const tempPath = path.join(tempDir, convertedFile);
							await this.moveVideoToAssets(parseInt(cardId, 10), tempPath);
							result.converted++;
						} else {
							this.logger.warn(
								`変換されたMP4ファイルが見つかりません: ${file}`,
							);
						}
					} finally {
						fs.rmSync(tempDir, { recursive: true, force: true });
					}
				} catch (error) {
					const errorMsg = `動画変換失敗 ${file}: ${error.message}`;
					this.logger.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		} catch (error) {
			const errorMsg = `動画変換処理でエラー: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	// ボイス配信機能
	async getCardVoiceFile(cardSeriesId: number) {
		const plainDir = this.globalConfig.getCachePlainPath();
		const voiceFilePath = path.join(plainDir, `vo_card_${cardSeriesId}.acb`);

		if (!fs.existsSync(voiceFilePath)) {
			return null;
		}

		return voiceFilePath;
	}

	// ボイス種別対応配信機能
	async getCardVoiceFileByType(cardSeriesId: number, voiceType: string) {
		const plainDir = this.globalConfig.getCachePlainPath();

		// First try to find specific voice type files
		const specificVoiceFile = path.join(
			plainDir,
			`vo_card_${cardSeriesId}_${voiceType}.acb`,
		);
		if (fs.existsSync(specificVoiceFile)) {
			return specificVoiceFile;
		}

		// If no specific file exists, check if the base ACB file exists
		// This will be handled by the conversion process to extract specific tracks
		const baseVoiceFile = path.join(plainDir, `vo_card_${cardSeriesId}.acb`);
		if (fs.existsSync(baseVoiceFile)) {
			return baseVoiceFile;
		}

		return null;
	}

	// Map voice types to ACB stream names and indexes
	private getVoiceStreamMapping(
		voiceType: string,
	): { streamName: string; streamIndex: number } | null {
		const mappings: {
			[key: string]: { streamName: string; streamIndex: number };
		} = {
			obtain: { streamName: "livestart", streamIndex: 1 },
			evolution1: { streamName: "message", streamIndex: 2 },
			evolution2: { streamName: "skill", streamIndex: 3 },
			evolution3: { streamName: "spappeal", streamIndex: 4 },
			evolution4: { streamName: "training", streamIndex: 7 },
			livestart: { streamName: "livestart", streamIndex: 1 },
			message: { streamName: "message", streamIndex: 2 },
			skill: { streamName: "skill", streamIndex: 3 },
			spappeal: { streamName: "spappeal", streamIndex: 4 },
			training: { streamName: "training", streamIndex: 7 },
		};

		return mappings[voiceType] || null;
	}

	// ACB音声変換機能
	async convertCardVoice(cardSeriesId: number, voiceType: string) {
		const result = {
			cardSeriesId,
			voiceType,
			success: false,
			outputPath: null as string | null,
			errors: [] as string[],
		};

		try {
			// ACBファイルを検索
			const acbFilePath = await this.getCardVoiceFileByType(
				cardSeriesId,
				voiceType,
			);
			if (!acbFilePath) {
				result.errors.push(
					`ACB file not found for card series ${cardSeriesId} type ${voiceType}`,
				);
				return result;
			}

			// 出力ディレクトリを作成
			const outputDir = this.globalConfig.getTempCardVoicesPath();
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			const outputPath = path.join(
				outputDir,
				`card_${cardSeriesId}_${voiceType}.wav`,
			);

			// 既に変換済みかチェック
			if (fs.existsSync(outputPath)) {
				this.logger.log(
					`Voice already converted: card_${cardSeriesId}_${voiceType}.wav`,
				);
				result.success = true;
				result.outputPath = outputPath;
				return result;
			}

			// Get the stream mapping for this voice type
			const streamMapping = this.getVoiceStreamMapping(voiceType);
			if (!streamMapping) {
				result.errors.push(
					`Unknown voice type: ${voiceType}. Available types: obtain, evolution1, evolution2, evolution3, evolution4, livestart, message, skill, spappeal, training`,
				);
				return result;
			}

			// Step 1: vgmstreamでACB→WAV変換（特定のストリームを指定）
			const vgmstreamPath = this.globalConfig.getVgmstreamPath();
			const acbBasename = path.basename(acbFilePath, ".acb");
			const wavOutputPath = path.join(
				outputDir,
				`${acbBasename}_${voiceType}.wav`,
			);

			const cmd = `"${vgmstreamPath}" -s ${streamMapping.streamIndex} -o "${wavOutputPath}" "${acbFilePath}"`;

			this.logger.log(
				`Converting ACB to WAV: ${acbFilePath} (stream ${streamMapping.streamIndex}: ${streamMapping.streamName})`,
			);
			this.logger.log(`Command: ${cmd}`);

			await new Promise<void>((resolve, reject) => {
				exec(
					cmd,
					{
						timeout: 60000,
						shell: "/bin/bash",
						env: {
							...process.env,
							PATH:
								this.globalConfig.getBinPath() +
								":/usr/bin:" +
								process.env.PATH,
						},
					},
					(error, stdout, stderr) => {
						if (error) {
							this.logger.error(`ACB conversion failed: ${error.message}`);
							if (stderr) this.logger.error(`stderr: ${stderr}`);
							if (stdout) this.logger.log(`stdout: ${stdout}`);
							reject(new Error(`Command failed: ${error.message}`));
							return;
						}

						this.logger.log(
							`ACB conversion completed: ${acbFilePath} (stream ${streamMapping.streamIndex})`,
						);
						if (stderr) {
							this.logger.warn(`Warning: ${stderr}`);
						}
						if (stdout) {
							this.logger.log(`vgmstream output: ${stdout}`);
						}

						resolve();
					},
				);
			});

			// vgmstreamで変換されたファイルをリネーム
			const wavPath = path.join(
				outputDir,
				`card_${cardSeriesId}_${voiceType}.wav`,
			);
			if (fs.existsSync(wavOutputPath)) {
				if (!fs.existsSync(wavPath)) {
					fs.renameSync(wavOutputPath, wavPath);
					this.logger.log(
						`Voice conversion completed: ${acbBasename}.wav -> card_${cardSeriesId}_${voiceType}.wav`,
					);
				}

				// Step 2: WAV→M4A変換
				const m4aPath = path.join(
					outputDir,
					`card_${cardSeriesId}_${voiceType}.m4a`,
				);

				if (!fs.existsSync(m4aPath)) {
					this.logger.log(`Converting WAV to M4A: ${wavPath}`);
					await this.wavToM4aService.convertOnly({
						sourceWavPath: wavPath,
						destinationPath: m4aPath,
						bitrateKbps: 128,
						cutoffKhz: null,
						loglevel: "error",
					});
				}

				// Move the M4A file to assets directory
				await this.moveVoiceToAssets(cardSeriesId, voiceType, m4aPath);

				result.success = true;
				result.outputPath = m4aPath; // M4Aファイルのパスを返す
			} else {
				result.errors.push(
					"vgmstream conversion failed - no WAV file generated",
				);
			}
		} catch (error) {
			const errorMsg = `Voice conversion error for card ${cardSeriesId} type ${voiceType}: ${error.message}`;
			this.logger.error(errorMsg);
			result.errors.push(errorMsg);
		}

		return result;
	}

	// 変換済み音声ファイル取得
	async getConvertedVoiceFile(cardSeriesId: number, voiceType: string) {
		// First check assets directory (final destination)
		const assetsVoicePath = this.globalConfig.getCardVoiceAssetsPath(
			cardSeriesId,
			voiceType,
		);
		if (fs.existsSync(assetsVoicePath)) {
			return assetsVoicePath;
		}

		// Fall back to temp directory for backward compatibility
		const voiceDir = this.globalConfig.getTempCardVoicesPath();

		// M4Aファイルを優先的に探す
		const m4aPath = path.join(
			voiceDir,
			`card_${cardSeriesId}_${voiceType}.m4a`,
		);
		if (fs.existsSync(m4aPath)) {
			return m4aPath;
		}

		// M4Aが存在しない場合はWAVファイルを探す
		const wavPath = path.join(
			voiceDir,
			`card_${cardSeriesId}_${voiceType}.wav`,
		);
		if (fs.existsSync(wavPath)) {
			return wavPath;
		}

		return null;
	}

	// 画像配信機能
	async getCardImageFile(cardId: number) {
		const assetsImagePath = this.getCardImageCachePath(cardId, "full");
		return fs.existsSync(assetsImagePath) ? assetsImagePath : null;
	}

	// 動画配信機能
	async getCardVideoFile(cardId: number) {
		const assetsVideoPath = this.getCardVideoCachePath(
			cardId,
			"home",
			"single",
		);
		return fs.existsSync(assetsVideoPath) ? assetsVideoPath : null;
	}

	// 利用可能なボイスファイルの一覧を取得
	async getAvailableVoiceFiles() {
		const plainDir = this.globalConfig.getCachePlainPath();

		try {
			const voiceFiles = fs
				.readdirSync(plainDir)
				.filter((file) => file.startsWith("vo_card_") && file.endsWith(".acb"))
				.map((file) => {
					const cardSeriesId = file.replace("vo_card_", "").replace(".acb", "");
					return parseInt(cardSeriesId);
				})
				.filter((id) => !Number.isNaN(id));

			return voiceFiles;
		} catch (error) {
			this.logger.error("ボイスファイル一覧の取得に失敗:", error);
			return [];
		}
	}

	// 個別カードのアセット抽出
	async extractSingleCard(cardId: number) {
		const result = {
			cardId,
			imageExtracted: false,
			videoExtracted: false,
			imagePath: null as string | null,
			videoPath: null as string | null,
			imageExists: false,
			videoExists: false,
			errors: [] as string[],
		};

		try {
			// 新形式は assets 直下に出力
			const extractDir = this.globalConfig.getCardIllustrationsAssetsPath();
			if (!fs.existsSync(extractDir)) {
				fs.mkdirSync(extractDir, { recursive: true });
			}

			// カード画像の抽出
			try {
				const imageResult = await this.extractSingleCardImage(cardId);
				result.imageExtracted = imageResult;
				result.imagePath = this.getCardImageCachePath(cardId, "full");
				result.imageExists = fs.existsSync(result.imagePath);
			} catch (error) {
				result.errors.push(`画像抽出エラー: ${error.message}`);
			}

			// カード動画の変換
			try {
				const videoResult = await this.extractSingleCardVideo(cardId);
				result.videoExtracted = videoResult;
				result.videoPath = this.getCardVideoCachePath(cardId, "home", "single");
				result.videoExists = fs.existsSync(result.videoPath);
			} catch (error) {
				result.errors.push(`動画変換エラー: ${error.message}`);
			}
		} catch (error) {
			this.logger.error(
				`個別カードアセット抽出エラー (Card ${cardId}):`,
				error,
			);
			result.errors.push(`システムエラー: ${error.message}`);
		}

		return result;
	}

	private async extractSingleCardImage(cardId: number): Promise<boolean> {
		const plainDir = this.globalConfig.getCachePlainPath();
		const assetBundleFile = `image_card_full_${cardId}.assetbundle`;
		const inputPath = path.join(plainDir, assetBundleFile);
		const outputPath = this.getCardImageCachePath(cardId, "full");

		// 既に存在する場合はスキップ
		if (fs.existsSync(outputPath)) {
			this.logger.log(`画像ファイル既に存在: card_${cardId}_full.png`);
			return true;
		}

		// assetbundleファイルが存在しない場合
		if (!fs.existsSync(inputPath)) {
			this.logger.warn(
				`assetbundleファイルが見つかりません: ${assetBundleFile}`,
			);
			return false;
		}

		// AssetStudioで抽出
		const ASSETSTUDIO_CLI = this.globalConfig.getAssetStudioCliPath();
		const tempDir = fs.mkdtempSync(
			path.join(this.globalConfig.getTempPath(), "card-image-single-"),
		);
		const cmd = `export DOTNET_ROOT=${this.globalConfig.getDotnetRootAssetStudio()} && "${ASSETSTUDIO_CLI}" "${inputPath}" -t tex2d -o "${tempDir}" --image-format png --log-level warning`;

		this.logger.log(`個別画像抽出実行 (Card ${cardId}): ${assetBundleFile}`);

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
					(error) => {
						if (error) {
							reject(new Error(`Command failed: ${error.message}`));
							return;
						}
						resolve();
					},
				);
			});

			const extractedFiles = fs
				.readdirSync(tempDir)
				.filter((f) => f.endsWith(".png"));

			if (extractedFiles.length > 0) {
				const extractedFile = extractedFiles[0];
				const tempPath = path.join(tempDir, extractedFile);
				await this.moveImageToAssets(cardId, tempPath);
				this.logger.log(
					`個別画像抽出完了: ${extractedFile} -> card_${cardId}_full.png`,
				);
				return true;
			}

			this.logger.warn(
				`PNG ファイルが抽出されませんでした: ${assetBundleFile}`,
			);
			return false;
		} catch (error) {
			this.logger.error(`個別画像抽出失敗 (Card ${cardId}): ${error.message}`);
			return false;
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}

	private async extractSingleCardVideo(cardId: number): Promise<boolean> {
		const plainDir = this.globalConfig.getCachePlainPath();
		const usmFile = `picture_ur_home_${cardId}.usm`;
		const inputPath = path.join(plainDir, usmFile);
		const outputPath = this.getCardVideoCachePath(cardId, "home", "single");

		// 既に存在する場合はスキップ
		if (fs.existsSync(outputPath)) {
			this.logger.log(`動画ファイル既に存在: card_${cardId}_home_single.mp4`);
			return true;
		}

		// USMファイルが存在しない場合
		if (!fs.existsSync(inputPath)) {
			this.logger.warn(`USMファイルが見つかりません: ${usmFile}`);
			return false;
		}

		// UsmToolkitで変換
		const usmToolkitDir = this.globalConfig.getUsmToolkitPath();
		const tempDir = fs.mkdtempSync(
			path.join(this.globalConfig.getTempPath(), "card-video-single-"),
		);
		const cmd = `cd "${usmToolkitDir}" && dotnet run -- convert "${inputPath}" -o "${tempDir}" -c`;

		this.logger.log(`個別動画変換実行 (Card ${cardId}): ${usmFile}`);

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
					(error) => {
						if (error) {
							reject(new Error(`Command failed: ${error.message}`));
							return;
						}
						resolve();
					},
				);
			});

			const convertedFiles = fs
				.readdirSync(tempDir)
				.filter((f) => f.endsWith(".mp4"));

			if (convertedFiles.length > 0) {
				const convertedFile = convertedFiles[0];
				const tempPath = path.join(tempDir, convertedFile);
				await this.moveVideoToAssets(cardId, tempPath);
				this.logger.log(
					`個別動画変換完了: ${convertedFile} -> card_${cardId}_home_single.mp4`,
				);
				return true;
			}

			this.logger.warn(`MP4ファイルが変換されませんでした: ${usmFile}`);
			return false;
		} catch (error) {
			this.logger.error(`個別動画変換失敗 (Card ${cardId}): ${error.message}`);
			return false;
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}

	// Helper method to move image files to assets directory
	private async moveImageToAssets(
		cardId: number,
		tempImagePath: string,
	): Promise<void> {
		try {
			const assetsDir = this.globalConfig.getCardIllustrationsAssetsPath();
			const assetsImagePath = this.getCardImageCachePath(cardId, "full");

			// Create assets directory if it doesn't exist
			if (!fs.existsSync(assetsDir)) {
				fs.mkdirSync(assetsDir, { recursive: true });
				this.logger.log(`Created assets directory: ${assetsDir}`);
			}

			// Only move if the file exists and the destination doesn't already exist
			if (
				fs.existsSync(tempImagePath) &&
				!fs.existsSync(assetsImagePath) &&
				tempImagePath !== assetsImagePath
			) {
				fs.copyFileSync(tempImagePath, assetsImagePath);
				this.logger.log(`Moved image to assets: ${assetsImagePath}`);

				// Clean up temporary file after successful copy
				this.cleanupTempFile(tempImagePath);
			}
		} catch (error) {
			this.logger.error(
				`Failed to move image to assets for card ${cardId}: ${error.message}`,
			);
		}
	}

	// Helper method to move video files to assets directory
	private async moveVideoToAssets(
		cardId: number,
		tempVideoPath: string,
	): Promise<void> {
		try {
			const assetsDir = this.globalConfig.getCardIllustrationsAssetsPath();
			const assetsVideoPath = this.getCardVideoCachePath(
				cardId,
				"home",
				"single",
			);

			// Create assets directory if it doesn't exist
			if (!fs.existsSync(assetsDir)) {
				fs.mkdirSync(assetsDir, { recursive: true });
				this.logger.log(`Created assets directory: ${assetsDir}`);
			}

			// Only move if the file exists and the destination doesn't already exist
			if (
				fs.existsSync(tempVideoPath) &&
				!fs.existsSync(assetsVideoPath) &&
				tempVideoPath !== assetsVideoPath
			) {
				fs.copyFileSync(tempVideoPath, assetsVideoPath);
				this.logger.log(`Moved video to assets: ${assetsVideoPath}`);

				// Clean up temporary file after successful copy
				this.cleanupTempFile(tempVideoPath);
			}
		} catch (error) {
			this.logger.error(
				`Failed to move video to assets for card ${cardId}: ${error.message}`,
			);
		}
	}

	// Helper method to move voice files to assets directory
	private async moveVoiceToAssets(
		cardSeriesId: number,
		voiceType: string,
		tempVoicePath: string,
	): Promise<void> {
		try {
			const assetsDir = this.globalConfig.getCardVoicesAssetsPath();
			const assetsVoicePath = this.globalConfig.getCardVoiceAssetsPath(
				cardSeriesId,
				voiceType,
			);

			// Create assets directory if it doesn't exist
			if (!fs.existsSync(assetsDir)) {
				fs.mkdirSync(assetsDir, { recursive: true });
				this.logger.log(`Created assets directory: ${assetsDir}`);
			}

			// Only move if the file exists and the destination doesn't already exist
			if (fs.existsSync(tempVoicePath) && !fs.existsSync(assetsVoicePath)) {
				fs.copyFileSync(tempVoicePath, assetsVoicePath);
				this.logger.log(`Moved voice to assets: ${assetsVoicePath}`);

				// Clean up temporary file after successful copy
				this.cleanupTempFile(tempVoicePath);

				// Also clean up temporary WAV file if it exists
				const wavPath = tempVoicePath.replace(".m4a", ".wav");
				if (fs.existsSync(wavPath)) {
					this.cleanupTempFile(wavPath);
				}
			}
		} catch (error) {
			this.logger.error(
				`Failed to move voice to assets for card ${cardSeriesId} type ${voiceType}: ${error.message}`,
			);
		}
	}

	// Helper method to safely delete temporary files
	private cleanupTempFile(filePath: string): void {
		try {
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
				this.logger.log(`Cleaned up temporary file: ${filePath}`);
			}
		} catch (error) {
			this.logger.warn(
				`Failed to clean up temporary file ${filePath}: ${error.message}`,
			);
		}
	}
}
