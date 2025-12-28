import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronDown,
	ChevronUp,
	Music,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Volume2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { VITE_BACKEND_URL } from "../lib/const";
import SidebarTriggerButton from "./SidebarTriggerButton";
import Button from "./ui/Button";
import Range from "./ui/Range";

export default function MiniPlayer() {
	const {
		currentTrack,
		isPlaying,
		currentTime,
		duration,
		volume,
		isLoading,
		togglePlayPause,
		nextTrack,
		previousTrack,
		seekTo,
		setVolume,
	} = useAudioPlayer();

	const navigate = useNavigate();
	const [isExpanded, setIsExpanded] = useState(false);
	const [showVolumeSlider, setShowVolumeSlider] = useState(false);

	// Don't render if no track is loaded
	if (!currentTrack) {
		return null;
	}

	const formatTime = (seconds: number) => {
		if (!seconds || Number.isNaN(seconds)) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = parseFloat(e.target.value);
		seekTo(time);
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = parseFloat(e.target.value);
		setVolume(newVolume);
	};

	const handleExpandToggle = () => {
		setIsExpanded(!isExpanded);
	};

	const handleOpenFullPlayer = () => {
		navigate("/player");
	};

	return (
		<motion.div
			initial={{ y: 100 }}
			animate={{ y: 0 }}
			exit={{ y: 100 }}
			className="fixed bottom-0 left-0 right-0 bg-surface/95 border-t border-border z-50 pb-safe"
		>
			{/* Progress bar at the very top */}
			<div className="absolute top-0 left-0 right-0 h-1 bg-surface">
				<Range
					value={currentTime}
					min={0}
					max={duration || 0}
					step={0.1}
					onChange={handleSeek}
					size="sm"
					showThumb={false}
					aria-label="Mini player seek"
					className="h-1"
					trackClassName="h-1"
				/>
			</div>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="px-4 py-3 border-b border-border"
					>
						{/* Expanded controls */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<span className="text-sm text-muted">
									{formatTime(currentTime)}
								</span>
								<Range
									value={currentTime}
									min={0}
									max={duration || 0}
									step={0.1}
									onChange={handleSeek}
									size="sm"
									aria-label="Mini player seek"
									className="w-32"
								/>
								<span className="text-sm text-muted">
									{formatTime(duration)}
								</span>
							</div>

							<div className="flex items-center space-x-2">
								{/* Volume control */}
								<fieldset
									className="relative"
									onMouseEnter={() => setShowVolumeSlider(true)}
									onMouseLeave={() => setShowVolumeSlider(false)}
									aria-label="Volume control"
								>
									<legend className="sr-only">Volume control</legend>
									<Button
										variant="ghost"
										tone="text"
										size="icon"
										className="rounded-lg hover:bg-surface/80 text-muted"
									>
										<Volume2 size={18} />
									</Button>
									<AnimatePresence>
										{showVolumeSlider && (
											<motion.div
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: 10 }}
												className="absolute bottom-full right-0 mb-2 bg-surface p-3 rounded-lg shadow-lg border border-border"
											>
												<Range
													value={volume}
													min={0}
													max={1}
													step={0.01}
													onChange={handleVolumeChange}
													size="sm"
													aria-label="Mini player volume"
													className="w-20"
												/>
											</motion.div>
										)}
									</AnimatePresence>
								</fieldset>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Main mini player content */}
			<div className="flex items-center px-4 py-3">
				<SidebarTriggerButton className="mr-2" />
				{/* Track info */}
				<Button
					onClick={handleOpenFullPlayer}
					variant="ghost"
					tone="text"
					size="sm"
					className="flex items-center space-x-3 flex-1 min-w-0 text-left p-0 hover:bg-transparent"
				>
					{/* Thumbnail */}
					<div className="w-12 h-12 bg-surface rounded-lg flex-shrink-0 overflow-hidden">
						{currentTrack.thumbnailUrl ? (
							<img
								src={
									currentTrack.thumbnailUrl.startsWith("http")
										? currentTrack.thumbnailUrl
										: `${VITE_BACKEND_URL}${currentTrack.thumbnailUrl.startsWith("/") ? "" : "/"}${currentTrack.thumbnailUrl}`
								}
								alt={currentTrack.title || currentTrack.filename}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<Music className="h-4 w-4 text-muted" />
							</div>
						)}
					</div>

					{/* Track details */}
					<div className="min-w-0 flex-1">
						<p className="text-text text-sm font-medium truncate">
							{currentTrack.title || currentTrack.filename}
						</p>
						<p className="text-muted text-xs truncate">
							{currentTrack.category}
						</p>
					</div>
				</Button>

				{/* Playback controls */}
				<div className="flex items-center space-x-2 flex-shrink-0">
					<Button
						onClick={previousTrack}
						variant="ghost"
						tone="text"
						size="icon"
						className="rounded-lg hover:bg-surface/80 text-muted"
					>
						<SkipBack size={18} />
					</Button>

					<Button
						onClick={togglePlayPause}
						disabled={isLoading}
						tone="saya"
						size="icon"
						className="rounded-full bg-saya hover:bg-saya/80"
					>
						{isLoading ? (
							<div className="w-4 h-4 border-2 border-text border-t-transparent rounded-full animate-spin" />
						) : isPlaying ? (
							<Pause size={18} fill="white" />
						) : (
							<Play size={18} fill="white" />
						)}
					</Button>

					<Button
						onClick={nextTrack}
						variant="ghost"
						tone="text"
						size="icon"
						className="rounded-lg hover:bg-surface/80 text-muted"
					>
						<SkipForward size={18} />
					</Button>
				</div>

				{/* Expand/collapse button */}
				<div className="flex items-center space-x-2 flex-shrink-0 ml-4">
					<Button
						onClick={handleExpandToggle}
						variant="ghost"
						tone="text"
						size="icon"
						className="rounded-lg hover:bg-surface/80 text-muted"
					>
						{isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
					</Button>
				</div>
			</div>
		</motion.div>
	);
}
