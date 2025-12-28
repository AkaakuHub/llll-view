import { ArrowLeft, Eye, Image, RefreshCw, Star, Volume2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MusicDataPanel from "../components/page/CardDetailPage/MusicDataPanel";
import PerformancePanel from "../components/page/CardDetailPage/PerformancePanel";
import SeriesCardsPanel from "../components/page/CardDetailPage/SeriesCardsPanel";
import type { VoiceFile } from "../components/page/CardDetailPage/types";
import VideoPanel from "../components/page/CardDetailPage/VideoPanel";
import { VoiceMiniPlayer } from "../components/page/CardDetailPage/VoiceMiniPlayer";
import VoiceTranscriptPanel from "../components/page/CardDetailPage/VoiceTranscriptPanel";
import Button from "../components/ui/Button";
import { VITE_BACKEND_URL } from "../lib/const";
import { fetcherTyped } from "../lib/fetcher";

interface Character {
	id: number;
	nameLast?: string;
	nameFirst?: string;
	latinAlphabetNameLast?: string;
	latinAlphabetNameFirst?: string;
	themeColor?: string;
	introduction?: string;
	styleType?: number;
}

interface CardAssets {
	images: {
		full: boolean;
		half: boolean;
		middleVertical: boolean;
	};
	videos: {
		home: boolean;
	};
	seriesVideos: {
		get: { in: boolean; loop: boolean };
		training: { in: boolean; loop: boolean };
	};
	voice: boolean;
}

interface SeriesCard {
	id: number;
	cardSeriesId: number;
	characterId: number;
	name?: string;
	rarity: number;
	evolveTimes: number;
	style: number;
	mood: number;
	assets: CardAssets;
}

interface CardDetail {
	id: number;
	cardSeriesId: number;
	characterId: number;
	name?: string;
	description?: string;
	rarity: number;
	evolveTimes: number;
	style: number;
	mood: number;
	initialSmile?: number;
	initialPure?: number;
	initialCool?: number;
	initialMental?: number;
	maxSmile?: number;
	maxPure?: number;
	maxCool?: number;
	maxMental?: number;
	beatPoint?: number;
	orderId?: number;
	character: Character;
	assets: CardAssets;
	seriesCards: SeriesCard[];
}

interface VideoFile {
	type: "home" | "get-in" | "get-loop" | "training-in" | "training-loop";
	label: string;
	url: string;
	available: boolean;
	converted?: boolean;
}

interface PerformanceData {
	cardSkills?: Array<{
		id: string;
		skillLevel: number;
		skillCost?: number;
		description?: string;
		cardSkillSeriesId: string;
	}>;
	cardLevels?: Array<{
		id: number;
		cardLevel: number;
		experience: number;
		cumulativeExperience: number;
	}>;
	rarity: number;
}

interface MusicData {
	musicScores?: Array<{
		id: number;
		normalLevel?: number;
		hardLevel?: number;
		expertLevel?: number;
		masterLevel?: number;
		normalMaxCombo?: number;
		hardMaxCombo?: number;
		expertMaxCombo?: number;
		masterMaxCombo?: number;
		shouldVerifyNotesCount?: number;
		scoreRewardSeriesId?: number;
	}>;
	liveTimelines?: Array<{
		id: number;
		label?: string;
		musicId?: number;
		locationsId?: number;
		freeId?: number;
		nextId?: number;
		movieIds?: string;
	}>;
}

const CardDetailPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [card, setCard] = useState<CardDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [actionMessage, setActionMessage] = useState("");
	const [syncing, setSyncing] = useState(false);
	const [extracting, setExtracting] = useState(false);
	const [voiceFiles, setVoiceFiles] = useState<VoiceFile[]>([]);
	const [currentVoiceType, setCurrentVoiceType] = useState<string | null>(null);
	const [videoFiles, setVideoFiles] = useState<VideoFile[]>([]);
	const [currentVideoType, setCurrentVideoType] = useState<string | null>(null);
	const [videoSrc, setVideoSrc] = useState<string | null>(null);
	const [videoLoading, setVideoLoading] = useState(false);
	const [videoError, setVideoError] = useState<string | null>(null);
	const [pendingPlay, setPendingPlay] = useState(false);
	const [videoDownloading, setVideoDownloading] = useState(false);
	const [performanceData, setPerformanceData] =
		useState<PerformanceData | null>(null);
	const [musicData, setMusicData] = useState<MusicData | null>(null);
	const [performanceLoading, setPerformanceLoading] = useState(false);
	const [musicLoading, setMusicLoading] = useState(false);
	const [skillIndex, setSkillIndex] = useState(0);
	const [levelIndex, setLevelIndex] = useState(0);
	const [scoreIndex, setScoreIndex] = useState(0);
	const [timelineIndex, setTimelineIndex] = useState(0);
	const currentVoiceFile = useMemo(
		() => voiceFiles.find((vf) => vf.type === currentVoiceType) ?? null,
		[voiceFiles, currentVoiceType],
	);

	const loadCard = useCallback(async () => {
		if (!id) return;
		try {
			setLoading(true);
			setError(null);
			const response = await fetcherTyped<CardDetail>(
				`/card-illustrations/${id}`,
			);
			setCard(response);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "カードの取得に失敗しました",
			);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		loadCard();
	}, [loadCard]);

	useEffect(() => {
		if (!card) return;
		const seriesId = card.cardSeriesId;
		const files: VoiceFile[] = [
			{
				type: "obtain",
				label: "Obtain",
				filename: `card_${seriesId}_obtain.m4a`,
				url: `/card-illustrations/converted-voice/${seriesId}/obtain`,
			},
			{
				type: "evolution1",
				label: "Evolution 1",
				filename: `card_${seriesId}_evolution1.m4a`,
				url: `/card-illustrations/converted-voice/${seriesId}/evolution1`,
			},
			{
				type: "evolution2",
				label: "Evolution 2",
				filename: `card_${seriesId}_evolution2.m4a`,
				url: `/card-illustrations/converted-voice/${seriesId}/evolution2`,
			},
			{
				type: "evolution3",
				label: "Evolution 3",
				filename: `card_${seriesId}_evolution3.m4a`,
				url: `/card-illustrations/converted-voice/${seriesId}/evolution3`,
			},
			{
				type: "evolution4",
				label: "Evolution 4",
				filename: `card_${seriesId}_evolution4.m4a`,
				url: `/card-illustrations/converted-voice/${seriesId}/evolution4`,
			},
		];
		setVoiceFiles(files);
		setCurrentVoiceType((prev) => prev ?? "obtain");

		const checkConvertedVoices = async () => {
			try {
				const checked = await Promise.all(
					files.map(async (vf) => {
						try {
							const res = await fetch(`${VITE_BACKEND_URL}${vf.url}`, {
								method: "GET",
								headers: { Range: "bytes=0-0" },
							});
							return { ...vf, converted: res.ok };
						} catch {
							return { ...vf, converted: false };
						}
					}),
				);
				setVoiceFiles(checked);
			} catch {
				// ignore
			}
		};

		void checkConvertedVoices();
	}, [card]);

	const loadPerformanceData = useCallback(async () => {
		if (!id) return;
		try {
			setPerformanceLoading(true);
			const data = await fetcherTyped<PerformanceData>(
				`/card-illustrations/${id}/performance`,
			);
			setPerformanceData(data);
			setSkillIndex(0);
			setLevelIndex(0);
		} catch {
			setPerformanceData(null);
			setSkillIndex(0);
			setLevelIndex(0);
		} finally {
			setPerformanceLoading(false);
		}
	}, [id]);

	const loadMusicData = useCallback(async () => {
		if (!card?.beatPoint) return;
		try {
			setMusicLoading(true);
			const data = await fetcherTyped<MusicData>(
				`/card-illustrations/music-data/${card.beatPoint}`,
			);
			setMusicData(data);
			setScoreIndex(0);
			setTimelineIndex(0);
		} catch {
			setMusicData(null);
			setScoreIndex(0);
			setTimelineIndex(0);
		} finally {
			setMusicLoading(false);
		}
	}, [card?.beatPoint]);

	useEffect(() => {
		void loadPerformanceData();
	}, [loadPerformanceData]);

	useEffect(() => {
		void loadMusicData();
	}, [loadMusicData]);

	const extractSingleAsset = async () => {
		if (!card) return;
		try {
			setExtracting(true);
			setActionMessage(`Extracting assets for card ${card.id}...`);
			const response = await fetcherTyped<{
				cardId: number;
				imageExtracted: boolean;
				videoExtracted: boolean;
				errors: string[];
			}>(`/card-illustrations/extract-single/${card.id}`, {
				method: "POST",
			});
			if (response.errors.length > 0) {
				setActionMessage(
					`Extraction completed with warnings: ${response.errors.join(", ")}`,
				);
			} else {
				setActionMessage(
					`Extraction completed. Image: ${response.imageExtracted ? "✓" : "✗"}, Video: ${response.videoExtracted ? "✓" : "✗"}`,
				);
			}
			await loadCard();
		} catch (err) {
			setActionMessage(
				`Extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setExtracting(false);
		}
	};

	const syncCardSeries = async () => {
		if (!card) return;
		try {
			setSyncing(true);
			setActionMessage(`Syncing card series ${card.cardSeriesId}...`);
			await fetcherTyped(
				`/card-illustrations/sync-card-series/${card.cardSeriesId}`,
				{
					method: "POST",
				},
			);
			setActionMessage("Card series sync completed.");
			await loadCard();
			await loadPerformanceData();
			await loadMusicData();
		} catch (err) {
			setActionMessage(
				`Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setSyncing(false);
		}
	};

	const convertVoice = async (voiceType: string) => {
		if (!card) return;
		try {
			setActionMessage(`Converting voice ${voiceType}...`);
			await fetcherTyped(
				`/card-illustrations/convert-voice/${card.cardSeriesId}/${voiceType}`,
				{ method: "POST" },
			);
			setActionMessage(`Voice ${voiceType} conversion completed.`);
			setVoiceFiles((prev) =>
				prev.map((vf) =>
					vf.type === voiceType ? { ...vf, converted: true } : vf,
				),
			);
		} catch (err) {
			setActionMessage(
				`Voice conversion failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
	};

	useEffect(() => {
		if (!card) return;
		const files: VideoFile[] = [
			{
				type: "home",
				label: "Home",
				url: `/card-illustrations/video/home/${card.id}`,
				available: !!card.assets?.videos.home,
			},
			{
				type: "get-in",
				label: "Get (in)",
				url: `/card-illustrations/video/series/${card.cardSeriesId}?type=get&phase=in`,
				available: !!card.assets?.seriesVideos.get.in,
			},
			{
				type: "get-loop",
				label: "Get (loop)",
				url: `/card-illustrations/video/series/${card.cardSeriesId}?type=get&phase=loop`,
				available: !!card.assets?.seriesVideos.get.loop,
			},
			{
				type: "training-in",
				label: "Training (in)",
				url: `/card-illustrations/video/series/${card.cardSeriesId}?type=training&phase=in`,
				available: !!card.assets?.seriesVideos.training.in,
			},
			{
				type: "training-loop",
				label: "Training (loop)",
				url: `/card-illustrations/video/series/${card.cardSeriesId}?type=training&phase=loop`,
				available: !!card.assets?.seriesVideos.training.loop,
			},
		];
		setVideoFiles(files);
		const first = files.find((f) => f.available);
		setCurrentVideoType((prev) => prev ?? first?.type ?? null);
		setVideoSrc(null);
		setVideoError(null);
		setVideoLoading(false);
		setPendingPlay(false);
	}, [card]);

	const currentVideoFile = useMemo(
		() => videoFiles.find((vf) => vf.type === currentVideoType) || null,
		[videoFiles, currentVideoType],
	);

	const handlePlayVideo = () => {
		if (!currentVideoFile) return;
		setVideoError(null);
		setVideoLoading(true);
		setVideoSrc(`${VITE_BACKEND_URL}${currentVideoFile.url}`);
		setPendingPlay(true);
	};

	const handleDownloadVideo = async () => {
		if (!currentVideoFile || !card) return;
		try {
			setVideoDownloading(true);
			const res = await fetch(`${VITE_BACKEND_URL}${currentVideoFile.url}`);
			if (!res.ok) throw new Error("Failed to download video");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `card_${card.cardSeriesId}_${currentVideoFile.type}.mp4`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch {
			setVideoError("Failed to download video.");
		} finally {
			setVideoDownloading(false);
		}
	};

	const preferredImageType = useMemo(() => {
		if (!card) return "full";
		if (card.assets?.images.full) return "full";
		if (card.assets?.images.middleVertical) return "middle_vertical";
		if (card.assets?.images.half) return "half";
		return "full";
	}, [card]);

	const getImageUrl = (targetId: number, type: string) =>
		`${VITE_BACKEND_URL}/card-illustrations/image/${targetId}?type=${type}`;

	const hasAnyImage = (assets?: CardAssets) =>
		!!assets &&
		(assets.images.full || assets.images.middleVertical || assets.images.half);

	const getRarityColor = (rarity: number) => {
		switch (rarity) {
			case 3:
				return "text-saya";
			case 4:
				return "text-hime";
			case 5:
				return "text-suzu";
			case 7:
				return "text-tuzu";
			case 8:
				return "text-ruri";
			case 9:
				return "text-sera";
			default:
				return "text-megu";
		}
	};

	const getRarityStars = (rarity: number) => {
		const stars = Array.from({ length: rarity }, (_, index) => index + 1);
		return stars.map((star) => (
			<Star
				key={`star-${rarity}-${star}`}
				className={`h-4 w-4 ${getRarityColor(rarity)} fill-current stroke-paper stroke-[1.25] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`}
			/>
		));
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-20 w-20 border-b-2 border-saya"></div>
			</div>
		);
	}

	if (error || !card) {
		return (
			<div className="p-6">
				<div className="bg-tuzu/20 border border-tuzu rounded-lg p-4 text-tuzu">
					<p>{error || "Card not found"}</p>
					<Button
						onClick={() => navigate("/cards")}
						className="mt-4"
						tone="saya"
					>
						Back to Cards
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Button
							onClick={() => navigate("/cards")}
							variant="soft"
							tone="megu"
							className="cursor-pointer"
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>
						<div>
							<h1 className="text-2xl font-semibold text-text">
								{card.name || `Card ${card.id}`}
							</h1>
							<p className="text-sm text-muted">
								{card.character.nameLast} {card.character.nameFirst}
							</p>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-md bg-surface/80 px-2 py-1 text-xs text-muted">
							ID {card.id}
						</span>
						<span className="rounded-md bg-surface/80 px-2 py-1 text-xs text-muted">
							Series {card.cardSeriesId}
						</span>
						<span className="rounded-md bg-surface/80 px-2 py-1 text-xs text-muted">
							Rarity {card.rarity}
						</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						onClick={syncCardSeries}
						disabled={syncing}
						tone="hime"
						size="sm"
						className="cursor-pointer"
					>
						<RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
						Sync Series
					</Button>
					<Button
						onClick={extractSingleAsset}
						disabled={extracting}
						tone="kozu"
						size="sm"
						className="cursor-pointer"
					>
						<Image className={`h-4 w-4 ${extracting ? "animate-spin" : ""}`} />
						Extract Assets
					</Button>
				</div>
			</div>

			{actionMessage && (
				<div className="p-3 border border-border rounded-lg bg-surface text-sm text-muted">
					{actionMessage}
				</div>
			)}

			<div className="space-y-6">
				<div className="rounded-2xl border border-border bg-surface overflow-hidden">
					<div className="relative w-full aspect-[16/9]">
						{hasAnyImage(card.assets) ? (
							<img
								src={getImageUrl(card.id, preferredImageType)}
								alt={card.name || `Card ${card.id}`}
								className="absolute inset-0 h-full w-full object-cover"
							/>
						) : (
							<div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
								<Eye className="h-8 w-8 mb-2" />
								<span className="text-xs">No image in raw data</span>
							</div>
						)}
						<div className="absolute left-4 top-4 flex items-center gap-1">
							{getRarityStars(card.rarity)}
						</div>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface/95">
						<div className="min-w-0">
							<h2 className="text-lg font-semibold text-text line-clamp-1">
								{card.name || `Card ${card.id}`}
							</h2>
							<p className="text-sm text-muted line-clamp-1">
								{card.character.nameLast} {card.character.nameFirst}
							</p>
							{card.description && (
								<p className="text-xs text-muted line-clamp-2">
									{card.description}
								</p>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted">
							<span className="rounded-md bg-surface/80 px-2 py-1">
								Style {card.style}
							</span>
							<span className="rounded-md bg-surface/80 px-2 py-1">
								Mood {card.mood}
							</span>
							<span className="rounded-md bg-surface/80 px-2 py-1">
								Stage {card.evolveTimes}
							</span>
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<SeriesCardsPanel
						seriesCards={card.seriesCards ?? []}
						getImageUrl={getImageUrl}
						hasAnyImage={(assets) => hasAnyImage(assets as CardAssets)}
						onSelectCard={(cardId) => navigate(`/card/${cardId}`)}
					/>

					<PerformancePanel
						beatPoint={card.beatPoint ?? undefined}
						orderId={card.orderId ?? undefined}
						loading={performanceLoading}
						data={performanceData}
						skillIndex={skillIndex}
						levelIndex={levelIndex}
						setSkillIndex={setSkillIndex}
						setLevelIndex={setLevelIndex}
					/>

					<MusicDataPanel
						loading={musicLoading}
						data={musicData}
						scoreIndex={scoreIndex}
						timelineIndex={timelineIndex}
						setScoreIndex={setScoreIndex}
						setTimelineIndex={setTimelineIndex}
					/>

					<VideoPanel
						videoFiles={videoFiles}
						currentVideoType={currentVideoType}
						setCurrentVideoType={setCurrentVideoType}
						currentVideoFile={currentVideoFile}
						videoSrc={videoSrc}
						pendingPlay={pendingPlay}
						setPendingPlay={setPendingPlay}
						videoLoading={videoLoading}
						videoDownloading={videoDownloading}
						videoError={videoError}
						setVideoError={setVideoError}
						setVideoLoading={setVideoLoading}
						handlePlayVideo={handlePlayVideo}
						handleDownloadVideo={handleDownloadVideo}
					/>

					<div className="bg-surface border border-border rounded-xl p-4">
						<h2 className="text-lg font-semibold text-text mb-3">Voice</h2>
						{card.assets?.voice ? (
							<>
								<div className="flex flex-wrap items-center gap-2">
									{voiceFiles.map((voiceFile) => (
										<Button
											key={voiceFile.type}
											onClick={() => setCurrentVoiceType(voiceFile.type)}
											variant={
												currentVoiceType === voiceFile.type ? "solid" : "soft"
											}
											tone="saya"
											size="sm"
											className="cursor-pointer"
											title={`Select ${voiceFile.label}`}
										>
											<Volume2 className="h-4 w-4" />
											{voiceFile.label}
										</Button>
									))}
								</div>
								<div className="mt-4">
									<VoiceMiniPlayer
										voiceFiles={voiceFiles}
										currentVoiceType={currentVoiceType}
										onVoiceChange={setCurrentVoiceType}
										onConvert={(voiceFile) => convertVoice(voiceFile.type)}
									/>
								</div>
								<div className="mt-4">
									<VoiceTranscriptPanel
										currentVoiceFile={currentVoiceFile}
										onConvert={(voiceFile) => convertVoice(voiceFile.type)}
									/>
								</div>
							</>
						) : (
							<p className="text-sm text-muted">No voice in raw data</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default CardDetailPage;
