export interface AudioConversionConfig {
	// パス設定
	finalACBDir: string;
	destinationPath: string;
	thumbnailDestPath: string;
	thumbnailPath: string;
	manifestPath: string;

	// ツールパス
	vgmstreamPath: string;
	assetStudioCLIPath: string;
	ffmpegPath: string;
	cwebpPath: string;

	// リトライ設定
	maxRetries: number;
	retryDelay: number; // ミリ秒
	commandTimeout: number; // ミリ秒

	// デバッグ設定
	debugMode: boolean;
}

export interface RetryableCommand {
	command: string;
	description: string;
	timeout?: number;
	captureOutput?: boolean;
}

export interface ThumbnailExtractionResult {
	success: boolean;
	thumbnailPath?: string;
	webpPath?: string;
	error?: string;
}

export interface MetadataFields {
	musicId: number;
	orderId?: number;
	title: string;
	titleFurigana?: string;
	jacketId?: number;
	soundId?: number;
	description: string;
	generationsId?: number;
	unitId?: number;
	centerCharacterId?: number;
	singerCharacterId?: string;
	supportCharacterId?: string;
	musicType?: number;
	experienceType?: number;
	beatPointCoefficient?: number;
	apIncrement?: number;
	songTime?: number;
	playTime?: number;
	feverSectionNo?: number;
	previewStartTime?: number;
	previewEndTime?: number;
	previewFadeInTime?: number;
	previewFadeOutTime?: number;
	releaseConditionType?: number;
	releaseConditionDetail?: number;
	releaseConditionText?: string;
	startTime?: string;
	endTime?: string;
	maxAp?: number;
	isVideoMode?: number;
	videoBgId?: number;
	songType?: number;
	musicScoreReleaseTime?: string;
}
