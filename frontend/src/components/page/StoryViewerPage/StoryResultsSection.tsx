import { List } from "lucide-react";
import type React from "react";
import Button from "../../ui/Button";
import type { StoryResult } from "./types";

interface StoryResultsSectionProps {
	results: StoryResult[];
	onSelect: (story: StoryResult) => void;
}

const StoryResultsSection: React.FC<StoryResultsSectionProps> = ({
	results,
	onSelect,
}) => {
	if (results.length === 0) return null;

	return (
		<div className="bg-surface rounded-lg p-4 border border-border">
			<h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
				<List className="w-5 h-5 text-saya" />
				Results ({results.length})
			</h3>
			<div className="grid gap-3 max-h-80 overflow-y-auto">
				{results.map((story) => (
					<Button
						key={`${story.table}-${story.Id}`}
						onClick={() => onSelect(story)}
						variant="soft"
						tone="megu"
						size="md"
						className="p-4 w-full justify-start text-left bg-border hover:bg-muted border-l-4 border-saya"
					>
						<div className="font-medium text-saya text-lg">{story.Name}</div>
						<div className="text-sm text-text mt-1">{story.Description}</div>
						{story.text && (
							<div className="text-sm text-muted mt-2">
								<span className="font-medium">Match:</span>{" "}
								<span className="line-clamp-2">{story.text}</span>
							</div>
						)}
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
							{typeof story.dialogueIndex === "number" && (
								<span className="bg-border px-2 py-1 rounded">
									Line: {story.dialogueIndex + 1}
								</span>
							)}
						</div>
					</Button>
				))}
			</div>
		</div>
	);
};

export default StoryResultsSection;
