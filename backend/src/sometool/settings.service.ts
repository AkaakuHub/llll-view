import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type NotificationSettings = {
	notifyOnlyUpdates: boolean;
	notifyOnFailure: boolean;
	includeLog: boolean;
	summarizeLog: boolean;
};

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
				summarizeLog: true,
			},
			update: {},
		});

		return {
			notifyOnlyUpdates: settings.notifyOnlyUpdates,
			notifyOnFailure: settings.notifyOnFailure,
			includeLog: settings.includeLog,
			summarizeLog: settings.summarizeLog,
		};
	}

	async updateNotificationSettings(
		partial: Partial<NotificationSettings>,
	): Promise<NotificationSettings> {
		const current = await this.getNotificationSettings();
		const next = {
			...current,
			...partial,
		};

		const updated = await this.prisma.systemControlSettings.upsert({
			where: { id: 1 },
			create: {
				id: 1,
				...next,
			},
			update: {
				...next,
			},
		});

		return {
			notifyOnlyUpdates: updated.notifyOnlyUpdates,
			notifyOnFailure: updated.notifyOnFailure,
			includeLog: updated.includeLog,
			summarizeLog: updated.summarizeLog,
		};
	}
}
