import { Sparkles } from "lucide-react";
import type React from "react";
import Button from "../../ui/Button";
import type { StoryResult } from "./types";

interface LatestStoriesSectionProps {
	latestStories: StoryResult[];
	latestHasMore: boolean;
	latestLoading: boolean;
	onRefresh: () => void;
	onLoadMore: () => void;
	onSelect: (story: StoryResult) => void;
	formatStoryTime: (value?: string) => string;
}

const LatestStoriesSection: React.FC<LatestStoriesSectionProps> = ({
	latestStories,
	latestHasMore,
	latestLoading,
	onRefresh,
	onLoadMore,
	onSelect,
	formatStoryTime,
}) => {
	return (
		<div className="bg-surface rounded-lg p-4 border border-border">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-text flex items-center gap-2">
					<Sparkles className="w-5 h-5 text-kozu" />
					Latest Stories
				</h3>
				<Button
					onClick={onRefresh}
					disabled={latestLoading}
					variant="soft"
					tone="megu"
					size="sm"
					className="text-sm"
				>
					{latestLoading ? "Refreshing..." : "Refresh"}
				</Button>
			</div>
			{latestStories.length === 0 && !latestLoading ? (
				<div className="text-sm text-muted">No stories found.</div>
			) : (
				<div className="grid gap-3 max-h-80 overflow-y-auto">
					{latestStories.map((story) => (
						<Button
							key={`latest-${story.table}-${story.Id}`}
							onClick={() => onSelect(story)}
							variant="soft"
							tone="megu"
							size="md"
							className="p-4 w-full justify-start text-left bg-border hover:bg-surface border-l-4 border-kozu"
						>
							<div className="font-medium text-kozu text-lg">{story.Name}</div>
							<div className="text-sm text-text mt-1">{story.Description}</div>
							<div className="text-xs text-muted mt-2 flex flex-wrap gap-2">
								<span className="bg-border px-2 py-1 rounded">
									{story.storyType}
								</span>
								<span className="bg-border px-2 py-1 rounded">
									ID: {story.Id}
								</span>
								{story.ScriptId !== undefined && (
									<span className="bg-border px-2 py-1 rounded">
										Script: {story.ScriptId}
									</span>
								)}
								{story.StartTime && (
									<span className="bg-border px-2 py-1 rounded">
										Release: {formatStoryTime(story.StartTime)}
									</span>
								)}
							</div>
						</Button>
					))}
				</div>
			)}
			{latestHasMore && (
				<div className="mt-3 flex justify-center">
					<Button
						onClick={onLoadMore}
						disabled={latestLoading}
						tone="kozu"
						size="md"
						className="text-sm hover:bg-megu"
					>
						{latestLoading ? "Loading..." : "Load more"}
					</Button>
				</div>
			)}
		</div>
	);
};

export default LatestStoriesSection;
