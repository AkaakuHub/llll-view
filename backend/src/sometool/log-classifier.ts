const TENTATIVE_LOG_CATEGORY = {
	sound: "sound",
	story: "story",
	image: "image",
	icon: "icon",
	live: "live",
	video: "video",
	chart: "chart",
	model3d: "model3d",
	masterdata: "masterdata",
	misc: "misc",
} as const;

type TentativeLogCategory =
	(typeof TENTATIVE_LOG_CATEGORY)[keyof typeof TENTATIVE_LOG_CATEGORY];

type ReportedLogCategory = "sound" | "story" | "unclassified";

export function extractUpdatedEntries(outputLog: string): string[] {
	const lines = outputLog.split(/\r?\n/);
	const uniqueEntries = new Set<string>();
	const pattern = /Found a new or updated entry \[([^\]]+)\]/;

	for (const line of lines) {
		const match = pattern.exec(line);
		if (!match) {
			continue;
		}
		const entry = match[1]?.trim();
		if (entry) {
			// Download/processing phases can emit the same entry multiple times.
			uniqueEntries.add(entry);
		}
	}

	return Array.from(uniqueEntries);
}

export function detectTentativeCategory(entry: string): TentativeLogCategory {
	const normalized = entry.toLowerCase();

	if (/^bgm_live_\d{8}(?:\..+)?$/.test(normalized))
		return TENTATIVE_LOG_CATEGORY.sound;
	if (/^story_main_\d{8}(?:\..+)?$/.test(normalized))
		return TENTATIVE_LOG_CATEGORY.story;

	if (normalized.startsWith("image_")) return TENTATIVE_LOG_CATEGORY.image;
	if (normalized.startsWith("icon_")) return TENTATIVE_LOG_CATEGORY.icon;
	if (
		normalized.startsWith("live_") ||
		normalized.startsWith("music_timeline_")
	)
		return TENTATIVE_LOG_CATEGORY.live;
	if (
		normalized.startsWith("picture_") ||
		normalized.startsWith("vo_") ||
		normalized.startsWith("bgm_preview_")
	)
		return TENTATIVE_LOG_CATEGORY.video;
	if (normalized.startsWith("rhythmgame_chart_"))
		return TENTATIVE_LOG_CATEGORY.chart;
	if (normalized.startsWith("3d_")) return TENTATIVE_LOG_CATEGORY.model3d;
	if (normalized.endsWith(".tsv") || normalized.endsWith(".csv"))
		return TENTATIVE_LOG_CATEGORY.masterdata;

	return TENTATIVE_LOG_CATEGORY.misc;
}

export function toReportedCategory(
	tentative: TentativeLogCategory,
): ReportedLogCategory {
	if (
		tentative === TENTATIVE_LOG_CATEGORY.sound ||
		tentative === TENTATIVE_LOG_CATEGORY.story
	) {
		return tentative;
	}
	return "unclassified";
}

export function extractSoundAssetKeys(outputLog: string): string[] {
	const entries = extractUpdatedEntries(outputLog);
	const keys = new Set<string>();

	for (const entry of entries) {
		if (detectTentativeCategory(entry) !== TENTATIVE_LOG_CATEGORY.sound) {
			continue;
		}
		const normalized = entry.toLowerCase();
		const keyMatch = normalized.match(/^(bgm_live_\d{8})(?:\..+)?$/);
		if (keyMatch?.[1]) {
			keys.add(keyMatch[1]);
		}
	}

	return Array.from(keys);
}

export function summarizeReportedCounts(
	outputLog: string,
): Record<ReportedLogCategory, number> {
	const entries = extractUpdatedEntries(outputLog);
	const counts: Record<ReportedLogCategory, number> = {
		sound: 0,
		story: 0,
		unclassified: 0,
	};

	for (const entry of entries) {
		const category = toReportedCategory(detectTentativeCategory(entry));
		counts[category] += 1;
	}

	return counts;
}
