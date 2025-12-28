export interface MusicScoreYamlData {
	Id: number;
	NormalLevel?: number;
	HardLevel?: number;
	ExpertLevel?: number;
	MasterLevel?: number;
	NormalMaxCombo?: number;
	HardMaxCombo?: number;
	ExpertMaxCombo?: number;
	MasterMaxCombo?: number;
	ShouldVerifyNotesCount?: number;
	ScoreRewardSeriesId?: number;
	NormalGainMusicExp?: number;
	HardGainMusicExp?: number;
	ExpertGainMusicExp?: number;
	MasterGainMusicExp?: number;
	NormalDropRewardSeriesId?: number;
	HardDropRewardSeriesId?: number;
	ExpertDropRewardSeriesId?: number;
	MasterDropRewardSeriesId?: number;
}

export interface LiveTimelineYamlData {
	Id: number;
	Label?: string;
	MusicId?: number;
	LocationsId?: number;
	FreeId?: number;
	NextId?: number;
	MovieIds?: string;
}

export interface MusicMasterdata {
	Id: number;
	Title?: string;
	OrderId?: number;
	UnitId?: number;
	MusicType?: number;
}

export interface RawMusicScoreRecord {
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
}

export interface RawLiveTimelineRecord {
	id: number;
	label: string | null;
	musicId: number | null;
	musicTitle: string | null;
	locationsId: number | null;
	freeId: number | null;
	nextId: number | null;
	movieIds: string | null;
}

interface RawMusicDataMeta {
	source: string;
	musicScoresPath: string;
	liveTimelinesPath: string;
	musicsPath: string;
	musicScoresCount: number;
	liveTimelinesCount: number;
}

export interface RawMusicDataResponse {
	musicScores: RawMusicScoreRecord[];
	liveTimelines: RawLiveTimelineRecord[];
	meta: RawMusicDataMeta;
}

export interface MusicDataBySongResponse {
	music: MusicMasterdata | null;
	musicScores: MusicScoreYamlData[];
	liveTimelines: LiveTimelineYamlData[];
}
