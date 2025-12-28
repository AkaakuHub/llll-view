import React, {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useLocation } from "react-router-dom";
import type { AudioFile } from "../components/page/MusicPlayerPage/types";
import { VITE_BACKEND_URL } from "../lib/const";
import { fetcher } from "../lib/fetcher";

interface AudioPlayerContextType {
	// Audio state
	audioFiles: AudioFile[];
	currentTrackIndex: number;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isLoading: boolean;
	error: string | null;

	// Playlist state
	shuffle: boolean;
	repeat: "off" | "all" | "one";
	autoPlay: boolean;
	autoNext: boolean;
	continuousRandomMode: boolean;

	// Offset settings (in milliseconds)
	startOffset: number;
	endOffset: number;
	offsetEnabled: boolean;

	// UI state
	isMinimized: boolean;

	// Actions
	setAudioFiles: (files: AudioFile[]) => void;
	setCurrentTrackIndex: (index: number) => void;
	updateTrack: (updatedTrack: AudioFile) => void;
	reorderTracks: (fromIndex: number, toIndex: number) => void;
	addToQueueNext: (files: AudioFile[]) => void;
	addToQueueEnd: (files: AudioFile[]) => void;
	play: () => Promise<void>;
	pause: () => void;
	togglePlayPause: () => Promise<void>;
	nextTrack: () => void;
	previousTrack: () => void;
	seekTo: (time: number) => void;
	setVolume: (volume: number) => void;
	toggleShuffle: () => void;
	toggleRepeat: () => void;
	downloadCurrentTrack: () => Promise<void>;
	toggleAutoPlay: () => void;
	toggleAutoNext: () => void;
	toggleContinuousRandomMode: () => void;
	setIsMinimized: (minimized: boolean) => void;

	// Offset controls
	setStartOffset: (offset: number) => void;
	setEndOffset: (offset: number) => void;
	toggleOffsetEnabled: () => void;

	// Current track info
	currentTrack: AudioFile | null;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(
	undefined,
);

export const useAudioPlayer = () => {
	const context = useContext(AudioPlayerContext);
	if (context === undefined) {
		throw new Error(
			"useAudioPlayer must be used within an AudioPlayerProvider",
		);
	}
	return context;
};

interface AudioPlayerProviderProps {
	children: ReactNode;
}

export const AudioPlayerProvider: React.FC<AudioPlayerProviderProps> = ({
	children,
}) => {
	const location = useLocation();
	const isPlayerPath = location.pathname === "/player";

	// Audio state
	const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
	const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolumeState] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Playlist state
	const [shuffle, setShuffle] = useState(true);
	const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
	const [autoPlay, setAutoPlay] = useState(true);
	const [autoNext, setAutoNext] = useState(true);
	const [continuousRandomMode, setContinuousRandomMode] = useState(true);

	// Offset settings (in milliseconds)
	const [startOffset, setStartOffsetState] = useState(1000); // 1 second default
	const [endOffset, setEndOffsetState] = useState(1000); // 1 second default
	const [offsetEnabled, setOffsetEnabled] = useState(true);

	// UI state
	const [isMinimized, setIsMinimized] = useState(true);

	// Audio element ref
	const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

	// Track the current playing track ID to avoid unnecessary reloads
	const currentPlayingTrackIdRef = useRef<string | null>(null);
	// Track isPlayerPath to avoid re-registering event listeners
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const isPlayerPathRef = useRef(isPlayerPath);
	// Track if we were playing before changing tracks (for auto-next)
	const wasPlayingRef = useRef(false);

	// Continuous random mode state
	const [allSongs, setAllSongs] = useState<AudioFile[]>([]);

	// Initialize audio element
	useEffect(() => {
		const audioElement = new Audio();
		setAudio(audioElement);

		return () => {
			audioElement.pause();
			audioElement.src = "";
		};
	}, []);

	// Sync isPlayerPathRef when isPlayerPath changes
	useEffect(() => {
		isPlayerPathRef.current = isPlayerPath;
	}, [isPlayerPath]);

