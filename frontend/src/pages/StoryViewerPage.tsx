import StoryViewer from "../components/page/StoryViewerPage/StoryViewer";

export default function StoryPage() {
	return (
		<div className="min-h-screen-safe bg-surface p-6 transition-colors duration-300">
			<div className="container mx-auto px-4 max-w-6xl">
				<StoryViewer />
			</div>
		</div>
	);
}
