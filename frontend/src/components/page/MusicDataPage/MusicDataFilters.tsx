import { Filter, Search } from "lucide-react";

interface MusicDataFiltersProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	musicIdFilter: number | null;
	onMusicIdChange: (value: number | null) => void;
	musicIdOptions: number[];
}

const MusicDataFilters = ({
	searchTerm,
	onSearchChange,
	musicIdFilter,
	onMusicIdChange,
	musicIdOptions,
}: MusicDataFiltersProps) => {
	return (
		<div className="bg-surface border-b border-border">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
					<div className="flex-1 max-w-md">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted h-4 w-4" />
							<input
								type="text"
								placeholder="Search by title, ID, or label..."
								value={searchTerm}
								onChange={(e) => onSearchChange(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface text-text"
							/>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4 text-muted" />
						<select
							value={musicIdFilter ?? ""}
							onChange={(e) =>
								onMusicIdChange(
									e.target.value ? parseInt(e.target.value, 10) : null,
								)
							}
							className="border border-border rounded-lg bg-surface text-text px-3 py-2 cursor-pointer"
						>
							<option value="">All Music IDs</option>
							{musicIdOptions.map((musicId) => (
								<option key={musicId} value={musicId}>
									Music ID {musicId}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>
		</div>
	);
};

export default MusicDataFilters;