	// Load user preferences from localStorage
	useEffect(() => {
		const savedVolume = localStorage.getItem("audioPlayer.volume");
		const savedShuffle = localStorage.getItem("audioPlayer.shuffle");
		const savedRepeat = localStorage.getItem("audioPlayer.repeat");
		const savedAutoPlay = localStorage.getItem("audioPlayer.autoPlay");
		const savedAutoNext = localStorage.getItem("audioPlayer.autoNext");
		const savedStartOffset = localStorage.getItem("audioPlayer.startOffset");
		const savedEndOffset = localStorage.getItem("audioPlayer.endOffset");
		const savedOffsetEnabled = localStorage.getItem(
			"audioPlayer.offsetEnabled",
		);
		const savedContinuousRandomMode = localStorage.getItem(
			"audioPlayer.continuousRandomMode",
		);

		if (savedVolume) setVolumeState(parseFloat(savedVolume));
		if (savedShuffle) setShuffle(savedShuffle === "true");
		if (savedRepeat) setRepeat(savedRepeat as "off" | "all" | "one");
		if (savedAutoPlay) setAutoPlay(savedAutoPlay === "true");
		if (savedAutoNext) setAutoNext(savedAutoNext === "true");
		if (savedStartOffset) setStartOffsetState(parseInt(savedStartOffset));
		if (savedEndOffset) setEndOffsetState(parseInt(savedEndOffset));
		if (savedOffsetEnabled) setOffsetEnabled(savedOffsetEnabled === "true");
		if (savedContinuousRandomMode)
			setContinuousRandomMode(savedContinuousRandomMode === "true");
	}, []);

	// Load all songs when continuous random mode is enabled
	useEffect(() => {
		const loadAllSongs = async () => {
			if (!continuousRandomMode) return;

			try {
				const response = await fetcher("/audio/music/search?limit=1000");
				const result = await response.json();

				if (result.success && result.data) {
					setAllSongs(result.data);
				}
			} catch (error) {
				console.error("Failed to load all songs:", error);
			}
		};

		loadAllSongs();
	}, [continuousRandomMode]);

	// Auto-populate queue with all songs in random order when continuous random mode is enabled
	useEffect(() => {
		if (!continuousRandomMode || allSongs.length === 0) return;

		// Only populate if queue is empty or has very few songs
		if (audioFiles.length <= 1) {
			// Create a shuffled copy of all songs
			const shuffledSongs = [...allSongs].sort(() => Math.random() - 0.5);

			// Add all songs to queue in random order, avoiding duplicates
			setAudioFiles((prev) => {
				// Keep current playing song if exists
				const currentSong = prev.length > 0 ? [prev[0]] : [];

				// Filter out songs that are already in the current queue
				const currentIds = new Set(currentSong.map((song) => song.id));
				const newSongs = shuffledSongs.filter(
					(song) => !currentIds.has(song.id),
				);

				return [...currentSong, ...newSongs];
			});
		}
	}, [continuousRandomMode, allSongs, audioFiles.length]);

	// Audio event handlers
	useEffect(() => {
		if (!audio) return;

		const handleLoadStart = () => setIsLoading(true);
		const handleCanPlay = async () => {
			setIsLoading(false);
			// If was playing before track change, continue playing regardless of path
			if (wasPlayingRef.current) {
				try {
					await audio.play();
					wasPlayingRef.current = false;
				} catch (error) {
					console.warn("Failed to continue playback on canplay:", error);
					setIsPlaying(false);
					wasPlayingRef.current = false;
				}
			} else if (isPlayerPathRef.current && autoPlay) {
				// First load: only auto-play on player path
				try {
					await audio.play();
				} catch (error) {
					console.warn("Auto-play failed on canplay:", error);
					setIsPlaying(false);
				}
			}
		};
		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);
		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime);

