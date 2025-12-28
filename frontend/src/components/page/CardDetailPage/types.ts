export type VoiceFile = {
	type: "obtain" | "evolution1" | "evolution2" | "evolution3" | "evolution4";
	label: string;
	filename: string;
	url: string;
	converted?: boolean;
	converting?: boolean;
};
