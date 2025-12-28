import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VITE_BACKEND_URL } from "../../../lib/const";
import { fetcher } from "../../../lib/fetcher";
import {
	useAutoAdvanceCleanup,
	useAutoPlayRefs,
	useBackgroundAvailability,
	useBgmAvailability,
	useLastBackground,
	useSeAvailability,
	useStoryInitialLoad,
	useStorySseProgress,
} from "./hooks";
import LatestStoriesSection from "./LatestStoriesSection";
import SelectedStoryDetailsSection from "./SelectedStoryDetailsSection";
import StoryHeader from "./StoryHeader";
import StoryResultsSection from "./StoryResultsSection";
import StorySearchSection from "./StorySearchSection";
import type {
	DetailedStoryResult,
	RealtimeProgress,
	StoryResult,
} from "./types";

type SeEvent = {
	action: "play" | "stop";
	name: string;
	volume: number;
};

export default function StoryViewer() {
	const [storySearchQuery, setStorySearchQuery] = useState<string>("");
	const [storyResults, setStoryResults] = useState<StoryResult[]>([]);
	const [selectedStory, setSelectedStory] =
		useState<DetailedStoryResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [searchMode, setSearchMode] = useState<"story" | "dialogue">(
		"dialogue",
	);
	const [indexing, setIndexing] = useState(false);
	const [isConverting, setIsConverting] = useState(false);
	const [isConvertingBackgrounds, setIsConvertingBackgrounds] = useState(false);
	const [backgroundConversionMessage, setBackgroundConversionMessage] =
		useState<string>("");
	const [backgroundCheckToken, setBackgroundCheckToken] = useState(0);
	const [availableBackgrounds, setAvailableBackgrounds] = useState<Set<string>>(
		new Set(),
	);
	const [isConvertingBgm, setIsConvertingBgm] = useState(false);
	const [isRevertingBgm, setIsRevertingBgm] = useState(false);
	const [bgmConversionMessage, setBgmConversionMessage] = useState<string>("");
	const [bgmReconversionMessage, setBgmReconversionMessage] =
		useState<string>("");
	const [bgmCheckToken, setBgmCheckToken] = useState(0);
	const [availableBgms, setAvailableBgms] = useState<Set<string>>(new Set());
	const [isConvertingSe, setIsConvertingSe] = useState(false);
	const [seConversionMessage, setSeConversionMessage] = useState<string>("");
	const [seCheckToken, setSeCheckToken] = useState(0);
	const [availableSes, setAvailableSes] = useState<Set<string>>(new Set());
	const [playingSe, setPlayingSe] = useState<string | null>(null);
	const [currentBgmName, setCurrentBgmName] = useState<string | null>(null);
	const [assetReloadToken, setAssetReloadToken] = useState(0);
	const [voiceVolume, setVoiceVolume] = useState(1);
	const [bgmVolume, setBgmVolume] = useState(0.6);
	const [seVolume, setSeVolume] = useState(0.8);
	const [lastBackground, setLastBackground] = useState<string | null>(null);
	const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);
	const [availableVoices, setAvailableVoices] = useState<Set<string>>(
		new Set(),
	);
	const [realtimeProgress, setRealtimeProgress] =
		useState<RealtimeProgress | null>(null);
	const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
	const [autoPlayIndex, setAutoPlayIndex] = useState<number | null>(null);
	const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
	const [latestStories, setLatestStories] = useState<StoryResult[]>([]);
	const [latestOffset, setLatestOffset] = useState(0);
	const [latestHasMore, setLatestHasMore] = useState(true);
	const [latestLoading, setLatestLoading] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
	const [contentTab, setContentTab] = useState<"parsed" | "raw">("parsed");
	const autoPlayEnabledRef = useRef(false);
	const autoPlayIndexRef = useRef<number | null>(null);
	const autoAdvanceTimerRef = useRef<number | null>(null);
	const currentBgmNameRef = useRef<string | null>(null);
	const autoPlayListRef = useRef<Array<{ voiceFile: string; index: number }>>(
		[],
	);
	const autoPlayStoryIdRef = useRef<number | null>(null);
	const pendingDialogueIndexRef = useRef<number | null>(null);
	const searchRequestIdRef = useRef(0);

	const handleStorySearch = async () => {
		const query = storySearchQuery.trim();
		if (!query) {
			setStoryResults([]);
			return;
		}

		searchRequestIdRef.current += 1;
		const requestId = searchRequestIdRef.current;
		setLoading(true);
		try {
			const response =
				searchMode === "dialogue"
					? await fetcher(
							`/database/stories/search-dialogue?q=${encodeURIComponent(query)}&limit=50`,
						)
					: await fetcher(
							`/database/stories/search?q=${encodeURIComponent(query)}&limit=50`,
						);
			const result = await response.json();
			if (searchRequestIdRef.current === requestId) {
				setStoryResults(result.results || []);
			}
		} catch (error) {
			console.error("Failed to search stories:", error);
			if (searchRequestIdRef.current === requestId) {
				setStoryResults([]);
			}
		} finally {
			if (searchRequestIdRef.current === requestId) {
				setLoading(false);
			}
		}
	};

	const handleDialogueIndex = async () => {
		setIndexing(true);
		try {
			await fetcher("/database/stories/index", { method: "POST" });
		} catch (error) {
			console.error("Failed to index dialogues:", error);
		} finally {
			setIndexing(false);
		}
	};

	const fetchLatestStories = async (reset = false) => {
		setLatestLoading(true);
		const limit = 30;
		const offset = reset ? 0 : latestOffset;
		try {
			const response = await fetcher(
				`/database/stories/latest?limit=${limit}&offset=${offset}`,
			);
			const result = await response.json();
			const nextStories = result.results || [];
			setLatestStories((prev) =>
				reset ? nextStories : [...prev, ...nextStories],
			);
			const nextOffset = offset + nextStories.length;
			setLatestOffset(nextOffset);
			setLatestHasMore(nextOffset < (result.total || 0));
		} catch (error) {
			console.error("Failed to load latest stories:", error);
		} finally {
			setLatestLoading(false);
		}
	};

	const formatStoryTime = (value?: string) => {
		if (!value) return "-";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleString("en-US");
	};

	const handleStorySelect = async (story: StoryResult) => {
		setLoading(true);
		stopAudio();
		stopBgm();
		pendingDialogueIndexRef.current =
			typeof story.dialogueIndex === "number" ? story.dialogueIndex : null;
		try {
			const response = await fetcher(`/database/stories/${story.Id}`);
			const result = await response.json();

			if (result.found) {
				setSelectedStory(result);
				setContentTab("parsed");
				setAutoPlayEnabled(false);
				setAutoPlayIndex(null);
				autoPlayIndexRef.current = null;
				setCurrentDialogueIndex(pendingDialogueIndexRef.current ?? 0);
				pendingDialogueIndexRef.current = null;
				setAvailableBackgrounds(new Set());
				setBackgroundCheckToken((prev) => prev + 1);
				setBgmConversionMessage("");
				setAvailableBgms(new Set());
				setBgmCheckToken((prev) => prev + 1);
				setSeConversionMessage("");
				setAvailableSes(new Set());
				setSeCheckToken((prev) => prev + 1);
				// ストーリーボイスの存在確認
				if (result.story?.ScriptId) {
					await checkVoiceAvailability(result.story.ScriptId);
				} else {
					setAvailableVoices(new Set());
				}
			} else {
				console.error("Story not found:", result.error);
				setSelectedStory(null);
			}
		} catch (error) {
			console.error("Failed to load story:", error);
			setSelectedStory(null);
		} finally {
			setLoading(false);
		}
	};

	const requiredVoiceFiles = useMemo(() => {
		const set = new Set<string>();
		const dialogues = selectedStory?.storyText?.content?.dialogue || [];
		for (const dialogue of dialogues) {
			if (dialogue.voiceFile) {
				set.add(dialogue.voiceFile);
			}
		}
		return set;
	}, [selectedStory]);

	const playableVoices = useMemo(() => {
		const dialogues = selectedStory?.storyText?.content?.dialogue || [];
		const list: Array<{ voiceFile: string; index: number }> = [];
		for (let i = 0; i < dialogues.length; i++) {
			const voiceFile = dialogues[i].voiceFile;
			if (voiceFile && availableVoices.has(voiceFile)) {
				list.push({ voiceFile, index: i });
			}
		}
		autoPlayListRef.current = list;
		autoPlayStoryIdRef.current = selectedStory?.story?.ScriptId ?? null;
		return list;
	}, [selectedStory, availableVoices]);

	const currentBackground = useMemo(() => {
		const dialogues = selectedStory?.storyText?.content?.dialogue || [];
		if (dialogues.length === 0) return null;
		const index = Math.min(
			Math.max(currentDialogueIndex, 0),
			dialogues.length - 1,
		);
		return dialogues[index]?.background ?? null;
	}, [selectedStory, currentDialogueIndex]);

	const displayedBackground = currentBackground ?? lastBackground;

	const currentBackgroundUrl = useMemo(() => {
		if (!displayedBackground) return null;
		return `${VITE_BACKEND_URL}/assets/story/backgrounds/${displayedBackground}.png?v=${assetReloadToken}`;
	}, [displayedBackground, assetReloadToken]);

	const allBackgrounds = useMemo(() => {
		const list = selectedStory?.storyText?.content?.metadata.backgrounds || [];
		return Array.from(new Set(list));
	}, [selectedStory]);

	const allBgms = useMemo(() => {
		const list =
			selectedStory?.storyText?.content?.metadata.backgroundMusic || [];
		const collected = new Set<string>(list);
		const rawContent = selectedStory?.storyText?.rawContent;
		if (rawContent) {
			for (const line of rawContent.split("\n")) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;
				const match = trimmed.match(/^\[BGM(?:再生|停止)\s+(\S+)/);
				if (match) {
					collected.add(match[1]);
				}
			}
		}
		return Array.from(collected);
	}, [selectedStory]);

	const allSes = useMemo(() => {
		const collected = new Set<string>();
		const rawContent = selectedStory?.storyText?.rawContent;
		if (rawContent) {
			for (const line of rawContent.split("\n")) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;
				const match = trimmed.match(/^\[SE(?:再生|停止)\s+(\S+)/);
				if (match) {
					collected.add(match[1].trim());
				}
			}
		}
		return Array.from(collected);
	}, [selectedStory]);

	const currentDialogue = useMemo(() => {
		const dialogues = selectedStory?.storyText?.content?.dialogue || [];
		if (dialogues.length === 0) return null;
		const index = Math.min(
			Math.max(currentDialogueIndex, 0),
			dialogues.length - 1,
		);
		return dialogues[index];
	}, [selectedStory, currentDialogueIndex]);

	const currentSpeaker = currentDialogue?.character || "";

	const requiredBgms = useMemo(() => new Set(allBgms), [allBgms]);
	const requiredSes = useMemo(() => new Set(allSes), [allSes]);

	const bgmTimeline = useMemo(() => {
		const rawContent = selectedStory?.storyText?.rawContent;
		if (!rawContent) return { dialogueBgms: [] as Array<string | null> };

		let currentBgm: string | null = null;
		const dialogueBgms: Array<string | null> = [];

		for (const line of rawContent.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;

			const bgmMatch = trimmed.match(/^\[BGM(再生|停止)\s+(\S+)/);
			if (bgmMatch) {
				currentBgm = bgmMatch[1] === "再生" ? bgmMatch[2] : null;
				continue;
			}

			const dialogueMatch = trimmed.match(
				/^\[メッセージ表示\s+\S+\s+\S+\s+.+\]$/,
			);
			if (dialogueMatch) {
				dialogueBgms.push(currentBgm);
			}
		}

		return { dialogueBgms };
	}, [selectedStory]);

	const seTimeline = useMemo(() => {
		const rawContent = selectedStory?.storyText?.rawContent;
		if (!rawContent) return { dialogueSes: [] as Array<SeEvent[]> };

		const dialogueSes: Array<SeEvent[]> = [];
		let pendingEvents: SeEvent[] = [];

		for (const line of rawContent.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;

			const seMatch = trimmed.match(
				/^\[SE(再生|停止)\s+(\S+)(?:\s+([0-9.]+))?/,
			);
			if (seMatch) {
				const action = seMatch[1] === "再生" ? "play" : "stop";
				const name = seMatch[2];
				const volumeValue = Number(seMatch[3]);
				const volume = Number.isFinite(volumeValue) ? volumeValue : 1;
				pendingEvents.push({ action, name, volume });
				continue;
			}

			const dialogueMatch = trimmed.match(
				/^\[メッセージ表示\s+\S+\s+\S+\s+.+\]$/,
			);
			if (dialogueMatch) {
				dialogueSes.push(pendingEvents);
				pendingEvents = [];
			}
		}

		return { dialogueSes };
	}, [selectedStory]);

	const checkVoiceAvailability = async (storyId: number) => {
		try {
			const response = await fetcher(`/audio/music/story/${storyId}/exists`);
			const result = await response.json();

			if (result.exists && result.availableFiles.length > 0) {
				// 利用可能なファイル名をセットに保存
				const voiceSet = new Set<string>(result.availableFiles);
				setAvailableVoices(voiceSet);
			} else {
				setAvailableVoices(new Set());
			}
		} catch (error) {
			console.error("Failed to check voice availability:", error);
			setAvailableVoices(new Set());
		}
	};

	const handleDialogueSelect = (index: number) => {
		setCurrentDialogueIndex(index);
	};

	const handleStoryVoiceConversion = async (storyId: number) => {
		setIsConverting(true);

		try {
			const response = await fetcher(`/audio/convert/story/${storyId}`, {
				method: "POST",
			});
			const result = await response.json();

			if (result.success) {
				// 変換成功後にファイル存在状態を更新
				await checkVoiceAvailability(storyId);
			}
		} finally {
			setIsConverting(false);
		}
	};

	const handleStoryBgmConversion = async (storyId: number) => {
		setIsConvertingBgm(true);
		setBgmConversionMessage("");
		setBgmReconversionMessage("");
		try {
			const response = await fetcher(`/audio/convert/story/${storyId}/bgm`, {
				method: "POST",
			});
			const result = await response.json();
			if (result.success) {
				setBgmConversionMessage(
					`Story ${storyId} BGM converted. ${result.data.converted} converted, ${result.data.skipped} skipped, ${result.data.missing} missing.`,
				);
				setBgmCheckToken((prev) => prev + 1);
			} else {
				setBgmConversionMessage(
					`BGM conversion failed: ${result.message || "Unknown error"}`,
				);
			}
		} catch (error) {
			setBgmConversionMessage(
				`BGM conversion error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setIsConvertingBgm(false);
		}
	};

	const handleStoryBgmReconversion = async () => {
		if (requiredBgms.size === 0) return;
		setIsRevertingBgm(true);
		setBgmReconversionMessage("");
		try {
			const response = await fetcher("/audio/files?category=BGM");
			const result = await response.json();
			const files: Array<{ id: string; filename: string }> = result.data || [];
			const fileMap = new Map(files.map((file) => [file.filename, file.id]));

			let reconverted = 0;
			let missing = 0;

			for (const bgmName of requiredBgms) {
				const filename = `${bgmName}.acb`;
				const fileId = fileMap.get(filename);
				if (!fileId) {
					missing++;
					continue;
				}
				await fetcher(`/audio/convert/reconvert/${fileId}`, {
					method: "POST",
				});
				reconverted++;
			}

			setBgmReconversionMessage(
				`BGM reconvert completed. ${reconverted} reconverted, ${missing} missing.`,
			);
			setBgmCheckToken((prev) => prev + 1);
		} catch (error) {
			setBgmReconversionMessage(
				`BGM reconvert error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setIsRevertingBgm(false);
		}
	};

	const handleStoryBgmAction = (storyId: number) => {
		if (availableBgms.size > 0) {
			void handleStoryBgmReconversion();
			return;
		}
		void handleStoryBgmConversion(storyId);
	};

	const handleStorySeConversion = async (storyId: number) => {
		setIsConvertingSe(true);
		setSeConversionMessage("");
		try {
			const response = await fetcher(`/audio/convert/story/${storyId}/se`, {
				method: "POST",
			});
			const result = await response.json();
			if (result.success) {
				setSeConversionMessage(
					`Story ${storyId} SE converted. ${result.data.converted} converted, ${result.data.skipped} skipped, ${result.data.missing} missing.`,
				);
				setSeCheckToken((prev) => prev + 1);
			} else {
				setSeConversionMessage(
					`SE conversion failed: ${result.message || "Unknown error"}`,
				);
			}
		} catch (error) {
			setSeConversionMessage(
				`SE conversion error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setIsConvertingSe(false);
		}
	};

	const handleStoryAssetReload = () => {
		setBackgroundCheckToken((prev) => prev + 1);
		setBgmCheckToken((prev) => prev + 1);
		setSeCheckToken((prev) => prev + 1);
		setAssetReloadToken((prev) => prev + 1);
	};

	const handleStoryBackgroundConversion = async (storyId: number) => {
		setIsConvertingBackgrounds(true);
		setBackgroundConversionMessage("");
		try {
			const response = await fetcher(
				`/audio/convert/story/${storyId}/backgrounds`,
				{
					method: "POST",
				},
			);
			const result = await response.json();
			if (result.success) {
				setBackgroundConversionMessage(
					`Story ${storyId} backgrounds converted. ${result.data.converted} converted, ${result.data.skipped} skipped, ${result.data.missing} missing.`,
				);
				setBackgroundCheckToken((prev) => prev + 1);
			} else {
				setBackgroundConversionMessage(
					`Background conversion failed: ${result.message || "Unknown error"}`,
				);
			}
		} catch (error) {
			setBackgroundConversionMessage(
				`Background conversion error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setIsConvertingBackgrounds(false);
		}
	};

	const handleVoicePlay = async (
		voiceFile: string,
		storyId: number,
		dialogueIndex: number,
		nextAutoIndex?: number,
	) => {
		if (isPlayingVoice === voiceFile) {
			// 同じボイスが再生中の場合は停止
			stopAudio();
			return;
		}

		stopAudio();
		setIsPlayingVoice(voiceFile);
		setCurrentDialogueIndex(dialogueIndex);
		if (typeof nextAutoIndex === "number") {
			setAutoPlayIndex(nextAutoIndex);
			autoPlayIndexRef.current = nextAutoIndex;
		} else {
			const foundIndex = playableVoices.findIndex(
				(item) => item.voiceFile === voiceFile,
			);
			const nextIndex = foundIndex >= 0 ? foundIndex : null;
			setAutoPlayIndex(nextIndex);
			autoPlayIndexRef.current = nextIndex;
		}
		try {
			// 直接ファイル名でアクセス
			const audioUrl = `${VITE_BACKEND_URL}/audio/music/story/${storyId}/file/${encodeURIComponent(voiceFile)}`;

			// HTML5 Audio APIで再生
			const audio = new Audio();
			audio.preload = "auto";
			audio.crossOrigin = "anonymous";
			audio.volume = voiceVolume;
			audio.src = audioUrl;
			audioRef.current = audio;
			audio.addEventListener("ended", () => {
				if (!autoPlayEnabledRef.current) {
					stopAudio();
					return;
				}
				const list = autoPlayListRef.current;
				const currentIndex = autoPlayIndexRef.current ?? 0;
				const nextIndex = currentIndex + 1;
				const nextItem = list[nextIndex];
				if (!nextItem || !autoPlayStoryIdRef.current) {
					stopAudio();
					return;
				}
				void handleVoicePlay(
					nextItem.voiceFile,
					autoPlayStoryIdRef.current,
					nextItem.index,
					nextIndex,
				);
			});
			audio.addEventListener("error", () => {
				stopAudio();
				console.error("Audio playback failed");
			});

			await audio.play();
			if (autoAdvanceTimerRef.current) {
				window.clearTimeout(autoAdvanceTimerRef.current);
				autoAdvanceTimerRef.current = null;
			}
			const dialogues = selectedStory?.storyText?.content?.dialogue || [];
			const waitSeconds = dialogues[dialogueIndex]?.waitSeconds;
			if (
				autoPlayEnabledRef.current &&
				typeof waitSeconds === "number" &&
				waitSeconds > 0
			) {
				autoAdvanceTimerRef.current = window.setTimeout(() => {
					const list = autoPlayListRef.current;
					const currentIndex = autoPlayIndexRef.current ?? 0;
					const nextIndex = currentIndex + 1;
					const nextItem = list[nextIndex];
					if (!nextItem || !autoPlayStoryIdRef.current) {
						return;
					}
					if (nextItem.voiceFile === voiceFile) {
						setCurrentDialogueIndex(nextItem.index);
						setAutoPlayIndex(nextIndex);
						autoPlayIndexRef.current = nextIndex;
						autoAdvanceTimerRef.current = null;
						return;
					}
					void handleVoicePlay(
						nextItem.voiceFile,
						autoPlayStoryIdRef.current,
						nextItem.index,
						nextIndex,
					);
				}, waitSeconds * 1000);
			}
		} catch (error) {
			stopAudio();
			console.error("Voice playback error:", error);
		}
	};

	const toggleAutoPlay = () => {
		const next = !autoPlayEnabled;
		setAutoPlayEnabled(next);

		if (!next) {
			stopBgm();
			return;
		}

		const storyId = selectedStory?.story?.ScriptId;
		if (!storyId) return;

		const list = autoPlayListRef.current;
		if (list.length === 0) return;

		if (isPlayingVoice) {
			const currentIndex = list.findIndex(
				(item) => item.voiceFile === isPlayingVoice,
			);
			const nextIndex = currentIndex >= 0 ? currentIndex : 0;
			setAutoPlayIndex(nextIndex);
			autoPlayIndexRef.current = nextIndex;
			return;
		}

		void handleVoicePlay(list[0].voiceFile, storyId, list[0].index, 0);
	};

	const handleVoiceDownload = async (voiceFile: string, storyId: number) => {
		try {
			const audioUrl = `/audio/music/story/${storyId}/file/${encodeURIComponent(voiceFile)}`;
			const response = await fetcher(audioUrl);
			if (!response.ok) {
				throw new Error(`Download failed: ${response.status}`);
			}
			const blob = await response.blob();
			const downloadName = voiceFile.endsWith(".m4a")
				? voiceFile
				: `${voiceFile}.m4a`;

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = downloadName;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Voice download error:", error);
		}
	};

	const stopAudio = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			audioRef.current = null;
		}
		setIsPlayingVoice(null);
	};

	const stopBgmAudio = useCallback(() => {
		if (bgmAudioRef.current) {
			bgmAudioRef.current.pause();
			bgmAudioRef.current.currentTime = 0;
			bgmAudioRef.current = null;
		}
		setCurrentBgmName(null);
		currentBgmNameRef.current = null;
	}, []);

	const stopBgm = useCallback(() => {
		stopBgmAudio();
	}, [stopBgmAudio]);

	const playBgm = useCallback(
		async (bgmName: string) => {
			if (!availableBgms.has(bgmName)) return;
			if (currentBgmNameRef.current === bgmName && bgmAudioRef.current) {
				return;
			}

			stopBgmAudio();
			const audioUrl = `${VITE_BACKEND_URL}/assets/bgm/${bgmName}.m4a`;
			const audio = new Audio();
			audio.preload = "auto";
			audio.crossOrigin = "anonymous";
			audio.loop = true;
			audio.volume = bgmVolume;
			audio.src = audioUrl;
			bgmAudioRef.current = audio;
			try {
				await audio.play();
				setCurrentBgmName(bgmName);
				currentBgmNameRef.current = bgmName;
			} catch (error) {
				console.error("BGM playback error:", error);
				stopBgmAudio();
			}
		},
		[availableBgms, bgmVolume, stopBgmAudio],
	);

	const seAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
	const playingSeRef = useRef<string | null>(null);

	const stopSeAudio = useCallback((seName: string) => {
		const audio = seAudioMapRef.current.get(seName);
		if (!audio) return;
		audio.pause();
		audio.currentTime = 0;
		seAudioMapRef.current.delete(seName);
		if (playingSeRef.current === seName) {
			playingSeRef.current = null;
			setPlayingSe(null);
		}
	}, []);

	const seVolumeRef = useRef(seVolume);

	useEffect(() => {
		seVolumeRef.current = seVolume;
		for (const audio of seAudioMapRef.current.values()) {
			audio.volume = Math.max(0, Math.min(1, seVolume));
		}
	}, [seVolume]);

	const playSeAudio = useCallback(
		async (seName: string, volume: number) => {
			if (!availableSes.has(seName)) return;
			const audioUrl = `${VITE_BACKEND_URL}/assets/se/${seName}.m4a`;
			const audio = new Audio();
			audio.preload = "auto";
			audio.crossOrigin = "anonymous";
			audio.volume = Math.max(0, Math.min(1, volume * seVolumeRef.current));
			audio.src = audioUrl;
			seAudioMapRef.current.set(seName, audio);
			audio.addEventListener("ended", () => {
				if (seAudioMapRef.current.get(seName) === audio) {
					seAudioMapRef.current.delete(seName);
				}
				if (playingSeRef.current === seName) {
					playingSeRef.current = null;
					setPlayingSe(null);
				}
			});
			try {
				await audio.play();
				playingSeRef.current = seName;
				setPlayingSe(seName);
			} catch (error) {
				console.error("SE playback error:", error);
				seAudioMapRef.current.delete(seName);
				if (playingSeRef.current === seName) {
					playingSeRef.current = null;
					setPlayingSe(null);
				}
			}
		},
		[availableSes],
	);

	const lastSeTriggerRef = useRef<{ index: number; available: number } | null>(
		null,
	);

	useStoryInitialLoad(fetchLatestStories, stopAudio);
	useAutoPlayRefs(
		autoPlayEnabled,
		autoPlayIndex,
		autoPlayEnabledRef,
		autoPlayIndexRef,
	);
	useAutoAdvanceCleanup(autoAdvanceTimerRef);
	useStorySseProgress(
		setRealtimeProgress,
		isConverting || Boolean(realtimeProgress),
	);
	useBackgroundAvailability(
		selectedStory,
		allBackgrounds,
		backgroundCheckToken,
		setAvailableBackgrounds,
	);
	useBgmAvailability(selectedStory, allBgms, bgmCheckToken, setAvailableBgms);
	useSeAvailability(selectedStory, allSes, seCheckToken, setAvailableSes);
	useLastBackground(currentBackground, setLastBackground);

	useEffect(() => {
		return () => {
			stopBgm();
		};
	}, [stopBgm]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = voiceVolume;
		}
	}, [voiceVolume]);

	useEffect(() => {
		if (bgmAudioRef.current) {
			bgmAudioRef.current.volume = bgmVolume;
		}
	}, [bgmVolume]);

	useEffect(() => {
		if (!autoPlayEnabled) {
			stopBgm();
			return;
		}
		const bgmByDialogue = bgmTimeline.dialogueBgms;
		if (bgmByDialogue.length === 0) {
			stopBgm();
			return;
		}
		const safeIndex = Math.min(
			Math.max(currentDialogueIndex, 0),
			bgmByDialogue.length - 1,
		);
		const targetBgm = bgmByDialogue[safeIndex] ?? null;
		if (!targetBgm) {
			stopBgmAudio();
			return;
		}
		void playBgm(targetBgm);
	}, [
		autoPlayEnabled,
		currentDialogueIndex,
		bgmTimeline,
		playBgm,
		stopBgm,
		stopBgmAudio,
	]);

	useEffect(() => {
		const dialogues = seTimeline.dialogueSes;
		if (dialogues.length === 0) return;
		const safeIndex = Math.min(
			Math.max(currentDialogueIndex, 0),
			dialogues.length - 1,
		);
		const key = { index: safeIndex, available: availableSes.size };
		const last = lastSeTriggerRef.current;
		if (last && last.index === key.index && last.available === key.available) {
			return;
		}
		lastSeTriggerRef.current = key;

		const events = dialogues[safeIndex] ?? [];
		if (events.length === 0) return;
		for (const event of events) {
			if (event.action === "stop") {
				stopSeAudio(event.name);
			} else {
				void playSeAudio(event.name, event.volume);
			}
		}
	}, [
		availableSes,
		currentDialogueIndex,
		seTimeline,
		playSeAudio,
		stopSeAudio,
	]);

	const handleSePlay = (seName: string) => {
		if (playingSeRef.current === seName) {
			stopSeAudio(seName);
			return;
		}
		void playSeAudio(seName, 1);
	};

	const handleSeDownload = async (seName: string) => {
		try {
			const audioUrl = `/assets/se/${seName}.m4a`;
			const response = await fetcher(audioUrl);
			if (!response.ok) {
				throw new Error(`Download failed: ${response.status}`);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${seName}.m4a`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Failed to download SE:", error);
		}
	};

	return (
		<div className="bg-surface rounded-lg p-6 border border-border">
			<div className="space-y-6">
				<StoryHeader />
				<LatestStoriesSection
					latestStories={latestStories}
					latestHasMore={latestHasMore}
					latestLoading={latestLoading}
					onRefresh={() => fetchLatestStories(true)}
					onLoadMore={() => fetchLatestStories()}
					onSelect={handleStorySelect}
					formatStoryTime={formatStoryTime}
				/>
				<StorySearchSection
					query={storySearchQuery}
					loading={loading}
					onQueryChange={setStorySearchQuery}
					onSearch={handleStorySearch}
					mode={searchMode}
					onModeChange={setSearchMode}
					onReindex={handleDialogueIndex}
					indexing={indexing}
				/>
				<StoryResultsSection
					results={storyResults}
					onSelect={handleStorySelect}
				/>
				{selectedStory && (
					<SelectedStoryDetailsSection
						selectedStory={selectedStory}
						formatStoryTime={formatStoryTime}
						onClose={() => setSelectedStory(null)}
						isConverting={isConverting}
						isConvertingBackgrounds={isConvertingBackgrounds}
						isConvertingBgm={isConvertingBgm}
						isRevertingBgm={isRevertingBgm}
						isConvertingSe={isConvertingSe}
						seEventsByDialogue={seTimeline.dialogueSes}
						autoPlayEnabled={autoPlayEnabled}
						currentVoiceFile={isPlayingVoice}
						currentBgmName={currentBgmName}
						voiceVolume={voiceVolume}
						bgmVolume={bgmVolume}
						seVolume={seVolume}
						onVoiceVolumeChange={setVoiceVolume}
						onBgmVolumeChange={setBgmVolume}
						onSeVolumeChange={setSeVolume}
						availableVoices={availableVoices}
						requiredVoiceFiles={requiredVoiceFiles}
						availableBgms={availableBgms}
						requiredBgms={requiredBgms}
						availableSes={availableSes}
						requiredSes={requiredSes}
						playingSe={playingSe}
						bgmList={allBgms}
						backgroundConversionMessage={backgroundConversionMessage}
						bgmConversionMessage={bgmConversionMessage}
						seConversionMessage={seConversionMessage}
						playableVoices={playableVoices}
						realtimeProgress={realtimeProgress}
						contentTab={contentTab}
						onContentTabChange={setContentTab}
						displayedBackground={displayedBackground}
						currentBackgroundUrl={currentBackgroundUrl}
						availableBackgrounds={availableBackgrounds}
						assetReloadToken={assetReloadToken}
						currentSpeaker={currentSpeaker}
						currentDialogueIndex={currentDialogueIndex}
						onDialogueIndexChange={handleDialogueSelect}
						isPlayingVoice={isPlayingVoice}
						onVoicePlay={handleVoicePlay}
						onVoiceDownload={handleVoiceDownload}
						onStoryVoiceConversion={handleStoryVoiceConversion}
						onStoryBackgroundConversion={handleStoryBackgroundConversion}
						onStoryBgmAction={handleStoryBgmAction}
						onStorySeConversion={handleStorySeConversion}
						onSePlay={handleSePlay}
						onSeDownload={handleSeDownload}
						bgmReconversionMessage={bgmReconversionMessage}
						onStoryAssetReload={handleStoryAssetReload}
						onToggleAutoPlay={toggleAutoPlay}
						onRelatedStorySelect={handleStorySelect}
					/>
				)}
			</div>
		</div>
	);
}
