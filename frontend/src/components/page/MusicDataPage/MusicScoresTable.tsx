import { BarChart3 } from "lucide-react";
import type { MusicScoreRecord } from "./types";

interface MusicScoresTableProps {
	scores: MusicScoreRecord[];
	totalCount: number;
	isFilteredEmpty: boolean;
}

const MusicScoresTable = ({
	scores,
	totalCount,
	isFilteredEmpty,
}: MusicScoresTableProps) => {
	if (scores.length === 0) {
		return (
			<div className="text-center py-12">
				<BarChart3 className="h-16 w-16 text-muted mx-auto mb-4" />
				<h3 className="text-lg font-medium text-text mb-2">
					No Music Scores Found
				</h3>
				<p className="text-muted mb-4">
					{totalCount === 0
						? "Masterdata is empty. Generate masterdata from cache/plain first."
						: isFilteredEmpty
							? "Try adjusting your search or filter criteria."
							: "No scores match the current view."}
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead className="bg-surface">
					<tr>
						<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
							Music ID
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
							Title
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
							Levels (N/H/Ex/M)
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
							Max Combo (N/H/Ex/M)
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
							Exp Gain (N/H/Ex/M)
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
							Reward Series
						</th>
					</tr>
				</thead>
				<tbody className="bg-surface divide-y divide-border">
					{scores.map((score) => (
						<tr key={score.musicId}>
							<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
								{score.musicId}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
								{score.title || "-"}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
								{[
									score.normalLevel,
									score.hardLevel,
									score.expertLevel,
									score.masterLevel,
								]
									.map((value) => value ?? "-")
									.join(" / ")}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
								{[
									score.normalMaxCombo,
									score.hardMaxCombo,
									score.expertMaxCombo,
									score.masterMaxCombo,
								]
									.map((value) => value ?? "-")
									.join(" / ")}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
								{[
									score.normalGainMusicExp,
									score.hardGainMusicExp,
									score.expertGainMusicExp,
									score.masterGainMusicExp,
								]
									.map((value) => value ?? "-")
									.join(" / ")}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
								{score.scoreRewardSeriesId ?? "-"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default MusicScoresTable;
