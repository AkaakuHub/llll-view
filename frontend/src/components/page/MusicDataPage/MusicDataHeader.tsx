import { Music, RefreshCw } from "lucide-react";
import Button from "../../ui/Button";
import type { MusicDataMeta } from "./types";

interface MusicDataHeaderProps {
	onReload: () => void;
	isReloading: boolean;
	meta: MusicDataMeta | null;
}

const MusicDataHeader = ({
	onReload,
	isReloading,
	meta,
}: MusicDataHeaderProps) => {
	return (
		<div className="bg-surface shadow-sm border-b border-border">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
					<div className="flex items-center gap-4">
						<Music className="h-8 w-8 text-saya-500" />
						<div>
							<h1 className="text-2xl font-bold text-text">
								Music Masterdata Viewer
							</h1>
							<p className="text-sm text-muted">
								Music score data parsed from cache/plain masterdata YAML
							</p>
						</div>
					</div>
					<Button
						onClick={onReload}
						disabled={isReloading}
						tone="saya"
						className="flex items-center gap-2 cursor-pointer"
					>
						<RefreshCw
							className={`h-4 w-4 ${isReloading ? "animate-spin" : ""}`}
						/>
						Reload Data
					</Button>
				</div>
				{meta && (
					<div className="pb-4 text-xs text-muted space-y-1">
						<div>
							<span className="font-medium text-text">Source:</span>{" "}
							{meta.source} · scores {meta.musicScoresCount}
						</div>
						<div className="text-[11px] break-all">
							MusicScores: {meta.musicScoresPath}
						</div>
						<div className="text-[11px] break-all">
							Musics: {meta.musicsPath}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MusicDataHeader;
