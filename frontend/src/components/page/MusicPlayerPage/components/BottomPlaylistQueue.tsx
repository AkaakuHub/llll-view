import { useVirtualizer } from "@tanstack/react-virtual";
import {
	ChevronDown,
	ChevronUp,
	GripVertical,
	Music,
	Play,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "../../../../contexts/AudioPlayerContext";
import { VITE_BACKEND_URL } from "../../../../lib/const";
import SidebarTriggerButton from "../../../SidebarTriggerButton";
import Button from "../../../ui/Button";

export default function BottomPlaylistQueue() {
	const {
		audioFiles,
		currentTrackIndex,
		isPlaying,
		setCurrentTrackIndex,
		reorderTracks,
	} = useAudioPlayer();

	const [isExpanded, setIsExpanded] = useState(false);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
	const dragNodeRef = useRef<HTMLDivElement | null>(null);
	const listRef = useRef<HTMLDivElement | null>(null);

	// Resizable height state
	const [queueHeight, setQueueHeight] = useState(320); // Default 320px (max-h-80)
	const [isResizing, setIsResizing] = useState(false);
	const [startY, setStartY] = useState(0);
	const [startHeight, setStartHeight] = useState(0);

	// Resize handlers
	const handleResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setIsResizing(true);
			setStartY(e.clientY);
			setStartHeight(queueHeight);
		},
		[queueHeight],
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isResizing) return;

			const deltaY = startY - e.clientY; // Inverted because we're dragging up to increase height
			const newHeight = Math.max(
				240,
				Math.min(window.innerHeight - 120, startHeight + deltaY),
			);
			setQueueHeight(newHeight);
		},
		[isResizing, startY, startHeight],
	);

	const handleMouseUp = useCallback(() => {
		setIsResizing(false);
	}, []);

	// Global mouse events for resize
	useEffect(() => {
		if (isResizing) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "ns-resize";
			document.body.style.userSelect = "none";

			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};
		}
	}, [isResizing, handleMouseMove, handleMouseUp]);

	const ROW_HEIGHT = 76;
	const virtualizer = useVirtualizer({
		count: audioFiles.length,
		getScrollElement: () => listRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 6,
	});

	useEffect(() => {
		if (!isExpanded) return;
		const height = queueHeight;
		const count = audioFiles.length;
		virtualizer.measure();
		if (!height || count < 0) {
			return;
		}
	}, [isExpanded, queueHeight, audioFiles.length, virtualizer]);

	if (audioFiles.length === 0) {
		return null;
	}

	const handleTrackSelect = (index: number) => {
		setCurrentTrackIndex(index);
	};

	const formatTime = (seconds: number) => {
		if (!seconds || Number.isNaN(seconds)) return "";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// ドラッグ&ドロップハンドラー
	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = "move";

		// ドラッグ中の要素のスタイルを設定
		if (e.currentTarget instanceof HTMLElement) {
			dragNodeRef.current = e.currentTarget as HTMLDivElement;
			setTimeout(() => {
				if (dragNodeRef.current) {
					dragNodeRef.current.style.opacity = "0.5";
				}
			}, 0);
		}
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
		setDragOverIndex(null);
		if (dragNodeRef.current) {
			dragNodeRef.current.style.opacity = "1";
		}
		dragNodeRef.current = null;
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== index) {
			setDragOverIndex(index);
		}
	};

	const handleDragLeave = () => {
		setDragOverIndex(null);
	};

	const handleDrop = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== index) {
			reorderTracks(draggedIndex, index);
		}
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	return (
		<>
			{/* Overlay */}
			{isExpanded && (
				<Button
					aria-label="Close queue"
					variant="ghost"
					tone="text"
					size="sm"
					className="fixed inset-0 bg-surface/50 z-30 cursor-pointer"
					onClick={() => setIsExpanded(false)}
				/>
			)}

			<div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border z-60 pb-safe lg:left-[288px] lg:w-[calc(100vw-288px)]">
				{/* Collapse/Expand Header */}
				<div className="flex items-center gap-2 px-4 py-3">
					<SidebarTriggerButton className="flex-shrink-0" />
					<Button
						aria-expanded={isExpanded}
						variant="ghost"
						tone="text"
						size="sm"
						className="flex flex-1 w-full items-center justify-start text-left hover:bg-surface/50 rounded-lg px-2 py-1"
						onClick={() => setIsExpanded(!isExpanded)}
					>
						<div className="flex items-center space-x-3 min-w-0 flex-1">
							<div className="w-8 h-8 bg-surface rounded flex-shrink-0 flex items-center justify-center">
								<Music size={16} className="text-text" />
							</div>
							<div className="text-left min-w-0">
								<p className="text-text text-sm font-medium">Queue</p>
								<p className="text-muted text-xs truncate">
									{audioFiles.length} tracks • Next:{" "}
									{currentTrackIndex < audioFiles.length - 1
										? audioFiles[currentTrackIndex + 1]?.title ||
											audioFiles[currentTrackIndex + 1]?.filename
										: "End of queue"}
								</p>
							</div>
						</div>

						<div className="flex items-center space-x-2 flex-shrink-0 ml-auto">
							<span className="text-muted text-xs">
								{currentTrackIndex + 1} of {audioFiles.length}
							</span>
							{isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
						</div>
					</Button>
				</div>

				{/* Resize Handle */}
				{isExpanded && (
					<Button
						aria-label="Resize queue"
						variant="ghost"
						tone="text"
						size="sm"
						className="h-1 bg-border hover:bg-border cursor-ns-resize transition-colors duration-200 relative group w-full"
						onMouseDown={handleResizeStart}
					>
						<div className="absolute inset-x-0 -top-1 -bottom-1 flex items-center justify-center group-hover:bg-surface/20">
							<div className="w-8 h-1 bg-text rounded-full"></div>
						</div>
					</Button>
				)}

				{/* Expandable Queue List */}
				{isExpanded && (
					<div
						className={`overflow-hidden opacity-100 ${
							isResizing ? "" : "transition-all duration-200"
						}`}
						style={{
							maxHeight: `${queueHeight}px`,
						}}
					>
						<div
							ref={listRef}
							className="overflow-y-auto"
							style={{ maxHeight: `${queueHeight}px` }}
						>
							<div className="px-4 py-2">
								<h3 className="text-text font-medium mb-3">Up Next</h3>

								<div
									style={{
										height: `${virtualizer.getTotalSize()}px`,
										position: "relative",
									}}
								>
									{virtualizer.getVirtualItems().map((virtualItem) => {
										const index = virtualItem.index;
										const track = audioFiles[index];
										const isCurrent = index === currentTrackIndex;
										const isPrevious = index < currentTrackIndex;

										return (
											<Button
												key={`${track.id}-${index}`}
												draggable={!isCurrent && !isPrevious}
												onDragStart={(e) => handleDragStart(e, index)}
												onDragEnd={handleDragEnd}
												onDragOver={(e) => handleDragOver(e, index)}
												onDragLeave={handleDragLeave}
												onDrop={(e) => handleDrop(e, index)}
												variant="soft"
												tone="megu"
												size="md"
												className={`
                          flex w-full items-center space-x-3 p-3 rounded-lg transition-colors duration-150 text-left absolute left-0 top-0
                          ${
														isCurrent
															? "bg-saya/20 border border-saya/30"
															: isPrevious
																? "bg-surface/30 opacity-70 hover:bg-muted/40 hover:opacity-90"
																: "bg-surface/50 hover:bg-muted/50"
													}
                          ${dragOverIndex === index && draggedIndex !== index ? "border-t-2 border-saya" : ""}
                        `}
												onClick={() => handleTrackSelect(index)}
												style={{
													transform: `translateY(${virtualItem.start}px)`,
													height: `${virtualItem.size}px`,
												}}
											>
												{/* Drag Handle */}
												{!isCurrent && !isPrevious && (
													<div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-muted hover:text-text cursor-grab active:cursor-grabbing">
														<GripVertical size={16} />
													</div>
												)}

												{/* Track Number / Play Indicator */}
												<div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
													{isCurrent && isPlaying ? (
														<div className="flex space-x-1">
															<div className="w-1 h-4 bg-saya animate-pulse"></div>
															<div
																className="w-1 h-4 bg-saya animate-pulse"
																style={{ animationDelay: "0.2s" }}
															></div>
															<div
																className="w-1 h-4 bg-saya animate-pulse"
																style={{ animationDelay: "0.4s" }}
															></div>
														</div>
													) : isCurrent ? (
														<Play
															size={16}
															className="text-saya"
															fill="currentColor"
														/>
													) : (
														<span className="text-muted text-sm">
															{index + 1}
														</span>
													)}
												</div>

												{/* Thumbnail */}
												<div className="w-12 h-12 bg-muted rounded flex-shrink-0 overflow-hidden">
													{track.thumbnailUrl ? (
														<img
															src={
																track.thumbnailUrl.startsWith("http")
																	? track.thumbnailUrl
																	: `${VITE_BACKEND_URL}${track.thumbnailUrl.startsWith("/") ? "" : "/"}${track.thumbnailUrl}`
															}
															alt={track.title || track.filename}
															className="w-full h-full object-cover"
															loading="lazy"
															decoding="async"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<Music size={16} className="text-muted" />
														</div>
													)}
												</div>

												{/* Track Info */}
												<div className="flex-1 min-w-0">
													<p
														className={`font-medium truncate ${isCurrent ? "text-saya" : "text-text"}`}
													>
														{track.title || track.filename}
													</p>
													{track.artist && (
														<p
															className={`text-xs truncate ${isCurrent ? "text-saya" : "text-muted"}`}
														>
															{track.artist}
														</p>
													)}
													<div className="flex items-center space-x-2 text-xs">
														<span
															className={`${isCurrent ? "text-saya" : "text-muted"}`}
														>
															{track.category}
														</span>
														{track.duration && (
															<>
																<span className="text-muted">•</span>
																<span
																	className={`${isCurrent ? "text-saya" : "text-muted"}`}
																>
																	{formatTime(track.duration)}
																</span>
															</>
														)}
													</div>
												</div>

												{/* Status */}
												<div className="flex-shrink-0">
													{isCurrent && (
														<div className="w-2 h-2 bg-saya rounded-full"></div>
													)}
													{isPrevious && (
														<div className="w-2 h-2 bg-muted rounded-full"></div>
													)}
												</div>
											</Button>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
