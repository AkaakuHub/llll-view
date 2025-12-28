import { AnimatePresence, motion } from "framer-motion";
import { Clock, Info, Music, Users, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { VITE_BACKEND_URL } from "../../../../lib/const";
import Button from "../../../ui/Button";
import type { AudioFile, YamlMetadata } from "../types";

interface MetadataModalProps {
	isOpen: boolean;
	onClose: () => void;
	currentTrack?: AudioFile;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({
	isOpen,
	onClose,
	currentTrack,
}) => {
	const [metadata, setMetadata] = useState<YamlMetadata | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchMetadata = useCallback(async (id: string) => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(
				`${VITE_BACKEND_URL}/audio/music/metadata/${id}`,
			);
			if (!response.ok) {
				throw new Error("Failed to fetch metadata");
			}
			const data = await response.json();
			setMetadata(data.data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen && currentTrack?.id) {
			fetchMetadata(currentTrack.id);
		}
	}, [isOpen, currentTrack?.id, fetchMetadata]);

	const formatTime = (timeMs: number) => {
		const seconds = Math.floor(timeMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("ja-JP");
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 bg-surface/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-colors duration-300"
				onClick={onClose}
			>
				<motion.div
					initial={{ scale: 0.95, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.95, opacity: 0 }}
					className="bg-surface/95 backdrop-blur-lg rounded-2xl border border-border/50 max-w-4xl w-full max-h-[80vh] overflow-hidden transition-colors duration-300"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-border/50 transition-colors duration-300">
						<div className="flex items-center gap-3">
							<Info className="w-6 h-6 text-saya" />
							<h2 className="text-xl font-bold text-text transition-colors duration-300">
								楽曲メタデータ
							</h2>
						</div>
						<Button
							onClick={onClose}
							variant="soft"
							tone="megu"
							size="icon"
							className="rounded-full hover:bg-border/80"
						>
							<X className="w-5 h-5" />
						</Button>
					</div>

					{/* Content */}
					<div className="p-6 overflow-y-auto max-h-[60vh]">
						{loading && (
							<div className="flex items-center justify-center py-12">
								<div className="w-8 h-8 border-2 border-saya border-t-transparent rounded-full animate-spin" />
							</div>
						)}

						{error && (
							<div className="bg-tuzu/80 border border-tuzu/40 rounded-lg p-4 transition-colors duration-300">
								<p className="text-tuzu transition-colors duration-300">
									{error}
								</p>
							</div>
						)}

						{metadata && (
							<div className="space-y-6">
								{/* 基本情報 */}
								<section>
									<h3 className="text-lg font-semibold text-text mb-4 transition-colors duration-300 flex items-center gap-2">
										<Music className="w-5 h-5 text-hime" />
										基本情報
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												楽曲タイトル
											</span>
											<p className="text-text font-medium transition-colors duration-300">
												{metadata.title}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												ふりがな
											</span>
											<p className="text-text transition-colors duration-300">
												{metadata.titleFurigana}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												説明
											</span>
											<p className="text-text transition-colors duration-300">
												{metadata.description}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												楽曲ID
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.musicId}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												解放条件
											</span>
											<p className="text-text transition-colors duration-300">
												{metadata.releaseConditionText}
											</p>
										</div>
									</div>
								</section>

								{/* 時間情報 */}
								<section>
									<h3 className="text-lg font-semibold text-text mb-4 transition-colors duration-300 flex items-center gap-2">
										<Clock className="w-5 h-5 text-kozu" />
										時間情報
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												楽曲時間
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{formatTime(metadata.songTime)}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												プレイ時間
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{formatTime(metadata.playTime)}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												プレビュー開始
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{formatTime(metadata.previewStartTime)}
											</p>
										</div>
									</div>
								</section>

								{/* キャラクター情報 */}
								<section>
									<h3 className="text-lg font-semibold text-text mb-4 transition-colors duration-300 flex items-center gap-2">
										<Users className="w-5 h-5 text-ruri" />
										キャラクター情報
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												ユニットID
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.unitId}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												センターキャラクター
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.centerCharacterId}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												歌唱キャラクター
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.singerCharacterId}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												サポートキャラクター
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.supportCharacterId}
											</p>
										</div>
									</div>
								</section>

								{/* ゲーム情報 */}
								<section>
									<h3 className="text-lg font-semibold text-text mb-4 transition-colors duration-300">
										ゲーム情報
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												最大AP
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.maxAp}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												AP増分
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.apIncrement}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												ビート係数
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.beatPointCoefficient}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												フィーバーセクション
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.feverSectionNo}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												楽曲タイプ
											</span>
											<p className="text-text transition-colors duration-300 font-mono">
												{metadata.songType}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												ビデオモード
											</span>
											<p className="text-text transition-colors duration-300">
												{metadata.isVideoMode ? "有効" : "無効"}
											</p>
										</div>
									</div>
								</section>

								{/* 日付情報 */}
								<section>
									<h3 className="text-lg font-semibold text-text mb-4 transition-colors duration-300">
										日付情報
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												開始日時
											</span>
											<p className="text-text transition-colors duration-300">
												{formatDate(metadata.startTime)}
											</p>
										</div>
										<div>
											<span className="text-sm text-muted transition-colors duration-300">
												終了日時
											</span>
											<p className="text-text transition-colors duration-300">
												{formatDate(metadata.endTime)}
											</p>
										</div>
									</div>
								</section>
							</div>
						)}
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};
