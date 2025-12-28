import { motion } from "framer-motion";
import type React from "react";
import { useState } from "react";
import { useAudioPlayer as useGlobalAudioPlayer } from "../../../contexts/AudioPlayerContext";
import { VITE_BACKEND_URL } from "../../../lib/const";
import BottomPlaylistQueue from "./components/BottomPlaylistQueue";
import { EmptyState } from "./components/EmptyState";
import { PlayerControls } from "./components/PlayerControls";
import { PlayerHeader } from "./components/PlayerHeader";
import { PlaylistModal } from "./components/PlaylistModal";
import { ProgressBar } from "./components/ProgressBar";
import { TrackDisplay } from "./components/TrackDisplay";
import { VolumeControl } from "./components/VolumeControl";
import type { AudioPlayerProps } from "./types";

const AudioPlayer: React.FC<AudioPlayerProps> = (props) => {
	const {
		audioFiles,
		currentTrack,
		currentTrackIndex,
		isPlaying,
		currentTime,
		duration,
		volume,
		isLoading,
		error,
		shuffle: isShuffled,
		repeat: repeatMode,
		autoPlay,
		autoNext,
		continuousRandomMode,
		togglePlayPause,
		nextTrack,
		previousTrack,
		seekTo,
		setVolume,
		toggleShuffle,
		toggleRepeat,
		toggleAutoPlay,
		toggleAutoNext,
		toggleContinuousRandomMode,
		downloadCurrentTrack,
		setCurrentTrackIndex,
		updateTrack,
		// Offset settings
		offsetEnabled,
		startOffset,
		endOffset,
		setStartOffset,
		setEndOffset,
		toggleOffsetEnabled,
	} = useGlobalAudioPlayer();

	const [showPlaylist, setShowPlaylist] = useState(false);
	const [previousVolume, setPreviousVolume] = useState(1);
	// const [isDesktop, setIsDesktop] = useState(false);

	const { className = "", onShowSearch, onShowMetadata } = props;

	// // ウィンドウサイズ監視
	// useEffect(() => {
	// 	const handleResize = () => {
	// 		setIsDesktop(window.innerWidth >= 1024);
	// 	};

	// 	handleResize();
	// 	window.addEventListener("resize", handleResize);
	// 	return () => window.removeEventListener("resize", handleResize);
	// }, []);

	// // Debug logging
	// console.log("AudioPlayer Debug:", {
	// 	audioFilesLength: audioFiles.length,
	// 	currentTrackIndex,
	// 	currentTrack: currentTrack
	// 		? {
	// 				id: currentTrack.id,
	// 				filename: currentTrack.filename,
	// 				title: currentTrack.title,
	// 				url: currentTrack.url,
	// 			}
	// 		: null,
	// });

	if (!audioFiles.length) {
		return <EmptyState className={className} onShowSearch={onShowSearch} />;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className={`relative h-full min-h-0 overflow-hidden ${className}`}
		>
			{/* Base Background with theme-aware gradients */}
			<div className="absolute inset-0 bg-gradient-to-br from-border to-saya/20" />

			{/* Theme-aware overlay */}
			<div className="absolute inset-0 bg-surface/70" />

			{/* Background image with theme-aware opacity */}
			{currentTrack?.thumbnailUrl && (
				<div
					className="absolute inset-0 bg-cover bg-center opacity-20 transition-opacity duration-300"
					style={{
						backgroundImage: `url(${currentTrack.thumbnailUrl.startsWith("http") ? currentTrack.thumbnailUrl : `${VITE_BACKEND_URL}${currentTrack.thumbnailUrl.startsWith("/") ? "" : "/"}${currentTrack.thumbnailUrl}`})`,
					}}
				/>
			)}

			{/* Additional gradient overlay for better contrast */}
			<div className="absolute inset-0 bg-gradient-to-t from-border/50 via-transparent to-surface/30" />

			<div className="relative z-10 h-full overflow-y-auto pb-queue-header-safe hide-scrollbar">
				<div className="flex min-h-full flex-col text-text transition-colors duration-300">
					{/* Header */}
					<PlayerHeader
						audioFiles={audioFiles}
						showPlaylist={showPlaylist}
						isReconverting={false}
						currentTrack={currentTrack || undefined}
						autoPlay={autoPlay}
						autoNext={autoNext}
						continuousRandomMode={continuousRandomMode}
						onTogglePlaylist={() => setShowPlaylist(!showPlaylist)}
						onShowSearch={onShowSearch}
						onReconvert={async () => {}}
						onDownload={downloadCurrentTrack}
						onAutoPlayChange={toggleAutoPlay}
						onAutoNextChange={toggleAutoNext}
						onContinuousRandomModeChange={toggleContinuousRandomMode}
						offsetEnabled={offsetEnabled}
						startOffset={startOffset}
						endOffset={endOffset}
						onOffsetEnabledChange={toggleOffsetEnabled}
						onStartOffsetChange={setStartOffset}
						onEndOffsetChange={setEndOffset}
					/>

					{/* Main Content Layout - Desktop: side by side, Mobile: tabs */}
					<div className="flex flex-col lg:flex-row">
						{/* Player Section */}
						<div
							className={`flex flex-col justify-center px-4 md:px-8 pb-4 lg:flex-1 lg:w-1/2 flex-1`}
						>
							{/* Track Art & Info */}
							<TrackDisplay
								currentTrack={currentTrack || undefined}
								currentTrackIndex={currentTrackIndex}
								isLoading={isLoading}
								error={error || ""}
								onTrackUpdate={updateTrack}
								onShowMetadata={onShowMetadata}
							/>

							{/* Spacing between header and seek bar */}
							<div className="h-0 md:h-12"></div>

							{/* Progress Bar */}
							<ProgressBar
								currentTime={currentTime}
								duration={duration}
								onSeek={(e) => seekTo(parseFloat(e.target.value))}
								formatTime={(seconds: number) => {
									if (!seconds || Number.isNaN(seconds)) return "0:00";
									const mins = Math.floor(seconds / 60);
									const secs = Math.floor(seconds % 60);
									return `${mins}:${secs.toString().padStart(2, "0")}`;
								}}
							/>

							{/* Main Controls */}
							<PlayerControls
								isPlaying={isPlaying}
								isLoading={isLoading}
								currentTrack={currentTrack || undefined}
								isShuffled={isShuffled}
								repeatMode={repeatMode}
								onPlayPause={togglePlayPause}
								onNext={nextTrack}
								onPrevious={previousTrack}
								onShuffleToggle={toggleShuffle}
								onRepeatCycle={toggleRepeat}
							/>

							{/* Volume Control */}
							<VolumeControl
								volume={volume}
								isMuted={volume === 0}
								onVolumeChange={(e) => {
									const newVolume = parseFloat(e.target.value);
									if (newVolume > 0) {
										setPreviousVolume(newVolume);
									}
									setVolume(newVolume);
								}}
								onMute={() => {
									if (volume === 0) {
										// ミュート解除: 前の音量に戻す
										setVolume(previousVolume);
									} else {
										// ミュート: 現在の音量を記憶してから0にする
										setPreviousVolume(volume);
										setVolume(0);
									}
								}}
							/>
						</div>
					</div>

					{/* Playlist Modal */}
					<PlaylistModal
						showPlaylist={showPlaylist}
						audioFiles={audioFiles}
						currentTrackIndex={currentTrackIndex}
						isPlaying={isPlaying}
						onClose={() => setShowPlaylist(false)}
						onTrackSelect={setCurrentTrackIndex}
					/>
				</div>
			</div>

			{/* Bottom Playlist Queue */}
			<BottomPlaylistQueue />
		</motion.div>
	);
};

export default AudioPlayer;
