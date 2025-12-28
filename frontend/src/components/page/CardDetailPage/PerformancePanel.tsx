import type React from "react";
import Range from "../../ui/Range";

interface PerformanceData {
	cardSkills?: Array<{
		id: string;
		skillLevel: number;
		skillCost?: number;
		description?: string;
		cardSkillSeriesId: string;
	}>;
	cardLevels?: Array<{
		id: number;
		cardLevel: number;
		experience: number;
		cumulativeExperience: number;
	}>;
	rarity: number;
}

interface PerformancePanelProps {
	beatPoint?: number;
	orderId?: number;
	loading: boolean;
	data: PerformanceData | null;
	skillIndex: number;
	levelIndex: number;
	setSkillIndex: (value: number) => void;
	setLevelIndex: (value: number) => void;
}

const PerformancePanel: React.FC<PerformancePanelProps> = ({
	beatPoint,
	orderId,
	loading,
	data,
	skillIndex,
	levelIndex,
	setSkillIndex,
	setLevelIndex,
}) => {
	if (loading) {
		return (
			<div className="bg-surface border border-border rounded-xl p-4">
				<h2 className="text-lg font-semibold text-text mb-3">Performance</h2>
				<p className="text-sm text-muted">Loading performance data...</p>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="bg-surface border border-border rounded-xl p-4">
				<h2 className="text-lg font-semibold text-text mb-3">Performance</h2>
				<p className="text-sm text-muted">No performance data available.</p>
			</div>
		);
	}

	const skillCount = data.cardSkills?.length ?? 0;
	const levelCount = data.cardLevels?.length ?? 0;
	const skillIdx = skillCount ? Math.min(skillIndex, skillCount - 1) : 0;
	const levelIdx = levelCount ? Math.min(levelIndex, levelCount - 1) : 0;

	return (
		<div className="bg-surface border border-border rounded-xl p-4">
			<h2 className="text-lg font-semibold text-text mb-3">Performance</h2>
			<div className="space-y-4">
				<div className="flex flex-wrap items-center gap-2 text-xs text-muted">
					<span className="rounded-md bg-surface/80 px-2 py-1">
						Beat {beatPoint ?? "N/A"}
					</span>
					<span className="rounded-md bg-surface/80 px-2 py-1">
						Order {orderId ?? "N/A"}
					</span>
					<span className="rounded-md bg-surface/80 px-2 py-1">
						Rarity {data.rarity}
					</span>
				</div>

				{data.cardSkills && data.cardSkills.length > 0 ? (
					<div className="space-y-2">
						<h3 className="text-sm font-semibold text-text">Card Skills</h3>
						<div className="rounded-lg border border-border bg-surface px-3 py-3">
							<div className="flex items-center justify-between text-xs text-muted mb-2">
								<span>
									Skill {skillIdx + 1} / {skillCount}
								</span>
								<span>Level {data.cardSkills[skillIdx]?.skillLevel}</span>
							</div>
							<Range
								value={skillIdx}
								min={0}
								max={skillCount - 1}
								step={1}
								onChange={(e) => setSkillIndex(parseInt(e.target.value, 10))}
								size="sm"
								aria-label="Card skill slider"
							/>
							<div className="mt-3 text-sm text-text">
								{data.cardSkills[skillIdx]?.description || "No description"}
							</div>
							<div className="mt-1 text-[11px] text-muted">
								Series {data.cardSkills[skillIdx]?.cardSkillSeriesId}
								{typeof data.cardSkills[skillIdx]?.skillCost === "number" && (
									<span className="ml-2">
										Cost {data.cardSkills[skillIdx]?.skillCost}
									</span>
								)}
							</div>
						</div>
					</div>
				) : (
					<p className="text-sm text-muted">No card skills available.</p>
				)}

				{data.cardLevels && data.cardLevels.length > 0 ? (
					<div className="space-y-2">
						<h3 className="text-sm font-semibold text-text">Card Levels</h3>
						<div className="rounded-lg border border-border bg-surface px-3 py-3">
							<div className="flex items-center justify-between text-xs text-muted mb-2">
								<span>
									Level {levelIdx + 1} / {levelCount}
								</span>
								<span>EXP {data.cardLevels[levelIdx]?.experience}</span>
							</div>
							<Range
								value={levelIdx}
								min={0}
								max={levelCount - 1}
								step={1}
								onChange={(e) => setLevelIndex(parseInt(e.target.value, 10))}
								size="sm"
								aria-label="Card level slider"
							/>
							<div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
								<span>Level {data.cardLevels[levelIdx]?.cardLevel}</span>
								<span>EXP {data.cardLevels[levelIdx]?.experience}</span>
								<span className="col-span-2">
									Cumulative {data.cardLevels[levelIdx]?.cumulativeExperience}
								</span>
							</div>
						</div>
					</div>
				) : (
					<p className="text-sm text-muted">No level data.</p>
				)}
			</div>
		</div>
	);
};

export default PerformancePanel;
