export interface StoryResult {
	table: string;
	Id: number;
	Name: string;
	Description: string;
	ScriptId?: number;
	storyType: string;
	AdvSeriesId?: number;
	StartTime?: string;
	EndTime?: string;
	OrderId?: number;
	dialogueIndex?: number;
	text?: string;
	voiceFile?: string;
}

export interface DetailedStoryResult {
	found: boolean;
	story: {
		Id: number;
		Name: string;
		Description: string;
		ScriptId?: number;
		AdvSeriesId?: number;
		OrderId?: number;
		StartTime?: string;
		EndTime?: string;
	};
	storyType: string;
	storyText?: {
		found: boolean;
		content?: {
			metadata: {
				characters: string[];
				backgroundMusic: string[];
				backgrounds: string[];
			};
			dialogue: Array<{
				character: string;
				text: string;
				voiceFile?: string;
				background?: string | null;
				waitSeconds?: number;
			}>;
		};
		rawContent?: string;
		error?: string;
	};
	relatedStories?: Array<{
		Id: number;
		OrderId: number;
		Name: string;
		Description: string;
		ScriptId?: number;
	}>;
}

export interface RealtimeProgress {
	current: number;
	total: number;
	storyId: string;
}
