import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { AppLoggerService } from "../logger/logger.service";

const MAX_DISCORD_MESSAGE_LENGTH = 2000;
const SAFE_CHUNK_LENGTH = 1900;
const CHUNK_DELAY_MS = 1200;
const RETRY_DELAY_MS = 1500;
const DISCORD_SUPPRESS_NOTIFICATIONS_FLAG = 1 << 12;

@Injectable()
export class SometoolNotificationService {
	private readonly logger;

	constructor(private readonly appLoggerService: AppLoggerService) {
		this.logger = this.appLoggerService.createLogger(
			SometoolNotificationService.name,
		);
	}

	private getWebhookUrls(): string[] {
		const raw = process.env.DISCORD_WEBHOOK_URL;
		if (!raw) return [];
		return raw
			.split(/[,\n]/)
			.map((value) => value.trim())
			.filter((value) => value.length > 0);
	}

	async sendMessage(content: string): Promise<void> {
		const webhookUrls = this.getWebhookUrls();
		if (webhookUrls.length === 0) {
			this.logger.warn("Discord webhook URL is not configured.");
			return;
		}

		const chunks = this.chunkMessage(content);
		for (const webhookUrl of webhookUrls) {
			let sentChunkCount = 0;
			for (const chunk of chunks) {
				if (!chunk) {
					continue;
				}

				try {
					const payload: { content: string; flags?: number } = {
						content: chunk,
					};
					if (sentChunkCount > 0) {
						payload.flags = DISCORD_SUPPRESS_NOTIFICATIONS_FLAG;
					}

					let response = await fetch(webhookUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(payload),
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
							body: JSON.stringify(payload),
						});
					}
					if (!response.ok) {
						this.logger.error(
							`Discord webhook responded with ${response.status} ${response.statusText}`,
						);
						const errorText = await response.text();
						this.logger.error(`Discord API response: ${errorText}`);
					}
				} catch (error) {
					this.logger.error(
						`Failed to send Discord webhook: ${
							error instanceof Error ? error.message : "Unknown error"
						}`,
					);
				}
				sentChunkCount += 1;
				await this.delay(CHUNK_DELAY_MS);
			}
		}
	}

	async sendMessageWithFiles(
		content: string,
		filePaths: string[],
	): Promise<{ payloadTooLarge: boolean }> {
		const webhookUrls = this.getWebhookUrls();
		if (webhookUrls.length === 0) {
			this.logger.warn("Discord webhook URL is not configured.");
			return { payloadTooLarge: false };
		}
		if (filePaths.length === 0) {
			await this.sendMessage(content);
			return { payloadTooLarge: false };
		}

		let payloadTooLarge = false;
		for (const webhookUrl of webhookUrls) {
			try {
				const response = await this.postMultipartMessage(
					webhookUrl,
					content,
					filePaths,
				);

				if (!response.ok) {
					const errorText = await response.text();
					if (
						response.status === 413 ||
						/payload too large|request entity too large|file size/i.test(
							errorText,
						)
					) {
						this.logger.warn(
							`Discord attachment payload too large (${response.status})`,
						);
						payloadTooLarge = true;
						continue;
					}

					this.logger.error(
						`Discord webhook responded with ${response.status} ${response.statusText}`,
					);
					this.logger.error(`Discord API response: ${errorText}`);
				}
			} catch (error) {
				this.logger.error(
					`Failed to send Discord webhook with files: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				);
			}
		}

		return { payloadTooLarge };
	}

	private async postMultipartMessage(
		webhookUrl: string,
		content: string,
		filePaths: string[],
	): Promise<Response> {
		const form = await this.buildMultipartFormData(content, filePaths);

		let response = await fetch(webhookUrl, {
			method: "POST",
			body: form,
		});
		if (response.status === 429) {
			const retryAfter = response.headers.get("retry-after");
			const delayMs = retryAfter
				? Math.max(0, Number.parseFloat(retryAfter) * 1000)
				: RETRY_DELAY_MS;
			await this.delay(delayMs);
			const retryForm = await this.buildMultipartFormData(content, filePaths);
			response = await fetch(webhookUrl, {
				method: "POST",
				body: retryForm,
			});
		}

		return response;
	}

	private async buildMultipartFormData(
		content: string,
		filePaths: string[],
	): Promise<FormData> {
		const form = new FormData();
		form.append("payload_json", JSON.stringify({ content }));

		for (let i = 0; i < filePaths.length; i += 1) {
			const filePath = filePaths[i];
			const data = await fs.readFile(filePath);
			const bytes = Uint8Array.from(data);
			const fileName = path.basename(filePath);
			form.append(
				`files[${i}]`,
				new Blob([bytes], { type: "audio/mp4" }),
				fileName,
			);
		}

		return form;
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
