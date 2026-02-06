import { Injectable } from "@nestjs/common";
import { AppLoggerService } from "../logger/logger.service";

const MAX_DISCORD_MESSAGE_LENGTH = 2000;
const SAFE_CHUNK_LENGTH = 1900;
const CHUNK_DELAY_MS = 1200;
const RETRY_DELAY_MS = 1500;

@Injectable()
export class SometoolNotificationService {
	private readonly logger;

	constructor(private readonly appLoggerService: AppLoggerService) {
		this.logger = this.appLoggerService.createLogger(
			SometoolNotificationService.name,
		);
	}

	private getWebhookUrl(): string | null {
		const url = process.env.DISCORD_WEBHOOK_URL;
		if (!url) return null;
		return url.trim().length > 0 ? url.trim() : null;
	}

	async sendMessage(content: string): Promise<void> {
		const webhookUrl = this.getWebhookUrl();
		if (!webhookUrl) {
			this.logger.warn("Discord webhook URL is not configured.");
			return;
		}

		const chunks = this.chunkMessage(content);
		for (const chunk of chunks) {
			try {
				let response = await fetch(webhookUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: chunk }),
				});
				if (response.status === 429) {
					const retryAfter = response.headers.get("retry-after");
					const delayMs = retryAfter
						? Math.max(0, Number.parseFloat(retryAfter) * 1000)
						: RETRY_DELAY_MS;
					await this.delay(delayMs);
					response = await fetch(webhookUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ content: chunk }),
					});
				}
				if (!response.ok) {
					this.logger.error(
						`Discord webhook responded with ${response.status}`,
					);
				}
			} catch (error) {
				this.logger.error(
					`Failed to send Discord webhook: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				);
			}
			await this.delay(CHUNK_DELAY_MS);
		}
	}

	private chunkMessage(content: string): string[] {
		if (content.length <= MAX_DISCORD_MESSAGE_LENGTH) {
			return [content];
		}

		const chunks: string[] = [];
		let remaining = content;

		while (remaining.length > 0) {
			const slice = remaining.slice(0, SAFE_CHUNK_LENGTH);
			chunks.push(slice);
			remaining = remaining.slice(SAFE_CHUNK_LENGTH);
		}

		return chunks;
	}

	private async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
