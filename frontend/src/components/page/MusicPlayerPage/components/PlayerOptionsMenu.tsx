import { AnimatePresence, motion } from "framer-motion";
import { Download, RotateCcw } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import Button from "../../../ui/Button";
import Input from "../../../ui/Input";
import Toggle from "../../../ui/Toggle";
import type { AudioFile } from "../types";
import { ReconvertConfirmModal } from "./ReconvertConfirmModal";

interface PlayerOptionsMenuProps {
	autoPlay: boolean;
	onAutoPlayChange: (checked: boolean) => void;
	autoNext: boolean;
	onAutoNextChange: (checked: boolean) => void;
	continuousRandomMode: boolean;
	onContinuousRandomModeChange: (checked: boolean) => void;
	isReconverting: boolean;
	currentTrack?: AudioFile;
	onReconvert: () => Promise<void>;
	onDownload: () => Promise<void>;
	// Offset settings
	offsetEnabled: boolean;
	startOffset: number;
	endOffset: number;
	onOffsetEnabledChange: (enabled: boolean) => void;
	onStartOffsetChange: (offset: number) => void;
	onEndOffsetChange: (offset: number) => void;
}

const OptionLabel: React.FC<{
	title: string;
	description: string;
	currentValue: boolean;
	onToggle: () => void;
}> = ({ title, description, currentValue, onToggle }) => (
	<div className="flex items-center justify-between group">
		<div className="flex-1">
			<div className="text-sm font-medium text-text group-hover:text-text transition-colors duration-300">
				{title}
			</div>
			<div className="text-xs text-muted mt-0.5 transition-colors duration-300">
				{description}
			</div>
		</div>
		<div className="ml-3">
			<Toggle checked={currentValue} onChange={onToggle} />
		</div>
	</div>
);

