import { Clock } from "lucide-react";
import type { LiveTimelineRecord } from "../MusicDataPage/types";

interface LiveTimelinesTableProps {
	timelines: LiveTimelineRecord[];
	totalCount: number;
	isFilteredEmpty: boolean;
}

const LiveTimelinesTable = ({
	timelines,
	totalCount,
	isFilteredEmpty,
}: LiveTimelinesTableProps) => {
	if (timelines.length === 0) {
		return (
			<div className="text-center py-12">
				<Clock className="h-16 w-16 text-muted mx-auto mb-4" />
				<h3 className="text-lg font-medium text-text mb-2">
					No Live Timeline Data Found
				</h3>
				<p className="text-muted mb-4">
					{totalCount === 0
						? "Masterdata is empty. Generate masterdata from cache/plain first."
						: isFilteredEmpty
							? "Try adjusting your search or filter criteria."
							: "No timelines match the current view."}
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<div className="max-h-[28rem] overflow-y-auto">
				<table className="w-full">
					<thead className="bg-muted/20 sticky top-0">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
								Timeline ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
								Label
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
								Music ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
								Music Title
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
								Location
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
								Next ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
								Movie IDs
							</th>
						</tr>
					</thead>
					<tbody className="bg-surface divide-y divide-border">
						{timelines.map((timeline) => (
							<tr key={timeline.id}>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
									{timeline.id}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
									{timeline.label || "-"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
									{timeline.musicId ?? "-"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
									{timeline.musicTitle || "-"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
									{timeline.locationsId ?? "-"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
									{timeline.nextId ?? "-"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
									{timeline.movieIds || "-"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default LiveTimelinesTable;
