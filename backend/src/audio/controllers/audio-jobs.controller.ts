import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { AudioBatchService } from "../services/audio-batch.service";

@Controller("audio/jobs")
export class AudioJobsController {
	constructor(private readonly audioBatchService: AudioBatchService) {}

	// 変換ジョブ一覧取得
	@Get()
	async getConversionJobs() {
		try {
			const jobs = await this.audioBatchService.getConversionJobs();
			return {
				success: true,
				data: jobs,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to get conversion jobs: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
