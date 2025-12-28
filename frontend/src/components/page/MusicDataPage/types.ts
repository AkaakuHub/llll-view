export type MusicScoreRecord = {
	musicId: number;
	title: string | null;
	orderId: number | null;
	unitId: number | null;
	musicType: number | null;
	normalLevel: number | null;
	hardLevel: number | null;
	expertLevel: number | null;
	masterLevel: number | null;
	normalMaxCombo: number | null;
	hardMaxCombo: number | null;
	expertMaxCombo: number | null;
	masterMaxCombo: number | null;
	shouldVerifyNotesCount: number | null;
	scoreRewardSeriesId: number | null;
	normalGainMusicExp: number | null;
	hardGainMusicExp: number | null;
	expertGainMusicExp: number | null;
	masterGainMusicExp: number | null;
	normalDropRewardSeriesId: number | null;
	hardDropRewardSeriesId: number | null;
	expertDropRewardSeriesId: number | null;
	masterDropRewardSeriesId: number | null;
};

export type LiveTimelineRecord = {
	id: number;
	label: string | null;
	musicId: number | null;
	musicTitle: string | null;
	locationsId: number | null;
	freeId: number | null;
	nextId: number | null;
	movieIds: string | null;
};

export type MusicDataMeta = {
	source: string;
	musicScoresPath: string;
	liveTimelinesPath: string;
	musicsPath: string;
	musicScoresCount: number;
	liveTimelinesCount: number;
};

export type MusicDataResponse = {
	musicScores: MusicScoreRecord[];
	liveTimelines: LiveTimelineRecord[];
	meta?: MusicDataMeta;
	error?: string;
};
