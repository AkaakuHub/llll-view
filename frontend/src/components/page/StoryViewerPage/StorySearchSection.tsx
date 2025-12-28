import { Search } from "lucide-react";
import type React from "react";
import Button from "../../ui/Button";

interface StorySearchSectionProps {
	query: string;
	loading: boolean;
	onQueryChange: (value: string) => void;
	onSearch: () => void;
	mode: "story" | "dialogue";
	onModeChange: (value: "story" | "dialogue") => void;
	onReindex: () => void;
	indexing: boolean;
}

const StorySearchSection: React.FC<StorySearchSectionProps> = ({
	query,
	loading,
	onQueryChange,
	onSearch,
	mode,
	onModeChange,
	onReindex,
	indexing,
}) => {
	return (
		<div className="bg-surface rounded-lg p-4 border border-border">
			<h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
				<Search className="w-5 h-5 text-saya" />
				Story Search
			</h3>
			<div className="flex flex-wrap items-center gap-2 mb-3">
				<div className="flex items-center bg-border rounded-lg p-1 text-sm">
					<Button
						onClick={() => onModeChange("story")}
						variant="soft"
						tone="megu"
						size="sm"
						className={`rounded-md ${
							mode === "story"
								? "bg-surface text-text shadow-sm"
								: "bg-transparent text-muted hover:text-text"
						}`}
					>
						Title
					</Button>
					<Button
						onClick={() => onModeChange("dialogue")}
						variant="soft"
						tone="megu"
						size="sm"
						className={`rounded-md ${
							mode === "dialogue"
								? "bg-surface text-text shadow-sm"
								: "bg-transparent text-muted hover:text-text"
						}`}
					>
						Dialogue
					</Button>
				</div>
				{mode === "dialogue" && (
					<div className="flex items-center gap-2">
						<Button
							onClick={onReindex}
							disabled={indexing}
							variant="outline"
							tone="megu"
							size="sm"
							className="text-sm"
						>
							{indexing ? "Indexing..." : "Reindex"}
						</Button>
						{indexing && (
							<span className="text-xs text-muted">Reindexing…</span>
						)}
					</div>
				)}
			</div>
			<div className="flex space-x-2">
				<input
					type="text"
					value={query}
					onChange={(e) => onQueryChange(e.target.value)}
					placeholder={
						mode === "dialogue"
							? "Search exact dialogue text..."
							: "Search by title, description, or ID..."
					}
					className="flex-1 bg-border border border-border rounded-md px-3 py-2 text-text placeholder-muted focus:border-saya focus:outline-none"
					onKeyDown={(e) => e.key === "Enter" && onSearch()}
				/>
				<Button
					onClick={onSearch}
					disabled={loading}
					tone="saya"
					size="md"
					className="rounded-md font-medium hover:bg-megu"
				>
					{loading ? "Searching..." : "Search"}
				</Button>
			</div>
		</div>
	);
};

export default StorySearchSection;
