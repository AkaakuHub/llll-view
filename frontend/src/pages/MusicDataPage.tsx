import { useCallback, useEffect, useMemo, useState } from "react";
import MusicDataFilters from "../components/page/MusicDataPage/MusicDataFilters";
import MusicDataHeader from "../components/page/MusicDataPage/MusicDataHeader";
import MusicScoresTable from "../components/page/MusicDataPage/MusicScoresTable";
import type {
	MusicDataMeta,
	MusicDataResponse,
	MusicScoreRecord,
} from "../components/page/MusicDataPage/types";
import { fetcherTyped } from "../lib/fetcher";

const MusicDataPage = () => {
	const [musicScores, setMusicScores] = useState<MusicScoreRecord[]>([]);
	const [meta, setMeta] = useState<MusicDataMeta | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [musicIdFilter, setMusicIdFilter] = useState<number | null>(null);

	const loadAllData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetcherTyped<MusicDataResponse>(
				"/card-illustrations/raw-music-data",
			);

			if (response.error) {
				throw new Error(response.error);
			}

			setMusicScores(response.musicScores || []);
			setMeta(response.meta || null);
		} catch (err) {
			console.error("Failed to load raw music data:", err);
			setError("Failed to load raw music data. Check masterdata files.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadAllData();
	}, [loadAllData]);

	const filteredMusicScores = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();
		return musicScores.filter((score) => {
			const matchesSearch =
				query.length === 0 ||
				score.musicId.toString().includes(query) ||
				(score.title ?? "").toLowerCase().includes(query);
			const matchesMusicId =
				musicIdFilter === null || score.musicId === musicIdFilter;
			return matchesSearch && matchesMusicId;
		});
	}, [musicScores, searchTerm, musicIdFilter]);

	const uniqueMusicIds = useMemo(() => {
		return Array.from(new Set(musicScores.map((score) => score.musicId))).sort(
			(a, b) => a - b,
		);
	}, [musicScores]);

	if (loading) {
		return (
			<div className="min-h-screen bg-surface flex items-center justify-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-saya-500"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-surface">
			<MusicDataHeader
				onReload={loadAllData}
				isReloading={loading}
				meta={meta}
			/>
			<MusicDataFilters
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				musicIdFilter={musicIdFilter}
				onMusicIdChange={setMusicIdFilter}
				musicIdOptions={uniqueMusicIds}
			/>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{error && (
					<div className="mb-6 rounded-lg border border-tuzu/40 bg-tuzu/10 p-4 text-sm text-tuzu">
						{error}
					</div>
				)}

				<div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
					<MusicScoresTable
						scores={filteredMusicScores}
						totalCount={musicScores.length}
						isFilteredEmpty={filteredMusicScores.length === 0}
					/>
				</div>
			</div>
		</div>
	);
};

export default MusicDataPage;
