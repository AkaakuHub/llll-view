import { Eye, RefreshCw, Video } from "lucide-react";
import type React from "react";
import Button from "../../ui/Button";

interface VideoFile {
	type: "home" | "get-in" | "get-loop" | "training-in" | "training-loop";
	label: string;
	url: string;
	available: boolean;
	converted?: boolean;
}

interface VideoPanelProps {
	videoFiles: VideoFile[];
	currentVideoType: string | null;
	setCurrentVideoType: (type: string) => void;
	currentVideoFile: VideoFile | null;
	videoSrc: string | null;
	pendingPlay: boolean;
	setPendingPlay: (value: boolean) => void;
	videoLoading: boolean;
	videoDownloading: boolean;
	videoError: string | null;
	setVideoError: (value: string | null) => void;
	setVideoLoading: (value: boolean) => void;
	handlePlayVideo: () => void;
	handleDownloadVideo: () => void;
}

const VideoPanel: React.FC<VideoPanelProps> = ({
	videoFiles,
	currentVideoType,
	setCurrentVideoType,
	currentVideoFile,
	videoSrc,
	pendingPlay,
	setPendingPlay,
	videoLoading,
	videoDownloading,
	videoError,
	setVideoError,
	setVideoLoading,
	handlePlayVideo,
	handleDownloadVideo,
}) => {
	if (!videoFiles.some((vf) => vf.available)) {
		return (
			<div className="bg-surface border border-border rounded-xl p-4">
				<h2 className="text-lg font-semibold text-text mb-3">Videos</h2>
				<p className="text-sm text-muted">No videos in raw data</p>
			</div>
		);
	}

	return (
		<div className="bg-surface border border-border rounded-xl p-4">
			<h2 className="text-lg font-semibold text-text mb-3">Videos</h2>
			<div className="grid grid-cols-[minmax(0,1fr)_minmax(160px,220px)] sm:grid-cols-[minmax(0,1fr)_minmax(200px,260px)] gap-4">
				<div className="flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-3 mb-3">
							<Video className="h-5 w-5 text-muted" />
							<div>
								<p className="font-medium text-text">
									{currentVideoFile?.label || "Select a video"}
								</p>
								<p className="text-xs text-muted">
									{currentVideoFile ? "Press Play to convert and view" : ""}
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{videoFiles
								.filter((vf) => vf.available)
								.map((videoFile) => (
									<Button
										key={videoFile.type}
										onClick={() => setCurrentVideoType(videoFile.type)}
										variant={
											currentVideoType === videoFile.type ? "solid" : "soft"
										}
										tone="saya"
										size="sm"
										className="cursor-pointer"
									>
										<Video className="h-4 w-4" />
										{videoFile.label}
									</Button>
								))}
						</div>
					</div>

					<div className="mt-4 flex items-center gap-2">
						<Button
							onClick={handlePlayVideo}
							disabled={!currentVideoFile}
							tone="saya"
							size="sm"
							className="cursor-pointer"
						>
							{videoLoading ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<Video className="h-4 w-4" />
							)}
							Play (convert if needed)
						</Button>
						<Button
							onClick={handleDownloadVideo}
							disabled={!currentVideoFile || videoDownloading}
							variant="soft"
							tone="saya"
							size="sm"
							className="cursor-pointer"
						>
							{videoDownloading ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<Video className="h-4 w-4" />
							)}
							Download MP4
						</Button>
						{videoError && <p className="text-xs text-tuzu">{videoError}</p>}
					</div>
				</div>

				<div className="rounded-xl overflow-hidden border border-border bg-surface aspect-[9/16] w-full">
					{videoSrc ? (
						<video
							key={videoSrc}
							className="w-full h-full object-contain bg-surface"
							controls
							preload="metadata"
							loop={currentVideoFile?.type.includes("loop")}
							onLoadedData={() => setVideoLoading(false)}
							onError={() => {
								setVideoError("Failed to load video.");
								setVideoLoading(false);
							}}
							ref={(el) => {
								if (el && pendingPlay) {
									el.play().catch(() => {
										setVideoError("Failed to play video.");
									});
									setPendingPlay(false);
								}
							}}
							src={videoSrc}
						>
							<track kind="captions" />
						</video>
					) : (
						<div className="h-full w-full flex items-center justify-center text-muted">
							<Eye className="h-6 w-6" />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default VideoPanel;
