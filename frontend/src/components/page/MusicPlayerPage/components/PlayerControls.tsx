import {
	Pause,
	Play,
	Repeat,
	Repeat1,
	Shuffle,
	SkipBack,
	SkipForward,
} from "lucide-react";
import React from "react";
import Button from "../../../ui/Button";
import type { AudioFile, RepeatMode } from "../types";

interface PlayerControlsProps {
	isPlaying: boolean;
	isLoading: boolean;
	currentTrack?: AudioFile;
	isShuffled: boolean;
	repeatMode: RepeatMode;
	onPlayPause: () => Promise<void>;
	onNext: () => void;
	onPrevious: () => void;
	onShuffleToggle: () => void;
	onRepeatCycle: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
	isPlaying,
	isLoading,
	currentTrack,
	isShuffled,
	repeatMode,
	onPlayPause,
	onNext,
	onPrevious,
	onShuffleToggle,
	onRepeatCycle,
}) => {
	const getRepeatIcon = () => {
		switch (repeatMode) {
			case "one":
				return Repeat1;
			case "all":
				return Repeat;
			default:
				return Repeat;
		}
	};
	return (
		<div className="flex items-center justify-center gap-4 mb-8">
			<Button
				onClick={onShuffleToggle}
				variant="ghost"
				tone="text"
				size="icon"
				className={`h-10 w-10 rounded-full transition-all duration-300 ${
					isShuffled
						? "bg-muted/60 text-text hover:bg-muted/70"
						: "bg-muted/30 text-muted hover:bg-muted/50 hover:text-text"
				}`}
			>
				<Shuffle className="w-5 h-5" />
			</Button>

			<Button
				onClick={onPrevious}
				disabled={isLoading}
				variant="ghost"
				tone="text"
				size="icon"
				className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50 text-text transition-all duration-300"
			>
				<SkipBack className="w-6 h-6" fill="currentColor" />
			</Button>

			<Button
				onClick={onPlayPause}
				disabled={isLoading || !currentTrack}
				variant="ghost"
				tone="text"
				size="icon"
				className="h-18 w-18 rounded-full bg-surface text-text hover:bg-surface/90 transition-all duration-300"
			>
				{isPlaying ? (
					<Pause className="w-10 h-10" fill="currentColor" />
				) : (
					<Play className="w-10 h-10" fill="currentColor" />
				)}
			</Button>

			<Button
				onClick={onNext}
				disabled={isLoading}
				variant="ghost"
				tone="text"
				size="icon"
				className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50 text-text transition-all duration-300"
			>
				<SkipForward className="w-6 h-6" fill="currentColor" />
			</Button>

			<Button
				onClick={onRepeatCycle}
				variant="ghost"
				tone="text"
				size="icon"
				className={`h-10 w-10 rounded-full transition-all duration-300 ${
					repeatMode !== "off"
						? "bg-muted/60 text-text hover:bg-muted/70"
						: "bg-muted/30 text-muted hover:bg-muted/50 hover:text-text"
				}`}
			>
				{React.createElement(getRepeatIcon(), { className: "w-5 h-5" })}
			</Button>
		</div>
	);
};
