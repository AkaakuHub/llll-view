import { Search } from "lucide-react";
import type React from "react";
import Button from "../../../ui/Button";

interface EmptyStateProps {
	className?: string;
	onShowSearch?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	className = "",
	onShowSearch,
}) => {
	return (
		<div
			className={`bg-border/80 shadow-lg border border-border/50 p-8 transition-colors duration-300 ${className}`}
		>
			<div className="text-center items-center flex flex-col h-full justify-center">
				<h3 className="text-xl font-semibold text-text mb-2 transition-colors duration-300">
					Playlist is empty
				</h3>
				<p className="text-muted mb-6 transition-colors duration-300">
					Search for songs to add to your playlist
				</p>
				{onShowSearch && (
					<Button
						onClick={onShowSearch}
						variant="ghost"
						tone="text"
						size="lg"
						className="bg-gradient-to-r from-hime to-saya text-text rounded-xl hover:from-megu hover:to-megu transition-all flex items-center gap-2 mx-auto font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
					>
						<Search className="w-5 h-5" />
						Search Songs
					</Button>
				)}
			</div>
		</div>
	);
};
