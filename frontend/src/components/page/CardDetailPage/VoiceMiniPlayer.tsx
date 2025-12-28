import { Pause, Play, Volume2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { VITE_BACKEND_URL } from "../../../lib/const";
import Button from "../../ui/Button";
import Range from "../../ui/Range";
import type { VoiceFile } from "./types";

interface VoiceMiniPlayerProps {
	voiceFiles: VoiceFile[];
	currentVoiceType: string | null;
	onVoiceChange: (voiceType: string | null) => void;
	onConvert: (voiceFile: VoiceFile) => Promise<void>;
}

export const VoiceMiniPlayer: React.FC<VoiceMiniPlayerProps> = ({
	voiceFiles,
	currentVoiceType,
	onConvert,
}) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const currentVoiceFile = voiceFiles.find(
		(vf) => vf.type === currentVoiceType,
	);
	const effectiveMax = duration > 0 ? duration : 1;

	const formatTime = (seconds: number): string => {
		if (!seconds || Number.isNaN(seconds)) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const handlePlayPause = async () => {
		if (!currentVoiceFile) return;

		try {
			// Convert if not already converted
			if (!currentVoiceFile.converted) {
				setIsLoading(true);
				await onConvert(currentVoiceFile);
				setIsLoading(false);
			}

			if (!audioRef.current) {
				// Create new audio element
				const audio = new Audio();
				audio.preload = "auto";
				audio.crossOrigin = "anonymous";
				audio.src = `${VITE_BACKEND_URL}${currentVoiceFile.url}`;
				audioRef.current = audio;

				// Set up event listeners
				audio.addEventListener("loadedmetadata", () => {
					setDuration(audio.duration || 0);
				});

				audio.addEventListener("timeupdate", () => {
					setCurrentTime(audio.currentTime);
					setDuration(audio.duration || 0);
				});

				audio.addEventListener("ended", () => {
					setIsPlaying(false);
					setCurrentTime(0);
				});

				audio.addEventListener("error", (e) => {
					console.error("Audio error:", e);
					setIsPlaying(false);
					setIsLoading(false);
				});
			}

			if (isPlaying) {
				audioRef.current.pause();
				setIsPlaying(false);
			} else {
				await audioRef.current.play();
				setIsPlaying(true);
			}
		} catch (error) {
			console.error("Playback error:", error);
			setIsPlaying(false);
			setIsLoading(false);
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTime = parseFloat(e.target.value);
		if (audioRef.current) {
			audioRef.current.currentTime = newTime;
			setCurrentTime(newTime);
		}
	};

	const handleStop = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			setCurrentTime(0);
		}
		setIsPlaying(false);
	};

	const handleDownload = async () => {
		if (!currentVoiceFile?.converted) return;
		try {
			setIsDownloading(true);
			const res = await fetch(`${VITE_BACKEND_URL}${currentVoiceFile.url}`);
			if (!res.ok) throw new Error("Failed to download");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = currentVoiceFile.filename;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Download error:", error);
		} finally {
			setIsDownloading(false);
		}
	};

	// Clean up and preload when voice changes
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}
		setIsPlaying(false);
		setCurrentTime(0);
		setDuration(0);

		if (currentVoiceFile?.converted) {
			const audio = new Audio();
			audio.preload = "auto";
			audio.crossOrigin = "anonymous";
			audio.src = `${VITE_BACKEND_URL}${currentVoiceFile.url}`;
			audioRef.current = audio;

			audio.addEventListener("loadedmetadata", () => {
				setDuration(audio.duration || 0);
			});

			audio.addEventListener("timeupdate", () => {
				setCurrentTime(audio.currentTime);
				setDuration(audio.duration || 0);
			});

			audio.addEventListener("ended", () => {
				setIsPlaying(false);
				setCurrentTime(0);
			});

			audio.addEventListener("error", (e) => {
				console.error("Audio error:", e);
				setIsPlaying(false);
				setIsLoading(false);
			});
		}
	}, [currentVoiceFile?.converted, currentVoiceFile?.url]);

	// Clean up on unmount
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		};
	}, []);

	if (!currentVoiceFile) {
		return (
			<div className="bg-muted/30 rounded-lg p-4 text-center">
				<p className="text-muted text-sm">Select a voice to play</p>
			</div>
		);
	}

	return (
		<div className="bg-surface rounded-lg p-4 border border-border">
			{/* Voice Info */}
			<div className="flex items-center gap-3 mb-4">
				<Volume2 className="h-5 w-5 text-muted" />
				<div>
					<p className="font-medium text-text">{currentVoiceFile.label}</p>
					<p className="text-sm text-muted">{currentVoiceFile.filename}</p>
				</div>
			</div>

			{/* Progress Bar */}
			<div className="mb-4">
				<div className="relative mb-2">
					<Range
						value={currentTime}
						min={0}
						max={effectiveMax}
						step={1}
						onChange={handleSeek}
						disabled={!currentVoiceFile.converted || isLoading}
						size="sm"
						aria-label="Voice seek"
						showThumb
						thumbClassName="group-hover:w-4 group-hover:h-4"
					/>
				</div>
				<div className="flex items-center justify-between text-xs text-muted">
					<span className="font-mono">{formatTime(currentTime)}</span>
					<span className="font-mono">{formatTime(duration)}</span>
				</div>
			</div>

			{/* Controls */}
			<div className="flex items-center justify-center gap-3">
				<Button
					onClick={handlePlayPause}
					disabled={isLoading}
					tone="saya"
					size="icon"
					className={`rounded-full transition-all duration-300 ${
						currentVoiceFile.converted
							? "bg-saya hover:bg-saya/80 text-text"
							: "bg-muted/50 hover:bg-muted/70 text-text/70 cursor-pointer"
					}`}
					title={
						!currentVoiceFile.converted
							? "Convert and play"
							: isPlaying
								? "Pause"
								: "Play"
					}
				>
					{isLoading ? (
						<div className="w-5 h-5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
					) : isPlaying ? (
						<Pause className="w-5 h-5" fill="currentColor" />
					) : (
						<Play className="w-5 h-5" fill="currentColor" />
					)}
				</Button>

				<Button
					onClick={handleStop}
					disabled={!isPlaying}
					variant="soft"
					tone="megu"
					size="sm"
					className="text-sm"
				>
					Stop
				</Button>
				{currentVoiceFile.converted ? (
					<Button
						onClick={handleDownload}
						disabled={isDownloading}
						variant="solid"
						tone="saya"
						size="sm"
						className="cursor-pointer shadow-sm hover:bg-saya/80"
					>
						{isDownloading ? (
							<div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
						) : (
							<Volume2 className="h-4 w-4" />
						)}
						Download M4A
					</Button>
				) : (
					<span className="text-xs text-muted">Convert to enable download</span>
				)}
			</div>

			{/* Status message */}
			{!currentVoiceFile.converted && (
				<div className="mt-3 p-2 bg-suzu/10 border border-suzu/30 rounded text-center">
					<p className="text-sm text-suzu">
						Click Play to convert and play this voice
					</p>
				</div>
			)}
		</div>
	);
};
