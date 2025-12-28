import {
	Controller,
	HttpException,
	HttpStatus,
	type MessageEvent,
	Param,
	Post,
	Sse,
} from "@nestjs/common";
import { type Observable, Subject } from "rxjs";
import { AudioAnalyzerService } from "../services/audio-analyzer.service";
import { AudioBatchService } from "../services/audio-batch.service";
import { AudioConverterService } from "../services/audio-converter.service";

@Controller("audio/convert")
export class AudioConvertController {
	private progressSubject = new Subject<MessageEvent>();

	constructor(
		private readonly audioAnalyzerService: AudioAnalyzerService,
		private readonly audioConverterService: AudioConverterService,
		private readonly audioBatchService: AudioBatchService,
	) {}

	// ACBファイルのメタデータ解析
	@Post("analyze/:id")
	async analyzeAcbFile(@Param("id") id: string) {
		try {
			await this.audioAnalyzerService.analyzeAcbFile(id);
			return {
				success: true,
				message: `Analysis complete for audio file: ${id}`,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to analyze ACB file: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// ACBファイルをWAVに変換
	@Post(":id")
	async convertAcbToWav(@Param("id") id: string) {
		try {
			const result = await this.audioConverterService.convertAcbToWav(id);
			return {
				success: result.success,
				data: {
					totalStreams: result.totalStreams,
					convertedStreams: result.convertedStreams,
					conversionRate:
						result.totalStreams > 0
							? `${(
									(result.convertedStreams / result.totalStreams) * 100
								).toFixed(1)}%`
							: "0%",
				},
				message: `Conversion complete for audio file: ${id}`,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to convert ACB file: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 既存のM4Aファイルを削除して再変換
	@Post("reconvert/:id")
	async reconvertAcbToWav(@Param("id") id: string) {
		try {
			const result = await this.audioConverterService.reconvertAcbToWav(id);
			return {
				success: result.success,
				data: {
					totalStreams: result.totalStreams,
					convertedStreams: result.convertedStreams,
					conversionRate:
						result.totalStreams > 0
							? `${(
									(result.convertedStreams / result.totalStreams) * 100
								).toFixed(1)}%`
							: "0%",
				},
				message: `Reconversion complete for audio file: ${id}`,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to reconvert ACB file: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 全てのACBファイルを一括変換
	@Post("batch/all")
	async convertAllAcbFiles() {
		try {
			const jobId = await this.audioBatchService.convertAllAcbFiles();
			return {
				success: true,
				message: "Batch conversion started",
				jobId,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to start batch conversion: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 失敗したファイルを再試行
	@Post("retry/failed")
	async retryFailedFiles() {
		try {
			const result = await this.audioBatchService.retryFailedConversions();
			return {
				success: true,
				message: `Retrying ${result.retriedCount} failed files`,
				data: result,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to retry conversions: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 個別ファイルの変換を中断
	@Post("cancel/:id")
	async cancelConversion(@Param("id") id: string) {
		try {
			const result = await this.audioConverterService.cancelConversion(id);
			return {
				success: result.success,
				message: result.message,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to cancel conversion: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 全ての変換を中断
	@Post("cancel/all")
	async cancelAllConversions() {
		try {
			const result = await this.audioBatchService.cancelAllConversions();
			return {
				success: result.success,
				data: {
					cancelledCount: result.cancelledCount,
				},
				message: result.message,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to cancel all conversions: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// ストーリー別ボイス変換
	@Post("story/:storyId")
	async convertStoryVoice(@Param("storyId") storyId: string) {
		try {
			const result = await this.audioConverterService.convertStoryVoice(
				storyId,
				(current, total) => {
					// SSE経由で進捗を配信
					this.sendProgress({
						type: "story_voice_conversion",
						storyId,
						current,
						total,
						progress: Math.round((current / total) * 100),
					});
				},
			);
			return {
				success: result.success,
				data: {
					storyId,
					totalStreams: result.totalStreams,
					convertedStreams: result.convertedStreams,
					conversionRate:
						result.totalStreams > 0
							? `${(
									(result.convertedStreams / result.totalStreams) * 100
								).toFixed(1)}%`
							: "0%",
				},
				message: `Story voice conversion complete for: ${storyId}`,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to convert story voice: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// ストーリー背景画像変換
	@Post("story/:storyId/backgrounds")
	async convertStoryBackgrounds(@Param("storyId") storyId: string) {
		try {
			const result =
				await this.audioConverterService.convertStoryBackgrounds(storyId);
			return {
				success: result.success,
				data: {
					storyId,
					converted: result.converted,
					skipped: result.skipped,
					missing: result.missing,
				},
				message: `Story background conversion complete for: ${storyId}`,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to convert story backgrounds: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// ストーリーBGM変換
	@Post("story/:storyId/bgm")
	async convertStoryBgm(@Param("storyId") storyId: string) {
		try {
			const result = await this.audioConverterService.convertStoryBgm(storyId);
			return {
				success: result.success,
				data: {
					storyId,
					converted: result.converted,
					skipped: result.skipped,
					missing: result.missing,
				},
				message: `Story BGM conversion complete for: ${storyId}`,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to convert story BGM: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// ストーリーSE変換
	@Post("story/:storyId/se")
	async convertStorySe(@Param("storyId") storyId: string) {
		try {
			const result = await this.audioConverterService.convertStorySe(storyId);
			return {
				success: result.success,
				data: {
					storyId,
					converted: result.converted,
					skipped: result.skipped,
					missing: result.missing,
				},
				message: `Story SE conversion complete for: ${storyId}`,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to convert story SE: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 変換進捗のリアルタイム配信 (Server-Sent Events)
	@Sse("progress")
	getProgress(): Observable<MessageEvent> {
		return this.progressSubject.asObservable();
	}

	// 進捗を送信するメソッド
	sendProgress(data: Record<string, unknown>) {
		this.progressSubject.next({
			data: JSON.stringify(data),
			type: "progress",
		} as MessageEvent);
	}
}
