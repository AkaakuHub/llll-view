import { useEffect, useRef } from "react";
import { VITE_BACKEND_URL } from "../../../lib/const";
import type { DetailedStoryResult, RealtimeProgress } from "./types";

export const useStorySseProgress = (
	setRealtimeProgress: React.Dispatch<
		React.SetStateAction<RealtimeProgress | null>
	>,
	enabled: boolean,
) => {
	useEffect(() => {
		if (!enabled) {
			return;
		}

		const sseUrl = `${VITE_BACKEND_URL}/audio/convert/progress`;
		const eventSource = new EventSource(sseUrl);

		eventSource.addEventListener("progress", (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "story_voice_conversion") {
					setRealtimeProgress({
						current: data.current,
						total: data.total,
						storyId: data.storyId,
					});
				}
			} catch (error) {
				console.error("Failed to parse SSE data:", error);
			}
		});

		eventSource.onerror = (error) => {
			console.warn("SSE connection error:", error);
		};

		return () => {
			eventSource.close();
		};
	}, [enabled, setRealtimeProgress]);
};

export const useStoryInitialLoad = (
	fetchLatestStories: (reset?: boolean) => Promise<void>,
	stopAudio: () => void,
) => {
	const fetchLatestStoriesRef = useRef(fetchLatestStories);
	const stopAudioRef = useRef(stopAudio);

	useEffect(() => {
		fetchLatestStoriesRef.current = fetchLatestStories;
	}, [fetchLatestStories]);

	useEffect(() => {
		stopAudioRef.current = stopAudio;
	}, [stopAudio]);

	useEffect(() => {
		void fetchLatestStoriesRef.current(true);
		return () => {
			stopAudioRef.current();
		};
	}, []);
};

export const useAutoPlayRefs = (
	autoPlayEnabled: boolean,
	autoPlayIndex: number | null,
	autoPlayEnabledRef: React.MutableRefObject<boolean>,
	autoPlayIndexRef: React.MutableRefObject<number | null>,
) => {
	useEffect(() => {
		autoPlayEnabledRef.current = autoPlayEnabled;
	}, [autoPlayEnabled, autoPlayEnabledRef]);

	useEffect(() => {
		autoPlayIndexRef.current = autoPlayIndex;
	}, [autoPlayIndex, autoPlayIndexRef]);
};

export const useAutoAdvanceCleanup = (
	autoAdvanceTimerRef: React.MutableRefObject<number | null>,
) => {
	useEffect(() => {
		return () => {
			if (autoAdvanceTimerRef.current) {
				window.clearTimeout(autoAdvanceTimerRef.current);
				autoAdvanceTimerRef.current = null;
			}
		};
	}, [autoAdvanceTimerRef]);
};

export const useBackgroundAvailability = (
	selectedStory: DetailedStoryResult | null,
	allBackgrounds: string[],
	backgroundCheckToken: number,
	setAvailableBackgrounds: React.Dispatch<React.SetStateAction<Set<string>>>,
) => {
	useEffect(() => {
		const token = backgroundCheckToken;
		void token;
		const storyId = selectedStory?.story?.ScriptId;
		if (!storyId || allBackgrounds.length === 0) {
			setAvailableBackgrounds(new Set());
			return;
		}

		let cancelled = false;
		const check = async () => {
			try {
				const checks = await Promise.all(
					allBackgrounds.map(async (bg) => {
						const url = `${VITE_BACKEND_URL}/assets/story/backgrounds/${bg}.png`;
						const response = await fetch(url, { method: "HEAD" });
						return response.ok ? bg : null;
					}),
				);
				if (!cancelled) {
					const existing = new Set(checks.filter(Boolean) as string[]);
					setAvailableBackgrounds(existing);
				}
			} catch {
				if (!cancelled) {
					setAvailableBackgrounds(new Set());
				}
			}
		};
		void check();

		return () => {
			cancelled = true;
		};
	}, [
		selectedStory,
		allBackgrounds,
		backgroundCheckToken,
		setAvailableBackgrounds,
	]);
};

export const useBgmAvailability = (
	selectedStory: DetailedStoryResult | null,
	allBgms: string[],
	bgmCheckToken: number,
	setAvailableBgms: React.Dispatch<React.SetStateAction<Set<string>>>,
) => {
	useEffect(() => {
		const token = bgmCheckToken;
		void token;
		const storyId = selectedStory?.story?.ScriptId;
		if (!storyId || allBgms.length === 0) {
			setAvailableBgms(new Set());
			return;
		}

		let cancelled = false;
		const check = async () => {
			try {
				const checks = await Promise.all(
					allBgms.map(async (bgm) => {
						const url = `${VITE_BACKEND_URL}/assets/bgm/${bgm}.m4a`;
						const response = await fetch(url, { method: "HEAD" });
						return response.ok ? bgm : null;
					}),
				);
				if (!cancelled) {
					const existing = new Set(checks.filter(Boolean) as string[]);
					setAvailableBgms(existing);
				}
			} catch {
				if (!cancelled) {
					setAvailableBgms(new Set());
				}
			}
		};
		void check();

		return () => {
			cancelled = true;
		};
	}, [selectedStory, allBgms, bgmCheckToken, setAvailableBgms]);
};

export const useSeAvailability = (
	selectedStory: DetailedStoryResult | null,
	allSes: string[],
	seCheckToken: number,
	setAvailableSes: React.Dispatch<React.SetStateAction<Set<string>>>,
) => {
	useEffect(() => {
		const token = seCheckToken;
		void token;
		const storyId = selectedStory?.story?.ScriptId;
		if (!storyId || allSes.length === 0) {
			setAvailableSes(new Set());
			return;
		}

		let cancelled = false;
		const check = async () => {
			try {
				const checks = await Promise.all(
					allSes.map(async (se) => {
						const url = `${VITE_BACKEND_URL}/assets/se/${se}.m4a`;
						const response = await fetch(url, { method: "HEAD" });
						return response.ok ? se : null;
					}),
				);
				if (!cancelled) {
					const existing = new Set(checks.filter(Boolean) as string[]);
					setAvailableSes(existing);
				}
			} catch {
				if (!cancelled) {
					setAvailableSes(new Set());
				}
			}
		};
		void check();

		return () => {
			cancelled = true;
		};
	}, [selectedStory, allSes, seCheckToken, setAvailableSes]);
};

export const useLastBackground = (
	currentBackground: string | null,
	setLastBackground: React.Dispatch<React.SetStateAction<string | null>>,
) => {
	useEffect(() => {
		if (currentBackground) {
			setLastBackground(currentBackground);
		}
	}, [currentBackground, setLastBackground]);
};
