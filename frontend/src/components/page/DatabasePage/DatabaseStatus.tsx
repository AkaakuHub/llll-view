import { useCallback, useEffect, useState } from "react";
import { VITE_BACKEND_URL } from "../../../lib/const";
import { fetcher } from "../../../lib/fetcher";
import Button from "../../ui/Button";

interface AudioFile {
	status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
	category: "BGM" | "VOICE" | "SE";
	streamCount?: number;
	audioStreams: AudioStream[];
}

interface AudioStream {
	status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

interface DatabaseStats {
	totalFiles: number;
	completedFiles: number;
	pendingFiles: number;
	failedFiles: number;
	totalStreams: number;
	completedStreams: number;
	categories: {
		BGM: number;
		VOICE: number;
		SE: number;
	};
}

export default function DatabaseStatus() {
	const [stats, setStats] = useState<DatabaseStats | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchStats = useCallback(async () => {
		try {
			const response = await fetcher("/audio/files");
			const result = await response.json();
			if (result.success) {
				const files: AudioFile[] = result.data;
				const stats: DatabaseStats = {
					totalFiles: files.length,
					completedFiles: files.filter((f) => f.status === "COMPLETED").length,
					pendingFiles: files.filter((f) => f.status === "PENDING").length,
					failedFiles: files.filter((f) => f.status === "FAILED").length,
					totalStreams: files.reduce(
						(sum: number, f) => sum + (f.streamCount || 0),
						0,
					),
					completedStreams: files.reduce(
						(sum: number, f) =>
							sum +
							(f.audioStreams || []).filter((s) => s.status === "COMPLETED")
								.length,
						0,
					),
					categories: {
						BGM: files.filter((f) => f.category === "BGM").length,
						VOICE: files.filter((f) => f.category === "VOICE").length,
						SE: files.filter((f) => f.category === "SE").length,
					},
				};
				setStats(stats);
			}
		} catch (error) {
			console.error("Failed to fetch database stats:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStats();
		const interval = setInterval(fetchStats, 5000); // 5秒間隔で更新
		return () => clearInterval(interval);
	}, [fetchStats]);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kaho"></div>
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="text-center text-tuzu py-8">
				Failed to load database statistics
			</div>
		);
	}

	const completionRate =
		stats.totalFiles > 0
			? ((stats.completedFiles / stats.totalFiles) * 100).toFixed(1)
			: "0";
	const streamCompletionRate =
		stats.totalStreams > 0
			? ((stats.completedStreams / stats.totalStreams) * 100).toFixed(1)
			: "0";

	return (
		<div className="space-y-6">
			<div className="bg-surface rounded-lg p-6 border border-border shadow-lg">
				<h2 className="text-2xl font-bold mb-6 text-text">Database Status</h2>

				{/* Overall Progress */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					<div className="bg-surface rounded-lg p-4 border border-border">
						<h3 className="text-lg font-semibold mb-4 text-text">
							File Conversion Progress
						</h3>
						<div className="space-y-3">
							<div className="flex justify-between text-muted">
								<span>Total Files:</span>
								<span className="font-bold text-saya">{stats.totalFiles}</span>
							</div>
							<div className="flex justify-between text-muted">
								<span>Completed:</span>
								<span className="font-bold text-kozu">
									{stats.completedFiles}
								</span>
							</div>
							<div className="flex justify-between text-muted">
								<span>Pending:</span>
								<span className="font-bold text-suzu">
									{stats.pendingFiles}
								</span>
							</div>
							<div className="flex justify-between text-muted">
								<span>Failed:</span>
								<span className="font-bold text-tuzu">{stats.failedFiles}</span>
							</div>
							<div className="mt-4">
								<div className="flex justify-between mb-2 text-muted">
									<span>Completion Rate:</span>
									<span className="font-bold text-text">{completionRate}%</span>
								</div>
								<div className="w-full bg-border rounded-full h-2">
									<div
										className="bg-kozu h-2 rounded-full transition-all duration-300"
										style={{ width: `${completionRate}%` }}
									></div>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-surface rounded-lg p-4 border border-border">
						<h3 className="text-lg font-semibold mb-4 text-text">
							Stream Progress
						</h3>
						<div className="space-y-3">
							<div className="flex justify-between text-muted">
								<span>Total Streams:</span>
								<span className="font-bold text-saya">
									{stats.totalStreams}
								</span>
							</div>
							<div className="flex justify-between text-muted">
								<span>Completed:</span>
								<span className="font-bold text-kozu">
									{stats.completedStreams}
								</span>
							</div>
							<div className="flex justify-between text-muted">
								<span>Remaining:</span>
								<span className="font-bold text-suzu">
									{stats.totalStreams - stats.completedStreams}
								</span>
							</div>
							<div className="mt-4">
								<div className="flex justify-between mb-2 text-muted">
									<span>Stream Completion:</span>
									<span className="font-bold text-text">
										{streamCompletionRate}%
									</span>
								</div>
								<div className="w-full bg-border rounded-full h-2">
									<div
										className="bg-hime h-2 rounded-full transition-all duration-300"
										style={{ width: `${streamCompletionRate}%` }}
									></div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Category Breakdown */}
				<div className="bg-surface rounded-lg p-4 border border-border">
					<h3 className="text-lg font-semibold mb-4 text-text">
						Files by Category
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-saya">
								{stats.categories.BGM}
							</div>
							<div className="text-sm text-muted">BGM</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-hime">
								{stats.categories.VOICE}
							</div>
							<div className="text-sm text-muted">Voice</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-kozu">
								{stats.categories.SE}
							</div>
							<div className="text-sm text-muted">SE</div>
						</div>
					</div>
				</div>

				{/* Quick Actions */}
				<div className="mt-6 flex space-x-4">
					<Button onClick={fetchStats} tone="saya" className="cursor-pointer">
						Refresh Stats
					</Button>
					<Button
						onClick={() =>
							window.open(`${VITE_BACKEND_URL}/audio/files`, "_blank")
						}
						tone="megu"
						className="cursor-pointer"
					>
						View Raw Data
					</Button>
				</div>
			</div>
		</div>
	);
}