export const PlayerOptionsMenu: React.FC<PlayerOptionsMenuProps> = ({
	autoPlay,
	onAutoPlayChange,
	autoNext,
	onAutoNextChange,
	continuousRandomMode,
	onContinuousRandomModeChange,
	isReconverting,
	currentTrack,
	onReconvert,
	onDownload,
	offsetEnabled,
	startOffset,
	endOffset,
	onOffsetEnabledChange,
	onStartOffsetChange,
	onEndOffsetChange,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [showReconvertModal, setShowReconvertModal] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const toggleAutoPlay = () => {
		onAutoPlayChange(!autoPlay);
	};

	const toggleAutoNext = () => {
		onAutoNextChange(!autoNext);
	};

	const toggleContinuousRandomMode = () => {
		onContinuousRandomModeChange(!continuousRandomMode);
	};

	const handleReconvertClick = () => {
		setShowReconvertModal(true);
		setIsOpen(false);
	};

	const handleReconvertConfirm = async () => {
		await onReconvert();
		setShowReconvertModal(false);
	};

	const handleReconvertCancel = () => {
		setShowReconvertModal(false);
	};

	const handleDownloadClick = async () => {
		await onDownload();
		setIsOpen(false);
	};

	return (
		<div className="relative" ref={menuRef}>
			<Button
				onClick={() => setIsOpen(!isOpen)}
				variant="ghost"
				tone="text"
				size="icon"
				className="rounded-full bg-muted/40 hover:bg-muted/60 text-text transition-all duration-300"
				aria-label="Player options"
			>
				<svg
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Player options</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
					/>
				</svg>
			</Button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: -10 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
						className="absolute right-0 top-full mt-2 w-64 bg-surface/95 border border-border/50 rounded-xl shadow-lg z-50 transition-colors duration-300 overflow-y-auto max-h-[calc(80vh-60px)]"
					>
						<div className="p-4">
							<div className="space-y-3">
								<div className="text-xs font-medium text-muted transition-colors duration-300 uppercase tracking-wider mb-3">
									Player Options
								</div>
								<OptionLabel
									title="Auto-play"
									description="Start playing immediately when track loads"
									currentValue={autoPlay}
									onToggle={toggleAutoPlay}
								/>
								<OptionLabel
									title="Auto-next"
									description="Continue to next track when current ends"
									currentValue={autoNext}
									onToggle={toggleAutoNext}
								/>
								<OptionLabel
									title="Continuous Random Mode"
									description="Auto-add random songs to queue when enabled"
									currentValue={continuousRandomMode}
									onToggle={toggleContinuousRandomMode}
								/>

								{/* Offset Settings */}
								<div className="border-t border-border/50 transition-colors duration-300 pt-3 mt-3">
									<div className="text-xs font-medium text-muted transition-colors duration-300 uppercase tracking-wider mb-3">
										Audio Offset
									</div>
									<OptionLabel
										title="Enable Offset"
										description="Skip beginning/ending silence"
										currentValue={offsetEnabled}
										onToggle={() => onOffsetEnabledChange(!offsetEnabled)}
									/>
									{offsetEnabled && (
										<div className="mt-3 space-y-3">
											<div>
												<label
													htmlFor="player-offset-start"
													className="text-xs font-medium text-text transition-colors duration-300 mb-1 block"
												>
													Start Offset (ms)
												</label>
												<Input
													id="player-offset-start"
													type="number"
													min="0"
													max="10000"
													step="100"
													value={startOffset}
													onChange={(e) =>
														onStartOffsetChange(parseInt(e.target.value) || 0)
													}
													className="w-full px-3 py-2 bg-border border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-hime focus:border-transparent"
												/>
											</div>
											<div>
												<label
													htmlFor="player-offset-end"
													className="text-xs font-medium text-text transition-colors duration-300 mb-1 block"
												>
													End Offset (ms)
												</label>
												<Input
													id="player-offset-end"
													type="number"
													min="0"
													max="10000"
													step="100"
													value={endOffset}
													onChange={(e) =>
														onEndOffsetChange(parseInt(e.target.value) || 0)
													}
													className="w-full px-3 py-2 bg-border border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-hime focus:border-transparent"
												/>
											</div>
										</div>
									)}
								</div>

								<div className="border-t border-border/50 transition-colors duration-300 pt-3 mt-3">
									<div className="text-xs font-medium text-muted transition-colors duration-300 uppercase tracking-wider mb-3">
										Actions
									</div>
									<div className="space-y-2">
										<Button
											onClick={handleDownloadClick}
											disabled={!currentTrack}
											variant="ghost"
											tone="text"
											size="md"
											className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-border/60 group"
										>
											<div className="p-2 rounded-full bg-border/60 group-hover:bg-saya/20 transition-colors duration-300">
												<Download className="w-4 h-4 text-text group-hover:text-saya transition-colors duration-300" />
											</div>
											<div className="flex-1 text-left">
												<div className="text-sm font-medium text-text group-hover:text-text transition-colors duration-300">
													Download Track
												</div>
												<div className="text-xs text-muted transition-colors duration-300 mt-0.5">
													Save current track
												</div>
											</div>
										</Button>
										<Button
											onClick={handleReconvertClick}
											disabled={isReconverting || !currentTrack}
											variant="ghost"
											tone="text"
											size="md"
											className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-border/60 group"
										>
											<div
												className={`p-2 rounded-full transition-colors duration-300 ${
													isReconverting
														? "bg-kaho/20"
														: "bg-border/60 group-hover:bg-kaho/20"
												}`}
											>
												<RotateCcw
													className={`w-4 h-4 transition-colors duration-300 ${
														isReconverting
															? "text-kaho animate-spin"
															: "text-text group-hover:text-kaho"
													}`}
												/>
											</div>
											<div className="flex-1 text-left">
												<div className="text-sm font-medium text-text group-hover:text-text transition-colors duration-300">
													{isReconverting
														? "Re-encoding..."
														: "Re-encode Track"}
												</div>
												<div className="text-xs text-muted transition-colors duration-300 mt-0.5">
													{isReconverting
														? "Processing audio file..."
														: "Re-process the current audio file"}
												</div>
											</div>
										</Button>
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<ReconvertConfirmModal
				isOpen={showReconvertModal}
				isReconverting={isReconverting}
				trackTitle={currentTrack?.title}
				onConfirm={handleReconvertConfirm}
				onCancel={handleReconvertCancel}
			/>
		</div>
	);
};
