import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SometoolSettingsService } from "./settings.service";

@ApiTags("sometool")
@Controller("sometool")
export class SometoolSettingsController {
	constructor(private readonly settingsService: SometoolSettingsService) {}

	@Get("settings/notifications")
	@ApiOperation({ summary: "Get notification settings" })
	@ApiResponse({ status: 200, description: "Settings retrieved" })
	async getNotificationSettings() {
		return await this.settingsService.getNotificationSettings();
	}

	@Post("settings/notifications")
	@ApiOperation({ summary: "Update notification settings" })
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				notifyOnlyUpdates: { type: "boolean" },
				notifyOnFailure: { type: "boolean" },
				includeLog: { type: "boolean" },
				webhooks: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							mode: {
								type: "string",
								enum: ["normal", "summary", "music_only"],
							},
						},
						required: ["id", "mode"],
					},
				},
			},
		},
	})
	@ApiResponse({ status: 200, description: "Settings updated" })
	async updateNotificationSettings(
		@Body()
		body: {
			notifyOnlyUpdates?: boolean;
			notifyOnFailure?: boolean;
			includeLog?: boolean;
			webhooks?: Array<{
				id: string;
				mode: "normal" | "summary" | "music_only";
			}>;
		},
	) {
		return await this.settingsService.updateNotificationSettings(body);
	}
}