			// Check for end offset
			if (offsetEnabled && endOffset > 0 && audio.duration > 0) {
				const endTimeInSeconds = audio.duration - endOffset / 1000;
				if (audio.currentTime >= endTimeInSeconds) {
					// Trigger track end behavior
					audio.pause();
					setIsPlaying(false);
					setCurrentTime(0);

					// Handle next track based on repeat/autoNext settings
					if (repeat === "one") {
						audio.currentTime =
							offsetEnabled && startOffset > 0 ? startOffset / 1000 : 0;
						audio.play();
					} else if (
						autoNext &&
						(repeat === "all" || currentTrackIndex < audioFiles.length - 1)
					) {
						// Mark that we were playing before changing tracks
						wasPlayingRef.current = true;
						// Auto-advance to next track
						const nextIndex = shuffle
							? Math.floor(Math.random() * audioFiles.length)
							: (currentTrackIndex + 1) % audioFiles.length;
						setCurrentTrackIndex(nextIndex);
					}
				}
			}
		};
		const handleDurationChange = () => setDuration(audio.duration || 0);
		const handleError = (e: Event) => {
			const audioError = (e.target as HTMLAudioElement).error;
			let errorMessage = "Audio playback error";
			if (audioError) {
				switch (audioError.code) {
					case audioError.MEDIA_ERR_ABORTED:
						errorMessage = "Audio playback aborted";
						break;
					case audioError.MEDIA_ERR_NETWORK:
						errorMessage = "Network error while loading audio";
						break;
					case audioError.MEDIA_ERR_DECODE:
						errorMessage = "Audio decode error";
						break;
					case audioError.MEDIA_ERR_SRC_NOT_SUPPORTED:
						errorMessage = "Audio format not supported or file not found";
						break;
				}
			}
			console.error("Audio error:", errorMessage, "URL:", audio.src);
			setError(errorMessage);
			setIsLoading(false);
		};
		const handleEnded = () => {
			if (repeat === "one") {
				audio.currentTime = 0;
				audio.play();
			} else if (autoNext) {
				// Mark that we were playing before changing tracks
				wasPlayingRef.current = true;

				// Handle continuous random mode
				if (continuousRandomMode) {
					// Check if we're at the end of the queue
					if (currentTrackIndex >= audioFiles.length - 1) {
						// Add a new shuffled set of all songs, avoiding duplicates
						if (allSongs.length > 0) {
							const shuffledSongs = [...allSongs].sort(
								() => Math.random() - 0.5,
							);

							setAudioFiles((prev) => {
								// Get existing song IDs to avoid duplicates
								const existingIds = new Set(prev.map((song) => song.id));
								const newSongs = shuffledSongs.filter(
									(song) => !existingIds.has(song.id),
								);

								// If no new songs available, add all songs again (full cycle)
								const songsToAdd =
									newSongs.length > 0 ? newSongs : shuffledSongs;

								return [...prev, ...songsToAdd];
							});

							setCurrentTrackIndex(currentTrackIndex + 1);
						}
					} else {
						// Move to next track in queue
						setCurrentTrackIndex(currentTrackIndex + 1);
					}
				} else if (
					repeat === "all" ||
					currentTrackIndex < audioFiles.length - 1
				) {
					// Normal playlist logic
					if (audioFiles.length === 0) return;

					let nextIndex: number;
					if (shuffle) {
						nextIndex = Math.floor(Math.random() * audioFiles.length);
					} else {
						nextIndex = (currentTrackIndex + 1) % audioFiles.length;
					}
					setCurrentTrackIndex(nextIndex);
				} else {
					setIsPlaying(false);
				}
			} else {
				setIsPlaying(false);
			}
		};

		audio.addEventListener("loadstart", handleLoadStart);
		audio.addEventListener("canplay", handleCanPlay);
		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("durationchange", handleDurationChange);
		audio.addEventListener("error", handleError);
		audio.addEventListener("ended", handleEnded);

		return () => {
			audio.removeEventListener("loadstart", handleLoadStart);
			audio.removeEventListener("canplay", handleCanPlay);
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("durationchange", handleDurationChange);
			audio.removeEventListener("error", handleError);
			audio.removeEventListener("ended", handleEnded);
		};
	}, [
		audio,
		repeat,
		autoNext,
		currentTrackIndex,
		audioFiles.length,
		shuffle,
		autoPlay,
		offsetEnabled,
		endOffset,
		startOffset,
		continuousRandomMode,
		allSongs,
	]);

	// Load current track
	useEffect(() => {
		if (
			!audio ||
			!audioFiles.length ||
			currentTrackIndex < 0 ||
			currentTrackIndex >= audioFiles.length
		) {
			return;
		}

		const currentTrack = audioFiles[currentTrackIndex];
		if (currentTrack?.url) {
			// Only reload if the track has actually changed (check by ID)
			if (currentPlayingTrackIdRef.current !== currentTrack.id) {
				currentPlayingTrackIdRef.current = currentTrack.id;

				// Ensure URL points to backend using environment variable
				const audioUrl = currentTrack.url.startsWith("http")
					? currentTrack.url
					: `${VITE_BACKEND_URL}${currentTrack.url.startsWith("/") ? "" : "/"}${currentTrack.url}`;

				audio.src = audioUrl;
				audio.volume = volume;
				setError(null);

				// Apply start offset when new track loads
				if (offsetEnabled && startOffset > 0) {
					audio.currentTime = startOffset / 1000;
				}

				// Auto-play if enabled
				if (autoPlay && isPlayerPath) {
					// Use a small delay to ensure the audio is loaded
					const playTimeout = setTimeout(async () => {
						try {
							await audio.play();
						} catch (error) {
							console.warn("Auto-play failed:", error);
							// Auto-play failed (likely due to iOS Safari policy)
							// Stop loading state to allow manual play
							setIsLoading(false);
							setIsPlaying(false);
						}
					}, 100);

					// Cleanup timeout if component unmounts
					return () => clearTimeout(playTimeout);
				} else if (isPlaying) {
					// If autoPlay is disabled but was playing, continue playing
					const playTimeout = setTimeout(async () => {
						try {
							await audio.play();
						} catch (error) {
							console.warn("Failed to continue playback:", error);
						}
					}, 100);

					// Cleanup timeout if component unmounts
					return () => clearTimeout(playTimeout);
				}
			}
		}
	}, [
		audio,
		audioFiles,
		currentTrackIndex,
		autoPlay,
		isPlayerPath,
		offsetEnabled,
		startOffset,
		isPlaying,
		volume,
	]);

	// Actions
	const play = useCallback(async () => {
		if (audio) {
			try {
				// Apply start offset if enabled
				if (offsetEnabled && startOffset > 0) {
					const startTimeInSeconds = startOffset / 1000;
					if (audio.currentTime < startTimeInSeconds) {
						audio.currentTime = startTimeInSeconds;
					}
				}
				await audio.play();
			} catch (error) {
				setError("Failed to play audio");
				console.error("Audio play error:", error);
			}
		}
	}, [audio, offsetEnabled, startOffset]);

	const pause = useCallback(() => {
		if (audio) {
			audio.pause();
		}
	}, [audio]);

	const nextTrack = useCallback(() => {
		if (audioFiles.length === 0) return;

		let nextIndex: number;
		if (shuffle) {
			nextIndex = Math.floor(Math.random() * audioFiles.length);
		} else {
			nextIndex = (currentTrackIndex + 1) % audioFiles.length;
		}
		setCurrentTrackIndex(nextIndex);
	}, [audioFiles.length, shuffle, currentTrackIndex]);

	const previousTrack = useCallback(() => {
		if (audioFiles.length === 0) return;

		if (audio && audio.currentTime > 3) {
			// If more than 3 seconds have played, restart current track
			audio.currentTime = 0;
		} else {
			// Otherwise go to previous track
			const prevIndex =
				currentTrackIndex === 0 ? audioFiles.length - 1 : currentTrackIndex - 1;
			setCurrentTrackIndex(prevIndex);
		}
	}, [audioFiles.length, audio, currentTrackIndex]);

	// Media Session API for iOS Control Center
	useEffect(() => {
		if (!("mediaSession" in navigator)) {
			return;
		}

		const currentTrack =
			audioFiles.length > 0 &&
			currentTrackIndex >= 0 &&
			currentTrackIndex < audioFiles.length
				? audioFiles[currentTrackIndex]
				: null;

		if (currentTrack) {
			// Set metadata
			const artwork = [];
			if (currentTrack.thumbnailUrl) {
				const artworkUrl = currentTrack.thumbnailUrl.startsWith("http")
					? currentTrack.thumbnailUrl
					: `${VITE_BACKEND_URL}${currentTrack.thumbnailUrl.startsWith("/") ? "" : "/"}${currentTrack.thumbnailUrl}`;

				artwork.push({
					src: artworkUrl,
					sizes: "512x512",
					type: "image/png",
				});
			}

			navigator.mediaSession.metadata = new MediaMetadata({
				title: currentTrack.title || currentTrack.filename || "Unknown Track",
				artist:
					currentTrack.artist || currentTrack.category || "Unknown Artist",
				album: currentTrack.album || "Unknown Album",
				artwork: artwork,
			});

			// Set action handlers
			navigator.mediaSession.setActionHandler("play", () => {
				play();
			});

			navigator.mediaSession.setActionHandler("pause", () => {
				pause();
			});

			navigator.mediaSession.setActionHandler("previoustrack", () => {
				previousTrack();
			});

			navigator.mediaSession.setActionHandler("nexttrack", () => {
				nextTrack();
			});

			navigator.mediaSession.setActionHandler("seekbackward", (details) => {
				if (audio) {
					const skipTime = details.seekOffset || 10;
					audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
				}
			});

			navigator.mediaSession.setActionHandler("seekforward", (details) => {
				if (audio) {
					const skipTime = details.seekOffset || 10;
					audio.currentTime = Math.min(
						audio.currentTime + skipTime,
						audio.duration || 0,
					);
				}
			});

			navigator.mediaSession.setActionHandler("seekto", (details) => {
				if (audio && details.seekTime !== undefined) {
					audio.currentTime = details.seekTime;
				}
			});
		}
	}, [
		audio,
		play,
		pause,
		nextTrack,
		previousTrack,
		audioFiles,
		currentTrackIndex,
	]);

	const togglePlayPause = async () => {
		if (isPlaying) {
			pause();
		} else {
			try {
				await play();
			} catch (error) {
				console.warn("Play failed in togglePlayPause:", error);
				// Ensure loading state is cleared on failure
				setIsLoading(false);
				setIsPlaying(false);
			}
		}
	};

	const seekTo = (time: number) => {
		if (audio) {
			audio.currentTime = time;
			// シーク後に自動再生が有効かつ再生中の場合、再生を再開
			if (autoPlay && isPlaying) {
				audio.play().catch((error) => {
					console.warn("Failed to resume playback after seek:", error);
				});
			}
		}
	};

	const setVolume = (newVolume: number) => {
		const clampedVolume = Math.max(0, Math.min(1, newVolume));
		setVolumeState(clampedVolume);
		if (audio) {
			audio.volume = clampedVolume;
		}
		localStorage.setItem("audioPlayer.volume", clampedVolume.toString());
	};

	const toggleShuffle = () => {
		const newShuffle = !shuffle;
		setShuffle(newShuffle);
		localStorage.setItem("audioPlayer.shuffle", newShuffle.toString());
	};

	const toggleRepeat = () => {
		const nextRepeat =
			repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
		setRepeat(nextRepeat);
		localStorage.setItem("audioPlayer.repeat", nextRepeat);
	};

	const toggleAutoPlay = () => {
		const newAutoPlay = !autoPlay;
		setAutoPlay(newAutoPlay);
		localStorage.setItem("audioPlayer.autoPlay", newAutoPlay.toString());
	};

	const toggleAutoNext = () => {
		const newAutoNext = !autoNext;
		setAutoNext(newAutoNext);
		localStorage.setItem("audioPlayer.autoNext", newAutoNext.toString());
	};

	const downloadCurrentTrack = async () => {
		const track = audioFiles[currentTrackIndex];
		if (!track?.id) return;

		try {
			const response = await fetch(
				`${VITE_BACKEND_URL}/audio/music/download/${track.id}`,
			);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.style.display = "none";
			a.href = url;
			a.download = `${track.title || track.id}.m4a`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Download failed:", error);
		}
	};

	const toggleContinuousRandomMode = () => {
		const newContinuousRandomMode = !continuousRandomMode;
		setContinuousRandomMode(newContinuousRandomMode);
		localStorage.setItem(
			"audioPlayer.continuousRandomMode",
			newContinuousRandomMode.toString(),
		);
	};

	const setStartOffset = (offset: number) => {
		setStartOffsetState(offset);
		localStorage.setItem("audioPlayer.startOffset", offset.toString());
	};

	const setEndOffset = (offset: number) => {
		setEndOffsetState(offset);
		localStorage.setItem("audioPlayer.endOffset", offset.toString());
	};

	const toggleOffsetEnabled = () => {
		const newOffsetEnabled = !offsetEnabled;
		setOffsetEnabled(newOffsetEnabled);
		localStorage.setItem(
			"audioPlayer.offsetEnabled",
			newOffsetEnabled.toString(),
		);
	};

	// 並べ替え機能（音楽を再読み込みしない）
	const reorderTracks = (fromIndex: number, toIndex: number) => {
		if (fromIndex === toIndex) return;

		// 現在の状態を取得
		const currentIndex = currentTrackIndex;
		const files = [...audioFiles];

		// 配列を並べ替え
		const [movedTrack] = files.splice(fromIndex, 1);
		files.splice(toIndex, 0, movedTrack);

		// 現在再生中のトラックのインデックスを計算
		let newCurrentIndex: number = currentIndex;
		if (fromIndex === currentIndex) {
			// 現在再生中のトラックが移動された場合
			newCurrentIndex = toIndex;
		} else if (fromIndex < currentIndex && toIndex >= currentIndex) {
			// 現在再生中のトラックより前から後ろに移動された場合
			newCurrentIndex = currentIndex - 1;
		} else if (fromIndex > currentIndex && toIndex <= currentIndex) {
			// 現在再生中のトラックより後ろから前に移動された場合
			newCurrentIndex = currentIndex + 1;
		}

		// 状態を更新（バッチ処理により同時に更新される）
		setAudioFiles(files);
		setCurrentTrackIndex(newCurrentIndex);
	};

	// 現在の次に追加
	const addToQueueNext = (files: AudioFile[]) => {
		const insertIndex = currentTrackIndex + 1;
		const newFiles = [...audioFiles];
		newFiles.splice(insertIndex, 0, ...files);
		setAudioFiles(newFiles);
	};

	// キューの末尾に追加
	const addToQueueEnd = (files: AudioFile[]) => {
		setAudioFiles([...audioFiles, ...files]);
	};

	// 特定のトラックを更新
	const updateTrack = (updatedTrack: AudioFile) => {
		const newFiles = audioFiles.map((file) =>
			file.id === updatedTrack.id ? updatedTrack : file,
		);
		setAudioFiles(newFiles);
	};

	const currentTrack =
		audioFiles.length > 0 &&
		currentTrackIndex >= 0 &&
		currentTrackIndex < audioFiles.length
			? audioFiles[currentTrackIndex]
			: null;

	const value: AudioPlayerContextType = {
		// Audio state
		audioFiles,
		currentTrackIndex,
		isPlaying,
		currentTime,
		duration,
		volume,
		isLoading,
		error,

		// Playlist state
		shuffle,
		repeat,
		autoPlay,
		autoNext,
		continuousRandomMode,

		// Offset settings
		startOffset,
		endOffset,
		offsetEnabled,

		// UI state
		isMinimized,

		// Actions
		setAudioFiles,
		setCurrentTrackIndex,
		updateTrack,
		reorderTracks,
		addToQueueNext,
		addToQueueEnd,
		play,
		pause,
		togglePlayPause,
		nextTrack,
		previousTrack,
		seekTo,
		setVolume,
		toggleShuffle,
		toggleRepeat,
		downloadCurrentTrack,
		toggleAutoPlay,
		toggleAutoNext,
		toggleContinuousRandomMode,
		setIsMinimized,

		// Offset controls
		setStartOffset,
		setEndOffset,
		toggleOffsetEnabled,

		// Current track info
		currentTrack,
	};

	return (
		<AudioPlayerContext.Provider value={value}>
			{children}
		</AudioPlayerContext.Provider>
	);
};
