import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { VITE_BACKEND_URL } from "../../../../lib/const";
import Button from "../../../ui/Button";
import type { AudioFile } from "../types";

interface PlaylistModalProps {
	showPlaylist: boolean;
	audioFiles: AudioFile[];
	currentTrackIndex: number;
	isPlaying: boolean;
	onClose: () => void;
	onTrackSelect: (index: number) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
	showPlaylist,
	audioFiles,
	currentTrackIndex,
	isPlaying,
	onClose,
	onTrackSelect,
}) => {
	const getImageUrl = (url: string) => {
		if (url.startsWith("assets/")) {
			return `${VITE_BACKEND_URL}/${url}`;
		} else if (url.startsWith("/")) {
			return `${VITE_BACKEND_URL}${url}`;
		}
		return url;
	};

	return (
		<AnimatePresence>
			{showPlaylist && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-surface/70 z-50 flex items-center justify-center p-4 transition-colors duration-300"
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						transition={{ type: "spring", damping: 25, stiffness: 300 }}
						className="w-full max-w-2xl bg-surface/90 rounded-3xl shadow-lg overflow-hidden border border-border/50 transition-colors duration-300"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="p-6 border-b border-border/50 transition-colors duration-300">
							<div className="flex items-center justify-between">
								<div>
									<h4 className="text-2xl font-bold text-text transition-colors duration-300">
										Playing Queue
									</h4>
									<p className="text-sm text-muted mt-1 transition-colors duration-300">
										{audioFiles.length} tracks
									</p>
								</div>
								<Button
									onClick={onClose}
									variant="soft"
									tone="megu"
									size="icon"
									className="rounded-full bg-muted/30 hover:bg-muted/50"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>Close</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</Button>
							</div>
						</div>

						{/* Track List */}
						<div className="max-h-96 overflow-y-auto p-2">
							{audioFiles.map((file, index) => (
								<motion.div
									key={`${file.id}-${index}`}
									whileHover={{ scale: 1.01 }}
									whileTap={{ scale: 0.99 }}
									onClick={() => onTrackSelect(index)}
									className={`p-4 mx-2 rounded-2xl cursor-pointer transition-all group ${
										index === currentTrackIndex
											? "bg-hime/10 border border-hime/40"
											: "hover:bg-muted/20 border border-transparent"
									}`}
								>
									<div className="flex items-center gap-4">
										{/* Track Number or Play Icon */}
										<div className="w-8 h-8 flex items-center justify-center">
											{index === currentTrackIndex && isPlaying ? (
												<div className="flex items-center gap-0.5">
													<div className="w-1 h-4 bg-hime rounded-full animate-pulse" />
													<div className="w-1 h-3 bg-hime/80 rounded-full animate-pulse animation-delay-200" />
													<div className="w-1 h-5 bg-hime rounded-full animate-pulse animation-delay-400" />
												</div>
											) : (
												<span
													className={`text-sm font-medium ${
														index === currentTrackIndex
															? "text-hime"
															: "text-muted group-hover:text-text"
													} transition-colors duration-300`}
												>
													{index + 1}
												</span>
											)}
										</div>

										{/* Thumbnail */}
										{file.thumbnailUrl && (
											<img
												src={getImageUrl(file.thumbnailUrl)}
												alt="Thumbnail"
												className="w-12 h-12 rounded-xl object-cover shadow-sm"
												loading="lazy"
												decoding="async"
											/>
										)}

										{/* Track Info */}
										<div className="flex-1 min-w-0">
											<div
												className={`font-semibold truncate ${
													index === currentTrackIndex
														? "text-hime"
														: "text-text"
												} transition-colors duration-300`}
											>
												{file.title || file.filename}
											</div>
											{file.artist && (
												<div className="text-sm text-muted truncate mt-0.5 transition-colors duration-300">
													{file.artist}
												</div>
											)}
										</div>

										{/* Duration */}
										<div className="text-sm text-muted transition-colors duration-300">
											{file.duration
												? `${Math.floor(file.duration / 60)}:${String(
														Math.floor(file.duration % 60),
													).padStart(2, "0")}`
												: ""}
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
