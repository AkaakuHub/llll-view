export type DiscordWebhookMode = "full_log" | "summary" | "music_only";

export type DiscordWebhookTarget = {
	id: string;
	url: string;
};

const DISCORD_WEBHOOK_ID_PATTERN = /^[a-z0-9_-]+$/i;

export function parseDiscordWebhookTargets(
	rawValue: string | undefined,
): DiscordWebhookTarget[] {
	if (!rawValue) {
		return [];
	}

	const targets = rawValue
		.split(/[,\n]/)
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0)
		.map((segment) => {
			const separatorIndex = segment.indexOf("=");
			if (separatorIndex <= 0 || separatorIndex === segment.length - 1) {
				throw new Error(
					`Invalid DISCORD_WEBHOOK_URL entry: "${segment}". Expected "id=url".`,
				);
			}

			const id = segment.slice(0, separatorIndex).trim();
			const url = segment.slice(separatorIndex + 1).trim();

			if (!DISCORD_WEBHOOK_ID_PATTERN.test(id)) {
				throw new Error(
					`Invalid Discord webhook id "${id}". Use letters, numbers, "_" or "-".`,
				);
			}
			if (!url) {
				throw new Error(`Discord webhook URL is empty for id "${id}".`);
			}

			return { id, url };
		});

	const seenIds = new Set<string>();
	for (const target of targets) {
		if (seenIds.has(target.id)) {
			throw new Error(`Duplicate Discord webhook id "${target.id}".`);
		}
		seenIds.add(target.id);
	}

	return targets;
}
