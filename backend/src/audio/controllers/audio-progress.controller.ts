import {
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Param,
} from "@nestjs/common";
import { AudioBatchService } from "../services/audio-batch.service";
import { AudioConverterService } from "../services/audio-converter.service";
import { AudioProgressService } from "../services/audio-progress.service";

@Controller("audio/progress")
export class AudioProgressController {
	constructor(
		private readonly audioProgressService: AudioProgressService,
		private readonly audioConverterService: AudioConverterService,
		private readonly audioBatchService: AudioBatchService,
	) {}

	// 変換進捗状況を取得
	@Get()
	async getConversionProgress() {
		try {
			const progress = await this.audioProgressService.getConversionProgress();
			return {
				success: true,
				data: progress,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to get conversion progress: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 特定のファイルの詳細進捗を取得
	@Get(":id")
	async getFileProgress(@Param("id") id: string) {
		try {
			const progress = await this.audioProgressService.getFileProgress(id);
			return {
				success: true,
				data: progress,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to get file progress: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// アクティブな変換一覧を取得
	@Get("active/list")
	async getActiveConversions() {
		try {
			const activeConversions =
				this.audioConverterService.getActiveConversions();
			const isBatchActive = this.audioBatchService.isBatchConversionActive();

			return {
				success: true,
				data: {
					activeFiles: activeConversions,
					isBatchActive,
					activeCount: activeConversions.length,
				},
			};
		} catch (error) {
			throw new HttpException(
				`Failed to get active conversions: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
