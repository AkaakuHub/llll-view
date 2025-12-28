import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
	ConversionStatus,
	JobStatus,
	JobType,
} from "../../../generated/prisma";
import { AppLoggerService } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AudioConverterService } from "./audio-converter.service";

@Injectable()
export class AudioBatchService {
	private readonly logger;
	private batchConversionActive = false;
	private batchConversionAbortController: AbortController | null = null;

	constructor(
		private prisma: PrismaService,
		private audioConverterService: AudioConverterService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(AudioBatchService.name);
	}

	// 全てのACBファイルを一括変換
	async convertAllAcbFiles(): Promise<string> {
		if (this.batchConversionActive) {
			throw new Error("Batch conversion is already in progress");
		}

		// ジョブを作成
		const job = await this.prisma.conversionJobs.create({
			data: {
				id: randomUUID(),
				type: JobType.BATCH_CONVERSION,
				status: JobStatus.PENDING,
				sourcePath: "batch",
				targetPath: "batch",
				updatedAt: new Date(),
				startedAt: new Date(),
			},
		});

		// 非同期で一括変換を実行
		this.executeBatchConversion(job.id).catch((error) => {
			this.logger.error(`Batch conversion failed: ${error.message}`);
		});

		return job.id;
	}

	// 一括変換を実行
	private async executeBatchConversion(jobId: string): Promise<void> {
		this.batchConversionActive = true;
		this.batchConversionAbortController = new AbortController();

		try {
			await this.prisma.conversionJobs.update({
				where: { id: jobId },
				data: { status: JobStatus.PROCESSING },
			});

			const pendingFiles = await this.prisma.audioFiles.findMany({
				where: { status: ConversionStatus.PENDING },
				orderBy: { createdAt: "asc" },
			});

			this.logger.log(
				`Starting batch conversion of ${pendingFiles.length} files`,
			);

			let processedCount = 0;
			let successCount = 0;

			for (const file of pendingFiles) {
				if (this.batchConversionAbortController?.signal.aborted) {
					this.logger.log("Batch conversion aborted");
					break;
				}

				try {
					this.logger.log(
						`Converting file ${processedCount + 1}/${pendingFiles.length}: ${file.filename}`,
					);

					const result = await this.audioConverterService.convertAcbToWav(
						file.id,
					);
					if (result.success) {
						successCount++;
					}
				} catch (error) {
					// 個別ファイルのキャンセルや失敗の場合は次のファイルに継続
					if (error instanceof Error && error.message.includes("cancelled")) {
						this.logger.log(
							`File ${file.filename} was cancelled, continuing to next file`,
						);
					} else {
						this.logger.error(
							`Failed to convert ${file.filename}: ${error instanceof Error ? error.message : "Unknown error"}`,
						);
					}
				}

				processedCount++;

				// 進捗をログに記録
				this.logger.log(
					`Progress: ${processedCount}/${pendingFiles.length} files processed`,
				);
			}

			// ジョブ完了
			await this.prisma.conversionJobs.update({
				where: { id: jobId },
				data: {
					status: this.batchConversionAbortController?.signal.aborted
						? JobStatus.CANCELLED
						: JobStatus.COMPLETED,
					completedAt: new Date(),
				},
			});

			this.logger.log(
				`Batch conversion completed. ${successCount}/${processedCount} files converted successfully.`,
			);
		} catch (error) {
			this.logger.error(
				`Batch conversion error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);

			await this.prisma.conversionJobs.update({
				where: { id: jobId },
				data: {
					status: JobStatus.FAILED,
					completedAt: new Date(),
				},
			});
		} finally {
			this.batchConversionActive = false;
			this.batchConversionAbortController = null;
		}
	}

	// 失敗したファイルを再試行
	async retryFailedConversions(): Promise<{
		retriedCount: number;
		results: Array<{
			fileId: string;
			filename: string;
			success: boolean;
			totalStreams?: number;
			convertedStreams?: number;
			error?: string;
		}>;
	}> {
		const failedFiles = await this.prisma.audioFiles.findMany({
			where: { status: ConversionStatus.FAILED },
			include: { audioStreams: true },
		});

		this.logger.log(`Retrying ${failedFiles.length} failed conversions`);

		const results = [];
		let retriedCount = 0;

		for (const file of failedFiles) {
			try {
				this.logger.log(`Retrying conversion for: ${file.filename}`);
				const result = await this.audioConverterService.convertAcbToWav(
					file.id,
				);

				results.push({
					fileId: file.id,
					filename: file.filename,
					success: result.success,
					totalStreams: result.totalStreams,
					convertedStreams: result.convertedStreams,
				});

				if (result.success) {
					retriedCount++;
				}
			} catch (error) {
				this.logger.error(
					`Retry failed for ${file.filename}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				results.push({
					fileId: file.id,
					filename: file.filename,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		return { retriedCount, results };
	}

	// 全ての変換を中断
	async cancelAllConversions(): Promise<{
		success: boolean;
		message: string;
		cancelledCount: number;
	}> {
		let cancelledCount = 0;

		// バッチ変換を中断
		if (this.batchConversionActive && this.batchConversionAbortController) {
			this.batchConversionAbortController.abort();
			this.logger.log("Batch conversion aborted by user request");
			cancelledCount++;
		}

		// 個別の変換も中断
		const activeConversions = this.audioConverterService.getActiveConversions();
		for (const fileId of activeConversions) {
			try {
				const result =
					await this.audioConverterService.cancelConversion(fileId);
				if (result.success) {
					cancelledCount++;
				}
			} catch (error) {
				this.logger.error(
					`Failed to cancel conversion for ${fileId}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		return {
			success: cancelledCount > 0,
			message: `Cancelled ${cancelledCount} conversion(s)`,
			cancelledCount,
		};
	}

	// バッチ変換がアクティブかチェック
	isBatchConversionActive(): boolean {
		return this.batchConversionActive;
	}

	// 変換ジョブ一覧取得
	async getConversionJobs() {
		return this.prisma.conversionJobs.findMany({
			orderBy: { createdAt: "desc" },
			take: 50,
		});
	}
}
