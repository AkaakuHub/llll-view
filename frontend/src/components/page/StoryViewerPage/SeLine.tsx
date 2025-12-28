import { Download, Pause, Play } from "lucide-react";
import type React from "react";
import Button from "../../ui/Button";

type SeLineProps = {
	events: Array<{
		action: "play" | "stop";
		name: string;
		volume: number;
	}>;
	availableSes: Set<string>;
	playingSe: string | null;
	onSePlay: (name: string) => void;
	onSeDownload: (name: string) => void;
};

const SeLine: React.FC<SeLineProps> = ({
	events,
	availableSes,
	playingSe,
	onSePlay,
	onSeDownload,
}) => {
	if (events.length === 0) return null;

	const playEvents = events.filter((event) => event.action === "play");
	const stopEvents = events.filter((event) => event.action === "stop");
	const lines = [
		...playEvents.map((event) => ({
			label: `SE: ${event.name}`,
			name: event.name,
			canPlay: true,
		})),
		...stopEvents.map((event) => ({
			label: `SE stop: ${event.name}`,
			name: event.name,
			canPlay: false,
		})),
	];

	return (
		<div className="flex items-center space-x-3 p-3 bg-surface rounded-lg shadow-sm">
			<div className="flex items-center gap-3 w-full">
				<div className="w-20 shrink-0 text-sm font-medium text-saya">SE</div>
				<div className="text-text text-sm space-y-2 flex-1">
					{lines.map((line) => (
						<div
							key={`${line.label}-${line.name}`}
							className="flex items-center justify-between gap-3"
						>
							<div className="text-text text-sm">{line.label}</div>
							{line.canPlay ? (
								<div className="flex items-center gap-2">
									<Button
										onClick={() => onSePlay(line.name)}
										disabled={!availableSes.has(line.name)}
										tone="saya"
										size="icon"
										className="rounded-full shadow-md hover:bg-megu disabled:opacity-50"
										title={`Play: ${line.name}`}
									>
										{playingSe === line.name ? (
											<Pause className="w-4 h-4" fill="currentColor" />
										) : (
											<Play className="w-4 h-4" fill="currentColor" />
										)}
									</Button>
									<Button
										onClick={() => onSeDownload(line.name)}
										disabled={!availableSes.has(line.name)}
										variant="soft"
										tone="megu"
										size="icon"
										className="rounded-full shadow-md hover:bg-surface disabled:opacity-50"
										title={`Download: ${line.name}`}
									>
										<Download className="w-4 h-4" />
									</Button>
								</div>
							) : (
								<div className="text-xs text-muted">Stop</div>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default SeLine;
