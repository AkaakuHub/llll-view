import { Music } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import AudioPlayer from "../components/page/MusicPlayerPage";
import { MetadataModal } from "../components/page/MusicPlayerPage/components/MetadataModal";
import { SearchModal } from "../components/page/MusicPlayerPage/components/SearchModal";
import Button from "../components/ui/Button";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { fetcher } from "../lib/fetcher";

interface AudioFile {
	id: string;
	filename: string;
	url: string;
	title?: string;
	artist?: string;
	album?: string;
	duration?: number;
	thumbnailUrl?: string;
	category?: "BGM" | "VOICE" | "SE";
}

interface ApiResponse {
	success: boolean;
	data: AudioFile[];
	pagination?: {
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}

// Removed ActiveTab type as we're using modal instead

// Removed responsive hook as we now use a single layout with modal

const MusicPlayerPage: React.FC = () => {
	const {
		audioFiles,
		setAudioFiles,
		setCurrentTrackIndex,
		setIsMinimized,
		addToQueueNext,
		addToQueueEnd,
		currentTrack,
	} = useAudioPlayer();

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showSearchModal, setShowSearchModal] = useState(false);
	const [showMetadataModal, setShowMetadataModal] = useState(false);

	// 音楽ファイル一覧を取得（全曲ページング対応）
	const loadMusicFiles = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const allFiles: AudioFile[] = [];
			let offset = 0;
			const limit = 100; // 大きめのlimitで取得

			// BGMカテゴリをまず取得
			while (true) {
				const response = await fetcher(
					`/audio/music/search?category=BGM&limit=${limit}&offset=${offset}`,
				);
				const result: ApiResponse = await response.json();

				if (result.success && result.data.length > 0) {
					allFiles.push(...result.data);

					// hasMoreがfalseまたはデータがlimitより少ない場合は終了
					if (!result.pagination?.hasMore || result.data.length < limit) {
						break;
					}

					offset += limit;
				} else {
					break;
				}
			}

			// BGMがない場合や追加で他カテゴリも取得
			if (allFiles.length === 0) {
				offset = 0;
				while (true) {
					const response = await fetcher(
						`/audio/music/search?limit=${limit}&offset=${offset}`,
					);
					const result: ApiResponse = await response.json();

					if (result.success && result.data.length > 0) {
						allFiles.push(...result.data);

						if (!result.pagination?.hasMore || result.data.length < limit) {
							break;
						}

						offset += limit;
					} else {
						break;
					}
				}
			}

