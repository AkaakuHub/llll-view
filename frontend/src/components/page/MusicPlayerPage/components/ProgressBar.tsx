import type React from "react";
import Range from "../../../ui/Range";

interface ProgressBarProps {
	currentTime: number;
	duration: number;
	onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
	formatTime: (time: number) => string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
	currentTime,
	duration,
	onSeek,
	formatTime,
}) => {
	return (
		<div className="mb-0 md:mb-8">
			<div className="relative mb-3">
				<Range
					value={currentTime}
					min={0}
					max={duration || 0}
					step={1}
					onChange={onSeek}
					size="md"
					aria-label="Seek"
					showThumb
					thumbClassName="group-hover:w-5 group-hover:h-5"
				/>
			</div>
			<div className="flex items-center justify-between text-sm text-muted">
				<span className="font-mono">{formatTime(currentTime)}</span>
				<span className="font-mono">{formatTime(duration)}</span>
			</div>
		</div>
	);
};
