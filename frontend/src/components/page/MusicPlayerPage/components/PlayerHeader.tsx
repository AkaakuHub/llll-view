import { Search } from "lucide-react";
import type React from "react";
import Button from "../../../ui/Button";
import type { AudioFile } from "../types";
import { PlayerOptionsMenu } from "./PlayerOptionsMenu";

interface PlayerHeaderProps {
	audioFiles: AudioFile[];
	showPlaylist: boolean;
	isReconverting: boolean;
	currentTrack?: AudioFile;
	autoPlay: boolean;
	autoNext: boolean;
	continuousRandomMode: boolean;
	onTogglePlaylist: () => void;
	onShowSearch?: () => void;
	onReconvert: () => Promise<void>;
	onDownload: () => Promise<void>;
	onAutoPlayChange: (checked: boolean) => void;
	onAutoNextChange: (checked: boolean) => void;
	onContinuousRandomModeChange: (checked: boolean) => void;
	// Offset settings
	offsetEnabled: boolean;
	startOffset: number;
	endOffset: number;
	onOffsetEnabledChange: (enabled: boolean) => void;
	onStartOffsetChange: (offset: number) => void;
	onEndOffsetChange: (offset: number) => void;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({
	audioFiles,
	isReconverting,
	currentTrack,
	autoPlay,
	autoNext,
	continuousRandomMode,
	onShowSearch,
	onReconvert,
	onDownload,
	onAutoPlayChange,
	onAutoNextChange,
	onContinuousRandomModeChange,
	offsetEnabled,
	startOffset,
	endOffset,
	onOffsetEnabledChange,
	onStartOffsetChange,
	onEndOffsetChange,
}) => {
	return (
		<div className="flex items-center justify-between p-4">
			<div className="flex items-center gap-3">
				<div className="hidden md:block">
					<h1 className="text-lg font-semibold text-text transition-colors duration-300">
						Now Playing
					</h1>
					<p className="text-sm text-muted transition-colors duration-300">
						{audioFiles.length} tracks in queue
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{onShowSearch && (
					<Button
						onClick={onShowSearch}
						variant="ghost"
						tone="text"
						size="icon"
						className="rounded-full bg-muted/40 hover:bg-muted/60 text-text transition-all duration-300"
					>
						<Search className="w-5 h-5" />
					</Button>
				)}

				<PlayerOptionsMenu
					autoPlay={autoPlay}
					onAutoPlayChange={onAutoPlayChange}
					autoNext={autoNext}
					onAutoNextChange={onAutoNextChange}
					continuousRandomMode={continuousRandomMode}
					onContinuousRandomModeChange={onContinuousRandomModeChange}
					isReconverting={isReconverting}
					currentTrack={currentTrack}
					onReconvert={onReconvert}
					onDownload={onDownload}
					offsetEnabled={offsetEnabled}
					startOffset={startOffset}
					endOffset={endOffset}
					onOffsetEnabledChange={onOffsetEnabledChange}
					onStartOffsetChange={onStartOffsetChange}
					onEndOffsetChange={onEndOffsetChange}
				/>
			</div>
		</div>
	);
};
