import { Volume2, VolumeX } from "lucide-react";
import type React from "react";
import Button from "../../../ui/Button";
import Range from "../../../ui/Range";

interface VolumeControlProps {
	volume: number;
	isMuted: boolean;
	onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onMute: () => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
	volume,
	isMuted,
	onVolumeChange,
	onMute,
}) => {
	return (
		<div className="flex items-center justify-center gap-3">
			<Button
				onClick={onMute}
				variant="ghost"
				tone="text"
				size="icon"
				className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted/70 text-text transition-all duration-300"
			>
				{isMuted || volume === 0 ? (
					<VolumeX className="w-4 h-4" />
				) : (
					<Volume2 className="w-4 h-4" />
				)}
			</Button>

			<div className="w-24 md:w-32">
				<Range
					value={isMuted ? 0 : volume}
					min={0}
					max={1}
					step={0.01}
					onChange={onVolumeChange}
					size="sm"
					aria-label="Volume"
					showThumb
					thumbClassName="group-hover:w-4 group-hover:h-4"
				/>
			</div>
		</div>
	);
};
