import { motion } from "framer-motion";
import { Clock, FileText, Heart, Info, LockOpen, Music } from "lucide-react";
import type React from "react";
import { useLike } from "../../../../hooks/useLike";
import { VITE_BACKEND_URL } from "../../../../lib/const";
import Button from "../../../ui/Button";
import type { AudioFile } from "../types";

interface TrackDisplayProps {
	currentTrack?: AudioFile;
	currentTrackIndex: number;
	isLoading: boolean;
	error: string;
	onTrackUpdate?: (track: AudioFile) => void;
	onShowMetadata?: () => void;
}

export const TrackDisplay: React.FC<TrackDisplayProps> = ({
	currentTrack,
	currentTrackIndex,
	isLoading,
	error,
	onTrackUpdate,
	onShowMetadata,
}) => {
	const { isLikeLoading, handleLikeToggle } = useLike({
		currentTrack,
		onTrackUpdate,
	});
	return (
		<div className="flex flex-col lg:flex-row gap-4 md:gap-12 items-center">
			<motion.div
				key={currentTrackIndex}
				initial={{ scale: 0.95, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ duration: 0.3 }}
				className="relative"
			>
				{currentTrack?.thumbnailUrl ? (
					<img
						src={
							currentTrack.thumbnailUrl.startsWith("http")
								? currentTrack.thumbnailUrl
								: `${VITE_BACKEND_URL}${currentTrack.thumbnailUrl.startsWith("/") ? "" : "/"}${currentTrack.thumbnailUrl}`
						}
						alt={`Album Art of ${currentTrack?.title || currentTrack?.filename || "Unknown Track"}`}
						className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-2xl object-cover shadow-lg hover:scale-102 transition-transform duration-200"
						onError={(e) => {
							const target = e.target as HTMLImageElement;
							target.style.display = "none";
						}}
					/>
				) : (
					<div className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 flex items-center justify-center shadow-lg transition-colors duration-300">
						<Music className="h-16 w-16 text-muted/60 transition-colors duration-300" />
					</div>
				)}

				{isLoading && (
					<div className="absolute inset-0 flex items-center justify-center bg-surface/30 rounded-2xl transition-colors duration-300">
						<div className="w-8 h-8 border-2 border-text border-t-transparent rounded-full animate-spin" />
					</div>
				)}
			</motion.div>

			<div className="text-center lg:text-left lg:flex-1 min-w-0">
				<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-text leading-tight transition-colors duration-300">
					{currentTrack?.title || currentTrack?.filename || "No Track Selected"}
				</h1>
				{currentTrack?.artist && (
					<p className="text-lg md:text-xl text-text/80 mb-4 transition-colors duration-300">
						{currentTrack.artist}
					</p>
				)}
				{currentTrack?.album && (
					<p className="text-md text-muted mb-4 transition-colors duration-300">
						{currentTrack.album}
					</p>
				)}

				{/* YAML メタデータの簡易表示 */}
				{currentTrack?.description && (
					<p className="text-sm text-muted mb-2 transition-colors duration-300 inline-flex items-center gap-2">
						<Music className="h-4 w-4" />
						{currentTrack.description}
					</p>
				)}
				{currentTrack?.titleFurigana && (
					<p className="text-sm text-muted mb-2 transition-colors duration-300 inline-flex items-center gap-2">
						<FileText className="h-4 w-4" />
						{currentTrack.titleFurigana}
					</p>
				)}
				{currentTrack?.songTime && (
					<p className="text-sm text-muted mb-2 transition-colors duration-300 inline-flex items-center gap-2">
						<Clock className="h-4 w-4" />
						{Math.floor(currentTrack.songTime / 60000)}:
						{String(
							Math.floor((currentTrack.songTime % 60000) / 1000),
						).padStart(2, "0")}
					</p>
				)}
				{currentTrack?.releaseConditionText && (
					<p className="text-xs text-muted/70 mb-4 transition-colors duration-300 inline-flex items-center gap-2">
						<LockOpen className="h-3.5 w-3.5" />
						{currentTrack.releaseConditionText}
					</p>
				)}

				<div className="flex items-center justify-center lg:justify-start gap-4 mb-4 md:mb-6">
					<Button
						onClick={handleLikeToggle}
						disabled={isLikeLoading}
						variant="ghost"
						tone="text"
						size="icon"
						className={`h-10 w-10 rounded-full transition-all duration-300 ${
							currentTrack?.isLiked
								? "bg-muted/20 hover:bg-muted/30 text-tuzu"
								: "bg-muted/30 hover:bg-muted/50 text-text"
						} ${isLikeLoading ? "opacity-50 cursor-not-allowed" : ""}`}
						title={currentTrack?.isLiked ? "いいねを取り消す" : "いいねする"}
					>
						<Heart
							className={`w-5 h-5 ${currentTrack?.isLiked ? "fill-current" : ""}`}
						/>
					</Button>
					{currentTrack && (
						<Button
							onClick={() => onShowMetadata?.()}
							variant="ghost"
							tone="text"
							size="icon"
							className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50 text-text transition-all duration-300"
							title="楽曲メタデータを表示"
						>
							<Info className="w-5 h-5" />
						</Button>
					)}
				</div>

				{error && (
					<div className="bg-tuzu/10 border border-tuzu/30 rounded-lg p-4 mt-4 transition-colors duration-300">
						<p className="text-tuzu text-sm">{error}</p>
					</div>
				)}
			</div>
		</div>
	);
};
