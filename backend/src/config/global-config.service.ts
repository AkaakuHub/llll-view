import * as path from "node:path";
import { Injectable } from "@nestjs/common";

@Injectable()
export class GlobalConfigService {
	private getRequiredEnv(name: string): string {
		const value = process.env[name];
		if (!value) {
			throw new Error(`Missing required environment variable: ${name}`);
		}
		return value;
	}

	// プロジェクト全体の基本パス
	getProjectRootPath(): string {
		return this.getRequiredEnv("PROJECT_ROOT_PATH");
	}

	getViewRootPath(): string {
		return this.getRequiredEnv("VIEW_ROOT_PATH");
	}

	getAssetsPath(): string {
		return path.join(this.getProjectRootPath(), "assets");
	}

	getHailstormHackPath(): string {
		return this.getSometoolDirPath();
	}

	getSometoolDirPath(): string {
		return path.join(this.getProjectRootPath(), "inspix-hailstorm");
	}

	getSometoolBinaryName(): string {
		return "hailstorm";
	}

	getSometoolBinaryPath(): string {
		return path.join(this.getSometoolDirPath(), this.getSometoolBinaryName());
	}

	getMasterdataPath(): string {
		return path.join(this.getSometoolDirPath(), "masterdata");
	}

	getMusicScoresYamlPath(): string {
		return path.join(this.getMasterdataPath(), "MusicScores.yaml");
	}

	getLiveTimelinesYamlPath(): string {
		return path.join(this.getMasterdataPath(), "LiveTimelinesEvol.yaml");
	}

	getCachePlainPath(): string {
		return path.join(this.getSometoolDirPath(), "cache", "plain");
	}

	getTempPath(): string {
		return path.join(this.getProjectRootPath(), "temp");
	}

	getToolsRootPath(): string {
		return this.getRequiredEnv("TOOLS_ROOT_PATH");
	}

	// 作業ディレクトリ
	getTempCardAssetsPath(): string {
		return path.join(this.getTempPath(), "card-assets");
	}

	getTempCardVoicesPath(): string {
		return path.join(this.getTempPath(), "card-voices");
	}

	// カードイラスト変換ツール
	getUsmToolkitPath(): string {
		return this.getRequiredEnv("USMT_TOOLKIT_PATH");
	}

	// システム環境設定
	getDotnetRootAssetStudio(): string {
		return this.getRequiredEnv("DOTNET_ROOT_ASSETSTUDIO");
	}

	getDotnetRootUsmToolkit(): string {
		return this.getRequiredEnv("DOTNET_ROOT_USMTOOLKIT");
	}

	getFfmpegPath(): string {
		return path.join(this.getBinPath(), "ffmpeg");
	}

	getAssetStudioCliPath(): string {
		return this.getRequiredEnv("ASSETSTUDIO_CLI_PATH");
	}

	getVgmstreamCliPath(): string {
		return this.getRequiredEnv("VGMSTREAM_PATH");
	}

	getVgmstreamPath(): string {
		return this.getRequiredEnv("VGMSTREAM_PATH");
	}

	getBinPath(): string {
		return path.join(this.getToolsRootPath(), "bin");
	}

	getCwebpPath(): string {
		return "cwebp";
	}

	getLogLevel(): string {
		return process.env.LOG_LEVEL || "info";
	}

	getFinalACBDir(): string {
		return path.join(this.getTempPath(), "bgm");
	}

	getStoryTempDir(): string {
		return path.join(this.getTempPath(), "story");
	}

	getSeTempDir(): string {
		return path.join(this.getTempPath(), "se");
	}

	getStoryAssetsPath(): string {
		return path.join(this.getAssetsPath(), "story", "voice");
	}

	getDestinationPath(): string {
		return path.join(this.getAssetsPath(), "bgm");
	}

	getThumbnailDestPath(): string {
		return path.join(this.getAssetsPath(), "bgm", "thumbnails");
	}

	getManifestPath(): string {
		return path.join(this.getMasterdataPath(), "Musics.yaml");
	}

	getCharactersYamlPath(): string {
		return path.join(this.getMasterdataPath(), "Characters.yaml");
	}

	getCardDatasYamlPath(): string {
		return path.join(this.getMasterdataPath(), "CardDatas.yaml");
	}

	getCardSkillsYamlPath(): string {
		return path.join(this.getMasterdataPath(), "CardSkills.yaml");
	}

	getCardLevelsYamlPath(): string {
		return path.join(this.getMasterdataPath(), "CardLevels.yaml");
	}

	getCenterSkillsYamlPath(): string {
		return path.join(this.getMasterdataPath(), "CenterSkills.yaml");
	}

	getCardImagePath(cardId: number): string {
		return `${this.getTempCardAssetsPath()}/images/card_${cardId}.png`;
	}

	getCardVideoPath(cardId: number): string {
		return `${this.getTempCardAssetsPath()}/videos/card_${cardId}.mp4`;
	}

	// Assets directory paths (final destination)
	getCardIllustrationsAssetsPath(): string {
		return `${this.getAssetsPath()}/card-illustrations`;
	}

	getCardVoicesAssetsPath(): string {
		return `${this.getAssetsPath()}/card-voices`;
	}

	// Final asset file paths
	getCardImageAssetsPath(cardId: number): string {
		return `${this.getCardIllustrationsAssetsPath()}/card_${cardId}.png`;
	}

	getCardVideoAssetsPath(cardId: number): string {
		return `${this.getCardIllustrationsAssetsPath()}/card_${cardId}.mp4`;
	}

	getCardVoiceAssetsPath(cardSeriesId: number, voiceType: string): string {
		return `${this.getCardVoicesAssetsPath()}/card_${cardSeriesId}_${voiceType}.m4a`;
	}
}
