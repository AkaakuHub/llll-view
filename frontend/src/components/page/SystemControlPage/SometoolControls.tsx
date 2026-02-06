import { useCallback, useEffect, useRef, useState } from "react";
import { fetcher } from "../../../lib/fetcher";
import Button from "../../ui/Button";
import AssetStats from "./AssetStats";
import ScheduleControls from "./ScheduleControls";
import VirtualLogViewer from "./VirtualLogViewer";

interface SometoolStatus {
	exists: boolean;
	built: boolean;
}

interface SometoolResult {
	success: boolean;
	output: string;
	error?: string;
}

interface SometoolJob {
	id: string;
	command: string;
	options?: string;
	status: string;
	processId?: number;
	errorMessage?: string;
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
}

const SometoolControls = () => {
	const [status, setStatus] = useState<SometoolStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<SometoolResult | null>(null);
	const [streamOutput, setStreamOutput] = useState<string>("");
	const [isStreaming, setIsStreaming] = useState(false);
	const logLengthRef = useRef(0);
	const [activeJob, setActiveJob] = useState<SometoolJob | null>(null);
	const [jobId, setJobId] = useState<string | null>(null);

	const startJobStreaming = useCallback(async (currentJobId: string) => {
		try {
			// 統一されたエンドポイントで差分ポーリング
			const pollInterval = setInterval(async () => {
				try {
					const jobResponse = await fetcher(
						`/sometool/jobs/${currentJobId}?lastLength=${logLengthRef.current}`,
					);
					const jobData = await jobResponse.json();

					if (jobData.hasMore && jobData.incrementalLog) {
						// 差分を追加
						setStreamOutput((prev) => prev + jobData.incrementalLog);
						logLengthRef.current += jobData.incrementalLog.length;
					}

					// ステータス変化を確認
					if (jobData.status && jobData.status !== "running") {
						clearInterval(pollInterval);
						setIsStreaming(false);
						setResult({
							success: jobData.status === "completed",
							output: "Job completed",
							error: jobData.errorMessage,
						});
					}

					// エラーがあればストップ
					if (jobData.errorMessage) {
						clearInterval(pollInterval);
						setIsStreaming(false);
						setResult({
							success: false,
							output: "",
							error: jobData.errorMessage,
						});
					}
				} catch (error) {
					console.error("Failed to poll incremental log:", error);
					clearInterval(pollInterval);
					setIsStreaming(false);
				}
			}, 500); // 500msごとにポーリング（より頻繁に）
		} catch (error) {
			console.error("Failed to start job streaming:", error);
		}
	}, []);

	const checkForActiveJobs = useCallback(async () => {
		try {
			const response = await fetcher("/sometool/active-jobs");
			const activeJobs = await response.json();

			if (activeJobs && activeJobs.length > 0) {
				// Get the most recent active job
				const latestJob = activeJobs[0];
				setActiveJob(latestJob);
				setJobId(latestJob.id);

				// Try to reconnect to the job
				const reconnectResponse = await fetcher(
					`/sometool/jobs/${latestJob.id}/reconnect`,
					{
						method: "POST",
					},
				);
				const reconnectResult = await reconnectResponse.json();

				if (reconnectResult.success) {
					// Job is still running, start streaming
					setIsStreaming(true);
					setStreamOutput("");
					logLengthRef.current = 0;
					startJobStreaming(latestJob.id);
				} else {
					// Job died, update UI
					setIsStreaming(false);
					setResult({
						success: false,
						output: "",
						error: `Job lost: ${reconnectResult.error}`,
					});
				}
			}
		} catch (error) {
			console.error("Failed to check for active jobs:", error);
		}
	}, [startJobStreaming]);

	// Check for active jobs on component mount
	useEffect(() => {
		checkForActiveJobs();
	}, [checkForActiveJobs]);

	const checkStatus = async () => {
		setLoading(true);
		try {
			const response = await fetcher("/status");
			const data = await response.json();
			// Extract sometool status from the services object
			setStatus(data.services?.sometool || { exists: false, built: false });
		} catch (error) {
			console.error("Failed to check status:", error);
			setStatus({ exists: false, built: false });
		}
		setLoading(false);
	};

	const buildSometool = async () => {
		setLoading(true);
		try {
			const response = await fetcher("/sometool/build", {
				method: "POST",
			});
			const data = await response.json();
			setResult(data);
			if (data.success) {
				await checkStatus();
			}
		} catch (error) {
			console.error("Failed to build:", error);
			setResult({
				success: false,
				output: "",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
		setLoading(false);
	};

	const runSometool = async (
		options: {
			analyze?: boolean;
			dbonly?: boolean;
			force?: boolean;
			keepraw?: boolean;
			convert?: boolean;
			master?: boolean;
		} = {},
	) => {
		setLoading(true);
		setIsStreaming(true);
		setStreamOutput("");
		logLengthRef.current = 0;
		setResult(null);

		try {
			// Use new job management endpoint
			const response = await fetcher("/sometool/run-with-management", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(options),
			});

			const jobResult = await response.json();

			if (jobResult.success) {
				setJobId(jobResult.jobId);
				startJobStreaming(jobResult.jobId);
			} else {
				setResult({
					success: false,
					output: "",
					error: jobResult.error || "Failed to start job",
				});
				setIsStreaming(false);
			}
		} catch (error) {
			console.error("Failed to run sometool:", error);
			setResult({
				success: false,
				output: "",
				error: error instanceof Error ? error.message : "Unknown error",
			});
			setIsStreaming(false);
		}

		setLoading(false);
	};

	// Cancel running job
	const cancelJob = async () => {
		if (!jobId) return;

		try {
			const response = await fetcher(`/sometool/jobs/${jobId}/cancel`, {
				method: "POST",
			});

			const result = await response.json();

			if (result.success) {
				setIsStreaming(false);
				setResult({
					success: false,
					output: "",
					error: "Job cancelled by user",
				});
				setJobId(null);
				setActiveJob(null);
			}
		} catch (error) {
			console.error("Failed to cancel job:", error);
		}
	};

	return (
		<div className="bg-surface rounded-lg p-6 border border-border shadow-lg">
			<div className="space-y-6">
				{/* Status Check */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-text border-b border-border pb-2">
						System Status
					</h3>
					<Button
						onClick={checkStatus}
						disabled={loading}
						tone="saya"
						size="lg"
						className="w-full font-medium"
					>
						{loading ? "Checking Status..." : "Check System Status"}
					</Button>

					{status && (
						<div className="bg-surface p-4 rounded-lg border border-border">
							<h4 className="font-medium mb-3 text-text">Current Status</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between items-center">
									<span className="text-muted">Tool Available:</span>
									<span
										className={
											status.exists
												? "text-kozu font-medium"
												: "text-tuzu font-medium"
										}
									>
										{status.exists ? "✓ Yes" : "✗ No"}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-muted">Build Status:</span>
									<span
										className={
											status.built
												? "text-kozu font-medium"
												: "text-tuzu font-medium"
										}
									>
										{status.built ? "✓ Built" : "✗ Not Built"}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Build Section */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-text border-b border-border pb-2">
						Build Management
					</h3>
					<Button
						onClick={buildSometool}
						disabled={loading}
						tone="kozu"
						size="lg"
						className="w-full font-medium"
					>
						{loading ? "Building..." : "Build System Tool"}
					</Button>
				</div>

				<ScheduleControls />
				{/* Execution Commands */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-text border-b border-border pb-2">
						Operations
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<Button
							onClick={() => runSometool()}
							disabled={loading}
							tone="saya"
							size="lg"
							className="font-medium text-sm"
						>
							Full Synchronization
						</Button>
						<Button
							onClick={() => runSometool({ dbonly: true })}
							disabled={loading}
							tone="ruri"
							size="lg"
							className="font-medium text-sm"
						>
							Database Only
						</Button>
						<Button
							onClick={() => runSometool({ analyze: true })}
							disabled={loading}
							tone="suzu"
							size="lg"
							className="font-medium text-sm"
						>
							Analysis Mode
						</Button>
						<Button
							onClick={() => runSometool({ force: true })}
							disabled={loading}
							tone="kaho"
							size="lg"
							className="font-medium text-sm"
						>
							Force Update
						</Button>
						<Button
							onClick={() => runSometool({ convert: true })}
							disabled={loading}
							tone="kozu"
							size="lg"
							className="font-medium text-sm"
						>
							Convert Assets
						</Button>
						<Button
							onClick={() => runSometool({ master: true })}
							disabled={loading}
							tone="hime"
							size="lg"
							className="font-medium text-sm"
						>
							Generate Master
						</Button>
						<Button
							onClick={() => runSometool({ dbonly: true, keepraw: true })}
							disabled={loading}
							tone="gin"
							size="lg"
							className="font-medium text-sm"
						>
							DB + Keep Raw
						</Button>
						<Button
							onClick={() => runSometool({ force: true, keepraw: true })}
							disabled={loading}
							tone="tuzu"
							size="lg"
							className="font-medium text-sm"
						>
							Force + Keep Raw
						</Button>
					</div>
				</div>

				{/* Active Job Information */}
				{(activeJob || isStreaming) && (
					<div className="bg-saya/10 p-4 rounded-lg border border-saya/30">
						<h4 className="font-medium mb-2 text-saya flex items-center">
							Active Job:
							{isStreaming && (
								<span className="ml-2 inline-flex items-center">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-saya"></div>
									<span className="ml-2 text-saya text-sm">Running...</span>
								</span>
							)}
						</h4>
						{activeJob && (
							<div className="text-sm text-saya/80 space-y-1">
								<p>
									<strong>Command:</strong> {activeJob.command}
								</p>
								<p>
									<strong>Started:</strong>{" "}
									{new Date(
										activeJob.startedAt || activeJob.createdAt,
									).toLocaleString()}
								</p>
								{activeJob.processId && (
									<p>
										<strong>PID:</strong> {activeJob.processId}
									</p>
								)}
							</div>
						)}
						{isStreaming && jobId && (
							<div className="mt-3">
								<Button
									onClick={cancelJob}
									tone="tuzu"
									size="md"
									className="text-sm font-medium"
								>
									Cancel Job
								</Button>
							</div>
						)}
					</div>
				)}

				{/* Real-time Stream Output */}
				{(isStreaming || streamOutput) && (
					<div className="bg-surface p-4 rounded-lg border border-border">
						<h4 className="font-medium mb-3 text-text flex items-center">
							Real-time Output:
							{isStreaming && (
								<span className="ml-2 inline-flex items-center">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-saya"></div>
									<span className="ml-2 text-saya text-sm">Running...</span>
								</span>
							)}
						</h4>
						<div className="bg-surface text-kozu rounded font-mono text-xs">
							<VirtualLogViewer
								logText={streamOutput}
								isStreaming={isStreaming}
								className="h-96 max-h-96"
							/>
						</div>
					</div>
				)}

				{/* Results */}
				{result && (
					<div className="bg-surface p-4 rounded-lg border border-border">
						<h4 className="font-medium mb-3 text-text">
							Execution Result:{" "}
							<span className={result.success ? "text-kozu" : "text-tuzu"}>
								{result.success ? "Success" : "Failed"}
							</span>
						</h4>
						{result.output && (
							<div className="mb-4">
								<h5 className="text-sm font-medium mb-2 text-text">Output:</h5>
								<pre className="text-xs bg-muted/20 text-text p-3 rounded border border-border overflow-x-auto max-h-40">
									{result.output}
								</pre>
							</div>
						)}
						{result.error && (
							<div>
								<h5 className="text-sm font-medium mb-2 text-tuzu">Error:</h5>
								<pre className="text-xs bg-tuzu/10 text-tuzu p-3 rounded border border-tuzu/30 overflow-x-auto max-h-40">
									{result.error}
								</pre>
							</div>
						)}
					</div>
				)}

				<AssetStats />
			</div>
		</div>
	);
};

export default SometoolControls;
