// YAML data type definitions
export interface CharacterYamlData {
	Id: number;
	NameLast?: string;
	NameFirst?: string;
	LatinAlphabetNameLast?: string;
	LatinAlphabetNameFirst?: string;
	GenerationsId?: number;
	CharacterVoice?: string;
	ThemeColor?: string;
	Introduction?: string;
	StyleType?: number;
	DisplayFullName?: string;
	NameDisplayType?: number;
}

export interface CardYamlData {
	Id: number;
	CardSeriesId: number;
	CharactersId: number;
	Name?: string;
	Description?: string;
	Rarity?: number;
	EvolveTimes?: number;
	Style?: number;
	Mood?: number;
	InitialSmile?: number;
	InitialPure?: number;
	InitialCool?: number;
	InitialMental?: number;
	MaxSmile?: number;
	MaxPure?: number;
	MaxCool?: number;
	MaxMental?: number;
	BeatPoint?: number;
	OrderId?: number;
}

export interface CardSkillYamlData {
	Id: number;
	CardSkillSeriesId: number;
	SkillLevel: number;
	SkillCost?: number;
	ApperanceType?: number;
	CardSkillEffectId?: string;
	Description?: string;
}

export interface CardLevelYamlData {
	Id: number;
	ExperienceType: number;
	CardLevel: number;
	Experience: number;
	CumulativeExperience: number;
}

export interface CenterSkillYamlData {
	Id: number;
	CenterSkillSeriesId: number;
	SkillLevel: number;
	Description?: string;
	CenterSkillEffectId?: string;
}

export interface CardAssetAvailability {
	images: {
		full: boolean;
		half: boolean;
		middleVertical: boolean;
	};
	videos: {
		home: boolean;
	};
	seriesVideos: {
		get: { in: boolean; loop: boolean };
		training: { in: boolean; loop: boolean };
	};
	voice: boolean;
}

export interface CardIndexEntry {
	id: number;
	cardSeriesId: number;
	characterId: number;
	name?: string;
	description?: string;
	rarity: number;
	evolveTimes: number;
	style: number;
	mood: number;
	initialSmile?: number;
	initialPure?: number;
	initialCool?: number;
	initialMental?: number;
	maxSmile?: number;
	maxPure?: number;
	maxCool?: number;
	maxMental?: number;
	beatPoint?: number;
	orderId?: number;
	character: {
		id: number;
		nameLast?: string;
		nameFirst?: string;
		latinAlphabetNameLast?: string;
		latinAlphabetNameFirst?: string;
		themeColor?: string;
		introduction?: string;
		styleType?: number;
	};
	assets: CardAssetAvailability;
}

export interface AssetIndex {
	imageFull: Set<string>;
	imageHalf: Set<string>;
	imageMiddle: Set<string>;
	videoHome: Set<string>;
	videoGetIn: Set<string>;
	videoGetLoop: Set<string>;
	videoTrainingIn: Set<string>;
	videoTrainingLoop: Set<string>;
	voice: Set<string>;
}

export interface MasterCache {
	loadedAt: number;
	cardMtime: number;
	characterMtime: number;
	cards: CardYamlData[];
	characters: CharacterYamlData[];
	cardById: Map<number, CardYamlData>;
	characterById: Map<number, CharacterYamlData>;
	cardsBySeriesId: Map<number, CardYamlData[]>;
}
