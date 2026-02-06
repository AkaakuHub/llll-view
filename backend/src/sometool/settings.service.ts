import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type NotificationSettings = {
	notifyOnlyUpdates: boolean;
	notifyOnFailure: boolean;
	includeLog: boolean;
};

@Injectable()
export class SometoolSettingsService {
	constructor(private readonly prisma: PrismaService) {}

	async getNotificationSettings(): Promise<NotificationSettings> {
		const settings = await this.prisma.systemControlSettings.upsert({
			where: { id: 1 },
			create: {
				id: 1,
				notifyOnSuccess: true,
				notifyOnlyUpdates: true,
				notifyOnFailure: true,
				includeLog: true,
			},
			update: {},
		});

		return {
			notifyOnlyUpdates: settings.notifyOnlyUpdates,
			notifyOnFailure: settings.notifyOnFailure,
			includeLog: settings.includeLog,
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
				notifyOnSuccess: true,
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
		};
	}
}
