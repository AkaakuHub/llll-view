import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Injectable } from "@nestjs/common";
import { ConversionStatus } from "../../../generated/prisma";
import { GlobalConfigService } from "../../config/global-config.service";
import { AppLoggerService } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";

const execAsync = promisify(exec);

@Injectable()
export class AudioAnalyzerService {
	private readonly logger;

	constructor(
		private prisma: PrismaService,
		private globalConfig: GlobalConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(AudioAnalyzerService.name);
	}

	// ACBファイルのメタデータを取得
	async analyzeAcbFile(audioFileId: string): Promise<void> {
		const audioFile = await this.prisma.audioFiles.findUnique({
			where: { id: audioFileId },
		});

		if (!audioFile) {
			throw new Error(`Audio file not found: ${audioFileId}`);
		}

		try {
			this.logger.log(`Analyzing ACB file: ${audioFile.filename}`);

			// vgmstream-cliでメタデータ取得
			const vgmstreamPath = this.globalConfig.getVgmstreamPath();
			const command = `"${vgmstreamPath}" -s 1 -i "${audioFile.sourcePath}"`;
			const { stdout } = await execAsync(command);

			const metadata = this.parseVgmstreamOutput(stdout);

			// ファイル情報を更新
			await this.prisma.audioFiles.update({
				where: { id: audioFileId },
				data: {
					status: ConversionStatus.COMPLETED,
					streamCount: metadata.audioStreamsCount || 1,
					sampleRate: metadata.sampleRate,
					channels: metadata.channels,
					duration: metadata.duration,
					encoding: metadata.encoding || "ACB",
					updatedAt: new Date(),
				},
			});

			this.logger.log(
				`Analysis complete for ${audioFile.filename}. Found ${metadata.audioStreamsCount || 1} streams.`,
			);
		} catch (error) {
			this.logger.error(
				`Error analyzing ACB file ${audioFile.filename}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			throw error;
		}
	}

	// vgmstreamの出力をパース
	private parseVgmstreamOutput(output: string): Record<string, unknown> {
		const metadata: Record<string, unknown> = {};

		const lines = output.split("\n");
		for (const line of lines) {
			if (line.includes("sample rate:")) {
				metadata.sampleRate = parseInt(line.match(/(\d+)/)?.[1] || "0");
			}
			if (line.includes("channels:")) {
				metadata.channels = parseInt(line.match(/(\d+)/)?.[1] || "0");
			}
			if (line.includes("stream total samples:")) {
				const match = line.match(/(\d+) \((.+?) seconds\)/);
				if (match) {
					metadata.totalSamples = parseInt(match[1]);
					metadata.duration = parseFloat(match[2]);
				}
			}
			if (line.includes("encoding:")) {
				metadata.encoding = line.split("encoding:")[1]?.trim();
			}
		}

		return metadata;
	}
}