			if (allFiles.length > 0) {
				setAudioFiles(allFiles);

				// ランダムな曲から再生開始
				const randomIndex = Math.floor(Math.random() * allFiles.length);
				setCurrentTrackIndex(randomIndex);
			} else {
				setError("音楽ファイルの読み込みに失敗しました");
			}
		} catch (err) {
			console.error("Error loading music files:", err);
			setError("サーバーとの接続に失敗しました");
			setAudioFiles([]);
		} finally {
			setIsLoading(false);
		}
	}, [setAudioFiles, setCurrentTrackIndex]);

	// プレイリストに楽曲を追加
	const handleAddToPlaylist = (songs: AudioFile[]) => {
		// 重複を避けて追加
		const existingIds = new Set(audioFiles.map((file) => file.id));
		const newSongs = songs.filter((song) => !existingIds.has(song.id));
		const newPlaylist = [...audioFiles, ...newSongs];
		setAudioFiles(newPlaylist);

		// 楽曲が追加されたらモーダルを閉じる
		if (newSongs.length > 0) {
			setShowSearchModal(false);
		}
	};

	// プレイリストを置き換え
	const handleReplacePlaylist = (songs: AudioFile[]) => {
		setAudioFiles(songs);
		setCurrentTrackIndex(0);
		setShowSearchModal(false); // モーダルを閉じる
	};

	// 今すぐ再生
	const handlePlayNow = (song: AudioFile) => {
		// 既存のキューを破棄して、選択した曲のみのキューに置き換え
		setAudioFiles([song]);
		setCurrentTrackIndex(0);
		setShowSearchModal(false); // モーダルを閉じる
	};

	// URL クエリパラメータから音源名を取得
	const getTrackFromQuery = useCallback(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const trackName = urlParams.get("track");
		const autoPlay = urlParams.get("autoplay") === "true";

		if (trackName) {
			try {
				// デコードされたファイル名で検索
				const decodedTrackName = decodeURIComponent(trackName);
				console.log("Searching for track:", decodedTrackName);

				const response = await fetcher(
					`/audio/music/search?q=${encodeURIComponent(decodedTrackName)}&limit=1`,
				);
				const result: ApiResponse = await response.json();

				if (result.success && result.data.length > 0) {
					const foundTrack = result.data[0];
					console.log("Found track from query:", foundTrack);

					// このトラックをプレイリストに追加して再生
					setAudioFiles([foundTrack]);
					setCurrentTrackIndex(0);

					// 自動再生が指定されている場合は自動再生フラグを設定
					if (autoPlay) {
						console.log(
							"Auto-play enabled for track:",
							foundTrack.title || foundTrack.filename,
						);
					}

					return true;
				} else {
					console.warn("Track not found in database:", decodedTrackName);
				}
			} catch (error) {
				console.error("Error searching for track:", error);
			}
		}
		return false;
	}, [setAudioFiles, setCurrentTrackIndex]);

	useEffect(() => {
		// プレイヤーページでは最小化を解除
		setIsMinimized(false);

		const initializePage = async () => {
			// まずクエリパラメータをチェック
			const foundQueryTrack = await getTrackFromQuery();

			if (!foundQueryTrack && audioFiles.length === 0) {
				// クエリパラメータがない場合は音楽ファイルを読み込んでランダム再生
				await loadMusicFiles();
			} else {
				setIsLoading(false);
			}
		};

		initializePage();

		// クリーンアップ時に最小化を復元
		return () => {
			setIsMinimized(true);
		};
	}, [audioFiles.length, getTrackFromQuery, setIsMinimized, loadMusicFiles]);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-megu-900 via-hime-900 to-gin-900 flex items-center justify-center">
				<div className="text-center">
					<div className="w-12 h-12 border-4 border-text border-t-transparent rounded-full animate-spin mx-auto mb-4" />
					<p className="text-text text-lg">音楽を読み込み中...</p>
				</div>
			</div>
		);
	}

	if (error && audioFiles.length === 0) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-megu-900 via-hime-900 to-gin-900 flex items-center justify-center">
				<div className="text-center text-text">
					<div className="flex justify-center mb-4">
						<Music className="h-16 w-16" />
					</div>
					<h2 className="text-2xl font-bold mb-2">エラーが発生しました</h2>
					<p className="text-lg mb-4">{error}</p>
					<Button onClick={loadMusicFiles} tone="hime" size="lg">
						再試行
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-megu-900 via-hime-900 to-gin-900">
			{/* Single Player Layout */}
			<div className="h-player-queue-safe">
				<AudioPlayer
					className="w-full"
					onShowSearch={() => setShowSearchModal(true)}
					onShowMetadata={() => setShowMetadataModal(true)}
				/>
			</div>

			{/* Search Modal */}
			<SearchModal
				isOpen={showSearchModal}
				onClose={() => setShowSearchModal(false)}
				onAddToPlaylist={handleAddToPlaylist}
				onReplacePlaylist={handleReplacePlaylist}
				onPlayNow={handlePlayNow}
				onAddToQueueNext={addToQueueNext}
				onAddToQueueEnd={addToQueueEnd}
			/>
			<MetadataModal
				isOpen={showMetadataModal}
				onClose={() => setShowMetadataModal(false)}
				currentTrack={currentTrack || undefined}
			/>
		</div>
	);
};

export default MusicPlayerPage;
