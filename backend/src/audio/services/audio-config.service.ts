import { Injectable } from "@nestjs/common";
import { GlobalConfigService } from "../../config/global-config.service";
import type { AudioConversionConfig } from "../interfaces/audio-config.interface";

@Injectable()
export class AudioConfigService {
	private config: AudioConversionConfig;

	constructor(private globalConfig: GlobalConfigService) {
		this.config = this.loadConfig();
	}

	private loadConfig(): AudioConversionConfig {
		return {
			// パス設定（GlobalConfigServiceで組み立て）
			finalACBDir: this.globalConfig.getFinalACBDir(),
			destinationPath: this.globalConfig.getDestinationPath(),
			thumbnailDestPath: this.globalConfig.getThumbnailDestPath(),
			thumbnailPath: this.globalConfig.getCachePlainPath(),
			manifestPath: this.globalConfig.getManifestPath(),

			// ツールパス（env + GlobalConfigServiceで組み立て）
			vgmstreamPath: this.globalConfig.getVgmstreamPath(),
			assetStudioCLIPath: this.globalConfig.getAssetStudioCliPath(),
			ffmpegPath: this.globalConfig.getFfmpegPath(),
			cwebpPath: this.globalConfig.getCwebpPath(),

			// リトライ設定
			maxRetries: 3,
			retryDelay: 2000,
			commandTimeout: 120000,

			// デバッグ設定
			debugMode: this.globalConfig.getLogLevel().toLowerCase() === "debug",
		};
	}

	getConfig(): AudioConversionConfig {
		return this.config;
	}

	// 各種パスのゲッター
	getVgmstreamPath(): string {
		return this.config.vgmstreamPath;
	}

	getAssetStudioPath(): string {
		return this.config.assetStudioCLIPath;
	}

	getFfmpegPath(): string {
		return this.config.ffmpegPath;
	}

	getCwebpPath(): string {
		return this.config.cwebpPath;
	}

	getManifestPath(): string {
		return this.config.manifestPath;
	}

	getThumbnailPath(): string {
		return this.config.thumbnailPath;
	}

	getDestinationPath(): string {
		return this.config.destinationPath;
	}

	getThumbnailDestPath(): string {
		return this.config.thumbnailDestPath;
	}

	getFinalACBDir(): string {
		return this.config.finalACBDir;
	}

	getCachePlainPath(): string {
		return this.globalConfig.getCachePlainPath();
	}

	getStoryTempDir(): string {
		return this.globalConfig.getStoryTempDir();
	}

	getSeTempDir(): string {
		return this.globalConfig.getSeTempDir();
	}

	getStoryAssetsPath(): string {
		return this.globalConfig.getStoryAssetsPath();
	}

	getAssetsPath(): string {
		return this.globalConfig.getAssetsPath();
	}

	// リトライ設定
	getRetryConfig() {
		return {
			maxRetries: this.config.maxRetries,
			retryDelay: this.config.retryDelay,
			commandTimeout: this.config.commandTimeout,
		};
	}

	// デバッグ設定
	isDebugMode(): boolean {
		return this.config.debugMode;
	}

	// システム環境設定
	getDotnetRootAssetStudio(): string {
		return this.globalConfig.getDotnetRootAssetStudio();
	}

	getDotnetRootUsmToolkit(): string {
		return this.globalConfig.getDotnetRootUsmToolkit();
	}

	getLogLevel(): string {
		return this.globalConfig.getLogLevel();
	}
}
