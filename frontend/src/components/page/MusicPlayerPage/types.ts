export interface AudioFile {
	id: string;
	filename: string;
	url: string;
	title?: string;
	artist?: string;
	album?: string;
	duration?: number;
	thumbnailUrl?: string;
	category?: "BGM" | "VOICE" | "SE";
	isLiked?: boolean;
	// YAML メタデータフィールド
	musicId?: number;
	orderId?: number;
	titleFurigana?: string;
	description?: string;
	generationsId?: number;
	unitId?: number;
	singerCharacterId?: string;
	songTime?: number;
	playTime?: number;
	releaseConditionText?: string;
}

export interface YamlMetadata {
	musicId: number;
	orderId: number;
	title: string;
	titleFurigana: string;
	jacketId: number;
	soundId: number;
	description: string;
	generationsId: number;
	unitId: number;
	centerCharacterId: number;
	singerCharacterId: string;
	supportCharacterId: string;
	musicType: number;
	experienceType: number;
	beatPointCoefficient: number;
	apIncrement: number;
	songTime: number;
	playTime: number;
	feverSectionNo: number;
	previewStartTime: number;
	previewEndTime: number;
	previewFadeInTime: number;
	previewFadeOutTime: number;
	releaseConditionType: number;
	releaseConditionDetail: number;
	releaseConditionText: string;
	startTime: string;
	endTime: string;
	maxAp: number;
	isVideoMode: number;
	videoBgId: number;
	songType: number;
	musicScoreReleaseTime: string;
}

export interface AudioPlayerProps {
	className?: string;
	onShowSearch?: () => void;
	onShowMetadata?: () => void;
}

export type RepeatMode = "off" | "all" | "one";
