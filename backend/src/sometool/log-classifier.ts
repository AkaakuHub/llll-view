const TENTATIVE_LOG_CATEGORY = {
	sound: "sound",
	story: "story",
	gacha: "gacha",
	stage: "stage",
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

type ReportedLogCategory =
	| "sound"
	| "story"
	| "gacha"
	| "show"
	| "stage"
	| "database"
	| "other";

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
	if (
		/^story_main_\d{8}(?:\..+)?$/.test(normalized) ||
		/^story_thumbnail_\d{8}(?:\..+)?$/.test(normalized) ||
		normalized.startsWith("story_bg_image_") ||
		/^vo_adv_\d{8}(?:\..+)?$/.test(normalized) ||
		/^image_record_monthly_\d{6}(?:\..+)?$/.test(normalized) ||
		/^image_record_monthly_part_\d{8}(?:\..+)?$/.test(normalized) ||
		normalized.startsWith("3d_") ||
		/^mot_\d{2}_\d{5}(?:\..+)?$/.test(normalized) ||
		normalized.startsWith("__scsch") ||
		/^__photo_\d{7}(?:.*)?$/.test(normalized) ||
		normalized.startsWith("ppadv") ||
		normalized.startsWith("__sc_ppadv") ||
		normalized.startsWith("__sc_pp")
	)
		return TENTATIVE_LOG_CATEGORY.story;
	if (
		normalized.startsWith("image_gacha_") ||
		normalized.startsWith("image_gacha_pack_") ||
		/^picture_gacha_top_\d{7}(?:\..+)?$/.test(normalized) ||
		normalized.startsWith("picture_ur_") ||
		/^vo_card_\d{7}(?:\..+)?$/.test(normalized) ||
		/^image_card_full_\d{8}(?:\..+)?$/.test(normalized) ||
		/^image_card_half_\d{8}(?:\..+)?$/.test(normalized)
	)
		return TENTATIVE_LOG_CATEGORY.gacha;
	if (
		/^music_timeline_\d{6}(?:\..+)?$/.test(normalized) ||
		/^__live_\d{6}_.+$/.test(normalized) ||
		normalized.startsWith("quest.acb") ||
		normalized.startsWith("image_grand_prix_logo_") ||
		normalized.startsWith("__schoolidolstage_") ||
		normalized.startsWith("__special_appeal_effect_") ||
		normalized.startsWith("ingame_chara_sd_spine_") ||
		normalized.startsWith("music_lyric_video_") ||
		normalized.startsWith("special_appeal_effect_") ||
		/^image_music_thumbnail_\d{6}(?:\..+)?$/.test(normalized) ||
		/^image_music_lyric_video_thumbnail_\d{6}(?:\..+)?$/.test(normalized) ||
		/^image_deck_frame_chara_\d{7}(?:\..+)?$/.test(normalized) ||
		/^image_sticker_\d{8}(?:\..+)?$/.test(normalized) ||
		/^image_card_middle_vertical_\d{8}(?:\..+)?$/.test(normalized) ||
		/^icon_skill_\d{8}(?:\..+)?$/.test(normalized) ||
		/^bgm_preview_\d{8}(?:\..+)?$/.test(normalized)
	)
		return TENTATIVE_LOG_CATEGORY.stage;

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
	if (normalized.endsWith(".tsv") || normalized.endsWith(".csv"))
		return TENTATIVE_LOG_CATEGORY.masterdata;

	return TENTATIVE_LOG_CATEGORY.misc;
}

export function toReportedCategory(
	tentative: TentativeLogCategory,
): ReportedLogCategory {
	if (
		tentative === TENTATIVE_LOG_CATEGORY.sound ||
		tentative === TENTATIVE_LOG_CATEGORY.story ||
		tentative === TENTATIVE_LOG_CATEGORY.gacha ||
		tentative === TENTATIVE_LOG_CATEGORY.stage
	) {
		return tentative;
	}
	if (tentative === TENTATIVE_LOG_CATEGORY.chart) {
		return "show";
	}
	if (tentative === TENTATIVE_LOG_CATEGORY.masterdata) {
		return "database";
	}
	return "other";
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
		gacha: 0,
		show: 0,
		stage: 0,
		database: 0,
		other: 0,
	};

	for (const entry of entries) {
		const category = toReportedCategory(detectTentativeCategory(entry));
		counts[category] += 1;
	}

	return counts;
}
