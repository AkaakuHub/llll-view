import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetcher } from "../../../lib/fetcher";
import Button from "../../ui/Button";

interface AudioFile {
	id: string;
	filename: string;
	displayName?: string;
	category: "BGM" | "VOICE" | "SE";
	sampleRate?: number;
	channels?: number;
	duration?: number;
	bitrate?: number;
	encoding?: string;
	sourcePath: string;
	outputPath?: string;
	status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
	streamCount?: number;
	createdAt: string;
	updatedAt: string;
	convertedAt?: string;
	audioStreams: AudioStream[];
}

interface AudioStream {
	id: string;
	audioFileId: string;
	streamIndex: number;
	name?: string;
	duration?: number;
	sampleRate?: number;
	channels?: number;
	outputPath?: string;
	status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
	createdAt: string;
	updatedAt: string;
	convertedAt?: string;
}

interface ConversionStats {
	total: number;
	pending: number;
	analyzing: number;
	completed: number;
	failed: number;
	totalStreams: number;
	completedStreams: number;
}

export default function AudioConverter() {
	const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
	const [scanning, setScanning] = useState(false);
	const [converting, setConverting] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
	const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [stats, setStats] = useState<ConversionStats | null>(null);
	const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
	const [activeConversions, setActiveConversions] = useState<string[]>([]);
	const [isBatchActive, setIsBatchActive] = useState(false);
	const parentRef = useRef<HTMLDivElement>(null);

	const calculateStats = useCallback((files: AudioFile[]) => {
		const stats: ConversionStats = {
			total: files.length,
			pending: files.filter((f) => f.status === "PENDING").length,
			analyzing: files.filter((f) => f.status === "PROCESSING").length,
			completed: files.filter((f) => f.status === "COMPLETED").length,
			failed: files.filter((f) => f.status === "FAILED").length,
			totalStreams: files.reduce((sum, f) => sum + (f.streamCount || 0), 0),
			completedStreams: files.reduce(
				(sum, f) =>
					sum + f.audioStreams.filter((s) => s.status === "COMPLETED").length,
				0,
			),
		};
		setStats(stats);
	}, []);

	const fetchAudioFiles = useCallback(async () => {
		try {
			const response = await fetcher("/audio/files");
			const result = await response.json();
			if (result.success) {
				setAudioFiles(result.data);
				calculateStats(result.data);
			}
		} catch (error) {
			console.error("Failed to fetch audio files:", error);
		}
	}, [calculateStats]);

	const scanACBFiles = async () => {
		setScanning(true);
		try {
			const response = await fetcher("/audio/scan", {
				method: "POST",
			});
			const result = await response.json();
			if (result.success) {
				await fetchAudioFiles();
			}
		} catch (error) {
			console.error("Failed to scan ACB files:", error);
		} finally {
			setScanning(false);
		}
	};

	const convertFile = async (fileId: string) => {
		// 重複実行防止
		if (activeConversions.includes(fileId)) {
			console.log(`File ${fileId} is already being converted, skipping...`);
			return;
		}

		try {
			const response = await fetcher(`/audio/convert/${fileId}`, {
				method: "POST",
			});
			const result = await response.json();
			if (result.success) {
				await fetchAudioFiles();
			}
		} catch (error) {
			console.error("Failed to convert file:", error);
		}
	};

	const convertAllFiles = async () => {
		setConverting(true);
		try {
			await fetcher("/audio/convert/batch/all", {
				method: "POST",
			});
			await fetchAudioFiles();
		} catch (error) {
			console.error("Failed to convert all files:", error);
		} finally {
			setConverting(false);
		}
	};

	const convertFilteredFiles = async () => {
		setConverting(true);
		try {
			const pendingFilteredFiles = filteredFiles.filter(
				(f) => f.status === "PENDING",
			);

			// 重複実行防止: 既に変換中のファイルを除外
			const filesToConvert = pendingFilteredFiles.filter(
				(f) => !activeConversions.includes(f.id),
			);

			if (filesToConvert.length === 0) {
				console.log("No files to convert (all are already being processed)");
				return;
			}

			// ファイルを1つずつ順次処理（同時実行しない）
			for (const file of filesToConvert) {
				try {
					// 処理中のファイルをアクティブリストに追加
					setActiveConversions((prev) => [...prev, file.id]);

					await fetcher(`/audio/convert/${file.id}`, {
						method: "POST",
					});

					// 各ファイル処理後にリストを更新
					await fetchAudioFiles();
					await fetchActiveConversions();
				} catch (error) {
					console.error(`Failed to convert file ${file.id}:`, error);
					// エラーが発生した場合もアクティブリストから削除
					setActiveConversions((prev) => prev.filter((id) => id !== file.id));
				}
			}
		} catch (error) {
			console.error("Failed to convert filtered files:", error);
		} finally {
			setConverting(false);
			// 最終的にアクティブ変換状態を更新
			await fetchActiveConversions();
		}
	};

	const fetchActiveConversions = useCallback(async () => {
		try {
			const response = await fetcher("/audio/progress/active/list");
			const result = await response.json();
			if (result.success) {
				setActiveConversions(result.data.activeFiles);
				setIsBatchActive(result.data.isBatchActive);
			}
		} catch (error) {
			console.error("Failed to fetch active conversions:", error);
		}
	}, []);

	const cancelConversion = async (fileId: string) => {
		try {
			const response = await fetcher(`/audio/convert/cancel/${fileId}`, {
				method: "POST",
			});
			const result = await response.json();
			if (result.success) {
				await fetchAudioFiles();
				await fetchActiveConversions();
			}
		} catch (error) {
			console.error("Failed to cancel conversion:", error);
		}
	};

	const cancelAllConversions = async () => {
		try {
			const response = await fetcher("/audio/convert/cancel/all", {
				method: "POST",
			});
			const result = await response.json();
			if (result.success) {
				await fetchAudioFiles();
				await fetchActiveConversions();
				setConverting(false);
			}
		} catch (error) {
			console.error("Failed to cancel all conversions:", error);
		}
	};

	const resetAudioFile = async (fileId: string) => {
		if (
			!confirm(
				"この楽曲を未変換状態にリセットしますか？\n（変換済みファイルとサムネイルは削除されますが、データベースからは削除されません）",
			)
		) {
			return;
		}

		try {
			const response = await fetcher(`/audio/files/${fileId}`, {
				method: "DELETE",
			});
			const result = await response.json();
			if (result.success) {
				// ファイルリストを更新（削除ではなくリセットなので、ファイルは残る）
				await fetchAudioFiles();
			}
		} catch (error) {
			console.error("Failed to reset audio file:", error);
		}
	};

	const deleteAllAudioFiles = async () => {
		if (
			!confirm(
				"全ての楽曲データをデータベースから削除しますか？\n（全ての変換済みファイルとサムネイルも削除されます）\n\nこの操作は取り消せません。",
			)
		) {
			return;
		}

		try {
			const response = await fetcher("/audio/files", {
				method: "DELETE",
			});
			const result = await response.json();
			if (result.success) {
				await fetchAudioFiles();
			}
		} catch (error) {
			console.error("Failed to delete all audio files:", error);
		}
	};

	const toggleFileExpanded = (fileId: string) => {
		const newExpanded = new Set(expandedFiles);
		if (newExpanded.has(fileId)) {
			newExpanded.delete(fileId);
		} else {
			newExpanded.add(fileId);
		}
		setExpandedFiles(newExpanded);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "COMPLETED":
				return "text-kozu";
			case "PROCESSING":
				return "text-saya";
			case "FAILED":
				return "text-tuzu";
			default:
				return "text-muted";
		}
	};

	const getCategoryColor = (category: string) => {
		switch (category) {
			case "BGM":
				return "bg-saya";
			case "VOICE":
				return "bg-kaho";
			case "SE":
				return "bg-sera";
			default:
				return "bg-muted";
		}
	};

	const filteredFiles = audioFiles.filter((file) => {
		const categoryMatch =
			selectedCategory === "ALL" || file.category === selectedCategory;
		const statusMatch =
			selectedStatus === "ALL" || file.status === selectedStatus;
		const searchMatch =
			searchQuery === "" ||
			file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
			file.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
		return categoryMatch && statusMatch && searchMatch;
	});

	const ROW_PADDING = 16;
	const CARD_HEIGHT_COLLAPSED = 80;
	const CARD_HEIGHT_EXPANDED = 160;
	const COLLAPSED_ROW_SIZE = CARD_HEIGHT_COLLAPSED + ROW_PADDING;
	const EXPANDED_ROW_SIZE = CARD_HEIGHT_EXPANDED + ROW_PADDING;

	const virtualizer = useVirtualizer({
		count: filteredFiles.length,
		getScrollElement: () => parentRef.current,
		estimateSize: (index) => {
			const file = filteredFiles[index];
			const isExpanded = expandedFiles.has(file.id);
			return isExpanded ? EXPANDED_ROW_SIZE : COLLAPSED_ROW_SIZE;
		},
		overscan: 3,
	});

	useEffect(() => {
		fetchAudioFiles();
		fetchActiveConversions();
		const interval = setInterval(() => {
			fetchAudioFiles();
			fetchActiveConversions();
		}, 3000); // 3秒間隔で更新
		return () => clearInterval(interval);
	}, [fetchAudioFiles, fetchActiveConversions]);

	// 展開状態が変更された時にvirtualizerのサイズを再計算
	useEffect(() => {
		const expandedCount = expandedFiles.size;
		if (expandedCount >= 0) {
			virtualizer.measure();
		}
	}, [expandedFiles, virtualizer]);

	return (
		<div className="space-y-6">
			<div className="bg-muted/20 rounded-lg p-6 border border-border">
				<h2 className="text-2xl font-bold mb-4 text-text">
					Audio Conversion Manager
				</h2>

				{/* Statistics */}
				{stats && (
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
						<div className="bg-surface p-4 rounded-lg border border-border">
							<div className="text-2xl font-bold text-saya">{stats.total}</div>
							<div className="text-sm text-muted">Total Files</div>
						</div>
						<div className="bg-surface p-4 rounded-lg border border-border">
							<div className="text-2xl font-bold text-kozu">
								{stats.completed}
							</div>
							<div className="text-sm text-muted">Completed</div>
						</div>
						<div className="bg-surface p-4 rounded-lg border border-border">
							<div className="text-2xl font-bold text-sera">
								{stats.pending + stats.analyzing}
							</div>
							<div className="text-sm text-muted">Pending</div>
						</div>
						<div className="bg-surface p-4 rounded-lg border border-border">
							<div className="text-2xl font-bold text-kaho">
								{stats.completedStreams}/{stats.totalStreams}
							</div>
							<div className="text-sm text-muted">Streams</div>
						</div>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex flex-wrap gap-4 mb-6">
					<Button
						onClick={scanACBFiles}
						disabled={scanning}
						tone="saya"
						className="font-medium"
					>
						{scanning ? "Scanning..." : "Scan ACB Files"}
					</Button>
					<Button
						onClick={convertAllFiles}
						disabled={converting || stats?.pending === 0 || isBatchActive}
						tone="kaho"
						className="font-medium"
					>
						{converting || isBatchActive ? "Converting..." : "Convert All"}
					</Button>
					{(searchQuery ||
						selectedCategory !== "ALL" ||
						selectedStatus !== "ALL") && (
						<Button
							onClick={convertFilteredFiles}
							disabled={
								converting ||
								isBatchActive ||
								filteredFiles.filter((f) => f.status === "PENDING").length === 0
							}
							tone="hime"
							className="font-medium"
						>
							{converting
								? "Converting..."
								: `Convert Filtered (${filteredFiles.filter((f) => f.status === "PENDING").length})`}
						</Button>
					)}
					{(activeConversions.length > 0 || isBatchActive) && (
						<Button
							onClick={cancelAllConversions}
							tone="sera"
							className="font-medium"
						>
							Cancel All ({activeConversions.length} active)
						</Button>
					)}
					<Button
						onClick={deleteAllAudioFiles}
						tone="sera"
						className="font-medium"
					>
						Reset All Data
					</Button>
				</div>

				{/* Active Conversions Status */}
				{(activeConversions.length > 0 || isBatchActive) && (
					<div className="bg-sera/20 border border-sera/40 rounded-lg p-4 mb-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-400"></div>
								<span className="text-sera font-medium">
									{isBatchActive
										? "Batch Conversion Active"
										: `${activeConversions.length} file(s) converting`}
								</span>
							</div>
							<Button
								onClick={cancelAllConversions}
								tone="sera"
								size="sm"
								className="font-medium"
							>
								Stop All
							</Button>
						</div>
					</div>
				)}

				{/* Filters and Search */}
				<div className="flex flex-wrap gap-4 mb-4">
					<input
						type="text"
						placeholder="Search filename..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="bg-muted/30 border border-border rounded px-3 py-2 text-text placeholder-muted flex-1 min-w-64 focus:border-saya focus:outline-none"
					/>
					<select
						value={selectedCategory}
						onChange={(e) => setSelectedCategory(e.target.value)}
						className="bg-muted/30 border border-border rounded px-3 py-2 text-text focus:border-saya focus:outline-none"
					>
						<option value="ALL">All Categories</option>
						<option value="BGM">BGM</option>
						<option value="VOICE">Voice</option>
						<option value="SE">Sound Effects</option>
					</select>
					<select
						value={selectedStatus}
						onChange={(e) => setSelectedStatus(e.target.value)}
						className="bg-muted/30 border border-border rounded px-3 py-2 text-text focus:border-saya focus:outline-none"
					>
						<option value="ALL">All Status</option>
						<option value="PENDING">Pending</option>
						<option value="PROCESSING">Processing</option>
						<option value="COMPLETED">Completed</option>
						<option value="FAILED">Failed</option>
					</select>
					{searchQuery && (
						<Button onClick={() => setSearchQuery("")} tone="sera" size="sm">
							Clear
						</Button>
					)}
				</div>
				{/* Search Results Info */}
				{(searchQuery ||
					selectedCategory !== "ALL" ||
					selectedStatus !== "ALL") && (
					<div className="text-sm text-muted mb-2">
						Showing {filteredFiles.length} of {audioFiles.length} files
						{searchQuery && ` matching "${searchQuery}"`}
					</div>
				)}
			</div>

			{/* Virtual File List */}
			<div
				ref={parentRef}
				className="h-[600px] overflow-auto bg-muted/20 rounded-lg border border-border"
			>
				<div
					style={{
						height: `${virtualizer.getTotalSize()}px`,
						width: "100%",
						position: "relative",
					}}
				>
					{virtualizer.getVirtualItems().map((virtualItem) => {
						const file = filteredFiles[virtualItem.index];
						return (
							<div
								key={virtualItem.key}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: `${virtualItem.size}px`,
									transform: `translateY(${virtualItem.start}px)`,
								}}
							>
								<div className="px-2 py-2">
									<div
										style={{
											height: `${
												expandedFiles.has(file.id)
													? CARD_HEIGHT_EXPANDED
													: CARD_HEIGHT_COLLAPSED
											}px`,
										}}
										className="bg-muted/20 rounded-lg p-4 border border-border flex flex-col justify-center overflow-hidden"
									>
										<div
											className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${expandedFiles.has(file.id) && "mt-2.75"}`}
										>
											<Button
												onClick={() => toggleFileExpanded(file.id)}
												variant="ghost"
												tone="text"
												size="sm"
												className="flex min-w-0 items-start space-x-3 text-left p-0 hover:bg-transparent"
											>
												<span className="text-muted">
													{expandedFiles.has(file.id) ? "▼" : "▶"}
												</span>
												<div className="min-w-0 space-y-1">
													<div className="flex min-w-0 items-center gap-2">
														<span
															className={`px-2 py-1 rounded text-xs font-medium text-text ${getCategoryColor(file.category)}`}
														>
															{file.category}
														</span>
														<span className="min-w-0 truncate font-medium text-text">
															{file.filename}
														</span>
													</div>
													{file.displayName && (
														<div className="truncate text-sm text-muted">
															{file.displayName}
														</div>
													)}
												</div>
											</Button>
											<div className="flex flex-wrap items-center gap-4 sm:justify-end">
												<span
													className={`font-medium ${getStatusColor(file.status)}`}
												>
													{file.status}
												</span>
												{file.streamCount && (
													<span className="text-sm text-muted">
														{
															file.audioStreams.filter(
																(s) => s.status === "COMPLETED",
															).length
														}
														/{file.streamCount} streams
													</span>
												)}
												{file.status === "PENDING" &&
													!activeConversions.includes(file.id) && (
														<Button
															onClick={(event) => {
																event.stopPropagation();
																convertFile(file.id);
															}}
															tone="saya"
															size="sm"
															className="text-sm font-medium"
														>
															Convert
														</Button>
													)}
												{activeConversions.includes(file.id) && (
													<div className="flex items-center space-x-2">
														<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-400"></div>
														<span className="text-sera text-sm">
															Converting...
														</span>
														<Button
															onClick={(event) => {
																event.stopPropagation();
																cancelConversion(file.id);
															}}
															tone="sera"
															size="sm"
															className="text-xs font-medium"
														>
															Cancel
														</Button>
													</div>
												)}
											</div>
										</div>

										{/* Expanded Details */}
										{expandedFiles.has(file.id) && (
											<div className="mt-2 flex-1 overflow-y-auto pl-6">
												<div className="flex flex-col gap-2 pb-2">
													<div className="flex justify-end">
														<Button
															onClick={(event) => {
																event.stopPropagation();
																resetAudioFile(file.id);
															}}
															variant="soft"
															tone="megu"
															size="sm"
															className="text-xs font-medium"
															title="この楽曲を未変換状態にリセット"
														>
															Reset
														</Button>
													</div>
													<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-text">
														<div>
															<span className="text-muted">Sample Rate:</span>{" "}
															{file.sampleRate || "N/A"}Hz
														</div>
														<div>
															<span className="text-muted">Channels:</span>{" "}
															{file.channels || "N/A"}
														</div>
														<div>
															<span className="text-muted">Duration:</span>{" "}
															{file.duration
																? `${file.duration.toFixed(2)}s`
																: "N/A"}
														</div>
														<div>
															<span className="text-muted">Encoding:</span>{" "}
															{file.encoding || "N/A"}
														</div>
													</div>

													{/* Stream Details */}
													{file.audioStreams.length > 0 && (
														<div className="mt-3">
															<h4 className="font-medium mb-2 text-text">
																Streams ({file.audioStreams.length})
															</h4>
															<div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
																{file.audioStreams.map((stream) => (
																	<div
																		key={stream.id}
																		className="flex items-center justify-between bg-border p-2 rounded border border-border"
																	>
																		<span className="text-sm text-text">
																			Stream {stream.streamIndex}
																		</span>
																		<span
																			className={`text-sm ${getStatusColor(stream.status)}`}
																		>
																			{stream.status}
																		</span>
																	</div>
																))}
															</div>
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{filteredFiles.length === 0 && (
				<div className="text-center text-muted py-8">
					No audio files found. Click "Scan ACB Files" to detect available
					files.
				</div>
			)}
		</div>
	);
}
