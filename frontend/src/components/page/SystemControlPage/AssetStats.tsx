import { useCallback, useEffect, useState } from "react";
import { fetcher } from "../../../lib/fetcher";
import Button from "../../ui/Button";

interface AssetStats {
	downloaded: number;
	totalExpected: number;
	totalSize: number;
	progress: string;
	formattedSize: string;
	breakdown?: {
		assetBundles: number;
		storyFiles: number;
		audioFiles: number;
		otherFiles: number;
	};
	error?: string;
}

const AssetStats = () => {
	const [stats, setStats] = useState<AssetStats | null>(null);
	const [loading, setLoading] = useState(false);

	const loadStats = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetcher("/files/assets/stats");
			const data = await response.json();
			setStats(data);
		} catch (error) {
			console.error("Failed to load asset stats:", error);
			setStats({
				downloaded: 0,
				totalExpected: 0,
				totalSize: 0,
				progress: "0",
				formattedSize: "0 B",
				error: error instanceof Error ? error.message : "Failed to load stats",
			});
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		loadStats();
		// Auto-refresh every 10 seconds during download
		const interval = setInterval(loadStats, 10000);
		return () => clearInterval(interval);
	}, [loadStats]);

	if (loading && !stats) {
		return (
			<div className="bg-muted/50 rounded-lg p-4">
				<div className="animate-pulse">
					<div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
					<div className="h-4 bg-muted rounded w-1/2"></div>
				</div>
			</div>
		);
	}

	if (!stats) return null;

	return (
		<div className="bg-surface rounded-lg p-4">
			<div className="flex items-center justify-between mb-3">
				<h4 className="font-medium text-text">Asset Download Progress</h4>
				<Button
					onClick={loadStats}
					disabled={loading}
					variant="soft"
					tone="megu"
					size="sm"
				>
					{loading ? "Refreshing..." : "Refresh"}
				</Button>
			</div>

			{stats.error ? (
				<div className="text-tuzu text-sm">{stats.error}</div>
			) : (
				<div className="space-y-3">
					<div className="flex justify-between text-sm">
						<span className="text-muted">Downloaded:</span>
						<span className="text-text">
							{stats.downloaded.toLocaleString()} /{" "}
							{stats.totalExpected.toLocaleString()}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-muted">Size:</span>
						<span className="text-text">{stats.formattedSize}</span>
					</div>

					<div>
						<div className="flex justify-between text-sm mb-1">
							<span className="text-muted">Progress:</span>
							<span className="text-text">{stats.progress}%</span>
						</div>
						<div className="w-full bg-muted rounded-full h-2">
							<div
								className="bg-saya h-2 rounded-full transition-all duration-300"
								style={{
									width: `${Math.min(parseFloat(stats.progress), 100)}%`,
								}}
							></div>
						</div>
					</div>

					{stats.downloaded > 0 && stats.totalExpected > 0 && (
						<div className="text-xs text-muted">
							Remaining:{" "}
							{(stats.totalExpected - stats.downloaded).toLocaleString()} files
						</div>
					)}

					{/* Detailed Breakdown */}
					{stats.breakdown && (
						<div className="mt-4 pt-3 border-t border-border">
							<div className="text-xs text-muted mb-2">
								File Type Breakdown:
							</div>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div className="flex justify-between">
									<span className="text-muted">Asset Bundles:</span>
									<span className="text-saya">
										{stats.breakdown.assetBundles.toLocaleString()}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted">Story Files:</span>
									<span className="text-kozu">
										{stats.breakdown.storyFiles.toLocaleString()}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted">Audio Files:</span>
									<span className="text-suzu">
										{stats.breakdown.audioFiles.toLocaleString()}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted">Other Files:</span>
									<span className="text-hime">
										{stats.breakdown.otherFiles.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default AssetStats;
