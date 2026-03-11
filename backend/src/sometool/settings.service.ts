import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
	type DiscordWebhookMode,
	parseDiscordWebhookTargets,
} from "./discord-webhook-config";

type NotificationWebhookSettings = {
	id: string;
	mode: DiscordWebhookMode;
};

type StoredWebhookModes = Partial<Record<string, DiscordWebhookMode>>;

type NotificationSettings = {
	notifyOnlyUpdates: boolean;
	notifyOnFailure: boolean;
	includeLog: boolean;
	webhooks: NotificationWebhookSettings[];
};

const DEFAULT_WEBHOOK_MODE: DiscordWebhookMode = "normal";
const VALID_WEBHOOK_MODES: DiscordWebhookMode[] = [
	"normal",
	"summary",
	"music_only",
];

@Injectable()
export class SometoolSettingsService {
	constructor(private readonly prisma: PrismaService) {}

	async getNotificationSettings(): Promise<NotificationSettings> {
		const settings = await this.prisma.systemControlSettings.upsert({
			where: { id: 1 },
			create: {
				id: 1,
				notifyOnlyUpdates: true,
				notifyOnFailure: true,
				includeLog: true,
				webhookModes: "{}",
			},
			update: {},
		});

		const configuredWebhooks = parseDiscordWebhookTargets(
			process.env.DISCORD_WEBHOOK_URL,
		);
		const storedModes = this.parseStoredWebhookModes(settings.webhookModes);

		return {
			notifyOnlyUpdates: settings.notifyOnlyUpdates,
			notifyOnFailure: settings.notifyOnFailure,
			includeLog: settings.includeLog,
			webhooks: configuredWebhooks.map((webhook) => ({
				id: webhook.id,
				mode: storedModes[webhook.id] ?? DEFAULT_WEBHOOK_MODE,
			})),
		};
	}

	async updateNotificationSettings(
		partial: Partial<NotificationSettings>,
	): Promise<NotificationSettings> {
		const current = await this.getNotificationSettings();
		const configuredWebhooks = parseDiscordWebhookTargets(
			process.env.DISCORD_WEBHOOK_URL,
		);
		const configuredIds = new Set(
			configuredWebhooks.map((webhook) => webhook.id),
		);
		const currentModeById = Object.fromEntries(
			current.webhooks.map((webhook) => [webhook.id, webhook.mode]),
		) as Record<string, DiscordWebhookMode>;
		const inputModeById = Object.fromEntries(
			(partial.webhooks ?? []).map((webhook) => [webhook.id, webhook.mode]),
		) as Record<string, DiscordWebhookMode>;
		const nextWebhooks = partial.webhooks
			? configuredWebhooks.map((webhook) => {
					return {
						id: webhook.id,
						mode:
							inputModeById[webhook.id] ??
							currentModeById[webhook.id] ??
							DEFAULT_WEBHOOK_MODE,
					};
				})
			: current.webhooks;

		for (const webhook of nextWebhooks) {
			if (!configuredIds.has(webhook.id)) {
				throw new Error(`Unknown Discord webhook id "${webhook.id}".`);
			}
			if (!VALID_WEBHOOK_MODES.includes(webhook.mode)) {
				throw new Error(`Invalid Discord webhook mode "${webhook.mode}".`);
			}
		}

		const updated = await this.prisma.systemControlSettings.upsert({
			where: { id: 1 },
			create: {
				id: 1,
				notifyOnlyUpdates:
					partial.notifyOnlyUpdates ?? current.notifyOnlyUpdates,
				notifyOnFailure: partial.notifyOnFailure ?? current.notifyOnFailure,
				includeLog: partial.includeLog ?? current.includeLog,
				webhookModes: JSON.stringify(
					Object.fromEntries(
						nextWebhooks.map((webhook) => [webhook.id, webhook.mode]),
					),
				),
			},
			update: {
				notifyOnlyUpdates:
					partial.notifyOnlyUpdates ?? current.notifyOnlyUpdates,
				notifyOnFailure: partial.notifyOnFailure ?? current.notifyOnFailure,
				includeLog: partial.includeLog ?? current.includeLog,
				webhookModes: JSON.stringify(
					Object.fromEntries(
						nextWebhooks.map((webhook) => [webhook.id, webhook.mode]),
					),
				),
			},
		});

		const storedModes = this.parseStoredWebhookModes(updated.webhookModes);
		return {
			notifyOnlyUpdates: updated.notifyOnlyUpdates,
			notifyOnFailure: updated.notifyOnFailure,
			includeLog: updated.includeLog,
			webhooks: configuredWebhooks.map((webhook) => ({
				id: webhook.id,
				mode: storedModes[webhook.id] ?? DEFAULT_WEBHOOK_MODE,
			})),
		};
	}

	private parseStoredWebhookModes(rawValue: string): StoredWebhookModes {
		const parsed = JSON.parse(rawValue) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new Error(
				"system_control_settings.webhookModes must be an object.",
			);
		}

		const modes: StoredWebhookModes = {};
		for (const [id, mode] of Object.entries(parsed)) {
			if (!VALID_WEBHOOK_MODES.includes(mode as DiscordWebhookMode)) {
				throw new Error(`Invalid stored Discord webhook mode for "${id}".`);
			}
			modes[id] = mode as DiscordWebhookMode;
		}

		return modes;
	}
}
