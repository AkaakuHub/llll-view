import type React from "react";
import Range from "../../ui/Range";

interface MusicData {
	musicScores?: Array<{
		id: number;
		normalLevel?: number;
		hardLevel?: number;
		expertLevel?: number;
		masterLevel?: number;
		normalMaxCombo?: number;
		hardMaxCombo?: number;
		expertMaxCombo?: number;
		masterMaxCombo?: number;
		shouldVerifyNotesCount?: number;
		scoreRewardSeriesId?: number;
	}>;
	liveTimelines?: Array<{
		id: number;
		label?: string;
		musicId?: number;
		locationsId?: number;
		freeId?: number;
		nextId?: number;
		movieIds?: string;
	}>;
}

interface MusicDataPanelProps {
	loading: boolean;
	data: MusicData | null;
	scoreIndex: number;
	timelineIndex: number;
	setScoreIndex: (value: number) => void;
	setTimelineIndex: (value: number) => void;
}

const MusicDataPanel: React.FC<MusicDataPanelProps> = ({
	loading,
	data,
	scoreIndex,
	timelineIndex,
	setScoreIndex,
	setTimelineIndex,
}) => {
	if (loading) {
		return (
			<div className="bg-surface border border-border rounded-xl p-4">
				<h2 className="text-lg font-semibold text-text mb-3">Music Data</h2>
				<p className="text-sm text-muted">Loading music data...</p>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="bg-surface border border-border rounded-xl p-4">
				<h2 className="text-lg font-semibold text-text mb-3">Music Data</h2>
				<p className="text-sm text-muted">No music data.</p>
			</div>
		);
	}

	const scoreCount = data.musicScores?.length ?? 0;
	const timelineCount = data.liveTimelines?.length ?? 0;
	const scoreIdx = scoreCount ? Math.min(scoreIndex, scoreCount - 1) : 0;
	const timelineIdx = timelineCount
		? Math.min(timelineIndex, timelineCount - 1)
		: 0;

	return (
		<div className="bg-surface border border-border rounded-xl p-4">
			<h2 className="text-lg font-semibold text-text mb-3">Music Data</h2>
			<div className="space-y-4">
				{data.musicScores && data.musicScores.length > 0 ? (
					<div className="space-y-2">
						<h3 className="text-sm font-semibold text-text">Scores</h3>
						<div className="rounded-lg border border-border bg-surface px-3 py-3">
							<div className="flex items-center justify-between text-xs text-muted mb-2">
								<span>
									Score {scoreIdx + 1} / {scoreCount}
								</span>
								<span>ID {data.musicScores[scoreIdx]?.id}</span>
							</div>
							<Range
								value={scoreIdx}
								min={0}
								max={scoreCount - 1}
								step={1}
								onChange={(e) => setScoreIndex(parseInt(e.target.value, 10))}
								size="sm"
								aria-label="Music score slider"
							/>
							<div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
								<span>
									N/H/E/M {data.musicScores[scoreIdx]?.normalLevel ?? "-"} /{" "}
									{data.musicScores[scoreIdx]?.hardLevel ?? "-"} /{" "}
									{data.musicScores[scoreIdx]?.expertLevel ?? "-"} /{" "}
									{data.musicScores[scoreIdx]?.masterLevel ?? "-"}
								</span>
								<span>
									Combo {data.musicScores[scoreIdx]?.normalMaxCombo ?? "-"} /{" "}
									{data.musicScores[scoreIdx]?.hardMaxCombo ?? "-"} /{" "}
									{data.musicScores[scoreIdx]?.expertMaxCombo ?? "-"} /{" "}
									{data.musicScores[scoreIdx]?.masterMaxCombo ?? "-"}
								</span>
							</div>
						</div>
					</div>
				) : (
					<p className="text-sm text-muted">No music scores.</p>
				)}

				{data.liveTimelines && data.liveTimelines.length > 0 ? (
					<div className="space-y-2">
						<h3 className="text-sm font-semibold text-text">Live Timelines</h3>
						<div className="rounded-lg border border-border bg-surface px-3 py-3">
							<div className="flex items-center justify-between text-xs text-muted mb-2">
								<span>
									Timeline {timelineIdx + 1} / {timelineCount}
								</span>
								<span>ID {data.liveTimelines[timelineIdx]?.id}</span>
							</div>
							<Range
								value={timelineIdx}
								min={0}
								max={timelineCount - 1}
								step={1}
								onChange={(e) => setTimelineIndex(parseInt(e.target.value, 10))}
								size="sm"
								aria-label="Live timeline slider"
							/>
							<div className="mt-3 text-sm text-text">
								{data.liveTimelines[timelineIdx]?.label ||
									data.liveTimelines[timelineIdx]?.id}
							</div>
							<div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
								<span>
									Music {data.liveTimelines[timelineIdx]?.musicId ?? "N/A"}
								</span>
								<span>
									Loc {data.liveTimelines[timelineIdx]?.locationsId ?? "N/A"}
								</span>
								<span>
									Free {data.liveTimelines[timelineIdx]?.freeId ?? "N/A"}
								</span>
							</div>
						</div>
					</div>
				) : (
					<p className="text-sm text-muted">No live timelines.</p>
				)}
			</div>
		</div>
	);
};

export default MusicDataPanel;
