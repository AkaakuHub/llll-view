import { BookOpen } from "lucide-react";
import type React from "react";

const StoryHeader: React.FC = () => {
	return (
		<div className="text-center">
			<h2 className="text-2xl font-bold text-text mb-2 flex items-center justify-center gap-2">
				<BookOpen className="w-6 h-6 text-saya" />
				Story Viewer
			</h2>
			<p className="text-muted">Search, read, and play story voices</p>
		</div>
	);
};

export default StoryHeader;
