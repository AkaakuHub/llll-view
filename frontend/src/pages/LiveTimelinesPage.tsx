import { useCallback, useEffect, useMemo, useState } from "react";
import LiveTimelinesFilters from "../components/page/LiveTimelinesPage/LiveTimelinesFilters";
import LiveTimelinesHeader from "../components/page/LiveTimelinesPage/LiveTimelinesHeader";
import LiveTimelinesTable from "../components/page/LiveTimelinesPage/LiveTimelinesTable";
import type {
	LiveTimelineRecord,
	MusicDataMeta,
	MusicDataResponse,
} from "../components/page/MusicDataPage/types";
import { fetcherTyped } from "../lib/fetcher";

const LiveTimelinesPage = () => {
	const [liveTimelines, setLiveTimelines] = useState<LiveTimelineRecord[]>([]);
	const [meta, setMeta] = useState<MusicDataMeta | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [musicIdFilter, setMusicIdFilter] = useState<number | null>(null);

	const loadTimelines = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetcherTyped<MusicDataResponse>(
				"/card-illustrations/raw-music-data",
			);
			if (response.error) {
				throw new Error(response.error);
			}
			setLiveTimelines(response.liveTimelines || []);
			setMeta(response.meta || null);
		} catch (err) {
			console.error("Failed to load live timelines:", err);
			setError("Failed to load live timelines. Check masterdata files.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadTimelines();
	}, [loadTimelines]);

	const filteredTimelines = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();
		return liveTimelines.filter((timeline) => {
			const matchesSearch =
				query.length === 0 ||
				`${timeline.id}`.includes(query) ||
				`${timeline.musicId ?? ""}`.includes(query) ||
				(timeline.label ?? "").toLowerCase().includes(query) ||
				(timeline.musicTitle ?? "").toLowerCase().includes(query);
			const matchesMusicId =
				musicIdFilter === null || timeline.musicId === musicIdFilter;
			return matchesSearch && matchesMusicId;
		});
	}, [liveTimelines, searchTerm, musicIdFilter]);

	const musicIdOptions = useMemo(() => {
		return Array.from(
			new Set(
				liveTimelines
					.map((timeline) => timeline.musicId)
					.filter((id): id is number => id !== null && id !== undefined),
			),
		).sort((a, b) => a - b);
	}, [liveTimelines]);

	if (loading) {
		return (
			<div className="min-h-screen bg-surface flex items-center justify-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-saya-500"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-surface">
			<LiveTimelinesHeader
				onReload={loadTimelines}
				isReloading={loading}
				meta={meta}
			/>
			<LiveTimelinesFilters
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				musicIdFilter={musicIdFilter}
				onMusicIdChange={setMusicIdFilter}
				musicIdOptions={musicIdOptions}
			/>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{error && (
					<div className="mb-6 rounded-lg border border-tuzu/40 bg-tuzu/10 p-4 text-sm text-tuzu">
						{error}
					</div>
				)}

				<div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
					<LiveTimelinesTable
						timelines={filteredTimelines}
						totalCount={liveTimelines.length}
						isFilteredEmpty={filteredTimelines.length === 0}
					/>
				</div>
			</div>
		</div>
	);
};

export default LiveTimelinesPage;
